"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const icons_1 = require("../../../client/icons");
let CheckBox = class CheckBox {
    constructor() {
        this.icon = icons_1.faCheck;
        this.disabled = false;
        this.checked = false;
        this.checkedChange = new core_1.EventEmitter();
    }
    toggle() {
        if (!this.disabled) {
            this.checked = !this.checked;
            this.checkedChange.emit(this.checked);
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CheckBox.prototype, "icon", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], CheckBox.prototype, "label", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CheckBox.prototype, "disabled", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CheckBox.prototype, "checked", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], CheckBox.prototype, "checkedChange", void 0);
CheckBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'check-box',
        templateUrl: 'check-box.pug',
        styleUrls: ['check-box.scss'],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    })
], CheckBox);
exports.CheckBox = CheckBox;
//# sourceMappingURL=check-box.js.map