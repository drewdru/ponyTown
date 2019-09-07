import { Model } from 'mongoose';
import { removeItem, maxDate } from '../../common/utils';
import { logger as defaultLogger } from '../logger';
import { Document } from '../../common/adminInterfaces';
import { iterate } from '../db';

const tickInterval = 1000;

type Listener = (id: string, item: any) => void;

export interface LiveListConfig<T> {
	fields: (keyof T)[];
	noStore?: boolean;
	ignore?: (item: T) => boolean;
	clean: (item: T) => Partial<T>; // clean before sending to client
	fix?: (item: T) => void; // fix after getting from DB
	onSubscribeToMissing?: (id: string) => T;
	// events
	onAdd?: (item: T) => void;
	onUpdate?: (oldItem: T, newItem: T) => void;
	onDelete?: (item: T) => void;
	onFinished?: () => void;
	onAddedOrUpdated?: () => void;
}

function fixDocumentId<T extends Document>(item: T) {
	item._id = item._id.toString();
	return item;
}

export class LiveList<T extends Document> {
	items: T[] = [];
	private itemsMap = new Map<string, T>();
	private listeners = new Map<string, Listener[]>();
	private timestamp = new Date(0);
	private finished = false;
	private running = false;
	private timeout: any;
	private fieldsString: string;
	constructor(
		private model: Model<any>,
		private config: LiveListConfig<T>,
		private getId = (item: T) => item._id,
		private logger = defaultLogger,
	) {
		this.fieldsString = config.fields.join(' ');
	}
	get loaded() {
		return this.finished;
	}
	start() {
		if (this.config.noStore) {
			this.timestamp = new Date();
		}

		this.running = true;
		this.tick();
	}
	stop() {
		this.running = false;
		clearTimeout(this.timeout);
	}
	get(id: string) {
		return this.itemsMap.get(id);
	}
	for(id: string | undefined, callback: (item: T) => void) {
		const item = id ? this.get(id) : undefined;
		item && callback(item);
	}
	add(item: T) {
		const id = this.getId(item);
		this.items.push(item);
		this.itemsMap.set(id, item);

		if (this.config.onAdd) {
			this.config.onAdd(item);
		}

		this.trigger(id, item);
		return item;
	}
	// NOTE: only _id
	async remove(id: string) {
		await this.model.deleteOne({ _id: id }).exec();
		this.removed(id);
	}
	removed(id: string) {
		const item = this.get(id);

		if (item) {
			this.trigger(id, undefined);
			this.itemsMap.delete(id);
			removeItem(this.items, item);
			this.config.onDelete && this.config.onDelete(item);
		}
	}
	discard(id: string) {
		const item = this.get(id);

		if (item) {
			this.itemsMap.delete(id);
			removeItem(this.items, item);
		}
	}
	trigger(id: string, item: T | undefined) {
		const listeners = this.listeners.get(id);

		if (listeners) {
			const cleaned = item ? this.config.clean(item) : item;
			listeners.forEach(listener => listener(id, cleaned as any));
		}
	}
	subscribe(id: string, listener: Listener) {
		const listeners = this.listeners.get(id) || [];
		listeners.push(listener);
		this.listeners.set(id, listeners);

		const item = this.get(id);

		if (item) {
			listener(id, this.config.clean(item));
		} else if (this.config.onSubscribeToMissing) {
			this.add(this.config.onSubscribeToMissing(id));
		}

		return {
			unsubscribe: () => {
				const listeners = this.listeners.get(id) || [];
				removeItem(listeners, listener);

				if (listeners.length === 0) {
					this.listeners.delete(id);
				}
			}
		};
	}
	hasSubscriptions(id: string) {
		return !!this.listeners.get(id);
	}
	async tick() {
		if (this.running) {
			clearTimeout(this.timeout);

			try {
				await this.update();
			} catch (e) {
				this.logger.error(e);
			} finally {
				this.timeout = setTimeout(() => this.tick(), tickInterval);
			}
		}
	}
	async fetch(search: any) {
		await this.internalUpdate(search, true);
	}
	async update() {
		await this.internalUpdate({ updatedAt: { $gt: this.timestamp } }, false);
	}
	private async internalUpdate(search: any, fetching: boolean) {
		const query = this.model.find(search, this.fieldsString);
		const applyUpdate = this.config.onUpdate || Object.assign;
		let addedOrUpdated = false;

		await iterate(query.lean(), update => {
			try {
				fixDocumentId(update);

				if (this.config.fix) {
					this.config.fix(update);
				}

				if (!fetching) {
					this.timestamp = maxDate(this.timestamp, update.updatedAt)!;
				}

				const doc = this.get(this.getId(update));

				if (doc !== undefined) {
					applyUpdate(doc, update);
					this.trigger(this.getId(doc), doc);
				} else if (fetching || !(this.config.ignore && this.config.ignore(update))) {
					this.add(update);
				}

				addedOrUpdated = true;
			} catch (e) {
				console.error(e);
			}
		});

		if (addedOrUpdated && this.config.onAddedOrUpdated) {
			this.config.onAddedOrUpdated();
		}

		if (!this.finished) {
			this.finished = true;
			this.config.onFinished && this.config.onFinished();
		}
	}
}
