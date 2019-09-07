"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const mongoose_1 = require("mongoose");
const utils_1 = require("../common/utils");
const db_1 = require("./db");
const logger_1 = require("./logger");
const userError_1 = require("./userError");
const accountUtils_1 = require("./accountUtils");
async function assignAuth(auth, account) {
    if (!auth.account || !auth.account.equals(account._id)) {
        logger_1.system(account._id, `connected auth ${auth.name} [${auth._id}]`);
        await db_1.updateAuth(auth._id, { account: account._id });
        return true;
    }
    else {
        return false;
    }
}
exports.assignAuth = assignAuth;
async function findOrCreateAuth(profile, accountId, options) {
    let auth = await db_1.findAuthByOpenId(profile.id, profile.provider);
    if (auth) {
        await updateAuthInfo(db_1.updateAuth, auth, profile, accountId);
    }
    else {
        if (options.connectOnly && !accountId) {
            if (profile.emails.length) {
                const account = await db_1.Account.findOne({ emails: { $in: profile.emails } }).exec();
                if (!account) {
                    throw new userError_1.UserError(accountUtils_1.connectOnlySocialError);
                }
            }
            else {
                throw new userError_1.UserError(accountUtils_1.connectOnlySocialError);
            }
        }
        auth = await createAuth(profile, accountId);
    }
    await verifyOrRestoreAuth(auth, accountId);
    return auth;
}
exports.findOrCreateAuth = findOrCreateAuth;
async function updateAuthInfo(updateAuth, auth, profile, accountId) {
    if (!auth)
        return;
    const changes = {};
    if (profile.url && auth.url !== profile.url) {
        changes.url = profile.url;
    }
    if (profile.username && auth.name !== profile.username) {
        changes.name = profile.username;
    }
    if (profile.emails && profile.emails.length) {
        if (!auth.emails || !utils_1.arraysEqual(auth.emails.sort(), profile.emails.sort())) {
            changes.emails = lodash_1.uniq([...(auth.emails || []), ...profile.emails]);
        }
    }
    if (!auth.account && accountId) {
        changes.account = mongoose_1.Types.ObjectId(accountId);
    }
    if (Object.keys(changes).length > 0) {
        Object.assign(auth, changes);
        await updateAuth(auth._id, changes);
    }
}
exports.updateAuthInfo = updateAuthInfo;
async function createAuth(profile, account) {
    if (!profile.id) {
        throw new Error('Missing profile ID');
    }
    return await db_1.Auth.create({
        account,
        openId: profile.id,
        provider: profile.provider,
        name: profile.username,
        url: profile.url,
        emails: profile.emails || [],
        lastUsed: new Date(),
    });
}
async function verifyOrRestoreAuth(auth, mergeAccount) {
    const changes = { lastUsed: new Date() };
    if (auth.disabled || auth.banned) {
        if (!auth.banned && auth.account && !!mergeAccount) {
            changes.disabled = false;
        }
        else {
            throw new userError_1.UserError('Cannot sign-in using this social account');
        }
    }
    Object.assign(auth, changes);
    await db_1.updateAuth(auth._id, changes);
}
//# sourceMappingURL=authUtils.js.map