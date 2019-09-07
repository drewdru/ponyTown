import '../lib';
import { expect } from 'chai';
import { stub, SinonStub, assert, SinonFakeTimers, useFakeTimers } from 'sinon';
import { LiveList, LiveListConfig } from '../../server/services/liveList';

describe('LiveList', () => {
	let model: {
		find: SinonStub,
		findById: SinonStub;
		update: SinonStub;
		deleteOne: SinonStub;
	};
	let liveList: LiveList<any>;
	let config: LiveListConfig<any>;
	let logger: any;

	beforeEach(() => {
		model = {
			find: stub(),
			findById: stub(),
			update: stub(),
			deleteOne: stub(),
		};
		config = { fields: ['foo', 'bar'], clean: item => item };
		logger = {};
		liveList = new LiveList<any>(model as any, config, undefined, logger);
	});

	it('returns loaded state', () => {
		(liveList as any).finished = true;
		expect(liveList.loaded).true;
		(liveList as any).finished = false;
		expect(liveList.loaded).false;
	});

	describe('for()', () => {
		it('calls callback for item', () => {
			const callback = stub();
			const item = { _id: 'foo' };
			liveList.add(item);

			liveList.for('foo', callback);

			assert.calledWith(callback, item);
		});

		it('does nothing if item is not found', () => {
			const callback = stub();

			liveList.for('foo', callback);

			assert.notCalled(callback);
		});

		it('does nothing for undefined id', () => {
			const callback = stub();

			liveList.for(undefined, callback);

			assert.notCalled(callback);
		});
	});

	describe('add()', () => {
		it('adds item to items', () => {
			const item = { _id: 'foo' };

			liveList.add(item);

			expect(liveList.items).contain(item);
		});

		it('adds item to item map', () => {
			const item = { _id: 'foo' };

			liveList.add(item);

			expect(liveList.get('foo')).equal(item);
		});

		it('triggers event listeners', () => {
			const item = { _id: 'foo' };
			const listener = stub();
			liveList.subscribe('foo', listener);

			liveList.add(item);

			assert.calledWith(listener, 'foo', item);
		});

		it('returns item', () => {
			const item = { _id: 'foo' };

			expect(liveList.add(item)).equal(item);
		});
	});

	describe('remove()', () => {
		it('removes item from database', async () => {
			model.deleteOne.returns({ exec: stub().resolves() });

			await liveList.remove('foo');

			assert.calledWithMatch(model.deleteOne, { _id: 'foo' });
		});

		it('notifies removal of item', async () => {
			model.deleteOne.returns({ exec: stub().resolves() });
			const removed = stub(liveList, 'removed');

			await liveList.remove('foo');

			assert.calledWith(removed, 'foo');
		});
	});

	describe('removed()', () => {
		it('removed item from items', () => {
			const item = { _id: 'foo' };
			liveList.add(item);

			liveList.removed('foo');

			expect(liveList.items).not.contain(item);
		});

		it('removed item from items map', () => {
			const item = { _id: 'foo' };
			liveList.add(item);

			liveList.removed('foo');

			expect(liveList.get('foo')).undefined;
		});

		it('triggers event listeners', () => {
			const item = { _id: 'foo' };
			liveList.add(item);
			const trigger = stub(liveList, 'trigger');

			liveList.removed('foo');

			assert.calledWith(trigger, 'foo', undefined);
		});

		it('calls onDelete event handler', () => {
			const item = { _id: 'foo' };
			liveList.add(item);
			const onDelete = stub();
			config.onDelete = onDelete;

			liveList.removed('foo');

			assert.calledWith(onDelete, item);
		});

		it('does nothing if item is not found', () => {
			const trigger = stub(liveList, 'trigger');

			liveList.removed('foo');

			assert.notCalled(trigger);
		});
	});

	describe('trigger() / subscribe()', () => {
		it('calls all listeners', () => {
			const item = { _id: 'foo' };
			const listener1 = stub();
			const listener2 = stub();
			liveList.subscribe('foo', listener1);
			liveList.subscribe('foo', listener2);

			liveList.trigger('foo', item);

			assert.calledWith(listener1, 'foo', item);
			assert.calledWith(listener2, 'foo', item);
		});

		it('does nothing for no listeners', () => {
			const item = { _id: 'foo' };

			liveList.trigger('foo', item);
		});

		it('lets unsubscribe listeners', () => {
			const item = { _id: 'foo' };
			const listener1 = stub();
			const listener2 = stub();
			const subscription = liveList.subscribe('foo', listener1);
			liveList.subscribe('foo', listener2);

			subscription.unsubscribe();
			liveList.trigger('foo', item);

			assert.notCalled(listener1);
			assert.calledWith(listener2, 'foo', item);
		});

		it('does nothing if unsubscribed twice', () => {
			const item = { _id: 'foo' };
			const listener = stub();

			const subscription = liveList.subscribe('foo', listener);
			subscription.unsubscribe();
			subscription.unsubscribe();
			liveList.trigger('foo', item);

			assert.notCalled(listener);
		});

		it('cleans document before sending', () => {
			const item = { _id: 'foo' };
			const listener = stub();
			liveList.subscribe('foo', listener);
			config.clean = item => ({ ...item, bar: 5 });

			liveList.trigger('foo', item);

			assert.calledWithMatch(listener, 'foo', { _id: 'foo', bar: 5 });
		});

		it('skips cleanig if document is undefined', () => {
			const listener = stub();
			liveList.subscribe('foo', listener);
			config.clean = item => item.error;

			liveList.trigger('foo', undefined);

			assert.calledWithMatch(listener, 'foo', undefined);
		});

		it('calls listener on subscribe if found document', () => {
			const item = { _id: 'foo' };
			liveList.add(item);
			const listener = stub();

			liveList.subscribe('foo', listener);

			assert.calledWith(listener, 'foo', item);
		});

		it('cleans document when sending it on subscribe', () => {
			const item = { _id: 'foo' };
			liveList.add(item);
			const listener = stub();
			config.clean = item => ({ ...item, bar: 5 });

			liveList.subscribe('foo', listener);

			assert.calledWithMatch(listener, 'foo', { _id: 'foo', bar: 5 });
		});
	});

	describe('start()', () => {
		it('starts first tick', () => {
			const tick = stub(liveList, 'tick');

			liveList.start();

			assert.calledOnce(tick);
		});
	});

	describe('tick()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('does nothing if not running', async () => {
			const update = stub(liveList, 'update').resolves();

			await liveList.tick();

			assert.notCalled(update);
		});

		it('calls update', async () => {
			const update = stub(liveList, 'update').resolves();
			(liveList as any).running = true;

			await liveList.tick();

			assert.calledOnce(update);
		});

		it('schedules next tick with new timestamp', async () => {
			const update = stub(liveList, 'update').resolves();
			(liveList as any).running = true;

			await liveList.tick();
			clock.tick(2000);

			assert.calledTwice(update);
		});

		it('stop() prevents further ticks', async () => {
			const update = stub(liveList, 'update').resolves();
			(liveList as any).running = true;

			await liveList.tick();

			liveList.stop();

			clock.tick(2000);

			assert.calledOnce(update);
		});
	});

	describe('update()', () => {
		function createQuery<T>(items: T[]) {
			return {
				cursor() {
					return {
						on(event: string, callback: any) {
							if (event === 'data') {
								items.forEach(callback);
							} else if (event === 'end') {
								callback();
							}
							return this;
						}
					};
				}
			};
		}

		function setupFind<T>(items: T[]) {
			model.find.returns({ lean: stub().returns(createQuery(items)) });
		}

		it('queried database with current timestamp', async () => {
			const timestamp = new Date(12345);
			(liveList as any).timestamp = timestamp;
			setupFind([]);

			await liveList.update();

			assert.calledWithMatch(model.find, { updatedAt: { $gt: timestamp } }, 'foo bar');
		});

		it('adds new item', async () => {
			const item = { _id: 'foo' };
			setupFind([item]);

			await liveList.update();

			expect(liveList.items).contain(item);
		});

		it('calls onAddedOrUpdated event handler', async () => {
			const onAddedOrUpdated = stub();
			config.onAddedOrUpdated = onAddedOrUpdated;
			setupFind([{ _id: 'foo' }]);

			await liveList.update();

			assert.calledOnce(onAddedOrUpdated);
		});

		it('does not call onAddedOrUpdated event handler if did not fetch any items', async () => {
			const onAddedOrUpdated = stub();
			config.onAddedOrUpdated = onAddedOrUpdated;
			setupFind([]);

			await liveList.update();

			assert.notCalled(onAddedOrUpdated);
		});

		it('calls onAdd event when adding', () => {
			const item = { _id: 'foo' };
			const onAdd = stub();
			config.onAdd = onAdd;
			setupFind([item]);

			liveList.update();

			assert.calledWith(onAdd, item);
		});

		it('updates existing item', () => {
			const item = { _id: 'foo', value: 1 };
			liveList.add(item);
			setupFind([{ _id: 'foo', value: 2 }]);

			liveList.update();

			expect(item.value).equal(2);
		});

		it('fixes documents before updating', () => {
			const item = { _id: 'foo', value: 1 };
			config.fix = item => item.field = 'bar';
			liveList.add(item);
			setupFind([{ _id: 'foo', value: 2 }]);

			liveList.update();

			expect(item).eql({ _id: 'foo', value: 2, field: 'bar' });
		});

		it('triggers listeners updates existing item', () => {
			const trigger = stub(liveList, 'trigger');
			const item = { _id: 'foo', value: 1 };
			liveList.add(item);
			setupFind([{ _id: 'foo', value: 2 }]);

			liveList.update();

			assert.calledWith(trigger, 'foo', item);
		});

		it('calls onUpdate event when updating', () => {
			const item = { _id: 'foo', value: 1 };
			const update = { _id: 'foo', value: 2 };
			const onUpdate = stub();
			config.onUpdate = onUpdate;
			liveList.add(item);
			setupFind([update]);

			liveList.update();

			assert.calledWith(onUpdate, item, update);
		});

		it('sets loaded to true ', async () => {
			setupFind([]);

			await liveList.update();

			expect(liveList.loaded).true;
		});

		it('calls onFinished event handler', async () => {
			const onFinished = stub();
			config.onFinished = onFinished;
			setupFind([]);

			await liveList.update();

			assert.calledOnce(onFinished);
		});

		it('calls onFinished event handler only on first finish', async () => {
			const onFinished = stub();
			config.onFinished = onFinished;
			setupFind([]);

			await liveList.update();
			await liveList.update();

			assert.calledOnce(onFinished);
		});
	});
});
