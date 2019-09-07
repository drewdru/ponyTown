import { stubClass, stubFromInstance, resetStubMethods } from '../lib';
import { expect } from 'chai';
import { stub, assert, spy, SinonSpy, SinonFakeTimers, useFakeTimers, SinonStub } from 'sinon';
import { range } from 'lodash';
import { getWriterBuffer } from 'ag-sockets';
import { encodeString } from 'ag-sockets/dist/utf8';
import {
	ChatType, TileType, Action, PlayerAction, ModAction, Eye, Muzzle, SelectFlags, InfoFlags
} from '../../common/interfaces';
import { CharacterState, ServerConfig, GameServerSettings } from '../../common/adminInterfaces';
import { IClient, AccountService } from '../../server/serverInterfaces';
import { ServerActions } from '../../server/serverActions';
import { World } from '../../server/world';
import { setTile, createServerMap } from '../../server/serverMap';
import { PartyService } from '../../server/services/party';
import { NotificationService } from '../../server/services/notification';
import { HidingService } from '../../server/services/hiding';
import { mockClient, serverEntity } from '../mocks';
import { createCharacterState } from '../../server/playerUtils';
import { CounterService } from '../../server/services/counter';
import { createExpression } from '../../client/clientUtils';
import { encodeExpression } from '../../common/encoders/expressionEncoder';
import { SupporterInvitesService } from '../../server/services/supporterInvites';
import { createCamera } from '../../common/camera';
import { FriendsService } from '../../server/services/friends';
import * as playerUtils from '../../server/playerUtils';

