"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const htmlUtils_1 = require("../../../client/htmlUtils");
const data_1 = require("../../../client/data");
let FocusTrap = class FocusTrap {
    constructor(element) {
        this.element = element;
        this.on = true;
        this.focus = (e) => {
            if (htmlUtils_1.isParentOf(this.element.nativeElement, e.target)) {
                this.lastActiveElement = e.target;
            }
            else {
                const focusable = htmlUtils_1.findFocusableElements(this.element.nativeElement);
                if (focusable.length) {
                    if (this.lastActiveElement === focusable[0]) {
                        this.lastActiveElement = focusable[focusable.length - 1];
                    }
                    else {
                        this.lastActiveElement = focusable[0];
                    }
                    this.lastActiveElement.focus();
                }
            }
        };
    }
    set focusTrap(value) {
        if (this.on !== value) {
            this.on = value;
            this.update();
        }
    }
    ngOnInit() {
        this.update();
    }
    ngOnDestroy() {
        this.focusTrap = false;
    }
    update() {
        if (!data_1.isMobile) {
            if (this.on) {
                this.lastActiveElement = document.activeElement;
                document.addEventListener('focusin', this.focus);
                if (!htmlUtils_1.isParentOf(this.element.nativeElement, this.lastActiveElement)) {
                    setTimeout(() => this.lastActiveElement = htmlUtils_1.focusFirstElement(this.element.nativeElement));
                }
            }
            else {
                this.lastActiveElement = undefined;
                document.removeEventListener('focusin', this.focus);
            }
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Boolean),
    tslib_1.__metadata("design:paramtypes", [Boolean])
], FocusTrap.prototype, "focusTrap", null);
FocusTrap = tslib_1.__decorate([
    core_1.Directive({
        selector: '[focusTrap]',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], FocusTrap);
exports.FocusTrap = FocusTrap;
//# sourceMappingURL=focusTrap.js.map