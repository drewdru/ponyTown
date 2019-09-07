"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const icons_1 = require("../../../../client/icons");
let AuthInfo = class AuthInfo {
    constructor() {
        this.showName = false;
    }
    get deleted() {
        return !!(this.auth && (this.auth.disabled || this.auth.banned));
    }
    get name() {
        return this.auth && this.auth.name || '';
    }
    get icon() {
        return icons_1.oauthIcons[this.auth && this.auth.provider || ''] || icons_1.faGlobe;
    }
    get pledged() {
        return (this.auth && this.auth.pledged || 0) / 100;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AuthInfo.prototype, "auth", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AuthInfo.prototype, "showName", void 0);
AuthInfo = tslib_1.__decorate([
    core_1.Component({
        selector: 'auth-info',
        templateUrl: 'auth-info.pug',
        styleUrls: ['auth-info.scss'],
        host: {
            '[class.deleted]': 'deleted',
        },
    })
], AuthInfo);
exports.AuthInfo = AuthInfo;
//# sourceMappingURL=auth-info.js.map