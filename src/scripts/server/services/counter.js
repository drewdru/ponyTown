"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zeroCounter = { date: 0, count: 0, items: [] };
class CounterService {
    constructor(clearTimeout) {
        this.clearTimeout = clearTimeout;
        this.counters = new Map();
    }
    get(id) {
        return this.counters.get(id) || zeroCounter;
    }
    add(id, item, count = 1) {
        const counter = this.counters.get(id) || { date: 0, count: 0, items: [] };
        counter.date = Date.now();
        counter.count += count;
        if (item) {
            counter.items.push(item);
        }
        this.counters.set(id, counter);
        return counter;
    }
    remove(id) {
        this.counters.delete(id);
    }
    cleanup() {
        const threshold = Date.now() - this.clearTimeout;
        const remove = [];
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
exports.CounterService = CounterService;
//# sourceMappingURL=counter.js.map