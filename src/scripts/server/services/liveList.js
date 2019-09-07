"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../common/utils");
const logger_1 = require("../logger");
const db_1 = require("../db");
const tickInterval = 1000;
function fixDocumentId(item) {
    item._id = item._id.toString();
    return item;
}
class LiveList {
    constructor(model, config, getId = (item) => item._id, logger = logger_1.logger) {
        this.model = model;
        this.config = config;
        this.getId = getId;
        this.logger = logger;
        this.items = [];
        this.itemsMap = new Map();
        this.listeners = new Map();
        this.timestamp = new Date(0);
        this.finished = false;
        this.running = false;
        this.fieldsString = config.fields.join(' ');
    }
    get loaded() {
        return this.finished;
    }
    start() {
        if (this.config.noStore) {
            this.timestamp = new Date();
        }
        this.running = true;
        this.tick();
    }
    stop() {
        this.running = false;
        clearTimeout(this.timeout);
    }
    get(id) {
        return this.itemsMap.get(id);
    }
    for(id, callback) {
        const item = id ? this.get(id) : undefined;
        item && callback(item);
    }
    add(item) {
        const id = this.getId(item);
        this.items.push(item);
        this.itemsMap.set(id, item);
        if (this.config.onAdd) {
            this.config.onAdd(item);
        }
        this.trigger(id, item);
        return item;
    }
    // NOTE: only _id
    async remove(id) {
        await this.model.deleteOne({ _id: id }).exec();
        this.removed(id);
    }
    removed(id) {
        const item = this.get(id);
        if (item) {
            this.trigger(id, undefined);
            this.itemsMap.delete(id);
            utils_1.removeItem(this.items, item);
            this.config.onDelete && this.config.onDelete(item);
        }
    }
    discard(id) {
        const item = this.get(id);
        if (item) {
            this.itemsMap.delete(id);
            utils_1.removeItem(this.items, item);
        }
    }
    trigger(id, item) {
        const listeners = this.listeners.get(id);
        if (listeners) {
            const cleaned = item ? this.config.clean(item) : item;
            listeners.forEach(listener => listener(id, cleaned));
        }
    }
    subscribe(id, listener) {
        const listeners = this.listeners.get(id) || [];
        listeners.push(listener);
        this.listeners.set(id, listeners);
        const item = this.get(id);
        if (item) {
            listener(id, this.config.clean(item));
        }
        else if (this.config.onSubscribeToMissing) {
            this.add(this.config.onSubscribeToMissing(id));
        }
        return {
            unsubscribe: () => {
                const listeners = this.listeners.get(id) || [];
                utils_1.removeItem(listeners, listener);
                if (listeners.length === 0) {
                    this.listeners.delete(id);
                }
            }
        };
    }
    hasSubscriptions(id) {
        return !!this.listeners.get(id);
    }
    async tick() {
        if (this.running) {
            clearTimeout(this.timeout);
            try {
                await this.update();
            }
            catch (e) {
                this.logger.error(e);
            }
            finally {
                this.timeout = setTimeout(() => this.tick(), tickInterval);
            }
        }
    }
    async fetch(search) {
        await this.internalUpdate(search, true);
    }
    async update() {
        await this.internalUpdate({ updatedAt: { $gt: this.timestamp } }, false);
    }
    async internalUpdate(search, fetching) {
        const query = this.model.find(search, this.fieldsString);
        const applyUpdate = this.config.onUpdate || Object.assign;
        let addedOrUpdated = false;
        await db_1.iterate(query.lean(), update => {
            try {
                fixDocumentId(update);
                if (this.config.fix) {
                    this.config.fix(update);
                }
                if (!fetching) {
                    this.timestamp = utils_1.maxDate(this.timestamp, update.updatedAt);
                }
                const doc = this.get(this.getId(update));
                if (doc !== undefined) {
                    applyUpdate(doc, update);
                    this.trigger(this.getId(doc), doc);
                }
                else if (fetching || !(this.config.ignore && this.config.ignore(update))) {
                    this.add(update);
                }
                addedOrUpdated = true;
            }
            catch (e) {
                console.error(e);
            }
        });
        if (addedOrUpdated && this.config.onAddedOrUpdated) {
            this.config.onAddedOrUpdated();
        }
        if (!this.finished) {
            this.finished = true;
            this.config.onFinished && this.config.onFinished();
        }
    }
}
exports.LiveList = LiveList;
//# sourceMappingURL=liveList.js.map