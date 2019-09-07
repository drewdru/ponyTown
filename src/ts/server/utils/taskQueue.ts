import { noop } from 'lodash';

export interface TaskQueue {
	push<T>(action: () => Promise<T> | T): Promise<T>;
	wait(): Promise<void>;
}

interface Task {
	resolve: (value: any) => void;
	reject: (error: any) => void;
	action: () => any;
}

export function taskQueue(): TaskQueue {
	const queue: Task[] = [];
	let working = false;

	function next() {
		const task = queue.shift();

		if (task) {
			exec(task);
		} else {
			working = false;
		}
	}

	function exec({ action, resolve, reject }: Task) {
		working = true;

		Promise.resolve()
			.then(action)
			.then(resolve, reject)
			.catch(console.error)
			.finally(next);
	}

	function push(action: () => any): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			const task: Task = { action, resolve, reject };

			if (working) {
				queue.push(task);
			} else {
				exec(task);
			}
		});
	}

	function wait() {
		return push(noop);
	}

	return { push, wait };
}

export function makeQueued<T extends (...args: any[]) => any>(action: T): T {
	const queue = taskQueue();
	return ((...args: any[]) => queue.push(() => action(...args))) as T;
}
