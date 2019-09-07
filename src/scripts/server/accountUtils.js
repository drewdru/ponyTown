"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const lodash_1 = require("lodash");
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const accountUtils_1 = require("../common/accountUtils");
const clientUtils_1 = require("../client/clientUtils");
const db_1 = require("./db");
const authUtils_1 = require("./authUtils");
const userError_1 = require("./userError");
const logger_1 = require("./logger");
const adminUtils_1 = require("../common/adminUtils");
const oauth_1 = require("./oauth");
const taskQueue_1 = require("./utils/taskQueue");
function getBanInfo(value) {
    return adminUtils_1.isActive(value) ? (value === -1 ? 'perma' : moment(value).fromNow(true)) : undefined;
}
function getModInfo({ accountId, account, country }) {
    return {
        shadow: getBanInfo(account.shadow),
        mute: getBanInfo(account.mute),
        note: account.note,
        counters: account.counters || {},
        country,
        account: `${account.name} [${accountId.substr(-3)}]`,
    };
}
exports.getModInfo = getModInfo;
function findAccountByEmail(emails) {
    return emails && emails.length ? db_1.queryAccount({ emails: { $in: emails } }) : Promise.resolve(undefined);
}
const availableProviders = oauth_1.providers.filter(a => !a.connectOnly).map(a => a.name).join(', ');
exports.connectOnlySocialError = `Cannot create new account using this social site, new accounts can only be created using: ${availableProviders}`;
function createNewAccount(profile, options) {
    if (!options.canCreateAccounts) {
        throw new userError_1.UserError('Creating accounts is temporarily disabled, try again later');
    }
    else if (options.connectOnly) {
        throw new userError_1.UserError(exports.connectOnlySocialError);
    }
    else if (options.creationLocked) {
        throw new userError_1.UserError('Could not create account, try again later', { log: `account creation blocked by ACL (${options.ip})` });
    }
    else if (profile.suspended) {
        throw new userError_1.UserError('Cannot create new account using suspended social site account', { log: 'account creation blocked by suspended' });
    }
    else {
        return new db_1.Account();
    }
}
async function hasDuplicatesAtOrigin(account, ip) {
    const now = Date.now();
    const query = { origins: { $elemMatch: { ip } } };
    const duplicates = await db_1.Account.find(query, '_id ban mute shadow flags name').lean().exec();
    return duplicates.some(({ _id, ban = 0, mute = 0, shadow = 0, flags = 0, name }) => {
        if (_id.toString() === account._id.toString())
            return false;
        if (ban === -1 || ban > now || mute === -1 || mute > now || shadow === -1 || shadow > now)
            return true;
        if (utils_1.hasFlag(flags, 2 /* CreatingDuplicates */))
            return true;
        if (name === account.name)
            return true;
        return false;
    });
}
const newAccountCheckQueue = taskQueue_1.taskQueue();
async function checkNewAccount(account, options) {
    newAccountCheckQueue.push(async () => {
        try {
            if (options.reportPotentialDuplicates) {
                const duplicate = await hasDuplicatesAtOrigin(account, options.ip);
                if (duplicate) {
                    options.warn(account._id, `Potential duplicate`);
                }
            }
        }
        catch (e) {
            options.warn(account._id, `Error when checking new account`, e.message);
        }
    });
}
async function findOrCreateAccount(auth, profile, options) {
    let account = undefined;
    let isNew = false;
    if (auth.account) {
        account = await db_1.findAccount(auth.account);
    }
    if (!account) {
        account = await findAccountByEmail(profile.emails);
    }
    if (!account) {
        account = createNewAccount(profile, options);
        isNew = true;
    }
    const assigned = await authUtils_1.assignAuth(auth, account);
    if (assigned && options.isSuspiciousAuth(auth)) {
        options.warn(account._id, 'Suspicious auth');
    }
    // fix accounts fields
    account.name = account.name || lodash_1.truncate(clientUtils_1.cleanName(profile.name) || 'Anonymous', { length: constants_1.ACCOUNT_NAME_MAX_LENGTH });
    account.emails = account.emails || [];
    if (profile.emails.some(e => !utils_1.includes(account.emails, e))) {
        const suspiciousEmails = profile.emails.filter(options.isSuspiciousName);
        if (suspiciousEmails.length) {
            options.warn(account._id, 'Suspicious email', suspiciousEmails.join(', '));
        }
        account.emails = lodash_1.uniq([...account.emails, ...profile.emails]);
    }
    account.lastVisit = new Date();
    account.lastUserAgent = options.userAgent || account.lastUserAgent;
    account.lastBrowserId = options.browserId || account.lastBrowserId;
    // save account
    if (isNew) {
        await account.save();
        logger_1.system(account._id, `created account "${account.name}"`);
        checkNewAccount(account, options);
    }
    else {
        const { name, emails, lastVisit, lastUserAgent, lastBrowserId } = account;
        await db_1.Account.updateOne({ _id: account._id }, { name, emails, lastVisit, lastUserAgent, lastBrowserId }).exec();
    }
    return account;
}
exports.findOrCreateAccount = findOrCreateAccount;
function isNew(account) {
    return !account.createdAt || account.createdAt.getTime() > utils_1.fromNow(-constants_1.DAY).getTime();
}
exports.isNew = isNew;
function checkIfNotAdmin(account, message) {
    if (accountUtils_1.isAdmin(account)) {
        logger_1.logger.warn(`Cannot perform this action on admin user (${message})`);
        throw new Error('Cannot perform this action on admin user');
    }
    else {
        return account;
    }
}
exports.checkIfNotAdmin = checkIfNotAdmin;
async function updateCharacterCount(account) {
    const characterCount = await db_1.characterCount(account);
    await db_1.updateAccount(account, { characterCount });
}
exports.updateCharacterCount = updateCharacterCount;
function updateAccountState(account, update) {
    const state = account.state || {};
    update(state);
    account.state = state;
    db_1.updateAccount(account._id, { state: account.state })
        .catch(e => logger_1.logger.error(e));
}
exports.updateAccountState = updateAccountState;
function getAccountAlertMessage(account) {
    return (account.alert && account.alert.expires.getTime() > Date.now()) ? account.alert.message : undefined;
}
exports.getAccountAlertMessage = getAccountAlertMessage;
async function findFriendRequest(accountId, friendId) {
    const requests = await db_1.FriendRequest.find({
        $or: [
            { source: accountId, target: friendId },
            { source: friendId, target: accountId },
        ]
    }).exec();
    return requests[0];
}
async function addFriend(accountId, friendId) {
    const existing = await findFriendRequest(accountId, friendId);
    if (existing) {
        throw new Error(`Friend request already exists`);
    }
    await db_1.FriendRequest.create({ source: accountId, target: friendId });
}
exports.addFriend = addFriend;
async function removeFriend(accountId, friendId) {
    const existing = await findFriendRequest(accountId, friendId);
    if (existing) {
        existing.remove();
    }
}
exports.removeFriend = removeFriend;
function getCharacterLimit(account) {
    return accountUtils_1.getCharacterLimit({
        flags: adminUtils_1.isPastSupporter(account) ? 4 /* PastSupporter */ : 0,
        supporter: adminUtils_1.supporterLevel(account),
    });
}
exports.getCharacterLimit = getCharacterLimit;
function getSupporterInviteLimit(account) {
    return accountUtils_1.getSupporterInviteLimit({
        roles: account.roles,
        flags: adminUtils_1.isPastSupporter(account) ? 4 /* PastSupporter */ : 0,
        supporter: adminUtils_1.supporterLevel(account),
    });
}
exports.getSupporterInviteLimit = getSupporterInviteLimit;
//# sourceMappingURL=accountUtils.js.map