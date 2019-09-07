"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
let CustomCheckbox = class CustomCheckbox {
    constructor() {
        this.disabled = false;
        this.help = '';
        this.checked = false;
        this.checkedChange = new core_1.EventEmitter();
        this.helpId = lodash_1.uniqueId('custom-checkbox-help-');
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CustomCheckbox.prototype, "disabled", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CustomCheckbox.prototype, "help", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CustomCheckbox.prototype, "checked", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], CustomCheckbox.prototype, "checkedChange", void 0);
CustomCheckbox = tslib_1.__decorate([
    core_1.Component({
        selector: 'custom-checkbox',
        templateUrl: 'custom-checkbox.pug',
        styleUrls: ['custom-checkbox.scss'],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    })
], CustomCheckbox);
exports.CustomCheckbox = CustomCheckbox;
//# sourceMappingURL=custom-checkbox.js.map