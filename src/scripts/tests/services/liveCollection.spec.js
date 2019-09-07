"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const liveCollection_1 = require("../../components/services/liveCollection");
describe('LiveCollection', () => {
    let socket;
    let collection;
    let clock;
    let options;
    let logError;
    beforeEach(() => {
        socket = {
            server: {
                getAll() { },
                removeItem() { },
                assignAccount() { },
            },
        };
        options = {
            decode: x => ({ _id: x[0], name: x[1], updatedAt: new Date(x[2]) }),
        };
        logError = sinon_1.stub();
        collection = new liveCollection_1.LiveCollection('events', 2000, i => i._id, options, socket, '2010-01-01T10:00:00.000Z', logError);
        clock = sinon_1.useFakeTimers();
    });
    afterEach(() => {
        clock.restore();
    });
    after(() => {
        socket = undefined;
        collection = undefined;
        clock = undefined;
        options = undefined;
        logError = undefined;
    });
    describe('.push()', () => {
        it('adds item to collection', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            collection.push(item);
            chai_1.expect(collection.items).contain(item);
            chai_1.expect(collection.get('foo')).equal(item);
        });
    });
    describe('.remove()', () => {
        it('sends remove request to server', () => {
            const removeItem = sinon_1.stub(socket.server, 'removeItem').returns(Promise.resolve());
            return collection.remove('foo')
                .then(() => sinon_1.assert.calledWith(removeItem, 'events', 'foo'));
        });
        it('removes item from list', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            sinon_1.stub(socket.server, 'removeItem').returns(Promise.resolve());
            options.deleteItems = true;
            collection.push(item);
            return collection.remove('foo')
                .then(() => {
                chai_1.expect(collection.items).not.contain(item);
                chai_1.expect(collection.get('foo')).undefined;
            });
        });
    });
    describe('.removeItem()', () => {
        it('does not send remove request to server', () => {
            const removeItem = sinon_1.stub(socket.server, 'removeItem').returns(Promise.resolve());
            collection.removeItem('foo');
            sinon_1.assert.notCalled(removeItem);
        });
        it('removes item from list', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            options.deleteItems = true;
            collection.push(item);
            collection.removeItem('foo');
            chai_1.expect(collection.items).not.contain(item);
            chai_1.expect(collection.get('foo')).undefined;
        });
        it('does not remove item is deleteItems flag is set to false', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            options.deleteItems = false;
            collection.push(item);
            collection.removeItem('foo', true);
            chai_1.expect(collection.items).contain(item);
            chai_1.expect(item.deleted).true;
        });
        it('does nothing deleteItems flag is set to false and deleted flag is false', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            options.deleteItems = false;
            collection.push(item);
            collection.removeItem('foo');
            chai_1.expect(collection.items).contain(item);
            chai_1.expect(item.deleted).not.true;
        });
    });
    describe('.assignAccount()', () => {
        it('send assign account request to server', () => {
            const assignAccount = sinon_1.stub(socket.server, 'assignAccount').returns(Promise.resolve());
            return collection.assignAccount('foo', 'bar')
                .then(() => sinon_1.assert.calledWith(assignAccount, 'events', 'foo', 'bar'));
        });
    });
    describe('.live()', () => {
        it('returns promise if running', () => {
            return collection.live();
        });
        it('schedules next update', () => {
            return collection.live()
                .then(() => {
                const live = sinon_1.stub(collection, 'live');
                clock.tick(2100);
                sinon_1.assert.calledOnce(live);
            });
        });
        it('schedules next update fast if more flag is true', () => {
            sinon_1.stub(socket.server, 'getAll').resolves({});
            sinon_1.stub(collection, 'read').returns(true);
            socket.isConnected = true;
            return collection.live()
                .then(() => {
                const live = sinon_1.stub(collection, 'live');
                clock.tick(200);
                sinon_1.assert.calledOnce(live);
            });
        });
        it('polls server for updates if connected', () => {
            const data = {};
            sinon_1.stub(socket.server, 'getAll').withArgs('events', '2010-01-01T10:00:00.000Z').resolves(data);
            const read = sinon_1.stub(collection, 'read');
            socket.isConnected = true;
            return collection.live()
                .then(() => sinon_1.assert.calledWith(read, data));
        });
        it('does not poll the server if not connected', () => {
            const getAll = sinon_1.stub(socket.server, 'getAll');
            sinon_1.stub(collection, 'read');
            socket.isConnected = false;
            return collection.live()
                .then(() => sinon_1.assert.notCalled(getAll));
        });
        it('does not poll the server if stopped', async () => {
            const getAll = sinon_1.stub(socket.server, 'getAll');
            sinon_1.stub(collection, 'read');
            socket.isConnected = true;
            collection.stop();
            await collection.live();
            sinon_1.assert.notCalled(getAll);
        });
        it('does not reject for server error', async () => {
            sinon_1.stub(socket.server, 'getAll').rejects(new Error('test'));
            socket.isConnected = true;
            await collection.live();
        });
    });
    describe('.read()', () => {
        const base = {
            updates: [],
            deletes: [],
            base: {},
            more: false,
        };
        it('returns more flag', () => {
            chai_1.expect(collection.read(Object.assign({}, base, { more: false }))).false;
            chai_1.expect(collection.read(Object.assign({}, base, { more: true }))).true;
        });
        it('updates timestamp', async () => {
            const getAll = sinon_1.stub(socket.server, 'getAll').resolves({});
            socket.isConnected = true;
            collection.read(Object.assign({}, base, { updates: [
                    ['bar', 'Bar', '2010-01-03T10:00:00.000Z'],
                    ['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
                ] }));
            sinon_1.stub(collection, 'read');
            await collection.live();
            sinon_1.assert.calledWith(getAll, 'events', '2010-01-03T10:00:00.000Z');
        });
        it('does not update timestamp if not live fetch', async () => {
            const getAll = sinon_1.stub(socket.server, 'getAll').resolves({});
            socket.isConnected = true;
            collection.read(Object.assign({}, base, { updates: [
                    ['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
                ] }), false);
            sinon_1.stub(collection, 'read');
            await collection.live();
            sinon_1.assert.calledWith(getAll, 'events', '2010-01-01T10:00:00.000Z');
        });
        it('adds new items', () => {
            collection.read(Object.assign({}, base, { updates: [
                    ['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
                ] }));
            chai_1.expect(collection.items[0]).eql({
                _id: 'foo',
                name: 'Foo',
                updatedAt: new Date('2010-01-02T10:00:00.000Z'),
            });
        });
        it('does not add new items if ignored', () => {
            options.ignore = () => true;
            collection.read(Object.assign({}, base, { updates: [
                    ['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
                ] }));
            chai_1.expect(collection.items).empty;
        });
        it('adds items anyway if ignored but not live fetch', () => {
            options.ignore = () => true;
            collection.read(Object.assign({}, base, { updates: [
                    ['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
                ] }), false);
            chai_1.expect(collection.items[0]).eql({
                _id: 'foo',
                name: 'Foo',
                updatedAt: new Date('2010-01-02T10:00:00.000Z'),
            });
        });
        it('updates existing items', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            collection.push(item);
            collection.read(Object.assign({}, base, { updates: [
                    ['foo', 'Bar', '2010-01-03T10:00:00.000Z'],
                ] }));
            chai_1.expect(item).eql({
                _id: 'foo',
                name: 'Bar',
                updatedAt: new Date('2010-01-03T10:00:00.000Z'),
            });
        });
        it('removes deleted items', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            options.deleteItems = true;
            collection.push(item);
            collection.read(Object.assign({}, base, { deletes: ['foo'] }));
            chai_1.expect(collection.items).not.contain(item);
        });
        it('sets deleted flag on items if deleteItems is false', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            options.deleteItems = false;
            collection.push(item);
            collection.read(Object.assign({}, base, { deletes: ['foo'] }));
            chai_1.expect(collection.items).contain(item);
            chai_1.expect(item.deleted).true;
        });
        it('calls beforeUpdate hook with items', () => {
            const beforeUpdate = sinon_1.stub();
            options.beforeUpdate = beforeUpdate;
            collection.read(Object.assign({}, base, { updates: [
                    ['foo', 'Foo', '2010-01-03T10:00:00.000Z'],
                ] }));
            sinon_1.assert.calledWithMatch(beforeUpdate, [
                { _id: 'foo', name: 'Foo', updatedAt: new Date('2010-01-03T10:00:00.000Z') },
            ]);
        });
        it('calls onUpdated hook with added and all items', () => {
            const onUpdated = sinon_1.stub();
            options.onUpdated = onUpdated;
            collection.push({ _id: 'foo', name: 'Foo', updatedAt: new Date() });
            collection.read(Object.assign({}, base, { updates: [
                    ['bar', 'Bar', '2010-01-04T10:00:00.000Z'],
                    ['foo', 'Foo2', '2010-01-03T10:00:00.000Z'],
                ] }));
            chai_1.expect(onUpdated.args[0][0]).eql([
                { _id: 'bar', name: 'Bar', updatedAt: new Date('2010-01-04T10:00:00.000Z') },
            ], 'added');
            chai_1.expect(onUpdated.args[0][1]).eql([
                { _id: 'bar', name: 'Bar', updatedAt: new Date('2010-01-04T10:00:00.000Z') },
                { _id: 'foo', name: 'Foo2', updatedAt: new Date('2010-01-03T10:00:00.000Z') },
            ], 'all');
        });
        it('does not call onUpdated hook for no items', () => {
            const onUpdated = sinon_1.stub();
            options.onUpdated = onUpdated;
            collection.read(Object.assign({}, base, { updates: [] }));
            sinon_1.assert.notCalled(onUpdated);
        });
        it('calls onDelete hook for deleted items', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            const onDelete = sinon_1.stub();
            options.onDelete = onDelete;
            collection.push(item);
            collection.read(Object.assign({}, base, { deletes: ['foo'] }));
            sinon_1.assert.calledWith(onDelete, item);
        });
        it('calls onFinished hook when more flag is false', () => {
            const onFinished = sinon_1.stub();
            options.onFinished = onFinished;
            collection.read(Object.assign({}, base, { more: false }));
            sinon_1.assert.calledOnce(onFinished);
        });
        it('calls onFinished hook only once', () => {
            const onFinished = sinon_1.stub();
            options.onFinished = onFinished;
            collection.read(Object.assign({}, base, { more: false }));
            collection.read(Object.assign({}, base, { more: false }));
            sinon_1.assert.calledOnce(onFinished);
        });
        it('does not call onFinished hook for non live fetch calls', () => {
            const onFinished = sinon_1.stub();
            options.onFinished = onFinished;
            collection.read(Object.assign({}, base, { more: false }), false);
            sinon_1.assert.notCalled(onFinished);
        });
        it('calls onUpdate hook for updated items', () => {
            const item = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
            const onUpdate = sinon_1.stub();
            options.onUpdate = onUpdate;
            collection.push(item);
            collection.read(Object.assign({}, base, { updates: [
                    ['foo', 'Foo2', '2010-01-03T10:00:00.000Z'],
                ] }));
            sinon_1.assert.calledWith(onUpdate, item);
        });
        it('does not call onUpdate hook for added items', () => {
            const onUpdate = sinon_1.stub();
            options.onUpdate = onUpdate;
            collection.read(Object.assign({}, base, { updates: [
                    ['foo', 'Foo2', '2010-01-03T10:00:00.000Z'],
                ] }));
            sinon_1.assert.notCalled(onUpdate);
        });
    });
});
//# sourceMappingURL=liveCollection.spec.js.map