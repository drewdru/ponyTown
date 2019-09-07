"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
let AccountInfoRemote = class AccountInfoRemote {
    constructor(model) {
        this.model = model;
        this.extendedAuths = false;
        this.showDuplicates = false;
        this.basic = false;
    }
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
    }
    get accountId() {
        return this._accountId;
    }
    set accountId(value) {
        if (this._accountId !== value) {
            this._accountId = value;
            this.account = undefined;
            this.updateSubscription();
        }
    }
    updateSubscription() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = undefined;
        }
        if (this.accountId) {
            this.subscription = this.model.accounts
                .subscribe(this.accountId, account => this.account = account);
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AccountInfoRemote.prototype, "extendedAuths", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], AccountInfoRemote.prototype, "popoverPlacement", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AccountInfoRemote.prototype, "showDuplicates", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AccountInfoRemote.prototype, "basic", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], AccountInfoRemote.prototype, "accountId", null);
AccountInfoRemote = tslib_1.__decorate([
    core_1.Component({
        selector: 'account-info-remote',
        templateUrl: 'account-info-remote.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AccountInfoRemote);
exports.AccountInfoRemote = AccountInfoRemote;
//# sourceMappingURL=account-info-remote.js.map