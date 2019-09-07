import '../lib';
import { noop } from 'lodash';
import { expect } from 'chai';
import { SinonFakeTimers, useFakeTimers, SinonStub, stub, assert } from 'sinon';
import { startGameLoop } from '../../client/gameLoop';

describe('gameLoop', () => {
	let clock: SinonFakeTimers;
	let requestAnimationFrame: SinonStub;
	// let cancelAnimationFrame: SinonStub;

	beforeEach(() => {
		clock = useFakeTimers();
		(global as any).requestAnimationFrame = requestAnimationFrame = stub();
		(global as any).cancelAnimationFrame = stub();
	});

	afterEach(() => {
		clock.restore();
	});

	after(() => {
		delete (global as any).requestAnimationFrame;
		delete (global as any).cancelAnimationFrame;
	});

	describe('startGameLoop()', () => {
		it('returns started promise', async () => {
			await startGameLoop({ draw: noop, update: noop, init: noop, load: noop, fps: 0 }, noop).started;
		});

		it('loads game', async () => {
			const load = stub().resolves();

			await startGameLoop({ draw: noop, update: noop, init: noop, load, fps: 0 }, noop).started;

			assert.calledOnce(load);
		});

		it('initializes game after load finishes', async () => {
			const load = stub();
			const init = stub();

			await startGameLoop({ draw: noop, update: noop, init, load, fps: 0 }, noop).started;

			assert.calledOnce(load);
			assert.calledOnce(init);
			assert.callOrder(load, init);
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
			const update = stub();
			const draw = stub();
			clock.setSystemTime(0);

			await startGameLoop({ draw, update, init: noop, load: noop, fps: 0 }, noop).started;

			clock.setSystemTime(100);
			clock.tick(101);

			assert.calledWith(update, 0.1);
			assert.notCalled(draw);
		});

		it('reports error during update', async () => {
			const error = new Error('test');
			const update = stub().throws(error);
			const onError = stub();

			await startGameLoop({ draw: noop, update, init: noop, load: noop, fps: 0 }, onError).started;

			assert.calledOnce(requestAnimationFrame);
			requestAnimationFrame.args[0][0](123);

			assert.calledWith(onError, error);
		});

		it('throws if cancelled before init', async () => {
			const { started, cancel } = startGameLoop({ draw: noop, update: noop, init: noop, load: noop, fps: 0 }, noop);

			cancel();

			await expect(started).rejectedWith('Cancelled');
		});
	});
});
