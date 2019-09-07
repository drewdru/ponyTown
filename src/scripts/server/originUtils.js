"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const config_1 = require("./config");
const logger_1 = require("./logger");
const get_ip = require('ipware')().get_ip;
function getIP(req) {
    return req.headers['cf-connecting-ip'] || (get_ip(req) ? get_ip(req).clientIp : null);
}
exports.getIP = getIP;
function getOriginFromHTTP(req) {
    const ip = getIP(req) || '0.0.0.0';
    const ipcountry = (ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === '::1') ? 'LOCAL' : '';
    const country = ipcountry || req.headers['cf-ipcountry'] || '??';
    return { ip, country, last: new Date() };
}
exports.getOriginFromHTTP = getOriginFromHTTP;
function getOrigin(req) {
    const origin = getOriginFromHTTP(req);
    if (origin.country === '??' && config_1.config.proxy) {
        logger_1.logger.warn('Invalid IP', JSON.stringify(req.ips));
        //create(null, null, null).danger('Invalid IP', JSON.stringify(req.ips));
    }
    return origin;
}
exports.getOrigin = getOrigin;
async function addOrigin(account, origin) {
    try {
        const _id = account._id;
        const existingOrigin = account.origins && account.origins
            .find(o => o.ip === origin.ip);
        if (existingOrigin) {
            await db_1.Account.updateOne({ _id, 'origins._id': existingOrigin._id }, { $set: { 'origins.$.last': new Date() } }).exec();
        }
        else {
            await db_1.Account.updateOne({ _id }, { $push: { origins: origin } }).exec();
        }
    }
    catch (e) {
        logger_1.logger.error('Failed to add origin', e);
    }
}
exports.addOrigin = addOrigin;
//# sourceMappingURL=originUtils.js.map