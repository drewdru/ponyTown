"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../common/utils");
class LiveCollection {
    constructor(name, rate, getKey, options, socket, timestamp = (new Date(0)).toISOString(), logError = (e) => console.error(e.stack)) {
        this.name = name;
        this.rate = rate;
        this.getKey = getKey;
        this.options = options;
        this.socket = socket;
        this.timestamp = timestamp;
        this.logError = logError;
        this.items = [];
        this.finished = false;
        this.running = true;
        this.itemsMap = new Map();
    }
    get(key) {
        return this.itemsMap.get(key);
    }
    push(item) {
        this.items.push(item);
        this.itemsMap.set(this.getKey(item), item);
        return item;
    }
    remove(key) {
        return this.server.removeItem(this.name, key)
            .then(() => this.removeItem(key, true, true));
    }
    removeItem(key, deleted = false, removeFromList = false) {
        const item = this.itemsMap.get(key);
        if (item) {
            if (removeFromList || this.options.deleteItems) {
                utils_1.removeItem(this.items, item);
                this.itemsMap.delete(key);
            }
            else if (deleted) {
                item.deleted = true;
            }
            if (deleted && this.options.onDelete) {
                this.options.onDelete(item);
            }
        }
    }
    assignAccount(id, account) {
        return this.server.assignAccount(this.name, id, account);
    }
    live() {
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
    read({ updates, deletes, base, more }, liveFetch = true) {
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
    get server() {
        return this.socket.server;
    }
    update() {
        return this.socket.isConnected ? this.server.getAll(this.name, this.timestamp).then(r => this.read(r)) : Promise.resolve(false);
    }
    applyUpdates(updates, liveFetch) {
        const added = [];
        const all = [];
        updates.forEach(update => {
            const doc = this.get(this.getKey(update));
            if (doc) {
                if (this.options.onUpdate) {
                    this.options.onUpdate(doc, update);
                }
                else {
                    Object.assign(doc, update);
                }
                all.push(doc);
            }
            else if (!liveFetch || !this.options.ignore || !this.options.ignore(update)) {
                this.push(update);
                added.push(update);
                all.push(update);
            }
        });
        return { added, all };
    }
}
exports.LiveCollection = LiveCollection;
//# sourceMappingURL=liveCollection.js.map