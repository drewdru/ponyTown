"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
let OriginInfoRemote = class OriginInfoRemote {
    constructor(model) {
        this.model = model;
        this.showName = false;
    }
    get originIP() {
        return this._originIP;
    }
    set originIP(value) {
        if (this.originIP !== value) {
            this._originIP = value;
            this.origin = undefined;
            this.subscription && this.subscription.unsubscribe();
            this.subscription = value ? this.model.origins.subscribe(value, origin => this.origin = origin) : undefined;
        }
    }
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], OriginInfoRemote.prototype, "showName", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], OriginInfoRemote.prototype, "originIP", null);
OriginInfoRemote = tslib_1.__decorate([
    core_1.Component({
        selector: 'origin-info-remote',
        templateUrl: 'origin-info-remote.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], OriginInfoRemote);
exports.OriginInfoRemote = OriginInfoRemote;
//# sourceMappingURL=origin-info-remote.js.map