"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const constants_1 = require("../../../common/constants");
const clientUtils_1 = require("../../../client/clientUtils");
const data_1 = require("../../../client/data");
const model_1 = require("../../services/model");
const sign_in_box_1 = require("../../shared/sign-in-box/sign-in-box");
const icons_1 = require("../../../client/icons");
let Account = class Account {
    constructor(model) {
        this.model = model;
        this.refreshIcon = icons_1.faSync;
        this.starIcon = icons_1.faStar;
        this.alertIcon = icons_1.faExclamationCircle;
        this.providers = data_1.oauthProviders.filter(p => !p.disabled);
        this.nameMinLength = constants_1.ACCOUNT_NAME_MIN_LENGTH;
        this.nameMaxLength = constants_1.ACCOUNT_NAME_MAX_LENGTH;
        this.hidesPerPage = constants_1.HIDES_PER_PAGE;
        this.data = {
            name: '',
            birthdate: '',
        };
        this.accountSaved = false;
        this.hides = undefined;
        this.page = 0;
    }
    ngOnInit() {
        const account = this.account;
        this.sites = account.sites && account.sites.map(clientUtils_1.toSocialSiteInfo);
        this.data = {
            name: account.name,
            birthdate: account.birthdate,
        };
        this.pageChanged();
    }
    ngOnDestroy() {
        this.model.mergedAccount = false;
    }
    pageChanged() {
        this.model.getHides(this.page)
            .then(result => this.hides = result);
    }
    get authError() {
        return this.model.authError;
    }
    get mergedAccount() {
        return this.model.mergedAccount;
    }
    get account() {
        return this.model.account;
    }
    get supporter() {
        return this.model.supporter;
    }
    get showSupporter() {
        return clientUtils_1.isSupporterOrPastSupporter(this.account);
    }
    get canSubmit() {
        return this.account && this.data.name && !!clientUtils_1.cleanName(this.data.name).length;
    }
    get supporterTitle() {
        return clientUtils_1.supporterTitle(this.account);
    }
    get supporterClass() {
        return clientUtils_1.supporterClass(this.account);
    }
    get supporterRewards() {
        return clientUtils_1.supporterRewards(this.account);
    }
    get showSupporterInfo() {
        const account = this.account;
        return !!(!this.supporter && account && account.sites && account.sites.some(s => s.provider === 'patreon'));
    }
    get showAccountAlert() {
        return this.model.missingBirthdate;
    }
    icon(id) {
        return sign_in_box_1.getProviderIcon(id);
    }
    submit() {
        if (this.canSubmit) {
            this.resetAllMessages();
            this.data.name = clientUtils_1.cleanName(this.data.name).substr(0, constants_1.ACCOUNT_NAME_MAX_LENGTH);
            this.model.updateAccount(this.data)
                .catch((e) => this.accountError = e.message)
                .then(() => this.accountSaved = true);
        }
    }
    removeSite(site) {
        if (confirm('Are you sure you want to remove this social account ?')) {
            this.removingSite = true;
            this.resetAllMessages();
            this.model.removeSite(site.id)
                .then(() => this.sites = this.account.sites.map(clientUtils_1.toSocialSiteInfo))
                .then(() => this.removedAccount = true)
                .catch((e) => this.mergeError = e.message)
                .then(() => this.removingSite = false);
        }
    }
    connectSite(provider) {
        this.model.connectSite(provider);
    }
    resetAllMessages() {
        this.accountSaved = false;
        this.mergeError = undefined;
        this.accountError = undefined;
        this.removedAccount = false;
        this.model.authError = undefined;
        this.model.mergedAccount = false;
    }
    unhidePlayer(player) {
        this.model.unhidePlayer(player.id)
            .then(() => this.pageChanged())
            .catch((e) => console.error(e));
    }
};
Account = tslib_1.__decorate([
    core_1.Component({
        selector: 'account',
        templateUrl: 'account.pug',
        styleUrls: ['account.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model])
], Account);
exports.Account = Account;
//# sourceMappingURL=account.js.map