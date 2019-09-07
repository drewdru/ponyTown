"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const constants_1 = require("../../common/constants");
const accountUtils_1 = require("../../common/accountUtils");
const clientUtils_1 = require("../../client/clientUtils");
const serverUtils_1 = require("../serverUtils");
const db_1 = require("../db");
const userError_1 = require("../userError");
const entities = require("../../common/entities");
const utils_1 = require("../../common/utils");
const accountUtils_2 = require("../accountUtils");
const adminUtils_1 = require("../../common/adminUtils");
const exclude = [
    'getEntityType', 'getEntityTypeName', 'createAnEntity', 'createEntity', 'pony',
    'createBaseEntity', 'getEntityTypesAndNames',
];
exports.allEntities = Object.keys(entities)
    .filter(key => typeof entities[key] === 'function')
    .filter(key => !utils_1.includes(exclude, key));
function getEntityNamesToTypes() {
    const result = [];
    for (const name of exports.allEntities) {
        const created = entities[name](0, 0);
        const array = Array.isArray(created) ? created : [created];
        const types = array.map(e => e.type);
        result.push({ name, types });
    }
    return result;
}
const entitiesInfo = {
    typeToName: entities.getEntityTypesAndNames(),
    nameToTypes: getEntityNamesToTypes(),
    names: exports.allEntities,
};
const actions = [
    { name: 'kick', action: 4 /* Kick */ },
    { name: 'ban', action: 5 /* Ban */ },
];
exports.modCheck = { xcz: { vdw: { qwe: { mnb: {} } } }, actions };
function fixUpdateAccountData(update) {
    const fixed = {};
    if (update) {
        if (update.name && typeof update.name === 'string') {
            const name = clientUtils_1.cleanName(update.name);
            if (name.length >= constants_1.ACCOUNT_NAME_MIN_LENGTH && name.length <= constants_1.ACCOUNT_NAME_MAX_LENGTH) {
                fixed.name = name;
            }
        }
        if (update.birthdate && typeof update.birthdate === 'string') {
            fixed.birthdate = update.birthdate;
        }
    }
    return fixed;
}
function fixAccountSettings(settings) {
    const fixed = {};
    if (settings) {
        if (settings.defaultServer !== undefined) {
            fixed.defaultServer = `${settings.defaultServer}`;
        }
        if (settings.filterCyrillic !== undefined) {
            fixed.filterCyrillic = !!settings.filterCyrillic;
        }
        if (settings.filterSwearWords !== undefined) {
            fixed.filterSwearWords = !!settings.filterSwearWords;
        }
        if (settings.ignorePartyInvites !== undefined) {
            fixed.ignorePartyInvites = !!settings.ignorePartyInvites;
        }
        if (settings.ignoreFriendInvites !== undefined) {
            fixed.ignoreFriendInvites = !!settings.ignoreFriendInvites;
        }
        if (settings.ignorePublicChat !== undefined) {
            fixed.ignorePublicChat = !!settings.ignorePublicChat;
        }
        if (settings.ignoreNonFriendWhispers !== undefined) {
            fixed.ignoreNonFriendWhispers = !!settings.ignoreNonFriendWhispers;
        }
        if (settings.chatlogOpacity !== undefined) {
            fixed.chatlogOpacity = utils_1.clamp(settings.chatlogOpacity | 0, 0, 100);
        }
        if (settings.chatlogRange !== undefined) {
            fixed.chatlogRange = utils_1.clamp(settings.chatlogRange | 0, constants_1.MIN_CHATLOG_RANGE, constants_1.MAX_CHATLOG_RANGE);
        }
        if (settings.seeThroughObjects !== undefined) {
            fixed.seeThroughObjects = !!settings.seeThroughObjects;
        }
        if (settings.filterWords !== undefined) {
            fixed.filterWords = `${settings.filterWords}`;
        }
        if (settings.actions !== undefined) {
            fixed.actions = `${settings.actions}`;
        }
        if (settings.hidden !== undefined) {
            fixed.hidden = !!settings.hidden;
        }
    }
    return fixed;
}
exports.createGetAccountData = (findCharacters, findAuths) => async (account) => {
    const [ponies, auths] = await Promise.all([
        findCharacters(account._id, serverUtils_1.toPonyObjectFields),
        findAuths(account._id, serverUtils_1.toSocialSiteFields),
    ]);
    const data = serverUtils_1.toAccountData(account);
    data.ponies = ponies.map(serverUtils_1.toPonyObject);
    data.sites = auths.map(serverUtils_1.toSocialSite);
    data.alert = accountUtils_2.getAccountAlertMessage(account);
    if (accountUtils_1.isMod(account)) {
        data.check = exports.modCheck;
    }
    if (BETA && accountUtils_1.isMod(account)) {
        data.editor = entitiesInfo;
    }
    return data;
};
async function getFriends(account) {
    return db_1.findFriends(account._id, true);
}
exports.getFriends = getFriends;
async function getHides(account, page) {
    const hideRequests = await db_1.HideRequest
        .find({ source: account._id }, '_id name date')
        .sort({ date: -1 })
        .skip(page * constants_1.HIDES_PER_PAGE)
        .limit(constants_1.HIDES_PER_PAGE)
        .lean()
        .exec();
    return hideRequests.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        date: moment(f.date).fromNow(),
    }));
}
exports.getHides = getHides;
exports.createGetAccountCharacters = (findCharacters) => async (account) => {
    const ponies = await findCharacters(account._id);
    return ponies.map(serverUtils_1.toPonyObject);
};
exports.createUpdateAccount = (findAccount, log) => async (account, update) => {
    const a = await findAccount(account._id);
    if (update) {
        const fixed = fixUpdateAccountData(update);
        const up = {};
        if (fixed.name && fixed.name !== a.name) {
            up.name = fixed.name;
            log(a._id, `Renamed "${a.name}" => "${fixed.name}"`);
        }
        if (fixed.birthdate) {
            const { day, month, year } = utils_1.parseISODate(fixed.birthdate);
            const date = utils_1.createValidBirthDate(day, month, year);
            if ((date && a.birthdate && date.getTime() !== a.birthdate.getTime()) || !a.birthdate) {
                up.birthdate = date;
                const from = a.birthdate ? `${utils_1.formatISODate(a.birthdate)} (${adminUtils_1.getAge(a.birthdate)}yo)` : `undefined`;
                const to = up.birthdate ? `${utils_1.formatISODate(up.birthdate)} (${adminUtils_1.getAge(up.birthdate)}yo)` : `undefined`;
                log(a._id, `Changed birthdate ${from} => ${to}`);
            }
        }
        Object.assign(a, up);
        await db_1.Account.updateOne({ _id: a._id }, up).exec();
    }
    return serverUtils_1.toAccountData(a);
};
exports.createUpdateSettings = (findAccount) => async (account, settings) => {
    const a = await findAccount(account._id);
    account.settings = a.settings = Object.assign({}, a.settings, fixAccountSettings(settings));
    await db_1.Account.updateOne({ _id: account._id }, { settings: account.settings }).exec();
    return serverUtils_1.toAccountData(a);
};
exports.createRemoveSite = (findAuth, countAllVisibleAuths, log) => async (account, siteId) => {
    const [auth, auths] = await Promise.all([
        siteId && typeof siteId === 'string' ? findAuth(siteId, account._id) : Promise.resolve(undefined),
        countAllVisibleAuths(account._id),
    ]);
    if (!auth || auth.disabled) {
        throw new userError_1.UserError('Social account not found');
    }
    else if (auths === 1) {
        throw new userError_1.UserError('Cannot remove your only one social account');
    }
    else {
        log(account._id, `removed auth: ${auth.name} [${auth._id}]`);
        await db_1.Auth.updateOne({ _id: auth._id }, { disabled: true }).exec();
    }
    return {};
};
async function removeHide(account, hideId) {
    await db_1.HideRequest.deleteOne({ source: account._id, _id: hideId }).exec();
}
exports.removeHide = removeHide;
//# sourceMappingURL=account.js.map