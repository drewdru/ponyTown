interface Counter<T> {
	date: number;
	count: number;
	items: T[];
}

const zeroCounter: Counter<any> = { date: 0, count: 0, items: [] };

export class CounterService<T> {
	private counters = new Map<string, Counter<T>>();
	private interval: any;
	constructor(private clearTimeout: number) {
	}
	get(id: string): Counter<T> {
		return this.counters.get(id) || zeroCounter;
	}
	add(id: string, item?: T, count = 1) {
		const counter = this.counters.get(id) || { date: 0, count: 0, items: [] };
		counter.date = Date.now();
		counter.count += count;

		if (item) {
			counter.items.push(item);
		}

		this.counters.set(id, counter);
		return counter;
	}
	remove(id: string) {
		this.counters.delete(id);
	}
	cleanup() {
		const threshold = Date.now() - this.clearTimeout;
		const remove: string[] = [];

		this.counters.forEach((value, key) => {
			if (value.date < threshold) {
				remove.push(key);
			}
		});

		remove.forEach(id => this.remove(id));
	}
	start() {
		this.interval = this.interval || setInterval(() => this.cleanup(), this.clearTimeout / 10);
	}
	stop() {
		clearInterval(this.interval);
		this.interval = undefined;
	}
}
