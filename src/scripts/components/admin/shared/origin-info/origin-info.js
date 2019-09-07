"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
const countries_1 = require("../../../../common/countries");
let OriginInfo = class OriginInfo {
    constructor(model) {
        this.model = model;
    }
    get countryName() {
        return countries_1.countryCodeToName[this.origin && this.origin.country || '??'] || 'Unknown';
    }
    toggleBan(field, value) {
        if (this.origin) {
            this.model.updateOrigin({ ip: this.origin.ip, country: this.origin.country, [field]: value });
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], OriginInfo.prototype, "origin", void 0);
OriginInfo = tslib_1.__decorate([
    core_1.Component({
        selector: 'origin-info',
        templateUrl: 'origin-info.pug',
        styleUrls: ['origin-info.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], OriginInfo);
exports.OriginInfo = OriginInfo;
//# sourceMappingURL=origin-info.js.map