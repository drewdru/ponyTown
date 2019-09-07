"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const canvasUtils_1 = require("../../../client/canvasUtils");
const ponyHelpers_1 = require("../../../client/ponyHelpers");
const spriteUtils_1 = require("../../../client/spriteUtils");
const ponyDraw_1 = require("../../../client/ponyDraw");
const sprites_1 = require("../../../generated/sprites");
const scales = {
    large: 3,
    medium: 2,
    small: 1,
};
const sizes = {
    large: 100,
    medium: 66,
    small: 33,
};
const BUFFER_SIZE = 34;
const options = ponyHelpers_1.defaultDrawPonyOptions();
const state = ponyHelpers_1.defaultPonyState();
let PortraitBox = class PortraitBox {
    constructor(zone) {
        this.zone = zone;
        this.noBorder = false;
        this.flip = false;
        this.size = 'large';
        this.pony = undefined;
        this.frame = 0;
    }
    ngAfterViewInit() {
        spriteUtils_1.loadAndInitSpriteSheets()
            .then(() => this.redraw());
    }
    ngOnChanges() {
        this.redraw();
    }
    redraw() {
        this.frame = this.frame || this.zone.runOutsideAngular(() => requestAnimationFrame(() => {
            this.frame = 0;
            this.draw();
        }));
    }
    draw() {
        const canvas = this.canvas.nativeElement;
        const size = sizes[this.size];
        canvasUtils_1.resizeCanvasWithRatio(canvas, size, size);
        const context = canvas.getContext('2d');
        if (context) {
            context.save();
            context.fillStyle = '#444';
            context.fillRect(0, 0, canvas.width, canvas.height);
            if (this.pony) {
                const scale = scales[this.size] * canvasUtils_1.getPixelRatio();
                this.batch = this.batch || new contextSpriteBatch_1.ContextSpriteBatch(canvasUtils_1.createCanvas(BUFFER_SIZE, BUFFER_SIZE));
                options.flipped = !this.flip;
                this.batch.start(sprites_1.paletteSpriteSheet, 0);
                ponyDraw_1.drawPony(this.batch, this.pony, state, 25, 54, options);
                this.batch.end();
                canvasUtils_1.disableImageSmoothing(context);
                context.scale(this.flip ? scale : -scale, scale);
                context.drawImage(this.batch.canvas, this.flip ? 0 : -BUFFER_SIZE, 0);
            }
            context.restore();
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PortraitBox.prototype, "noBorder", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PortraitBox.prototype, "flip", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PortraitBox.prototype, "size", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PortraitBox.prototype, "pony", void 0);
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], PortraitBox.prototype, "canvas", void 0);
PortraitBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'portrait-box',
        templateUrl: 'portrait-box.pug',
        styleUrls: ['portrait-box.scss'],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.NgZone])
], PortraitBox);
exports.PortraitBox = PortraitBox;
//# sourceMappingURL=portrait-box.js.map