"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const reporter_1 = require("./reporter");
class UserError extends Error {
    //static name: string;
    constructor(message, info, userInfo) {
        super(message);
        this.message = message;
        this.info = info;
        this.userInfo = userInfo;
        Object.defineProperty(this, 'name', { value: 'UserError' });
        Error.captureStackTrace(this, UserError);
    }
}
exports.UserError = UserError;
function isUserError(e) {
    return e.name === 'UserError';
}
exports.isUserError = isUserError;
function report(message, info, reporter, extra = '') {
    const keys = Object.keys(info);
    if (keys.length === 1 && keys[0] === 'log') {
        logger_1.logger.log(info.log);
    }
    else {
        if (reporter) {
            reporter.warn((info.error && info.error.message) || info.message || message || '<no message>', info.desc);
        }
        logger_1.logger.warn(info.error || info.message || message || '<no message>', info.desc || '', info.data || '', extra);
    }
}
function reportUserError(e, server, req) {
    if (e.info) {
        report(e.message, e.info, reporter_1.createFromRequest(server, req), `${req.url} ${req.ip}`);
    }
}
exports.reportUserError = reportUserError;
function reportUserError2(e, client) {
    if (e.info) {
        report(e.message, e.info, client && client.reporter);
    }
}
exports.reportUserError2 = reportUserError2;
//# sourceMappingURL=userError.js.map