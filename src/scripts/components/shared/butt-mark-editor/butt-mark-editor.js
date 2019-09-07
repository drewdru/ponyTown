"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const constants_1 = require("../../../common/constants");
const icons_1 = require("../../../client/icons");
let ButtMarkEditor = class ButtMarkEditor {
    constructor() {
        this.trashIcon = icons_1.faTrash;
        this.eraserIcon = icons_1.faEraser;
        this.eyeDropperIcon = icons_1.faEyeDropper;
        this.paintBrushIcon = icons_1.faPaintBrush;
        this.cmSize = constants_1.CM_SIZE;
        this.state = {
            brushType: 'brush',
            brush: 'orange',
        };
    }
    clearCM() {
        lodash_1.fill(this.info.cm, '');
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ButtMarkEditor.prototype, "info", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ButtMarkEditor.prototype, "state", void 0);
ButtMarkEditor = tslib_1.__decorate([
    core_1.Component({
        selector: 'butt-mark-editor',
        templateUrl: 'butt-mark-editor.pug',
    })
], ButtMarkEditor);
exports.ButtMarkEditor = ButtMarkEditor;
//# sourceMappingURL=butt-mark-editor.js.map