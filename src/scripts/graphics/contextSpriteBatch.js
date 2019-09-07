"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const canvasUtils_1 = require("../client/canvasUtils");
const color_1 = require("../common/color");
const baseStateBatch_1 = require("./baseStateBatch");
const graphicsUtils_1 = require("./graphicsUtils");
const mat2d_1 = require("../common/mat2d");
const colors_1 = require("../common/colors");
function drawBatch(canvas, sheet, bg, action) {
    const batch = new ContextSpriteBatch(canvas);
    batch.start(sheet, bg || colors_1.TRANSPARENT);
    action(batch);
    batch.end();
    return canvas;
}
exports.drawBatch = drawBatch;
function drawCanvas(width, height, sheet, bg, action) {
    return drawBatch(canvasUtils_1.createCanvas(width, height), sheet, bg, action);
}
exports.drawCanvas = drawCanvas;
class ContextSpriteBatch extends baseStateBatch_1.BaseStateBatch {
    constructor(canvas) {
        super();
        this.canvas = canvas;
        this.pixelSize = 1;
        this.disableShading = false;
        this.ignoreColor = 0;
        this.palette = false;
        this.started = false;
        this.data = undefined;
        this.sheet = undefined;
        this.sheetData = undefined;
    }
    start(sheet, clearColor) {
        if (!this.data || this.data.width !== this.canvas.width || this.data.height !== this.canvas.height) {
            if (this.canvas && this.canvas.width && this.canvas.height) {
                this.data = this.canvas.getContext('2d').getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        if (this.data) {
            const color = clearColor || 0;
            const r = color_1.getR(color);
            const g = color_1.getG(color);
            const b = color_1.getB(color);
            const a = color_1.getAlpha(color);
            const data = this.data.data;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
                data[i + 3] = a;
            }
        }
        this.sheet = sheet;
        this.sheetData = sheet.data;
        this.palette = this.sheet.palette;
        this.started = true;
    }
    // clear(color?: number) {
    // 	this.end();
    // 	const context = this.canvas.getContext('2d')!;
    // 	if (color !== undefined) {
    // 		context.fillStyle = colorToCSS(color);
    // 		context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // 	} else {
    // 		context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // 	}
    // }
    end() {
        if (this.started) {
            if (this.data) {
                this.canvas.getContext('2d').putImageData(this.data, 0, 0);
            }
            this.started = false;
        }
    }
    drawSprite(s, color, palette, x, y) {
        if (s !== undefined) {
            if (y === undefined) {
                y = x;
                x = palette;
                drawImageNormal(this.sheetData, this.data, this.transform, this.globalAlpha, color, s.x, s.y, s.w, s.h, x + s.ox, y + s.oy, s.w, s.h);
            }
            else {
                drawImagePalette(this.sheetData, this.data, this.transform, this.globalAlpha, this.ignoreColor, this.disableShading, s.type, color, palette, s.x, s.y, s.w, s.h, x + s.ox, y + s.oy, s.w, s.h);
            }
        }
    }
    drawImage(colorOrType, sxOrColor, syOrPalette, swOrSx, shOrSy, dxOrSw, dyOrSh, dwOrDx, dhOrDy, _OrDw, _OrDh) {
        if (_OrDh === undefined) {
            drawImageNormal(this.sheetData, this.data, this.transform, this.globalAlpha, colorOrType, sxOrColor, syOrPalette, swOrSx, shOrSy, dxOrSw, dyOrSh, dwOrDx, dhOrDy);
        }
        else {
            drawImagePalette(this.sheetData, this.data, this.transform, this.globalAlpha, this.ignoreColor, this.disableShading, colorOrType, sxOrColor, syOrPalette, swOrSx, shOrSy, dxOrSw, dyOrSh, dwOrDx, dhOrDy, _OrDw, _OrDh);
        }
    }
    drawRect(color, x, y, w, h) {
        drawRect(this.data, this.transform, this.globalAlpha, color, x, y, w, h);
    }
    drawBatch() {
        throw new Error('drawBatch not supported');
    }
    startBatch() {
    }
    finishBatch() {
        return undefined;
    }
    releaseBatch() {
    }
}
exports.ContextSpriteBatch = ContextSpriteBatch;
const min = Math.min;
const typeOffsets = [0, 2, 3, 0, 1, 2, 3];
function drawRect(dst, transform, globalAlpha, color, x, y, w, h) {
    if (DEVELOPMENT && !mat2d_1.isTranslation(transform)) {
        console.error('Transform not supported');
    }
    if (!dst)
        return;
    x = Math.round(x + transform[4]);
    y = Math.round(y + transform[5]);
    const xx = min(0, x, x);
    w += xx;
    x -= xx;
    const yy = min(0, y, y);
    h += yy;
    y -= yy;
    w += min(0, dst.width - (x + w));
    h += min(0, dst.height - (y + h));
    if (w <= 0 && h <= 0)
        return;
    const { r, g, b, a } = color_1.colorToRGBA(color);
    const alpha = (globalAlpha * a) | 0;
    if (alpha === 0)
        return;
    const dstData = dst.data;
    const dstWidth = dst.width | 0;
    for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
            const dst0 = ((ix + x) + (iy + y) * dstWidth) << 2;
            blendPrecise(dstData, dst0, r, g, b, alpha);
        }
    }
}
function drawImageNormal(src, dst, transform, globalAlpha, tint, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (sw !== dw || sh !== dh)
        throw new Error('Different dimentions not supported');
    if (DEVELOPMENT && !mat2d_1.isTranslation(transform)) {
        console.error('Transform not supported');
    }
    if (!src || !dst)
        return;
    dx = Math.round(dx + transform[4]);
    dy = Math.round(dy + transform[5]);
    let w = sw;
    let h = sh;
    const xx = min(0, sx, dx);
    w += xx;
    dx -= xx;
    sx -= xx;
    const yy = min(0, sy, dy);
    h += yy;
    dy -= yy;
    sy -= yy;
    w += min(0, src.width - (sx + w), dst.width - (dx + w));
    h += min(0, src.height - (sy + h), dst.height - (dy + h));
    if (w <= 0 && h <= 0)
        return;
    const { r, g, b, a } = color_1.colorToRGBA(tint);
    const alpha = (globalAlpha * a) | 0;
    const dstData = dst.data;
    const srcData = src.data;
    const dstWidth = dst.width | 0;
    const srcWidth = src.width | 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const srcO = ((sx + x) + (sy + y) * srcWidth) << 2;
            const sr = srcData[srcO];
            const sg = srcData[srcO + 1];
            const sb = srcData[srcO + 2];
            const sa = srcData[srcO + 3];
            const srcAlpha = blendColor(alpha, sa, 255);
            if (srcAlpha !== 0) {
                const rr = blendColor(r, sr, 255);
                const gg = blendColor(g, sg, 255);
                const bb = blendColor(b, sb, 255);
                const dst0 = ((dx + x) + (dy + y) * dstWidth) << 2;
                blendPrecise(dstData, dst0, rr, gg, bb, srcAlpha);
            }
        }
    }
}
function drawImagePalette(src, dst, transform, globalAlpha, ignoreColorOption, disableShadingOption, type, tint, palette, sx, sy, sw, sh, dx, dy, dw, dh) {
    if (sw !== dw || sh !== dh)
        throw new Error('Different dimentions not supported');
    if (DEVELOPMENT && !mat2d_1.isTranslation(transform)) {
        console.error('Transform not supported');
    }
    if (palette === undefined) {
        palette = graphicsUtils_1.commonPalettes.defaultPalette;
    }
    if (!src || !dst)
        return;
    dx = Math.round(dx + transform[4]);
    dy = Math.round(dy + transform[5]);
    let w = sw;
    let h = sh;
    const xx = min(0, sx, dx);
    w += xx;
    dx -= xx;
    sx -= xx;
    const yy = min(0, sy, dy);
    h += yy;
    dy -= yy;
    sy -= yy;
    w += min(0, src.width - (sx + w), dst.width - (dx + w));
    h += min(0, src.height - (sy + h), dst.height - (dy + h));
    if (w <= 0 && h <= 0)
        return;
    const { r, g, b, a } = color_1.colorToRGBA(tint);
    const alpha = (globalAlpha * a) | 0;
    const colors = palette.colors;
    const dstData = dst.data;
    const srcData = src.data;
    const dstWidth = dst.width | 0;
    const srcWidth = src.width | 0;
    const ignoreColor = ignoreColorOption >>> 0;
    const disableShading = disableShadingOption || type > 2;
    const offset = typeOffsets[type];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const srcO = ((sx + x) + (sy + y) * srcWidth) << 2;
            const index = srcData[srcO + offset];
            const color = colors[index];
            const srcAlpha = ignoreColor === color ? 0 : blendColor(color_1.getAlpha(color), alpha, 255);
            if (srcAlpha !== 0) {
                const shade = disableShading ? 255 : srcData[srcO + 1];
                const rr = blendColor(color_1.getR(color), r, shade);
                const gg = blendColor(color_1.getG(color), g, shade);
                const bb = blendColor(color_1.getB(color), b, shade);
                const dst0 = ((dx + x) + (dy + y) * dstWidth) << 2;
                blendPrecise(dstData, dst0, rr, gg, bb, srcAlpha);
            }
        }
    }
}
function blendColor(base, tint, shade) {
    return (((((base * tint) | 0) * shade) | 0) / 65025) | 0;
}
function blendPrecise(dstData, dst0, r, g, b, alpha) {
    if (alpha === 0xff || dstData[dst0 + 3] === 0) {
        dstData[dst0] = r;
        dstData[dst0 + 1] = g;
        dstData[dst0 + 2] = b;
        dstData[dst0 + 3] = alpha;
    }
    else {
        const dstAlpha = (0xff - alpha) | 0;
        dstData[dst0] = ((((r * alpha) | 0) / 255) | 0) + ((((dstData[dst0] * dstAlpha) | 0) / 255) | 0);
        dstData[dst0 + 1] = ((((g * alpha) | 0) / 255) | 0) + ((((dstData[dst0 + 1] * dstAlpha) | 0) / 255) | 0);
        dstData[dst0 + 2] = ((((b * alpha) | 0) / 255) | 0) + ((((dstData[dst0 + 2] * dstAlpha) | 0) / 255) | 0);
        const a = (alpha + ((((dstData[dst0 + 3] * dstAlpha) | 0) / 255) | 0)) | 0;
        dstData[dst0 + 3] = a > 0xff ? 0xff : a;
    }
}
// function blendFast(dstData: Uint8ClampedArray, dst0: number, r: number, g: number, b: number, alpha: number) {
// 	if (alpha === 0xff) {
// 		dstData[dst0] = r;
// 		dstData[dst0 + 1] = g;
// 		dstData[dst0 + 2] = b;
// 		dstData[dst0 + 3] = alpha;
// 	} else {
// 		const dstAlpha = (0xff - alpha) | 0;
// 		dstData[dst0] = ((r * alpha) >> 8) + ((dstData[dst0] * dstAlpha) >> 8);
// 		dstData[dst0 + 1] = ((g * alpha) >> 8) + ((dstData[dst0 + 1] * dstAlpha) >> 8);
// 		dstData[dst0 + 2] = ((b * alpha) >> 8) + ((dstData[dst0 + 2] * dstAlpha) >> 8);
// 		dstData[dst0 + 3] = min(0xff, alpha + ((dstData[dst0 + 3] * dstAlpha) >> 8));
// 	}
// }
//# sourceMappingURL=contextSpriteBatch.js.map