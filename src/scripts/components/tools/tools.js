"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const tooltip_1 = require("ngx-bootstrap/tooltip");
const popover_1 = require("ngx-bootstrap/popover");
function tooltipConfig() {
    return Object.assign(new tooltip_1.TooltipConfig(), { container: 'body' });
}
exports.tooltipConfig = tooltipConfig;
function popoverConfig() {
    return Object.assign(new popover_1.PopoverConfig(), { container: 'body' });
}
exports.popoverConfig = popoverConfig;
let ToolsApp = class ToolsApp {
};
ToolsApp = tslib_1.__decorate([
    core_1.Component({
        selector: 'pony-town-app',
        templateUrl: 'tools.pug',
        providers: [
            { provide: tooltip_1.TooltipConfig, useFactory: tooltipConfig },
            { provide: popover_1.PopoverConfig, useFactory: popoverConfig },
        ]
    })
], ToolsApp);
exports.ToolsApp = ToolsApp;
//# sourceMappingURL=tools.js.map