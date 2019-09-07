"use strict";
/// <reference path="../../typings/my.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const lodash_1 = require("lodash");
const palette_utils_1 = require("./palette-utils");
const sprite_sheet_1 = require("./sprite-sheet");
const canvas_utils_1 = require("./canvas-utils");
global.DEVELOPMENT = true;
exports.TRANSPARENT = 0;
exports.BLACK = 0x000000ff;
exports.WHITE = 0xffffffff;
exports.OUTLINE_COLOR = 0x9f9f9fff;
exports.SHADE_COLOR = 0xccccccff;
exports.LIGHT_SHADE_COLOR = 0xddddddff;
exports.TEAR_COLOR = 0xc1eef0ff;
exports.DARK_GRAY = 0x232728ff;
exports.MOUTH_COLOR = 0x721946ff;
exports.TONGUE_COLOR = 0xf39f4bff;
exports.TEETH_COLOR = 0x8cffffff;
exports.TEETH_SHADE_COLOR = 0x77d9d9ff;
// TEMP: remove after adding palettes for effects
const holdPoofColors = [
    0xffff47ff, 0xeaed58ff, 0xd8dc00ff, 0xff6741ff, 0xff0000ff, 0xff7af9ff, 0xff00ccff, 0xb67affff,
    0x9876ffff, 0x76a6ffff, 0x0097ffff, 0x00ff9bff, 0x76ed5cff, 0x28dc00ff, 0x76ed5cff,
];
exports.defaultPalette = [
    exports.TRANSPARENT, exports.WHITE, exports.BLACK, exports.MOUTH_COLOR, exports.TONGUE_COLOR, exports.LIGHT_SHADE_COLOR, exports.TEAR_COLOR, exports.DARK_GRAY,
    ...holdPoofColors,
];
function cartesian(...args) {
    return lodash_1.reduce(args, (a, b) => lodash_1.flatten(lodash_1.map(a, x => lodash_1.map(b, y => x.concat([y])))), [[]]);
}
exports.cartesian = cartesian;
function mkdir(dirpath) {
    try {
        fs.mkdirSync(dirpath);
    }
    catch (_a) { }
}
exports.mkdir = mkdir;
const isDirectory = (dir) => fs.lstatSync(dir).isDirectory();
exports.getDirectories = (dir) => fs.readdirSync(dir).map(name => path.join(dir, name)).filter(isDirectory);
function findLayerByPath([name, ...child], layer) {
    return name ? findLayerByPath(child, layer && findByName(layer.children, name)) : layer;
}
function findLayer(path, layer) {
    return findLayerByPath(path.split('/'), layer);
}
exports.findLayer = findLayer;
function findLayerSafe(name, parent) {
    const layer = findLayer(name, parent);
    if (!layer) {
        throw new Error(`Missing layer "${name}" in "${parent.info}"`);
    }
    return layer;
}
exports.findLayerSafe = findLayerSafe;
function findByName(items, name) {
    return items.find(i => i.name === name);
}
exports.findByName = findByName;
function findByIndex(items, index) {
    return items.find(i => i.index === index);
}
exports.findByIndex = findByIndex;
exports.nameMatches = (regex) => (l) => regex.test(l.name);
function compareNames(a, b) {
    return a.name.localeCompare(b.name);
}
exports.compareNames = compareNames;
exports.time = (function () {
    const start = Date.now();
    let last = start;
    return function (text) {
        console.log(text, (Date.now() - last), 'ms');
        last = Date.now();
        return true;
    };
})();
function spawnAsync(command, args) {
    return new Promise((resolve, reject) => {
        child_process_1.spawn(command, args)
            .on('error', (err) => reject(err))
            .on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Non-zero return code for ${command} (${code})`)));
    });
}
exports.spawnAsync = spawnAsync;
// canvas
function getCanvas(layer) {
    if (!layer)
        return undefined;
    const canvas = layer.canvas;
    if (canvas) {
        canvas.info = layer.info;
    }
    return canvas;
}
exports.getCanvas = getCanvas;
function getCanvasSafe(layer) {
    const canvas = getCanvas(layer);
    if (!canvas) {
        throw new Error(`Cannot find canvas in layer "${layer.info}"`);
    }
    return canvas;
}
exports.getCanvasSafe = getCanvasSafe;
function getLayerCanvas(name, parent) {
    return getCanvas(findLayer(name, parent));
}
exports.getLayerCanvas = getLayerCanvas;
function getLayerCanvasSafe(name, parent) {
    return getCanvasSafe(findLayerSafe(name, parent));
}
exports.getLayerCanvasSafe = getLayerCanvasSafe;
function parseWithNumber(name) {
    const match = /(\d+)/.exec(name);
    return parseInt(match ? match[1] : '0', 10);
}
exports.parseWithNumber = parseWithNumber;
exports.matcher = (regex) => (text) => regex.test(text);
const isArrayEmpty = (a) => !a || a.length === 0;
const nullForEmpty = (a) => isArrayEmpty(a) ? null : a;
function trimRight(items) {
    return lodash_1.dropRightWhile(items.map(nullForEmpty), isArrayEmpty);
}
exports.trimRight = trimRight;
// sprites
const redCanvas = canvas_utils_1.createColorCanvas(1000, 1000, 'red');
function addImage(images, canvas) {
    if (canvas) {
        // TODO: remove duplicated
        images.push(canvas);
        return images.length - 1;
    }
    else {
        return 0;
    }
}
exports.addImage = addImage;
function createSprite(index, image, { w, h, x, y }) {
    return { index, image, w, h, x: 0, y: 0, ox: x, oy: y };
}
exports.createSprite = createSprite;
const maxSpriteWidth = 500;
const maxSpriteHeight = 500;
function addSprite(sprites, canvas, pattern, palette, out = {}) {
    if (canvas) {
        const rect = sprite_sheet_1.getSpriteRect(canvas, 0, 0, canvas.width, canvas.height);
        if (rect.w && rect.h) {
            if (rect.w > maxSpriteWidth || rect.h > maxSpriteHeight) {
                throw new Error(`Sprite too large (${rect.w}, ${rect.h}) from [${canvas.info}]`);
            }
            const image = palette_utils_1.imageToPalette(rect, canvas, pattern || redCanvas, palette, out);
            sprites.push(createSprite(sprites.length, image, rect));
            return sprites.length - 1;
        }
    }
    return 0;
}
exports.addSprite = addSprite;
function addSpriteWithColors(sprites, colorImage, patternImage, forceWhite) {
    const out = { forceWhite };
    const color = addSprite(sprites, colorImage, patternImage, undefined, out);
    return { color, colors: out.colors };
}
exports.addSpriteWithColors = addSpriteWithColors;
function getColorsCount(colorImage, patternImage, forceWhite) {
    const out = { forceWhite };
    addSprite([], colorImage, patternImage, undefined, out);
    return out.colors;
}
exports.getColorsCount = getColorsCount;
function createPixelSprites({ objects, objects2, images, sprites }) {
    const pixel = canvas_utils_1.createColorCanvas(3, 3, 'white');
    objects['pixelRect'] = addImage(images, pixel);
    objects2['pixelRect2'] = addSprite(sprites, pixel, undefined, exports.defaultPalette);
}
exports.createPixelSprites = createPixelSprites;
// layers
exports.compareLayers = (a, b) => parseWithNumber(a.name) - parseWithNumber(b.name);
function getPatternLayers(layer) {
    return layer.children.filter(exports.nameMatches(/^pattern/)).sort(exports.compareLayers);
}
exports.getPatternLayers = getPatternLayers;
function getPatternCanvases(layer) {
    const canvases = getPatternLayers(layer).map(getCanvas);
    return lodash_1.dropRightWhile(canvases, canvas_utils_1.isCanvasEmpty);
}
exports.getPatternCanvases = getPatternCanvases;
function clipPattern(color, pattern) {
    if (pattern) {
        const ctx = pattern.getContext('2d');
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(color, 0, 0);
    }
    return pattern;
}
exports.clipPattern = clipPattern;
//# sourceMappingURL=common.js.map