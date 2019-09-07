"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const moment = require("moment");
const ag_sockets_1 = require("ag-sockets");
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const accountUtils_1 = require("../common/accountUtils");
const serverUtils_1 = require("./serverUtils");
const db_1 = require("./db");
const admin_accounts_1 = require("./api/admin-accounts");
const admin_1 = require("./api/admin");
const ponies_1 = require("./api/ponies");
const internal_1 = require("./internal");
const reporter_1 = require("./reporter");
const logger_1 = require("./logger");
const polling_1 = require("./polling");
const adminService_1 = require("./services/adminService");
const origins_1 = require("./api/origins");
const duplicates_1 = require("./api/duplicates");
const merge_1 = require("./api/merge");
const admin_auths_1 = require("./api/admin-auths");
const patreon_1 = require("./patreon");
const accountUtils_2 = require("./accountUtils");
let AdminServerActions = class AdminServerActions {
    constructor(client, server, settings, adminService, endPoints, removedDocument) {
        this.client = client;
        this.server = server;
        this.settings = settings;
        this.adminService = adminService;
        this.endPoints = endPoints;
        this.removedDocument = removedDocument;
        this.cache = {};
        this.subscriptions = new Map();
        // subscribing
        this.updates = [];
        this.account = client.tokenData.account;
        this.subscriptions.set('account:deleted', this.adminService.accountDeleted.subscribe(account => {
            if (this.cache.findAccounts) {
                utils_1.removeItem(this.cache.findAccounts.result, account);
            }
        }));
    }
    disconnected() {
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        clearTimeout(this.updatesTimeout);
    }
    // other
    async getSignedAccount() {
        return serverUtils_1.toAccountData(this.account);
    }
    async getCounts() {
        const characters = await Promise.resolve(db_1.Character.estimatedDocumentCount());
        return {
            characters,
            accounts: this.adminService.accounts.items.length,
            auths: this.adminService.auths.items.length,
            origins: this.adminService.origins.items.length,
        };
    }
    async getOtherStats() {
        return await admin_1.getOtherStats(this.adminService);
    }
    pushUpdate(type, id, update) {
        const index = this.updates.findIndex(u => u.type === type && u.id === id);
        if (index !== -1) {
            this.updates[index].update = update;
        }
        else {
            this.updates.push({ type, id, update });
        }
        if (!this.updatesTimeout) {
            this.updatesTimeout = setTimeout(() => {
                this.client.updates(this.updates);
                this.updates = [];
                this.updatesTimeout = 0;
            }, 50);
        }
    }
    subscribe(type, id) {
        const key = `${type}:${id}`;
        if (this.subscriptions.has(key))
            return;
        if (type === 'ponies') {
            if (!this.adminService.ponies.get(id)) {
                this.adminService.ponies.fetch({ _id: id });
            }
        }
        let subscription;
        if (type === 'accountAuths') {
            subscription = this.adminService.subscribeToAccountAuths(id, update => this.pushUpdate(type, id, update));
        }
        else if (type === 'accountOrigins') {
            subscription = this.adminService.subscribeToAccountOrigins(id, update => this.pushUpdate(type, id, update));
        }
        else if (type === 'accountPonies') {
            subscription = this.adminService.subscribeToAccountPonies(id, update => this.pushUpdate(type, id, update));
        }
        else if (type in this.adminService) {
            subscription = this.adminService[type].subscribe(id, (id, update) => this.pushUpdate(type, id, update));
        }
        else {
            throw new Error(`Invalid model type (${type})`);
        }
        if (subscription) {
            this.subscriptions.set(key, subscription);
        }
    }
    unsubscribe(type, id) {
        const key = `${type}:${id}`;
        const subscription = this.subscriptions.get(key);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(key);
            if (type === 'ponies') {
                this.adminService.cleanupPony(id);
            }
            else if (type === 'accountPonies') {
                this.adminService.cleanupPoniesList(id);
            }
        }
    }
    // state
    async clearSessions(accountId) {
        await admin_1.clearSessions(accountId);
    }
    async getState() {
        return admin_1.getAdminState();
    }
    async updateSettings(update) {
        await admin_1.updateServerSettings(this.settings, update);
    }
    async updateGameServerSettings(serverId, update) {
        await admin_1.updateGameServerSettings(this.settings, serverId, update);
    }
    async fetchServerStats(serverId) {
        const server = internal_1.getServer(serverId);
        return await server.api.stats();
    }
    async fetchServerStatsTable(serverId, stats) {
        const server = internal_1.getServer(serverId);
        return await server.api.statsTable(stats);
    }
    async report(accountId) {
        reporter_1.create(this.server, accountId).info(`Reported by ${this.account.name}`);
    }
    async notifyUpdate(server) {
        await admin_1.notifyUpdate(server);
    }
    async shutdownServers(server) {
        await admin_1.shutdownServers(server, true);
    }
    async resetUpdating(server) {
        await admin_1.resetUpdating(server);
    }
    async action(action, accountId) {
        await admin_1.actionForAllServers(action, accountId);
    }
    async kick(accountId) {
        await admin_1.kickFromAllServers(accountId);
    }
    async kickAll(serverId) {
        const server = internal_1.getServer(serverId);
        await server.api.kickAll();
    }
    async getChat(search, date, caseInsensitive) {
        return await admin_1.getChat(search, date, caseInsensitive);
    }
    async getChatForAccounts(accountIds, date) {
        return await admin_1.getChatForAccounts(accountIds, date);
    }
    async getRequestStats() {
        const loginServer = internal_1.getLoginServer('login');
        const requests = await loginServer.api.loginServerStats();
        const userCounts = await admin_1.getUserCounts();
        return { requests, userCounts };
    }
    // live (remove)
    async get(endPoint, id) {
        // console.log('get', endPoint);
        // return this.adminService[endPoint].get(id);
        return await this.endPoints[endPoint].get(id);
    }
    async getAll(endPoint, timestamp) {
        return await this.endPoints[endPoint].getAll(timestamp);
    }
    async assignAccount(endPoint, id, account) {
        return await this.endPoints[endPoint].assignAccount(id, account);
    }
    async removeItem(endPoint, id) {
        return await this.endPoints[endPoint].removeItem(id);
    }
    // events
    async removeEvent(id) {
        await this.adminService.events.remove(id);
        await this.endPoints.events.removedItem(id);
    }
    // origins
    async updateOrigin(origin) {
        await admin_1.updateOrigin(origin);
    }
    async getOriginStats() {
        return await origins_1.getOriginStats(this.adminService.accounts.items);
    }
    async clearOrigins(count, andHigher, options) {
        if (!this.adminService.loaded) {
            throw new Error('Not loaded yet');
        }
        else {
            await origins_1.clearOrigins(this.adminService, count, andHigher, options);
        }
    }
    async clearOriginsForAccounts(accounts, options) {
        if (!this.adminService.loaded) {
            throw new Error('Not loaded yet');
        }
        else {
            await origins_1.clearOriginsForAccounts(this.adminService, accounts, options);
        }
    }
    // ponies
    async getPony(id) {
        return await db_1.Character.findById(id).exec().then(db_1.nullToUndefined);
    }
    async getPonyInfo(id) {
        const character = await db_1.findCharacterById(id);
        return serverUtils_1.toPonyObjectAdmin(character);
    }
    async getPoniesCreators(account) {
        const items = await db_1.Character.find({ account }, '_id name creator').lean().exec();
        return items.map(({ _id, name, creator }) => ({ _id, name, creator }));
    }
    async getPoniesForAccount(account) {
        return await db_1.Character.find({ account }).lean().exec();
    }
    async getDetailsForAccount(accountId) {
        return await admin_1.getAccountDetails(accountId);
    }
    async findPonies(query, page, _skipTotalCount) {
        return await ponies_1.findPonies(query, page);
    }
    async createPony(account, name, info) {
        await ponies_1.createCharacter(account, name, info);
        logger_1.system(account, `Created character (${name}) ${this.by()}`);
    }
    async assignPony(ponyId, accountId) {
        await ponies_1.assignCharacter(ponyId, accountId);
    }
    async removePony(id) {
        await ponies_1.removeCharacter(this.adminService, id);
    }
    async removePoniesAboveLimit(account) {
        await ponies_1.removeCharactersAboveLimit(this.removedDocument, account);
        logger_1.system(account, `Removed ponies above limit ${this.by()}`);
    }
    async removeAllPonies(account) {
        await ponies_1.removeAllCharacters(this.removedDocument, account);
        logger_1.system(account, `Removed all ponies ${this.by()}`);
    }
    // auths
    async getAuth(id) {
        return await db_1.Auth.findById(id).exec().then(db_1.nullToUndefined);
    }
    async getAuthsForAccount(accountId) {
        return await db_1.Auth.find({ account: accountId }).exec();
    }
    async fetchAuthDetails(auths) {
        const items = await db_1.queryAuths({ _id: { $in: auths } }, '_id lastUsed');
        return items.map(a => ({
            id: a._id.toString(),
            lastUsed: a.lastUsed && a.lastUsed.toISOString(),
        }));
    }
    async updateAuth(id, update) {
        const auth = await db_1.Auth.findById(id).exec();
        await throwOnAdmin(auth && auth.account);
        await db_1.updateAuth(id, update);
    }
    async assignAuth(authId, accountId) {
        await admin_auths_1.assignAuth(authId, accountId);
    }
    async removeAuth(id) {
        await admin_auths_1.removeAuth(this.adminService, id);
    }
    // accounts
    async getAccount(id) {
        return await db_1.findAccount(id);
    }
    async findAccounts(query) {
        return await admin_accounts_1.findAccounts(this.cache, this.adminService, query);
    }
    async createAccount(name) {
        const account = await db_1.Account.create({ name });
        logger_1.system(account._id.toString(), `Created account ${this.by()}`);
        return account._id.toString();
    }
    async getAccountsByEmails(emails) {
        return admin_accounts_1.getAccountsByEmails(this.adminService, emails);
    }
    async getAccountsByOrigin(ip) {
        return admin_accounts_1.getAccountsByOrigin(this.adminService, ip);
    }
    async setName(accountId, name) {
        await admin_accounts_1.updateAccountSafe(accountId, { name });
        logger_1.system(accountId, `Updated name (${name}) ${this.by()}`);
    }
    async setAge(accountId, age) {
        if (age === -1) {
            await db_1.Account.updateOne({ _id: accountId }, { $unset: { birthyear: 1 } }).exec();
        }
        else {
            const birthyear = (new Date()).getFullYear() - age;
            await db_1.Account.updateOne({ _id: accountId }, { birthyear }).exec();
        }
        logger_1.system(accountId, `Updated birth year (${age}) ${this.by()}`);
    }
    async setRole(accountId, role, set) {
        await admin_accounts_1.setRole(accountId, role, set, accountUtils_1.hasRole(this.account, 'superadmin'));
        logger_1.system(accountId, `${set ? 'Added' : 'Removed'} role (${role}) ${this.by()}`);
    }
    async updateAccount(accountId, update, message) {
        await admin_accounts_1.updateAccountSafe(accountId, update);
        if (message) {
            logger_1.system(accountId, `${message} ${this.by()}`);
        }
    }
    async timeoutAccount(accountId, timeout) {
        const message = timeout ? `Timed out ${moment.duration(timeout).humanize()}` : 'Unmuted';
        logger_1.system(accountId, `${message} ${this.by()}`);
        await admin_accounts_1.timeoutAccount(accountId, utils_1.fromNow(timeout | 0));
    }
    async updateAccountCounter(accountId, name, value) {
        await admin_accounts_1.updateAccountCounter(accountId, name, value);
    }
    async mergeAccounts(accountId, withId) {
        const server = internal_1.getLoginServer('login');
        await server.api.mergeAccounts(accountId, withId, this.by(), accountUtils_1.hasRole(this.account, 'superadmin'), true);
    }
    async unmergeAccounts(accountId, mergeId, split, keep) {
        await merge_1.splitAccounts(accountId, mergeId, split, keep, this.by());
    }
    async getAccountStatus(accountId) {
        return await internal_1.accountStatus(accountId);
    }
    async getAccountAround(accountId) {
        return await internal_1.accountAround(accountId);
    }
    async getAccountHidden(accountId) {
        return await internal_1.accountHidden(accountId);
    }
    async getAccountFriends(accountId) {
        return db_1.findFriendIds(accountId);
    }
    async removeAccount(accountId) {
        await admin_accounts_1.removeAccount(this.adminService, accountId);
    }
    async setAlert(accountId, message, expiresIn) {
        await admin_accounts_1.setAccountAlert(accountId, message, utils_1.fromNow(expiresIn));
        logger_1.system(accountId, `${expiresIn ? 'Set' : 'Unset'} alert for ${utils_1.formatDuration(expiresIn)} "${message}" ${this.by()}`);
    }
    // accounts - origins
    async removeAllOrigins(accountId) {
        await origins_1.removeAllOrigins(this.adminService, accountId);
    }
    async removeOriginsForAccount(accountId, ips) {
        await origins_1.removeOrigins(this.adminService, accountId, ips);
    }
    async removeOriginsForAccounts(origins) {
        await Promise.all(origins.map(o => origins_1.removeOrigins(this.adminService, o.accountId, o.ips)));
    }
    async addOriginToAccount(accountId, origin) {
        if (origin && origin.ip && origin.country) {
            await origins_1.addOrigin(accountId, origin);
            logger_1.system(accountId, `Added origin (${JSON.stringify(origin)}) ${this.by()}`);
        }
        else {
            throw new Error('Invalid origin');
        }
    }
    // accounts - emails
    async addEmail(accountId, email) {
        await admin_accounts_1.addEmail(accountId, email);
        logger_1.system(accountId, `Added email (${email}) ${this.by()}`);
    }
    async removeEmail(accountId, email) {
        await admin_accounts_1.removeEmail(accountId, email);
        logger_1.system(accountId, `Removed email (${email}) ${this.by()}`);
    }
    // accounts - ignores
    async removeIgnore(accountId, ignore) {
        await admin_accounts_1.removeIgnore(accountId, ignore);
    }
    async addIgnores(accountId, ignores) {
        await admin_accounts_1.addIgnores(accountId, ignores);
    }
    async setAccountState(accountId, state) {
        await admin_accounts_1.setAccountState(accountId, state);
    }
    async getIgnoresAndIgnoredBy(accountId) {
        const [ignores, ignoredBy] = await Promise.all([
            db_1.Account
                .find({ ignores: { $in: [accountId] } }, '_id')
                .lean()
                .exec()
                .then((accounts) => accounts.map(a => a._id.toString())),
            db_1.Account
                .findOne({ _id: accountId }, 'ignores')
                .lean()
                .exec()
                .then((account) => account && account.ignores || []),
        ]);
        return { ignores, ignoredBy };
    }
    // accounts - friends
    async removeFriend(accountId, friendId) {
        await accountUtils_2.removeFriend(accountId, friendId);
    }
    async addFriend(accountId, friendId) {
        await accountUtils_2.addFriend(accountId, friendId);
    }
    // accounts - duplicates
    async getAllDuplicatesQuickInfo(accountId) {
        return await duplicates_1.getAllDuplicatesQuickInfo(this.adminService, accountId);
    }
    async getAllDuplicates(accountId) {
        return await duplicates_1.getAllDuplicatesWithInfo(this.adminService, accountId);
    }
    async getDuplicateEntries(force) {
        return await duplicates_1.getDuplicateEntries(this.adminService.accounts.items, force);
    }
    // patreon
    async updatePatreon() {
        await polling_1.updatePatreonData(this.server, this.settings);
    }
    async resetSupporter(accountId) {
        await db_1.Account.updateOne({ _id: accountId }, { $unset: { supporter: 1, patreon: 1, supporterDeclinedSince: 1 } }).exec();
    }
    async getLastPatreonData() {
        const data = await patreon_1.getLastPatreonData();
        // if (data) {
        // 	data.pledges.forEach(pledge => {
        // 		const auth = this.adminService.auths.items.find(a => a.openId === pledge.user);
        // 		pledge.account = auth && auth.account;
        // 	});
        // }
        return data;
    }
    async updatePastSupporters() {
        await polling_1.updatePastSupporters();
    }
    // other
    async getTimings(serverId) {
        const server = internal_1.getServer(serverId);
        return server.api.getTimings();
    }
    async teleportTo(accountId) {
        const adminAccountId = this.account._id.toString();
        await admin_1.forAllGameServers(server => server.api.teleportTo(adminAccountId, accountId));
    }
    // utils
    by() {
        return `by ${this.account.name} [${this.account._id}]`;
    }
};
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getSignedAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getCounts", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getOtherStats", null);
tslib_1.__decorate([
    ag_sockets_1.Method(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", void 0)
], AdminServerActions.prototype, "subscribe", null);
tslib_1.__decorate([
    ag_sockets_1.Method(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", void 0)
], AdminServerActions.prototype, "unsubscribe", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "clearSessions", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getState", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "updateSettings", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "updateGameServerSettings", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "fetchServerStats", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Number]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "fetchServerStatsTable", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "report", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "notifyUpdate", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "shutdownServers", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "resetUpdating", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "action", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "kick", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "kickAll", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, Boolean]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getChat", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getChatForAccounts", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getRequestStats", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "get", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAll", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "assignAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeItem", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeEvent", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "updateOrigin", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getOriginStats", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Boolean, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "clearOrigins", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "clearOriginsForAccounts", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getPony", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getPonyInfo", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getPoniesCreators", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getPoniesForAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getDetailsForAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Number, Boolean]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "findPonies", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "createPony", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "assignPony", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removePony", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removePoniesAboveLimit", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeAllPonies", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAuth", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAuthsForAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "fetchAuthDetails", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "updateAuth", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "assignAuth", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeAuth", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "findAccounts", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "createAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAccountsByEmails", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAccountsByOrigin", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "setName", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Number]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "setAge", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, Boolean]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "setRole", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "updateAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Number]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "timeoutAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object, Number]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "updateAccountCounter", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "mergeAccounts", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "unmergeAccounts", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAccountStatus", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAccountAround", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAccountHidden", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAccountFriends", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, Number]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "setAlert", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeAllOrigins", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Array]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeOriginsForAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeOriginsForAccounts", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "addOriginToAccount", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "addEmail", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeEmail", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeIgnore", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Array]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "addIgnores", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "setAccountState", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getIgnoresAndIgnoredBy", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "removeFriend", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "addFriend", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAllDuplicatesQuickInfo", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getAllDuplicates", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Boolean]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getDuplicateEntries", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "updatePatreon", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "resetSupporter", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getLastPatreonData", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "updatePastSupporters", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "getTimings", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], AdminServerActions.prototype, "teleportTo", null);
AdminServerActions = tslib_1.__decorate([
    ag_sockets_1.Socket({
        id: 'admin',
        path: '/ws-admin',
        connectionTokens: true,
        tokenLifetime: 12 * constants_1.HOUR,
        perMessageDeflate: false,
    }),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Object, adminService_1.AdminService, Object, Function])
], AdminServerActions);
exports.AdminServerActions = AdminServerActions;
async function throwOnAdmin(account) {
    if (account) {
        const isAdmin = await db_1.checkIfAdmin(account);
        if (isAdmin) {
            throw new Error('Cannot change for admin user');
        }
    }
}
//# sourceMappingURL=adminServerActions.js.map