"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const utils_1 = require("../../../common/utils");
const color_1 = require("../../../common/color");
const icons_1 = require("../../../client/icons");
const SIZE = 175;
let ColorPicker = class ColorPicker {
    constructor() {
        this.chevronIcon = icons_1.faChevronDown;
        this.isOpen = false;
        this.isDisabled = false;
        this.disabledColor = '';
        this.color = '';
        this.indicatorColor = '';
        this.label = undefined;
        this.labelledBy = undefined;
        this.colorChange = new core_1.EventEmitter();
        this.s = 0;
        this.v = 0;
        this.h = 0;
        this.lastColor = '';
        this.closeHandler = () => this.close();
    }
    get inputColor() {
        return this.isDisabled && this.disabledColor ? this.disabledColor : this.color;
    }
    set inputColor(value) {
        if (!this.isDisabled) {
            this.color = value;
        }
    }
    get bg() {
        return color_1.colorToCSS(color_1.parseColorFast(this.inputColor));
    }
    get svLeft() {
        this.updateHsv();
        return this.s * 100;
    }
    get svTop() {
        this.updateHsv();
        return (1 - this.v) * 100;
    }
    get hueTop() {
        this.updateHsv();
        return this.h * 100 / 360;
    }
    get hue() {
        this.updateHsv();
        return color_1.colorToCSS(color_1.colorFromHSVA(this.h, 1, 1, 1));
    }
    focus(e) {
        this.isOpen = true;
        e.target.select();
    }
    dragSV({ event, x, y }) {
        event.preventDefault();
        this.updateHsv();
        this.s = utils_1.clamp(x / SIZE, 0, 1);
        this.v = 1 - utils_1.clamp(y / SIZE, 0, 1);
        this.updateColor();
    }
    dragHue({ event, y }) {
        event.preventDefault();
        this.updateHsv();
        this.h = utils_1.clamp(360 * y / SIZE, 0, 360);
        this.updateColor();
    }
    updateHsv() {
        if (this.lastColor !== this.color) {
            const { h, s, v } = color_1.colorToHSVA(color_1.parseColorFast(this.color), this.h);
            this.h = h;
            this.s = s;
            this.v = v;
            this.lastColor = this.color;
        }
    }
    updateColor() {
        const color = color_1.colorToHexRGB(color_1.colorFromHSVA(this.h, this.s, this.v, 1));
        const changed = this.color !== color;
        this.lastColor = this.color = color;
        if (changed) {
            this.colorChange.emit(color);
        }
    }
    inputChanged(value) {
        this.color = value;
        this.colorChange.emit(this.color);
    }
    stopEvent(e) {
        e.stopPropagation();
        e.preventDefault();
    }
    open() {
        if (!this.isOpen) {
            this.isOpen = true;
            setTimeout(() => {
                document.addEventListener('mousedown', this.closeHandler);
                document.addEventListener('touchstart', this.closeHandler);
            });
        }
    }
    close() {
        this.isOpen = false;
        document.removeEventListener('mousedown', this.closeHandler);
        document.removeEventListener('touchstart', this.closeHandler);
    }
    toggleOpen() {
        if (!this.isDisabled) {
            if (this.isOpen) {
                this.close();
            }
            else {
                this.open();
            }
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ColorPicker.prototype, "isOpen", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ColorPicker.prototype, "isDisabled", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ColorPicker.prototype, "disabledColor", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ColorPicker.prototype, "color", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ColorPicker.prototype, "indicatorColor", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], ColorPicker.prototype, "label", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], ColorPicker.prototype, "labelledBy", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], ColorPicker.prototype, "colorChange", void 0);
ColorPicker = tslib_1.__decorate([
    core_1.Component({
        selector: 'color-picker',
        templateUrl: 'color-picker.pug',
        styleUrls: ['color-picker.scss'],
    })
], ColorPicker);
exports.ColorPicker = ColorPicker;
//# sourceMappingURL=color-picker.js.map