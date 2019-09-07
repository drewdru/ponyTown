import { sort } from 'timsort';
import { remove } from 'lodash';
import { Subject } from 'rxjs';
import * as db from '../db';
import { LiveList } from './liveList';
import { removeItem, includes, toInt, fromNow } from '../../common/utils';
import {
	Account, Auth, Origin, OriginRef, OriginInfo, Character, ListListener, OriginInfoBase, Event, eventFields, PonyIdDateName
} from '../../common/adminInterfaces';
import {
	addToMap, removeFromMap, emailName, getIdsFromNote, compareAccounts, compareOriginRefs, compareByName,
	compareAuths, createIdStore, getPotentialDuplicates, createPotentialDuplicatesFilter
} from '../../common/adminUtils';
import { logger, logPerformance } from '../logger';
import { ObservableList } from './observableList';
import { HOUR } from '../../common/constants';
import { getLoginServer } from '../internal';

function addAuthToAccount(account: Account, auth: Auth, log: string) {
	const existingAuth = account.auths!.find(a => a._id === auth._id);

	if (existingAuth) { // TODO: remove
		console.log('duplicate auth', auth._id, 'to', account._id, log);
	} else {
		account.authsList!.pushOrdered(auth, compareAuths);
	}
}

function pushUnique<T>(list: T[], item: T) {
	if (list.indexOf(item) === -1) {
		list.push(item);
	}
}

function removeAuthFromAccount(account: Account, auth: Auth) {
	return account.authsList!.remove(auth);
}

function addPonyToAccount(account: Account, pony: Character) {
	if (account.poniesList) {
		account.poniesList.pushOrdered(pony, compareByName);
	}
}

function removePonyFromAccount(account: Account, pony: Character) {
	if (account.poniesList) {
		return account.poniesList.remove(pony);
	} else {
		return false;
	}
}

function getTotalPledged(auths: Auth[] | undefined) {
	return Math.floor((auths || []).reduce((sum, a) => sum + toInt(a.pledged), 0) / 100);
}

