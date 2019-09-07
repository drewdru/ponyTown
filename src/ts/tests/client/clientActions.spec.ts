import { stubClass, resetStubMethods } from '../lib';
import { NgZone } from '@angular/core';
import { encodeString } from 'ag-sockets/dist/utf8';
import { Subject } from 'rxjs';
import { expect } from 'chai';
import { stub, assert, SinonStub } from 'sinon';
import {
	MessageType, Action, PartyFlags, NotificationFlags, LeaveReason, TileType, Weather, InfoFlags, Pony
} from '../../common/interfaces';
import * as handlers from '../../client/handlers';
import { pony } from '../../common/entities';
import { ClientActions } from '../../client/clientActions';
import { GameService } from '../../components/services/gameService';
import { PonyTownGame } from '../../client/game';
import { mock, entity, mockSubject, MockSubject } from '../mocks';
import { encodeUpdateSimple } from '../../common/encoders/updateEncoder';
import { ServerActions } from '../../server/serverActions';
import { PaletteManager } from '../../graphics/paletteManager';
import { createCamera } from '../../common/camera';
import { commonPalettes } from '../../graphics/graphicsUtils';
import { Model } from '../../components/services/model';
import { createRegion } from '../../common/region';
import { getTile, addEntity, setRegion, createWorldMap } from '../../common/worldMap';
import { createServerRegion } from '../../server/serverRegion';
import { ServerRegion } from '../../server/serverInterfaces';

