"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const icons_1 = require("../../../../client/icons");
let ToolsXY = class ToolsXY {
    constructor() {
        this.rightIcon = icons_1.faChevronRight;
        this.leftIcon = icons_1.faChevronLeft;
        this.upIcon = icons_1.faChevronUp;
        this.downIcon = icons_1.faChevronDown;
        this.min = 0;
        this.max = 100;
        this.x = 0;
        this.y = 0;
        this.xChange = new core_1.EventEmitter();
        this.yChange = new core_1.EventEmitter();
        this.change = new core_1.EventEmitter();
    }
    changeX(value) {
        this.x = value;
        this.xChange.emit(value);
        this.change.emit();
    }
    changeY(value) {
        this.y = value;
        this.yChange.emit(value);
        this.change.emit();
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ToolsXY.prototype, "min", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ToolsXY.prototype, "max", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ToolsXY.prototype, "x", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ToolsXY.prototype, "y", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], ToolsXY.prototype, "xChange", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], ToolsXY.prototype, "yChange", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], ToolsXY.prototype, "change", void 0);
ToolsXY = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-xy',
        templateUrl: 'tools-xy.pug',
        styleUrls: ['tools-xy.scss'],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    })
], ToolsXY);
exports.ToolsXY = ToolsXY;
//# sourceMappingURL=tools-xy.js.map