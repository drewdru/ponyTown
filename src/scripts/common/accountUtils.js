"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const utils_1 = require("./utils");
function hasRole(account, role) {
    return !!(account && account.roles && account.roles.indexOf(role) !== -1);
}
exports.hasRole = hasRole;
function isAdmin(account) {
    return hasRole(account, 'admin') || hasRole(account, 'superadmin');
}
exports.isAdmin = isAdmin;
function isMod(account) {
    return hasRole(account, 'mod') || isAdmin(account);
}
exports.isMod = isMod;
function isDev(account) {
    return hasRole(account, 'dev');
}
exports.isDev = isDev;
function meetsRequirement(account, require) {
    return !require || hasRole(account, require) || meetsSupporterRequirement(account, require);
}
exports.meetsRequirement = meetsRequirement;
function meetsSupporterRequirement(account, require) {
    const level = account.supporter || 0;
    const modOrDev = isMod(account) || isDev(account);
    if (require === 'inv') {
        return modOrDev || level >= 1 || !!account.supporterInvited;
    }
    else if (require === 'sup1') {
        return modOrDev || level >= 1;
    }
    else if (require === 'sup2') {
        return modOrDev || level >= 2;
    }
    else if (require === 'sup3') {
        return modOrDev || level >= 3;
    }
    else {
        return false;
    }
}
function getCharacterLimit(account) {
    switch (account.supporter || 0) {
        case 1: return constants_1.BASE_CHARACTER_LIMIT + constants_1.ADDITIONAL_CHARACTERS_SUPPORTER1;
        case 2: return constants_1.BASE_CHARACTER_LIMIT + constants_1.ADDITIONAL_CHARACTERS_SUPPORTER2;
        case 3: return constants_1.BASE_CHARACTER_LIMIT + constants_1.ADDITIONAL_CHARACTERS_SUPPORTER3;
        default:
            if (utils_1.hasFlag(account.flags, 4 /* PastSupporter */)) {
                return constants_1.BASE_CHARACTER_LIMIT + constants_1.ADDITIONAL_CHARACTERS_PAST_SUPPORTER;
            }
            else {
                return constants_1.BASE_CHARACTER_LIMIT;
            }
    }
}
exports.getCharacterLimit = getCharacterLimit;
function getSupporterInviteLimit(account) {
    if (isMod(account) || isDev(account)) {
        return 100;
    }
    else {
        switch (account.supporter) {
            case 1: return 1;
            case 2: return 5;
            case 3: return 10;
            default: return 0;
        }
    }
}
exports.getSupporterInviteLimit = getSupporterInviteLimit;
//# sourceMappingURL=accountUtils.js.map