"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let Anchor = class Anchor {
    constructor(element) {
        this.element = element;
    }
    ngOnInit() {
        const a = this.element.nativeElement;
        if (/^(https?|mailto):/.test(a.href) && !a.target) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        }
    }
};
Anchor = tslib_1.__decorate([
    core_1.Directive({
        selector: 'a[href]'
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], Anchor);
exports.Anchor = Anchor;
//# sourceMappingURL=anchor.js.map