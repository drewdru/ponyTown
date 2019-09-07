"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let FocusTitle = class FocusTitle {
    constructor(element) {
        this.element = element;
    }
    ngAfterViewInit() {
        setTimeout(() => this.element.nativeElement.focus());
    }
};
FocusTitle = tslib_1.__decorate([
    core_1.Directive({
        selector: '[focusTitle]',
        host: {
            'tabindex': '-1',
        },
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], FocusTitle);
exports.FocusTitle = FocusTitle;
//# sourceMappingURL=focusTitle.js.map