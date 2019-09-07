"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const http_1 = require("@angular/common/http");
const lodash_1 = require("lodash");
const rxjs_1 = require("rxjs");
const hash_1 = require("../../generated/hash");
const ponyInfo_1 = require("../../common/ponyInfo");
const utils_1 = require("../../common/utils");
const accountUtils_1 = require("../../common/accountUtils");
const errors_1 = require("../../common/errors");
const data_1 = require("../../client/data");
const clientUtils_1 = require("../../client/clientUtils");
const errorReporter_1 = require("./errorReporter");
const stringUtils_1 = require("../../common/stringUtils");
const storageService_1 = require("./storageService");
const compressPony_1 = require("../../common/compressPony");
const constants_1 = require("../../common/constants");
const tags_1 = require("../../common/tags");
const LIMIT_ERROR = 'Request limit reached, please wait';
const noneSite = { id: '', name: 'none', url: '', icon: '', color: '#222' };
const modStatus = {
    mod: false,
    check: {},
    editor: {
        names: [],
        typeToName: [],
        nameToTypes: [],
    },
};
function compareStrings(a, b) {
    return (a || '').localeCompare(b || '');
}
function comparePonies(a, b) {
    return compareStrings(a.name, b.name) || compareStrings(a.id, b.id);
}
function getDefaultPony(ponies) {
    let result = ponies[0];
    for (let i = 1; i < ponies.length; i++) {
        if (compareStrings(result.lastUsed, ponies[i].lastUsed) < 0) {
            result = ponies[i];
        }
    }
    return result || createDefaultPonyObject();
}
function createDefaultPonyObject() {
    return {
        id: '',
        name: '',
        info: '',
        ponyInfo: ponyInfo_1.createDefaultPony(),
    };
}
exports.createDefaultPonyObject = createDefaultPonyObject;
function getPonyTag(pony, account) {
    if (account) {
        const tag = tags_1.canUseTag(account, pony.tag || '') ? pony.tag : undefined;
        return (!tag && account.supporter && !pony.hideSupport) ? `sup${account.supporter}` : tag;
    }
    else {
        return undefined;
    }
}
exports.getPonyTag = getPonyTag;
const entityTypeToName = new Map();
const entityNameToTypes = new Map();
function getEntityNames() {
    return modStatus.editor.names;
}
exports.getEntityNames = getEntityNames;
function getEntityTypesFromName(name) {
    return entityNameToTypes.get(name);
}
exports.getEntityTypesFromName = getEntityTypesFromName;
function getEntityNameFromType(type) {
    return entityTypeToName.get(type);
}
exports.getEntityNameFromType = getEntityNameFromType;
function compareFriends(a, b) {
    return a.online !== b.online ? (a.online ? -1 : 1) : a.accountName.localeCompare(b.accountName);
}
exports.compareFriends = compareFriends;
let Model = class Model {
    constructor(http, router, storage, errorReporter) {
        this.http = http;
        this.router = router;
        this.storage = storage;
        this.errorReporter = errorReporter;
        this.loading = true;
        this.ponies = [];
        this.pending = false;
        this.sites = [noneSite];
        this.accountChanged = new rxjs_1.Subject();
        this.protectionErrors = new rxjs_1.Subject();
        this.mergedAccount = false;
        this.updating = false;
        this.updatingTakesLongTime = false;
        this.suffix = '';
        this.friends = undefined;
        this._pony = createDefaultPonyObject();
        this.initialize();
        // handle completed sign-in
        if (typeof window !== 'undefined') {
            window.addEventListener('message', event => {
                if (event.data && event.data.type === 'loaded-page') {
                    const path = event.data.path;
                    if (event.source && 'close' in event.source) {
                        event.source.close();
                    }
                    this.initialize();
                    this.accountPromise.then(() => router.navigateByUrl(path));
                }
            });
        }
        if (DEVELOPMENT) {
            clientUtils_1.attachDebugMethod('ddos', () => this.protectionErrors.next());
            clientUtils_1.attachDebugMethod('userModel', this);
        }
    }
    initialize() {
        this.loading = true;
        this.account = undefined;
        this.loadingError = undefined;
        this.accountAlert = undefined;
        this.ponies = [];
        this.friends = undefined;
        this.sites = [noneSite];
        this._pony = createDefaultPonyObject();
        this.storage.setItem('bid', this.storage.getItem('bid') || stringUtils_1.randomString(20));
        this.accountPromise = this.initializeAccount();
    }
    initializeAccount() {
        return this.getAccount()
            .then(account => {
            if (!account) {
                throw new Error(errors_1.ACCESS_ERROR);
            }
            if ('limit' in account) {
                throw new Error(LIMIT_ERROR);
            }
            this.errorReporter.configureUser({ id: account.id, username: account.name });
            try {
                modStatus.mod = accountUtils_1.isMod(account);
                modStatus.check = account.check;
                modStatus.editor = account.editor || modStatus.editor;
            }
            catch (_a) { }
            if (modStatus.editor) {
                modStatus.editor.typeToName.forEach(({ type, name }) => entityTypeToName.set(type, name));
                modStatus.editor.nameToTypes.forEach(({ types, name }) => entityNameToTypes.set(name, types));
            }
            this.account = account;
            this.sites = [noneSite, ...(account.sites || []).map(clientUtils_1.toSocialSiteInfo)];
            this.ponies = account.ponies ? account.ponies.sort(comparePonies) : [];
            this.friends = undefined;
            this.selectPony(getDefaultPony(this.ponies));
            this.storage.setItem('vid', account.id);
            this.loading = false;
            this.accountAlert = account.alert;
            this.accountChanged.next();
            this.fetchFriends();
            return account;
        })
            .catch((e) => {
            if (e.message === errors_1.ACCESS_ERROR) {
                this.loading = false;
                this.storage.setItem('vid', '---');
            }
            else if (e.message === LIMIT_ERROR) {
                this.loadingError = 'request-limit';
                return utils_1.delay(5000).then(() => this.initializeAccount());
            }
            else if (e.message === errors_1.OFFLINE_ERROR) {
                this.loadingError = 'cannot-connect';
                return utils_1.delay(5000).then(() => this.initializeAccount());
            }
            else if (e.message === errors_1.PROTECTION_ERROR) {
                this.loadingError = 'cloudflare-error';
                this.protectionErrors.next();
                // } else if (e.message === VERSION_ERROR) {
                // 	this.updating = true;
            }
            else {
                setTimeout(() => this.loadingError = 'unexpected-error', 5 * constants_1.SECOND);
                console.error(e);
            }
            return undefined;
        });
    }
    fetchFriends() {
        this.getFriends()
            .then(friends => {
            this.friends = friends.map(f => (Object.assign({}, f, { online: false, entityId: 0, crc: 0, ponyInfo: f.pony && compressPony_1.decodePonyInfo(f.pony, ponyInfo_1.mockPaletteManager) || undefined, actualName: '' }))).sort(compareFriends);
        })
            .catch(e => {
            DEVELOPMENT && console.error(e);
            setTimeout(() => this.fetchFriends(), 5000);
        });
    }
    get characterLimit() {
        return this.account ? accountUtils_1.getCharacterLimit(this.account) : 0;
    }
    get supporterInviteLimit() {
        return this.account ? accountUtils_1.getSupporterInviteLimit(this.account) : 0;
    }
    get isMod() {
        return modStatus.mod;
    }
    get modCheck() {
        return modStatus.check;
    }
    get editorInfo() {
        return modStatus.editor;
    }
    get pony() {
        return this._pony;
    }
    get supporter() {
        return this.account && this.account.supporter || 0;
    }
    get missingBirthdate() {
        return !!this.account && !this.account.birthdate;
    }
    computeFriendsCRC() {
        return this.friends ? utils_1.computeFriendsCRC(this.friends.map(f => f.accountId)) : 0;
    }
    parsePonyObject(pony) {
        try {
            const ponyInfo = compressPony_1.decompressPonyString(pony.info, true);
            return Object.assign({ ponyInfo }, pony);
        }
        catch (e) {
            this.errorReporter.reportError(e, { ponyInfo: pony.info });
            this.errorReporter.reportError('Pony info reading error', { originalError: e.message, ponyInfo: pony.info });
            throw new Error('Error while reading pony info');
        }
    }
    selectPony(pony) {
        const copy = this.parsePonyObject(pony);
        copy.ponyInfo && ponyInfo_1.syncLockedPonyInfo(copy.ponyInfo);
        this._pony = copy;
    }
    // account
    signIn(provider) {
        this.authError = undefined;
        this.openAuth(provider.url);
    }
    connectSite(provider) {
        this.authError = undefined;
        this.openAuth(`${provider.url}/merge`);
    }
    signOut() {
        this.authError = undefined;
        return this.post('/auth/sign-out', {}, false)
            .catch(e => console.error(e))
            .then(() => this.initialize())
            .then(() => this.router.navigate(['/']));
    }
    openAuth(url) {
        url = `${data_1.host.replace(/\/$/, '')}${url}`;
        if (clientUtils_1.isStandalone()) {
            window.open(url);
        }
        else {
            location.href = url;
        }
    }
    getAccount() {
        return this.post('/api1/account', {}, false);
    }
    getAccountCharacters() {
        return this.post('/api/account-characters', {});
    }
    updateAccount(account) {
        return this.post('/api/account-update', { account })
            .then(a => lodash_1.merge(this.account, a));
    }
    saveSettings(settings) {
        return this.post('/api/account-settings', { settings })
            .then(a => lodash_1.merge(this.account, a));
    }
    removeSite(siteId) {
        return this.post('/api/remove-site', { siteId })
            .then(() => {
            if (this.account && this.account.sites) {
                utils_1.removeById(this.account.sites, siteId);
            }
        });
    }
    unhidePlayer(hideId) {
        return this.post('/api/remove-hide', { hideId });
    }
    verifyAccount() {
        const verificationId = this.storage.getItem('vid');
        const accountId = this.account && this.account.id || '---';
        if (!this.loading && verificationId && accountId !== verificationId) {
            this.initialize();
        }
    }
    getHides(page) {
        return this.post('/api/get-hides', { page });
    }
    getFriends() {
        return this.post('/api/get-friends', {});
    }
    // ponies
    savePony(pony, fast = false) {
        return Promise.resolve()
            .then(() => {
            if (this.pending) {
                throw new Error('Saving in progress');
            }
            pony.name = clientUtils_1.cleanName(pony.name);
            pony.desc = pony.desc && pony.desc.substr(0, constants_1.PLAYER_DESC_MAX_LENGTH) || '';
            if (!clientUtils_1.validatePonyName(pony.name)) {
                throw new Error(errors_1.NAME_ERROR);
            }
            if (pony.ponyInfo) {
                pony.info = compressPony_1.compressPonyString(pony.ponyInfo);
            }
            const { id, name, desc, site, tag, info, hideSupport, respawnAtSpawn } = pony;
            if (!fast) {
                this.pending = true;
            }
            return this.post('/api/pony/save', {
                pony: { id, name, desc, site, tag, info, hideSupport, respawnAtSpawn }
            });
        })
            .catch((e) => {
            if (e.message === errors_1.CHARACTER_SAVING_ERROR) {
                this.errorReporter.reportError(e, { pony });
            }
            throw e;
        })
            .then(newPony => {
            if (!newPony) {
                throw new Error('Failed to save pony');
            }
            if (pony.id) {
                utils_1.removeById(this.ponies, pony.id);
            }
            else {
                this.account.characterCount++;
            }
            this.ponies.push(newPony);
            this.ponies.sort(comparePonies);
            if (this.pony === pony) {
                this.selectPony(newPony);
            }
            return newPony;
        })
            .finally(() => this.pending = false);
    }
    removePony(pony) {
        return this.post('/api/pony/remove', { id: pony.id })
            .then(() => {
            utils_1.removeById(this.ponies, pony.id);
            this.account.characterCount--;
            if (this.pony === pony) {
                this.selectPony(getDefaultPony(this.ponies));
            }
        });
    }
    loadPonies() {
        return this.getAccountCharacters()
            .then(ponies => {
            if (this.account) {
                this.account.ponies = ponies || [];
                this.ponies = this.account.ponies.sort(comparePonies);
            }
        });
    }
    sortPonies() {
        this.ponies.sort(comparePonies);
    }
    // game
    status(short) {
        let age = 6;
        if (this.account) {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            if (this.account.birthyear) {
                age = currentYear - this.account.birthyear;
            }
            else if (this.account.birthdate) {
                const [year, month] = this.account.birthdate.split('-');
                const before = parseInt(month, 10) > currentMonth;
                age = Math.max(0, currentYear - parseInt(year, 10) - (before ? 1 : 0));
            }
        }
        const params = new http_1.HttpParams()
            .set('short', short.toString())
            .set('d', age.toString())
            .set('t', (Date.now() % 0x10000).toString(16));
        return utils_1.observableToPromise(this.http.get('/api2/game/status', { params }));
    }
    join(serverId, ponyId) {
        if (this.pending)
            return Promise.reject(new Error('Joining in progress'));
        if (!serverId)
            return Promise.reject(new Error('Invalid server ID'));
        if (!ponyId)
            return Promise.reject(new Error('Invalid pony ID'));
        this.pending = true;
        const alert = !!this.accountAlert ? 'y' : '';
        return this.post('/api/game/join', { version: data_1.version, ponyId, serverId, alert, url: location.href })
            .finally(() => this.pending = false);
    }
    post(url, data, authenticate = true) {
        if (authenticate) {
            if (!this.account) {
                return Promise.reject(new Error(errors_1.NOT_AUTHENTICATED_ERROR));
            }
            const accountId = this.account.id + this.suffix;
            const accountName = this.account.name + this.suffix;
            data = Object.assign({ accountId, accountName }, data);
        }
        const params = new http_1.HttpParams()
            .set('t', (Date.now() % 0x10000).toString(16));
        const headers = new http_1.HttpHeaders({ 'api-version': hash_1.HASH, 'api-bid': this.storage.getItem('bid') || '-' });
        return utils_1.observableToPromise(this.http.post(url, data, { params, headers }));
    }
};
Model = tslib_1.__decorate([
    core_1.Injectable({ providedIn: 'root' }),
    tslib_1.__metadata("design:paramtypes", [http_1.HttpClient,
        router_1.Router,
        storageService_1.StorageService,
        errorReporter_1.ErrorReporter])
], Model);
exports.Model = Model;
//# sourceMappingURL=model.js.map