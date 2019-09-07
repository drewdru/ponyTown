import '../../lib';
import { expect } from 'chai';
import { stub, assert, SinonFakeTimers, useFakeTimers } from 'sinon';
import { taskQueue, TaskQueue, makeQueued } from '../../../server/utils/taskQueue';

describe('taskQueue', () => {
	let queue: TaskQueue;
	let clock: SinonFakeTimers;

	beforeEach(() => {
		queue = taskQueue();
		clock = useFakeTimers();
	});

	afterEach(() => {
		clock.restore();
		clock = undefined as any;
		queue = undefined as any;
	});

	it('waits on empty queue', async () => {
		await queue.wait();
	});

	it('executes given action', async () => {
		const action = stub();

		queue.push(action);
		await queue.wait();

		assert.calledOnce(action);
	});

	it('executes two actions', async () => {
		const action1 = stub();
		const action2 = stub();

		queue.push(action1);
		queue.push(action2);
		await queue.wait();

		assert.calledOnce(action1);
		assert.calledOnce(action2);
	});

	it('executes actions in order', async () => {
		const order = [0];
		const action1 = stub().callsFake(() => order.push(1));
		const action2 = stub().callsFake(() => order.push(2));

		queue.push(action1);
		queue.push(action2);
		await queue.wait();

		expect(order).eql([0, 1, 2]);
	});

	it('executes two actions with wait', async () => {
		const action1 = stub();
		const action2 = stub();

		queue.push(action1);
		await queue.wait();
		queue.push(action2);
		await queue.wait();

		assert.calledOnce(action1);
		assert.calledOnce(action2);
	});

	it('returns promise that resolves after passed action', async () => {
		const action = stub();

		const promise = queue.push(action);
		assert.notCalled(action);
		await promise.then(() => assert.calledOnce(action));
	});

	it('returns promise that resolves to value returned from action', async () => {
		const action = stub().returns('foo');

		await expect(queue.push(action)).eventually.equal('foo');
	});

	it('returns promise that resolves to value resolved from action', async () => {
		const action = stub().resolves('foo');

		await expect(queue.push(action)).eventually.equal('foo');
	});

	it('returns promise that rejects to error thrown from action', async () => {
		const action = stub().throws(new Error('test'));

		await expect(queue.push(action)).rejectedWith('test');
	});

	it('returns promise that rejects to error rejected from action', async () => {
		const action = stub().rejects(new Error('test'));

		await expect(queue.push(action)).rejectedWith('test');
	});

	it('returns promise that rejects to error rejected from action', async () => {
		const action = stub().rejects(new Error('test'));

		await expect(queue.push(action)).rejectedWith('test');
	});

	describe('makeQueued()', () => {
		it('creates queued function', async () => {
			const action = stub();
			const queued = makeQueued(action);

			await queued();

			assert.calledOnce(action);
		});
	});
});
