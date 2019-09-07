"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const data_1 = require("../../../client/data");
const sign_in_box_1 = require("../sign-in-box/sign-in-box");
const icons_1 = require("../../../client/icons");
const model_1 = require("../../services/model");
const clientUtils_1 = require("../../../client/clientUtils");
const settingsService_1 = require("../../services/settingsService");
const constants_1 = require("../../../common/constants");
let MenuBar = class MenuBar {
    constructor(model, settings) {
        this.model = model;
        this.settings = settings;
        this.signUpProviders = data_1.signUpProviders;
        this.signInProviders = data_1.signInProviders;
        this.starIcon = icons_1.faStar;
        this.spinnerIcon = icons_1.faSpinner;
        this.userIcon = icons_1.faUser;
        this.alertIcon = icons_1.faExclamationCircle;
        this.cogIcon = icons_1.faCog;
        this.statusIcon = icons_1.faCircle;
        this.logo = false;
        this.loading = false;
        this.loadingError = false;
        this.signOut = new core_1.EventEmitter();
        this.signIn = new core_1.EventEmitter();
    }
    get hasSupporterIcon() {
        return clientUtils_1.isSupporterOrPastSupporter(this.account);
    }
    get supporterTitle() {
        return clientUtils_1.supporterTitle(this.account);
    }
    get supporterClass() {
        return clientUtils_1.supporterClass(this.account);
    }
    get showAccountAlert() {
        return this.model.missingBirthdate && constants_1.REQUEST_DATE_OF_BIRTH;
    }
    get hidden() {
        return !!this.settings.account.hidden;
    }
    icon(id) {
        return sign_in_box_1.getProviderIcon(id);
    }
    signInTo(provider) {
        this.signIn.emit(provider);
    }
    resize() {
    }
    setStatus(status) {
        this.settings.account.hidden = status === 'invisible';
        this.settings.saveAccountSettings(this.settings.account);
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], MenuBar.prototype, "logo", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], MenuBar.prototype, "loading", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], MenuBar.prototype, "loadingError", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], MenuBar.prototype, "account", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], MenuBar.prototype, "signOut", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], MenuBar.prototype, "signIn", void 0);
tslib_1.__decorate([
    core_1.HostListener('window:resize'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], MenuBar.prototype, "resize", null);
MenuBar = tslib_1.__decorate([
    core_1.Component({
        selector: 'menu-bar',
        templateUrl: 'menu-bar.pug',
        styleUrls: ['menu-bar.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model, settingsService_1.SettingsService])
], MenuBar);
exports.MenuBar = MenuBar;
//# sourceMappingURL=menu-bar.js.map