import { Subject } from 'rxjs';
import { remove } from 'lodash';
import { PartyFlags, NotificationFlags } from '../../common/interfaces';
import { AccountFlags } from '../../common/adminInterfaces';
import { removeItem, hasFlag, includes } from '../../common/utils';
import { PARTY_LIMIT, HOUR, SECOND } from '../../common/constants';
import { ServerParty, IClient } from '../serverInterfaces';
import { NotificationService } from './notification';
import { ActionLimiter, LimiterResult } from './actionLimiter';
import { saySystem } from '../chat';
import { isFriend } from './friends';

export const LEADER_TIMEOUT = 5 * SECOND;
export const INVITE_LIMIT = 5;
export const INVITE_REJECTED_LIMIT = 5;
export const INVITE_REJECTED_TIMEOUT = 1 * HOUR;

function toPartyMember(client: IClient, pending: boolean, leader: boolean): [number, PartyFlags] {
	const flags = (pending ? PartyFlags.Pending : 0)
		| (leader ? PartyFlags.Leader : 0)
		| (client.offline ? PartyFlags.Offline : 0);

	return [client.pony.id, flags];
}

function findClientInParties(parties: ServerParty[], accountId: string) {
	for (const party of parties) {
		for (let index = 0; index < party.clients.length; index++) {
			if (party.clients[index].accountId === accountId) {
				return { party, index };
			}
		}
	}

	return { party: undefined, index: 0 };
}

