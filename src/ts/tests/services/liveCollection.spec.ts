import '../lib';
import { SocketService } from 'ag-sockets';
import { expect } from 'chai';
import { stub, assert, SinonFakeTimers, useFakeTimers, SinonStub } from 'sinon';
import { LiveCollection, Options } from '../../components/services/liveCollection';
import { ClientAdminActions } from '../../client/clientAdminActions';
import { IAdminServerActions, LiveResponse } from '../../common/adminInterfaces';

interface Thing {
	_id: string;
	name: string;
	updatedAt: Date;
	deleted?: boolean;
}

describe('LiveCollection', () => {
	let socket: SocketService<ClientAdminActions, IAdminServerActions>;
	let collection: LiveCollection<Thing>;
	let clock: SinonFakeTimers;
	let options: Options<Thing>;
	let logError: SinonStub;

	beforeEach(() => {
		socket = {
			server: {
				getAll() { },
				removeItem() { },
				assignAccount() { },
			},
		} as any;

		options = {
			decode: x => ({ _id: x[0], name: x[1], updatedAt: new Date(x[2]) }),
		};

		logError = stub();
		collection = new LiveCollection<Thing>('events', 2000, i => i._id, options, socket, '2010-01-01T10:00:00.000Z', logError);
		clock = useFakeTimers();
	});

	afterEach(() => {
		clock.restore();
	});

	after(() => {
		socket = undefined as any;
		collection = undefined as any;
		clock = undefined as any;
		options = undefined as any;
		logError = undefined as any;
	});

	describe('.push()', () => {
		it('adds item to collection', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };

			collection.push(item);

			expect(collection.items).contain(item);
			expect(collection.get('foo')).equal(item);
		});
	});

	describe('.remove()', () => {
		it('sends remove request to server', () => {
			const removeItem = stub(socket.server, 'removeItem').returns(Promise.resolve());

			return collection.remove('foo')
				.then(() => assert.calledWith(removeItem, 'events', 'foo'));
		});

		it('removes item from list', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			stub(socket.server, 'removeItem').returns(Promise.resolve());
			options.deleteItems = true;
			collection.push(item);

			return collection.remove('foo')
				.then(() => {
					expect(collection.items).not.contain(item);
					expect(collection.get('foo')).undefined;
				});
		});
	});

	describe('.removeItem()', () => {
		it('does not send remove request to server', () => {
			const removeItem = stub(socket.server, 'removeItem').returns(Promise.resolve());

			collection.removeItem('foo');

			assert.notCalled(removeItem);
		});

		it('removes item from list', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			options.deleteItems = true;
			collection.push(item);

			collection.removeItem('foo');

			expect(collection.items).not.contain(item);
			expect(collection.get('foo')).undefined;
		});

		it('does not remove item is deleteItems flag is set to false', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			options.deleteItems = false;
			collection.push(item);

			collection.removeItem('foo', true);

			expect(collection.items).contain(item);
			expect(item.deleted).true;
		});

		it('does nothing deleteItems flag is set to false and deleted flag is false', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			options.deleteItems = false;
			collection.push(item);

			collection.removeItem('foo');

			expect(collection.items).contain(item);
			expect(item.deleted).not.true;
		});
	});

	describe('.assignAccount()', () => {
		it('send assign account request to server', () => {
			const assignAccount = stub(socket.server, 'assignAccount').returns(Promise.resolve());

			return collection.assignAccount('foo', 'bar')
				.then(() => assert.calledWith(assignAccount, 'events', 'foo', 'bar'));
		});
	});

	describe('.live()', () => {
		it('returns promise if running', () => {
			return collection.live();
		});

		it('schedules next update', () => {
			return collection.live()
				.then(() => {
					const live = stub(collection, 'live');
					clock.tick(2100);
					assert.calledOnce(live);
				});
		});

		it('schedules next update fast if more flag is true', () => {
			stub(socket.server, 'getAll').resolves({} as any);
			stub(collection, 'read').returns(true);
			socket.isConnected = true;

			return collection.live()
				.then(() => {
					const live = stub(collection, 'live');
					clock.tick(200);
					assert.calledOnce(live);
				});
		});

		it('polls server for updates if connected', () => {
			const data = {};
			stub(socket.server, 'getAll').withArgs('events', '2010-01-01T10:00:00.000Z').resolves(data as any);
			const read = stub(collection, 'read');
			socket.isConnected = true;

			return collection.live()
				.then(() => assert.calledWith(read, data as any));
		});

		it('does not poll the server if not connected', () => {
			const getAll = stub(socket.server, 'getAll');
			stub(collection, 'read');
			socket.isConnected = false;

			return collection.live()
				.then(() => assert.notCalled(getAll));
		});

		it('does not poll the server if stopped', async () => {
			const getAll = stub(socket.server, 'getAll');
			stub(collection, 'read');
			socket.isConnected = true;

			collection.stop();

			await collection.live();
			assert.notCalled(getAll);
		});

		it('does not reject for server error', async () => {
			stub(socket.server, 'getAll').rejects(new Error('test'));
			socket.isConnected = true;

			await collection.live();
		});
	});

	describe('.read()', () => {
		const base: LiveResponse = {
			updates: [],
			deletes: [],
			base: {},
			more: false,
		};

		it('returns more flag', () => {
			expect(collection.read({ ...base, more: false })).false;
			expect(collection.read({ ...base, more: true })).true;
		});

		it('updates timestamp', async () => {
			const getAll = stub(socket.server, 'getAll').resolves({} as any);
			socket.isConnected = true;

			collection.read({
				...base,
				updates: [
					['bar', 'Bar', '2010-01-03T10:00:00.000Z'],
					['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
				],
			});

			stub(collection, 'read');
			await collection.live();
			assert.calledWith(getAll, 'events', '2010-01-03T10:00:00.000Z');
		});

		it('does not update timestamp if not live fetch', async () => {
			const getAll = stub(socket.server, 'getAll').resolves({} as any);
			socket.isConnected = true;

			collection.read({
				...base,
				updates: [
					['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
				],
			}, false);

			stub(collection, 'read');
			await collection.live();
			assert.calledWith(getAll, 'events', '2010-01-01T10:00:00.000Z');
		});

		it('adds new items', () => {
			collection.read({
				...base,
				updates: [
					['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
				],
			});

			expect(collection.items[0]).eql({
				_id: 'foo',
				name: 'Foo',
				updatedAt: new Date('2010-01-02T10:00:00.000Z'),
			});
		});

		it('does not add new items if ignored', () => {
			options.ignore = () => true;

			collection.read({
				...base,
				updates: [
					['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
				],
			});

			expect(collection.items).empty;
		});

		it('adds items anyway if ignored but not live fetch', () => {
			options.ignore = () => true;

			collection.read({
				...base,
				updates: [
					['foo', 'Foo', '2010-01-02T10:00:00.000Z'],
				],
			}, false);

			expect(collection.items[0]).eql({
				_id: 'foo',
				name: 'Foo',
				updatedAt: new Date('2010-01-02T10:00:00.000Z'),
			});
		});

		it('updates existing items', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			collection.push(item);

			collection.read({
				...base,
				updates: [
					['foo', 'Bar', '2010-01-03T10:00:00.000Z'],
				],
			});

			expect(item).eql({
				_id: 'foo',
				name: 'Bar',
				updatedAt: new Date('2010-01-03T10:00:00.000Z'),
			});
		});

		it('removes deleted items', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			options.deleteItems = true;
			collection.push(item);

			collection.read({
				...base,
				deletes: ['foo'],
			});

			expect(collection.items).not.contain(item);
		});

		it('sets deleted flag on items if deleteItems is false', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			options.deleteItems = false;
			collection.push(item);

			collection.read({
				...base,
				deletes: ['foo'],
			});

			expect(collection.items).contain(item);
			expect(item.deleted).true;
		});

		it('calls beforeUpdate hook with items', () => {
			const beforeUpdate = stub();
			options.beforeUpdate = beforeUpdate;

			collection.read({
				...base,
				updates: [
					['foo', 'Foo', '2010-01-03T10:00:00.000Z'],
				],
			});

			assert.calledWithMatch(beforeUpdate, [
				{ _id: 'foo', name: 'Foo', updatedAt: new Date('2010-01-03T10:00:00.000Z') },
			]);
		});

		it('calls onUpdated hook with added and all items', () => {
			const onUpdated = stub();
			options.onUpdated = onUpdated;
			collection.push({ _id: 'foo', name: 'Foo', updatedAt: new Date() });

			collection.read({
				...base,
				updates: [
					['bar', 'Bar', '2010-01-04T10:00:00.000Z'],
					['foo', 'Foo2', '2010-01-03T10:00:00.000Z'],
				],
			});

			expect(onUpdated.args[0][0]).eql([
				{ _id: 'bar', name: 'Bar', updatedAt: new Date('2010-01-04T10:00:00.000Z') },
			], 'added');

			expect(onUpdated.args[0][1]).eql([
				{ _id: 'bar', name: 'Bar', updatedAt: new Date('2010-01-04T10:00:00.000Z') },
				{ _id: 'foo', name: 'Foo2', updatedAt: new Date('2010-01-03T10:00:00.000Z') },
			], 'all');
		});

		it('does not call onUpdated hook for no items', () => {
			const onUpdated = stub();
			options.onUpdated = onUpdated;

			collection.read({
				...base,
				updates: [],
			});

			assert.notCalled(onUpdated);
		});

		it('calls onDelete hook for deleted items', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			const onDelete = stub();
			options.onDelete = onDelete;
			collection.push(item);

			collection.read({
				...base,
				deletes: ['foo'],
			});

			assert.calledWith(onDelete, item);
		});

		it('calls onFinished hook when more flag is false', () => {
			const onFinished = stub();
			options.onFinished = onFinished;

			collection.read({ ...base, more: false });

			assert.calledOnce(onFinished);
		});

		it('calls onFinished hook only once', () => {
			const onFinished = stub();
			options.onFinished = onFinished;

			collection.read({ ...base, more: false });
			collection.read({ ...base, more: false });

			assert.calledOnce(onFinished);
		});

		it('does not call onFinished hook for non live fetch calls', () => {
			const onFinished = stub();
			options.onFinished = onFinished;

			collection.read({ ...base, more: false }, false);

			assert.notCalled(onFinished);
		});

		it('calls onUpdate hook for updated items', () => {
			const item: Thing = { _id: 'foo', name: 'Foo', updatedAt: new Date() };
			const onUpdate = stub();
			options.onUpdate = onUpdate;
			collection.push(item);

			collection.read({
				...base,
				updates: [
					['foo', 'Foo2', '2010-01-03T10:00:00.000Z'],
				],
			});

			assert.calledWith(onUpdate, item);
		});

		it('does not call onUpdate hook for added items', () => {
			const onUpdate = stub();
			options.onUpdate = onUpdate;

			collection.read({
				...base,
				updates: [
					['foo', 'Foo2', '2010-01-03T10:00:00.000Z'],
				],
			});

			assert.notCalled(onUpdate);
		});
	});
});
