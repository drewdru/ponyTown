"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
const icons_1 = require("../../../../client/icons");
let AccountStatus = class AccountStatus {
    constructor(model) {
        this.model = model;
        this.incognitoIcon = icons_1.faUserSecret;
        this.verbose = false;
        this.status = undefined;
    }
    ngOnInit() {
        this.refresh();
    }
    ngOnChanges() {
        this.status = undefined;
        this.refresh();
    }
    refresh() {
        this.model.getAccountStatus(this.account._id)
            .then(status => this.status = status);
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AccountStatus.prototype, "account", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AccountStatus.prototype, "verbose", void 0);
AccountStatus = tslib_1.__decorate([
    core_1.Component({
        selector: 'account-status',
        templateUrl: 'account-status.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AccountStatus);
exports.AccountStatus = AccountStatus;
//# sourceMappingURL=account-status.js.map