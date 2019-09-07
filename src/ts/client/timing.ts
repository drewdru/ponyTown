interface TimingEntry {
	time: number;
	name?: string;
}

interface TimingResult {
	name: string;
	count: number;
	selfTime: number;
	totalTime: number;
	selfPercent: number;
	totalPercent: number;
}

const ENABLED = false;
const ENTRIES_LIMIT = 8000;

const entries: TimingEntry[] = [];
let entriesCount = 0;

if (TIMING && ENABLED) {
	for (let i = 0; i < ENTRIES_LIMIT; i++) {
		entries.push({ time: 0, name: undefined });
	}
}

export function timeStart(name: string) {
	if (TIMING && ENABLED) {
		if (entriesCount < ENTRIES_LIMIT) {
			const entry = entries[entriesCount];
			entry.time = performance.now();
			entry.name = name;
			entriesCount++;
		} else {
			console.warn(`exceeded timing entry limit`);
		}
	}
}

export function timeEnd() {
	if (TIMING && ENABLED) {
		if (entriesCount < ENTRIES_LIMIT) {
			const entry = entries[entriesCount];
			entry.time = performance.now();
			entry.name = undefined;
			entriesCount++;
		} else {
			console.warn(`exceeded timing entry limit`);
		}
	}
}

export function timeReset() {
	if (TIMING && ENABLED) {
		entriesCount = 0;
	}
}

export function timingCollate(): TimingResult[] {
	if (TIMING && ENABLED && entriesCount > 0) {
		interface Entry extends TimingEntry {
			excludedTime: number;
		}

		const listings: TimingResult[] = [];
		const startStack: Entry[] = [];

		for (let i = 0; i < entriesCount; i++) {
			const entry = entries[i];

			if (entry.name !== undefined) {
				startStack.push({ ...entry, excludedTime: 0 });
			} else {
				const start = startStack.pop()!;
				const name = start.name!;
				const time = entry.time - start.time;
				let listing = listings.find(l => l.name === name);

				if (!listing) {
					listing = { name, selfTime: 0, totalTime: 0, selfPercent: 0, totalPercent: 0, count: 0 };
					listings.push(listing);
				}

				listing.count++;
				listing.selfTime += (time - start.excludedTime);
				listing.totalTime += time;

				if (startStack.length) {
					startStack[startStack.length - 1].excludedTime += time;
				}
			}
		}

		const firstTime = entries[0].time;
		const lastTime = entries[entriesCount - 1].time;
		const totalTime = lastTime - firstTime;

		for (const listing of listings) {
			listing.selfPercent = 100 * listing.selfTime / totalTime;
			listing.totalPercent = 100 * listing.totalTime / totalTime;
		}

		return listings.sort((a, b) => b.selfTime - a.selfTime);
	}

	return [];
}