describe('ClientActions', () => {
	let zone: NgZone;
	let model = stubClass(Model);
	let gameService = stubClass(GameService);
	let server = stubClass(ServerActions);
	let game: PonyTownGame;
	let clientActions: ClientActions;
	let onMessage: MockSubject;
	let onPonyAddOrUpdate: MockSubject;

	beforeEach(() => {
		zone = { run: (f: any) => f() } as any;
		resetStubMethods(gameService, 'left', 'joined', 'disconnected');
		resetStubMethods(server, 'action', 'getPonies', 'fixedPosition');
		resetStubMethods(model);
		onMessage = mockSubject();
		onPonyAddOrUpdate = mockSubject();
		game = mock(PonyTownGame);
		game.fallbackPonies = new Map();
		game.map = createWorldMap({ type: 0, flags: 0, regionsX: 2, regionsY: 2, defaultTile: TileType.None });
		setRegion(game.map, 0, 0, createRegion(0, 0));
		game.camera = createCamera();
		game.notifications = [];
		game.send = f => f(server);
		game.apply = f => f();
		game.onMessage = onMessage as any;
		game.onPonyAddOrUpdate = onPonyAddOrUpdate as any;
		game.onPartyUpdate = new Subject();
		game.paletteManager = new PaletteManager();
		game.onActionsUpdate = new Subject();
		game.webgl = { palettes: commonPalettes } as any;
		game.settings = {
			account: {},
		} as any;
		model.ponies = [];
		clientActions = new ClientActions(gameService as any, game, model as any, zone as any);
	});

	it('can be created with defaults', () => {
		clientActions = new ClientActions(gameService as any, game, model as any, zone as any);
	});

	describe('connected()', () => {
		it('resets game player', () => {
			game.player = {} as any;

			clientActions.connected();

			expect(game.player).undefined;
		});

		it('resets game map', () => {
			game.map = {} as any;

			clientActions.connected();

			expect(game.map).not.undefined;
		});

		it('notifies game service', () => {
			clientActions.connected();

			assert.calledOnce(gameService.joined);
		});

		it('notifies game', () => {
			const joined = stub(game, 'joined');

			clientActions.connected();

			assert.calledOnce(joined);
		});

		it('sends info', () => {
			clientActions.connected();

			assert.calledWith(
				server.actionParam2, Action.Info, InfoFlags.SupportsWASM | InfoFlags.SupportsLetAndConst);
		});
	});

	describe('disconnected()', () => {
		it('notifies game service', () => {
			clientActions.disconnected();

			assert.calledOnce(gameService.disconnected);
		});
	});

	describe('worldState()', () => {
		it('sets game state', () => {
			const state = {} as any;
			const setWorldState = stub(game, 'setWorldState');

			clientActions.worldState(state, true);

			assert.calledWith(setWorldState, state, true);
		});
	});

	describe('mapState()', () => {
		it('initializes game map', () => {
			game.map = undefined as any;

			clientActions.mapState(
				{ type: 0, flags: 0, regionsX: 1, regionsY: 2, defaultTile: TileType.Water },
				{ weather: Weather.None });

			expect(game.map).not.undefined;
			expect(game.map.regionsX).equal(1);
			expect(game.map.regionsY).equal(2);
			expect(game.map.defaultTile).equal(TileType.Water);
		});
	});

	describe('myEntity()', () => {
		it('sets player fields', () => {
			clientActions.myEntity(123, 'name', 'info', 'charid', 456);

			expect(game.playerId).equal(123);
			expect(game.playerName).equal('name');
			expect(game.playerInfo).equal('info');
			expect(game.playerCRC).equal(456);
		});

		it('updates self flag for party members', () => {
			game.party = {
				leaderId: 0,
				members: [
					{ id: 321, leader: false, offline: false, pending: false, pony: {} as any, self: true },
					{ id: 123, leader: false, offline: false, pending: false, pony: {} as any, self: false },
				],
			};

			clientActions.myEntity(123, '', '', '', 0);

			expect(game.party.members[0].self).false;
			expect(game.party.members[1].self).true;
		});
	});

	describe('updateRegions()', () => {
		let handleUpdateEntity: SinonStub<any>;
		let handleSays: SinonStub<any>;
		let region: ServerRegion;

		beforeEach(() => {
			region = createServerRegion(1, 2);
			handleSays = stub(handlers, 'handleSays');
			handleUpdateEntity = stub(handlers, 'handleUpdateEntity');
		});

		afterEach(() => {
			handleSays.restore();
			handleUpdateEntity.restore();
		});

		it('does nothing for empty update list', () => {
			const emptyUpdate = encodeUpdateSimple(region);

			clientActions.update([], [], null, [emptyUpdate], []);
		});

		it('updates map tiles', () => {
			region.x = region.y = 0;
			region.tileUpdates.push({ x: 1, y: 2, type: 3 }, { x: 3, y: 2, type: 1 });
			const data = encodeUpdateSimple(region);

			clientActions.update([], [], null, [data], []);

			expect(getTile(game.map, 1, 2)).equal(3);
			expect(getTile(game.map, 3, 2)).equal(1);
		});

		it('calls handleSays for each entry', () => {
			clientActions.update([], [], null, [], [[1, 'foo', MessageType.Chat], [2, 'var', MessageType.Party]]);

			assert.calledTwice(handleSays);
			assert.calledWith(handleSays, game, 1, 'foo', MessageType.Chat);
			assert.calledWith(handleSays, game, 2, 'var', MessageType.Party);
		});
	});

	describe('fixPosition()', () => {
		it('updates player position', () => {
			game.player = {} as any;

			clientActions.fixPosition(123, 456, true);

			expect(game.player!.x).equal(123);
			expect(game.player!.y).equal(456);
		});

		it('sends fixed position message back to server', () => {
			clientActions.fixPosition(123, 456, true);

			assert.calledOnce(server.fixedPosition);
		});

		it('does nothing if no player', () => {
			game.player = undefined;

			clientActions.fixPosition(123, 456, true);
		});
	});

	describe('left()', () => {
		it('resets game player', () => {
			game.player = {} as any;

			clientActions.left(LeaveReason.None);

			expect(game.player).undefined;
		});

		it('resets game map', () => {
			game.map = {} as any;

			clientActions.left(LeaveReason.None);

			expect(game.map).not.undefined;
		});

		it('notifies game service', () => {
			clientActions.left(LeaveReason.Swearing);

			assert.calledWith(gameService.left, 'clientActions.left', LeaveReason.Swearing);
		});
	});

	describe('addNotification()', () => {
		it('adds notification to game', () => {
			const e = entity(456, 0, 0, pony.type, { ponyState: {} } as any);
			addEntity(game.map, e);

			clientActions.addNotification(123, 456, 'name', 'test', 'note', NotificationFlags.Ok);

			expect(game.notifications).eql([
				{ id: 123, message: 'test', note: 'note', flags: NotificationFlags.Ok, open: false, fresh: true, pony: e }
			]);
		});

		it('sets pony to offline pony if no pony is provided', () => {
			const pony = game.offlinePony = { offlinePony: true } as any;

			clientActions.addNotification(123, 0, 'name', 'test', 'note', NotificationFlags.Ok);

			expect(game.notifications).eql([
				{ id: 123, message: 'test', note: 'note', flags: NotificationFlags.Ok, open: false, fresh: true, pony }
			]);
		});

		it('sets pony to supporter pony if supporter pony flag is set', () => {
			const pony = game.supporterPony = { supporterPony: true } as any;

			clientActions.addNotification(123, 0, 'name', 'test', 'note', NotificationFlags.Supporter);

			expect(game.notifications).eql([
				{ id: 123, message: 'test', note: 'note', flags: NotificationFlags.Supporter, open: false, fresh: true, pony }
			]);
		});
	});

	describe('removeNotification()', () => {
		it('removes notification with given id', () => {
			game.notifications.push({ id: 123 } as any);

			clientActions.removeNotification(123);

			expect(game.notifications).eql([]);
		});

		it('removes notification in digest cycle', () => {
			const run = stub(zone, 'run');

			clientActions.removeNotification(123);

			assert.calledOnce(run);
		});
	});

	describe('updateSelection()', () => {
		it('selects new entity', () => {
			const newPony = entity(456, 0, 0, pony.type, { ponyState: {} } as any);
			game.selected = entity(123) as Pony;
			addEntity(game.map, newPony);
			const select = stub(game, 'select');

			clientActions.updateSelection(123, 456);

			assert.calledWith(select, newPony as any);
		});

		it('does nothing if selected ID is not current ID', () => {
			const select = stub(game, 'select');

			clientActions.updateSelection(123, 456);

			assert.notCalled(select);
		});
	});

	describe('updateParty()', () => {
		it('clears party if passed undefined', () => {
			game.party = {} as any;

			clientActions.updateParty(undefined);

			expect(game.party).undefined;
		});

		it('clears party if passed empty list', () => {
			game.party = {} as any;

			clientActions.updateParty([]);

			expect(game.party).undefined;
		});

		it('updates party', () => {
			clientActions.updateParty([
				[123, PartyFlags.Leader],
			]);

			expect(game.party).eql({
				leaderId: 123,
				members: [
					{ id: 123, leader: true, offline: false, pending: false, pony: undefined, self: false },
				],
			});
		});

		it('gets missing pony info from server', () => {
			clientActions.updateParty([
				[123, PartyFlags.Leader],
			]);

			assert.calledWithMatch(server.getPonies, [123]);
		});
	});

	describe('ponies()', () => {
		it('does nothing for empty list', () => {
			clientActions.updatePonies([]);
		});

		it('updates party pony', () => {
			game.party = {
				leaderId: 0,
				members: [
					{ id: 123, pony: undefined, leader: true, pending: false, offline: false, self: false },
				],
			};

			clientActions.updatePonies([
				[123, {}, encodeString('foo')!, new Uint8Array([1, 2, 3]), 0, false],
			]);

			expect(game.party.members[0].pony).not.undefined;
		});
	});
});