export class PartyService {
	parties: ServerParty[] = [];
	partyChanged = new Subject<IClient>();
	private id = 0;
	private limiter = new ActionLimiter(INVITE_REJECTED_TIMEOUT, INVITE_REJECTED_LIMIT);
	constructor(
		private notificationService: NotificationService,
		private reportInviteLimit: (client: IClient) => void,
	) {
	}
	dispose() {
		this.limiter.dispose();
	}
	clientConnected(client: IClient) {
		const { party, index } = findClientInParties(this.parties, client.accountId);

		if (party) {
			const existing = party.clients[index];
			party.clients[index] = client;
			client.party = party;

			if (party.leader === existing) {
				party.leader = client;
				clearTimeout(party.leaderTimeout);
			}

			existing.party = undefined;
			existing.offlineAt = new Date();

			this.sendPartyUpdateToAll(party);
		}
	}
	clientDisconnected(client: IClient) {
		const party = client.party;

		if (party) {
			this.sendPartyUpdateToAll(party);

			party.leaderTimeout = setTimeout(() => {
				const newLeader = party.clients.find(c => c !== client && !c.offline);

				if (newLeader) {
					this.promoteLeader(client, newLeader);
				} else {
					this.destroyParty(party);
				}
			}, LEADER_TIMEOUT);
		} else {
			const pendingParty = this.parties.find(p => p.pending.some(x => x.client === client));

			if (pendingParty) {
				remove(pendingParty.pending, x => x.client === client);
				this.sendPartyUpdateToAll(pendingParty);
			}
		}
	}
	remove(leader: IClient, client: IClient) {
		const party = leader.party;

		if (!party || party.leader !== leader)
			return;

		if (includes(party.clients, client)) {
			removeItem(party.clients, client);
			client.party = undefined;

			if (party.leader === client && party.clients[0]) {
				party.leader = party.clients[0];
			}

			client.updateParty(undefined);
			this.sendPartyUpdateToAll(party);
			this.partyChanged.next(client);
		} else {
			const pending = party.pending.find(p => p.client === client);

			if (pending) {
				leader.reporter.systemLog(`Invite cancelled for [${client.accountId}]`);
				removeItem(party.pending, pending);
				this.notificationService.removeNotification(pending.client, pending.notificationId);
				this.sendPartyUpdateToAll(party);
				this.countReject(leader);
			}
		}

		this.cleanupParty(party);
	}
	invite(leader: IClient, client: IClient) {
		let party = leader.party;

		const can = this.limiter.canExecute(leader, client);

		if (can === LimiterResult.LimitReached) {
			return saySystem(leader, 'Reached invite rejection limit');
		} else if (can !== LimiterResult.Yes) {
			return saySystem(leader, 'Cannot invite');
		}

		if (client.shadowed)
			return saySystem(leader, 'Cannot invite');

		if (hasFlag(leader.account.flags, AccountFlags.BlockPartyInvites))
			return saySystem(leader, 'Cannot invite');

		if (party && party.leader !== leader)
			return saySystem(leader, 'You need to be party leader');

		if (party && (party.clients.length + party.pending.length) >= PARTY_LIMIT)
			return saySystem(leader, 'Party is full');

		if (client.party)
			return saySystem(leader, 'Already in a party');

		if (party && party.pending.some(p => p.client === client))
			return saySystem(leader, 'Already invited');

		if (client.accountSettings.ignorePartyInvites && !isFriend(client, leader))
			return saySystem(leader, 'Cannot invite');

		if (this.parties.reduce((sum, p) => sum + p.pending.filter(x => x.client === client).length, 0) >= INVITE_LIMIT)
			return saySystem(leader, 'Too many pending invites');

		const partyExisted = !!leader.party;

		if (!partyExisted) {
			party = this.createParty(leader);
		}

		/* istanbul ignore next */
		if (!party)
			throw new Error(`Party not created`);

		const notificationId = this.addInviteNotification(client, leader, party);

		if (!notificationId) {
			if (!partyExisted) {
				leader.party = undefined;
				removeItem(this.parties, party);
			}

			return saySystem(leader, 'Cannot invite');
		}

		party.pending.push({ client, notificationId });
		this.sendPartyUpdateToAll(party);
		leader.reporter.systemLog(`Invite to party [${client.accountId}]`);

		if (!partyExisted) {
			this.partyChanged.next(leader);
		}
	}
	leave(client: IClient) {
		if (client.party) {
			this.remove(client.party.leader, client);
		}
	}
	promoteLeader(leader: IClient, client: IClient) {
		const party = leader.party;

		if (!party)
			return;

		if (leader === client)
			return;

		if (client.offline)
			return saySystem(leader, 'Player is offline');

		if (party.leader !== leader)
			return saySystem(leader, 'You need to be party leader');

		if (!includes(party.clients, client))
			return saySystem(leader, 'Not in the party');

		party.leader = client;
		this.sendPartyUpdateToAll(party);
	}
	cleanupParties() {
		const now = Date.now();

		for (let i = this.parties.length - 1; i >= 0; i--) {
			const party = this.parties[i];

			if (party.clients.every(c => c.offline)) {
				party.cleanup = party.cleanup || now;

				if ((now - party.cleanup) > (10 * SECOND)) {
					this.destroyParty(party);
				}
			} else if (party.cleanup !== undefined) {
				party.cleanup = undefined;
			}
		}
	}
	private createParty(leader: IClient) {
		const party: ServerParty = {
			id: `party-${this.id++}`,
			leader,
			clients: [leader],
			pending: [],
		};

		leader.party = party;
		this.parties.push(party);
		return party;
	}
	private destroyParty(party: ServerParty) {
		const clients = party.clients;
		clients.forEach(c => c.party = undefined);
		clients.forEach(c => c.updateParty(undefined));
		party.pending.forEach(p => this.notificationService.removeNotification(p.client, p.notificationId));
		party.clients = [];
		party.pending = [];
		removeItem(this.parties, party);
		clients.forEach(c => this.partyChanged.next(c));
	}
	private sendPartyUpdate(client: IClient, party: ServerParty) {
		const clients = party.clients.map(c => toPartyMember(c, false, c === party.leader));
		const pending = party.pending.map(c => toPartyMember(c.client, true, false));
		client.updateParty([...clients, ...pending]);
	}
	private sendPartyUpdateToAll(party: ServerParty) {
		party.clients
			.filter(c => !c.offline)
			.forEach(c => this.sendPartyUpdate(c, party));
	}
	private cleanupParty(party: ServerParty) {
		if (party.clients.length === 0 || (party.clients.length + party.pending.length) <= 1) {
			this.destroyParty(party);
		}
	}
	private acceptInvitation(party: ServerParty, client: IClient, invitedBy: IClient) {
		const removed = remove(party.pending, p => p.client === client)[0];

		if (!client.party && removed) {
			party.leader.reporter.systemLog(`Invite accepted by [${client.accountId}]`);
			party.clients.push(client);
			client.party = party;
			this.notificationService.removeNotification(client, removed.notificationId);
			this.sendPartyUpdateToAll(party);

			this.parties
				.filter(p => p.pending.some(x => x.client === client))
				.forEach(p => this.rejectInvitation(p, client, invitedBy));

			this.partyChanged.next(client);
		}
	}
	private rejectInvitation(party: ServerParty, client: IClient, invitedBy: IClient) {
		const removed = remove(party.pending, p => p.client === client)[0];

		if (removed) {
			party.leader.reporter.systemLog(`Invite rejected by [${client.accountId}]`);
			this.notificationService.removeNotification(client, removed.notificationId);
			this.sendPartyUpdateToAll(party);
			this.cleanupParty(party);
			this.countReject(invitedBy);
		}
	}
	private countReject(invitedBy: IClient) {
		const count = this.limiter.count(invitedBy);

		if (count >= INVITE_REJECTED_LIMIT) {
			this.reportInviteLimit(invitedBy);
		}
	}
	private addInviteNotification(client: IClient, leader: IClient, party: ServerParty) {
		return this.notificationService.addNotification(client, {
			id: 0,
			sender: leader,
			name: leader.pony.name || '',
			entityId: leader.pony.id,
			message: `<div class="text-party"><b>Party invite</b></div><b>#NAME#</b> invited you to a party`,
			flags: NotificationFlags.Accept | NotificationFlags.Reject | NotificationFlags.Ignore |
				(client.pony.nameBad ? NotificationFlags.NameBad : 0),
			accept: () => this.acceptInvitation(party, client, leader),
			reject: () => this.rejectInvitation(party, client, leader),
		});
	}
}
