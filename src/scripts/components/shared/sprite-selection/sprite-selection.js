"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const htmlUtils_1 = require("../../../client/htmlUtils");
const MAX = 999999;
let SpriteSelection = class SpriteSelection {
    constructor(element) {
        this.element = element;
        this.selected = 0;
        this.selectedChange = new core_1.EventEmitter();
        this.reverseExtra = false;
        this.limit = MAX;
        this.skip = 0;
        this.disabled = false;
        this.invisible = false;
        this.darken = true;
        this.id = lodash_1.uniqueId('sprite-selection-');
    }
    get hasMore() {
        return this.sprites && this.sprites.length > this.limit;
    }
    get end() {
        return this.skip + this.limit;
    }
    get activeDescendant() {
        return `${this.id}-${this.selected - this.skip}`;
    }
    isSelected(index) {
        return this.selected === (index + this.skip);
    }
    select(index, focus = false) {
        if (!this.disabled && this.selected !== index) {
            this.selected = index;
            this.selectedChange.emit(index);
            if (this.hasMore && index >= this.end) {
                this.showMore();
            }
            if (focus) {
                htmlUtils_1.focusElementAfterTimeout(this.element.nativeElement, '.active');
            }
        }
    }
    showMore() {
        this.limit = MAX;
    }
    keydown(e) {
        const select = this.handleKey(e.keyCode);
        if (select !== undefined) {
            e.preventDefault();
            this.select(select, true);
        }
    }
    handleKey(keyCode) {
        if (this.sprites) {
            if (keyCode === 39 /* RIGHT */ || keyCode === 40 /* DOWN */) {
                if (this.selected >= (this.sprites.length - 1)) {
                    return this.skip;
                }
                else {
                    return this.selected + 1;
                }
            }
            else if (keyCode === 37 /* LEFT */ || keyCode === 38 /* UP */) {
                if (this.selected <= this.skip) {
                    return this.sprites.length - 1;
                }
                else {
                    return this.selected - 1;
                }
            }
            else if (keyCode === 36 /* HOME */) {
                return this.skip;
            }
            else if (keyCode === 35 /* END */) {
                return this.sprites.length - 1;
            }
        }
        return undefined;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "selected", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "selectedChange", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], SpriteSelection.prototype, "sprites", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "fill", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "outline", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], SpriteSelection.prototype, "circle", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "reverseExtra", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "limit", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "skip", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "disabled", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], SpriteSelection.prototype, "emptyLabel", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "invisible", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteSelection.prototype, "darken", void 0);
SpriteSelection = tslib_1.__decorate([
    core_1.Component({
        selector: 'sprite-selection',
        templateUrl: 'sprite-selection.pug',
        styleUrls: ['sprite-selection.scss'],
        host: {
            'role': 'radiogroup',
            'tabindex': '0',
            '(keydown)': 'keydown($event)',
            '[attr.aria-activedescendant]': 'activeDescendant',
        },
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], SpriteSelection);
exports.SpriteSelection = SpriteSelection;
//# sourceMappingURL=sprite-selection.js.map