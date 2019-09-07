"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const canvas_1 = require("canvas");
function loadImage(filePath) {
    const image = new canvas_1.Image();
    image.src = fs.readFileSync(filePath);
    image.currentSrc = filePath;
    return image;
}
exports.loadImage = loadImage;
function createExtCanvas(width, height, info) {
    const canvas = canvas_1.createCanvas(width, height);
    canvas.info = info;
    return canvas;
}
exports.createExtCanvas = createExtCanvas;
function imageToCanvas(image) {
    const canvas = createExtCanvas(image.width, image.height, `imageToCanvas(${image.currentSrc})`);
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas;
}
exports.imageToCanvas = imageToCanvas;
function cropCanvas(canvas, x, y, w, h) {
    if (Math.round(x) !== x || Math.round(y) !== y || Math.round(w) !== w || Math.round(h) !== h) {
        throw new Error(`Invalid cropping dimentions (${x} ${y} ${w} ${h})`);
    }
    const result = createExtCanvas(w, h, `${canvas ? canvas.info : 'from null'} (cropped ${x} ${y} ${w} ${h})`);
    if (canvas) {
        w = Math.min(w, canvas.width - x);
        h = Math.min(h, canvas.height - y);
        result.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h);
    }
    return result;
}
exports.cropCanvas = cropCanvas;
function mirrorCanvas(canvas, offsetX = 0) {
    const mirrored = createExtCanvas(canvas.width, canvas.height, `${canvas.info} (mirrored)`);
    const context = mirrored.getContext('2d');
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.translate(offsetX, 0);
    context.drawImage(canvas, 0, 0);
    return mirrored;
}
exports.mirrorCanvas = mirrorCanvas;
function padCanvas(canvas, left, top, right = 0, bottom = 0, bg) {
    if (left === 0 && top === 0 && right === 0 && bottom === 0)
        return canvas;
    const result = createExtCanvas(canvas.width + left + right, canvas.height + top + bottom, `${canvas.info} (pad ${left} ${top} ${right} ${bottom})`);
    const context = result.getContext('2d');
    if (bg) {
        context.fillStyle = bg;
        context.fillRect(0, 0, result.width, result.height);
    }
    context.drawImage(canvas, left, top);
    return result;
}
exports.padCanvas = padCanvas;
function clipCanvas(canvas, x, y, w, h) {
    return padCanvas(cropCanvas(canvas, x, y, w, h), x, y, canvas.width - (w + x), canvas.height - (h + y));
}
exports.clipCanvas = clipCanvas;
function mergeCanvases(...canvases) {
    const existing = canvases.filter(c => !!c);
    const { width, height } = existing[0];
    const result = createExtCanvas(width, height, existing.map(c => c.info).join(' + '));
    const context = result.getContext('2d');
    existing.forEach(c => context.drawImage(c, 0, 0));
    return result;
}
exports.mergeCanvases = mergeCanvases;
function reverseMaskCanvas(canvas) {
    if (!canvas)
        return undefined;
    const result = createExtCanvas(canvas.width, canvas.height, `${canvas.info} reversed mask`);
    const context = result.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'destination-out';
    context.drawImage(canvas, 0, 0);
    return result;
}
exports.reverseMaskCanvas = reverseMaskCanvas;
function maskCanvas(canvas, mask) {
    if (!canvas || !mask)
        return undefined;
    const result = createExtCanvas(canvas.width, canvas.height, `${canvas.info} masked by ${mask.info}`);
    const context = result.getContext('2d');
    context.drawImage(canvas, 0, 0);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(mask, 0, 0);
    return result;
}
exports.maskCanvas = maskCanvas;
function colorCanvas(canvas, color) {
    const copy = copyCanvas(canvas);
    if (copy) {
        const context = copy.getContext('2d');
        context.globalCompositeOperation = 'source-in';
        context.fillStyle = color;
        context.fillRect(0, 0, copy.width, copy.height);
    }
    return copy;
}
exports.colorCanvas = colorCanvas;
function copyCanvas(canvas) {
    if (!canvas)
        return undefined;
    const newCanvas = createExtCanvas(canvas.width, canvas.height, `${canvas.info} (copy)`);
    newCanvas.getContext('2d').drawImage(canvas, 0, 0);
    return newCanvas;
}
exports.copyCanvas = copyCanvas;
function recolorCanvas(canvas, color) {
    const result = createExtCanvas(canvas.width, canvas.height, `recolorCanvas(${canvas.info}, ${color})`);
    const context = result.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, result.width, result.height);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(canvas, 0, 0);
    return result;
}
exports.recolorCanvas = recolorCanvas;
function createColorCanvas(width, height, color) {
    const canvas = createExtCanvas(width, height, `createColorCanvas(${color})`);
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
}
exports.createColorCanvas = createColorCanvas;
function isCanvasEmpty(canvas) {
    if (canvas && canvas.width > 0 && canvas.height > 0) {
        const context = canvas.getContext('2d');
        const data = context.getImageData(0, 0, canvas.width, canvas.height);
        const size = data.width * data.height * 4;
        for (let i = 0; i < size; i++) {
            if (data.data[i] !== 0) {
                return false;
            }
        }
    }
    return true;
}
exports.isCanvasEmpty = isCanvasEmpty;
function saveCanvas(filePath, canvas) {
    fs.writeFileSync(filePath, canvas.toBuffer());
}
exports.saveCanvas = saveCanvas;
function getColorAt(d, i) {
    return ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
}
function forEachPixel(canvas, action) {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    for (let y = 0, i = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++, i += 4) {
            action(getColorAt(data.data, i), x, y);
        }
    }
}
exports.forEachPixel = forEachPixel;
function forEachPixelOf2Canvases(canvas1, canvas2, action) {
    if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
        throw new Error('Canvas not the same size');
    }
    const data1 = canvas1.getContext('2d').getImageData(0, 0, canvas1.width, canvas1.height);
    const data2 = canvas2.getContext('2d').getImageData(0, 0, canvas2.width, canvas2.height);
    for (let y = 0, i = 0; y < data1.height; y++) {
        for (let x = 0; x < data1.width; x++, i += 4) {
            action(getColorAt(data1.data, i), getColorAt(data2.data, i), x, y);
        }
    }
}
exports.forEachPixelOf2Canvases = forEachPixelOf2Canvases;
function mapEachPixel(canvas, action) {
    const context = canvas.getContext('2d');
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    const d = data.data;
    for (let y = 0, i = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++, i += 4) {
            const c = ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
            const out = action(c, x, y);
            d[i] = (out >>> 24) & 0xff;
            d[i + 1] = (out >>> 16) & 0xff;
            d[i + 2] = (out >>> 8) & 0xff;
            d[i + 3] = out & 0xff;
        }
    }
    context.putImageData(data, 0, 0);
}
exports.mapEachPixel = mapEachPixel;
function mapColors(canvas, map) {
    const result = copyCanvas(canvas);
    if (result) {
        mapEachPixel(result, map);
    }
    return result;
}
exports.mapColors = mapColors;
function compareTemplate(canvas, template, ox, oy) {
    for (let y = 0; y < template.height; y++) {
        for (let x = 0; x < template.width; x++) {
            for (let i = 0; i < 4; i++) {
                if (canvas.data[i + (x + ox) * 4 + (y + oy) * canvas.width * 4] !== template.data[i + x * 4 + y * template.width * 4]) {
                    return false;
                }
            }
        }
    }
    return true;
}
function findTemplate(canvas, template) {
    const canvasData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const templateData = template.getContext('2d').getImageData(0, 0, template.width, template.height);
    const maxX = canvas.width - template.width;
    const maxY = canvas.height - template.height;
    for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
            if (compareTemplate(canvasData, templateData, x, y)) {
                return { x, y };
            }
        }
    }
    return null;
}
exports.findTemplate = findTemplate;
function offsetCanvas(canvas, { x, y }) {
    return canvas && padCanvas(canvas, x, y);
}
exports.offsetCanvas = offsetCanvas;
function cropAndPadByColRow(x, y, w, h, dx, dy, padLeft = 0, padTop = 0) {
    return (canvas, col, row) => padCanvas(cropCanvas(canvas, x + dx * col, y + dy * row, w, h), padLeft, padTop);
}
exports.cropAndPadByColRow = cropAndPadByColRow;
function cropByIndex(get, perLine) {
    return (canvas, i) => get(canvas, i % perLine, Math.floor(i / perLine));
}
exports.cropByIndex = cropByIndex;
//# sourceMappingURL=canvas-utils.js.map