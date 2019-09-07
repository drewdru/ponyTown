"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let FixToTop = class FixToTop {
    constructor(element) {
        this.element = element;
        this.fixToTopOffset = 0;
        this.fixToTop = new core_1.EventEmitter();
        this.fixed = false;
    }
    scroll() {
        const element = this.element.nativeElement;
        const { top } = element.getBoundingClientRect();
        if (this.fixed !== top < this.fixToTopOffset) {
            this.fixed = top < this.fixToTopOffset;
            this.fixToTop.emit(this.fixed);
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], FixToTop.prototype, "fixToTopOffset", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], FixToTop.prototype, "fixToTop", void 0);
tslib_1.__decorate([
    core_1.HostBinding('class.fixed-to-top'),
    tslib_1.__metadata("design:type", Object)
], FixToTop.prototype, "fixed", void 0);
tslib_1.__decorate([
    core_1.HostListener('window:scroll'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], FixToTop.prototype, "scroll", null);
FixToTop = tslib_1.__decorate([
    core_1.Directive({
        selector: '[fixToTop]',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], FixToTop);
exports.FixToTop = FixToTop;
//# sourceMappingURL=fixToTop.js.map