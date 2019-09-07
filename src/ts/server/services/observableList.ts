import { removeItem } from '../../common/utils';
import { ListListener, IObservableList } from '../../common/adminInterfaces';
import { pushOrdered } from '../../common/adminUtils';

export class ObservableList<T, V> implements IObservableList<T, V> {
	private listeners: ListListener<V>[] = [];
	constructor(private list: T[], private map: (item: T) => V) {
	}
	hasSubscribers() {
		return this.listeners.length > 0;
	}
	trigger() {
		if (this.listeners.length) {
			const items = this.list.map(this.map);

			for (const listener of this.listeners) {
				listener(items);
			}
		}
	}
	push(item: T) {
		this.list.push(item);
		this.trigger();
	}
	pushOrdered(item: T, compare: (a: T, b: T) => number) {
		pushOrdered(this.list, item, compare);
		this.trigger();
	}
	remove(item: T) {
		const removed = removeItem(this.list, item);
		this.trigger();
		return removed;
	}
	replace(list: T[]) {
		this.list = list;
		this.trigger();
	}
	subscribe(listener: ListListener<V>) {
		this.listeners.push(listener);
		this.trigger();

		return {
			unsubscribe: () => {
				removeItem(this.listeners, listener);
			}
		};
	}
}
