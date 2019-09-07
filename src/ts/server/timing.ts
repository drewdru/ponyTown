import { TimingEntry, TimingEntryType } from '../common/adminInterfaces';

const ENABLED = true;
const ENTRIES_LIMIT = 50000;

const entries: TimingEntry[] = [];
let entriesCount = 0;

let now: () => number;

if (typeof window !== 'undefined') {
	now = performance.now;
} else {
	const hrtime = process.hrtime;
	const getNanoSeconds = () => {
		const hr = hrtime();
		return hr[0] * 1e9 + hr[1];
	};
	const nodeLoadTime = getNanoSeconds() - process.uptime() * 1e9;
	now = () => (getNanoSeconds() - nodeLoadTime) / 1e6;
}

if (ENABLED) {
	for (let i = 0; i < ENTRIES_LIMIT; i++) {
		entries.push({ type: 0, time: 0, name: undefined });
	}
}

export function timingStart(name: string) {
	if (ENABLED) {
		if (entriesCount < ENTRIES_LIMIT) {
			const entry = entries[entriesCount];
			entry.type = TimingEntryType.Start;
			entry.time = now();
			entry.name = name;
			entriesCount++;
		} else {
			console.warn(`exceeded timing entry limit`);
		}
	}
}

export function timingEnd() {
	if (ENABLED) {
		if (entriesCount < ENTRIES_LIMIT) {
			const entry = entries[entriesCount];
			entry.type = TimingEntryType.End;
			entry.time = now();
			entry.name = undefined;
			entriesCount++;
		} else {
			console.warn(`exceeded timing entry limit`);
		}
	}
}

export function timingReset() {
	if (ENABLED) {
		entriesCount = 0;
	}
}

export function timingEntries() {
	return entries.slice(0, entriesCount);
}
