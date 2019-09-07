"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../../lib");
const lodash_1 = require("lodash");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const constants_1 = require("../../../common/constants");
const notification_1 = require("../../../server/services/notification");
const party_1 = require("../../../server/services/party");
const mocks_1 = require("../../mocks");
const playerUtils_1 = require("../../../server/playerUtils");
const utils_1 = require("../../../common/utils");
describe('PartyService', () => {
    let notificationService;
    let partyService;
    let leader;
    let client;
    let addNotification;
    let leaderUpdateParty;
    let clientUpdateParty;
    let reportInviteLimit;
    let clock;
    function createClient(id, characterId, accountId) {
        return mocks_1.mockClient({
            accountId,
            characterId,
            pony: { id },
            character: { id: characterId },
            account: { id: accountId },
        });
    }
    function createParty(leader, clients = [], pending = []) {
        const party = {
            id: 'some_id',
            leader,
            clients: [leader, ...clients],
            pending: pending.map(client => ({ client, notificationId: 5 })),
        };
        party.clients.forEach(c => c.party = party);
        partyService.parties.push(party);
        return party;
    }
    beforeEach(() => {
        clock = sinon_1.useFakeTimers(Date.now());
        leader = createClient(1, 'foo', 'foofoo');
        client = createClient(2, 'bar', 'barbar');
        leaderUpdateParty = sinon_1.stub(leader, 'updateParty');
        clientUpdateParty = sinon_1.stub(client, 'updateParty');
        reportInviteLimit = sinon_1.stub();
        notificationService = new notification_1.NotificationService();
        addNotification = sinon_1.stub(notificationService, 'addNotification').returns(1);
        partyService = new party_1.PartyService(notificationService, reportInviteLimit);
    });
    afterEach(() => {
        clock.restore();
        partyService.dispose();
    });
    describe('clientConnected()', () => {
        it('does nothing if there is no party for client', () => {
            partyService.clientConnected(client);
            sinon_1.assert.notCalled(clientUpdateParty);
        });
        describe('rejoining', () => {
            beforeEach(() => {
                partyService.invite(leader, client);
                addNotification.firstCall.args[1].accept();
            });
            it('replaces matching client', () => {
                const newClient = createClient(5, 'bar', 'barbar');
                partyService.clientConnected(newClient);
                chai_1.expect(leader.party.clients[1]).equal(newClient);
            });
            it('replaces matching client for the same account', () => {
                const newClient = createClient(5, 'abc', 'barbar');
                partyService.clientConnected(newClient);
                chai_1.expect(leader.party.clients[1]).equal(newClient);
            });
            it('updates leader if leader reconnected', () => {
                const newLeader = createClient(5, 'foo', 'foofoo');
                partyService.clientConnected(newLeader);
                chai_1.expect(client.party.leader).equal(newLeader);
            });
            it('sends party update', () => {
                const newClient = createClient(5, 'bar', 'barbar');
                const updateParty = sinon_1.stub(newClient, 'updateParty');
                leaderUpdateParty.reset();
                partyService.clientConnected(newClient);
                sinon_1.assert.calledOnce(updateParty);
                sinon_1.assert.calledOnce(leaderUpdateParty);
            });
            it('sets party for new client', () => {
                const newClient = createClient(5, 'bar', 'barbar');
                partyService.clientConnected(newClient);
                chai_1.expect(newClient.party).equal(leader.party);
            });
            it('unsets party for old client', () => {
                const newClient = createClient(5, 'bar', 'barbar');
                partyService.clientConnected(newClient);
                chai_1.expect(client.party).undefined;
            });
            it('sets offlineAt to current time', () => {
                const newClient = createClient(5, 'bar', 'barbar');
                clock.setSystemTime(100);
                partyService.clientConnected(newClient);
                chai_1.expect(client.offlineAt.getTime()).equal(new Date().getTime());
            });
        });
        it('cancels new leader promotion', () => {
            const party = createParty(leader, [client, createClient(9, 'x', 'xx')]);
            const promoteLeader = sinon_1.stub(partyService, 'promoteLeader');
            const newLeader = createClient(10, 'foo', 'foofoo');
            leader.offline = true;
            partyService.clientDisconnected(leader);
            partyService.clientConnected(newLeader);
            clock.tick(party_1.LEADER_TIMEOUT + 100);
            chai_1.expect(party.leader).equal(newLeader);
            sinon_1.assert.notCalled(promoteLeader);
        });
    });
    describe('clientDisconnected()', () => {
        it('sends party update', () => {
            createParty(leader, [client]);
            client.offline = true;
            partyService.clientDisconnected(client);
            sinon_1.assert.calledWith(leaderUpdateParty, [
                [1, 1 /* Leader */],
                [2, 4 /* Offline */],
            ]);
        });
        it('does not send party update to disconnected client', () => {
            createParty(leader, [client]);
            client.offline = true;
            partyService.clientDisconnected(client);
            sinon_1.assert.notCalled(clientUpdateParty);
        });
        it('does nothing if not member of a party', () => {
            createParty(leader, [createClient(9)]);
            client.offline = true;
            partyService.clientDisconnected(client);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('promotes new leader after timeout', () => {
            createParty(leader, [client, createClient(9)]);
            const promoteLeader = sinon_1.stub(partyService, 'promoteLeader');
            leader.offline = true;
            partyService.clientDisconnected(leader);
            clock.tick(party_1.LEADER_TIMEOUT + 100);
            sinon_1.assert.calledWith(promoteLeader, leader, client);
        });
        it('does not promote offline player as the new leader', () => {
            const anotherClient = createClient(9);
            createParty(leader, [client, anotherClient]);
            const promoteLeader = sinon_1.stub(partyService, 'promoteLeader');
            leader.offline = true;
            client.offline = true;
            partyService.clientDisconnected(leader);
            clock.tick(party_1.LEADER_TIMEOUT + 100);
            sinon_1.assert.calledWith(promoteLeader, leader, anotherClient);
        });
        it('removes client if pending', () => {
            const party = createParty(leader, [createClient(9)], [client]);
            client.offline = true;
            partyService.clientDisconnected(client);
            chai_1.expect(party.pending).empty;
        });
        it('sends party update (pending)', () => {
            createParty(leader, [createClient(9)], [client]);
            client.offline = true;
            partyService.clientDisconnected(client);
            sinon_1.assert.calledOnce(leaderUpdateParty);
        });
        it('disbands party if cant find new leader after timeout', () => {
            const party = createParty(leader, [], [client, createClient(9)]);
            leader.offline = true;
            partyService.clientDisconnected(leader);
            clock.tick(party_1.LEADER_TIMEOUT + 100);
            chai_1.expect(partyService.parties).not.include(party);
        });
    });
    describe('invite()', () => {
        it('creates new party on the leader if none exists', () => {
            partyService.invite(leader, client);
            chai_1.expect(leader.party).not.empty;
            chai_1.expect(leader.party.leader).equal(leader);
            chai_1.expect(leader.party.clients).eql([leader]);
            chai_1.expect(leader.party.pending).eql([{ client, notificationId: 1 }]);
            chai_1.expect(partyService.parties).contain(leader.party);
        });
        it('adds client to pending members', () => {
            partyService.invite(leader, client);
            chai_1.expect(leader.party.pending[0].client).equal(client);
        });
        it('logs party invitation', () => {
            const systemLog = sinon_1.stub(leader.reporter, 'systemLog');
            partyService.invite(leader, client);
            sinon_1.assert.calledWith(systemLog, 'Invite to party [barbar]');
        });
        it('sends invite notice the the client', () => {
            leader.pony.name = 'foo';
            partyService.invite(leader, client);
            sinon_1.assert.calledWith(addNotification, client, sinon_1.match({
                name: 'foo',
                entityId: leader.pony.id,
                message: '<div class="text-party"><b>Party invite</b></div><b>#NAME#</b> invited you to a party',
                flags: 8 /* Accept */ | 16 /* Reject */ | 64 /* Ignore */,
            }));
        });
        it('sends invite notice the the client (existing party)', () => {
            leader.party = createParty(leader, [createClient(3)]);
            partyService.invite(leader, client);
            sinon_1.assert.calledOnce(addNotification);
        });
        it('sends party update to the leader', () => {
            partyService.invite(leader, client);
            sinon_1.assert.calledWithMatch(leaderUpdateParty, [
                [1, 1 /* Leader */],
                [2, 2 /* Pending */],
            ]);
        });
        it('does nothing if already is in party and not a leader', () => {
            const someone = createClient(3);
            someone.party = createParty(leader, [someone]);
            partyService.invite(someone, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if client is already in a party', () => {
            client.party = createParty(client);
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if client is already pending', () => {
            leader.party = createParty(leader, [], [client]);
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if party is already at member limit', () => {
            leader.party = createParty(leader, lodash_1.range(0, constants_1.PARTY_LIMIT - 1).map(i => createClient(i + 10)));
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if party is already at member limit (pending)', () => {
            leader.party = createParty(leader, [], lodash_1.range(0, constants_1.PARTY_LIMIT - 1).map(i => createClient(i + 10)));
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if leader is ignored', () => {
            leader.party = createParty(leader, [createClient(9)], []);
            playerUtils_1.addIgnore(leader, client.accountId);
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if leader is timedout', () => {
            leader.account.mute = Date.now() + constants_1.HOUR;
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if leader is muted', () => {
            leader.account.mute = -1;
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if leader is shadowed', () => {
            leader.shadowed = true;
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if client is offline', () => {
            leader.party = createParty(leader, [createClient(9)], []);
            client.offline = true;
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if inviting self (client)', () => {
            partyService.invite(leader, leader);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if inviting self (account)', () => {
            client.accountId = leader.accountId;
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        function setupRejectLimit() {
            lodash_1.range(0, party_1.INVITE_REJECTED_LIMIT).forEach(i => {
                const c = createClient(10 + i);
                partyService.invite(leader, c);
                addNotification.firstCall.args[1].reject();
                addNotification.reset();
                addNotification.returns(1);
            });
        }
        it('does nothing if reached invite limit', () => {
            setupRejectLimit();
            addNotification.reset();
            addNotification.returns(1);
            leaderUpdateParty.reset();
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('reports if reached invite limit', () => {
            setupRejectLimit();
            sinon_1.assert.calledWith(reportInviteLimit, leader);
        });
        it('resets invite limit periodically', () => {
            setupRejectLimit();
            addNotification.reset();
            addNotification.returns(1);
            leaderUpdateParty.reset();
            clock.tick(party_1.INVITE_REJECTED_TIMEOUT * 2);
            partyService.invite(leader, client);
            sinon_1.assert.calledOnce(addNotification);
            sinon_1.assert.calledOnce(leaderUpdateParty);
        });
        it('does nothing if leader has party invites blocked', () => {
            leader.party = createParty(leader, [createClient(9)], []);
            leader.account.flags = 1 /* BlockPartyInvites */;
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if user ignores all party requests', () => {
            leader.party = createParty(leader, [createClient(9)], []);
            client.accountSettings = { ignorePartyInvites: true };
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if user already reached party request limit', () => {
            lodash_1.range(0, party_1.INVITE_LIMIT).forEach(i => partyService.invite(createClient(10 + i), client));
            addNotification.reset();
            partyService.invite(leader, client);
            sinon_1.assert.notCalled(addNotification);
        });
        it('does nothing if add notification returns 0', () => {
            addNotification.returns(0);
            partyService.invite(leader, client);
            chai_1.expect(leader.party).undefined;
            sinon_1.assert.notCalled(leaderUpdateParty);
            sinon_1.assert.notCalled(clientUpdateParty);
        });
        it('does nothing for existing party if add notification returns 0', () => {
            const party = createParty(leader, [createClient(9)], []);
            leader.party = party;
            addNotification.returns(0);
            partyService.invite(leader, client);
            chai_1.expect(leader.party).equal(party);
            sinon_1.assert.notCalled(clientUpdateParty);
        });
        describe('notification.accept()', () => {
            function accept() {
                addNotification.firstCall.args[1].accept();
            }
            it('removes client from pending', () => {
                partyService.invite(leader, client);
                accept();
                chai_1.expect(leader.party.pending).empty;
            });
            it('removes notification', () => {
                const removeNotification = sinon_1.stub(notificationService, 'removeNotification');
                partyService.invite(leader, client);
                accept();
                sinon_1.assert.calledWith(removeNotification, client, 1);
            });
            it('adds client to clients', () => {
                partyService.invite(leader, client);
                accept();
                chai_1.expect(leader.party.clients).contain(client);
            });
            it('sets party for client', () => {
                partyService.invite(leader, client);
                accept();
                chai_1.expect(client.party).equal(leader.party);
            });
            it('sends party update', () => {
                partyService.invite(leader, client);
                leaderUpdateParty.reset();
                clientUpdateParty.reset();
                accept();
                sinon_1.assert.calledOnce(leaderUpdateParty);
                sinon_1.assert.calledOnce(clientUpdateParty);
            });
            it('logs accept', () => {
                const systemLog = sinon_1.stub(leader.reporter, 'systemLog');
                partyService.invite(leader, client);
                accept();
                sinon_1.assert.calledWith(systemLog, 'Invite accepted by [barbar]');
            });
            it('rejects all other party invites', () => {
                const leader2 = createClient(8);
                const leader3 = createClient(9);
                partyService.invite(leader, client);
                partyService.invite(leader2, client);
                partyService.invite(leader3, client);
                accept();
                chai_1.expect(leader2.party).undefined;
                chai_1.expect(leader3.party).undefined;
            });
            it('does nothing if not in pending', () => {
                createParty(leader, [createClient(9)]);
                partyService.invite(leader, client);
                partyService.remove(leader, client);
                leaderUpdateParty.reset();
                accept();
                sinon_1.assert.notCalled(leaderUpdateParty);
            });
            it('does nothing if party does not exist', () => {
                partyService.invite(leader, client);
                partyService.remove(leader, client);
                leaderUpdateParty.reset();
                accept();
                sinon_1.assert.notCalled(leaderUpdateParty);
            });
        });
        describe('notification.reject()', () => {
            function reject() {
                addNotification.firstCall.args[1].reject();
            }
            it('removes client from pending', () => {
                createParty(leader, [createClient(9)]);
                partyService.invite(leader, client);
                reject();
                chai_1.expect(leader.party.pending).empty;
            });
            it('removes notification', () => {
                const removeNotification = sinon_1.stub(notificationService, 'removeNotification');
                partyService.invite(leader, client);
                reject();
                sinon_1.assert.calledWith(removeNotification, client, 1);
            });
            it('sends party update', () => {
                createParty(leader, [createClient(9)]);
                partyService.invite(leader, client);
                leaderUpdateParty.reset();
                reject();
                sinon_1.assert.calledOnce(leaderUpdateParty);
            });
            it('logs rejection', () => {
                const systemLog = sinon_1.stub(leader.reporter, 'systemLog');
                partyService.invite(leader, client);
                reject();
                sinon_1.assert.calledWith(systemLog, 'Invite rejected by [barbar]');
            });
            it('disbands party if less than 2 users', () => {
                partyService.invite(leader, client);
                leaderUpdateParty.reset();
                reject();
                chai_1.expect(leader.party).undefined;
            });
            it('does nothing if client is not pending anymore', () => {
                createParty(leader, [createClient(9)]);
                partyService.invite(leader, client);
                partyService.remove(leader, client);
                leaderUpdateParty.reset();
                reject();
                sinon_1.assert.notCalled(leaderUpdateParty);
            });
        });
    });
    describe('remove()', () => {
        it('removes client from the party', () => {
            const party = createParty(leader, [client, createClient(3)]);
            client.party = party;
            partyService.remove(leader, client);
            chai_1.expect(party.clients).not.include(client);
        });
        it('removes party from the client', () => {
            const party = createParty(leader, [client, createClient(3)]);
            client.party = party;
            partyService.remove(leader, client);
            chai_1.expect(client.party).undefined;
        });
        it('removes pending client from the party', () => {
            const party = createParty(leader, [createClient(3)], [client]);
            client.party = party;
            partyService.remove(leader, client);
            chai_1.expect(party.pending).empty;
        });
        it('logs cancel if removed pending client', () => {
            const systemLog = sinon_1.stub(leader.reporter, 'systemLog');
            const party = createParty(leader, [createClient(3)], [client]);
            client.party = party;
            partyService.remove(leader, client);
            sinon_1.assert.calledWith(systemLog, 'Invite cancelled for [barbar]');
        });
        it('counts invite limit for cancels', () => {
            const party = createParty(leader, [createClient(3)], []);
            utils_1.times(party_1.INVITE_REJECTED_LIMIT, () => {
                client.party = party;
                party.pending.push({ client, notificationId: 0 });
                partyService.remove(leader, client);
            });
            sinon_1.assert.calledWith(reportInviteLimit, leader);
        });
        it('removes pending client notification', () => {
            const removeNotification = sinon_1.stub(notificationService, 'removeNotification');
            const party = createParty(leader, [createClient(3)], [client]);
            client.party = party;
            partyService.remove(leader, client);
            sinon_1.assert.calledWith(removeNotification, client, 5);
        });
        it('sends party update to all clients', () => {
            const party = createParty(leader, [client, createClient(3)]);
            client.party = party;
            partyService.remove(leader, client);
            sinon_1.assert.calledOnce(leaderUpdateParty);
        });
        it('sends party update to all clients (pending)', () => {
            const party = createParty(leader, [createClient(3)], [client]);
            client.party = party;
            partyService.remove(leader, client);
            sinon_1.assert.calledOnce(leaderUpdateParty);
        });
        it('sends undefined party update to the client', () => {
            const party = createParty(leader, [client, createClient(3)]);
            client.party = party;
            partyService.remove(leader, client);
            sinon_1.assert.calledWith(clientUpdateParty, undefined);
        });
        it('does nothing if given leader is not the leader of the party', () => {
            const party = createParty(leader, [client, createClient(3)]);
            client.party = party;
            partyService.remove(createClient(4), client);
            chai_1.expect(party.clients).include(client);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if given client is not in the party', () => {
            const party = createParty(leader, [createClient(3), createClient(4)]);
            partyService.remove(leader, client);
            chai_1.expect(party.clients).not.include(client);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('selects new party leader', () => {
            const party = createParty(leader, [client, createClient(3)]);
            partyService.remove(leader, leader);
            chai_1.expect(party.leader).equal(client);
        });
        it('disbands party if less than 2 members are left', () => {
            createParty(leader, [client]);
            partyService.remove(leader, client);
            chai_1.expect(leader.party).undefined;
            chai_1.expect(client.party).undefined;
        });
        it('disbands party if cannot find new leader', () => {
            const party = createParty(leader, [], [createClient(9), createClient(10)]);
            partyService.remove(leader, leader);
            chai_1.expect(partyService.parties).not.include(party);
        });
        it('disbands party and clear all its fields', () => {
            const party = createParty(leader, [client], []);
            partyService.remove(leader, leader);
            chai_1.expect(party.clients).empty;
            chai_1.expect(party.pending).empty;
        });
    });
    describe('leave()', () => {
        it('calls removeFromParty', () => {
            createParty(leader, [client]);
            const remove = sinon_1.stub(partyService, 'remove');
            partyService.leave(client);
            sinon_1.assert.calledWith(remove, leader, client);
        });
        it('does not call removeFromParty if not in party', () => {
            const remove = sinon_1.stub(partyService, 'remove');
            partyService.leave(client);
            sinon_1.assert.notCalled(remove);
        });
    });
    describe('promoteLeader()', () => {
        it('sets client as leader', () => {
            const party = createParty(leader, [client]);
            partyService.promoteLeader(leader, client);
            chai_1.expect(party.leader).equal(client);
        });
        it('sends party update', () => {
            createParty(leader, [client]);
            partyService.promoteLeader(leader, client);
            sinon_1.assert.calledWithMatch(leaderUpdateParty, [
                [1, 0 /* None */],
                [2, 1 /* Leader */],
            ]);
        });
        it('does nothing if client is already the leader', () => {
            createParty(leader, [client]);
            partyService.promoteLeader(leader, leader);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if client is offline', () => {
            createParty(leader, [client]);
            client.offline = true;
            partyService.promoteLeader(leader, client);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
        it('does nothing if leader is not in party', () => {
            createParty(createClient(9), [client]);
            partyService.promoteLeader(leader, client);
            sinon_1.assert.notCalled(clientUpdateParty);
        });
        it('does nothing if leader is not a leader', () => {
            createParty(createClient(9), [leader, client]);
            partyService.promoteLeader(leader, client);
            sinon_1.assert.notCalled(clientUpdateParty);
        });
        it('does nothing if client is not in party', () => {
            createParty(leader, [createClient(9)]);
            partyService.promoteLeader(leader, client);
            sinon_1.assert.notCalled(leaderUpdateParty);
        });
    });
});
//# sourceMappingURL=party.spec.js.map