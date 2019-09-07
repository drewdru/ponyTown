"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
let AuthInfoRemote = class AuthInfoRemote {
    constructor(model) {
        this.model = model;
        this.showName = false;
    }
    get authId() {
        return this._authId;
    }
    set authId(value) {
        if (this.authId !== value) {
            this._authId = value;
            this.auth = undefined;
            this.subscription && this.subscription.unsubscribe();
            this.subscription = value ? this.model.auths.subscribe(value, auth => this.auth = auth) : undefined;
        }
    }
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AuthInfoRemote.prototype, "showName", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], AuthInfoRemote.prototype, "authId", null);
AuthInfoRemote = tslib_1.__decorate([
    core_1.Component({
        selector: 'auth-info-remote',
        templateUrl: 'auth-info-remote.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AuthInfoRemote);
exports.AuthInfoRemote = AuthInfoRemote;
//# sourceMappingURL=auth-info-remote.js.map