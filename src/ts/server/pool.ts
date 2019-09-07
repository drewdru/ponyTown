export interface Pool<T> {
	create(): T;
	dispose(value: T): boolean;
}

export function createPool<T>(count: number, createNew: () => T, reset: (value: T) => void): Pool<T> {
	const pool: T[] = [];

	const create = () => {
		const existing = pool.pop();

		if (existing) {
			reset(existing);
			return existing;
		} else {
			return createNew();
		}
	};

	const dispose = (value: T) => {
		if (pool.length < count) {
			pool.push(value);
			return true;
		} else {
			return false;
		}
	};

	return { create, dispose };
}
