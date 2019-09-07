import '../lib';
import { Model } from 'mongoose';
import { expect } from 'chai';
import { stub, match, assert, useFakeTimers, SinonFakeTimers, SinonStub } from 'sinon';
import { LiveEndPoint, createLiveEndPoint } from '../../server/liveEndPoint';
import { Doc } from '../../server/db';
import { ITEM_LIMIT } from '../../common/adminInterfaces';
import { MINUTE } from '../../common/constants';
import { times } from '../../common/utils';

interface Thing extends Doc {
	name: string;
	desc: string;
}

describe('liveEndPoint', () => {
	let clock: SinonFakeTimers;
	let model: Model<Thing>;
	let encode: SinonStub;
	let beforeDelete: SinonStub;
	let afterDelete: SinonStub;
	let afterAssign: SinonStub;
	let liveEndPoint: LiveEndPoint;

	function stubFind(items: any) {
		return stub(model, 'find').returns({
			sort: stub().withArgs(match({ updatedAt: 1 })).returns({
				limit: stub().withArgs(ITEM_LIMIT + 1).returns({
					lean: stub().returns({
						exec: () => Promise.resolve(items)
					})
				})
			})
		} as any);
	}

	beforeEach(() => {
		clock = useFakeTimers();
		model = {
			findByIdAndUpdate() { },
			findById() { },
			find() { },
		} as any;
		encode = stub();
		beforeDelete = stub();
		afterDelete = stub();
		afterAssign = stub();
		liveEndPoint = createLiveEndPoint({
			model, fields: ['_id', 'name', 'desc'], encode, beforeDelete, afterDelete, afterAssign
		});
	});

	afterEach(() => {
		clock.restore();
		liveEndPoint.destroy();
	});

	it('clears removed items after 10 minutes', () => {
		const item = { _id: 'foo', remove: stub() };
		(stub(model, 'findById') as any).withArgs('foo').returns({ exec: () => Promise.resolve(item) });
		clock.setSystemTime(10000);
		stubFind([]);

		return liveEndPoint.removeItem('foo')
			.then(() => clock.tick(1 * MINUTE + 100))
			.then(() => liveEndPoint.getAll())
			.then(result => expect(result.deletes).eql(['foo']));
	});

	describe('get()', () => {
		it('finds item by id', () => {
			const item = {};
			(stub(model, 'findById') as any).withArgs('foo').returns({
				lean: stub().returns({
					exec: stub().resolves(item)
				})
			});

			return liveEndPoint.get('foo')
				.then(result => expect(result).equal(item));
		});
	});

	describe('getAll()', () => {
		it('returns encoded items', () => {
			stubFind([{ _id: 'aaa' }, { _id: 'bbb' }]);
			encode.returns('encoded');

			return liveEndPoint.getAll()
				.then(result => expect(result).eql({
					base: {},
					deletes: [],
					updates: 'encoded',
					more: false,
				}));
		});

		it('passes 0 timestamp to find method by default', () => {
			const find = stubFind([{ _id: 'aaa' }, { _id: 'bbb' }]);

			return liveEndPoint.getAll()
				.then(() => assert.calledWithMatch(find, { updatedAt: { $gt: new Date(0) } }, '_id name desc'));
		});

		it('passes given timestamp to find method', () => {
			const timestamp = '2017-09-09T16:39:54.199Z';
			const find = stubFind([{ _id: 'aaa' }, { _id: 'bbb' }]);

			return liveEndPoint.getAll(timestamp)
				.then(() => assert.calledWithMatch(find, { updatedAt: { $gt: new Date(timestamp) } }, '_id name desc'));
		});

		describe('if items exceed limit', () => {
			describe('if last 2 items have different updatedAt', () => {
				beforeEach(() => {
					const items = times(ITEM_LIMIT + 1, i => ({ _id: `foo_${i}`, updatedAt: new Date(i) }));
					stubFind(items);
				});

				it('removes last item', () => {
					return liveEndPoint.getAll()
						.then(() => expect(encode.args[0][0].length).equal(ITEM_LIMIT));
				});

				it('returns more flag', () => {
					return liveEndPoint.getAll()
						.then(({ more }) => expect(more).true);
				});
			});

			describe('if last 2 items have the same updatedAt', () => {
				let items: any[];
				let restItems: any[];
				let find: SinonStub<any>;

				beforeEach(() => {
					items = times(ITEM_LIMIT, i => ({ _id: `foo_${i}`, updatedAt: new Date(i) }));
					items.push({ _id: 'bar', updatedAt: items[items.length - 1].updatedAt });
					restItems = [{ _id: 'bar1' }, { _id: 'bar2' }];
					find = stubFind(items).onSecondCall().returns({
						lean: stub().returns({
							exec: stub().resolves(restItems)
						})
					} as any);
				});

				it('fetches additional items if last items have the same date', () => {
					return liveEndPoint.getAll()
						.then(() => expect(encode.args[0][0].length).equal(ITEM_LIMIT + 1 + 2));
				});

				it('filters out duplicate items', () => {
					restItems.push(items[items.length - 1]);

					return liveEndPoint.getAll()
						.then(() => expect(encode.args[0][0].length).equal(ITEM_LIMIT + 1 + 2));
				});

				it('fetches more items using timestamp of last element', () => {
					const timestamp = items[items.length - 1].updatedAt;

					return liveEndPoint.getAll()
						.then(() => assert.calledWithMatch(find, { updatedAt: timestamp }, '_id name desc'));
				});

				it('returns more flag', () => {
					return liveEndPoint.getAll()
						.then(({ more }) => expect(more).true);
				});
			});
		});
	});

	describe('removeItem()', () => {
		describe('if item exists', () => {
			let item: { _id: string; remove: SinonStub; };

			beforeEach(() => {
				item = { _id: 'foo', remove: stub() };
				(stub(model, 'findById') as any).withArgs('foo').returns({ exec: stub().resolves(item) });
			});

			it('removes item', () => {
				return liveEndPoint.removeItem('foo')
					.then(() => assert.calledOnce(item.remove));
			});

			it('calls beforeDelete hook', () => {
				return liveEndPoint.removeItem('foo')
					.then(() => assert.calledWith(beforeDelete, item));
			});

			it('calls afterDelete hook', () => {
				return liveEndPoint.removeItem('foo')
					.then(() => assert.calledWith(afterDelete, item));
			});

			it('adds item ID to removed items', () => {
				clock.setSystemTime(10000);
				stubFind([]);

				return liveEndPoint.removeItem('foo')
					.then(() => liveEndPoint.getAll())
					.then(result => expect(result.deletes).eql(['foo']));
			});
		});

		describe('if item does not exist', () => {
			let item: { remove: SinonStub };

			beforeEach(() => {
				item = { remove: stub() };
				(stub(model, 'findById') as any).withArgs('bar').returns({ exec: stub().resolves(null as any) });
			});

			it('does nothing if item does not exist', () => {
				return liveEndPoint.removeItem('bar')
					.then(() => assert.notCalled(item.remove));
			});

			it('does not call onDelete hook', () => {
				return liveEndPoint.removeItem('bar')
					.then(() => assert.notCalled(beforeDelete));
			});

			it('does not call hook', () => {
				return liveEndPoint.removeItem('bar')
					.then(() => assert.notCalled(afterDelete));
			});
		});
	});

	describe('assignAccount()', () => {
		const item = { account: 'origacc' };

		beforeEach(() => {
			(stub(model, 'findById') as any).withArgs('foo', 'account')
				.returns({ lean: stub().returns({ exec: stub().resolves(item) }) });
		});

		it('assigns account to item', () => {
			const exec = stub();
			const findByIdAndUpdate = stub(model, 'findByIdAndUpdate').returns({ exec } as any);

			return liveEndPoint.assignAccount('foo', 'bar')
				.then(() => {
					assert.calledWithMatch(findByIdAndUpdate as any, 'foo', { account: 'bar' });
					assert.calledOnce(exec);
				});
		});

		it('calls afterAssign hook', () => {
			stub(model, 'findByIdAndUpdate').returns({ exec: stub() } as any);

			return liveEndPoint.assignAccount('foo', 'bar')
				.then(() => assert.calledWith(afterAssign, 'origacc', 'bar'));
		});
	});
});
