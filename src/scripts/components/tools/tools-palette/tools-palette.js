"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const sprites = require("../../../generated/sprites");
const mixins_1 = require("../../../common/mixins");
const color_1 = require("../../../common/color");
const paletteManager_1 = require("../../../graphics/paletteManager");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const canvasUtils_1 = require("../../../client/canvasUtils");
const colors_1 = require("../../../common/colors");
const spriteUtils_1 = require("../../../client/spriteUtils");
const icons_1 = require("../../../client/icons");
const BG = color_1.parseColor('lightgreen');
const DEFAULT_PALETTE = [0, 0xffffffff];
const paletteManager = new paletteManager_1.PaletteManager();
const defaultPalette = paletteManager.add(DEFAULT_PALETTE);
let ToolsPalette = class ToolsPalette {
    constructor() {
        this.homeIcon = icons_1.faHome;
        this.scale = 3;
        this.sprites = Object.keys(sprites).filter(key => {
            const s = sprites[key];
            return !!(s && s.color);
        });
        this.spriteName = '';
        this.palette = ['red', 'blue', 'orange', 'violet'].map(x => ({ original: x, current: x }));
    }
    ngOnInit() {
        mixins_1.setPaletteManager(paletteManager);
        spriteUtils_1.loadAndInitSpriteSheets().then(() => this.redraw());
    }
    spriteChanged() {
        this.redraw();
    }
    loadPalette() {
        const sprite = sprites[this.spriteName];
        if (sprite) {
            this.palette = Array.from(sprite.palettes[0]).map(color_1.colorToCSS).map(c => ({ original: c, current: c }));
        }
        this.redraw();
    }
    redraw() {
        const canvas = this.canvas.nativeElement;
        const width = Math.ceil(canvas.width / this.scale);
        const height = Math.ceil(canvas.height / this.scale);
        const buffer = contextSpriteBatch_1.drawCanvas(width, height, sprites.paletteSpriteSheet, BG, batch => {
            const sprite = sprites[this.spriteName];
            if (sprite) {
                const palette = paletteManager.add(this.palette.map(x => color_1.parseColor(x.current)));
                const x = (width - (sprite.color.w + sprite.color.ox)) / 2;
                const y = (height - (sprite.color.h + sprite.color.oy)) / 2;
                console.log(x, y, width, sprite.color.w, sprite.color.ox);
                batch.drawSprite(sprite.shadow, colors_1.SHADOW_COLOR, defaultPalette, x, y);
                batch.drawSprite(sprite.color, colors_1.WHITE, palette, x, y);
                paletteManager_1.releasePalette(palette);
            }
        });
        const viewContext = canvas.getContext('2d');
        viewContext.save();
        canvasUtils_1.disableImageSmoothing(viewContext);
        viewContext.scale(this.scale, this.scale);
        viewContext.drawImage(buffer, 0, 0);
        viewContext.restore();
    }
};
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ToolsPalette.prototype, "canvas", void 0);
ToolsPalette = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-palette',
        templateUrl: 'tools-palette.pug',
    })
], ToolsPalette);
exports.ToolsPalette = ToolsPalette;
//# sourceMappingURL=tools-palette.js.map