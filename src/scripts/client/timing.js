"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ENABLED = false;
const ENTRIES_LIMIT = 8000;
const entries = [];
let entriesCount = 0;
if (TIMING && ENABLED) {
    for (let i = 0; i < ENTRIES_LIMIT; i++) {
        entries.push({ time: 0, name: undefined });
    }
}
function timeStart(name) {
    if (TIMING && ENABLED) {
        if (entriesCount < ENTRIES_LIMIT) {
            const entry = entries[entriesCount];
            entry.time = performance.now();
            entry.name = name;
            entriesCount++;
        }
        else {
            console.warn(`exceeded timing entry limit`);
        }
    }
}
exports.timeStart = timeStart;
function timeEnd() {
    if (TIMING && ENABLED) {
        if (entriesCount < ENTRIES_LIMIT) {
            const entry = entries[entriesCount];
            entry.time = performance.now();
            entry.name = undefined;
            entriesCount++;
        }
        else {
            console.warn(`exceeded timing entry limit`);
        }
    }
}
exports.timeEnd = timeEnd;
function timeReset() {
    if (TIMING && ENABLED) {
        entriesCount = 0;
    }
}
exports.timeReset = timeReset;
function timingCollate() {
    if (TIMING && ENABLED && entriesCount > 0) {
        const listings = [];
        const startStack = [];
        for (let i = 0; i < entriesCount; i++) {
            const entry = entries[i];
            if (entry.name !== undefined) {
                startStack.push(Object.assign({}, entry, { excludedTime: 0 }));
            }
            else {
                const start = startStack.pop();
                const name = start.name;
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
exports.timingCollate = timingCollate;
//# sourceMappingURL=timing.js.map