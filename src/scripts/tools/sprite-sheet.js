"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const lodash_1 = require("lodash");
const common_1 = require("./common");
const utils_1 = require("../common/utils");
const canvas_utils_1 = require("./canvas-utils");
function isIdenticalSprite(a, b) {
    return !!(a && b && a.data && b.data && isIdenticalData(a.data, b.data));
}
function isIdenticalData(a, b) {
    if (a.width !== b.width || a.height !== b.height)
        return false;
    const length = (a.width * a.height * 4) | 0;
    const adat = a.data;
    const bdat = b.data;
    for (let i = 0; i < length; i = (i + 1) | 0) {
        if (adat[i] !== bdat[i]) {
            return false;
        }
    }
    return true;
}
function isIdenticalChannel(a, b, channel) {
    if (!a || !b || a.w !== b.w || a.h !== b.h)
        return false;
    const adata = a.image.getContext('2d').getImageData(a.ox, a.oy, a.w, a.h);
    const bdata = b.image.getContext('2d').getImageData(b.ox, b.oy, b.w, b.h);
    const length = (adata.width * adata.height * 4) | 0;
    const adat = adata.data;
    const bdat = bdata.data;
    for (let i = channel | 0; i < length; i = (i + 4) | 0) {
        if (adat[i] !== bdat[i]) {
            return false;
        }
    }
    return true;
}
function trimImageData(data) {
    const width = data.width | 0;
    const imageData = data.data;
    let top = 0;
    let left = 0;
    let right = data.width | 0;
    let bottom = data.height | 0;
    function isEmpty(x, y) {
        return imageData[((getIndex(x, y, width) << 2) + 3) | 0] === 0;
    }
    function isRowEmpty(y) {
        for (let x = left | 0; x < right; x = (x + 1) | 0) {
            if (!isEmpty(x | 0, y | 0)) {
                return false;
            }
        }
        return true;
    }
    function isColEmpty(x) {
        for (let y = top | 0; y < bottom; y = (y + 1) | 0) {
            if (!isEmpty(x | 0, y | 0)) {
                return false;
            }
        }
        return true;
    }
    while (bottom > top && isRowEmpty(bottom - 1))
        bottom--;
    while (right > left && isColEmpty(right - 1))
        right--;
    while (top < bottom && isRowEmpty(top))
        top++;
    while (left < right && isColEmpty(left))
        left++;
    return { y: top, x: left, w: right - left, h: bottom - top };
}
function getSpriteRect(canvas, x, y, w, h) {
    const data = canvas.getContext('2d').getImageData(x, y, w, h);
    const rect = trimImageData(data);
    return { x: x + rect.x, y: y + rect.y, w: rect.w, h: rect.h };
}
exports.getSpriteRect = getSpriteRect;
function imageToSprite(image, index) {
    const { w, h, x, y } = getSpriteRect(image, 0, 0, image.width, image.height);
    return { image, index, w, h, x: 0, y: 0, ox: x, oy: y };
}
exports.imageToSprite = imageToSprite;
function getIndex(x, y, outputWidth) {
    return ((x | 0) + (((y | 0) * outputWidth) | 0)) | 0;
}
function isEmpty(x, y, w, h, outputWidth, taken) {
    outputWidth = outputWidth | 0;
    if (((x + w) | 0) > outputWidth || ((y + h) | 0) > outputWidth) {
        return false;
    }
    for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
            if (taken[getIndex((ix + x) | 0, (iy + y) | 0, outputWidth)] !== 0) {
                return false;
            }
        }
    }
    return true;
}
function getFirstFree(outputWidth, width, height, { data, lines }) {
    const maxY = (outputWidth - height) | 0;
    for (let y = 0; y < maxY; y = (y + 1) | 0) {
        const spans = lines[y];
        for (let i = 0; i < spans.length; i++) {
            const span = spans[i];
            const start = span.start | 0;
            const end = (start + span.length - width) | 0;
            for (let x = start; x < end; x = (x + 1) | 0) {
                if (isEmpty(x, y, width, height, outputWidth, data)) {
                    return { x, y, layer: 0 };
                }
            }
        }
    }
    throw new Error(`Cannot find free space for (${width}, ${height}) [getFirstFree]`);
}
function getFirstFreePacked(outputWidth, width, height, takens) {
    const maxY = outputWidth - height;
    for (let layer = 0; layer < takens.length; layer = (layer + 1) | 0) {
        const { data, lines } = takens[layer];
        for (let y = 0; y < maxY; y = (y + 1) | 0) {
            const spans = lines[y];
            for (let i = 0; i < spans.length; i++) {
                const span = spans[i];
                const start = span.start | 0;
                const end = (start + span.length - width) | 0;
                for (let x = start | 0; x < end; x = (x + 1) | 0) {
                    if (isEmpty(x, y, width, height, outputWidth, data)) {
                        return { x, y, layer };
                    }
                }
            }
        }
    }
    throw new Error(`Cannot find free space for (${width}, ${height}) [getFirstFreePacked]`);
}
function positionSprite(sprite, outputWidth, taken, pack) {
    const layers = sprite.layers || 1;
    const { x, y, layer } = (pack && layers === 1) ?
        getFirstFreePacked(outputWidth, sprite.w, sprite.h, taken) :
        getFirstFree(outputWidth, sprite.w, sprite.h, taken[0]);
    sprite.x = x;
    sprite.y = y;
    sprite.layer = layer;
    const w = sprite.w;
    const right = x + w;
    for (let il = 0; il < layers; il++) {
        const { data, lines } = taken[il + layer];
        for (let iy = 0; iy < sprite.h; iy++) {
            const yy = y + iy;
            const spans = lines[yy];
            for (let ix = 0; ix < sprite.w; ix++) {
                const xx = x + ix;
                data[getIndex(xx, yy, outputWidth)] = 1;
            }
            for (let i = 0; i < spans.length; i++) {
                const span = spans[i];
                const start = span.start;
                const length = span.length;
                const end = start + length;
                if (start >= right) // right of span
                    break;
                if (end <= right) // left of span
                    continue;
                if (start === x) {
                    if (length === w) { // entire span
                        spans.splice(i, 1);
                    }
                    else { // at the start of span
                        span.start += w;
                        span.length -= w;
                    }
                }
                else {
                    if (end === right) { // at the end of span
                        span.length -= w;
                    }
                    else { // in the middle of span
                        span.length = x - start;
                        spans.splice(i + 1, 0, { start: right, length: end - right });
                    }
                }
                // let start = span.start;
                // let lineMoved = false;
                // for (let ix = 0; ix < sprite.w; ix++) {
                // 	const xx = x + ix;
                // 	data[getIndex(xx, yy, outputWidth)] = 1;
                // 	if (xx === start) {
                // 		start++;
                // 		lineMoved = true;
                // 	}
                // }
                // if (lineMoved) {
                // 	for (let x = start; x < outputWidth && data[getIndex(x, yy, outputWidth)] !== 0; x++) {
                // 		start++;
                // 	}
                // 	span.start = start;
                // 	span.length = outputWidth - start;
                // }
            }
        }
    }
}
function hasShading(s) {
    const data = s.image.getContext('2d').getImageData(s.ox, s.oy, s.w, s.h);
    for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
            if (data.data[(x + y * data.width) * 4 + 1] !== 0xff) {
                return true;
            }
        }
    }
    return false;
}
function getSpriteImageData(s) {
    if (!s.w || !s.h)
        return undefined;
    const context = s.image.getContext('2d');
    const { width, height, data } = context.getImageData(s.ox, s.oy, s.w, s.h);
    return { width, height, data };
}
function createSpriteSheet(name, images, log, size, bg, pack = false) {
    const maxLayers = 4;
    const sprites = images.slice();
    let outputWidth = size;
    let maxY = 0;
    let areaTaken = 0;
    let deduplicated = 0;
    let layered = 0;
    let tooBig = sprites.find(s => s.w >= outputWidth);
    while (tooBig) {
        throw new Error(`Sprite too large (${tooBig.w}x${tooBig.h}) in ${name} (${size}x${size})`);
    }
    sprites
        .forEach(s => s.data = getSpriteImageData(s));
    sprites
        .forEach((s, i) => {
        if (s.w && s.h) {
            for (let j = 0; j < i; j++) {
                if (!s.duplicateOf && isIdenticalSprite(sprites[j], s)) {
                    s.duplicateOf = sprites[j];
                    deduplicated++;
                    //console.log('duplicate', sprite.name, '==', sprites[j].name);
                    break;
                }
            }
        }
    });
    sprites
        .filter(s => !s.duplicateOf && s.w && s.h)
        .forEach(s => {
        s.shade = !pack || hasShading(s);
        s.layers = s.shade ? 2 : 1;
    });
    if (pack) {
        sprites
            .filter(s => !s.duplicateOf && s.shade)
            .reduce((pool, sprite) => {
            const match = pool.find(d => isIdenticalChannel(sprite, d, 1));
            if (match) {
                match.overlays = match.overlays || [];
                match.overlays.push(sprite);
                sprite.layer = match.layers;
                sprite.overlayedOn = match;
                match.layers = match.layers + 1;
                if (match.layers >= maxLayers) {
                    utils_1.removeItem(pool, match);
                }
                layered++;
            }
            else {
                pool.push(sprite);
            }
            return pool;
        }, []);
    }
    sprites.sort((a, b) => ((b.layers || 1) - (a.layers || 1)) || ((b.h * 1024 + b.w) - (a.h * 1024 + a.w)));
    maxY = 0;
    areaTaken = 0;
    const taken = lodash_1.times(maxLayers, () => ({
        lines: lodash_1.times(outputWidth, () => [{ start: 0, length: outputWidth }]),
        data: new Uint8Array(outputWidth * outputWidth),
    }));
    sprites
        .filter(s => !s.duplicateOf && !s.overlayedOn)
        .forEach(s => {
        try {
            positionSprite(s, outputWidth, taken, pack);
            maxY = Math.max(maxY, s.y + s.h);
            areaTaken += s.w * s.h;
        }
        catch (e) {
            console.error(e);
        }
    });
    if (maxY > outputWidth) {
        throw new Error(`Exceeded sprite sheet size for ${name} (${size}x${size})`);
    }
    if (log) {
        const efficiency = (areaTaken * 100 / outputWidth / maxY).toFixed();
        console.log(`[sprites] [${name}] Packed ${sprites.length} sprites into ${outputWidth} x ${maxY} sheet, `
            + `${efficiency}% efficiency, ${deduplicated} deduplicated, ${layered} layered`);
    }
    sprites
        .filter(s => s.overlayedOn)
        .forEach(s => {
        s.x = s.overlayedOn.x;
        s.y = s.overlayedOn.y;
    });
    sprites
        .filter(s => s.duplicateOf)
        .forEach(s => {
        s.x = s.duplicateOf.x;
        s.y = s.duplicateOf.y;
        s.layer = s.duplicateOf.layer;
        s.shade = s.duplicateOf.shade;
    });
    const image = canvas_utils_1.createExtCanvas(outputWidth, outputWidth, 'sprite sheet image');
    const alpha = canvas_utils_1.createExtCanvas(outputWidth, outputWidth, 'sprite sheet alpha');
    const context = image.getContext('2d');
    const alphaContext = alpha.getContext('2d');
    if (bg) {
        context.fillStyle = bg;
        context.fillRect(0, 0, outputWidth, outputWidth);
        alphaContext.fillStyle = bg;
        alphaContext.fillRect(0, 0, outputWidth, outputWidth);
    }
    if (pack) {
        const data = context.getImageData(0, 0, image.width, image.height);
        const alphaData = alphaContext.getImageData(0, 0, image.width, image.height);
        sprites
            .filter(s => !s.duplicateOf && s.w && s.h)
            .forEach(s => {
            if (s.layer === 3) {
                drawChannel(s.image, alphaData, 0, 0, s.ox, s.oy, s.x, s.y, s.w, s.h);
            }
            else {
                drawChannel(s.image, data, 0, s.layer || 0, s.ox, s.oy, s.x, s.y, s.w, s.h);
            }
            if (s.shade) {
                drawChannel(s.image, data, 1, 1, s.ox, s.oy, s.x, s.y, s.w, s.h);
            }
        });
        context.putImageData(data, 0, 0);
        alphaContext.putImageData(alphaData, 0, 0);
    }
    else {
        sprites
            .filter(s => !s.duplicateOf && s.w && s.h)
            .forEach(s => context.drawImage(s.image, s.ox, s.oy, s.w, s.h, s.x, s.y, s.w, s.h));
    }
    return {
        sprites: images.map((_, index) => common_1.findByIndex(sprites, index) || null),
        image,
        alpha,
    };
}
exports.createSpriteSheet = createSpriteSheet;
function drawChannel(src, dst, srcChannel, dstChannel, sx, sy, dx, dy, w, h) {
    const srcData = src.getContext('2d').getImageData(sx, sy, w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            dst.data[((x + dx) + (y + dy) * dst.width) * 4 + dstChannel] =
                srcData.data[(x + y * srcData.width) * 4 + srcChannel];
        }
    }
}
function saveSpriteSheet(filePath, canvas) {
    canvas_utils_1.saveCanvas(filePath, canvas);
    return path.basename(filePath);
}
exports.saveSpriteSheet = saveSpriteSheet;
function saveSpriteSheetAsBinary(filePath, canvas) {
    const context = canvas.getContext('2d');
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    fs.writeFileSync(filePath, Buffer.from(data.data.buffer));
}
exports.saveSpriteSheetAsBinary = saveSpriteSheetAsBinary;
function saveCanvasAsRaw(filePath, canvas) {
    const buffer = Buffer.alloc(4 + 4 + 4 + 4 * canvas.width * canvas.height);
    buffer.writeUInt8('R'.charCodeAt(0), 0);
    buffer.writeUInt8('A'.charCodeAt(0), 1);
    buffer.writeUInt8('W'.charCodeAt(0), 2);
    buffer.writeUInt8(' '.charCodeAt(0), 3);
    buffer.writeUInt32LE(canvas.width, 4);
    buffer.writeUInt32LE(canvas.height, 8);
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    buffer.set(data.data, 12);
    fs.writeFileSync(filePath, buffer);
}
exports.saveCanvasAsRaw = saveCanvasAsRaw;
//# sourceMappingURL=sprite-sheet.js.map