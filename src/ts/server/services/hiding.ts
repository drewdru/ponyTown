import * as fs from 'fs';
import { Subject } from 'rxjs';
import { HIDE_LIMIT, MINUTE } from '../../common/constants';
import { NotificationFlags } from '../../common/interfaces';
import { IClient, ServerNotification } from '../serverInterfaces';
import { systemMessage, logger } from '../logger';
import { NotificationService } from './notification';
import { includes } from '../../common/utils';
import { isFriend } from './friends';
import { pathTo } from '../paths';
import { addHide } from '../db';
import { HidingStats } from '../../common/adminInterfaces';
import { getEntityName } from '../entityUtils';
import { saySystem } from '../chat';

interface Hide {
	by: string;
	who: string;
}

const hidePlayerLimit = 'Cannot hide any more players.';
const cannotHidePlayerInParty = 'Cannot hide players from your party.';
const cannotHideFriends = 'Cannot hide friends.';
const unhideAllLimit = 'Cannot unhide hidden players, try again later.';
const unhideAllLimitNote = 'You can only do this once per hour.';

function clientInfo({ accountId, account, characterName }: IClient) {
	return `${characterName} (${account.name}) [${accountId}]`;
}

function simpleNotification(message: string, note?: string): ServerNotification {
	return { id: 0, name: '', message, note, flags: NotificationFlags.Ok };
}

export function hidingDataPath(serverId: string) {
	return pathTo('settings', `hiding-${serverId}.json`);
}

export async function saveHidingData(hiding: HidingService, serverId: string) {
	if (!TESTS) {
		try {
			const data = hiding.serialize();
			await fs.writeFileAsync(hidingDataPath(serverId), data, 'utf8');
		} catch (e) {
			logger.error(e);
		}
	}
}

export function pollHidingDataSave(hiding: HidingService, serverId: string) {
	setInterval(() => saveHidingData(hiding, serverId), 10 * MINUTE);
}

