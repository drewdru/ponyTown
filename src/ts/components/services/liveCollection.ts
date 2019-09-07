import { SocketService } from 'ag-sockets/dist/browser';
import { removeItem } from '../../common/utils';
import { Document, LiveResponse, IAdminServerActions, BaseValues } from '../../common/adminInterfaces';
import { ClientAdminActions } from '../../client/clientAdminActions';

export interface Options<T> {
	// collection
	beforeUpdate?: (updates: T[]) => void;
	onUpdated?: (added: T[], all: T[]) => void;
	onFinished?: () => void;
	// item
	decode: (fields: any[], base: BaseValues) => T;
	onUpdate?: (oldItem: T, newItem: T) => void;
	onDelete?: (item: T) => void;
	deleteItems?: boolean;
	ignore?: (item: T) => boolean;
}

export class LiveCollection<T extends Document> {
	items: T[] = [];
	finished = false;
	private running = true;
	private itemsMap = new Map<string, T>();
	private liveTimeout: any;
	constructor(
		private name: 'events',
		private rate: number,
		private getKey: (item: T) => string,
		private options: Options<T>,
		private socket: SocketService<ClientAdminActions, IAdminServerActions>,
		private timestamp = (new Date(0)).toISOString(),
		private logError = (e: Error) => console.error(e.stack),
	) {
	}
	get(key: string) {
		return this.itemsMap.get(key);
	}
	push(item: T) {
		this.items.push(item);
		this.itemsMap.set(this.getKey(item), item);
		return item;
	}
	remove(key: string) {
		return this.server.removeItem(this.name, key)
			.then(() => this.removeItem(key, true, true));
	}
	removeItem(key: string, deleted = false, removeFromList = false) {
		const item = this.itemsMap.get(key);

		if (item) {
			if (removeFromList || this.options.deleteItems) {
				removeItem(this.items, item);
				this.itemsMap.delete(key);
			} else if (deleted) {
				item.deleted = true;
			}

			if (deleted && this.options.onDelete) {
				this.options.onDelete(item);
			}
		}
	}
	assignAccount(id: string, account: string) {
		return this.server.assignAccount(this.name, id, account);
	}
	live(): Promise<void> {
		if (!this.running)
			return Promise.resolve();

		clearTimeout(this.liveTimeout);

		return this.update()
			.catch(this.logError)
			.then(more => {
				this.liveTimeout = setTimeout(() => this.live(), more ? 100 : this.rate);
			});
	}
	stop() {
		this.running = false;
	}
	read({ updates, deletes, base, more }: LiveResponse, liveFetch = true) {
		const items = updates.map(i => this.options.decode(i, base));

		if (liveFetch) {
			const timestamp = items
				.reduce((max, i) => max.getTime() < i.updatedAt.getTime() ? i.updatedAt : max, new Date(this.timestamp));
			this.timestamp = timestamp.toISOString();
		}

		if (this.options.beforeUpdate) {
			this.options.beforeUpdate(items);
		}

		const { added, all } = this.applyUpdates(items, liveFetch);

		if (this.options.onUpdated && items.length) {
			this.options.onUpdated(added, all);
		}

		deletes.forEach(key => this.removeItem(key, true));

		if (liveFetch) {
			const finished = this.finished || !more;

			if (!this.finished && finished) {
				this.finished = true;

				if (this.options.onFinished) {
					this.options.onFinished();
				}
			}
		}

		return more;
	}
	private get server() {
		return this.socket.server;
	}
	private update() {
		return this.socket.isConnected ? this.server.getAll(this.name, this.timestamp).then(r => this.read(r)) : Promise.resolve(false);
	}
	private applyUpdates(updates: T[], liveFetch: boolean) {
		const added: T[] = [];
		const all: T[] = [];

		updates.forEach(update => {
			const doc = this.get(this.getKey(update));

			if (doc) {
				if (this.options.onUpdate) {
					this.options.onUpdate(doc, update);
				} else {
					Object.assign(doc, update);
				}
				all.push(doc);
			} else if (!liveFetch || !this.options.ignore || !this.options.ignore(update)) {
				this.push(update);
				added.push(update);
				all.push(update);
			}
		});

		return { added, all };
	}
}
