"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function getBaseDate(items, get) {
    return items.reduce((min, i) => {
        const date = get(i);
        return date && min.getTime() > date.getTime() ? date : min;
    }, new Date(0)).toISOString();
}
exports.getBaseDate = getBaseDate;
function getBaseTimes(base) {
    return lodash_1.mapValues(base, (x) => (new Date(x)).getTime());
}
exports.getBaseTimes = getBaseTimes;
function trimValues(values) {
    return lodash_1.dropRightWhile(values, x => !x || (Array.isArray(x) && x.length === 0));
}
function encodeDate(date, baseValue) {
    return date ? (date.getTime() - baseValue) : 0;
}
// NOTE: update eventFields
function encodeEvent(event, base) {
    return trimValues([
        event._id,
        encodeDate(event.updatedAt, base.updatedAt),
        encodeDate(event.createdAt, base.createdAt),
        event.type,
        event.server,
        event.message,
        event.desc,
        event.count,
        event.origin ? { ip: event.origin.ip, country: event.origin.country } : null,
        event.account,
        event.pony && event.pony.toString(),
    ]);
}
exports.encodeEvent = encodeEvent;
//# sourceMappingURL=adminEncoders.js.map