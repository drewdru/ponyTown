"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const htmlUtils_1 = require("../../../client/htmlUtils");
let LabelledBy = class LabelledBy {
    constructor(element) {
        this.element = element;
    }
    ngOnInit() {
        const element = this.element.nativeElement;
        const target = htmlUtils_1.findParentElement(element, this.selector);
        const id = element.id = element.id || lodash_1.uniqueId('labelled-by-');
        if (target) {
            target.setAttribute('aria-labelledby', id);
        }
    }
};
tslib_1.__decorate([
    core_1.Input('labelledBy'),
    tslib_1.__metadata("design:type", String)
], LabelledBy.prototype, "selector", void 0);
LabelledBy = tslib_1.__decorate([
    core_1.Directive({
        selector: '[labelledBy]',
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], LabelledBy);
exports.LabelledBy = LabelledBy;
//# sourceMappingURL=labelledBy.js.map