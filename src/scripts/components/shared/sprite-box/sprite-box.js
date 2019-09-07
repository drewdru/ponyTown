"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const color_1 = require("../../../common/color");
const ponyInfo_1 = require("../../../common/ponyInfo");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const canvasUtils_1 = require("../../../client/canvasUtils");
const colors_1 = require("../../../common/colors");
const rect_1 = require("../../../common/rect");
const spriteUtils_1 = require("../../../client/spriteUtils");
const icons_1 = require("../../../client/icons");
const sprites_1 = require("../../../generated/sprites");
let redrawFrame = 0;
const forRedraw = [];
function drawAll() {
    redrawFrame = 0;
    forRedraw.forEach(box => box.draw());
    forRedraw.length = 0;
}
let SpriteBox = class SpriteBox {
    constructor(zone, iterableDiffers) {
        this.zone = zone;
        this.debug = DEVELOPMENT;
        this.noneIcon = icons_1.faTimes;
        this.size = 52;
        this.scale = 2;
        this.x = 0;
        this.y = 0;
        this.center = true;
        this.invisible = false;
        this.darken = true;
        this.fillDiffer = iterableDiffers.find([]).create();
        this.outlineDiffer = iterableDiffers.find([]).create();
    }
    get circle() {
        return this._circle;
    }
    set circle(value) {
        this._circle = color_1.colorToCSS(color_1.parseColor(value || ''));
    }
    ngAfterViewInit() {
        spriteUtils_1.loadAndInitSpriteSheets().then(() => this.redraw());
    }
    ngDoCheck() {
        const fillChanges = this.fill && Array.isArray(this.fill) && this.fillDiffer.diff(this.fill);
        const outlineChanges = this.outline && Array.isArray(this.outline) && this.outlineDiffer.diff(this.outline);
        if (fillChanges || outlineChanges) {
            this.redraw();
        }
    }
    ngOnChanges() {
        this.redraw();
    }
    redraw() {
        if (!redrawFrame) {
            this.zone.runOutsideAngular(() => redrawFrame = requestAnimationFrame(drawAll));
        }
        if (forRedraw.indexOf(this) === -1) {
            forRedraw.push(this);
        }
    }
    draw() {
        const size = this.size;
        const scale = this.scale;
        const canvas = this.canvas.nativeElement;
        if (!size || this.invisible)
            return;
        if (canvas.width !== size || canvas.height !== size) {
            canvas.width = size;
            canvas.height = size;
        }
        const context = canvas.getContext('2d');
        if (!context)
            return;
        context.save();
        context.clearRect(0, 0, canvas.width, canvas.height);
        const sprite = this.sprite;
        if (sprite) {
            if (this.circle) {
                context.fillStyle = this.circle;
                context.beginPath();
                context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 3, 0, Math.PI * 2);
                context.fill();
            }
            const bufferSize = size / scale;
            const batch = this.batch = this.batch || new contextSpriteBatch_1.ContextSpriteBatch(canvasUtils_1.createCanvas(bufferSize, bufferSize));
            canvasUtils_1.resizeCanvas(batch.canvas, bufferSize, bufferSize);
            const fills = Array.isArray(this.fill) ? this.fill : [this.fill];
            const outlines = Array.isArray(this.outline) ? this.outline : [this.outline];
            const paletteColors = ponyInfo_1.toColorList(ponyInfo_1.getColorsFromSet({ fills, outlines }, '000000', this.darken));
            const palette = ponyInfo_1.mockPaletteManager.addArray(paletteColors);
            const extraPalette = sprite.palettes && ponyInfo_1.mockPaletteManager.addArray(sprite.palettes[0]);
            let x = this.x;
            let y = this.y;
            if (this.center) {
                const bounds = rect_1.rect(0, 0, 0, 0);
                addRect(bounds, sprite.color);
                addRect(bounds, sprite.extra);
                if (sprite.colorMany) {
                    sprite.colorMany.forEach(c => addRect(bounds, c));
                }
                x = Math.round((bufferSize - bounds.w) / 2 - bounds.x);
                y = Math.round((bufferSize - bounds.h) / 2 - bounds.y);
            }
            batch.start(sprites_1.paletteSpriteSheet, 0);
            if (this.reverseExtra) {
                batch.drawSprite(sprite.extra, colors_1.WHITE, extraPalette, x, y);
            }
            if (sprite.colorMany) {
                for (const color of sprite.colorMany) {
                    batch.drawSprite(color, colors_1.WHITE, palette, x, y);
                }
            }
            else {
                batch.drawSprite(sprite.color, colors_1.WHITE, palette, x, y);
            }
            if (!this.reverseExtra) {
                batch.drawSprite(sprite.extra, colors_1.WHITE, extraPalette, x, y);
            }
            batch.end();
            canvasUtils_1.disableImageSmoothing(context);
            context.scale(scale, scale);
            context.drawImage(batch.canvas, 0, 0);
        }
        context.restore();
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "size", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "scale", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "x", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "y", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "center", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Number)
], SpriteBox.prototype, "index", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "sprite", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "palette", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "fill", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "outline", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Boolean)
], SpriteBox.prototype, "reverseExtra", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "timestamp", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "invisible", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], SpriteBox.prototype, "darken", void 0);
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], SpriteBox.prototype, "canvas", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], SpriteBox.prototype, "circle", null);
SpriteBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'sprite-box',
        templateUrl: 'sprite-box.pug',
        styleUrls: ['sprite-box.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.NgZone, core_1.IterableDiffers])
], SpriteBox);
exports.SpriteBox = SpriteBox;
function addRect(rect, sprite) {
    if (sprite && sprite.w && sprite.h) {
        if (rect.w === 0 || rect.h === 0) {
            rect.x = sprite.ox;
            rect.y = sprite.oy;
            rect.w = sprite.w;
            rect.h = sprite.h;
        }
        else {
            const x = Math.min(rect.x, sprite.ox);
            const y = Math.min(rect.y, sprite.oy);
            rect.w = Math.max(rect.x + rect.w, sprite.ox + sprite.w) - x;
            rect.h = Math.max(rect.y + rect.h, sprite.oy + sprite.h) - y;
            rect.x = x;
            rect.y = y;
        }
    }
}
//# sourceMappingURL=sprite-box.js.map