export class HidingService {
	changes = new Subject<Hide>();
	unhidesAll = new Subject<string>();
	private hides = new Map<string, Map<string, number>>();
	private unhides = new Map<string, number>();
	private interval: any;
	constructor(
		private clearUnhides: number,
		private notifications: NotificationService,
		private findClient: (accountId: string) => IClient | undefined,
		private log: (message: string) => void,
	) {
	}
	serialize() {
		const hides: any = {};
		const unhides: any = {};

		this.hides.forEach((hidesMap, by) => {
			const list: any = {};
			hidesMap.forEach((value, key) => list[key] = value);
			hides[by] = list;
		});

		this.unhides.forEach((value, key) => unhides[key] = value);

		return JSON.stringify({ hides, unhides });
	}
	deserialize(data: string) {
		try {
			const { hides, unhides } = JSON.parse(data);

			for (const by of Object.keys(hides)) {
				const hidesMap = new Map<string, number>();

				for (const key of Object.keys(hides[by])) {
					hidesMap.set(key, hides[by][key]);
				}

				this.hides.set(by, hidesMap);
			}

			for (const key of Object.keys(unhides)) {
				this.unhides.set(key, unhides[key]);
			}

			this.cleanup();
		} catch (e) {
			logger.error(e);
		}
	}
	getStatsFor(account: string): HidingStats {
		const hides = this.hides.get(account);
		const hidden = hides ? Array.from(hides.keys()) : [];
		const hiddenBy: string[] = [];

		this.hides.forEach((hides, by) => {
			if (hides.has(account)) {
				hiddenBy.push(by);
			}
		});

		return { account, hidden, hiddenBy, permaHidden: [], permaHiddenBy: [] };
	}
	connected(client: IClient) {
		const hides = this.hides.get(client.accountId);

		if (hides) {
			for (const id of Array.from(hides.keys())) {
				client.hides.add(id);
			}
		}
	}
	requestHide(requester: IClient, target: IClient, timeout: number) {
		const hides = this.hides.get(requester.accountId);
		const count = hides && hides.size || 0;

		if (requester.accountId === target.accountId) {
			saySystem(requester, `Cannot hide yourself`);
		} else if (requester.party && includes(requester.party.clients, target)) {
			this.notifications.addNotification(requester, simpleNotification(cannotHidePlayerInParty));
		} else if (isFriend(requester, target)) {
			this.notifications.addNotification(requester, simpleNotification(cannotHideFriends));
		} else if (count >= HIDE_LIMIT) {
			this.notifications.addNotification(requester, simpleNotification(hidePlayerLimit));
		} else {
			this.notifications.addNotification(requester, {
				id: 0,
				name: target.pony.name || '',
				entityId: target.pony.id,
				message: `Are you sure you want to hide <b>#NAME#</b> ?`,
				flags: NotificationFlags.Yes | NotificationFlags.No | (target.pony.nameBad ? NotificationFlags.NameBad : 0),
				accept: () => this.confirmHide(requester, target, timeout),
			});
		}
	}
	requestUnhideAll(requester: IClient) {
		const unhideTimestamp = this.unhides.get(requester.accountId) || 0;

		if (unhideTimestamp > Date.now()) {
			this.notifications.addNotification(requester, simpleNotification(unhideAllLimit, unhideAllLimitNote));
		} else {
			this.notifications.addNotification(requester, {
				id: 0,
				name: '',
				message: 'Are you sure you want to unhide all temporarily hidden players ?',
				note: 'You can only do this once per hour. This action will require re-joining the game.',
				flags: NotificationFlags.Yes | NotificationFlags.No,
				accept: () => this.unhideAll(requester),
			});
		}
	}
	confirmHide(requester: IClient, target: IClient, timeout: number) {
		if (this.hide(requester, target, timeout)) {
			let message = `${requester.characterName} (${requester.account.name}) hides ${clientInfo(target)}`;

			if (timeout === 0) {
				message += ' (permanent)';
			}

			this.log(systemMessage(requester.accountId, message));
		}
	}
	private isHiddenInner(who: string, from: string): boolean {
		const hides = this.hides.get(who);
		return hides !== undefined && hides.has(from);
	}
	isHidden(who: string, from: string): boolean {
		return this.isHiddenInner(who, from) || this.isHiddenInner(from, who);
	}
	isHiddenClient(who: IClient, from: IClient) {
		return this.isHidden(who.accountId, from.accountId);
	}
	hide(byClient: IClient, whoClient: IClient, timeout: number) {
		const by = byClient.accountId;
		const who = whoClient.accountId;

		if (timeout === 0) { // permanent
			addHide(by, who, getEntityName(whoClient.pony, byClient) || '[none]')
				.then(() => {
					byClient.permaHides.add(who);
					this.notify([{ by, who }]);
				})
				.catch(e => logger.error(e));
			return true;
		} else {

			if (by === who)
				return false;

			if (this.isHiddenInner(by, who))
				return false;

			const hides = this.hides.get(by) || new Map<string, number>();
			hides.set(who, Date.now() + timeout);
			this.hides.set(by, hides);
			byClient.hides.add(who);
			this.notify([{ by, who }]);
			return true;
		}
	}
	// TODO: remove ?
	unhide(byClient: IClient, whoClient: IClient) {
		const by = byClient.accountId;
		const who = whoClient.accountId;
		const hides = this.hides.get(by);

		if (hides) {
			if (hides.has(who)) {
				hides.delete(who);

				if (hides.size === 0) {
					this.hides.delete(by);
				}

				byClient.hides.delete(who);

				this.notify([{ by, who }]);
			}
		}
	}
	unhideAll(byClient: IClient) {
		const by = byClient.accountId;

		if (this.unhides.has(by))
			return;

		const hides = this.hides.get(by);

		if (hides) {
			const notify: Hide[] = [];
			hides.forEach((_, who) => notify.push({ by, who }));
			this.hides.delete(by);
			this.unhides.set(by, Date.now() + this.clearUnhides);
			byClient.hides.clear();
			this.notify(notify);
			this.unhidesAll.next(by);
		}

		this.log(systemMessage(by, 'unhide all'));
	}
	merged(target: string, merge: string) {
		const targetHides = this.hides.get(target);
		const mergeHides = this.hides.get(merge);
		const notify: Hide[] = [];

		if (targetHides) {
			targetHides.delete(merge);
		}

		if (mergeHides) {
			const targetClient = this.findClient(target);
			mergeHides.delete(target);

			if (targetHides) {
				for (const id of Array.from(mergeHides.keys())) {
					const who = targetHides.get(id);
					targetHides.set(id, Math.max(who || 0, mergeHides.get(id)!));
					targetClient && targetClient.hides.add(id);

					if (!who) {
						notify.push({ by: target, who: id });
						notify.push({ by: merge, who: id });
					}
				}
			} else {
				this.hides.set(target, mergeHides);

				for (const id of Array.from(mergeHides.keys())) {
					targetClient && targetClient.hides.add(id);
					notify.push({ by: target, who: id });
					notify.push({ by: merge, who: id });
				}
			}

			this.hides.delete(merge);
		}

		const targetUnhides = this.unhides.get(target);
		const mergeUnhides = this.unhides.get(merge);

		if (mergeUnhides) {
			this.unhides.set(target, Math.max(targetUnhides || 0, mergeUnhides));
			this.unhides.delete(merge);
		}

		this.hides.forEach((_, by) => {
			const hides = this.hides.get(by)!;
			const mergeHide = hides.get(merge);

			if (mergeHide) {
				hides.set(target, Math.max(mergeHide, hides.get(target) || 0));
				hides.delete(merge);
				const client = this.findClient(by);

				if (client) {
					client.hides.delete(merge);

					if (target !== by) {
						client && client.hides.add(target);
					}
				}

				notify.push({ by, who: target });
				notify.push({ by, who: merge });
			}
		});

		this.notify(notify);
	}
	cleanup() {
		const now = Date.now();
		const notify: Hide[] = [];

		for (const by of Array.from(this.hides.keys())) {
			const hides = this.hides.get(by)!;

			for (const who of Array.from(hides.keys())) {
				if (hides.get(who)! < now) {
					hides.delete(who);
					const client = this.findClient(by);
					client && client.hides.delete(who);
					notify.push({ by, who });
				}
			}

			if (hides.size === 0) {
				this.hides.delete(by);
			}
		}

		this.notify(notify);

		for (const key of Array.from(this.unhides.keys())) {
			if (this.unhides.get(key)! < now) {
				this.unhides.delete(key);
			}
		}
	}
	start() {
		this.interval = this.interval || setInterval(() => this.cleanup(), 10 * MINUTE);
	}
	stop() {
		clearInterval(this.interval);
		this.interval = undefined;
	}
	private notify(hides: Hide[]) {
		for (const hide of hides) {
			this.changes.next(hide);
		}
	}
}
