"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../common/constants");
const adminUtils_1 = require("../common/adminUtils");
const utils_1 = require("../common/utils");
const accountUtils_1 = require("./accountUtils");
const serverUtils_1 = require("./serverUtils");
exports.SPAM_TIMEOUT = 1 * constants_1.HOUR;
exports.SWEAR_TIMEOUT = 10 * constants_1.HOUR;
exports.FORBIDDEN_TIMEOUT = 1 * constants_1.HOUR;
exports.createReportSuspicious = (counter) => (client, message, suspicious) => {
    const { accountId, account, reporter, shadowed } = client;
    const limit = 5;
    const { count, items } = counter.add(accountId, message);
    if (count > limit || suspicious === 2 /* Very */) {
        const msg = items.join('\n');
        counter.remove(accountId);
        if (!(adminUtils_1.isMuted(account) || shadowed)) {
            reporter.warn('Suspicious messages', msg);
        }
    }
};
exports.createReportSwears = (counter, reportSwearing, timeoutAccount, handlePromise = serverUtils_1.handlePromiseDefault) => (client, message, settings) => {
    const { accountId, account, reporter, shadowed } = client;
    const limit = 5; // isNew ? 3 : 6;
    const { count, items } = counter.add(accountId, message);
    if (count > limit) {
        const msg = items.join('\n');
        const timeout = settings.autoBanSwearing && !(adminUtils_1.isMuted(account) || shadowed);
        const duration = exports.SWEAR_TIMEOUT * (settings.doubleTimeouts ? 2 : 1);
        counter.remove(accountId);
        handlePromise(Promise.resolve()
            .then(() => reportSwearing(accountId))
            .then(() => timeout ? timeoutAccount(accountId, utils_1.fromNow(duration), 'Timed out for swearing') : undefined)
            .then(() => {
            if (timeout) {
                reporter.system('Timed out for swearing', msg, !!settings.reportSwears);
            }
            else if (!(adminUtils_1.isMuted(account) || shadowed)) {
                reporter.warn('Swearing', msg);
            }
        }), reporter.error);
    }
};
exports.createReportForbidden = (counter, timeoutAccount, handlePromise = serverUtils_1.handlePromiseDefault) => (client, message, settings) => {
    const { accountId, account, reporter, shadowed } = client;
    const newAccount = accountUtils_1.isNew(account);
    const limit = newAccount ? 5 : 10;
    const { count, items } = counter.add(accountId, message);
    const mutedOrShadowed = adminUtils_1.isMuted(account) || shadowed;
    if (!mutedOrShadowed) {
        if (count >= limit) {
            const msg = items.join('\n');
            const duration = exports.FORBIDDEN_TIMEOUT * (settings.doubleTimeouts ? 2 : 1);
            counter.remove(accountId);
            if (newAccount || settings.autoBanSwearing) {
                handlePromise(timeoutAccount(accountId, utils_1.fromNow(duration))
                    .then(() => reporter.system('Timed out for forbidden messages', msg)), reporter.error);
            }
            else {
                reporter.warn('Forbidden messages', msg);
            }
        }
    }
};
exports.reportInviteLimit = (reportInviteLimitAccount, message, handlePromise = serverUtils_1.handlePromiseDefault) => ({ accountId, reporter }) => handlePromise(reportInviteLimitAccount(accountId)
    .then(count => {
    reporter.systemLog(message);
    if (count % 10 === 0) {
        reporter.warn(`${message} (${count})`);
    }
}), reporter.error);
//# sourceMappingURL=reporting.js.map