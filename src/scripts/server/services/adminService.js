"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timsort_1 = require("timsort");
const lodash_1 = require("lodash");
const rxjs_1 = require("rxjs");
const db = require("../db");
const liveList_1 = require("./liveList");
const utils_1 = require("../../common/utils");
const adminInterfaces_1 = require("../../common/adminInterfaces");
const adminUtils_1 = require("../../common/adminUtils");
const logger_1 = require("../logger");
const observableList_1 = require("./observableList");
const constants_1 = require("../../common/constants");
const internal_1 = require("../internal");
function addAuthToAccount(account, auth, log) {
    const existingAuth = account.auths.find(a => a._id === auth._id);
    if (existingAuth) { // TODO: remove
        console.log('duplicate auth', auth._id, 'to', account._id, log);
    }
    else {
        account.authsList.pushOrdered(auth, adminUtils_1.compareAuths);
    }
}
function pushUnique(list, item) {
    if (list.indexOf(item) === -1) {
        list.push(item);
    }
}
function removeAuthFromAccount(account, auth) {
    return account.authsList.remove(auth);
}
function addPonyToAccount(account, pony) {
    if (account.poniesList) {
        account.poniesList.pushOrdered(pony, adminUtils_1.compareByName);
    }
}
function removePonyFromAccount(account, pony) {
    if (account.poniesList) {
        return account.poniesList.remove(pony);
    }
    else {
        return false;
    }
}
function getTotalPledged(auths) {
    return Math.floor((auths || []).reduce((sum, a) => sum + utils_1.toInt(a.pledged), 0) / 100);
}
class AdminService {
    constructor() {
        this.accountDeleted = new rxjs_1.Subject();
        this.emailMap = new Map();
        this.noteRefMap = new Map();
        this.browserIdMap = new Map();
        this.unassignedAuths = [];
        this.unassignedPonies = [];
        this.duplicateFilter = adminUtils_1.createPotentialDuplicatesFilter(id => this.browserIdMap.get(id));
        this.accountsForPotentialDuplicatesCheck = [];
        const accountId = adminUtils_1.createIdStore();
        this.accounts = new liveList_1.LiveList(db.Account, {
            fields: [
                '_id', 'updatedAt', 'createdAt', 'lastVisit', 'name', 'birthdate', 'origins', 'ignores', 'emails', 'note',
                'counters', 'mute', 'shadow', 'ban', 'flags', 'roles', 'characterCount', 'patreon', 'supporter',
                'supporterDeclinedSince', 'lastBrowserId', 'noteUpdated', 'alert', 'birthyear'
            ],
            clean: ({ _id, createdAt, updatedAt, lastVisit, name, birthdate, origins, ignoresCount, emails, note, counters, mute, shadow, ban, flags, roles, characterCount, patreon, supporter, supporterDeclinedSince, auths, noteUpdated, alert, birthyear, }) => ({
                _id, createdAt, updatedAt, lastVisit, name, birthdate, origins, ignoresCount: utils_1.toInt(ignoresCount),
                emails, note, counters, mute, shadow, ban, flags: utils_1.toInt(flags), roles, birthyear,
                characterCount: utils_1.toInt(characterCount), patreon: utils_1.toInt(patreon), supporter: utils_1.toInt(supporter),
                supporterDeclinedSince, totalPledged: getTotalPledged(auths), noteUpdated, alert,
            }),
            fix: account => {
                account._id = accountId(account._id);
                account.nameLower = account.name.toLowerCase();
                account.ignoresCount = account.ignores ? account.ignores.length : 0;
                account.ignores = undefined;
                account.origins = (account.origins || []).map(o => ({ ip: o.ip, country: o.country, last: o.last }));
            },
            onAdd: account => {
                account.auths = [];
                // account.ponies = [];
                account.originsRefs = [];
                account.authsList = new observableList_1.ObservableList(account.auths, a => a._id);
                if (account.lastBrowserId) {
                    this.addBrowserIdToMap(account.lastBrowserId, account);
                }
                if (account.emails) {
                    for (const e of account.emails) {
                        this.addEmailToMap(e, account);
                    }
                }
                this.addNoteRefsToMap(account.note, account);
                this.updateOriginRefs(account);
                this.accountsForPotentialDuplicatesCheck.push(account);
            },
            onUpdate: (oldAccount, newAccount) => {
                if (oldAccount.emails) {
                    for (const e of oldAccount.emails) {
                        if (!utils_1.includes(newAccount.emails, e)) {
                            this.removeEmailFromMap(e, oldAccount);
                        }
                    }
                }
                if (newAccount.emails) {
                    for (const e of newAccount.emails) {
                        if (!utils_1.includes(oldAccount.emails, e)) {
                            this.addEmailToMap(e, oldAccount);
                        }
                    }
                }
                if (oldAccount.note !== newAccount.note) {
                    this.removeNoteRefsFromMap(oldAccount.note, oldAccount);
                    this.addNoteRefsToMap(newAccount.note, oldAccount);
                }
                if (oldAccount.lastBrowserId !== newAccount.lastBrowserId) {
                    oldAccount.lastBrowserId && this.removeBrowserIdFromMap(oldAccount.lastBrowserId, oldAccount);
                    newAccount.lastBrowserId && this.addBrowserIdToMap(newAccount.lastBrowserId, oldAccount);
                }
                Object.assign(oldAccount, newAccount);
                if (newAccount.birthyear === undefined) {
                    oldAccount.birthyear = undefined;
                }
                if (newAccount.alert === undefined) {
                    oldAccount.alert = undefined;
                }
                if (newAccount.patreon === undefined) {
                    oldAccount.patreon = undefined;
                }
                if (newAccount.supporter === undefined) {
                    oldAccount.supporter = undefined;
                }
                this.updateOriginRefs(oldAccount);
                this.accountsForPotentialDuplicatesCheck.push(oldAccount);
            },
            onAddedOrUpdated: () => {
                this.assignItems(this.unassignedAuths, (account, auth) => addAuthToAccount(account, auth, 'onAddedOrUpdated'));
                this.assignItems(this.unassignedPonies, addPonyToAccount);
            },
            onDelete: account => {
                account.origins = [];
                this.updateOriginRefs(account);
                if (account.emails) {
                    for (const email of account.emails) {
                        this.removeEmailFromMap(email, account);
                    }
                }
                account.lastBrowserId && this.removeBrowserIdFromMap(account.lastBrowserId, account);
                this.removeNoteRefsFromMap(account.note, account);
                this.accountDeleted.next(account);
            },
            onFinished: () => {
                timsort_1.sort(this.accounts.items, adminUtils_1.compareAccounts);
                this.auths.start();
            },
        });
        this.origins = new liveList_1.LiveList(db.Origin, {
            fields: ['_id', 'updatedAt', 'ip', 'country', 'mute', 'shadow', 'ban'],
            clean: ({ _id, updatedAt, ip, country, mute, shadow, ban, accounts }) => ({ _id, updatedAt, ip, country, mute, shadow, ban, accountsCount: accounts ? accounts.length : 0 }),
            onAdd: origin => {
                origin.accounts = [];
            },
            onSubscribeToMissing: ip => ({ ip, country: '??' }),
        }, origin => origin.ip);
        this.auths = new liveList_1.LiveList(db.Auth, {
            fields: ['_id', 'updatedAt', 'account', 'provider', 'name', 'url', 'disabled', 'banned', 'pledged', 'lastUsed'],
            clean: ({ _id, updatedAt, account, provider, name, url, disabled, banned, pledged, lastUsed }) => ({ _id, updatedAt, account, provider, name, url, disabled, banned, pledged, lastUsed }),
            fix: auth => {
                if (auth.account) {
                    auth.account = accountId(auth.account.toString());
                }
            },
            onAdd: auth => {
                this.assignAccount(auth, this.unassignedAuths, account => addAuthToAccount(account, auth, 'onAdd'));
            },
            onUpdate: this.createUpdater({
                remove: (account, auth) => removeAuthFromAccount(account, auth) || utils_1.removeItem(this.unassignedAuths, auth),
                add: (account, auth) => account ? addAuthToAccount(account, auth, 'onUpdate') : pushUnique(this.unassignedAuths, auth),
            }),
            onDelete: auth => {
                utils_1.removeItem(this.unassignedAuths, auth);
                this.accounts.for(auth.account, account => removeAuthFromAccount(account, auth));
            },
            onFinished: () => {
                logger_1.logger.info('Admin service loaded');
            },
        });
        this.ponies = new liveList_1.LiveList(db.Character, {
            fields: ['_id', 'createdAt', 'updatedAt', 'lastUsed', 'account', 'name', 'flags'],
            noStore: true,
            clean: ({ _id, createdAt, updatedAt, account, name, flags, lastUsed }) => ({ _id, createdAt, updatedAt, account, name, flags, lastUsed }),
            fix: pony => {
                if (pony.account) {
                    pony.account = accountId(pony.account.toString());
                }
            },
            ignore: pony => {
                const account = this.accounts.get(pony.account);
                return account === undefined || account.ponies === undefined;
            },
            onAdd: pony => {
                this.assignAccount(pony, this.unassignedPonies, account => addPonyToAccount(account, pony));
            },
            onUpdate: this.createUpdater({
                remove: (account, pony) => removePonyFromAccount(account, pony) || utils_1.removeItem(this.unassignedPonies, pony),
                add: (account, pony) => account ? addPonyToAccount(account, pony) : pushUnique(this.unassignedPonies, pony),
            }),
            onDelete: pony => {
                utils_1.removeItem(this.unassignedPonies, pony);
                this.accounts.for(pony.account, account => removePonyFromAccount(account, pony));
            },
        });
        this.events = new liveList_1.LiveList(db.Event, {
            fields: adminInterfaces_1.eventFields,
            clean: ({ _id, createdAt, updatedAt, message, desc, account, pony, origin }) => ({ _id, createdAt, updatedAt, message, desc, account, pony, origin }),
        });
        setTimeout(() => this.events.start(), 100);
        setTimeout(() => this.ponies.start(), 200);
        setTimeout(() => this.origins.start(), 300);
        setTimeout(() => this.accounts.start(), 400);
    }
    get loaded() {
        return this.accounts.loaded && this.origins.loaded && this.auths.loaded;
    }
    removedItem(type, id) {
        if (type === 'accounts') {
            this.accounts.removed(id);
        }
        else if (type === 'origins') {
            this.origins.removed(id);
        }
        else if (type === 'auths') {
            this.auths.removed(id);
        }
        else if (type === 'ponies') {
            this.ponies.removed(id);
        }
        else {
            console.warn(`Unhandled removedItem for type: ${type}`);
        }
    }
    getAccountsByNoteRef(accountId) {
        return this.noteRefMap.get(accountId) || [];
    }
    getAccountsByEmailName(emailName) {
        return this.emailMap.get(emailName) || [];
    }
    getAccountsByBrowserId(browserId) {
        return this.browserIdMap.get(browserId);
    }
    removeOriginsFromAccount(accountId, ips) {
        const account = this.accounts.get(accountId);
        if (account) {
            if (ips) {
                if (lodash_1.remove(account.origins, o => utils_1.includes(ips, o.ip)).length) {
                    this.updateOriginRefs(account);
                }
            }
            else if (account.origins.length) {
                account.origins = [];
                this.updateOriginRefs(account);
            }
        }
    }
    subscribeToAccountAuths(accountId, listener) {
        const account = this.accounts.get(accountId);
        if (account) {
            return account.authsList.subscribe(listener);
        }
        else {
            return undefined;
        }
    }
    subscribeToAccountOrigins(accountId, listener) {
        const account = this.accounts.get(accountId);
        if (account) {
            if (!account.originsList) {
                account.originsList = new observableList_1.ObservableList(account.originsRefs, ({ origin, last }) => ({ ip: origin.ip, country: origin.country, last }));
            }
            return account.originsList.subscribe(listener);
        }
        return undefined;
    }
    subscribeToAccountPonies(accountId, listener) {
        const account = this.accounts.get(accountId);
        if (account) {
            if (!account.ponies) {
                account.ponies = this.ponies.items.filter(p => p.account === account._id);
                this.ponies.fetch({ account: account._id });
            }
            if (!account.poniesList) {
                account.poniesList = new observableList_1.ObservableList(account.ponies, p => ({ id: p._id, name: p.name, date: p.lastUsed ? p.lastUsed.getTime() : 0 }));
            }
            return account.poniesList.subscribe(listener);
        }
        return undefined;
    }
    cleanupOriginsList(accountId) {
        const account = this.accounts.get(accountId);
        if (account && account.originsList && !account.originsList.hasSubscribers()) {
            account.originsList = undefined;
        }
    }
    cleanupPoniesList(accountId) {
        const account = this.accounts.get(accountId);
        if (account && account.ponies && account.poniesList && !account.poniesList.hasSubscribers()) {
            const ponies = account.ponies;
            account.ponies = undefined;
            account.poniesList = undefined;
            for (const pony of ponies) {
                this.cleanupPony(pony._id);
            }
        }
    }
    cleanupPony(ponyId) {
        const pony = this.ponies.get(ponyId);
        if (pony && !this.ponies.hasSubscriptions(ponyId)) {
            const account = this.accounts.get(pony.account);
            if (!account || !account.ponies) {
                this.ponies.discard(ponyId);
            }
        }
    }
    async mergePotentialDuplicates() {
        const start = Date.now();
        const duplicateFilter = this.duplicateFilter;
        while (this.accountsForPotentialDuplicatesCheck.length) {
            const popedAccount = this.accountsForPotentialDuplicatesCheck.pop();
            const account = this.getAccount(popedAccount._id);
            if (account && duplicateFilter(account)) {
                const threshold = utils_1.fromNow(-1 * constants_1.HOUR).getTime();
                const duplicates = adminUtils_1.getPotentialDuplicates(account, id => this.getAccountsByBrowserId(id))
                    .filter(a => a.createdAt && a.createdAt.getTime() < threshold);
                if (duplicates.length) {
                    const server = internal_1.getLoginServer('login');
                    const duplicate = duplicates[0];
                    const accountIsOlder = account.lastVisit && duplicate.lastVisit
                        && account.lastVisit.getTime() < duplicate.lastVisit.getTime();
                    const accountId = accountIsOlder ? duplicate._id : account._id;
                    const withId = accountIsOlder ? account._id : duplicate._id;
                    logger_1.logPerformance(`mergePotentialDuplicates (${Date.now() - start}ms) [yes]`);
                    await server.api.mergeAccounts(accountId, withId, `by server`, false, true);
                    return accountId;
                }
            }
        }
        this.accountsForPotentialDuplicatesCheck = [];
        logger_1.logPerformance(`mergePotentialDuplicates (${Date.now() - start}ms) [no]`);
        return undefined;
    }
    // helpers
    addEmailToMap(email, account) {
        adminUtils_1.addToMap(this.emailMap, adminUtils_1.emailName(email), account);
    }
    removeEmailFromMap(email, account) {
        adminUtils_1.removeFromMap(this.emailMap, adminUtils_1.emailName(email), account);
    }
    addNoteRefsToMap(note, account) {
        for (let id of adminUtils_1.getIdsFromNote(note)) {
            if (id !== account._id) {
                adminUtils_1.addToMap(this.noteRefMap, id, account);
            }
        }
    }
    removeNoteRefsFromMap(note, account) {
        for (let id of adminUtils_1.getIdsFromNote(note)) {
            if (id !== account._id) {
                adminUtils_1.removeFromMap(this.noteRefMap, id, account);
            }
        }
    }
    addBrowserIdToMap(browserId, account) {
        adminUtils_1.addToMap(this.browserIdMap, browserId, account);
    }
    removeBrowserIdFromMap(browserId, account) {
        adminUtils_1.removeFromMap(this.browserIdMap, browserId, account);
    }
    getAccount(id) {
        return id ? this.accounts.get(id) : undefined;
    }
    getOrCreateOrigin({ ip, country }) {
        return this.origins.get(ip)
            || this.origins.add({ _id: '', ip, country, accounts: [], updatedAt: new Date(0), createdAt: new Date(0) });
    }
    assignAccount(item, unassigned, action) {
        const account = this.getAccount(item.account);
        if (account) {
            action(account);
        }
        else {
            pushUnique(unassigned, item);
        }
    }
    updateOriginRefs(a) {
        if (a.originsRefs) {
            for (const o of a.originsRefs) {
                removeById(o.origin.accounts, a._id);
            }
        }
        const oldOriginRefs = a.originsRefs;
        a.originsRefs = a.origins.map(o => ({ origin: this.getOrCreateOrigin(o), last: o.last }));
        timsort_1.sort(a.originsRefs, adminUtils_1.compareOriginRefs);
        for (const o of a.originsRefs) {
            if (o.origin.accounts && !utils_1.includes(o.origin.accounts, a)) {
                o.origin.accounts.push(a);
            }
        }
        if (oldOriginRefs) {
            for (const o of oldOriginRefs) {
                if (!o.origin._id && o.origin.accounts.length === 0) {
                    this.origins.removed(o.origin.ip);
                }
                else {
                    this.origins.trigger(o.origin.ip, o.origin);
                }
            }
        }
        if (a.originsList) {
            a.originsList.replace(a.originsRefs);
        }
    }
    assignItems(unassigned, push) {
        lodash_1.remove(unassigned, item => {
            const account = item.account && this.getAccount(item.account);
            if (account) {
                push(account, item);
                return true;
            }
            else {
                return false;
            }
        });
    }
    createUpdater({ add, remove }) {
        return (oldItem, newItem) => {
            const oldAccountId = oldItem.account;
            const newAccountId = newItem.account;
            Object.assign(oldItem, newItem);
            if (oldAccountId !== newAccountId) {
                const oldAccount = this.getAccount(oldAccountId);
                const newAccount = this.getAccount(newAccountId);
                if (oldAccount) {
                    remove(oldAccount, oldItem);
                }
                add(newAccount, oldItem);
            }
        };
    }
}
exports.AdminService = AdminService;
function findIndexById(items, id) {
    for (let i = 0; i < items.length; i++) {
        if (items[i]._id === id) {
            return i;
        }
    }
    return -1;
}
function removeById(items, id) {
    const index = findIndexById(items, id);
    if (index !== -1) {
        const item = items[index];
        items.splice(index, 1);
        return item;
    }
    else {
        return undefined;
    }
}
//# sourceMappingURL=adminService.js.map