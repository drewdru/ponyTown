"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const lodash_1 = require("lodash");
const utils_1 = require("../../common/utils");
const constants_1 = require("../../common/constants");
const actionLimiter_1 = require("./actionLimiter");
const chat_1 = require("../chat");
const friends_1 = require("./friends");
exports.LEADER_TIMEOUT = 5 * constants_1.SECOND;
exports.INVITE_LIMIT = 5;
exports.INVITE_REJECTED_LIMIT = 5;
exports.INVITE_REJECTED_TIMEOUT = 1 * constants_1.HOUR;
function toPartyMember(client, pending, leader) {
    const flags = (pending ? 2 /* Pending */ : 0)
        | (leader ? 1 /* Leader */ : 0)
        | (client.offline ? 4 /* Offline */ : 0);
    return [client.pony.id, flags];
}
function findClientInParties(parties, accountId) {
    for (const party of parties) {
        for (let index = 0; index < party.clients.length; index++) {
            if (party.clients[index].accountId === accountId) {
                return { party, index };
            }
        }
    }
    return { party: undefined, index: 0 };
}
class PartyService {
    constructor(notificationService, reportInviteLimit) {
        this.notificationService = notificationService;
        this.reportInviteLimit = reportInviteLimit;
        this.parties = [];
        this.partyChanged = new rxjs_1.Subject();
        this.id = 0;
        this.limiter = new actionLimiter_1.ActionLimiter(exports.INVITE_REJECTED_TIMEOUT, exports.INVITE_REJECTED_LIMIT);
    }
    dispose() {
        this.limiter.dispose();
    }
    clientConnected(client) {
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
    clientDisconnected(client) {
        const party = client.party;
        if (party) {
            this.sendPartyUpdateToAll(party);
            party.leaderTimeout = setTimeout(() => {
                const newLeader = party.clients.find(c => c !== client && !c.offline);
                if (newLeader) {
                    this.promoteLeader(client, newLeader);
                }
                else {
                    this.destroyParty(party);
                }
            }, exports.LEADER_TIMEOUT);
        }
        else {
            const pendingParty = this.parties.find(p => p.pending.some(x => x.client === client));
            if (pendingParty) {
                lodash_1.remove(pendingParty.pending, x => x.client === client);
                this.sendPartyUpdateToAll(pendingParty);
            }
        }
    }
    remove(leader, client) {
        const party = leader.party;
        if (!party || party.leader !== leader)
            return;
        if (utils_1.includes(party.clients, client)) {
            utils_1.removeItem(party.clients, client);
            client.party = undefined;
            if (party.leader === client && party.clients[0]) {
                party.leader = party.clients[0];
            }
            client.updateParty(undefined);
            this.sendPartyUpdateToAll(party);
            this.partyChanged.next(client);
        }
        else {
            const pending = party.pending.find(p => p.client === client);
            if (pending) {
                leader.reporter.systemLog(`Invite cancelled for [${client.accountId}]`);
                utils_1.removeItem(party.pending, pending);
                this.notificationService.removeNotification(pending.client, pending.notificationId);
                this.sendPartyUpdateToAll(party);
                this.countReject(leader);
            }
        }
        this.cleanupParty(party);
    }
    invite(leader, client) {
        let party = leader.party;
        const can = this.limiter.canExecute(leader, client);
        if (can === 4 /* LimitReached */) {
            return chat_1.saySystem(leader, 'Reached invite rejection limit');
        }
        else if (can !== 0 /* Yes */) {
            return chat_1.saySystem(leader, 'Cannot invite');
        }
        if (client.shadowed)
            return chat_1.saySystem(leader, 'Cannot invite');
        if (utils_1.hasFlag(leader.account.flags, 1 /* BlockPartyInvites */))
            return chat_1.saySystem(leader, 'Cannot invite');
        if (party && party.leader !== leader)
            return chat_1.saySystem(leader, 'You need to be party leader');
        if (party && (party.clients.length + party.pending.length) >= constants_1.PARTY_LIMIT)
            return chat_1.saySystem(leader, 'Party is full');
        if (client.party)
            return chat_1.saySystem(leader, 'Already in a party');
        if (party && party.pending.some(p => p.client === client))
            return chat_1.saySystem(leader, 'Already invited');
        if (client.accountSettings.ignorePartyInvites && !friends_1.isFriend(client, leader))
            return chat_1.saySystem(leader, 'Cannot invite');
        if (this.parties.reduce((sum, p) => sum + p.pending.filter(x => x.client === client).length, 0) >= exports.INVITE_LIMIT)
            return chat_1.saySystem(leader, 'Too many pending invites');
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
                utils_1.removeItem(this.parties, party);
            }
            return chat_1.saySystem(leader, 'Cannot invite');
        }
        party.pending.push({ client, notificationId });
        this.sendPartyUpdateToAll(party);
        leader.reporter.systemLog(`Invite to party [${client.accountId}]`);
        if (!partyExisted) {
            this.partyChanged.next(leader);
        }
    }
    leave(client) {
        if (client.party) {
            this.remove(client.party.leader, client);
        }
    }
    promoteLeader(leader, client) {
        const party = leader.party;
        if (!party)
            return;
        if (leader === client)
            return;
        if (client.offline)
            return chat_1.saySystem(leader, 'Player is offline');
        if (party.leader !== leader)
            return chat_1.saySystem(leader, 'You need to be party leader');
        if (!utils_1.includes(party.clients, client))
            return chat_1.saySystem(leader, 'Not in the party');
        party.leader = client;
        this.sendPartyUpdateToAll(party);
    }
    cleanupParties() {
        const now = Date.now();
        for (let i = this.parties.length - 1; i >= 0; i--) {
            const party = this.parties[i];
            if (party.clients.every(c => c.offline)) {
                party.cleanup = party.cleanup || now;
                if ((now - party.cleanup) > (10 * constants_1.SECOND)) {
                    this.destroyParty(party);
                }
            }
            else if (party.cleanup !== undefined) {
                party.cleanup = undefined;
            }
        }
    }
    createParty(leader) {
        const party = {
            id: `party-${this.id++}`,
            leader,
            clients: [leader],
            pending: [],
        };
        leader.party = party;
        this.parties.push(party);
        return party;
    }
    destroyParty(party) {
        const clients = party.clients;
        clients.forEach(c => c.party = undefined);
        clients.forEach(c => c.updateParty(undefined));
        party.pending.forEach(p => this.notificationService.removeNotification(p.client, p.notificationId));
        party.clients = [];
        party.pending = [];
        utils_1.removeItem(this.parties, party);
        clients.forEach(c => this.partyChanged.next(c));
    }
    sendPartyUpdate(client, party) {
        const clients = party.clients.map(c => toPartyMember(c, false, c === party.leader));
        const pending = party.pending.map(c => toPartyMember(c.client, true, false));
        client.updateParty([...clients, ...pending]);
    }
    sendPartyUpdateToAll(party) {
        party.clients
            .filter(c => !c.offline)
            .forEach(c => this.sendPartyUpdate(c, party));
    }
    cleanupParty(party) {
        if (party.clients.length === 0 || (party.clients.length + party.pending.length) <= 1) {
            this.destroyParty(party);
        }
    }
    acceptInvitation(party, client, invitedBy) {
        const removed = lodash_1.remove(party.pending, p => p.client === client)[0];
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
    rejectInvitation(party, client, invitedBy) {
        const removed = lodash_1.remove(party.pending, p => p.client === client)[0];
        if (removed) {
            party.leader.reporter.systemLog(`Invite rejected by [${client.accountId}]`);
            this.notificationService.removeNotification(client, removed.notificationId);
            this.sendPartyUpdateToAll(party);
            this.cleanupParty(party);
            this.countReject(invitedBy);
        }
    }
    countReject(invitedBy) {
        const count = this.limiter.count(invitedBy);
        if (count >= exports.INVITE_REJECTED_LIMIT) {
            this.reportInviteLimit(invitedBy);
        }
    }
    addInviteNotification(client, leader, party) {
        return this.notificationService.addNotification(client, {
            id: 0,
            sender: leader,
            name: leader.pony.name || '',
            entityId: leader.pony.id,
            message: `<div class="text-party"><b>Party invite</b></div><b>#NAME#</b> invited you to a party`,
            flags: 8 /* Accept */ | 16 /* Reject */ | 64 /* Ignore */ |
                (client.pony.nameBad ? 128 /* NameBad */ : 0),
            accept: () => this.acceptInvitation(party, client, leader),
            reject: () => this.rejectInvitation(party, client, leader),
        });
    }
}
exports.PartyService = PartyService;
//# sourceMappingURL=party.js.map