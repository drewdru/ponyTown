"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const rev_1 = require("../../../client/rev");
let RevSrc = class RevSrc {
    get src() {
        return this.revSrc && rev_1.getUrl(this.revSrc);
    }
};
tslib_1.__decorate([
    core_1.HostBinding(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [])
], RevSrc.prototype, "src", null);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], RevSrc.prototype, "revSrc", void 0);
RevSrc = tslib_1.__decorate([
    core_1.Directive({
        selector: '[revSrc]',
    })
], RevSrc);
exports.RevSrc = RevSrc;
//# sourceMappingURL=revSrc.js.map