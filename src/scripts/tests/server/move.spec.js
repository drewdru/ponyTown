"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const movementUtils_1 = require("../../common/movementUtils");
const move_1 = require("../../server/move");
const lib_1 = require("../lib");
const mocks_1 = require("../mocks");
const counter_1 = require("../../server/services/counter");
const camera_1 = require("../../common/camera");
const expressionEncoder_1 = require("../../common/encoders/expressionEncoder");
const serverRegion_1 = require("../../server/serverRegion");
const serverMap_1 = require("../../server/serverMap");
const rect_1 = require("../../common/rect");
const constants_1 = require("../../common/constants");
const collision = require("../../common/collision");
describe('move', () => {
    describe('move()', () => {
        let camera;
        let client;
        let counter = lib_1.stubClass(counter_1.CounterService);
        let move;
        let isStaticCollision;
        beforeEach(() => {
            lib_1.resetStubMethods(counter, 'add', 'remove');
            isStaticCollision = sinon_1.stub(collision, 'isStaticCollision');
            camera = camera_1.createCamera();
            client = mocks_1.mockClient();
            client.map = serverMap_1.createServerMap('', 0, 10, 10);
            move = move_1.createMove(counter);
        });
        afterEach(() => {
            isStaticCollision.restore();
        });
        it('does nothing if loading flag is true', () => {
            client.loading = true;
            move(client, 0, 1, 2, 3, 4, 5, {});
            chai_1.expect(client.pony.x).equal(0, 'x');
            chai_1.expect(client.pony.y).equal(0, 'y');
        });
        it('does nothing if fixing position', () => {
            client.loading = true;
            move(client, 0, 1, 2, 3, 4, 5, {});
            chai_1.expect(client.pony.x).equal(0, 'x');
            chai_1.expect(client.pony.y).equal(0, 'y');
        });
        it('updates pony coordinates', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 0 /* None */, 123, camera);
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.x).equal(12.015625, 'x');
            chai_1.expect(client.pony.y).equal(34.020833333333336, 'y');
        });
        it('updates last coordinates, velocity and time', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 0 /* None */, 123, camera);
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.lastX).equal(12.015625, 'lastX');
            chai_1.expect(client.lastY).equal(34.020833333333336, 'lastY');
            chai_1.expect(client.lastVX).equal(0, 'lastVX');
            chai_1.expect(client.lastVY).equal(0, 'lastVY');
            chai_1.expect(client.lastTime).equal(123, 'lastTime');
        });
        it('updates pony coordinates (has last time)', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 0 /* None */, 123, camera);
            client.lastTime = 1;
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.x).equal(12.015625, 'x');
            chai_1.expect(client.pony.y).equal(34.020833333333336, 'y');
        });
        it('updates pony velocity', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 123, camera);
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.vx).equal(constants_1.PONY_SPEED_TROT, 'vx');
            chai_1.expect(client.pony.vy).equal(-constants_1.PONY_SPEED_TROT, 'vy');
        });
        it('updates safe position if not colliding', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 123, camera);
            isStaticCollision.returns(false);
            client.pony.x = 10;
            client.pony.y = 30;
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.safeX).equal(10, 'safeX');
            chai_1.expect(client.safeY).equal(30, 'safeY');
            sinon_1.assert.calledWith(isStaticCollision, client.pony, client.map, true);
        });
        it('does not update safe position if colliding', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 123, camera);
            isStaticCollision.returns(false);
            isStaticCollision.withArgs(client.pony, client.map, true).returns(true);
            client.pony.x = 10;
            client.pony.y = 30;
            client.safeX = 1;
            client.safeY = 3;
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.safeX).equal(1, 'safeX');
            chai_1.expect(client.safeY).equal(3, 'safeY');
        });
        it('resets pony to safe position if colliding', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 123, camera);
            const fixPositionStub = sinon_1.stub(client, 'fixPosition');
            isStaticCollision.onCall(0).returns(true);
            isStaticCollision.onCall(1).returns(true);
            isStaticCollision.onCall(2).returns(false);
            client.safeX = 1;
            client.safeY = 3;
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.x).equal(1, 'x');
            chai_1.expect(client.pony.y).equal(3, 'y');
            sinon_1.assert.calledWith(fixPositionStub, 1, 3, false);
        });
        it('does not reset pony to safe position if safe position is colliding', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 123, camera);
            const fixPositionStub = sinon_1.stub(client, 'fixPosition');
            isStaticCollision.onCall(0).returns(true);
            isStaticCollision.onCall(1).returns(true);
            isStaticCollision.onCall(2).returns(true);
            client.safeX = 1;
            client.safeY = 3;
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.x).equal(12.015625, 'x');
            chai_1.expect(client.pony.y).equal(34.020833333333336, 'y');
            sinon_1.assert.notCalled(fixPositionStub);
        });
        it('updates pony right flag', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 123, camera);
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.state).equal(2 /* FacingRight */, 'flags');
        });
        it('resets head turned flag if turning', () => {
            client.pony.state = 4 /* HeadTurned */;
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 123, camera);
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.state).equal(2 /* FacingRight */, 'flags');
        });
        it('resets sitting flag', () => {
            client.pony.state = 48 /* PonySitting */;
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 123, camera);
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.state).equal(2 /* FacingRight */, 'flags');
        });
        it('adds entity update', () => {
            const region = serverRegion_1.createServerRegion(0, 0);
            client.pony.region = region;
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(0, 0, 0, 0, 0, rect_1.rect(0, 0, 0, 0));
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(region.entityUpdates).eql([
                {
                    entity: client.pony, flags: 1 /* Position */ | 4 /* State */,
                    x: 0.015625, y: 0.020833333333333332, vx: 0, vy: -0,
                    action: 0, playerState: 0, options: undefined
                },
            ]);
        });
        it('clears cancellable expression', () => {
            client.pony.exprCancellable = true;
            client.pony.options.expr = 123;
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(0, 0, 0, 0, 0, rect_1.rect(0, 0, 0, 0));
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.options.expr).equal(expressionEncoder_1.EMPTY_EXPRESSION);
            chai_1.expect(client.pony.exprCancellable).false;
        });
        it('reports client outside the map', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10000, 10000, 0, 0 /* None */, 123, camera);
            const warn = sinon_1.stub(client.reporter, 'warn');
            Object.assign(client.map, { id: 'foo', width: 100, height: 100 });
            move(client, 0, a, b, c, d, e, {});
            sinon_1.assert.calledWith(warn, 'Outside map', 'map: [foo] coords: [10000.02, 10000.02]');
        });
        it('logs client outside the map', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10000, 10000, 0, 0 /* None */, 123, camera);
            Object.assign(client.map, { id: 'foo', width: 100, height: 100 });
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.leaveReason).equal('outside map: [foo] coords: [10000.02, 10000.02]');
        });
        it('disconnects client outside the map', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10000, 10000, 0, 0 /* None */, 123, camera);
            const disconnect = sinon_1.stub(client, 'disconnect');
            Object.assign(client.map, { id: 'foo', width: 100, height: 100 });
            move(client, 0, a, b, c, d, e, {});
            sinon_1.assert.calledWith(disconnect, true, true);
        });
        it('does not update pony position when coordinates are outside the map', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10000, 10000, 0, 0 /* None */, 123, camera);
            Object.assign(client.map, { width: 100, height: 100 });
            move(client, 0, a, b, c, d, e, {});
            chai_1.expect(client.pony.x).equal(0, 'x');
            chai_1.expect(client.pony.y).equal(0, 'y');
        });
        it('logs lagging player if logLagging setting is true', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 16000, camera);
            const systemLog = sinon_1.stub(client.reporter, 'systemLog');
            client.account.name = 'Foo';
            client.accountId = 'foo';
            move(client, 0, a, b, c, d, e, { logLagging: true });
            sinon_1.assert.calledWith(systemLog, 'Time delta > 15s (16000)');
            chai_1.expect(client.logDisconnect).true;
        });
        it('kicks player for lagging if kickLagging setting is true', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(12, 34, 2, 32 /* PonyTrotting */, 16000, camera);
            const disconnect = sinon_1.stub(client, 'disconnect');
            move(client, 0, a, b, c, d, e, { kickLagging: true });
            sinon_1.assert.calledWith(disconnect, true, true);
            chai_1.expect(client.leaveReason).equal('lagging');
        });
        it('counts teleporting', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10, 10, 2, 32 /* PonyTrotting */, 1001, camera);
            counter.add.returns({ count: 1, items: [], date: 0 });
            Object.assign(client, { lastX: 0, lastY: 0, lastVX: 0, lastVY: 0, lastTime: 1 });
            move(client, 0, a, b, c, d, e, { reportTeleporting: true });
            sinon_1.assert.calledWith(counter.add, client.accountId);
        });
        it('reports teleporting if counter exceeded limit', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10, 10, 2, 32 /* PonyTrotting */, 1001, camera);
            counter.add.returns({ count: 20, items: [], date: 0 });
            Object.assign(client, { lastX: 0, lastY: 0, lastVX: 0, lastVY: 0, lastTime: 1 });
            const warn = sinon_1.stub(client.reporter, 'warn');
            move(client, 0, a, b, c, d, e, { reportTeleporting: true });
            sinon_1.assert.calledWith(counter.add, client.accountId);
            sinon_1.assert.calledWith(counter.remove, client.accountId);
            sinon_1.assert.calledWith(warn, 'Teleporting (x10)');
        });
        it('kicks player for teleporting', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10, 10, 2, 32 /* PonyTrotting */, 1001, camera);
            const disconnect = sinon_1.stub(client, 'disconnect');
            Object.assign(client, { lastX: 0, lastY: 0, lastVX: 0, lastVY: 0, lastTime: 1 });
            move(client, 0, a, b, c, d, e, { kickTeleporting: true });
            sinon_1.assert.calledWith(disconnect, true, true);
            chai_1.expect(client.leaveReason).equal('teleporting');
        });
        it('fixes player position if teleporting', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10, 10, 2, 32 /* PonyTrotting */, 1001, camera);
            const systemLog = sinon_1.stub(client.reporter, 'systemLog');
            const fixPositionStub = sinon_1.stub(client, 'fixPosition');
            Object.assign(client, { lastX: 0, lastY: 0, lastVX: 0, lastVY: 0, lastTime: 1 });
            move(client, 0, a, b, c, d, e, { fixTeleporting: true, logFixingPosition: true });
            chai_1.expect(client.pony.vx).equal(0);
            chai_1.expect(client.pony.vy).equal(0);
            sinon_1.assert.calledWith(fixPositionStub, 0, 0, false);
            sinon_1.assert.calledWith(systemLog, 'Fixed teleporting (10.015625 10.020833333333334) -> (0 0)');
        });
    });
});
//# sourceMappingURL=move.spec.js.map