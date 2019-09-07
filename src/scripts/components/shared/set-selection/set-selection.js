"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const spriteUtils_1 = require("../../../client/spriteUtils");
const FILLS = ['Orange', 'DodgerBlue', 'LimeGreen', 'Orchid', 'crimson', 'Aquamarine'];
const OUTLINES = ['Chocolate', 'SteelBlue', 'ForestGreen', 'DarkOrchid', 'darkred', 'DarkTurquoise'];
let SetOutlineHidden = class SetOutlineHidden {
    constructor() {
        this.setOutlineHidden = false;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetOutlineHidden.prototype, "setOutlineHidden", void 0);
SetOutlineHidden = tslib_1.__decorate([
    core_1.Directive({
        selector: '[setOutlineHidden]',
    })
], SetOutlineHidden);
exports.SetOutlineHidden = SetOutlineHidden;
let SetSelection = class SetSelection {
    constructor(hidden) {
        this.hidden = hidden;
        this.exampleFills = FILLS;
        this.exampleOutlines = OUTLINES;
        this.outlineHidden = false;
        this.nonLockable = false;
        this.compact = false;
        this.onlyPatterns = false;
        this.darken = true;
        this.change = new core_1.EventEmitter();
    }
    get isOutlineHidden() {
        return this.hidden ? this.hidden.setOutlineHidden : this.outlineHidden;
    }
    get patternColors() {
        const set = this.getSet();
        const pat = this.set && set && set[this.set.pattern || 0];
        if (pat && !pat.colors) {
            return 0;
        }
        else if (pat) {
            return spriteUtils_1.getColorCount(pat);
        }
        else {
            return this.nonLockable ? 1 : 0;
        }
    }
    get showColorPatterns() {
        const type = this.set && this.set.type || 0;
        const set = this.sets && this.sets[type];
        return !!set && set.length > 1;
    }
    ngOnChanges() {
        this.sprites = this.sets ? this.sets.map(s => s ? s[0] : undefined) : undefined;
    }
    onChange() {
        const set = this.getSet();
        if (this.set && set) {
            this.set.pattern = lodash_1.clamp(this.set.pattern || 0, 0, set.length - 1);
        }
        this.change.emit();
    }
    getSet() {
        return this.set && this.sets && this.sets[this.set.type || 0];
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], SetSelection.prototype, "label", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], SetSelection.prototype, "base", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "set", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "sets", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "sprites", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], SetSelection.prototype, "circle", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "outlineHidden", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "nonLockable", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "compact", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "onlyPatterns", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "darken", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], SetSelection.prototype, "change", void 0);
SetSelection = tslib_1.__decorate([
    core_1.Component({
        selector: 'set-selection',
        templateUrl: 'set-selection.pug',
        styleUrls: ['set-selection.scss'],
    }),
    tslib_1.__param(0, core_1.Optional()),
    tslib_1.__metadata("design:paramtypes", [SetOutlineHidden])
], SetSelection);
exports.SetSelection = SetSelection;
//# sourceMappingURL=set-selection.js.map