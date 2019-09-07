"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const forms_1 = require("@angular/forms");
let BtnHighlight = class BtnHighlight {
    constructor(model) {
        this.model = model;
        this.btnHighlight = undefined;
    }
    get on() {
        const value = this.btnHighlight;
        return (value === true || value === false || !this.model) ? value : !!this.model.value;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Boolean)
], BtnHighlight.prototype, "btnHighlight", void 0);
BtnHighlight = tslib_1.__decorate([
    core_1.Directive({
        selector: '[btnHighlight]',
        host: {
            '[class.btn-default]': '!on',
            '[class.btn-primary]': 'on',
        },
    }),
    tslib_1.__param(0, core_1.Optional()),
    tslib_1.__metadata("design:paramtypes", [forms_1.NgModel])
], BtnHighlight);
exports.BtnHighlight = BtnHighlight;
let BtnHighlightDanger = class BtnHighlightDanger {
    constructor() {
        this.btnHighlightDanger = false;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], BtnHighlightDanger.prototype, "btnHighlightDanger", void 0);
BtnHighlightDanger = tslib_1.__decorate([
    core_1.Directive({
        selector: '[btnHighlightDanger]',
        host: {
            '[class.btn-default]': '!btnHighlightDanger',
            '[class.btn-danger]': 'btnHighlightDanger',
        },
    })
], BtnHighlightDanger);
exports.BtnHighlightDanger = BtnHighlightDanger;
//# sourceMappingURL=btnHighlight.js.map