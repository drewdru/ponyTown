import { stubClass, resetStubMethods } from '../lib';
import { Subject } from 'rxjs';
import { expect } from 'chai';
import { stub, assert, SinonFakeTimers, useFakeTimers, SinonStub } from 'sinon';
import { World } from '../../server/world';
import { mockClient, serverEntity } from '../mocks';
import { PartyService } from '../../server/services/party';
import { NotificationService } from '../../server/services/notification';
import { IClient, ServerMap } from '../../server/serverInterfaces';
import { NotificationFlags, WorldState, MapState, EntityFlags, UpdateFlags } from '../../common/interfaces';
import { addEntityToRegion, createServerRegion, pushUpdateEntityToRegion } from '../../server/serverRegion';
import { ServerLiveSettings } from '../../common/adminInterfaces';
import { createServerMap } from '../../server/serverMap';
import { FriendsService } from '../../server/services/friends';
import { HidingService } from '../../server/services/hiding';

describe('World', () => {
	const partyService = stubClass(PartyService);
	const friendsService = stubClass(FriendsService);
	const hidingService = stubClass(HidingService);
	partyService.partyChanged = new Subject();
	const notifications = stubClass(NotificationService);
	let liveSettings: ServerLiveSettings;
	let getSettings: SinonStub;
	let world: World;
	let map: ServerMap;
	let client: IClient;

	beforeEach(() => {
		resetStubMethods(partyService, 'leave');
		resetStubMethods(notifications, 'rejectAll');
		liveSettings = {} as any;
		getSettings = stub().returns({});
		client = mockClient();
		world = new World(
			{ flags: {} } as any, partyService as any, friendsService as any, hidingService as any,
			notifications, getSettings, liveSettings, { stats() { return {}; } } as any);
		world.maps.push(map = createServerMap('', 0, 1, 1));
		client.map = world.getMainMap();
	});

	describe('joinClientToWorld()', () => {
		let client: IClient;

		beforeEach(() => {
			client = mockClient();
			client.accountId = 'foobar';
			client.map = world.getMainMap();
			client.characterState = {} as any;
		});

		it('sends world state', () => {
			const worldState = stub(client, 'worldState');
			const state: WorldState = {} as any;
			stub(world, 'getState').returns(state);

			world.joinClientToWorld(client);

			assert.calledWith(worldState, state, true);
		});

		it('sends map info', () => {
			const mapState = stub(client, 'mapState');
			const state: MapState = {} as any;
			map.state = state;

			world.joinClientToWorld(client);

			assert.calledWith(mapState, { type: 0, editableArea: undefined, flags: 0, defaultTile: 0, regionsX: 1, regionsY: 1 }, state);
		});

		it('adds client to clients list', () => {
			world.joinClientToWorld(client);

			expect(world.clients).contain(client);
		});

		it('initializes client pony ID', () => {
			stub(world, 'getNewEntityId').returns(1234);

			world.joinClientToWorld(client);

			expect(client.pony.id).equal(1234);
		});

		it('sends client pony ID', () => {
			stub(world, 'getNewEntityId').returns(1234);
			const myEntity = stub(client, 'myEntity');
			client.characterName = 'charname';
			client.character.info = client.pony.info = 'INFO';
			client.pony.crc = 456;

			world.joinClientToWorld(client);

			assert.calledWith(myEntity, 1234, 'charname', 'INFO', client.characterId, 456);
		});

		it('adds client pony to the world', () => {
			const addEntity = stub(world, 'addEntity');

			world.joinClientToWorld(client);

			assert.calledWith(addEntity, client.pony, client.map);
		});

		it('updates selection for other clients', () => {
			const otherClient = mockClient();
			otherClient.selected = { id: 123, client: { accountId: 'foobar' } } as any;
			const otherClient2 = mockClient();
			const updateSelection = stub(otherClient, 'updateSelection');
			const updateSelection2 = stub(otherClient2, 'updateSelection');
			stub(world, 'getNewEntityId').returns(321);
			world.clients.push(otherClient);
			world.clients.push(otherClient2);

			world.joinClientToWorld(client);

			assert.calledWith(updateSelection, 123, 321);
			assert.notCalled(updateSelection2);
		});

		it('adds update notification to client if updating', () => {
			liveSettings.updating = true;

			world.joinClientToWorld(client);

			assert.calledWith(notifications.addNotification, client, {
				id: 0, name: '', message: 'Server will restart shortly for updates and maintenance', flags: NotificationFlags.Ok
			});
		});
	});

	describe('initialize()', () => {
		it('initializes all controllers', () => {
			const initialize = stub();
			world.controllers.push({ initialize, update() { } });

			world.initialize(123);

			assert.calledWith(initialize, 0.123);
		});
	});

	describe('update()', () => {
		it('updates entities positions', () => {
			const e = serverEntity(1, 1, 1, 0);
			e.flags |= EntityFlags.Movable;
			e.vx = 1;
			e.vy = 1;
			e.timestamp = 1;
			addEntityToRegion(map.regions[0], e, map);

			world.update(1000, 2000);

			expect(e.x).equal(2);
			expect(e.y).equal(2);
		});

		it('does not update entity position if timestamp is in the future', () => {
			const e = serverEntity(1, 1, 1, 0);
			e.vx = 1;
			e.vy = 1;
			addEntityToRegion(map.regions[0], e, map);

			world.update(1000, 2000);

			expect(e.x).equal(1);
			expect(e.y).equal(1);
		});

		// it('updates regions', () => {
		// 	world.update(123, 123);

		// 	...
		// });

		it('updates all controllers', () => {
			const update = stub();
			world.controllers.push({ update, initialize() { } });

			world.update(123, 123000);

			assert.calledWith(update, 0.123);
		});

		// timeouts expressions

		it('commits region updates', () => {
			const region = createServerRegion(0, 0);
			const entity = serverEntity(1);
			const client = mockClient();
			pushUpdateEntityToRegion(region, { entity, flags: UpdateFlags.Position });
			region.clients.push(client);
			client.regions.push(region);
			map.regions = [region];
			const update = stub(client, 'update');

			world.update(123, 123000);

			expect(update);
		});

		it('joins queued clients', () => {
			const client = mockClient();
			world.joinClientToQueue(client);
			const joinClientToWorld = stub(world, 'joinClientToWorld');

			world.update(123, 123000);

			assert.calledWith(joinClientToWorld, client);
		});
	});

	describe('kick()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.tick(99999);
			clock.restore();
		});

		it('does nothing for undefined', () => {
			expect(world.kick(undefined)).false;
		});

		it('returns true if kicked', () => {
			const client = mockClient();

			expect(world.kick(client)).true;
		});

		it('rejects all notifications', () => {
			const client = mockClient();

			world.kick(client);

			assert.calledWith(notifications.rejectAll, client);
		});

		it('notifies client of leaving', () => {
			const client = mockClient();
			const left = stub(client, 'left');

			world.kick(client);

			assert.calledOnce(left);
		});

		it('sets client leave reason', () => {
			const client = mockClient();

			world.kick(client);

			expect(client.leaveReason).equal('kicked');
		});

		it('disconnects client after timeout', () => {
			const client = mockClient({ isConnected: true });
			const disconnect = stub(client, 'disconnect');

			world.kick(client);

			clock.tick(201);
			assert.calledOnce(disconnect);
		});

		it('skips disconnecting if client already disconnected', () => {
			const client = mockClient({ isConnected: false });
			const disconnect = stub(client, 'disconnect');

			world.kick(client);

			clock.tick(201);
			assert.notCalled(disconnect);
		});
	});

	describe('kickAll()', () => {
		it('does nothing for no clients', () => {
			world.kickAll();
		});

		it('kicks all clients', () => {
			const a = mockClient();
			const b = mockClient();
			world.clients.push(a);
			world.clients.push(b);
			const kick = stub(world, 'kick');

			world.kickAll();

			assert.calledWith(kick, a);
			assert.calledWith(kick, b);
		});

		it('works while removing clients', () => {
			const a = mockClient();
			const b = mockClient();
			world.clients.push(a);
			world.clients.push(b);
			const aLeft = stub(a, 'left');
			const bLeft = stub(b, 'left');

			world.kickAll();

			assert.calledOnce(aLeft);
			assert.calledOnce(bLeft);
		});
	});

	describe('kickByAccount()', () => {
		it('does nothing if not found', () => {
			world.kickByAccount('foo');
		});

		it('kick client by account', () => {
			const client = mockClient();
			world.clients.push(client);
			world.clientsByAccount.set(client.accountId, client);
			const kick = stub(world, 'kick');

			world.kickByAccount(client.accountId);

			assert.calledWith(kick, client);
		});
	});

	describe('kickByCharacter()', () => {
		it('does nothing if not found', () => {
			world.kickByCharacter('foo');
		});

		it('kick client by account', () => {
			const client = mockClient();
			world.clients.push(client);
			const kick = stub(world, 'kick');

			world.kickByCharacter(client.characterId);

			assert.calledWith(kick, client);
		});
	});
});
