"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
let SliderBar = class SliderBar {
    constructor() {
        this.min = 0;
        this.max = 100;
        this.step = 0;
        this.largeStep = 10;
        this.disabled = false;
        this.value = 0;
        this.valueChange = new core_1.EventEmitter();
        this.changed = new core_1.EventEmitter();
        this.currentWidth = 0;
    }
    get width() {
        return lodash_1.clamp(((this.value - this.min) / (this.max - this.min)) * 100, 0, 100);
    }
    drag({ type, x, event }) {
        if (this.disabled)
            return;
        event.preventDefault();
        if (type === 'start') {
            this.currentWidth = this.bar.nativeElement.getBoundingClientRect().width;
        }
        let val = this.min + lodash_1.clamp(x / this.currentWidth, 0, 1) * (this.max - this.min);
        if (this.step) {
            val = Math.round(val / this.step) * this.step;
        }
        this.setValue(val, false);
        if (type === 'end') {
            this.changed.emit(val);
        }
    }
    keydown(e) {
        if (this.disabled)
            return;
        const step = this.step || 1;
        if (e.keyCode === 37 /* LEFT */ || e.keyCode === 40 /* DOWN */ || e.keyCode === 34 /* PAGE_DOWN */) {
            e.preventDefault();
            this.setValue(this.value - step * (e.keyCode === 34 /* PAGE_DOWN */ ? this.largeStep : 1), true);
        }
        else if (e.keyCode === 39 /* RIGHT */ || e.keyCode === 38 /* UP */ || e.keyCode === 33 /* PAGE_UP */) {
            e.preventDefault();
            this.setValue(this.value + step * (e.keyCode === 33 /* PAGE_UP */ ? this.largeStep : 1), true);
        }
        else if (e.keyCode === 36 /* HOME */) {
            e.preventDefault();
            this.setValue(this.min, true);
        }
        else if (e.keyCode === 35 /* END */) {
            e.preventDefault();
            this.setValue(this.max, true);
        }
    }
    setValue(value, emit) {
        if (this.value !== value) {
            this.value = lodash_1.clamp(value, this.min, this.max);
            this.valueChange.emit(this.value);
            if (emit) {
                this.changed.emit(value);
            }
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SliderBar.prototype, "min", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SliderBar.prototype, "max", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SliderBar.prototype, "step", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SliderBar.prototype, "largeStep", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SliderBar.prototype, "disabled", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SliderBar.prototype, "value", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], SliderBar.prototype, "valueChange", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], SliderBar.prototype, "changed", void 0);
tslib_1.__decorate([
    core_1.ViewChild('bar', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], SliderBar.prototype, "bar", void 0);
tslib_1.__decorate([
    core_1.HostListener('keydown', ['$event']),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [KeyboardEvent]),
    tslib_1.__metadata("design:returntype", void 0)
], SliderBar.prototype, "keydown", null);
SliderBar = tslib_1.__decorate([
    core_1.Component({
        selector: 'slider-bar',
        templateUrl: 'slider-bar.pug',
        styleUrls: ['slider-bar.scss'],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
        host: {
            'role': 'slider',
            '[tabindex]': 'disabled ? -1 : 0',
            '[attr.aria-valuemin]': 'min',
            '[attr.aria-valuemax]': 'max',
            '[attr.aria-valuenow]': 'value',
            '[attr.aria-disabled]': 'disabled',
        },
    })
], SliderBar);
exports.SliderBar = SliderBar;
//# sourceMappingURL=slider-bar.js.map