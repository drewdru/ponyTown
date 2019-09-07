"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const liveList_1 = require("../../server/services/liveList");
describe('LiveList', () => {
    let model;
    let liveList;
    let config;
    let logger;
    beforeEach(() => {
        model = {
            find: sinon_1.stub(),
            findById: sinon_1.stub(),
            update: sinon_1.stub(),
            deleteOne: sinon_1.stub(),
        };
        config = { fields: ['foo', 'bar'], clean: item => item };
        logger = {};
        liveList = new liveList_1.LiveList(model, config, undefined, logger);
    });
    it('returns loaded state', () => {
        liveList.finished = true;
        chai_1.expect(liveList.loaded).true;
        liveList.finished = false;
        chai_1.expect(liveList.loaded).false;
    });
    describe('for()', () => {
        it('calls callback for item', () => {
            const callback = sinon_1.stub();
            const item = { _id: 'foo' };
            liveList.add(item);
            liveList.for('foo', callback);
            sinon_1.assert.calledWith(callback, item);
        });
        it('does nothing if item is not found', () => {
            const callback = sinon_1.stub();
            liveList.for('foo', callback);
            sinon_1.assert.notCalled(callback);
        });
        it('does nothing for undefined id', () => {
            const callback = sinon_1.stub();
            liveList.for(undefined, callback);
            sinon_1.assert.notCalled(callback);
        });
    });
    describe('add()', () => {
        it('adds item to items', () => {
            const item = { _id: 'foo' };
            liveList.add(item);
            chai_1.expect(liveList.items).contain(item);
        });
        it('adds item to item map', () => {
            const item = { _id: 'foo' };
            liveList.add(item);
            chai_1.expect(liveList.get('foo')).equal(item);
        });
        it('triggers event listeners', () => {
            const item = { _id: 'foo' };
            const listener = sinon_1.stub();
            liveList.subscribe('foo', listener);
            liveList.add(item);
            sinon_1.assert.calledWith(listener, 'foo', item);
        });
        it('returns item', () => {
            const item = { _id: 'foo' };
            chai_1.expect(liveList.add(item)).equal(item);
        });
    });
    describe('remove()', () => {
        it('removes item from database', async () => {
            model.deleteOne.returns({ exec: sinon_1.stub().resolves() });
            await liveList.remove('foo');
            sinon_1.assert.calledWithMatch(model.deleteOne, { _id: 'foo' });
        });
        it('notifies removal of item', async () => {
            model.deleteOne.returns({ exec: sinon_1.stub().resolves() });
            const removed = sinon_1.stub(liveList, 'removed');
            await liveList.remove('foo');
            sinon_1.assert.calledWith(removed, 'foo');
        });
    });
    describe('removed()', () => {
        it('removed item from items', () => {
            const item = { _id: 'foo' };
            liveList.add(item);
            liveList.removed('foo');
            chai_1.expect(liveList.items).not.contain(item);
        });
        it('removed item from items map', () => {
            const item = { _id: 'foo' };
            liveList.add(item);
            liveList.removed('foo');
            chai_1.expect(liveList.get('foo')).undefined;
        });
        it('triggers event listeners', () => {
            const item = { _id: 'foo' };
            liveList.add(item);
            const trigger = sinon_1.stub(liveList, 'trigger');
            liveList.removed('foo');
            sinon_1.assert.calledWith(trigger, 'foo', undefined);
        });
        it('calls onDelete event handler', () => {
            const item = { _id: 'foo' };
            liveList.add(item);
            const onDelete = sinon_1.stub();
            config.onDelete = onDelete;
            liveList.removed('foo');
            sinon_1.assert.calledWith(onDelete, item);
        });
        it('does nothing if item is not found', () => {
            const trigger = sinon_1.stub(liveList, 'trigger');
            liveList.removed('foo');
            sinon_1.assert.notCalled(trigger);
        });
    });
    describe('trigger() / subscribe()', () => {
        it('calls all listeners', () => {
            const item = { _id: 'foo' };
            const listener1 = sinon_1.stub();
            const listener2 = sinon_1.stub();
            liveList.subscribe('foo', listener1);
            liveList.subscribe('foo', listener2);
            liveList.trigger('foo', item);
            sinon_1.assert.calledWith(listener1, 'foo', item);
            sinon_1.assert.calledWith(listener2, 'foo', item);
        });
        it('does nothing for no listeners', () => {
            const item = { _id: 'foo' };
            liveList.trigger('foo', item);
        });
        it('lets unsubscribe listeners', () => {
            const item = { _id: 'foo' };
            const listener1 = sinon_1.stub();
            const listener2 = sinon_1.stub();
            const subscription = liveList.subscribe('foo', listener1);
            liveList.subscribe('foo', listener2);
            subscription.unsubscribe();
            liveList.trigger('foo', item);
            sinon_1.assert.notCalled(listener1);
            sinon_1.assert.calledWith(listener2, 'foo', item);
        });
        it('does nothing if unsubscribed twice', () => {
            const item = { _id: 'foo' };
            const listener = sinon_1.stub();
            const subscription = liveList.subscribe('foo', listener);
            subscription.unsubscribe();
            subscription.unsubscribe();
            liveList.trigger('foo', item);
            sinon_1.assert.notCalled(listener);
        });
        it('cleans document before sending', () => {
            const item = { _id: 'foo' };
            const listener = sinon_1.stub();
            liveList.subscribe('foo', listener);
            config.clean = item => (Object.assign({}, item, { bar: 5 }));
            liveList.trigger('foo', item);
            sinon_1.assert.calledWithMatch(listener, 'foo', { _id: 'foo', bar: 5 });
        });
        it('skips cleanig if document is undefined', () => {
            const listener = sinon_1.stub();
            liveList.subscribe('foo', listener);
            config.clean = item => item.error;
            liveList.trigger('foo', undefined);
            sinon_1.assert.calledWithMatch(listener, 'foo', undefined);
        });
        it('calls listener on subscribe if found document', () => {
            const item = { _id: 'foo' };
            liveList.add(item);
            const listener = sinon_1.stub();
            liveList.subscribe('foo', listener);
            sinon_1.assert.calledWith(listener, 'foo', item);
        });
        it('cleans document when sending it on subscribe', () => {
            const item = { _id: 'foo' };
            liveList.add(item);
            const listener = sinon_1.stub();
            config.clean = item => (Object.assign({}, item, { bar: 5 }));
            liveList.subscribe('foo', listener);
            sinon_1.assert.calledWithMatch(listener, 'foo', { _id: 'foo', bar: 5 });
        });
    });
    describe('start()', () => {
        it('starts first tick', () => {
            const tick = sinon_1.stub(liveList, 'tick');
            liveList.start();
            sinon_1.assert.calledOnce(tick);
        });
    });
    describe('tick()', () => {
        let clock;
        beforeEach(() => {
            clock = sinon_1.useFakeTimers();
        });
        afterEach(() => {
            clock.restore();
        });
        it('does nothing if not running', async () => {
            const update = sinon_1.stub(liveList, 'update').resolves();
            await liveList.tick();
            sinon_1.assert.notCalled(update);
        });
        it('calls update', async () => {
            const update = sinon_1.stub(liveList, 'update').resolves();
            liveList.running = true;
            await liveList.tick();
            sinon_1.assert.calledOnce(update);
        });
        it('schedules next tick with new timestamp', async () => {
            const update = sinon_1.stub(liveList, 'update').resolves();
            liveList.running = true;
            await liveList.tick();
            clock.tick(2000);
            sinon_1.assert.calledTwice(update);
        });
        it('stop() prevents further ticks', async () => {
            const update = sinon_1.stub(liveList, 'update').resolves();
            liveList.running = true;
            await liveList.tick();
            liveList.stop();
            clock.tick(2000);
            sinon_1.assert.calledOnce(update);
        });
    });
    describe('update()', () => {
        function createQuery(items) {
            return {
                cursor() {
                    return {
                        on(event, callback) {
                            if (event === 'data') {
                                items.forEach(callback);
                            }
                            else if (event === 'end') {
                                callback();
                            }
                            return this;
                        }
                    };
                }
            };
        }
        function setupFind(items) {
            model.find.returns({ lean: sinon_1.stub().returns(createQuery(items)) });
        }
        it('queried database with current timestamp', async () => {
            const timestamp = new Date(12345);
            liveList.timestamp = timestamp;
            setupFind([]);
            await liveList.update();
            sinon_1.assert.calledWithMatch(model.find, { updatedAt: { $gt: timestamp } }, 'foo bar');
        });
        it('adds new item', async () => {
            const item = { _id: 'foo' };
            setupFind([item]);
            await liveList.update();
            chai_1.expect(liveList.items).contain(item);
        });
        it('calls onAddedOrUpdated event handler', async () => {
            const onAddedOrUpdated = sinon_1.stub();
            config.onAddedOrUpdated = onAddedOrUpdated;
            setupFind([{ _id: 'foo' }]);
            await liveList.update();
            sinon_1.assert.calledOnce(onAddedOrUpdated);
        });
        it('does not call onAddedOrUpdated event handler if did not fetch any items', async () => {
            const onAddedOrUpdated = sinon_1.stub();
            config.onAddedOrUpdated = onAddedOrUpdated;
            setupFind([]);
            await liveList.update();
            sinon_1.assert.notCalled(onAddedOrUpdated);
        });
        it('calls onAdd event when adding', () => {
            const item = { _id: 'foo' };
            const onAdd = sinon_1.stub();
            config.onAdd = onAdd;
            setupFind([item]);
            liveList.update();
            sinon_1.assert.calledWith(onAdd, item);
        });
        it('updates existing item', () => {
            const item = { _id: 'foo', value: 1 };
            liveList.add(item);
            setupFind([{ _id: 'foo', value: 2 }]);
            liveList.update();
            chai_1.expect(item.value).equal(2);
        });
        it('fixes documents before updating', () => {
            const item = { _id: 'foo', value: 1 };
            config.fix = item => item.field = 'bar';
            liveList.add(item);
            setupFind([{ _id: 'foo', value: 2 }]);
            liveList.update();
            chai_1.expect(item).eql({ _id: 'foo', value: 2, field: 'bar' });
        });
        it('triggers listeners updates existing item', () => {
            const trigger = sinon_1.stub(liveList, 'trigger');
            const item = { _id: 'foo', value: 1 };
            liveList.add(item);
            setupFind([{ _id: 'foo', value: 2 }]);
            liveList.update();
            sinon_1.assert.calledWith(trigger, 'foo', item);
        });
        it('calls onUpdate event when updating', () => {
            const item = { _id: 'foo', value: 1 };
            const update = { _id: 'foo', value: 2 };
            const onUpdate = sinon_1.stub();
            config.onUpdate = onUpdate;
            liveList.add(item);
            setupFind([update]);
            liveList.update();
            sinon_1.assert.calledWith(onUpdate, item, update);
        });
        it('sets loaded to true ', async () => {
            setupFind([]);
            await liveList.update();
            chai_1.expect(liveList.loaded).true;
        });
        it('calls onFinished event handler', async () => {
            const onFinished = sinon_1.stub();
            config.onFinished = onFinished;
            setupFind([]);
            await liveList.update();
            sinon_1.assert.calledOnce(onFinished);
        });
        it('calls onFinished event handler only on first finish', async () => {
            const onFinished = sinon_1.stub();
            config.onFinished = onFinished;
            setupFind([]);
            await liveList.update();
            await liveList.update();
            sinon_1.assert.calledOnce(onFinished);
        });
    });
});
//# sourceMappingURL=liveList.spec.js.map