export class AdminService {
	readonly accounts: LiveList<Account>;
	readonly origins: LiveList<Origin>;
	readonly auths: LiveList<Auth>;
	readonly ponies: LiveList<Character>;
	readonly events: LiveList<Event>;
	readonly accountDeleted = new Subject<Account>();
	private emailMap = new Map<string, Account[]>();
	private noteRefMap = new Map<string, Account[]>();
	private browserIdMap = new Map<string, Account[]>();
	private unassignedAuths: Auth[] = [];
	private unassignedPonies: Character[] = [];
	constructor() {
		const accountId = createIdStore();

		this.accounts = new LiveList<Account>(db.Account, {
			fields: [
				'_id', 'updatedAt', 'createdAt', 'lastVisit', 'name', 'birthdate', 'origins', 'ignores', 'emails', 'note',
				'counters', 'mute', 'shadow', 'ban', 'flags', 'roles', 'characterCount', 'patreon', 'supporter',
				'supporterDeclinedSince', 'lastBrowserId', 'noteUpdated', 'alert', 'birthyear'
			],
			clean: ({
				_id, createdAt, updatedAt, lastVisit, name, birthdate, origins, ignoresCount, emails, note, counters, mute,
				shadow, ban, flags, roles, characterCount, patreon, supporter, supporterDeclinedSince, auths, noteUpdated,
				alert, birthyear,
			}) =>
				({
					_id, createdAt, updatedAt, lastVisit, name, birthdate, origins, ignoresCount: toInt(ignoresCount),
					emails, note, counters, mute, shadow, ban, flags: toInt(flags), roles, birthyear,
					characterCount: toInt(characterCount), patreon: toInt(patreon), supporter: toInt(supporter),
					supporterDeclinedSince, totalPledged: getTotalPledged(auths), noteUpdated, alert,
				}),
			fix: account => {
				account._id = accountId(account._id);
				account.nameLower = account.name.toLowerCase();
				account.ignoresCount = account.ignores ? account.ignores.length : 0;
				account.ignores = undefined;
				account.origins = (account.origins || []).map(o => ({ ip: o.ip, country: o.country, last: o.last }));
			},
			onAdd: account => {
				account.auths = [];
				// account.ponies = [];
				account.originsRefs = [];
				account.authsList = new ObservableList(account.auths!, a => a._id);

				if (account.lastBrowserId) {
					this.addBrowserIdToMap(account.lastBrowserId, account);
				}

				if (account.emails) {
					for (const e of account.emails) {
						this.addEmailToMap(e, account);
					}
				}

				this.addNoteRefsToMap(account.note, account);
				this.updateOriginRefs(account);
				this.accountsForPotentialDuplicatesCheck.push(account);
			},
			onUpdate: (oldAccount, newAccount) => {
				if (oldAccount.emails) {
					for (const e of oldAccount.emails) {
						if (!includes(newAccount.emails, e)) {
							this.removeEmailFromMap(e, oldAccount);
						}
					}
				}

				if (newAccount.emails) {
					for (const e of newAccount.emails) {
						if (!includes(oldAccount.emails, e)) {
							this.addEmailToMap(e, oldAccount);
						}
					}
				}

				if (oldAccount.note !== newAccount.note) {
					this.removeNoteRefsFromMap(oldAccount.note, oldAccount);
					this.addNoteRefsToMap(newAccount.note, oldAccount);
				}

				if (oldAccount.lastBrowserId !== newAccount.lastBrowserId) {
					oldAccount.lastBrowserId && this.removeBrowserIdFromMap(oldAccount.lastBrowserId, oldAccount);
					newAccount.lastBrowserId && this.addBrowserIdToMap(newAccount.lastBrowserId, oldAccount);
				}

				Object.assign(oldAccount, newAccount);

				if (newAccount.birthyear === undefined) {
					oldAccount.birthyear = undefined;
				}

				if (newAccount.alert === undefined) {
					oldAccount.alert = undefined;
				}

				if (newAccount.patreon === undefined) {
					oldAccount.patreon = undefined;
				}

				if (newAccount.supporter === undefined) {
					oldAccount.supporter = undefined;
				}

				this.updateOriginRefs(oldAccount);
				this.accountsForPotentialDuplicatesCheck.push(oldAccount);
			},
			onAddedOrUpdated: () => {
				this.assignItems(this.unassignedAuths, (account, auth) => addAuthToAccount(account, auth, 'onAddedOrUpdated'));
				this.assignItems(this.unassignedPonies, addPonyToAccount);
			},
			onDelete: account => {
				account.origins = [];
				this.updateOriginRefs(account);

				if (account.emails) {
					for (const email of account.emails) {
						this.removeEmailFromMap(email, account);
					}
				}

				account.lastBrowserId && this.removeBrowserIdFromMap(account.lastBrowserId, account);
				this.removeNoteRefsFromMap(account.note, account);
				this.accountDeleted.next(account);
			},
			onFinished: () => {
				sort(this.accounts.items, compareAccounts);
				this.auths.start();
			},
		});

		this.origins = new LiveList<Origin>(db.Origin, {
			fields: ['_id', 'updatedAt', 'ip', 'country', 'mute', 'shadow', 'ban'],
			clean: ({ _id, updatedAt, ip, country, mute, shadow, ban, accounts }) =>
				({ _id, updatedAt, ip, country, mute, shadow, ban, accountsCount: accounts ? accounts.length : 0 }),
			onAdd: origin => {
				origin.accounts = [];
			},
			onSubscribeToMissing: ip => ({ ip, country: '??' }) as any,
		}, origin => origin.ip);

		this.auths = new LiveList<Auth>(db.Auth, {
			fields: ['_id', 'updatedAt', 'account', 'provider', 'name', 'url', 'disabled', 'banned', 'pledged', 'lastUsed'],
			clean: ({ _id, updatedAt, account, provider, name, url, disabled, banned, pledged, lastUsed }) =>
				({ _id, updatedAt, account, provider, name, url, disabled, banned, pledged, lastUsed }),
			fix: auth => {
				if (auth.account) {
					auth.account = accountId(auth.account.toString());
				}
			},
			onAdd: auth => {
				this.assignAccount(auth, this.unassignedAuths, account => addAuthToAccount(account, auth, 'onAdd'));
			},
			onUpdate: this.createUpdater<Auth>({
				remove: (account, auth) => removeAuthFromAccount(account, auth) || removeItem(this.unassignedAuths, auth),
				add: (account, auth) =>
					account ? addAuthToAccount(account, auth, 'onUpdate') : pushUnique(this.unassignedAuths, auth),
			}),
			onDelete: auth => {
				removeItem(this.unassignedAuths, auth);
				this.accounts.for(auth.account, account => removeAuthFromAccount(account, auth));
			},
			onFinished: () => {
				logger.info('Admin service loaded');
			},
		});

		this.ponies = new LiveList<Character>(db.Character, {
			fields: ['_id', 'createdAt', 'updatedAt', 'lastUsed', 'account', 'name', 'flags'],
			noStore: true,
			clean: ({ _id, createdAt, updatedAt, account, name, flags, lastUsed }) =>
				({ _id, createdAt, updatedAt, account, name, flags, lastUsed }),
			fix: pony => {
				if (pony.account) {
					pony.account = accountId(pony.account.toString());
				}
			},
			ignore: pony => {
				const account = this.accounts.get(pony.account);
				return account === undefined || account.ponies === undefined;
			},
			onAdd: pony => {
				this.assignAccount(pony, this.unassignedPonies, account => addPonyToAccount(account, pony));
			},
			onUpdate: this.createUpdater<Character>({
				remove: (account, pony) => removePonyFromAccount(account, pony) || removeItem(this.unassignedPonies, pony),
				add: (account, pony) => account ? addPonyToAccount(account, pony) : pushUnique(this.unassignedPonies, pony),
			}),
			onDelete: pony => {
				removeItem(this.unassignedPonies, pony);
				this.accounts.for(pony.account, account => removePonyFromAccount(account, pony));
			},
			// afterAssign: (from, to) => Promise.all([updateCharacterCount(from), updateCharacterCount(to)]),
		});

		this.events = new LiveList<Event>(db.Event, {
			fields: eventFields,
			clean: ({ _id, createdAt, updatedAt, message, desc, account, pony, origin }) =>
				({ _id, createdAt, updatedAt, message, desc, account, pony, origin }),
		});

		setTimeout(() => this.events.start(), 100);
		setTimeout(() => this.ponies.start(), 200);
		setTimeout(() => this.origins.start(), 300);
		setTimeout(() => this.accounts.start(), 400);
	}
	get loaded() {
		return this.accounts.loaded && this.origins.loaded && this.auths.loaded;
	}
	removedItem(type: 'events' | 'ponies' | 'accounts' | 'auths' | 'origins', id: string) {
		if (type === 'accounts') {
			this.accounts.removed(id);
		} else if (type === 'origins') {
			this.origins.removed(id);
		} else if (type === 'auths') {
			this.auths.removed(id);
		} else if (type === 'ponies') {
			this.ponies.removed(id);
		} else {
			console.warn(`Unhandled removedItem for type: ${type}`);
		}
	}
	getAccountsByNoteRef(accountId: string) {
		return this.noteRefMap.get(accountId) || [];
	}
	getAccountsByEmailName(emailName: string) {
		return this.emailMap.get(emailName) || [];
	}
	getAccountsByBrowserId(browserId: string) {
		return this.browserIdMap.get(browserId);
	}
	removeOriginsFromAccount(accountId: string, ips?: string[]) {
		const account = this.accounts.get(accountId);

		if (account) {
			if (ips) {
				if (remove(account.origins, o => includes(ips, o.ip)).length) {
					this.updateOriginRefs(account);
				}
			} else if (account.origins.length) {
				account.origins = [];
				this.updateOriginRefs(account);
			}
		}
	}
	subscribeToAccountAuths(accountId: string, listener: ListListener<string>) {
		const account = this.accounts.get(accountId);

		if (account) {
			return account.authsList!.subscribe(listener);
		} else {
			return undefined;
		}
	}
	subscribeToAccountOrigins(accountId: string, listener: ListListener<OriginInfoBase>) {
		const account = this.accounts.get(accountId);

		if (account) {
			if (!account.originsList) {
				account.originsList = new ObservableList(
					account.originsRefs!, ({ origin, last }) => ({ ip: origin.ip, country: origin.country, last }));
			}

			return account.originsList.subscribe(listener);
		}

		return undefined;
	}
	subscribeToAccountPonies(accountId: string, listener: ListListener<PonyIdDateName>) {
		const account = this.accounts.get(accountId);

		if (account) {
			if (!account.ponies) {
				account.ponies = this.ponies.items.filter(p => p.account === account._id);
				this.ponies.fetch({ account: account._id });
			}

			if (!account.poniesList) {
				account.poniesList = new ObservableList(
					account.ponies!, p => ({ id: p._id, name: p.name, date: p.lastUsed ? p.lastUsed.getTime() : 0 }));
			}

			return account.poniesList.subscribe(listener);
		}

		return undefined;
	}
	cleanupOriginsList(accountId: string) {
		const account = this.accounts.get(accountId);

		if (account && account.originsList && !account.originsList.hasSubscribers()) {
			account.originsList = undefined;
		}
	}
	cleanupPoniesList(accountId: string) {
		const account = this.accounts.get(accountId);

		if (account && account.ponies && account.poniesList && !account.poniesList.hasSubscribers()) {
			const ponies = account.ponies;
			account.ponies = undefined;
			account.poniesList = undefined;

			for (const pony of ponies) {
				this.cleanupPony(pony._id);
			}
		}
	}
	cleanupPony(ponyId: string) {
		const pony = this.ponies.get(ponyId);

		if (pony && !this.ponies.hasSubscriptions(ponyId)) {
			const account = this.accounts.get(pony.account);

			if (!account || !account.ponies) {
				this.ponies.discard(ponyId);
			}
		}
	}
	private duplicateFilter = createPotentialDuplicatesFilter(id => this.browserIdMap.get(id));
	private accountsForPotentialDuplicatesCheck: Account[] = [];
	async mergePotentialDuplicates() {
		const start = Date.now();
		const duplicateFilter = this.duplicateFilter;

		while (this.accountsForPotentialDuplicatesCheck.length) {
			const popedAccount = this.accountsForPotentialDuplicatesCheck.pop()!;
			const account = this.getAccount(popedAccount._id);

			if (account && duplicateFilter(account)) {
				const threshold = fromNow(-1 * HOUR).getTime();
				const duplicates = getPotentialDuplicates(account, id => this.getAccountsByBrowserId(id))
					.filter(a => a.createdAt && a.createdAt.getTime() < threshold);

				if (duplicates.length) {
					const server = getLoginServer('login');
					const duplicate = duplicates[0];
					const accountIsOlder = account.lastVisit && duplicate.lastVisit
						&& account.lastVisit.getTime() < duplicate.lastVisit.getTime();
					const accountId = accountIsOlder ? duplicate._id : account._id;
					const withId = accountIsOlder ? account._id : duplicate._id;
					logPerformance(`mergePotentialDuplicates (${Date.now() - start}ms) [yes]`);
					await server.api.mergeAccounts(accountId, withId, `by server`, false, true);
					return accountId;
				}
			}
		}

		this.accountsForPotentialDuplicatesCheck = [];

		logPerformance(`mergePotentialDuplicates (${Date.now() - start}ms) [no]`);
		return undefined;
	}
	// helpers
	private addEmailToMap(email: string, account: Account) {
		addToMap(this.emailMap, emailName(email), account);
	}
	private removeEmailFromMap(email: string, account: Account) {
		removeFromMap(this.emailMap, emailName(email), account);
	}
	private addNoteRefsToMap(note: string, account: Account) {
		for (let id of getIdsFromNote(note)) {
			if (id !== account._id) {
				addToMap(this.noteRefMap, id, account);
			}
		}
	}
	private removeNoteRefsFromMap(note: string, account: Account) {
		for (let id of getIdsFromNote(note)) {
			if (id !== account._id) {
				removeFromMap(this.noteRefMap, id, account);
			}
		}
	}
	private addBrowserIdToMap(browserId: string, account: Account) {
		addToMap(this.browserIdMap, browserId, account);
	}
	private removeBrowserIdFromMap(browserId: string, account: Account) {
		removeFromMap(this.browserIdMap, browserId, account);
	}
	private getAccount(id: string | undefined) {
		return id ? this.accounts.get(id) : undefined;
	}
	private getOrCreateOrigin({ ip, country }: OriginInfo): Origin {
		return this.origins.get(ip)
			|| this.origins.add({ _id: '', ip, country, accounts: [], updatedAt: new Date(0), createdAt: new Date(0) });
	}
	private assignAccount<T extends { account?: string; }>(item: T, unassigned: T[], action: (account: Account) => void) {
		const account = this.getAccount(item.account);

		if (account) {
			action(account);
		} else {
			pushUnique(unassigned, item);
		}
	}
	private updateOriginRefs(a: Account) {
		if (a.originsRefs) {
			for (const o of a.originsRefs) {
				removeById(o.origin.accounts!, a._id);
			}
		}

		const oldOriginRefs = a.originsRefs;
		a.originsRefs = a.origins.map(o => <OriginRef>{ origin: this.getOrCreateOrigin(o), last: o.last });

		sort(a.originsRefs, compareOriginRefs);

		for (const o of a.originsRefs) {
			if (o.origin.accounts && !includes(o.origin.accounts, a)) {
				o.origin.accounts.push(a);
			}
		}

		if (oldOriginRefs) {
			for (const o of oldOriginRefs) {
				if (!o.origin._id && o.origin.accounts!.length === 0) {
					this.origins.removed(o.origin.ip);
				} else {
					this.origins.trigger(o.origin.ip, o.origin);
				}
			}
		}

		if (a.originsList) {
			a.originsList.replace(a.originsRefs);
		}
	}
	private assignItems<T extends { account?: string; }>(unassigned: T[], push: (account: Account, item: T) => void) {
		remove(unassigned, item => {
			const account = item.account && this.getAccount(item.account);

			if (account) {
				push(account, item);
				return true;
			} else {
				return false;
			}
		});
	}
	private createUpdater<T extends { account?: string; }>(
		{ add, remove }: {
			remove: (account: Account, item: T) => void;
			add: (account: Account | undefined, item: T) => void;
		}
	) {
		return (oldItem: T, newItem: T) => {
			const oldAccountId = oldItem.account;
			const newAccountId = newItem.account;

			Object.assign(oldItem, newItem);

			if (oldAccountId !== newAccountId) {
				const oldAccount = this.getAccount(oldAccountId);
				const newAccount = this.getAccount(newAccountId);

				if (oldAccount) {
					remove(oldAccount, oldItem);
				}

				add(newAccount, oldItem);
			}
		};
	}
}

function findIndexById<U, T extends { _id: U }>(items: T[], id: U): number {
	for (let i = 0; i < items.length; i++) {
		if (items[i]._id === id) {
			return i;
		}
	}

	return -1;
}

function removeById<U, T extends { _id: U }>(items: T[], id: U): T | undefined {
	const index = findIndexById(items, id);

	if (index !== -1) {
		const item = items[index];
		items.splice(index, 1);
		return item;
	} else {
		return undefined;
	}
}
