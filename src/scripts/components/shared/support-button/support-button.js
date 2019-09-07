"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const model_1 = require("../../services/model");
const data_1 = require("../../../client/data");
let SupportButton = class SupportButton {
    constructor(model) {
        this.model = model;
        this.patreonLink = data_1.supporterLink;
    }
    get supporter() {
        return this.model.supporter;
    }
};
SupportButton = tslib_1.__decorate([
    core_1.Component({
        selector: 'support-button',
        templateUrl: 'support-button.pug',
        styleUrls: ['support-button.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model])
], SupportButton);
exports.SupportButton = SupportButton;
//# sourceMappingURL=support-button.js.map