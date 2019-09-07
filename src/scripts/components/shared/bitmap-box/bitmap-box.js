"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const color_1 = require("../../../common/color");
let BitmapBox = class BitmapBox {
    constructor() {
        this.width = 5;
        this.height = 5;
        this.color = 'red';
        this.colorChange = new core_1.EventEmitter();
    }
    ngOnChanges(changes) {
        if (changes.width || changes.height) {
            this.rows = [];
            for (let y = 0; y < this.height; y++) {
                this.rows[y] = [];
                for (let x = 0; x < this.width; x++) {
                    this.rows[y][x] = x + this.width * y;
                }
            }
        }
    }
    draw(index) {
        if (this.bitmap) {
            if (this.tool === 'eraser') {
                this.bitmap[index] = '';
            }
            else if (this.tool === 'brush') {
                this.bitmap[index] = color_1.parseColor(this.bitmap[index]) === color_1.parseColor(this.color) ? '' : this.color;
            }
            else if (this.tool === 'eyedropper') {
                this.color = this.bitmap[index];
                this.colorChange.emit(this.color);
            }
        }
    }
    colorAt(index) {
        return this.bitmap && this.bitmap[index] ? color_1.colorToCSS(color_1.parseColor(this.bitmap[index])) : '';
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], BitmapBox.prototype, "width", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], BitmapBox.prototype, "height", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], BitmapBox.prototype, "bitmap", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], BitmapBox.prototype, "tool", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], BitmapBox.prototype, "color", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], BitmapBox.prototype, "colorChange", void 0);
BitmapBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'bitmap-box',
        templateUrl: 'bitmap-box.pug',
        styleUrls: ['bitmap-box.scss'],
    })
], BitmapBox);
exports.BitmapBox = BitmapBox;
//# sourceMappingURL=bitmap-box.js.map