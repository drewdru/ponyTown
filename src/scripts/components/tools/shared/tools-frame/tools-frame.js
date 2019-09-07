"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let openedPopover;
let ToolsFrame = class ToolsFrame {
    constructor(element) {
        this.element = element;
        this.x = 0;
        this.y = 0;
        this.reverseExtra = false;
        this.frameChange = new core_1.EventEmitter();
        this.popoverIsOpen = false;
        this.placement = 'right';
        this.savedFrame = 0;
        this.selected = false;
        this.closePopover = () => {
            if (this.popoverIsOpen) {
                this.togglePopover();
            }
        };
    }
    get sprite() {
        return this.sprites[this.frame];
    }
    togglePopover() {
        const rect = this.element.nativeElement.getBoundingClientRect();
        this.placement = (rect.left < (window.innerWidth / 2)) ? 'right' : 'left';
        if (!this.popoverIsOpen) {
            if (openedPopover) {
                openedPopover.popoverIsOpen = false;
            }
            openedPopover = this;
        }
        this.popoverIsOpen = !this.popoverIsOpen;
        if (this.popoverIsOpen) {
            this.selected = false;
            window.addEventListener('mousedown', this.closePopover);
        }
        else {
            window.removeEventListener('mousedown', this.closePopover);
        }
        setTimeout(() => { }, 10);
    }
    select(index) {
        this.selected = true;
        this.frame = index;
        this.togglePopover();
        this.frameChange.emit(this.frame);
    }
    enter(index) {
        if (!this.selected) {
            this.savedFrame = this.frame;
            this.frame = index;
            this.frameChange.emit(this.frame);
        }
    }
    leave() {
        if (!this.selected) {
            this.frame = this.savedFrame;
            this.frameChange.emit(this.frame);
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ToolsFrame.prototype, "x", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ToolsFrame.prototype, "y", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], ToolsFrame.prototype, "sprites", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Number)
], ToolsFrame.prototype, "frame", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ToolsFrame.prototype, "pony", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ToolsFrame.prototype, "reverseExtra", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], ToolsFrame.prototype, "circle", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], ToolsFrame.prototype, "frameChange", void 0);
ToolsFrame = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-frame',
        templateUrl: 'tools-frame.pug',
        styleUrls: ['tools-frame.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef])
], ToolsFrame);
exports.ToolsFrame = ToolsFrame;
//# sourceMappingURL=tools-frame.js.map