"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const rxjs_1 = require("rxjs");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const worldMap_1 = require("../../common/worldMap");
const game_1 = require("../../client/game");
const mocks_1 = require("../mocks");
const rect_1 = require("../../common/rect");
const entities_1 = require("../../common/entities");
const animator_1 = require("../../common/animator");
const ponyHelpers_1 = require("../../client/ponyHelpers");
const region_1 = require("../../common/region");
const camera_1 = require("../../common/camera");
const graphicsUtils_1 = require("../../graphics/graphicsUtils");
const handlers_1 = require("../../client/handlers");
describe('worldMap', () => {
    describe('updateEntityInternal()', () => {
        let game;
        const def = {
            id: 0, x: 0, y: 0, vx: 0, vy: 0, state: 0, expression: 0, playerState: 0, switchRegion: false,
            options: undefined, name: undefined, info: undefined, crc: undefined, type: undefined, action: undefined,
            filterName: false,
        };
        beforeEach(() => {
            game = {};
            game.map = worldMap_1.createWorldMap({ type: 0, flags: 0, regionsX: 2, regionsY: 1, defaultTile: 0 });
            worldMap_1.setRegion(game.map, 0, 0, region_1.createRegion(0, 0));
            worldMap_1.setRegion(game.map, 1, 0, region_1.createRegion(1, 0));
            game.onActionsUpdate = new rxjs_1.Subject();
        });
        it('updates x, y, vx, vy', () => {
            const e = mocks_1.entity(123, 0, 0, 2);
            worldMap_1.addEntity(game.map, e);
            handlers_1.handleUpdateEntity(game, Object.assign({}, def, { id: 123, x: 2, y: 3, vx: 4, vy: 5, state: 123, expression: 234 }));
            chai_1.expect(e.x).equal(2);
            chai_1.expect(e.y).equal(3);
            chai_1.expect(e.vx).equal(4);
            chai_1.expect(e.vy).equal(5);
        });
        it('switches regions', () => {
            const e = mocks_1.entity(123, 0, 0, 1);
            e.ponyState = ponyHelpers_1.defaultPonyState();
            worldMap_1.addEntity(game.map, e);
            handlers_1.handleUpdateEntity(game, Object.assign({}, def, { id: 123, x: 12, y: 3, vx: 4, vy: 5, switchRegion: true }));
            chai_1.expect(worldMap_1.getRegion(game.map, 1, 0).entities).includes(e);
        });
        it('does not update x, y, vx, vy for player', () => {
            const e = mocks_1.entity(123, 0, 0, 1);
            e.ponyState = ponyHelpers_1.defaultPonyState();
            worldMap_1.addEntity(game.map, e);
            game.playerId = e.id;
            game.player = e;
            handlers_1.handleUpdateEntity(game, Object.assign({}, def, { id: 123, x: 2, y: 3, vx: 4, vy: 5 }));
            chai_1.expect(e.x).equal(0);
            chai_1.expect(e.y).equal(0);
            chai_1.expect(e.vx).equal(0);
            chai_1.expect(e.vy).equal(0);
        });
        it('updates flags', () => {
            const e = mocks_1.entity(123, 0, 0, 1);
            e.ponyState = ponyHelpers_1.defaultPonyState();
            worldMap_1.addEntity(game.map, e);
            handlers_1.handleUpdateEntity(game, Object.assign({}, def, { id: 123, x: 2, y: 3, vx: 4, vy: 5, state: 123 }));
            chai_1.expect(e.state).equal(123);
        });
        it('updates expression', () => {
            const e = mocks_1.entity(123, 0, 0, 1);
            e.expr = 0;
            e.ponyState = ponyHelpers_1.defaultPonyState();
            worldMap_1.addEntity(game.map, e);
            handlers_1.handleUpdateEntity(game, Object.assign({}, def, { id: 123, x: 2, y: 3, vx: 4, vy: 5, expression: 234 }));
            chai_1.expect(e.expr).equal(234);
        });
        it('overrides right flag for player', () => {
            const player = mocks_1.entity(123, 0, 0, 1);
            game.player = player;
            game.player.ponyState = ponyHelpers_1.defaultPonyState();
            game.rightOverride = true;
            worldMap_1.addEntity(game.map, player);
            handlers_1.handleUpdateEntity(game, Object.assign({}, def, { id: 123, x: 2, y: 3, vx: 4, vy: 5 }));
            chai_1.expect(player.state).equal(2 /* FacingRight */);
        });
        it('overrides headTurned flag for player', () => {
            const player = mocks_1.entity(123, 0, 0, 1);
            game.player = player;
            game.player.ponyState = ponyHelpers_1.defaultPonyState();
            game.headTurnedOverride = true;
            worldMap_1.addEntity(game.map, player);
            handlers_1.handleUpdateEntity(game, Object.assign({}, def, { id: 123, x: 2, y: 3, vx: 4, vy: 5 }));
            chai_1.expect(player.state).equal(4 /* HeadTurned */);
        });
        it('overrides sitting flag for player', () => {
            const player = mocks_1.entity(123, 0, 0, 1);
            game.player = player;
            game.player.ponyState = ponyHelpers_1.defaultPonyState();
            game.stateOverride = 48 /* PonySitting */;
            worldMap_1.addEntity(game.map, player);
            handlers_1.handleUpdateEntity(game, Object.assign({}, def, { id: 123, x: 2, y: 3, vx: 4, vy: 5 }));
            chai_1.expect(player.state).equal(48 /* PonySitting */);
        });
    });
    describe('handleSays()', () => {
        let e;
        let clock;
        let game;
        beforeEach(() => {
            game = mocks_1.mock(game_1.PonyTownGame);
            e = mocks_1.entity(1, 1, 1, 2, { bounds: rect_1.rect(0, 0, 10, 10) });
            e.animator = animator_1.createAnimator();
            e.ponyState = ponyHelpers_1.defaultPonyState();
            game.map = worldMap_1.createWorldMap({ type: 0, flags: 0, regionsX: 1, regionsY: 1, defaultTile: 0 /* None */ });
            worldMap_1.setRegion(game.map, 0, 0, region_1.createRegion(0, 0));
            worldMap_1.addEntity(game.map, e);
            game.camera = camera_1.createCamera();
            game.settings = { account: {} };
            game.messageQueue = [];
            game.findEntityFromChatLog = () => undefined;
            game.model = { friends: [] };
            clock = sinon_1.useFakeTimers();
        });
        afterEach(() => {
            clock.restore();
        });
        it('adds says object to entity', () => {
            handlers_1.handleSays(game, 1, 'test', 0 /* Chat */);
            chai_1.expect(e.says).eql({ message: 'test', timer: 5.1875, total: 5.1875, type: 0 /* Chat */, created: 0 });
        });
        // it('does nothing if entity is not on the map', () => {
        // 	game.map.removeEntity(1);
        // 	handleSays(game, 1, 'test', MessageType.Chat);
        // 	expect(e.says).undefined;
        // });
        it('does nothing if entity is not visible', () => {
            e.x = 1000;
            handlers_1.handleSays(game, 1, 'test', 0 /* Chat */);
            chai_1.expect(e.says).undefined;
        });
        // it('does nothing if entity is ignored', () => {
        // 	e.playerState = setFlag(e.playerState, EntityPlayerState.Ignored, true);
        // 	handleSays(game, 1, 'test', MessageType.Chat);
        // 	expect(e.says).undefined;
        // });
        it('emits chat message', () => {
            e.name = 'foo';
            e.type = entities_1.pony.type;
            e.crc = 123;
            handlers_1.handleSays(game, 1, 'test', 0 /* Chat */);
            chai_1.expect(game.messageQueue).eql([
                { id: 1, name: 'foo', crc: 123, message: 'test', type: 0 /* Chat */ },
            ]);
        });
        it('emits chat message for party message even if entity is not visible', () => {
            e.name = 'foo';
            e.type = entities_1.pony.type;
            e.x = 1000;
            e.crc = 123;
            handlers_1.handleSays(game, 1, 'test', 4 /* Party */);
            chai_1.expect(game.messageQueue).eql([
                { id: 1, name: 'foo', crc: 123, message: 'test', type: 4 /* Party */ },
            ]);
        });
        it('does nothing if entity is not visible', () => {
            e.type = entities_1.pony.type;
            e.x = 1000;
            handlers_1.handleSays(game, 1, 'test', 0 /* Chat */);
            chai_1.expect(game.messageQueue).eql([]);
        });
        it('does not call game.onMessage for non-pony entities', () => {
            e.type = entities_1.apple.type;
            handlers_1.handleSays(game, 1, 'test', 0 /* Chat */);
            chai_1.expect(game.messageQueue).eql([]);
        });
        it('does not call game.onMessage for "." message', () => {
            e.type = entities_1.pony.type;
            handlers_1.handleSays(game, 1, '.', 0 /* Chat */);
            chai_1.expect(game.messageQueue).eql([]);
        });
        it('dismisses previous message for "." message', () => {
            e.type = entities_1.pony.type;
            handlers_1.handleSays(game, 1, 'test', 0 /* Chat */);
            handlers_1.handleSays(game, 1, '.', 0 /* Chat */);
            chai_1.expect(e.says.timer).equal(graphicsUtils_1.chatAnimationDuration);
        });
    });
});
//# sourceMappingURL=worldMap.spec.js.map