"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const adminUtils_1 = require("../../common/adminUtils");
const constants_1 = require("../../common/constants");
const db_1 = require("../db");
const utils_1 = require("../../common/utils");
// get duplicate entries
const DUPLICATE_TIMEOUT = 1 * constants_1.HOUR;
let duplicateEntries = undefined;
let duplicateTimestamp = 0;
async function getDuplicateEntries(accounts, force) {
    if (!duplicateEntries || force || (Date.now() - duplicateTimestamp) > DUPLICATE_TIMEOUT) {
        duplicateTimestamp = Date.now();
        duplicateEntries = [
            ...getDuplicateEmails(accounts),
        ];
    }
    return duplicateEntries;
}
exports.getDuplicateEntries = getDuplicateEntries;
function getDuplicateEmails(accounts) {
    const duplicates = [];
    const collect = adminUtils_1.duplicatesCollector(duplicates);
    accounts.forEach(a => a.emails !== undefined && a.emails.forEach(collect));
    return duplicates;
}
exports.getDuplicateEmails = getDuplicateEmails;
function getDuplicateAuths(accounts) {
    const duplicates = [];
    const collect = adminUtils_1.duplicatesCollector(duplicates);
    accounts.forEach(a => a.auths !== undefined && a.auths.forEach(a => a.url && collect(a.url)));
    return duplicates;
}
exports.getDuplicateAuths = getDuplicateAuths;
// get duplicate info
async function getDuplicateInfo(accountId, otherAccounts) {
    const ids = [accountId, ...otherAccounts];
    const [chars, accounts] = await Promise.all([
        db_1.Character.find({ account: ids }, 'account name').lean().exec(),
        db_1.Account.find({ _id: ids }, '_id lastUserAgent').lean().exec(),
    ]);
    chars.forEach(c => c.name = c.name.toLowerCase());
    const groups = lodash_1.groupBy(chars, c => c.account);
    const account = accounts.find(a => a._id.toString() === accountId);
    const userAgent = account && account.lastUserAgent || '';
    return otherAccounts.map(id => {
        const account = accounts.find(a => a._id.toString() === id);
        return {
            account: id,
            userAgent: (account && userAgent && account.lastUserAgent === userAgent) ? userAgent : '',
            ponies: getDuplicateNames(groups[accountId], groups[id]),
        };
    });
}
exports.getDuplicateInfo = getDuplicateInfo;
function getDuplicateNames(mine = [], others = []) {
    return lodash_1.uniq(mine.filter(a => others.some(b => a.name === b.name)).map(c => c.name));
}
// get all duplicates
async function getAllDuplicatesQuickInfo(service, accountId) {
    const duplicates = await getAllDuplicates(service, accountId);
    return {
        generatedAt: Date.now(),
        count: duplicates.length,
        name: duplicates.some(d => !!d.name),
        emails: duplicates.some(d => !!d.emails),
        browserId: duplicates.some(d => !!d.browserId),
        perma: duplicates.some(d => !!d.perma),
    };
}
exports.getAllDuplicatesQuickInfo = getAllDuplicatesQuickInfo;
async function getAllDuplicatesWithInfo(service, accountId) {
    const duplicates = await getAllDuplicates(service, accountId);
    const accountIds = duplicates.map(x => x.account);
    const duplicatesInfo = await getDuplicateInfo(accountId, accountIds);
    duplicatesInfo.forEach(({ account, ponies, userAgent }) => {
        const duplicate = duplicates.find(d => d.account === account);
        if (duplicate) {
            duplicate.ponies = ponies;
            duplicate.userAgent = userAgent;
        }
    });
    duplicates.forEach(d => d.ponies = d.ponies || []);
    return duplicates;
}
exports.getAllDuplicatesWithInfo = getAllDuplicatesWithInfo;
async function getAllDuplicates(service, accountId) {
    const account = service.accounts.get(accountId);
    if (!account) {
        return [];
    }
    else {
        return lodash_1.uniq([
            ...getDuplicatesByNote(service, account),
            ...getDuplicatesByEmail(service, account),
            ...getDuplicatesByBrowserId(service, account),
            ...getDuplicates(account),
        ])
            .filter(a => a !== account)
            .map(a => adminUtils_1.createDuplicateResult(a, account))
            .sort(adminUtils_1.compareDuplicates)
            .slice(0, 50);
    }
}
function getDuplicates(account) {
    const accounts = [];
    const origins = [];
    utils_1.removeItem(accounts, account);
    collectDuplicates(accounts, origins, account, 3);
    return accounts;
}
function getDuplicatesByNote(service, account) {
    const linkedTo = lodash_1.compact(adminUtils_1.getIdsFromNote(account.note).map(id => service.accounts.get(id)));
    const linkedFrom = service.getAccountsByNoteRef(account._id);
    return uniqueOtherAccounts([...linkedTo, ...linkedFrom], account);
}
function getDuplicatesByEmail(service, account) {
    const accounts = (account.emails || [])
        .map(adminUtils_1.emailName)
        .map(name => service.getAccountsByEmailName(name));
    return uniqueOtherAccounts(utils_1.flatten(accounts), account);
}
function getDuplicatesByBrowserId(service, account) {
    const browserId = account.lastBrowserId;
    const accounts = browserId && service.getAccountsByBrowserId(browserId) || [];
    return uniqueOtherAccounts(accounts, account);
}
function uniqueOtherAccounts(accounts, exclude) {
    return lodash_1.uniq(accounts.filter(a => a !== exclude));
}
function collectDuplicates(accounts, origins, account, level) {
    if (level > 0 && !utils_1.includes(accounts, account)) {
        accounts.push(account);
        account.originsRefs.forEach(o => {
            if (!utils_1.includes(origins, o.origin)) {
                origins.push(o.origin);
                if (o.origin.accounts) {
                    o.origin.accounts.forEach(a => collectDuplicates(accounts, origins, a, level - 1));
                }
            }
        });
    }
}
// unused
function getDuplicateEmailNames(accounts) {
    const set = new Set();
    return lodash_1.uniq(accounts.reduce((duplicates, a) => {
        if (a.emails !== undefined && a.emails.length > 0) {
            const names = a.emails.map(e => e.replace(/@.+$/, ''));
            duplicates.push(...names.filter(name => set.has(name)));
            names.forEach(name => set.add(name));
        }
        return duplicates;
    }, []));
}
exports.getDuplicateEmailNames = getDuplicateEmailNames;
//# sourceMappingURL=duplicates.js.map