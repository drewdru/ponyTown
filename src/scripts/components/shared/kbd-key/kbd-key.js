"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let KbdKey = class KbdKey {
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], KbdKey.prototype, "title", void 0);
KbdKey = tslib_1.__decorate([
    core_1.Component({
        selector: 'kbd-key',
        templateUrl: 'kbd-key.pug',
    })
], KbdKey);
exports.KbdKey = KbdKey;
//# sourceMappingURL=kbd-key.js.map