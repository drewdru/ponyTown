"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const ponyInfo_1 = require("../../../common/ponyInfo");
const colors_1 = require("../../../common/colors");
const canvasUtils_1 = require("../../../client/canvasUtils");
const ponyUtils_1 = require("../../../client/ponyUtils");
const ponyHelpers_1 = require("../../../client/ponyHelpers");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const color_1 = require("../../../common/color");
const spriteUtils_1 = require("../../../client/spriteUtils");
const graphicsUtils_1 = require("../../../graphics/graphicsUtils");
const ponyDraw_1 = require("../../../client/ponyDraw");
const sprites_1 = require("../../../generated/sprites");
const emoji_1 = require("../../../client/emoji");
const DEFAULT_STATE = ponyHelpers_1.defaultPonyState();
const DEFAULT_OPTIONS = ponyHelpers_1.defaultDrawPonyOptions();
let CharacterPreview = class CharacterPreview {
    constructor(zone) {
        this.zone = zone;
        this.scale = 3;
        this.state = ponyHelpers_1.defaultPonyState();
        this.noBackground = false;
        this.noOutline = false;
        this.noShadow = false;
        this.extra = false;
        this.passive = false;
        this.blinks = true;
        this.frame = 0;
        this.lastFrame = 0;
        this.initialized = false;
        this.nextBlink = performance.now() + 2000;
        this.blinkFrame = -1;
        this.onFrame = () => {
            if (this.passive && this.initialized) {
                this.frame = 0;
                this.tryDraw();
                return;
            }
            this.frame = requestAnimationFrame(this.onFrame);
            const now = performance.now();
            if ((now - this.lastFrame) > (1000 / 24)) {
                if (this.blinks) {
                    if (this.blinkFrame === -1) {
                        if (this.nextBlink < now) {
                            this.blinkFrame = 0;
                        }
                    }
                    else {
                        this.blinkFrame++;
                        if (this.blinkFrame >= ponyUtils_1.BLINK_FRAMES.length) {
                            this.nextBlink = now + Math.random() * 2000 + 3000;
                            this.blinkFrame = -1;
                        }
                    }
                    if (this.state) {
                        this.state.blinkFrame = this.blinkFrame === -1 ? 1 : ponyUtils_1.BLINK_FRAMES[this.blinkFrame];
                    }
                }
                this.lastFrame = now;
                this.tryDraw();
            }
        };
    }
    ngAfterViewInit() {
        return spriteUtils_1.loadAndInitSpriteSheets()
            .then(() => this.initialized = true)
            .then(() => this.ngOnChanges());
    }
    ngOnDestroy() {
        cancelAnimationFrame(this.frame);
    }
    ngOnChanges() {
        if (!this.frame) {
            this.zone.runOutsideAngular(() => this.frame = requestAnimationFrame(this.onFrame));
        }
    }
    redraw() {
        this.tryDraw();
    }
    blink() {
        this.nextBlink = performance.now();
    }
    tryDraw() {
        try {
            this.draw();
        }
        catch (_a) { }
    }
    draw() {
        if (!this.initialized)
            return;
        const canvas = this.canvas.nativeElement;
        const { width, height } = canvas.getBoundingClientRect();
        canvasUtils_1.resizeCanvasWithRatio(canvas, width, height, false);
        const scale = this.scale * canvasUtils_1.getPixelRatio();
        const bufferWidth = Math.round(canvas.width / scale);
        const bufferHeight = Math.round(canvas.height / scale);
        if (!bufferWidth || !bufferHeight)
            return;
        this.batch = this.batch || new contextSpriteBatch_1.ContextSpriteBatch(canvasUtils_1.createCanvas(bufferWidth, bufferHeight));
        canvasUtils_1.resizeCanvas(this.batch.canvas, bufferWidth, bufferHeight);
        const x = Math.round(bufferWidth / 2);
        const y = Math.round(bufferHeight / 2 + 28);
        if (this.pony) {
            this.batch.start(sprites_1.paletteSpriteSheet, this.noBackground ? colors_1.TRANSPARENT : colors_1.GRASS_COLOR);
            try {
                const options = Object.assign({}, DEFAULT_OPTIONS, { shadow: !this.noShadow, extra: !!this.extra });
                ponyDraw_1.drawPony(this.batch, ponyInfo_1.toPalette(this.pony), this.state || DEFAULT_STATE, x, y, options);
            }
            catch (e) {
                console.error(e);
            }
            this.batch.end();
        }
        const viewContext = canvas.getContext('2d');
        if (!viewContext)
            return;
        canvasUtils_1.disableImageSmoothing(viewContext);
        if (this.noBackground) {
            viewContext.clearRect(0, 0, canvas.width, canvas.height);
        }
        viewContext.save();
        viewContext.scale(scale, scale);
        // draw outline
        if (this.pony && this.noShadow && this.noBackground && !this.noOutline) {
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    viewContext.drawImage(this.batch.canvas, x, y);
                }
            }
            viewContext.globalCompositeOperation = 'source-in';
            viewContext.fillStyle = color_1.colorToCSS(colors_1.GRASS_COLOR);
            viewContext.fillRect(0, 0, viewContext.canvas.width, viewContext.canvas.height);
            viewContext.globalCompositeOperation = 'source-over';
        }
        viewContext.drawImage(this.batch.canvas, 0, 0);
        viewContext.restore();
        // draw name plate
        if (!this.noShadow && this.name) {
            const name = emoji_1.replaceEmojis(this.name);
            const scale = 2 * canvasUtils_1.getPixelRatio();
            const nameBufferWidth = Math.round(canvas.width / scale);
            this.nameBatch = this.nameBatch || new contextSpriteBatch_1.ContextSpriteBatch(canvasUtils_1.createCanvas(nameBufferWidth, 25));
            canvasUtils_1.resizeCanvas(this.nameBatch.canvas, nameBufferWidth, 25);
            this.nameBatch.start(sprites_1.paletteSpriteSheet, colors_1.TRANSPARENT);
            graphicsUtils_1.drawNamePlate(this.nameBatch, name, nameBufferWidth / 2, 11, graphicsUtils_1.DrawNameFlags.None, graphicsUtils_1.commonPalettes, this.tag);
            this.nameBatch.end();
            viewContext.save();
            viewContext.scale(scale, scale);
            viewContext.drawImage(this.nameBatch.canvas, 0, 10);
            viewContext.restore();
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "scale", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], CharacterPreview.prototype, "name", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], CharacterPreview.prototype, "tag", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "pony", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "state", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "noBackground", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "noOutline", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "noShadow", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "extra", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "passive", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterPreview.prototype, "blinks", void 0);
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], CharacterPreview.prototype, "canvas", void 0);
tslib_1.__decorate([
    core_1.HostListener('window:resize'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], CharacterPreview.prototype, "redraw", null);
CharacterPreview = tslib_1.__decorate([
    core_1.Component({
        selector: 'character-preview',
        template: '<canvas class="rounded" #canvas></canvas>',
        styles: [`:host { display: block; } canvas { width: 100%; height: 100%; }`],
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.NgZone])
], CharacterPreview);
exports.CharacterPreview = CharacterPreview;
//# sourceMappingURL=character-preview.js.map