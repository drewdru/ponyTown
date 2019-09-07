"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let SiteLinks = class SiteLinks {
    constructor() {
        this.links = [];
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], SiteLinks.prototype, "links", void 0);
SiteLinks = tslib_1.__decorate([
    core_1.Component({
        selector: 'site-links',
        templateUrl: 'site-links.pug',
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    })
], SiteLinks);
exports.SiteLinks = SiteLinks;
//# sourceMappingURL=site-links.js.map