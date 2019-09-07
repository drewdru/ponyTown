"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const lodash_1 = require("lodash");
const adminInterfaces_1 = require("../../../common/adminInterfaces");
const adminUtils_1 = require("../../../common/adminUtils");
const accountUtils_1 = require("../../../common/accountUtils");
const adminModel_1 = require("../../services/adminModel");
const icons_1 = require("../../../client/icons");
const utils_1 = require("../../../common/utils");
const htmlUtils_1 = require("../../../client/htmlUtils");
const defaultLimit = 15;
const defaultDuplicatesLimit = 10;
const year = (new Date()).getFullYear();
let AdminAccountDetails = class AdminAccountDetails {
    constructor(route, model) {
        this.route = route;
        this.model = model;
        this.cogIcon = icons_1.faCog;
        this.syncIcon = icons_1.faSync;
        this.langIcon = icons_1.faLanguage;
        this.trashIcon = icons_1.faTrash;
        this.signOutIcon = icons_1.faSignOutAlt;
        this.duplicateNoteIcon = icons_1.faExclamationCircle;
        this.duplicateBrowserIcon = icons_1.faGlobe;
        this.duplicateBrowserIdIcon = icons_1.faIdBadge;
        this.duplicateEmailIcon = icons_1.faEnvelope;
        this.duplicateNameIcon = icons_1.faFont;
        this.duplicateBirthdateIcon = icons_1.faCalendar;
        this.mergeIcon = icons_1.faCompressArrowsAlt;
        this.commentIcon = icons_1.faComment;
        this.partyIcon = icons_1.faUsers;
        this.checkIcon = icons_1.faCheckCircle;
        this.consoleIcon = icons_1.faTerminal;
        this.spinnerIcon = icons_1.faSpinner;
        this.dataIcon = icons_1.faDatabase;
        this.copyIcon = icons_1.faCopy;
        this.roles = adminInterfaces_1.ROLES;
        this.ages = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
        this.auths = [];
        this.origins = [];
        this.counters = [];
        this.authLimit = defaultLimit;
        this.emailLimit = defaultLimit;
        this.loadingDuplicates = false;
        this.clearingSessions = false;
        this.restoringPonies = false;
        this.poniesToRestore = '';
        this.poniesToRestoreFilter = '';
        this.friendsLimit = defaultLimit;
        this.hiddenByLimit = defaultLimit;
        this.hiddenLimit = defaultLimit;
        this.permaHiddenByLimit = defaultLimit;
        this.permaHiddenLimit = defaultLimit;
        this.aroundMap = new Map();
        this.duplicatesLimits = new Map();
        this.ignoresLimits = new Map();
        this.ignoredByLimits = new Map();
        this.highlighCharacter = (char) => {
            return !!char && utils_1.includes(this.ponyNames, char.name.toLowerCase());
        };
    }
    get canRemove() {
        return accountUtils_1.hasRole(this.model.account, 'superadmin');
    }
    get around() {
        return this.aroundMap.get(this.id || '');
    }
    get duplicatesLimit() {
        return (this.id && this.duplicatesLimits.has(this.id)) ? this.duplicatesLimits.get(this.id) : defaultDuplicatesLimit;
    }
    set duplicatesLimit(value) {
        if (this.id) {
            this.duplicatesLimits.set(this.id, value);
        }
    }
    get ignoresLimit() {
        return (this.id && this.ignoresLimits.has(this.id)) ? this.ignoresLimits.get(this.id) : defaultLimit;
    }
    set ignoresLimit(value) {
        if (this.id) {
            this.ignoresLimits.set(this.id, value);
        }
    }
    get ignoredByLimit() {
        return (this.id && this.ignoredByLimits.has(this.id)) ? this.ignoredByLimits.get(this.id) : defaultLimit;
    }
    set ignoredByLimit(value) {
        if (this.id) {
            this.ignoredByLimits.set(this.id, value);
        }
    }
    get originRegions() {
        return lodash_1.uniq(this.origins.map(o => o.country));
    }
    get age() {
        return (this.account && this.account.birthdate) ? adminUtils_1.getAge(this.account.birthdate) : '-';
    }
    get forceAge() {
        return (this.account && this.account.birthyear) ? (year - this.account.birthyear) : '-';
    }
    ngOnInit() {
        this.route.params.subscribe(({ id }) => {
            this.id = id;
            this.update();
        });
        this.model.updated = () => this.update();
        this.update();
    }
    ngOnDestroy() {
        this.model.updated = () => { };
        this.authsSubscription && this.authsSubscription.unsubscribe();
        this.accountSubscription && this.accountSubscription.unsubscribe();
        this.originsSubscription && this.originsSubscription.unsubscribe();
    }
    refresh() {
        const account = this.account;
        this.ponyNames = [];
        this.banLog = undefined;
        this.merges = undefined;
        this.support = undefined;
        this.invites = undefined;
        this.accountObject = undefined;
        this.loadingDuplicates = false;
        this.authsSubscription && this.authsSubscription.unsubscribe();
        this.authsSubscription = undefined;
        this.originsSubscription && this.originsSubscription.unsubscribe();
        this.originsSubscription = undefined;
        this.auths = [];
        this.origins = [];
        this.counters = [];
        this.friends = undefined;
        this.hidden = undefined;
        this.hiddenBy = undefined;
        this.permaHidden = undefined;
        this.permaHiddenBy = undefined;
        if (account) {
            account.ignoredByLimit = account.ignoredByLimit || 10;
            account.ignoresLimit = account.ignoresLimit || 10;
            account.duplicatesLimit = account.duplicatesLimit || 10;
            this.loadingDuplicates = true;
            this.model.getAllDuplicates(account._id)
                .then(duplicates => {
                if (duplicates) {
                    this.ponyNames = lodash_1.uniq(utils_1.flatten(duplicates.map(d => (d.ponies || []).map(x => x.toLowerCase()))));
                    this.duplicates = duplicates;
                    this.loadingDuplicates = false;
                }
            });
            this.model.getAccount(account._id)
                .then(account => this.accountObject = account);
            this.refreshDetails();
            this.authsSubscription = this.model.accountAuths
                .subscribe(account._id, auths => this.auths = auths || []);
            this.originsSubscription = this.model.accountOrigins
                .subscribe(account._id, origins => this.origins = origins || []);
        }
        else {
            this.duplicates = [];
            this.ignores = [];
            this.ignoredBy = [];
        }
    }
    refreshAround() {
        const account = this.account;
        if (account) {
            this.model.getAccountAround(account._id)
                .then(accounts => {
                if (accounts) {
                    this.aroundMap.set(account._id, accounts);
                }
            });
        }
    }
    refreshDetails() {
        function createCounter(key, value) {
            if (key === 'toys') {
                value = (value >>> 0).toString(2).padStart(32, '0');
            }
            return { key, value };
        }
        if (this.account) {
            this.model.getDetailsForAccount(this.account)
                .then(details => {
                if (details) {
                    this.banLog = details.banLog;
                    this.merges = details.merges;
                    this.support = adminUtils_1.createSupporterChanges(details.supporterLog);
                    this.invites = [
                        ...details.invitesSent.map(i => (Object.assign({}, i, { type: 'sent' }))),
                        ...details.invitesReceived.map(i => (Object.assign({}, i, { type: 'recv' }))),
                    ];
                    const state = details.state;
                    this.counters = Object.keys(state).map(key => createCounter(key, state[key]));
                }
            });
        }
    }
    fetchIgnores() {
        if (this.id) {
            this.model.getIgnoresAndIgnoredBy(this.id)
                .then(result => {
                if (result) {
                    this.ignores = result.ignores;
                    this.ignoredBy = result.ignoredBy;
                }
            });
        }
    }
    fetchHidden() {
        if (this.id) {
            this.model.getAccountHidden(this.id)
                .then(result => {
                if (result) {
                    this.hidden = result.hidden;
                    this.hiddenBy = result.hiddenBy;
                    this.permaHidden = result.permaHidden;
                    this.permaHiddenBy = result.permaHiddenBy;
                }
            });
        }
    }
    fetchFriends() {
        if (this.id) {
            this.model.getAccountFriends(this.id)
                .then(result => this.friends = result);
        }
    }
    removeFriend(friendId) {
        if (this.id && confirm('Are you sure ?')) {
            this.model.removeFriend(this.id, friendId)
                .then(() => this.friends && utils_1.removeItem(this.friends, friendId));
        }
    }
    canToggleRole(role) {
        return role !== 'superadmin' && accountUtils_1.hasRole(this.model.account, 'superadmin');
    }
    hasRole(role) {
        return accountUtils_1.hasRole(this.account, role);
    }
    toggleRole(role) {
        if (this.id) {
            this.model.setRole(this.id, role, !this.hasRole(role));
        }
    }
    showAccountData() {
        if (this.id) {
            this.model.getAccount(this.id)
                .then(account => {
                window.$data = account;
                console.log(account);
                console.log('accessible in $data');
            });
        }
    }
    printAuthList() {
        this.forAuths(auths => {
            const authList = auths.map((a, i) => `${i + 1}. [${a.provider}] ${a.name || '<no name>'}`).join('\n');
            this.authData = authList;
            this.authDataAccount = this.account ? `${this.account.name} [${this.account._id}]` : '';
            console.log(authList);
        });
    }
    printAuthData() {
        this.forAuths(auths => {
            const authData = auths.map((a, i) => `${i + 1}. [${a._id}] [${a.provider}] ${a.name || '<no name>'} (${a.emails})`).join('\n');
            this.authData = authData;
            this.authDataAccount = this.account ? `${this.account.name} [${this.account._id}]` : '';
            console.log(authData);
        });
    }
    copyAuthData() {
        if ('clipboard' in navigator) {
            navigator.clipboard.writeText(this.authData);
        }
    }
    clearAuthData() {
        this.authData = undefined;
        this.authDataAccount = undefined;
    }
    fetchAuths() {
        this.forAuths(auths => {
            window.$auths = auths;
            console.log(auths);
        });
    }
    forAuths(callback) {
        if (this.account) {
            this.model.getAuthsForAccount(this.account._id)
                .then(auths => callback(auths || []));
        }
    }
    printJSON() {
        if (this.id) {
            this.model.getAccount(this.id)
                .then(account => this.rawData = JSON.stringify(account, undefined, 2));
        }
    }
    clearOrigins(old, singles) {
        if (this.id) {
            this.model.clearOriginsForAccount(this.id, { old, singles })
                .then(() => this.refresh());
        }
    }
    clearOriginsInRegion(country) {
        if (this.id) {
            this.model.clearOriginsForAccount(this.id, { country })
                .then(() => this.refresh());
        }
    }
    clearOriginsFromDuplicates() {
        if (this.account) {
            const duplicates = (this.duplicates || []).slice(0, this.account.duplicatesLimit || 0);
            const accounts = duplicates.map(d => d.account);
            this.model.clearOriginsForAccounts(accounts, { old: true })
                .then(() => this.refresh());
        }
    }
    removeOrigin(ip) {
        if (this.id) {
            this.model.removeOriginsForAccount(this.id, [ip])
                .then(() => this.refresh());
        }
    }
    merge(accountId) {
        if (this.account && confirm('Are you sure?')) {
            this.model.mergeAccounts(this.account._id, accountId)
                .then(() => lodash_1.remove(this.duplicates || [], d => d.account === accountId))
                .then(() => this.refresh());
        }
    }
    remove() {
        if (this.account && confirm('Are you sure?')) {
            this.model.removeAccount(this.account._id);
        }
    }
    translateUrl(text) {
        return adminUtils_1.getTranslationUrl(text);
    }
    getPoniesCreators() {
        if (this.account) {
            this.model.getPoniesCreators(this.account._id)
                .then(items => {
                if (items) {
                    items.sort(adminUtils_1.compareByName);
                    window.$ponies = items;
                    console.log(items.map(i => `[${i._id}] "${i.name}" ${i.creator}`).join('\n'));
                }
            });
        }
    }
    removePoniesAboveLimit() {
        if (this.account && confirm('Are you sure?')) {
            this.model.removePoniesAboveLimit(this.account._id);
        }
    }
    removeAllPonies() {
        if (this.account && confirm('Are you sure?')) {
            this.model.removeAllPonies(this.account._id);
        }
    }
    restorePonies() {
        if (this.account && this.poniesToRestore) {
            let ids = undefined;
            if (this.poniesToRestoreFilter) {
                const matches = Array.from(this.poniesToRestoreFilter.match(/\[[a-f0-9]{24}\]/g) || [])
                    .map(id => id.substr(1, 24));
                if (matches.length) {
                    ids = matches;
                }
            }
            this.model.restorePonies(this.account._id, this.poniesToRestore, ids);
            this.poniesToRestore = '';
            this.restoringPonies = false;
        }
    }
    removeEmail(email) {
        if (this.account && confirm('Are you sure?')) {
            this.model.removeEmail(this.account._id, email);
        }
    }
    removeIgnore(account, ignoredAccount) {
        this.model.removeIgnore(account, ignoredAccount)
            .then(() => this.fetchIgnores());
    }
    clearSessions() {
        if (this.account) {
            this.clearingSessions = true;
            this.model.clearSessions(this.account._id)
                .finally(() => this.clearingSessions = false);
        }
    }
    getMergeTooltip(merge) {
        function mergeInfo(title, account) {
            return [
                title,
                `\tname: ${account.name}`,
                `\tnote: ${account.note || ''}`,
                `\tflags: ${utils_1.flagsToString(account.flags, adminInterfaces_1.accountFlags)}`,
                `\tage: ${account.birthdate ? adminUtils_1.getAge(account.birthdate) : '-'}`,
                `\tfriends: ${account.friends ? account.friends.length : 0}`,
                `\tcounters:`,
                ...Object.keys(account.counters || {}).sort().map(key => `\t\t${key}: ${account.counters[key]}`),
                `\tstate:`,
                ...(account.state ? JSON.stringify(account.state, null, 2).split(/\n/).map(x => `\t\t${x}`) : []),
                `\temails:`,
                ...account.emails.map(e => `\t\t${e}`),
                `\tauths:`,
                ...account.auths.map(a => `\t\t[${a.id}] ${a.name}`),
                `\tcharacters: ${account.characters.length}`,
            ].join('\n');
        }
        if (merge.data) {
            return `${mergeInfo('ACCOUNT', merge.data.account)}\n\n${mergeInfo('MERGED', merge.data.merge)}`;
        }
        else {
            return '<empty>';
        }
    }
    printMerge(merge) {
        console.log(this.mergeInfo(merge));
    }
    printMerge2(merge) {
        console.log(this.mergeInfo2(merge));
    }
    mergeInfo(merge) {
        function mergeInfo(title, account) {
            return [
                title,
                `\tname: ${account.name}`,
                `\tnote: ${account.note || ''}`,
                `\tflags: ${utils_1.flagsToString(account.flags, adminInterfaces_1.accountFlags)}`,
                `\tage: ${account.birthdate ? adminUtils_1.getAge(account.birthdate) : '-'}`,
                `\tcounters:`,
                ...Object.keys(account.counters || {}).sort().map(key => `\t\t${key}: ${account.counters[key]}`),
                `\tstate:`,
                ...(account.state ? JSON.stringify(account.state, null, 2).split(/\n/).map(x => `\t\t${x}`) : []),
                `\temails:`,
                ...account.emails.map(e => `\t\t${e}`),
                `\tauths:`,
                ...account.auths.map(a => `\t\t[${a.id}] ${a.name}`),
                `\tcharacters:`,
                ...account.characters.map(a => `\t\t[${a.id}] ${a.name}`),
                `\tfriends:`,
                ...(account.friends || []).map(i => `\t\t[${i}]`),
                `\tignores:`,
                ...(account.ignores || []).map(i => `\t\t[${i}]`),
            ].join('\n');
        }
        return merge.data && `${mergeInfo('ACCOUNT', merge.data.account)}\n\n${mergeInfo('MERGED', merge.data.merge)}`;
    }
    mergeInfo2(merge) {
        function mergeInfo(title, account) {
            return [
                title,
                `\tname: ${JSON.stringify(account.name)}`,
                `\tnote: ${JSON.stringify(account.note)}`,
                `\tflags: ${JSON.stringify(account.flags)}`,
                `\tcounters: ${JSON.stringify(account.counters)}`,
                `\tstate: ${JSON.stringify(account.state)}`,
                `\temails: ${JSON.stringify(account.emails)}`,
                `\tauths: ${JSON.stringify(account.auths)}`,
                `\tcharacters: ${JSON.stringify(account.characters)}`,
                `\tfriends: ${JSON.stringify(account.friends)}`,
                `\tignores: ${JSON.stringify(account.ignores)}`,
            ].join('\n');
        }
        return merge.data && `${mergeInfo('ACCOUNT', merge.data.account)}\n\n${mergeInfo('MERGED', merge.data.merge)}`;
    }
    showMergeInNewTab(merge) {
        htmlUtils_1.showTextInNewTab(this.mergeInfo(merge) || '');
    }
    showMergeInNewTab2(merge) {
        htmlUtils_1.showTextInNewTab(this.mergeInfo2(merge) || '');
    }
    unmerge(mergeId, split, keep) {
        if (this.account) {
            this.model.unmergeAccounts(this.account._id, mergeId, split, keep)
                .then(() => this.refresh());
        }
    }
    setAge(age) {
        if (this.account) {
            this.model.setAge(this.account._id, age);
        }
    }
    addEmail() {
        if (this.account) {
            const email = prompt('enter email');
            if (email && /@/.test(email)) {
                this.model.addEmail(this.account._id, email);
            }
        }
    }
    update() {
        if (this.id) {
            this.accountSubscription && this.accountSubscription.unsubscribe();
            this.accountSubscription = this.id ? this.model.accounts.subscribe(this.id, a => this.setAccount(a)) : undefined;
            this.events = this.model.events
                .filter(e => e.account === this.id)
                .slice(0, 10);
        }
    }
    setAccount(account) {
        const theSame = this.account === account || (this.account && account && this.account._id === account._id);
        this.account = account;
        if (!theSame) {
            this.duplicates = [];
            this.ponyNames = [];
            this.ignores = [];
            this.ignoredBy = [];
            this.rawData = undefined;
            this.authLimit = defaultLimit;
            this.emailLimit = defaultLimit;
            this.duplicatesLimit = defaultDuplicatesLimit;
            this.refresh();
            this.friendsLimit = defaultLimit;
            this.hiddenByLimit = defaultLimit;
            this.hiddenLimit = defaultLimit;
            this.permaHiddenByLimit = defaultLimit;
            this.permaHiddenLimit = defaultLimit;
            window.$account = account;
        }
    }
};
AdminAccountDetails = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-account-details',
        templateUrl: 'admin-account-details.pug',
        styleUrls: ['admin-account-details.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [router_1.ActivatedRoute, adminModel_1.AdminModel])
], AdminAccountDetails);
exports.AdminAccountDetails = AdminAccountDetails;
//# sourceMappingURL=admin-account-details.js.map