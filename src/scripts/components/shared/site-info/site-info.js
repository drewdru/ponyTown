"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const clientUtils_1 = require("../../../client/clientUtils");
const sign_in_box_1 = require("../sign-in-box/sign-in-box");
let SiteInfo = class SiteInfo {
    set site(value) {
        this.info = value && clientUtils_1.toSocialSiteInfo(value);
        this.icon = sign_in_box_1.getProviderIcon(this.info && this.info.icon || '');
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], SiteInfo.prototype, "site", null);
SiteInfo = tslib_1.__decorate([
    core_1.Component({
        selector: 'site-info',
        templateUrl: 'site-info.pug',
        styleUrls: ['site-info.scss'],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    })
], SiteInfo);
exports.SiteInfo = SiteInfo;
//# sourceMappingURL=site-info.js.map