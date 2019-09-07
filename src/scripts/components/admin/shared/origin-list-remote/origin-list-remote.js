"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
let OriginListRemote = class OriginListRemote {
    constructor(model) {
        this.model = model;
        this.limit = 2;
        this.extended = false;
        this.origins = [];
    }
    get accountId() {
        return this._accountId;
    }
    set accountId(value) {
        if (this.accountId !== value) {
            this._accountId = value;
            this.origins = [];
            this.subscription && this.subscription.unsubscribe();
            this.subscription = value ? this.model.accountOrigins.subscribe(value, x => this.origins = x || []) : undefined;
        }
    }
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], OriginListRemote.prototype, "limit", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], OriginListRemote.prototype, "extended", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], OriginListRemote.prototype, "accountId", null);
OriginListRemote = tslib_1.__decorate([
    core_1.Component({
        selector: 'origin-list-remote',
        templateUrl: 'origin-list-remote.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], OriginListRemote);
exports.OriginListRemote = OriginListRemote;
//# sourceMappingURL=origin-list-remote.js.map