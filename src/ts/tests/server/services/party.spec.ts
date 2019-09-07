import '../../lib';
import { range } from 'lodash';
import { expect } from 'chai';
import { stub, assert, SinonStub, SinonFakeTimers, useFakeTimers, match } from 'sinon';
import { PartyFlags, NotificationFlags } from '../../../common/interfaces';
import { AccountFlags } from '../../../common/adminInterfaces';
import { PARTY_LIMIT, HOUR } from '../../../common/constants';
import { NotificationService } from '../../../server/services/notification';
import { IClient, ServerParty } from '../../../server/serverInterfaces';
import {
	PartyService, LEADER_TIMEOUT, INVITE_LIMIT, INVITE_REJECTED_LIMIT, INVITE_REJECTED_TIMEOUT
} from '../../../server/services/party';
import { mockClient } from '../../mocks';
import { addIgnore } from '../../../server/playerUtils';
import { times } from '../../../common/utils';

describe('PartyService', () => {
	let notificationService: NotificationService;
	let partyService: PartyService;
	let leader: IClient;
	let client: IClient;
	let addNotification: SinonStub<any>;
	let leaderUpdateParty: SinonStub<any>;
	let clientUpdateParty: SinonStub<any>;
	let reportInviteLimit: SinonStub<any>;
	let clock: SinonFakeTimers;

	function createClient(id: number, characterId?: string, accountId?: string): IClient {
		return mockClient({
			accountId,
			characterId,
			pony: { id },
			character: { id: characterId },
			account: { id: accountId },
		});
	}

	function createParty(leader: IClient, clients: IClient[] = [], pending: IClient[] = []): ServerParty {
		const party: ServerParty = {
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
		clock = useFakeTimers(Date.now());
		leader = createClient(1, 'foo', 'foofoo');
		client = createClient(2, 'bar', 'barbar');
		leaderUpdateParty = stub(leader, 'updateParty');
		clientUpdateParty = stub(client, 'updateParty');
		reportInviteLimit = stub();
		notificationService = new NotificationService();
		addNotification = stub(notificationService, 'addNotification').returns(1);
		partyService = new PartyService(notificationService, reportInviteLimit);
	});

	afterEach(() => {
		clock.restore();
		partyService.dispose();
	});

	describe('clientConnected()', () => {
		it('does nothing if there is no party for client', () => {
			partyService.clientConnected(client);

			assert.notCalled(clientUpdateParty);
		});

		describe('rejoining', () => {
			beforeEach(() => {
				partyService.invite(leader, client);
				addNotification.firstCall.args[1].accept();
			});

			it('replaces matching client', () => {
				const newClient = createClient(5, 'bar', 'barbar');

				partyService.clientConnected(newClient);

				expect(leader.party!.clients[1]).equal(newClient);
			});

			it('replaces matching client for the same account', () => {
				const newClient = createClient(5, 'abc', 'barbar');

				partyService.clientConnected(newClient);

				expect(leader.party!.clients[1]).equal(newClient);
			});

			it('updates leader if leader reconnected', () => {
				const newLeader = createClient(5, 'foo', 'foofoo');

				partyService.clientConnected(newLeader);

				expect(client.party!.leader).equal(newLeader);
			});

			it('sends party update', () => {
				const newClient = createClient(5, 'bar', 'barbar');
				const updateParty = stub(newClient, 'updateParty');
				leaderUpdateParty.reset();

				partyService.clientConnected(newClient);

				assert.calledOnce(updateParty);
				assert.calledOnce(leaderUpdateParty);
			});

			it('sets party for new client', () => {
				const newClient = createClient(5, 'bar', 'barbar');

				partyService.clientConnected(newClient);

				expect(newClient.party).equal(leader.party);
			});

			it('unsets party for old client', () => {
				const newClient = createClient(5, 'bar', 'barbar');

				partyService.clientConnected(newClient);

				expect(client.party).undefined;
			});

			it('sets offlineAt to current time', () => {
				const newClient = createClient(5, 'bar', 'barbar');

				clock.setSystemTime(100);
				partyService.clientConnected(newClient);

				expect(client.offlineAt!.getTime()).equal(new Date().getTime());
			});
		});

		it('cancels new leader promotion', () => {
			const party = createParty(leader, [client, createClient(9, 'x', 'xx')]);
			const promoteLeader = stub(partyService, 'promoteLeader');
			const newLeader = createClient(10, 'foo', 'foofoo');

			leader.offline = true;
			partyService.clientDisconnected(leader);
			partyService.clientConnected(newLeader);
			clock.tick(LEADER_TIMEOUT + 100);

			expect(party.leader).equal(newLeader);
			assert.notCalled(promoteLeader);
		});
	});

	describe('clientDisconnected()', () => {
		it('sends party update', () => {
			createParty(leader, [client]);

			client.offline = true;
			partyService.clientDisconnected(client);

			assert.calledWith(leaderUpdateParty, [
				[1, PartyFlags.Leader],
				[2, PartyFlags.Offline],
			]);
		});

		it('does not send party update to disconnected client', () => {
			createParty(leader, [client]);

			client.offline = true;
			partyService.clientDisconnected(client);

			assert.notCalled(clientUpdateParty);
		});

		it('does nothing if not member of a party', () => {
			createParty(leader, [createClient(9)]);

			client.offline = true;
			partyService.clientDisconnected(client);

			assert.notCalled(leaderUpdateParty);
		});

		it('promotes new leader after timeout', () => {
			createParty(leader, [client, createClient(9)]);
			const promoteLeader = stub(partyService, 'promoteLeader');

			leader.offline = true;
			partyService.clientDisconnected(leader);
			clock.tick(LEADER_TIMEOUT + 100);

			assert.calledWith(promoteLeader, leader, client);
		});

		it('does not promote offline player as the new leader', () => {
			const anotherClient = createClient(9);
			createParty(leader, [client, anotherClient]);
			const promoteLeader = stub(partyService, 'promoteLeader');

			leader.offline = true;
			client.offline = true;
			partyService.clientDisconnected(leader);
			clock.tick(LEADER_TIMEOUT + 100);

			assert.calledWith(promoteLeader, leader, anotherClient);
		});

		it('removes client if pending', () => {
			const party = createParty(leader, [createClient(9)], [client]);

			client.offline = true;
			partyService.clientDisconnected(client);

			expect(party.pending).empty;
		});

		it('sends party update (pending)', () => {
			createParty(leader, [createClient(9)], [client]);

			client.offline = true;
			partyService.clientDisconnected(client);

			assert.calledOnce(leaderUpdateParty);
		});

		it('disbands party if cant find new leader after timeout', () => {
			const party = createParty(leader, [], [client, createClient(9)]);

			leader.offline = true;
			partyService.clientDisconnected(leader);
			clock.tick(LEADER_TIMEOUT + 100);

			expect(partyService.parties).not.include(party);
		});
	});

	describe('invite()', () => {
		it('creates new party on the leader if none exists', () => {
			partyService.invite(leader, client);

			expect(leader.party).not.empty;
			expect(leader.party!.leader).equal(leader);
			expect(leader.party!.clients).eql([leader]);
			expect(leader.party!.pending).eql([{ client, notificationId: 1 }]);
			expect(partyService.parties).contain(leader.party!);
		});

		it('adds client to pending members', () => {
			partyService.invite(leader, client);

			expect(leader.party!.pending[0].client).equal(client);
		});

		it('logs party invitation', () => {
			const systemLog = stub(leader.reporter, 'systemLog');

			partyService.invite(leader, client);

			assert.calledWith(systemLog, 'Invite to party [barbar]');
		});

		it('sends invite notice the the client', () => {
			leader.pony.name = 'foo';

			partyService.invite(leader, client);

			assert.calledWith(addNotification, client, match({
				name: 'foo',
				entityId: leader.pony.id,
				message: '<div class="text-party"><b>Party invite</b></div><b>#NAME#</b> invited you to a party',
				flags: NotificationFlags.Accept | NotificationFlags.Reject | NotificationFlags.Ignore,
			}));
		});

		it('sends invite notice the the client (existing party)', () => {
			leader.party = createParty(leader, [createClient(3)]);

			partyService.invite(leader, client);

			assert.calledOnce(addNotification);
		});

		it('sends party update to the leader', () => {
			partyService.invite(leader, client);

			assert.calledWithMatch(leaderUpdateParty, [
				[1, PartyFlags.Leader],
				[2, PartyFlags.Pending],
			]);
		});

		it('does nothing if already is in party and not a leader', () => {
			const someone = createClient(3);
			someone.party = createParty(leader, [someone]);

			partyService.invite(someone, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if client is already in a party', () => {
			client.party = createParty(client);

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if client is already pending', () => {
			leader.party = createParty(leader, [], [client]);

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if party is already at member limit', () => {
			leader.party = createParty(leader, range(0, PARTY_LIMIT - 1).map(i => createClient(i + 10)));

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if party is already at member limit (pending)', () => {
			leader.party = createParty(leader, [], range(0, PARTY_LIMIT - 1).map(i => createClient(i + 10)));

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if leader is ignored', () => {
			leader.party = createParty(leader, [createClient(9)], []);
			addIgnore(leader, client.accountId);

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if leader is timedout', () => {
			leader.account.mute = Date.now() + HOUR;

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if leader is muted', () => {
			leader.account.mute = -1;

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if leader is shadowed', () => {
			leader.shadowed = true;

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if client is offline', () => {
			leader.party = createParty(leader, [createClient(9)], []);
			client.offline = true;

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if inviting self (client)', () => {
			partyService.invite(leader, leader);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if inviting self (account)', () => {
			client.accountId = leader.accountId;

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		function setupRejectLimit() {
			range(0, INVITE_REJECTED_LIMIT).forEach(i => {
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

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('reports if reached invite limit', () => {
			setupRejectLimit();

			assert.calledWith(reportInviteLimit, leader);
		});

		it('resets invite limit periodically', () => {
			setupRejectLimit();
			addNotification.reset();
			addNotification.returns(1);
			leaderUpdateParty.reset();
			clock.tick(INVITE_REJECTED_TIMEOUT * 2);

			partyService.invite(leader, client);

			assert.calledOnce(addNotification);
			assert.calledOnce(leaderUpdateParty);
		});

		it('does nothing if leader has party invites blocked', () => {
			leader.party = createParty(leader, [createClient(9)], []);
			leader.account.flags = AccountFlags.BlockPartyInvites;

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if user ignores all party requests', () => {
			leader.party = createParty(leader, [createClient(9)], []);
			client.accountSettings = { ignorePartyInvites: true };

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if user already reached party request limit', () => {
			range(0, INVITE_LIMIT).forEach(i => partyService.invite(createClient(10 + i), client));
			addNotification.reset();

			partyService.invite(leader, client);

			assert.notCalled(addNotification);
		});

		it('does nothing if add notification returns 0', () => {
			addNotification.returns(0);

			partyService.invite(leader, client);

			expect(leader.party).undefined;
			assert.notCalled(leaderUpdateParty);
			assert.notCalled(clientUpdateParty);
		});

		it('does nothing for existing party if add notification returns 0', () => {
			const party = createParty(leader, [createClient(9)], []);
			leader.party = party;
			addNotification.returns(0);

			partyService.invite(leader, client);

			expect(leader.party).equal(party);
			assert.notCalled(clientUpdateParty);
		});

		describe('notification.accept()', () => {
			function accept() {
				addNotification.firstCall.args[1].accept();
			}

			it('removes client from pending', () => {
				partyService.invite(leader, client);

				accept();

				expect(leader.party!.pending).empty;
			});

			it('removes notification', () => {
				const removeNotification = stub(notificationService, 'removeNotification');
				partyService.invite(leader, client);

				accept();

				assert.calledWith(removeNotification, client, 1);
			});

			it('adds client to clients', () => {
				partyService.invite(leader, client);

				accept();

				expect(leader.party!.clients).contain(client);
			});

			it('sets party for client', () => {
				partyService.invite(leader, client);

				accept();

				expect(client.party).equal(leader.party);
			});

			it('sends party update', () => {
				partyService.invite(leader, client);
				leaderUpdateParty.reset();
				clientUpdateParty.reset();

				accept();

				assert.calledOnce(leaderUpdateParty);
				assert.calledOnce(clientUpdateParty);
			});

			it('logs accept', () => {
				const systemLog = stub(leader.reporter, 'systemLog');
				partyService.invite(leader, client);

				accept();

				assert.calledWith(systemLog, 'Invite accepted by [barbar]');
			});

			it('rejects all other party invites', () => {
				const leader2 = createClient(8);
				const leader3 = createClient(9);
				partyService.invite(leader, client);
				partyService.invite(leader2, client);
				partyService.invite(leader3, client);

				accept();

				expect(leader2.party).undefined;
				expect(leader3.party).undefined;
			});

			it('does nothing if not in pending', () => {
				createParty(leader, [createClient(9)]);
				partyService.invite(leader, client);
				partyService.remove(leader, client);
				leaderUpdateParty.reset();

				accept();

				assert.notCalled(leaderUpdateParty);
			});

			it('does nothing if party does not exist', () => {
				partyService.invite(leader, client);
				partyService.remove(leader, client);
				leaderUpdateParty.reset();

				accept();

				assert.notCalled(leaderUpdateParty);
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

				expect(leader.party!.pending).empty;
			});

			it('removes notification', () => {
				const removeNotification = stub(notificationService, 'removeNotification');
				partyService.invite(leader, client);

				reject();

				assert.calledWith(removeNotification, client, 1);
			});

			it('sends party update', () => {
				createParty(leader, [createClient(9)]);
				partyService.invite(leader, client);
				leaderUpdateParty.reset();

				reject();

				assert.calledOnce(leaderUpdateParty);
			});

			it('logs rejection', () => {
				const systemLog = stub(leader.reporter, 'systemLog');
				partyService.invite(leader, client);

				reject();

				assert.calledWith(systemLog, 'Invite rejected by [barbar]');
			});

			it('disbands party if less than 2 users', () => {
				partyService.invite(leader, client);
				leaderUpdateParty.reset();

				reject();

				expect(leader.party).undefined;
			});

			it('does nothing if client is not pending anymore', () => {
				createParty(leader, [createClient(9)]);
				partyService.invite(leader, client);
				partyService.remove(leader, client);
				leaderUpdateParty.reset();

				reject();

				assert.notCalled(leaderUpdateParty);
			});
		});
	});

	describe('remove()', () => {
		it('removes client from the party', () => {
			const party = createParty(leader, [client, createClient(3)]);
			client.party = party;

			partyService.remove(leader, client);

			expect(party.clients).not.include(client);
		});

		it('removes party from the client', () => {
			const party = createParty(leader, [client, createClient(3)]);
			client.party = party;

			partyService.remove(leader, client);

			expect(client.party).undefined;
		});

		it('removes pending client from the party', () => {
			const party = createParty(leader, [createClient(3)], [client]);
			client.party = party;

			partyService.remove(leader, client);

			expect(party.pending).empty;
		});

		it('logs cancel if removed pending client', () => {
			const systemLog = stub(leader.reporter, 'systemLog');
			const party = createParty(leader, [createClient(3)], [client]);
			client.party = party;

			partyService.remove(leader, client);

			assert.calledWith(systemLog, 'Invite cancelled for [barbar]');
		});

		it('counts invite limit for cancels', () => {
			const party = createParty(leader, [createClient(3)], []);

			times(INVITE_REJECTED_LIMIT, () => {
				client.party = party;
				party.pending.push({ client, notificationId: 0 });
				partyService.remove(leader, client);
			});

			assert.calledWith(reportInviteLimit, leader);
		});

		it('removes pending client notification', () => {
			const removeNotification = stub(notificationService, 'removeNotification');
			const party = createParty(leader, [createClient(3)], [client]);
			client.party = party;

			partyService.remove(leader, client);

			assert.calledWith(removeNotification, client, 5);
		});

		it('sends party update to all clients', () => {
			const party = createParty(leader, [client, createClient(3)]);
			client.party = party;

			partyService.remove(leader, client);

			assert.calledOnce(leaderUpdateParty);
		});

		it('sends party update to all clients (pending)', () => {
			const party = createParty(leader, [createClient(3)], [client]);
			client.party = party;

			partyService.remove(leader, client);

			assert.calledOnce(leaderUpdateParty);
		});

		it('sends undefined party update to the client', () => {
			const party = createParty(leader, [client, createClient(3)]);
			client.party = party;

			partyService.remove(leader, client);

			assert.calledWith(clientUpdateParty, undefined);
		});

		it('does nothing if given leader is not the leader of the party', () => {
			const party = createParty(leader, [client, createClient(3)]);
			client.party = party;

			partyService.remove(createClient(4), client);

			expect(party.clients).include(client);
			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if given client is not in the party', () => {
			const party = createParty(leader, [createClient(3), createClient(4)]);

			partyService.remove(leader, client);

			expect(party.clients).not.include(client);
			assert.notCalled(leaderUpdateParty);
		});

		it('selects new party leader', () => {
			const party = createParty(leader, [client, createClient(3)]);

			partyService.remove(leader, leader);

			expect(party.leader).equal(client);
		});

		it('disbands party if less than 2 members are left', () => {
			createParty(leader, [client]);

			partyService.remove(leader, client);

			expect(leader.party).undefined;
			expect(client.party).undefined;
		});

		it('disbands party if cannot find new leader', () => {
			const party = createParty(leader, [], [createClient(9), createClient(10)]);

			partyService.remove(leader, leader);

			expect(partyService.parties).not.include(party);
		});

		it('disbands party and clear all its fields', () => {
			const party = createParty(leader, [client], []);

			partyService.remove(leader, leader);

			expect(party.clients).empty;
			expect(party.pending).empty;
		});
	});

	describe('leave()', () => {
		it('calls removeFromParty', () => {
			createParty(leader, [client]);
			const remove = stub(partyService, 'remove');

			partyService.leave(client);

			assert.calledWith(remove, leader, client);
		});

		it('does not call removeFromParty if not in party', () => {
			const remove = stub(partyService, 'remove');

			partyService.leave(client);

			assert.notCalled(remove);
		});
	});

	describe('promoteLeader()', () => {
		it('sets client as leader', () => {
			const party = createParty(leader, [client]);

			partyService.promoteLeader(leader, client);

			expect(party.leader).equal(client);
		});

		it('sends party update', () => {
			createParty(leader, [client]);

			partyService.promoteLeader(leader, client);

			assert.calledWithMatch(leaderUpdateParty, [
				[1, PartyFlags.None],
				[2, PartyFlags.Leader],
			]);
		});

		it('does nothing if client is already the leader', () => {
			createParty(leader, [client]);

			partyService.promoteLeader(leader, leader);

			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if client is offline', () => {
			createParty(leader, [client]);
			client.offline = true;

			partyService.promoteLeader(leader, client);

			assert.notCalled(leaderUpdateParty);
		});

		it('does nothing if leader is not in party', () => {
			createParty(createClient(9), [client]);

			partyService.promoteLeader(leader, client);

			assert.notCalled(clientUpdateParty);
		});

		it('does nothing if leader is not a leader', () => {
			createParty(createClient(9), [leader, client]);

			partyService.promoteLeader(leader, client);

			assert.notCalled(clientUpdateParty);
		});

		it('does nothing if client is not in party', () => {
			createParty(leader, [createClient(9)]);

			partyService.promoteLeader(leader, client);

			assert.notCalled(leaderUpdateParty);
		});
	});
});
