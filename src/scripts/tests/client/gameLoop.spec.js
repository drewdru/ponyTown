"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const lodash_1 = require("lodash");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const gameLoop_1 = require("../../client/gameLoop");
describe('gameLoop', () => {
    let clock;
    let requestAnimationFrame;
    // let cancelAnimationFrame: SinonStub;
    beforeEach(() => {
        clock = sinon_1.useFakeTimers();
        global.requestAnimationFrame = requestAnimationFrame = sinon_1.stub();
        global.cancelAnimationFrame = sinon_1.stub();
    });
    afterEach(() => {
        clock.restore();
    });
    after(() => {
        delete global.requestAnimationFrame;
        delete global.cancelAnimationFrame;
    });
    describe('startGameLoop()', () => {
        it('returns started promise', async () => {
            await gameLoop_1.startGameLoop({ draw: lodash_1.noop, update: lodash_1.noop, init: lodash_1.noop, load: lodash_1.noop, fps: 0 }, lodash_1.noop).started;
        });
        it('loads game', async () => {
            const load = sinon_1.stub().resolves();
            await gameLoop_1.startGameLoop({ draw: lodash_1.noop, update: lodash_1.noop, init: lodash_1.noop, load, fps: 0 }, lodash_1.noop).started;
            sinon_1.assert.calledOnce(load);
        });
        it('initializes game after load finishes', async () => {
            const load = sinon_1.stub();
            const init = sinon_1.stub();
            await gameLoop_1.startGameLoop({ draw: lodash_1.noop, update: lodash_1.noop, init, load, fps: 0 }, lodash_1.noop).started;
            sinon_1.assert.calledOnce(load);
            sinon_1.assert.calledOnce(init);
            sinon_1.assert.callOrder(load, init);
        });
        // it('updates and draws the game', async () => {
        // 	const update = stub();
        // 	const draw = stub();
        // 	clock.setSystemTime(0);
        // 	await startGameLoop({ draw, update, init: noop, load: noop, fps: 0 }, noop).started;
        // 	clock.setSystemTime(123);
        // 	assert.calledOnce(requestAnimationFrame);
        // 	requestAnimationFrame.args[0][0]();
        // 	assert.calledWith(update, 0.123, 123);
        // 	assert.calledOnce(draw);
        // 	assert.callOrder(update, draw);
        // });
        it('updates the game using backup timer if animation frame did not fire for 0.1s', async () => {
            const update = sinon_1.stub();
            const draw = sinon_1.stub();
            clock.setSystemTime(0);
            await gameLoop_1.startGameLoop({ draw, update, init: lodash_1.noop, load: lodash_1.noop, fps: 0 }, lodash_1.noop).started;
            clock.setSystemTime(100);
            clock.tick(101);
            sinon_1.assert.calledWith(update, 0.1);
            sinon_1.assert.notCalled(draw);
        });
        it('reports error during update', async () => {
            const error = new Error('test');
            const update = sinon_1.stub().throws(error);
            const onError = sinon_1.stub();
            await gameLoop_1.startGameLoop({ draw: lodash_1.noop, update, init: lodash_1.noop, load: lodash_1.noop, fps: 0 }, onError).started;
            sinon_1.assert.calledOnce(requestAnimationFrame);
            requestAnimationFrame.args[0][0](123);
            sinon_1.assert.calledWith(onError, error);
        });
        it('throws if cancelled before init', async () => {
            const { started, cancel } = gameLoop_1.startGameLoop({ draw: lodash_1.noop, update: lodash_1.noop, init: lodash_1.noop, load: lodash_1.noop, fps: 0 }, lodash_1.noop);
            cancel();
            await chai_1.expect(started).rejectedWith('Cancelled');
        });
    });
});
//# sourceMappingURL=gameLoop.spec.js.map