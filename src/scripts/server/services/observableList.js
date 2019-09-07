"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../common/utils");
const adminUtils_1 = require("../../common/adminUtils");
class ObservableList {
    constructor(list, map) {
        this.list = list;
        this.map = map;
        this.listeners = [];
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
    push(item) {
        this.list.push(item);
        this.trigger();
    }
    pushOrdered(item, compare) {
        adminUtils_1.pushOrdered(this.list, item, compare);
        this.trigger();
    }
    remove(item) {
        const removed = utils_1.removeItem(this.list, item);
        this.trigger();
        return removed;
    }
    replace(list) {
        this.list = list;
        this.trigger();
    }
    subscribe(listener) {
        this.listeners.push(listener);
        this.trigger();
        return {
            unsubscribe: () => {
                utils_1.removeItem(this.listeners, listener);
            }
        };
    }
}
exports.ObservableList = ObservableList;
//# sourceMappingURL=observableList.js.map