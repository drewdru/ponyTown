"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const accountUtils_1 = require("../accountUtils");
const db_1 = require("../db");
const internal_1 = require("../internal");
const constants_1 = require("../../common/constants");
const utils_1 = require("../../common/utils");
const adminUtils_1 = require("../../common/adminUtils");
const banLogLimit = 10;
async function updateAccountAndNotify(accountId, update) {
    await db_1.updateAccount(accountId, update);
    await internal_1.accountChanged(accountId);
}
async function timeoutAccount(accountId, timeout, message) {
    const account = await db_1.findAccountSafe(accountId, 'roles mute shadow');
    accountUtils_1.checkIfNotAdmin(account, `timeout account: ${accountId}`);
    const update = { mute: timeout.getTime() };
    if (!adminUtils_1.isMuted(account) && !adminUtils_1.isShadowed(account)) {
        update.$inc = { 'counters.timeouts': 1 };
        if (message) {
            update.$push = {
                banLog: {
                    $each: [{ message, date: new Date() }],
                    $slice: -banLogLimit,
                },
            };
        }
    }
    await updateAccountAndNotify(accountId, update);
}
exports.timeoutAccount = timeoutAccount;
function incrementAccountCounter(accountId, counter) {
    return updateAccountAndNotify(accountId, { $inc: { [`counters.${counter}`]: 1 } });
}
function updateAccountCounter(accountId, counter, value) {
    return updateAccountAndNotify(accountId, { [`counters.${counter}`]: value });
}
exports.updateAccountCounter = updateAccountCounter;
let logSwearing = lodash_1.noop;
let logSpamming = lodash_1.noop;
function initLogSwearingAndSpamming(swearing, spamming) {
    logSwearing = swearing;
    logSpamming = spamming;
}
exports.initLogSwearingAndSpamming = initLogSwearingAndSpamming;
function reportSwearingAccount(accountId) {
    logSwearing();
    return incrementAccountCounter(accountId, 'swears');
}
exports.reportSwearingAccount = reportSwearingAccount;
function reportSpammingAccount(accountId) {
    logSpamming();
    return incrementAccountCounter(accountId, 'spam');
}
exports.reportSpammingAccount = reportSpammingAccount;
async function reportInviteLimitAccount(accountId) {
    await incrementAccountCounter(accountId, 'inviteLimit');
    const account = await db_1.findAccountSafe(accountId, 'counters');
    return account.counters && account.counters.inviteLimit || 0;
}
exports.reportInviteLimitAccount = reportInviteLimitAccount;
async function reportFriendLimitAccount(accountId) {
    await incrementAccountCounter(accountId, 'friendLimit');
    const account = await db_1.findAccountSafe(accountId, 'counters');
    return account.counters && account.counters.friendLimit || 0;
}
exports.reportFriendLimitAccount = reportFriendLimitAccount;
async function updateAccountSafe(accountId, update) {
    const keys = Object.keys(update);
    const allowAdmin = utils_1.arraysEqual(keys, ['note']) || utils_1.arraysEqual(keys, ['supporter']);
    const account = await db_1.findAccountSafe(accountId);
    if (!allowAdmin) {
        accountUtils_1.checkIfNotAdmin(account, `update account: ${accountId}`);
    }
    const isNoteUpdate = 'note' in update && update.note !== account.note;
    const accountUpdate = isNoteUpdate ? Object.assign({}, update, { noteUpdated: new Date() }) : update;
    await updateAccountAndNotify(accountId, accountUpdate);
}
exports.updateAccountSafe = updateAccountSafe;
async function setRole(accountId, role, set, isSuperadmin) {
    if (role === 'superadmin' || !isSuperadmin) {
        throw new Error('Not allowed');
    }
    else {
        await updateAccountAndNotify(accountId, set ? { $addToSet: { roles: [role] } } : { $pull: { roles: role } });
    }
}
exports.setRole = setRole;
function addEmail(accountId, email) {
    return db_1.updateAccount(accountId, { $addToSet: { emails: [email.trim().toLowerCase()] } });
}
exports.addEmail = addEmail;
function removeEmail(accountId, email) {
    return db_1.updateAccount(accountId, { $pull: { emails: email } });
}
exports.removeEmail = removeEmail;
function removeIgnore(accountId, ignoredAccount) {
    return updateAccountAndNotify(ignoredAccount, { $pull: { ignores: accountId } });
}
exports.removeIgnore = removeIgnore;
function addIgnores(accountId, ignores) {
    return updateAccountAndNotify(accountId, { $addToSet: { ignores } });
}
exports.addIgnores = addIgnores;
function setAccountState(accountId, state) {
    return updateAccountAndNotify(accountId, { state });
}
exports.setAccountState = setAccountState;
function isValidCache(entry, query, duration) {
    return entry.query === query && entry.timestamp.getTime() > utils_1.fromNow(-duration).getTime();
}
async function findAccounts(cache, service, { search, showOnly, not, page, itemsPerPage, force }) {
    const query = JSON.stringify({ search, showOnly, not });
    let found;
    if (force) {
        cache.findAccounts = undefined;
    }
    if (cache.findAccounts && isValidCache(cache.findAccounts, query, 5 * constants_1.MINUTE)) {
        found = cache.findAccounts.result;
    }
    else {
        found = adminUtils_1.filterAccounts(service.accounts.items, search, showOnly, not);
        cache.findAccounts = {
            query,
            result: found,
            timestamp: new Date(),
        };
    }
    const start = page * itemsPerPage;
    return {
        accounts: found.slice(start, start + itemsPerPage).map(a => a._id),
        page,
        totalItems: found.length,
    };
}
exports.findAccounts = findAccounts;
function getAccountsByEmail(service, email) {
    email = email.toLowerCase();
    const name = adminUtils_1.emailName(email);
    const accounts = service.getAccountsByEmailName(name) || [];
    return accounts.filter(a => utils_1.includes(a.emails, email)).map(a => a._id);
}
exports.getAccountsByEmail = getAccountsByEmail;
function getAccountsByEmails(service, emails) {
    const pairs = lodash_1.uniq(emails)
        .map(email => [email, getAccountsByEmail(service, email)])
        .filter(([_, accounts]) => accounts.length > 0);
    return lodash_1.fromPairs(pairs);
}
exports.getAccountsByEmails = getAccountsByEmails;
function getAccountsByOrigin(service, ip) {
    const origin = service.origins.get(ip);
    return origin && origin.accounts && origin.accounts.map(a => a._id) || [];
}
exports.getAccountsByOrigin = getAccountsByOrigin;
async function removeAccount(service, accountId) {
    const account = await db_1.findAccount(accountId);
    if (account) {
        accountUtils_1.checkIfNotAdmin(account, `remove account: ${accountId}`);
        await account.remove();
        service.removedItem('accounts', accountId);
    }
}
exports.removeAccount = removeAccount;
async function setAccountAlert(accountId, message, expires) {
    const update = message ? { alert: { message, expires } } : { $unset: { alert: 1 } };
    await db_1.Account.updateOne({ _id: accountId }, update).exec();
}
exports.setAccountAlert = setAccountAlert;
//# sourceMappingURL=admin-accounts.js.map