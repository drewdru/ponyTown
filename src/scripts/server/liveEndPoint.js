"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Promise = require("bluebird");
const lodash_1 = require("lodash");
const adminInterfaces_1 = require("../common/adminInterfaces");
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const logger_1 = require("./logger");
function createLiveEndPoint({ model, fields, encode, beforeDelete, afterDelete, beforeAssign, afterAssign, fix = false }) {
    const removedItems = [];
    let fixing = false;
    function removedItem(id) {
        removedItems.push({ id, updatedAt: new Date() });
    }
    function removeItem(id) {
        return Promise.resolve(model.findById(id).exec())
            .tap(item => item && beforeDelete && beforeDelete(item))
            .tap(item => {
            if (item) {
                removedItem(item._id.toString());
                return item.remove();
            }
        })
            .tap(item => item && afterDelete && afterDelete(item))
            .then(lodash_1.noop);
    }
    function assignAccount(id, account) {
        return Promise.resolve()
            .then(() => model.findById(id, 'account').lean().exec())
            .tap((item) => item && beforeAssign && beforeAssign(item, account))
            .tap(() => model.findByIdAndUpdate(id, { account }).exec())
            .tap((item) => item && afterAssign && afterAssign(item.account, account))
            .then(lodash_1.noop);
    }
    function encodeItems(items, timestamp, more) {
        const base = {};
        const updates = encode(items, base);
        const deletes = removedItems
            .filter(x => x.updatedAt.getTime() > timestamp.getTime())
            .map(x => x.id);
        return { updates, deletes, base, more };
    }
    function findItems(from) {
        return Promise.resolve(model.find({ updatedAt: { $gt: from } }, fields.join(' '))
            // .sort([['updatedAt', 1], ['id', 1]])
            .sort({ updatedAt: 1 })
            .limit(adminInterfaces_1.ITEM_LIMIT + 1)
            .lean()
            .exec());
    }
    function findItemsExact(date) {
        return Promise.resolve(model.find({ updatedAt: date }, fields.join(' '))
            .lean()
            .exec());
    }
    function hasItem(items, id) {
        return items.some(i => i._id === id);
    }
    function addTailItems(items) {
        if (items.length <= adminInterfaces_1.ITEM_LIMIT) {
            return Promise.resolve({ items, more: false });
        }
        const a = items[items.length - 1];
        const b = items[items.length - 2];
        if (a.updatedAt.getTime() !== b.updatedAt.getTime()) {
            items.pop();
            return Promise.resolve({ items, more: true });
        }
        return findItemsExact(items[items.length - 1].updatedAt)
            .then(other => other.filter(i => !hasItem(items, i._id)))
            .then(other => [...items, ...other])
            .then(items => ({ items, more: true }));
    }
    function getAll(timestamp) {
        const from = timestamp ? new Date(timestamp) : new Date(0);
        return findItems(from)
            .then(addTailItems)
            .tap(({ items }) => {
            try {
                if (items.length > adminInterfaces_1.ITEM_LIMIT * 2) {
                    fixItems(items);
                    logger_1.logger.warn(`Fetching ${items.length} ${model.modelName}s [${items[adminInterfaces_1.ITEM_LIMIT + 1].updatedAt.toISOString()}]`);
                }
            }
            catch (e) {
                logger_1.logger.error(e);
            }
        })
            .then(({ items, more }) => encodeItems(items, from, more));
    }
    function fixItems(items) {
        if (fixing || !fix)
            return;
        fixing = true;
        logger_1.logger.info(`Fixing ${model.modelName}s`);
        Promise.map(items, item => model.updateOne({ _id: item._id }, { unused: Date.now() % 1000 }).exec(), { concurrency: 1 })
            .then(() => logger_1.logger.info(`Fixed ${model.modelName}s`))
            .catch(e => logger_1.logger.error(e))
            .finally(() => fixing = false)
            .done();
    }
    function get(id) {
        return Promise.resolve(model.findById(id).lean().exec());
    }
    const interval = setInterval(() => {
        const date = utils_1.fromNow(-10 * constants_1.MINUTE);
        lodash_1.remove(removedItems, x => x.updatedAt.getTime() < date.getTime());
    }, 1 * constants_1.MINUTE);
    function destroy() {
        clearInterval(interval);
    }
    return {
        get,
        getAll,
        assignAccount,
        removeItem,
        removedItem,
        encodeItems,
        destroy,
    };
}
exports.createLiveEndPoint = createLiveEndPoint;
//# sourceMappingURL=liveEndPoint.js.map