"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const platform_browser_1 = require("@angular/platform-browser");
const lodash_1 = require("lodash");
const browser_1 = require("ag-sockets/dist/browser");
const utils_1 = require("../../common/utils");
const constants_1 = require("../../common/constants");
const clientAdminActions_1 = require("../../client/clientAdminActions");
const liveCollection_1 = require("./liveCollection");
const data_1 = require("../../client/data");
const rev_1 = require("../../client/rev");
const adminUtils_1 = require("../../common/adminUtils");
const storageService_1 = require("./storageService");
const compressPony_1 = require("../../common/compressPony");
const modelSubscriber_1 = require("./modelSubscriber");
const notification = window.Notification;
function shouldNotify(e) {
    return !/^(Spam|Suspicious message|Invalid account|Invite limit reached|Timed out for (swearing|spamming))$/i
        .test(e.message);
}
let AdminModel = class AdminModel {
    constructor(sanitizer, storage, zone) {
        this.sanitizer = sanitizer;
        this.storage = storage;
        this.counts = {
            accounts: 0,
            characters: 0,
            auths: 0,
            origins: 0,
        };
        this.initialized = false;
        this.state = {
            status: {
                diskSpace: '',
                memoryUsage: '',
                certificateExpiration: '',
                lastPatreonUpdate: '',
            },
            loginServers: [
                {
                    updating: false,
                    dead: false,
                },
            ],
            gameServers: [],
        };
        this.log = (..._) => { };
        this.handleError = (error) => {
            console.error(error);
            this.error = error.message;
            return undefined;
        };
        this.checkError = (promise) => promise.catch(this.handleError);
        this.running = true;
        this.initializedLive = false;
        this.initAccountPromise();
        this.socket = browser_1.createClientSocket(Object.assign({}, data_1.socketOptions()), data_1.token, undefined, zone.run.bind(zone));
        window.model = this;
        if (this.socket) {
            this.socket.client = new clientAdminActions_1.ClientAdminActions(this);
            this.socket.connect();
        }
        this.accounts = new modelSubscriber_1.ModelSubscriber('accounts', this.socket, {
            fix: account => {
                account.createdAt = new Date(account.createdAt);
                account.updatedAt = new Date(account.updatedAt);
                account.lastVisit = account.lastVisit && new Date(account.lastVisit);
                if (account.alert) {
                    account.alert.expires = new Date(account.alert.expires);
                }
            },
        });
        this.auths = new modelSubscriber_1.ModelSubscriber('auths', this.socket, {
            fix: account => {
                account.updatedAt = new Date(account.updatedAt);
                account.lastUsed = account.lastUsed && new Date(account.lastUsed);
            },
        });
        this.ponies = new modelSubscriber_1.ModelSubscriber('ponies', this.socket, {
            fix: character => {
                character.createdAt = new Date(character.createdAt);
                character.updatedAt = new Date(character.updatedAt);
                character.lastUsed = character.lastUsed && new Date(character.lastUsed);
            },
        });
        this.origins = new modelSubscriber_1.ModelSubscriber('origins', this.socket, {});
        this.accountAuths = new modelSubscriber_1.ModelSubscriber('accountAuths', this.socket, {}, []);
        this.accountPonies = new modelSubscriber_1.ModelSubscriber('accountPonies', this.socket, {}, []);
        this.accountOrigins = new modelSubscriber_1.ModelSubscriber('accountOrigins', this.socket, {}, []);
        this.liveEvents = new liveCollection_1.LiveCollection('events', 1000, adminUtils_1.getId, {
            decode: decodeEvent,
            onUpdated: (added, all) => {
                if (all.length) {
                    this.log(`events ${all.length}`);
                }
                all.forEach(e => {
                    e.descHTML = this.sanitizer.bypassSecurityTrustHtml(adminUtils_1.formatEventDesc(e.desc));
                });
                this.callUpdated('events', !!added);
                this.updateTitle();
                if (this.notifications) {
                    added.filter(shouldNotify).forEach(e => this.notify(e.message, e.desc));
                    all.filter(e => e.count === 10).forEach(e => this.notify(e.message, e.desc));
                }
            },
            onDelete: () => this.updateTitle(),
        }, this.socket);
        if (!this.socket) {
            this.initialize(true);
        }
    }
    get loading() {
        return !this.account;
    }
    initAccountPromise() {
        this.accountPromise = new Promise(resolve => {
            this.resolveAccount = resolve;
        });
    }
    get server() {
        return this.socket.server;
    }
    get notifications() {
        return this.storage.getItem('admin-notifications') === 'true';
    }
    get connected() {
        return this.socket.isConnected;
    }
    get events() {
        return this.liveEvents.items;
    }
    get loaded() {
        return this.liveEvents.finished;
    }
    initialize(live) {
        if (this.initializedLive)
            return;
        notification.requestPermission();
        this.initializedLive = true;
        this.server.getSignedAccount()
            .then(account => {
            this.account = account;
            this.updateState();
            this.resolveAccount(account);
            if (live) {
                setTimeout(() => this.liveEvents.live(), 100);
                setInterval(() => this.checkDuplicateEntries(), 60 * constants_1.MINUTE);
                setInterval(() => {
                    if (this.connected) {
                        this.getCounts().then(counts => this.counts = counts || this.counts);
                    }
                }, 5 * 1000);
            }
        });
    }
    connectedToSocket() {
        this.accounts.connected();
        this.origins.connected();
        this.auths.connected();
        this.ponies.connected();
        this.accountAuths.connected();
        this.accountPonies.connected();
        this.accountOrigins.connected();
        this.updateTitle();
    }
    checkDuplicateEntries(force = false) {
        return this.server.getDuplicateEntries(force)
            .then(entries => this.duplicateEntries = entries || [])
            .catch(lodash_1.noop);
    }
    stop() {
        this.running = false;
        this.liveEvents.stop();
    }
    toggleNotifications() {
        this.storage.setItem('admin-notifications', this.notifications ? 'false' : 'true');
    }
    // other
    getCounts() {
        return this.checkError(this.server.getCounts());
    }
    getRequestStats() {
        return this.checkError(this.server.getRequestStats());
    }
    getOtherStats() {
        return this.checkError(this.server.getOtherStats());
    }
    // auths
    getAuth(id) {
        return this.checkError(this.server.getAuth(id));
    }
    getAuthsForAccount(accountId) {
        return this.checkError(this.server.getAuthsForAccount(accountId));
    }
    removeAuth(id) {
        return this.checkError(this.server.removeAuth(id));
    }
    assignAuth(authId, accountId) {
        return this.checkError(this.server.assignAuth(authId, accountId));
    }
    updateAuth(id, update) {
        return this.checkError(this.server.updateAuth(id, update));
    }
    setAuthPledged(id, pledged) {
        return this.checkError(this.server.updateAuth(id, { pledged }));
    }
    // ponies
    getPoniesCreators(accountId) {
        return this.checkError(this.server.getPoniesCreators(accountId));
    }
    getPoniesForAccount(accountId) {
        return this.checkError(this.server.getPoniesForAccount(accountId));
    }
    getPonyInfo(pony) {
        return this.server.getPonyInfo(pony._id)
            .then(data => {
            if (data) {
                pony.info = data.info;
                pony.ponyInfo = compressPony_1.decompressPonyString(data.info, false);
                pony.lastUsed = data.lastUsed ? new Date(data.lastUsed) : undefined;
                pony.creator = data.creator;
            }
        });
    }
    removePony(id) {
        return this.checkError(this.server.removePony(id));
    }
    assignPony(ponyId, accountId) {
        return this.checkError(this.server.assignPony(ponyId, accountId));
    }
    findPonies(query, page, skipTotalCount) {
        return this.checkError(this.server.findPonies(query, page, skipTotalCount));
    }
    removePoniesAboveLimit(account) {
        return this.checkError(this.server.removePoniesAboveLimit(account));
    }
    removeAllPonies(account) {
        return this.checkError(this.server.removeAllPonies(account));
    }
    createPony(accountId, name, info) {
        return this.checkError(this.server.createPony(accountId, name, info));
    }
    restorePonies(accountId, chatlog, onlyIds) {
        const ponies = adminUtils_1.parsePonies(chatlog, onlyIds);
        return Promise.all(ponies.map(({ name, info }) => this.createPony(accountId, name, info)));
    }
    // origins
    updateOrigin(origin) {
        return this.checkError(this.server.updateOrigin(origin));
    }
    removeOriginsForAccount(accountId, ips) {
        return this.checkError(this.server.removeOriginsForAccount(accountId, ips));
    }
    clearOriginsForAccount(accountId, options) {
        return this.clearOriginsForAccounts([accountId], options);
    }
    clearOriginsForAccounts(accounts, options) {
        return this.checkError(this.server.clearOriginsForAccounts(accounts, options));
    }
    clearOrigins(count, andHigher, options) {
        return this.checkError(this.server.clearOrigins(count, andHigher, options));
    }
    addOriginToAccount(accountId, origin) {
        return this.checkError(this.server.addOriginToAccount(accountId, origin));
    }
    getOriginStats() {
        return this.checkError(this.server.getOriginStats());
    }
    // accounts
    getAccount(id) {
        return this.checkError(this.server.getAccount(id));
    }
    getDetailsForAccount(account) {
        return this.checkError(this.server.getDetailsForAccount(account._id));
    }
    findAccounts(query) {
        return this.checkError(this.server.findAccounts(query));
    }
    createAccount(name = '') {
        return this.checkError(this.server.createAccount(name)
            .then(id => (console.log(`created account: [${id}]`), id)));
    }
    getAccountStatus(accountId) {
        return this.checkError(this.server.getAccountStatus(accountId));
    }
    getAccountAround(accountId) {
        return this.checkError(this.server.getAccountAround(accountId));
    }
    getAccountHidden(accountId) {
        return this.checkError(this.server.getAccountHidden(accountId));
    }
    getAccountFriends(accountId) {
        return this.checkError(this.server.getAccountFriends(accountId));
    }
    getAllDuplicatesQuickInfo(accountId) {
        return this.checkError(this.server.getAllDuplicatesQuickInfo(accountId));
    }
    getAllDuplicates(accountId) {
        return this.checkError(this.server.getAllDuplicates(accountId));
    }
    getAccountsByEmails(emails) {
        return this.checkError(this.server.getAccountsByEmails(emails));
    }
    getAccountsByOrigin(ip) {
        return this.checkError(this.server.getAccountsByOrigin(ip));
    }
    removeAccount(accountId) {
        return this.checkError(this.server.removeAccount(accountId));
    }
    setAlert(accountId, message, expiresIn) {
        return this.checkError(this.server.setAlert(accountId, message, expiresIn));
    }
    setName(accountId, name) {
        return this.checkError(this.server.setName(accountId, name));
    }
    setAge(accountId, age) {
        return this.checkError(this.server.setAge(accountId, age));
    }
    setRole(accountId, role, set) {
        return this.checkError(this.server.setRole(accountId, role, set));
    }
    setNote(accountId, note) {
        const account = this.accounts.get(accountId);
        if (account && account.note !== note) {
            account.note = note;
            account.noteUpdated = new Date();
        }
        return this.checkError(this.server.updateAccount(accountId, { note }));
    }
    setAccountFlags(accountId, flags) {
        return this.checkError(this.server.updateAccount(accountId, { flags }));
    }
    setSupporterFlags(accountId, supporter) {
        return this.checkError(this.server.updateAccount(accountId, { supporter }));
    }
    setAccountBanField(accountId, field, value) {
        return this.checkError(this.server.updateAccount(accountId, { [field]: value }, adminUtils_1.banMessage(field, value)));
    }
    setAccountTimeout(accountId, timeout) {
        return this.checkError(this.server.timeoutAccount(accountId, timeout));
    }
    setAccountCounter(accountId, name, value) {
        return this.checkError(this.server.updateAccountCounter(accountId, name, value));
    }
    updateAccount(accountId, update) {
        return this.checkError(this.server.updateAccount(accountId, update));
    }
    mergeAccounts(accountId, withId) {
        return this.checkError(this.server.mergeAccounts(accountId, withId));
    }
    unmergeAccounts(accountId, mergeId, split, keep) {
        return this.checkError(this.server.unmergeAccounts(accountId, mergeId, split, keep));
    }
    addEmail(accountId, email) {
        return this.checkError(this.server.addEmail(accountId, email));
    }
    removeEmail(accountId, email) {
        return this.checkError(this.server.removeEmail(accountId, email));
    }
    removeIgnore(accountId, ignore) {
        return this.checkError(this.server.removeIgnore(accountId, ignore));
    }
    addIgnores(accountId, ignores) {
        return this.checkError(this.server.addIgnores(accountId, ignores));
    }
    removeFriend(accountId, friendId) {
        return this.checkError(this.server.removeFriend(accountId, friendId));
    }
    addFriend(accountId, friendId) {
        return this.checkError(this.server.addFriend(accountId, friendId));
    }
    setAccountState(accountId, state) {
        return this.checkError(this.server.setAccountState(accountId, state));
    }
    getIgnoresAndIgnoredBy(accountId) {
        return this.checkError(this.server.getIgnoresAndIgnoredBy(accountId));
    }
    clearSessions(accountId) {
        return this.checkError(this.server.clearSessions(accountId));
    }
    // events
    removeEvent(eventId) {
        // return this.checkError(this.server.removeEvent(eventId))
        return this.liveEvents.remove(eventId)
            .then(() => this.callUpdated('events', false))
            .then(() => this.updateTitle())
            .catch(this.handleError);
    }
    cleanupDeletedEvents() {
        if (lodash_1.remove(this.events, e => e.deleted).length) {
            this.callUpdated('events', false);
            this.updateTitle();
        }
    }
    // state
    updateSettings(settings) {
        return this.server.updateSettings(settings)
            .then(() => this.updateState());
    }
    updateGameServerSettings(serverId, settings) {
        return this.server.updateGameServerSettings(serverId, settings)
            .then(() => this.updateState());
    }
    report(accountId) {
        return this.checkError(this.server.report(accountId));
    }
    action(action, accountId) {
        return this.checkError(this.server.action(action, accountId));
    }
    kick(accountId) {
        return this.checkError(this.server.kick(accountId));
    }
    kickAll(serverId) {
        return this.server.kickAll(serverId)
            .then(() => this.updateState());
    }
    getChat(search, date, caseInsensitive = false) {
        date = date || (new Date()).toISOString();
        return search ? this.server.getChat(search, date, caseInsensitive) : Promise.resolve('');
    }
    getChatForAccounts(accountIds, date) {
        date = date || (new Date()).toISOString();
        return accountIds.length ? this.server.getChatForAccounts(accountIds, date) : Promise.resolve('');
    }
    searchFormattedChat(search, date) {
        return this.formatChat(this.getChat(search, date, true));
    }
    accountsFormattedChat(accountIds, date) {
        return this.formatChat(this.getChatForAccounts(accountIds, date));
    }
    formatChat(promise) {
        return this.checkError(promise)
            .then(chat => chat === undefined ? 'ERROR' : chat)
            .then(raw => ({ raw, html: adminUtils_1.formatChat(raw) }));
    }
    fetchServerStats(serverId) {
        return this.checkError(this.server.fetchServerStats(serverId));
    }
    fetchServerStatsTable(serverId, stats) {
        return this.checkError(this.server.fetchServerStatsTable(serverId, stats));
    }
    notifyUpdate(server) {
        return this.server.notifyUpdate(server)
            .then(() => this.updateState())
            .catch(this.handleError);
    }
    shutdownServers(server) {
        return this.server.shutdownServers(server)
            .then(() => this.updateState())
            .catch(this.handleError);
    }
    resetUpdating(server) {
        return this.server.resetUpdating(server)
            .then(() => this.updateState())
            .catch(this.handleError);
    }
    resetSupporter(accountId) {
        return this.server.resetSupporter(accountId)
            .catch(this.handleError);
    }
    getLastPatreonData() {
        return this.server.getLastPatreonData()
            .catch(this.handleError);
    }
    updatePastSupporters() {
        return this.server.updatePastSupporters()
            .catch(this.handleError);
    }
    // other
    getTimings(server) {
        return this.server.getTimings(server)
            .catch(this.handleError);
    }
    teleportTo(accountId) {
        return this.server.teleportTo(accountId)
            .catch(this.handleError);
    }
    // helpers
    get isLowDiskSpace() {
        return parseInt(this.state.status.diskSpace || '0', 10) > 95;
    }
    get isLowMemory() {
        return parseInt(this.state.status.memoryUsage || '0', 10) > 90;
    }
    get isOldCertificate() {
        const date = this.state.status.certificateExpiration;
        return date && (new Date(date)).getTime() < utils_1.fromNow(7 * constants_1.DAY).getTime();
    }
    get isOldPatreon() {
        const date = this.state.status.lastPatreonUpdate;
        return date && (new Date(date)).getTime() < utils_1.fromNow(-21 * constants_1.MINUTE).getTime();
    }
    requestState() {
        return this.socket.isConnected ? this.server.getState().then(s => this.readState(s)) : Promise.resolve();
    }
    readState(state) {
        lodash_1.merge(this.state, state);
        this.initialized = true;
        this.updateTitle();
    }
    updateState() {
        if (!this.running)
            return;
        clearTimeout(this.updateStateTimeout);
        this.requestState()
            .catch((e) => console.error(e.stack))
            .then(() => {
            this.updateStateTimeout = setTimeout(() => this.updateState(), 1000);
        });
    }
    callUpdated(list, added) {
        if (this.updated) {
            this.updated(list, added);
        }
    }
    updateTitle() {
        const ponies = this.state.gameServers.reduce((sum, s) => sum + s.online, 0);
        const count = this.events.reduce((sum, e) => sum + (e.deleted ? 0 : 1), 0);
        const inred = this.events.reduce((sum, e) => sum + ((!e.deleted && e.count > 9) ? 1 : 0), 0);
        const flag = this.isLowDiskSpace || this.isLowMemory || this.isOldCertificate || this.isOldPatreon;
        document.title = `${ponies} | ${count}${lodash_1.repeat('!', inred)}${flag ? ' 🚩' : ''}${!this.connected ? ' ⚠' : ''} | Pony Town`;
    }
    notify(title, body) {
        if (this.notifications && notification.permission === 'granted') {
            const n = new notification(title, {
                body: body || '',
                icon: rev_1.getUrl('images/logo-120.png'),
            });
            n.onclick = () => {
                window.focus();
                n.close();
            };
            n.onshow = () => {
                setTimeout(() => n.close(), 4000);
            };
        }
    }
};
AdminModel = tslib_1.__decorate([
    core_1.Injectable({ providedIn: 'root' }),
    tslib_1.__metadata("design:paramtypes", [platform_browser_1.DomSanitizer, storageService_1.StorageService, core_1.NgZone])
], AdminModel);
exports.AdminModel = AdminModel;
function decodeDate(value, base) {
    if (value == null || base == null) {
        return new Date(0);
    }
    else {
        const d = new Date(base);
        d.setTime(d.getTime() + value);
        return d;
    }
}
function decodeEvent(values, base) {
    return {
        _id: values[0],
        updatedAt: decodeDate(values[1], base.updatedAt),
        createdAt: decodeDate(values[2], base.createdAt),
        type: values[3],
        server: values[4],
        message: values[5],
        desc: values[6],
        count: values[7] | 0,
        origin: values[8],
        account: values[9],
        pony: values[10],
    };
}
exports.decodeEvent = decodeEvent;
//# sourceMappingURL=adminModel.js.map