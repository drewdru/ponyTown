"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
let LinkCurrent = class LinkCurrent {
    constructor(routerLinkActive) {
        this.routerLinkActive = routerLinkActive;
    }
    get current() {
        return this.routerLinkActive.isActive ? 'true' : undefined;
    }
};
tslib_1.__decorate([
    core_1.HostBinding('attr.aria-current'),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [])
], LinkCurrent.prototype, "current", null);
LinkCurrent = tslib_1.__decorate([
    core_1.Directive({
        selector: '[linkCurrent]',
    }),
    tslib_1.__metadata("design:paramtypes", [router_1.RouterLinkActive])
], LinkCurrent);
exports.LinkCurrent = LinkCurrent;
//# sourceMappingURL=linkCurrent.js.map