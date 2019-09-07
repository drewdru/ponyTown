"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
const icons_1 = require("../../../../client/icons");
let AuthInfoEdit = class AuthInfoEdit {
    constructor(model) {
        this.model = model;
        this.assignIcon = icons_1.faArrowRight;
        this.infoIcon = icons_1.faInfo;
        this.lockIcon = icons_1.faLock;
        this.trashIcon = icons_1.faTrash;
        this.eyeSlashIcon = icons_1.faEyeSlash;
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
    removeAuth(auth) {
        if (auth && confirm('Are you sure?')) {
            this.model.removeAuth(auth._id);
        }
    }
    showAuthData(auth) {
        if (auth) {
            this.model.getAuth(auth._id)
                .then(x => console.log(x));
        }
    }
    toggleAuthDisabled(auth) {
        if (auth) {
            this.model.updateAuth(auth._id, { disabled: !auth.disabled });
        }
    }
    toggleAuthBanned(auth) {
        if (auth) {
            this.model.updateAuth(auth._id, { banned: !auth.banned });
        }
    }
    assignTo(accountId) {
        if (this.authId) {
            this.model.assignAuth(this.authId, accountId);
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], AuthInfoEdit.prototype, "duplicates", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AuthInfoEdit.prototype, "showName", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], AuthInfoEdit.prototype, "authId", null);
AuthInfoEdit = tslib_1.__decorate([
    core_1.Component({
        selector: 'auth-info-edit',
        templateUrl: 'auth-info-edit.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AuthInfoEdit);
exports.AuthInfoEdit = AuthInfoEdit;
//# sourceMappingURL=auth-info-edit.js.map