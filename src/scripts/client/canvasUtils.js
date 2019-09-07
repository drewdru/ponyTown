"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const file_saver_1 = require("file-saver");
/* istanbul ignore next */
exports.createCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width | 0;
    canvas.height = height | 0;
    return canvas;
};
/* istanbul ignore next */
exports.loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', () => reject(new Error(`Error loading image (${src})`)));
        img.src = src;
    });
};
/* istanbul ignore next */
function canUseImageBitmap() {
    return typeof fetch === 'function' &&
        typeof createImageBitmap === 'function' &&
        !/yabrowser/i.test(navigator.userAgent); // disabled due to yandex browser bug
}
/* istanbul ignore next */
if (canUseImageBitmap()) {
    exports.loadImage = src => fetch(src)
        .then(response => response.blob())
        .then(createImageBitmap);
}
function setup(methods) {
    exports.createCanvas = methods.createCanvas;
    exports.loadImage = methods.loadImage;
}
exports.setup = setup;
/* istanbul ignore next */
exports.getPixelRatio = SERVER ? () => 1 : () => window.devicePixelRatio;
function resizeCanvas(canvas, width, height) {
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
}
exports.resizeCanvas = resizeCanvas;
function resizeCanvasWithRatio(canvas, width, height, updateStyle = true) {
    const ratio = exports.getPixelRatio();
    const w = Math.round(width * ratio);
    const h = Math.round(height * ratio);
    let resized = false;
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        resized = true;
    }
    if (updateStyle && (canvas.style.width !== width + 'px' || canvas.style.height !== height + 'px')) {
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        resized = true;
    }
    return resized;
}
exports.resizeCanvasWithRatio = resizeCanvasWithRatio;
/* istanbul ignore next */
function canvasToSource(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(URL.createObjectURL(blob));
            }
            else {
                reject(new Error('Failed to convert canvas'));
            }
        });
    });
}
exports.canvasToSource = canvasToSource;
/* istanbul ignore next */
function saveCanvas(canvas, name) {
    canvas.toBlob(blob => blob && file_saver_1.saveAs(blob, name));
}
exports.saveCanvas = saveCanvas;
/* istanbul ignore next */
function disableImageSmoothing(context) {
    if ('imageSmoothingEnabled' in context) {
        context.imageSmoothingEnabled = false;
    }
    else {
        context.webkitImageSmoothingEnabled = false;
        context.mozImageSmoothingEnabled = false;
        context.msImageSmoothingEnabled = false;
    }
}
exports.disableImageSmoothing = disableImageSmoothing;
//# sourceMappingURL=canvasUtils.js.map