"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const icons_1 = require("../../../client/icons");
let FillOutline = class FillOutline {
    constructor() {
        this.lockIcon = icons_1.faLock;
        this.label = 'Color';
        this.indicatorColor = '';
        this.fillChange = new core_1.EventEmitter();
        this.outlineChange = new core_1.EventEmitter();
        this.lockedChange = new core_1.EventEmitter();
        this.nonLockable = false;
        this.outlineLocked = false;
        this.outlineLockedChange = new core_1.EventEmitter();
        this.outlineHidden = false;
        this.change = new core_1.EventEmitter();
    }
    get hasLock() {
        return this.locked !== undefined;
    }
    onChange() {
        this.change.emit();
    }
    onFillChange(value) {
        this.fillChange.emit(value);
        this.onChange();
    }
    onOutlineChange(value) {
        this.outlineChange.emit(value);
        this.onChange();
    }
    onLockedChange(value) {
        this.lockedChange.emit(value);
        this.onChange();
    }
    onOutlineLockedChange(value) {
        this.outlineLockedChange.emit(value);
        this.onChange();
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "label", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "indicatorColor", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], FillOutline.prototype, "base", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], FillOutline.prototype, "fill", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "fillChange", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], FillOutline.prototype, "outline", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "outlineChange", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Boolean)
], FillOutline.prototype, "locked", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "lockedChange", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "nonLockable", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "outlineLocked", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "outlineLockedChange", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "outlineHidden", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], FillOutline.prototype, "change", void 0);
FillOutline = tslib_1.__decorate([
    core_1.Component({
        selector: 'fill-outline',
        templateUrl: 'fill-outline.pug',
        styleUrls: ['fill-outline.scss'],
    })
], FillOutline);
exports.FillOutline = FillOutline;
//# sourceMappingURL=fill-outline.js.map