import * as Promise from 'bluebird';
import { Model } from 'mongoose';
import { remove, noop } from 'lodash';
import { ITEM_LIMIT, LiveResponse, BaseValues } from '../common/adminInterfaces';
import { MINUTE } from '../common/constants';
import { fromNow } from '../common/utils';
import { Doc } from './db';
import { logger } from './logger';

export interface LiveEndPoint {
	get(id: string): Promise<any>;
	getAll(timestamp?: string): Promise<LiveResponse>;
	assignAccount(id: string, account: string): Promise<void>;
	removeItem(id: string): Promise<void>;
	removedItem(id: string): void;
	encodeItems(items: any[], timestamp: Date, more: boolean): LiveResponse;
	destroy(): void;
}

interface DeletedId {
	updatedAt: Date;
	id: string;
}

interface LiveEndPointConfig<T extends Doc> {
	model: Model<T>;
	fields: string[];
	fix?: boolean;
	encode: (items: T[], base: BaseValues) => any[][];
	beforeDelete?: (item: T) => any;
	afterDelete?: (item: T) => any;
	beforeAssign?: (item: T, accountId: string) => any;
	afterAssign?: (from: string, to: string) => any;
}

export function createLiveEndPoint<T extends Doc>(
	{ model, fields, encode, beforeDelete, afterDelete, beforeAssign, afterAssign, fix = false }: LiveEndPointConfig<T>
): LiveEndPoint {
	const removedItems: DeletedId[] = [];
	let fixing = false;

	function removedItem(id: string) {
		removedItems.push({ id, updatedAt: new Date() });
	}

	function removeItem(id: string) {
		return Promise.resolve(model.findById(id).exec())
			.tap(item => item && beforeDelete && beforeDelete(item))
			.tap(item => {
				if (item) {
					removedItem(item._id.toString());
					return item.remove() as any;
				}
			})
			.tap(item => item && afterDelete && afterDelete(item))
			.then(noop);
	}

	function assignAccount(id: string, account: string) {
		return Promise.resolve()
			.then(() => model.findById(id, 'account').lean().exec())
			.tap((item: any) => item && beforeAssign && beforeAssign(item, account))
			.tap(() => model.findByIdAndUpdate(id, { account }).exec())
			.tap((item: any) => item && afterAssign && afterAssign(item.account, account))
			.then(noop);
	}

	function encodeItems(items: T[], timestamp: Date, more: boolean): LiveResponse {
		const base: BaseValues = {};
		const updates = encode(items, base);
		const deletes = removedItems
			.filter(x => x.updatedAt.getTime() > timestamp.getTime())
			.map(x => x.id);

		return { updates, deletes, base, more };
	}

	function findItems(from: Date): Promise<T[]> {
		return Promise.resolve(model.find({ updatedAt: { $gt: from } }, fields.join(' '))
			// .sort([['updatedAt', 1], ['id', 1]])
			.sort({ updatedAt: 1 })
			.limit(ITEM_LIMIT + 1)
			.lean()
			.exec());
	}

	function findItemsExact(date: Date): Promise<T[]> {
		return Promise.resolve(model.find({ updatedAt: date }, fields.join(' '))
			.lean()
			.exec());
	}

	function hasItem(items: T[], id: string) {
		return items.some(i => i._id === id);
	}

	function addTailItems(items: T[]): Promise<{ items: T[]; more: boolean; }> {
		if (items.length <= ITEM_LIMIT) {
			return Promise.resolve({ items, more: false });
		}

		const a = items[items.length - 1];
		const b = items[items.length - 2];

		if (a.updatedAt.getTime() !== b.updatedAt.getTime()) {
			items.pop();
			return Promise.resolve({ items, more: true });
		}

		return findItemsExact(items[items.length - 1].updatedAt)
			.then(other => other.filter(i => !hasItem(items, i._id)))
			.then(other => [...items, ...other])
			.then(items => ({ items, more: true }));
	}

	function getAll(timestamp?: string): Promise<LiveResponse> {
		const from = timestamp ? new Date(timestamp) : new Date(0);

		return findItems(from)
			.then(addTailItems)
			.tap(({ items }) => {
				try {
					if (items.length > ITEM_LIMIT * 2) {
						fixItems(items);
						logger.warn(`Fetching ${items.length} ${model.modelName}s [${items[ITEM_LIMIT + 1].updatedAt.toISOString()}]`);
					}
				} catch (e) {
					logger.error(e);
				}
			})
			.then(({ items, more }) => encodeItems(items, from, more));
	}

	function fixItems(items: T[]) {
		if (fixing || !fix)
			return;

		fixing = true;
		logger.info(`Fixing ${model.modelName}s`);

		Promise.map(items, item => model.updateOne({ _id: item._id }, { unused: Date.now() % 1000 }).exec(), { concurrency: 1 })
			.then(() => logger.info(`Fixed ${model.modelName}s`))
			.catch(e => logger.error(e))
			.finally(() => fixing = false)
			.done();
	}

	function get(id: string) {
		return Promise.resolve(model.findById(id).lean().exec());
	}

	const interval = setInterval(() => {
		const date = fromNow(-10 * MINUTE);
		remove(removedItems, x => x.updatedAt.getTime() < date.getTime());
	}, 1 * MINUTE);

	function destroy() {
		clearInterval(interval);
	}

	return {
		get,
		getAll,
		assignAccount,
		removeItem,
		removedItem,
		encodeItems,
		destroy,
	};
}