describe('ServerActions', () => {
	let accountService = stubFromInstance<AccountService>({
		update() { },
		updateAccount() { },
		updateSettings() { },
		updateCharacterState() { }
	});
	let notifications = stubClass(NotificationService);
	let partyService = stubClass(PartyService);
	let hiding = stubClass(HidingService);
	let friends = stubClass(FriendsService);
	let states = stubClass<CounterService<CharacterState>>(CounterService);
	let teleports = stubClass<CounterService<void>>(CounterService);
	let supporterInvites = stubClass(SupporterInvitesService);
	let client: IClient;
	let world: World;
	let serverActions: ServerActions;
	let settings: GameServerSettings;
	let server: ServerConfig;
	let ignorePlayer: SinonSpy;
	let findClientByEntityId: SinonStub;
	let say: SinonSpy;
	let move: SinonSpy;
	let execAction: SinonStub;

	beforeEach(() => {
		resetStubMethods(accountService, 'update', 'updateSettings');
		resetStubMethods(notifications, 'acceptNotification', 'rejectNotification');
		resetStubMethods(partyService, 'invite', 'remove', 'promoteLeader');
		resetStubMethods(hiding, 'requestUnhideAll', 'requestHide');
		resetStubMethods(friends, 'add', 'remove', 'removeByAccountId');
		resetStubMethods(teleports);

		execAction = stub(playerUtils, 'execAction');
		client = mockClient();
		world = new World(
			{ flags: { friends: true } } as any, { partyChanged: { subscribe() { } } } as any, {} as any, {} as any,
			{} as any, () => ({}), {} as any, {} as any);
		const map = createServerMap('', 0, 1, 1);
		client.map = map;
		world.maps.push(map);
		settings = {};
		server = { flags: {} } as any;
		ignorePlayer = spy();
		findClientByEntityId = stub();
		say = spy();
		move = spy();

		serverActions = new ServerActions(
			client, world, notifications, partyService as any, supporterInvites as any, () => settings, server, say,
			move, hiding as any, states as any, accountService, ignorePlayer,
			findClientByEntityId, friends as any);
	});

	afterEach(() => {
		execAction.restore();
	});

	describe('connected()', () => {
		// TODO: ...
	});

	describe('disconnected()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('sets client offline flag to true', () => {
			serverActions.disconnected();

			expect(client.offline).true;
		});

		it('leaves client from world', () => {
			const leaveClient = stub(world, 'leaveClient');

			serverActions.disconnected();

			assert.calledWith(leaveClient, client);
		});

		it('notifies party service', () => {
			serverActions.disconnected();

			assert.calledWith(partyService.clientDisconnected, client);
		});

		it('updates last visit', () => {
			clock.setSystemTime(1234);

			serverActions.disconnected();

			assert.calledWith(accountService.updateAccount, client.accountId, { lastVisit: new Date(1234), state: undefined });
		});

		it('updates character state', () => {
			client.pony.x = 123;
			client.pony.y = 321;

			serverActions.disconnected();

			assert.calledWith(
				accountService.updateCharacterState, client.characterId, createCharacterState(client.pony, client.map));
		});

		it('adds state to counter service', () => {
			client.pony.x = 123;
			client.pony.y = 321;

			serverActions.disconnected();

			assert.calledWithMatch(states.add, client.characterId, { x: 123, y: 321 });
		});

		it('logs client leaving', () => {
			const systemLog = stub(client.reporter, 'systemLog');
			server.id = 'server_id';
			clock.setSystemTime(12 * 1000);
			client.connectedTime = 0;

			serverActions.disconnected();

			assert.calledWith(systemLog, 'left [server_id] (disconnected) (12s)');
		});
	});

	describe('say()', () => {
		it('calls chatSay', async () => {
			serverActions.say(0, 'hello', ChatType.Say);

			assert.calledWith(say, client, 'hello', ChatType.Say, undefined, settings);
		});

		it('throws if message is not a string', () => {
			expect(() => serverActions.say(0, {} as any, ChatType.Say)).throw('Not a string (text)');
			expect(() => serverActions.say(0, 123 as any, ChatType.Say)).throw('Not a string (text)');
			expect(() => serverActions.say(0, null as any, ChatType.Say)).throw('Not a string (text)');
		});

		it('throws if type is not a number', () => {
			expect(() => serverActions.say(0, 'test', {} as any)).throw('Not a number (chatType)');
			expect(() => serverActions.say(0, 'test', '1' as any)).throw('Not a number (chatType)');
			expect(() => serverActions.say(0, 'test', null as any)).throw('Not a number (chatType)');
		});
	});

	describe('select()', () => {
		it('sets selected entity', () => {
			const entity = serverEntity(1);
			stub(world, 'getEntityById').withArgs(123).returns(entity);

			serverActions.select(123, SelectFlags.FetchEx);

			expect(client.selected).equal(entity);
		});

		it('sets selected entity from other sources', () => {
			const entity = { id: 123 };
			findClientByEntityId.withArgs(client, 123).returns({ pony: entity });
			stub(world, 'getEntityById').returns(undefined);

			serverActions.select(123, SelectFlags.FetchEx);

			expect(client.selected).equal(entity);
		});

		it('sends extra data for selected entity', () => {
			const entity = serverEntity(1, 0, 0, 0, { client: {} as any, extraOptions: { foo: 5 } });
			stub(world, 'getEntityById').withArgs(123).returns(entity);

			serverActions.select(123, SelectFlags.FetchEx);

			expect(Array.from(getWriterBuffer(client.updateQueue)))
				.eql([2, 0, 32, 0, 0, 0, 1, 129, 3, 102, 111, 111, 165]);
		});

		it('does not send extra data for selected entity if fetch flag is false', () => {
			const entity = serverEntity(1, 0, 0, 0, { client: {} as any, extraOptions: { foo: 5 } });
			stub(world, 'getEntityById').withArgs(123).returns(entity);

			serverActions.select(123, SelectFlags.None);

			expect(Array.from(getWriterBuffer(client.updateQueue))).eql([]);
		});

		it('sends extra mod data for selected entity', () => {
			const entity = serverEntity(1, 0, 0, 0, {
				client: {
					accountId: '12345678901234567890aa',
					account: {
						name: 'foobar',
						shadow: 0,
						mute: -1,
						note: 'bar'
					}
				} as any
			});
			stub(world, 'getEntityById').withArgs(123).returns(entity);
			client.isMod = true;

			serverActions.select(123, SelectFlags.FetchEx);

			expect(Array.from(getWriterBuffer(client.updateQueue))).eql([
				2, 0, 32, 0, 0, 0, 1, 129, 7, 109, 111, 100, 73, 110, 102, 111, 134, 6, 115, 104, 97, 100, 111,
				119, 0, 4, 109, 117, 116, 101, 69, 112, 101, 114, 109, 97, 4, 110, 111, 116, 101, 67, 98, 97,
				114, 8, 99, 111, 117, 110, 116, 101, 114, 115, 128, 7, 99, 111, 117, 110, 116, 114, 121, 0, 7,
				97, 99, 99, 111, 117, 110, 116, 76, 102, 111, 111, 98, 97, 114, 32, 91, 48, 97, 97, 93
			]);
		});
	});

	describe('interact()', () => {
		it('calls interaction with client and entity', () => {
			const entity = serverEntity(1);
			const interact = stub();
			entity.interact = interact;
			stub(world, 'getEntityById').withArgs(123).returns(entity);

			serverActions.interact(123);

			assert.calledOnce(interact);
		});

		it('updates last action', () => {
			client.lastPacket = 0;

			serverActions.interact(123);

			expect(client.lastPacket).not.equal(0);
		});

		it('throws on not a number', () => {
			expect(() => serverActions.interact('foo' as any)).throw('Not a number (entityId)');
		});
	});

	describe('use()', () => {
		// TODO: ...
	});

	describe('action()', () => {
		it('calls unhideAll on hiding service', () => {
			serverActions.action(Action.UnhideAllHiddenPlayers);

			assert.calledWith(hiding.requestUnhideAll, client);
		});

		it('does nothing for KeepAlive action', () => {
			serverActions.action(Action.KeepAlive);

			assert.notCalled(execAction);
		});

		it('executes player action', () => {
			serverActions.action(Action.TurnHead);

			assert.calledWith(execAction, client, Action.TurnHead);
		});

		it('updates last action', () => {
			client.lastPacket = 0;

			serverActions.action(Action.Boop);

			expect(client.lastPacket).not.equal(0);
		});

		it('throws on not a number', () => {
			expect(() => serverActions.action('foo' as any)).throw('Not a number (action)');
		});
	});

	describe('actionParam()', () => {
		it('on RemoveFriend: calls friends.remove()', () => {
			const friend = mockClient();
			world.clientsByAccount.set('some_account_id', friend);

			serverActions.actionParam(Action.RemoveFriend, 'some_account_id');

			assert.calledWith(friends.remove, client, friend);
		});

		it('on RemoveFriend: calls friends.removeByAccountId() if cannot find client', () => {
			serverActions.actionParam(Action.RemoveFriend, 'some_account_id');

			assert.calledWith(friends.removeByAccountId, client, 'some_account_id');
		});
	});

	describe('actionParam2()', () => {
		it('on Info: update client flags', () => {
			serverActions.actionParam2(Action.Info, InfoFlags.SupportsWASM | InfoFlags.SupportsLetAndConst);

			expect(client.supportsWasm).true;
			expect(client.supportsLetAndConst).true;
		});

		it('throws on invalid action', () => {
			expect(() => serverActions.actionParam2(99 as any, undefined)).throws('Invalid Action (99)');
		});
	});

	describe('expression()', () => {
		it('sets expression for player character', () => {
			const expression = createExpression(Eye.Angry, Eye.Closed, Muzzle.Blep);

			serverActions.expression(encodeExpression(expression));

			expect(client.pony.options!.expr).equal(encodeExpression(expression));
			expect(client.pony.exprPermanent).eql(expression);
		});

		it('updates last action', () => {
			client.lastPacket = 0;

			serverActions.expression(0);

			expect(client.lastPacket).not.equal(0);
		});

		it('throws on not a number', () => {
			expect(() => serverActions.expression('foo' as any)).throw('Not a number (expression)');
		});
	});

	describe('playerAction()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => clock.restore());

		it('ignores player', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').withArgs(123).returns(target);

			serverActions.playerAction(123, PlayerAction.Ignore, undefined);

			assert.calledWith(ignorePlayer, client, target, true);
		});

		it('unignores player', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').withArgs(123).returns(target);

			serverActions.playerAction(123, PlayerAction.Unignore, undefined);

			assert.calledWith(ignorePlayer, client, target, false);
		});

		it('invites player to party', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').withArgs(123).returns(target);

			serverActions.playerAction(123, PlayerAction.InviteToParty, undefined);

			assert.calledWith(partyService.invite, client, target);
		});

		it('removes player from party', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').withArgs(123).returns(target);

			serverActions.playerAction(123, PlayerAction.RemoveFromParty, undefined);

			assert.calledWith(partyService.remove, client, target);
		});

		it('promotes player to party leader', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').withArgs(123).returns(target);

			serverActions.playerAction(123, PlayerAction.PromotePartyLeader, undefined);

			assert.calledWith(partyService.promoteLeader, client, target);
		});

		it('hides player', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').withArgs(123).returns(target);

			serverActions.playerAction(123, PlayerAction.HidePlayer, 12345678);

			assert.calledWith(hiding.requestHide, client, target, 12345678);
		});

		it('invites player to supporters', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').withArgs(123).returns(target);

			serverActions.playerAction(123, PlayerAction.InviteToSupporterServers, undefined);

			assert.calledWith(supporterInvites.requestInvite, client, target);
		});

		it('updates last action', () => {
			stub(world, 'getClientByEntityId').returns({} as any);
			client.lastPacket = 0;
			clock.setSystemTime(123);

			serverActions.playerAction(1, PlayerAction.InviteToParty, undefined);

			expect(client.lastPacket).equal(123);
		});

		it('logs warning if cannot find target player', () => {
			const warnLog = stub(client.reporter, 'warnLog');

			serverActions.playerAction(1, PlayerAction.Ignore, undefined);

			assert.calledOnce(warnLog);
		});

		it('AddFriend: calls friends.add()', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').returns(target);

			serverActions.playerAction(1, PlayerAction.AddFriend, undefined);

			assert.calledWith(friends.add, client, target);
		});

		it('RemoveFriend: calls friends.remove()', () => {
			const target = mockClient();
			stub(world, 'getClientByEntityId').returns(target);

			serverActions.playerAction(1, PlayerAction.RemoveFriend, undefined);

			assert.calledWith(friends.remove, client, target);
		});

		it('throws on entityId not a number', () => {
			expect(() => serverActions.playerAction('foo' as any, PlayerAction.Ignore, undefined))
				.throw('Not a number (entityId)');
		});

		it('throws on action not a number', () => {
			expect(() => serverActions.playerAction(1, 'foo' as any, undefined))
				.throw('Not a number (action)');
		});

		it('throws on invalid action', () => {
			stub(world, 'getClientByEntityId').returns({} as any);

			expect(() => serverActions.playerAction(1, 999, undefined))
				.throw('Invalid player action (undefined) [999]');
		});
	});

	describe('leaveParty()', () => {
		it('removes client from party', () => {
			const leader = {} as any;
			client.party = { id: '', clients: [leader, client], leader, pending: [] };

			serverActions.leaveParty();

			assert.calledWith(partyService.remove, leader, client);
		});

		it('does nothing if not in a party', () => {
			serverActions.leaveParty();

			assert.notCalled(partyService.remove);
		});

		it('updates last action', () => {
			client.lastPacket = 0;

			serverActions.leaveParty();

			expect(client.lastPacket).not.equal(0);
		});
	});

	describe('otherAction()', () => {
		let target: IClient;
		let clock: SinonFakeTimers;
		let getClientByEntityId: SinonStub<any>;

		beforeEach(() => {
			clock = useFakeTimers();
			clock.setSystemTime(123456);
			target = mockClient();
			getClientByEntityId = stub(world, 'getClientByEntityId').withArgs(222).returns(target);
			client.account.roles = ['admin'];
			client.account.name = 'Acc';
			client.character.name = 'Char';
			client.isMod = true;
		});

		afterEach(() => {
			clock.restore();
		});

		it('reports target client', async () => {
			const system = stub(target.reporter, 'system');

			await serverActions.otherAction(222, ModAction.Report, 0);

			assert.calledWith(system, 'Reported by Acc');
		});

		it('mutes target client', async () => {
			const system = stub(target.reporter, 'system');

			await serverActions.otherAction(222, ModAction.Mute, -1);

			assert.calledWith(system, 'Muted by Acc');
			assert.calledWith(accountService.update, target.accountId, { mute: -1 });
		});

		it('mutes target client for given amount of time', async () => {
			const system = stub(target.reporter, 'system');

			await serverActions.otherAction(222, ModAction.Mute, 123);

			assert.calledWith(system, 'Muted for (a few seconds) by Acc');
			assert.calledWith(accountService.update, target.accountId, { mute: Date.now() + 123 });
		});

		it('unmutes target client', async () => {
			const system = stub(target.reporter, 'system');

			await serverActions.otherAction(222, ModAction.Mute, 0);

			assert.calledWith(system, 'Unmuted by Acc');
			assert.calledWith(accountService.update, target.accountId, { mute: 0 });
		});

		it('shadows target client', async () => {
			const system = stub(target.reporter, 'system');

			await serverActions.otherAction(222, ModAction.Shadow, -1);

			assert.calledWith(system, 'Shadowed by Acc');
			assert.calledWith(accountService.update, target.accountId, { shadow: -1 });
		});

		it('shadows target client for given amount of time', async () => {
			const system = stub(target.reporter, 'system');

			await serverActions.otherAction(222, ModAction.Shadow, 123);

			assert.calledWith(system, 'Shadowed for (a few seconds) by Acc');
			assert.calledWith(accountService.update, target.accountId, { shadow: Date.now() + 123 });
		});

		it('unshadows target client', async () => {
			const system = stub(target.reporter, 'system');

			await serverActions.otherAction(222, ModAction.Shadow, 0);

			assert.calledWith(system, 'Unshadowed by Acc');
			assert.calledWith(accountService.update, target.accountId, { shadow: 0 });
		});

		it('updates last action', async () => {
			client.lastPacket = 0;
			clock.tick(1000);

			await serverActions.otherAction(222, 1, 1);

			expect(client.lastPacket).not.equal(0);
		});

		it('rejects on missing client', async () => {
			await expect(serverActions.otherAction(111, ModAction.Report, 0)).rejectedWith('Client does not exist (Report)');
		});

		it('rejects on non admin user', async () => {
			client.account.roles = [];
			client.isMod = false;

			await expect(serverActions.otherAction(111, ModAction.Report, 0)).rejectedWith('Action not allowed (Report)');
		});

		it('disconnectes on non admin user', async () => {
			client.account.roles = [];
			client.isMod = false;
			const disconnect = stub(client, 'disconnect');

			try {
				await serverActions.otherAction(111, ModAction.Report, 0);
			} catch  { }

			assert.calledWith(disconnect, true, true);
		});

		it('rejects on action on self', async () => {
			getClientByEntityId.withArgs(1).returns(client);

			await expect(serverActions.otherAction(1, ModAction.Report, 0)).rejectedWith('Cannot perform action on self (Report)');
		});

		it('rejects on invalid action', async () => {
			await expect(serverActions.otherAction(222, 123, 0)).rejectedWith('Invalid mod action (123)');
		});

		it('rejects on entityId not a number', async () => {
			await expect(serverActions.otherAction('foo' as any, 1, 1)).rejectedWith('Not a number (entityId)');
		});

		it('rejects on action not a number', async () => {
			await expect(serverActions.otherAction(1, 'foo' as any, 1)).rejectedWith('Not a number (action)');
		});

		it('rejects on param not a number', async () => {
			await expect(serverActions.otherAction(1, 1, 'foo' as any)).rejectedWith('Not a number (param)');
		});
	});

	describe('setNote()', () => {
		it('updates last action', async () => {
			const other = mockClient();
			other.accountId = 'dlfhigdh';
			client.lastPacket = 0;
			client.account.roles = ['mod'];
			client.isMod = true;
			stub(world, 'getClientByEntityId').withArgs(1).returns(other);

			await serverActions.setNote(1, 'foo');

			expect(client.lastPacket).not.equal(0);
		});

		it('updates account note', async () => {
			const other = mockClient();
			other.accountId = 'gooboo';
			client.account.roles = ['mod'];
			client.isMod = true;
			stub(world, 'getClientByEntityId').withArgs(1).returns(other);

			await serverActions.setNote(1, 'foo');

			assert.calledWithMatch(accountService.update, 'gooboo', { note: 'foo' });
		});

		it('throws if user is not a mod', async () => {
			const other = mockClient();
			other.accountId = 'gooboo';
			stub(world, 'getClientByEntityId').withArgs(1).returns(other);

			await expect(serverActions.setNote(1, 'foo')).rejectedWith('Action not allowed (setNote)');
		});

		it('throws on not a number', async () => {
			await expect(serverActions.setNote('foo' as any, 'foo')).rejectedWith('Not a number (entityId)');
		});

		it('throws on not a string', async () => {
			await expect(serverActions.setNote(1, 5 as any)).rejectedWith('Not a string (text)');
		});
	});

	describe('saveSettings()', () => {
		it('updates last action', () => {
			accountService.updateSettings.resolves();
			client.lastPacket = 0;

			serverActions.saveSettings({});

			expect(client.lastPacket).not.equal(0);
		});

		it('updates account settings', () => {
			accountService.updateSettings.resolves();
			const settings = {};

			serverActions.saveSettings(settings);

			assert.calledWith(accountService.updateSettings, client.account, settings);
		});
	});

	describe('acceptNotification()', () => {
		it('accepts notification', () => {
			serverActions.acceptNotification(123);

			assert.calledWith(notifications.acceptNotification, client, 123);
		});

		it('updates last action', () => {
			client.lastPacket = 0;

			serverActions.acceptNotification(123);

			expect(client.lastPacket).not.equal(0);
		});

		it('throws on not a number', () => {
			expect(() => serverActions.acceptNotification('foo' as any)).throw('Not a number (id)');
		});
	});

	describe('rejectNotification()', () => {
		it('rejects notification', () => {
			serverActions.rejectNotification(123);

			assert.calledWith(notifications.rejectNotification, client, 123);
		});

		it('updates last action', () => {
			client.lastPacket = 0;

			serverActions.rejectNotification(123);

			expect(client.lastPacket).not.equal(0);
		});

		it('throws on not a number', () => {
			expect(() => serverActions.rejectNotification('foo' as any)).throw('Not a number (id)');
		});
	});

	describe('getPonies()', () => {
		it('sends ponies to client', () => {
			const updatePonies = stub(client, 'updatePonies');
			const name1 = encodeString('foo')!;
			const name2 = encodeString('bar')!;
			const name3 = encodeString('xxx')!;
			const info1 = new Uint8Array([1, 2, 3]);
			const info2 = new Uint8Array([4, 5, 6]);
			const info3 = new Uint8Array([7, 8, 9]);
			client.party = {
				clients: [
					{ pony: { id: 1, options: {}, encodedName: name1, encryptedInfoSafe: info1 } },
					{ pony: { id: 2, options: {}, encodedName: name2, encryptedInfoSafe: info2 } },
					{ pony: { id: 3, options: {}, encodedName: name3, encryptedInfoSafe: info3 } },
				],
			} as any;

			serverActions.getPonies([1, 2]);

			assert.calledWithMatch(updatePonies, [
				[1, {}, name1, info1, 0, false],
				[2, {}, name2, info2, 0, false],
			]);
		});

		it('does nothing if not in party', () => {
			const updatePonies = stub(client, 'updatePonies');

			serverActions.getPonies([1, 2]);

			assert.notCalled(updatePonies);
		});

		it('does nothing if ids is null or empty', () => {
			const updatePonies = stub(client, 'updatePonies');

			serverActions.getPonies(null as any);
			serverActions.getPonies([]);

			assert.notCalled(updatePonies);
		});

		it('does nothing if requesting too many ponies', () => {
			const updatePonies = stub(client, 'updatePonies');

			serverActions.getPonies(range(20));

			assert.notCalled(updatePonies);
		});
	});

	describe('loaded()', () => {
		it('sets ignoreUpdates flag to false', () => {
			client.loading = true;

			serverActions.loaded();

			expect(client.loading).false;
		});
	});

	describe('fixedPosition()', () => {
		it('sets fixing position flag to false', () => {
			client.fixingPosition = true;

			serverActions.fixedPosition();

			expect(client.fixingPosition).false;
		});
	});

	describe('updateCamera()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('sets up camera', () => {
			serverActions.updateCamera(1, 2, 3, 4);

			expect(client.camera).eql({ ...createCamera(), x: 1, y: 2, w: 64, h: 64 });
		});

		it('updates last action', () => {
			client.lastPacket = 0;
			clock.setSystemTime(123);

			serverActions.updateCamera(0, 0, 0, 0);

			expect(client.lastPacket).equal(123);
		});

		it('throws on "a" not a number', () => {
			expect(() => serverActions.updateCamera('foo' as any, 0, 0, 0)).throw('Not a number (x)');
		});

		it('throws on "b" not a number', () => {
			expect(() => serverActions.updateCamera(0, 'foo' as any, 0, 0)).throw('Not a number (y)');
		});

		it('throws on "c" not a number', () => {
			expect(() => serverActions.updateCamera(0, 0, 'foo' as any, 0)).throw('Not a number (width)');
		});

		it('throws on "d" not a number', () => {
			expect(() => serverActions.updateCamera(0, 0, 0, 'foo' as any)).throw('Not a number (height)');
		});
	});

	describe('update()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('calls move', () => {
			serverActions.move(1, 2, 3, 4, 5);

			assert.calledWith(move, client, 0, 1, 2, 3, 4, 5);
		});

		it('updates last action', () => {
			client.lastPacket = 0;
			clock.setSystemTime(123);

			serverActions.move(0, 0, 0, 0, 0);

			expect(client.lastPacket).equal(123);
		});

		it('throws on "a" not a number', () => {
			expect(() => serverActions.move('foo' as any, 0, 0, 0, 0)).throw('Not a number (a)');
		});

		it('throws on "b" not a number', () => {
			expect(() => serverActions.move(0, 'foo' as any, 0, 0, 0)).throw('Not a number (b)');
		});

		it('throws on "c" not a number', () => {
			expect(() => serverActions.move(0, 0, 'foo' as any, 0, 0)).throw('Not a number (c)');
		});

		it('throws on "d" not a number', () => {
			expect(() => serverActions.move(0, 0, 0, 'foo' as any, 0)).throw('Not a number (d)');
		});

		it('throws on "e" not a number', () => {
			expect(() => serverActions.move(0, 0, 0, 0, 'foo' as any)).throw('Not a number (e)');
		});
	});

	describe('changeTile()', () => {
		it('sets tile', () => {
			setTile(client.map, 1, 2, TileType.Dirt);
			const setTileStub = stub(world, 'setTile');

			serverActions.changeTile(1, 2, TileType.Dirt);

			assert.calledWith(setTileStub, client.map, 1, 2, TileType.Dirt);
		});

		it.skip('sets tile for mod', () => {
			const setTile = stub(world, 'setTile');
			client.isMod = true;

			serverActions.changeTile(1, 2, TileType.Wood);

			assert.calledWith(setTile, client.map, 1, 2, TileType.Wood);
		});

		it('does not set tile if shadowed', () => {
			setTile(client.map, 1, 2, TileType.Dirt);
			const setTileStub = stub(world, 'setTile');
			client.shadowed = true;

			serverActions.changeTile(1, 2, TileType.Dirt);

			assert.notCalled(setTileStub);
		});

		it('sends update to client if shadowed', () => {
			setTile(client.map, 1, 2, TileType.Dirt);
			client.shadowed = true;

			serverActions.changeTile(1, 2, TileType.Dirt);

			expect(getWriterBuffer(client.updateQueue)).eql(new Uint8Array([4, 0, 1, 0, 2, 1]));
		});

		it('does nothing if invalid tile type', () => {
			setTile(client.map, 1, 2, TileType.Dirt);
			const setTileStub = stub(world, 'setTile');

			serverActions.changeTile(1, 2, 999);

			assert.notCalled(setTileStub);
			expect(getWriterBuffer(client.updateQueue)).eql(new Uint8Array([]));
		});

		it.skip('toggles wall', () => {
			setTile(client.map, 1, 2, TileType.Dirt);
			client.account.roles = ['mod'];
			client.isMod = true;
			const toggleWall = stub(world, 'toggleWall');

			serverActions.changeTile(1, 2, TileType.WallH);
			serverActions.changeTile(3, 4, TileType.WallV);

			assert.calledWith(toggleWall, client.map, 1, 2, TileType.WallH);
			assert.calledWith(toggleWall, client.map, 3, 4, TileType.WallV);
		});

		it('does not toggle wall for non moderators', () => {
			setTile(client.map, 1, 2, TileType.Dirt);
			const toggleWall = stub(world, 'toggleWall');

			serverActions.changeTile(1, 2, TileType.WallH);

			assert.notCalled(toggleWall);
		});

		it('updates last action', () => {
			client.lastPacket = 0;

			serverActions.changeTile(0, 0, TileType.Dirt);

			expect(client.lastPacket).not.equal(0);
		});

		it('throws on "x" not a number', () => {
			expect(() => serverActions.changeTile('foo' as any, 0, TileType.Dirt)).throw('Not a number (x)');
		});

		it('throws on "y" not a number', () => {
			expect(() => serverActions.changeTile(0, 'foo' as any, TileType.Dirt)).throw('Not a number (y)');
		});

		it('throws on "type" not a number', () => {
			expect(() => serverActions.changeTile(0, 0, 'foo' as any)).throw('Not a number (type)');
		});
	});

	describe('leave()', () => {
		it('notifies client', () => {
			const left = stub(client, 'left');

			serverActions.leave();

			assert.calledOnce(left);
		});
	});

	describe('editorAction()', () => {
		it('places', () => {
			client.isMod = true;
			server.flags.editor = true;

			serverActions.editorAction({ type: 'place', x: 0, y: 0, entity: 'foo' });
		});

		it('undos', () => {
			client.isMod = true;
			server.flags.editor = true;

			serverActions.editorAction({ type: 'undo' });
		});

		it('clears', () => {
			client.isMod = true;
			server.flags.editor = true;

			serverActions.editorAction({ type: 'clear' });
		});

		it('does nothing for non-mod client', () => {
			client.isMod = false;
			server.flags.editor = true;

			serverActions.editorAction({ type: 'undo' });
		});
	});
});
