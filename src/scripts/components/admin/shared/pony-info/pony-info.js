"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const utils_1 = require("../../../../common/utils");
const security_1 = require("../../../../common/security");
const adminModel_1 = require("../../../services/adminModel");
let PonyInfo = class PonyInfo {
    constructor(model) {
        this.model = model;
        this.highlight = false;
        this.labelClass = 'badge-none';
    }
    get isBadCM() {
        return !!this.pony && utils_1.hasFlag(this.pony.flags, 1 /* BadCM */);
    }
    ngOnChanges() {
        if (this.pony) {
            if (security_1.isForbiddenName(this.pony.name)) {
                this.labelClass = 'badge-forbidden';
            }
            else if (utils_1.hasFlag(this.pony.flags, 1 /* BadCM */)) {
                this.labelClass = 'badge-danger';
            }
            else {
                this.labelClass = 'badge-none';
            }
        }
    }
    onShown() {
        if (this.pony && !this.pony.ponyInfo && !this.promise) {
            this.promise = this.model.getPonyInfo(this.pony)
                .finally(() => this.promise = undefined);
        }
    }
    click() {
        console.log(this.pony);
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PonyInfo.prototype, "pony", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PonyInfo.prototype, "highlight", void 0);
PonyInfo = tslib_1.__decorate([
    core_1.Component({
        selector: 'pony-info',
        templateUrl: 'pony-info.pug',
        styleUrls: ['pony-info.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], PonyInfo);
exports.PonyInfo = PonyInfo;
//# sourceMappingURL=pony-info.js.map