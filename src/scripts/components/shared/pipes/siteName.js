"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let SiteNamePipe = class SiteNamePipe {
    transform(value) {
        const match = String(value || '').match(/(\w+)\.com/);
        return match && match[1];
    }
};
SiteNamePipe = tslib_1.__decorate([
    core_1.Pipe({
        name: 'siteName',
    })
], SiteNamePipe);
exports.SiteNamePipe = SiteNamePipe;
//# sourceMappingURL=siteName.js.map