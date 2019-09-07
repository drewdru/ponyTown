"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let AgAutoFocus = class AgAutoFocus {
    constructor(element) {
        this.element = element;
    }
    ngAfterViewInit() {
        setTimeout(() => this.element.nativeElement.focus(), 100);
    }
};
AgAutoFocus = tslib_1.__decorate([
    core_1.Directive({
        selector: '[agAutoFocus]'
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], AgAutoFocus);
exports.AgAutoFocus = AgAutoFocus;
//# sourceMappingURL=agAutoFocus.js.map