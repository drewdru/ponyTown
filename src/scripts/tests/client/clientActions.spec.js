"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const utf8_1 = require("ag-sockets/dist/utf8");
const rxjs_1 = require("rxjs");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const handlers = require("../../client/handlers");
const entities_1 = require("../../common/entities");
const clientActions_1 = require("../../client/clientActions");
const gameService_1 = require("../../components/services/gameService");
const game_1 = require("../../client/game");
const mocks_1 = require("../mocks");
const updateEncoder_1 = require("../../common/encoders/updateEncoder");
const serverActions_1 = require("../../server/serverActions");
const paletteManager_1 = require("../../graphics/paletteManager");
const camera_1 = require("../../common/camera");
const graphicsUtils_1 = require("../../graphics/graphicsUtils");
const model_1 = require("../../components/services/model");
const region_1 = require("../../common/region");
const worldMap_1 = require("../../common/worldMap");
const serverRegion_1 = require("../../server/serverRegion");
describe('ClientActions', () => {
    let zone;
    let model = lib_1.stubClass(model_1.Model);
    let gameService = lib_1.stubClass(gameService_1.GameService);
    let server = lib_1.stubClass(serverActions_1.ServerActions);
    let game;
    let clientActions;
    let onMessage;
    let onPonyAddOrUpdate;
    beforeEach(() => {
        zone = { run: (f) => f() };
        lib_1.resetStubMethods(gameService, 'left', 'joined', 'disconnected');
        lib_1.resetStubMethods(server, 'action', 'getPonies', 'fixedPosition');
        lib_1.resetStubMethods(model);
        onMessage = mocks_1.mockSubject();
        onPonyAddOrUpdate = mocks_1.mockSubject();
        game = mocks_1.mock(game_1.PonyTownGame);
        game.fallbackPonies = new Map();
        game.map = worldMap_1.createWorldMap({ type: 0, flags: 0, regionsX: 2, regionsY: 2, defaultTile: 0 /* None */ });
        worldMap_1.setRegion(game.map, 0, 0, region_1.createRegion(0, 0));
        game.camera = camera_1.createCamera();
        game.notifications = [];
        game.send = f => f(server);
        game.apply = f => f();
        game.onMessage = onMessage;
        game.onPonyAddOrUpdate = onPonyAddOrUpdate;
        game.onPartyUpdate = new rxjs_1.Subject();
        game.paletteManager = new paletteManager_1.PaletteManager();
        game.onActionsUpdate = new rxjs_1.Subject();
        game.webgl = { palettes: graphicsUtils_1.commonPalettes };
        game.settings = {
            account: {},
        };
        model.ponies = [];
        clientActions = new clientActions_1.ClientActions(gameService, game, model, zone);
    });
    it('can be created with defaults', () => {
        clientActions = new clientActions_1.ClientActions(gameService, game, model, zone);
    });
    describe('connected()', () => {
        it('resets game player', () => {
            game.player = {};
            clientActions.connected();
            chai_1.expect(game.player).undefined;
        });
        it('resets game map', () => {
            game.map = {};
            clientActions.connected();
            chai_1.expect(game.map).not.undefined;
        });
        it('notifies game service', () => {
            clientActions.connected();
            sinon_1.assert.calledOnce(gameService.joined);
        });
        it('notifies game', () => {
            const joined = sinon_1.stub(game, 'joined');
            clientActions.connected();
            sinon_1.assert.calledOnce(joined);
        });
        it('sends info', () => {
            clientActions.connected();
            sinon_1.assert.calledWith(server.actionParam2, 20 /* Info */, 2 /* SupportsWASM */ | 4 /* SupportsLetAndConst */);
        });
    });
    describe('disconnected()', () => {
        it('notifies game service', () => {
            clientActions.disconnected();
            sinon_1.assert.calledOnce(gameService.disconnected);
        });
    });
    describe('worldState()', () => {
        it('sets game state', () => {
            const state = {};
            const setWorldState = sinon_1.stub(game, 'setWorldState');
            clientActions.worldState(state, true);
            sinon_1.assert.calledWith(setWorldState, state, true);
        });
    });
    describe('mapState()', () => {
        it('initializes game map', () => {
            game.map = undefined;
            clientActions.mapState({ type: 0, flags: 0, regionsX: 1, regionsY: 2, defaultTile: 3 /* Water */ }, { weather: 0 /* None */ });
            chai_1.expect(game.map).not.undefined;
            chai_1.expect(game.map.regionsX).equal(1);
            chai_1.expect(game.map.regionsY).equal(2);
            chai_1.expect(game.map.defaultTile).equal(3 /* Water */);
        });
    });
    describe('myEntity()', () => {
        it('sets player fields', () => {
            clientActions.myEntity(123, 'name', 'info', 'charid', 456);
            chai_1.expect(game.playerId).equal(123);
            chai_1.expect(game.playerName).equal('name');
            chai_1.expect(game.playerInfo).equal('info');
            chai_1.expect(game.playerCRC).equal(456);
        });
        it('updates self flag for party members', () => {
            game.party = {
                leaderId: 0,
                members: [
                    { id: 321, leader: false, offline: false, pending: false, pony: {}, self: true },
                    { id: 123, leader: false, offline: false, pending: false, pony: {}, self: false },
                ],
            };
            clientActions.myEntity(123, '', '', '', 0);
            chai_1.expect(game.party.members[0].self).false;
            chai_1.expect(game.party.members[1].self).true;
        });
    });
    describe('updateRegions()', () => {
        let handleUpdateEntity;
        let handleSays;
        let region;
        beforeEach(() => {
            region = serverRegion_1.createServerRegion(1, 2);
            handleSays = sinon_1.stub(handlers, 'handleSays');
            handleUpdateEntity = sinon_1.stub(handlers, 'handleUpdateEntity');
        });
        afterEach(() => {
            handleSays.restore();
            handleUpdateEntity.restore();
        });
        it('does nothing for empty update list', () => {
            const emptyUpdate = updateEncoder_1.encodeUpdateSimple(region);
            clientActions.update([], [], null, [emptyUpdate], []);
        });
        it('updates map tiles', () => {
            region.x = region.y = 0;
            region.tileUpdates.push({ x: 1, y: 2, type: 3 }, { x: 3, y: 2, type: 1 });
            const data = updateEncoder_1.encodeUpdateSimple(region);
            clientActions.update([], [], null, [data], []);
            chai_1.expect(worldMap_1.getTile(game.map, 1, 2)).equal(3);
            chai_1.expect(worldMap_1.getTile(game.map, 3, 2)).equal(1);
        });
        it('calls handleSays for each entry', () => {
            clientActions.update([], [], null, [], [[1, 'foo', 0 /* Chat */], [2, 'var', 4 /* Party */]]);
            sinon_1.assert.calledTwice(handleSays);
            sinon_1.assert.calledWith(handleSays, game, 1, 'foo', 0 /* Chat */);
            sinon_1.assert.calledWith(handleSays, game, 2, 'var', 4 /* Party */);
        });
    });
    describe('fixPosition()', () => {
        it('updates player position', () => {
            game.player = {};
            clientActions.fixPosition(123, 456, true);
            chai_1.expect(game.player.x).equal(123);
            chai_1.expect(game.player.y).equal(456);
        });
        it('sends fixed position message back to server', () => {
            clientActions.fixPosition(123, 456, true);
            sinon_1.assert.calledOnce(server.fixedPosition);
        });
        it('does nothing if no player', () => {
            game.player = undefined;
            clientActions.fixPosition(123, 456, true);
        });
    });
    describe('left()', () => {
        it('resets game player', () => {
            game.player = {};
            clientActions.left(0 /* None */);
            chai_1.expect(game.player).undefined;
        });
        it('resets game map', () => {
            game.map = {};
            clientActions.left(0 /* None */);
            chai_1.expect(game.map).not.undefined;
        });
        it('notifies game service', () => {
            clientActions.left(1 /* Swearing */);
            sinon_1.assert.calledWith(gameService.left, 'clientActions.left', 1 /* Swearing */);
        });
    });
    describe('addNotification()', () => {
        it('adds notification to game', () => {
            const e = mocks_1.entity(456, 0, 0, entities_1.pony.type, { ponyState: {} });
            worldMap_1.addEntity(game.map, e);
            clientActions.addNotification(123, 456, 'name', 'test', 'note', 1 /* Ok */);
            chai_1.expect(game.notifications).eql([
                { id: 123, message: 'test', note: 'note', flags: 1 /* Ok */, open: false, fresh: true, pony: e }
            ]);
        });
        it('sets pony to offline pony if no pony is provided', () => {
            const pony = game.offlinePony = { offlinePony: true };
            clientActions.addNotification(123, 0, 'name', 'test', 'note', 1 /* Ok */);
            chai_1.expect(game.notifications).eql([
                { id: 123, message: 'test', note: 'note', flags: 1 /* Ok */, open: false, fresh: true, pony }
            ]);
        });
        it('sets pony to supporter pony if supporter pony flag is set', () => {
            const pony = game.supporterPony = { supporterPony: true };
            clientActions.addNotification(123, 0, 'name', 'test', 'note', 32 /* Supporter */);
            chai_1.expect(game.notifications).eql([
                { id: 123, message: 'test', note: 'note', flags: 32 /* Supporter */, open: false, fresh: true, pony }
            ]);
        });
    });
    describe('removeNotification()', () => {
        it('removes notification with given id', () => {
            game.notifications.push({ id: 123 });
            clientActions.removeNotification(123);
            chai_1.expect(game.notifications).eql([]);
        });
        it('removes notification in digest cycle', () => {
            const run = sinon_1.stub(zone, 'run');
            clientActions.removeNotification(123);
            sinon_1.assert.calledOnce(run);
        });
    });
    describe('updateSelection()', () => {
        it('selects new entity', () => {
            const newPony = mocks_1.entity(456, 0, 0, entities_1.pony.type, { ponyState: {} });
            game.selected = mocks_1.entity(123);
            worldMap_1.addEntity(game.map, newPony);
            const select = sinon_1.stub(game, 'select');
            clientActions.updateSelection(123, 456);
            sinon_1.assert.calledWith(select, newPony);
        });
        it('does nothing if selected ID is not current ID', () => {
            const select = sinon_1.stub(game, 'select');
            clientActions.updateSelection(123, 456);
            sinon_1.assert.notCalled(select);
        });
    });
    describe('updateParty()', () => {
        it('clears party if passed undefined', () => {
            game.party = {};
            clientActions.updateParty(undefined);
            chai_1.expect(game.party).undefined;
        });
        it('clears party if passed empty list', () => {
            game.party = {};
            clientActions.updateParty([]);
            chai_1.expect(game.party).undefined;
        });
        it('updates party', () => {
            clientActions.updateParty([
                [123, 1 /* Leader */],
            ]);
            chai_1.expect(game.party).eql({
                leaderId: 123,
                members: [
                    { id: 123, leader: true, offline: false, pending: false, pony: undefined, self: false },
                ],
            });
        });
        it('gets missing pony info from server', () => {
            clientActions.updateParty([
                [123, 1 /* Leader */],
            ]);
            sinon_1.assert.calledWithMatch(server.getPonies, [123]);
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
                [123, {}, utf8_1.encodeString('foo'), new Uint8Array([1, 2, 3]), 0, false],
            ]);
            chai_1.expect(game.party.members[0].pony).not.undefined;
        });
    });
});
//# sourceMappingURL=clientActions.spec.js.map