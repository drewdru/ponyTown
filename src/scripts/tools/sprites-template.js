"use strict";
// generated file
/* tslint:disable */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const bitUtils_1 = require("../common/bitUtils");
const sprites = createSprites('/*SPRITES*/');
const sprites2 = createSprites('/*SPRITES_PALETTE*/');
/*FONTS*/
const palettes = createPalettes('/*COLORS*/', [
/*PALETTES*/
]);
/*NAMED_SPRITES*/
/*NAMED_PALETTES*/
exports.spriteSheets = [
    {
        src: '/*SPRITE_SHEET*/',
        data: undefined, texture: undefined, sprites: sprites, palette: false
    },
    {
        src: '/*SPRITE_SHEET_PALETTE*/', srcA: '/*SPRITE_SHEET_PALETTE_ALPHA*/',
        data: undefined, texture: undefined, sprites: sprites2, palette: true
    },
];
exports.normalSpriteSheet = exports.spriteSheets[0];
exports.paletteSpriteSheet = exports.spriteSheets[1];
function createSprites(data) {
    const sprites = [
        { x: 0, y: 0, w: 0, h: 0, ox: 0, oy: 0, type: 0 },
    ];
    let offset = 0;
    const read = bitUtils_1.bitReaderCustom(() => {
        const value = parseInt(data.substr(offset, 2), 16);
        offset += 2;
        return value;
    });
    while (offset < data.length) {
        sprites.push({
            x: read(12),
            y: read(12),
            w: read(9),
            h: read(9),
            ox: read(8),
            oy: read(8),
            type: read(6),
        });
    }
    return sprites;
}
exports.createSprites = createSprites;
function createFont(sprites, groups) {
    const chars = [];
    for (const [start, codes] of groups) {
        for (let i = 0; i < codes.length; i++) {
            if (codes[i]) {
                chars.push({ code: start + i, sprite: sprites[codes[i]] });
            }
        }
    }
    return chars;
}
exports.createFont = createFont;
function createButton(border, topLeft, top, topRight, left, bg, right, bottomLeft, bottom, bottomRight) {
    return {
        border,
        topLeft: sprites[topLeft],
        top: sprites[top],
        topRight: sprites[topRight],
        left: sprites[left],
        bg: sprites[bg],
        right: sprites[right],
        bottomLeft: sprites[bottomLeft],
        bottom: sprites[bottom],
        bottomRight: sprites[bottomRight]
    };
}
exports.createButton = createButton;
function mapSprites(frames) {
    return frames.map(i => sprites[i]);
}
exports.mapSprites = mapSprites;
function mapSprites2(frames) {
    return frames.map(i => sprites2[i]);
}
exports.mapSprites2 = mapSprites2;
function createPalettes(colorsString, palettes) {
    const colors = colorsString.split(/ /g).map(utils_1.parseSpriteColor);
    return palettes.map(palette => {
        const result = new Uint32Array(palette.length);
        for (let i = 0; i < palette.length; i++) {
            result[i] = colors[palette[i]] >>> 0;
        }
        return result;
    });
}
exports.createPalettes = createPalettes;
function createColorPal(color, colors) {
    return { color: sprites2[color], colors };
}
exports.createColorPal = createColorPal;
function colorPal(colors) {
    return (color) => createColorPal(color, colors);
}
exports.colorPal = colorPal;
const colorPal3 = colorPal(3);
exports.colorPal3 = colorPal3;
const colorPal5 = colorPal(5);
exports.colorPal5 = colorPal5;
const colorPal7 = colorPal(7);
exports.colorPal7 = colorPal7;
const colorPal9 = colorPal(9);
exports.colorPal9 = colorPal9;
const colorPal11 = colorPal(11);
exports.colorPal11 = colorPal11;
const colorPal13 = colorPal(13);
exports.colorPal13 = colorPal13;
const colorPal17 = colorPal(17);
exports.colorPal17 = colorPal17;
function getPalette(index) {
    return palettes[index];
}
exports.getPalette = getPalette;
const emptyPalette = new Uint32Array(0);
function emptyColorPalette() {
    return { color: sprites2[0], palettes: [emptyPalette] };
}
exports.emptyColorPalette = emptyColorPalette;
function createSpritesPalette(sprites, paletteIndexes) {
    return { sprites: sprites.map(i => sprites2[i]), palettes: paletteIndexes.map(getPalette) };
}
exports.createSpritesPalette = createSpritesPalette;
function createColorPalette(color, paletteIndexes) {
    return { color: sprites2[color], palettes: paletteIndexes.map(getPalette) };
}
exports.createColorPalette = createColorPalette;
function createColorExtraPal(color, colors, extra, paletteIndexes) {
    return { color: sprites2[color], colors, extra: sprites2[extra], palettes: paletteIndexes.map(getPalette) };
}
exports.createColorExtraPal = createColorExtraPal;
function createShadow(shadow) {
    return { shadow: sprites2[shadow] };
}
exports.createShadow = createShadow;
function createColorShadowPalette(color, shadow, paletteIndexes) {
    return { color: sprites2[color], shadow: sprites2[shadow], palettes: paletteIndexes.map(getPalette) };
}
exports.createColorShadowPalette = createColorShadowPalette;
function createNose(color, colors, mouth, fangs) {
    return { color: sprites2[color], colors, mouth: sprites2[mouth], fangs: sprites2[fangs] };
}
exports.createNose = createNose;
function createEye(base, irises, shadow, shine) {
    return { base: sprites2[base], irises: mapSprites2(irises), shadow: sprites2[shadow || 0], shine: sprites2[shine || 0] };
}
exports.createEye = createEye;
function createAnimation(frames) {
    return { frames: mapSprites(frames) };
}
exports.createAnimation = createAnimation;
function createAnimationPalette(frames, palette) {
    return { frames: mapSprites2(frames), palette: getPalette(palette) };
}
exports.createAnimationPalette = createAnimationPalette;
function createAnimationShadow(frames, shadow, palette) {
    return { frames: mapSprites2(frames), shadow: sprites2[shadow], palette: getPalette(palette) };
}
exports.createAnimationShadow = createAnimationShadow;
//# sourceMappingURL=sprites-template.js.map