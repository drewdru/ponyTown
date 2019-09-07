"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const canvas_utils_1 = require("./canvas-utils");
const tileWidth = 32;
const tileHeight = 24;
const cols = 10;
const tiles = [
    47, 47, 0, 0, 13, 19, 21, 20, 15, 16,
    47, 47, 0, 0, 13, 13, 45, 22, 18, 17,
    9, 2, 2, 2, 10, 14, 14, 14, 35, 36,
    8, 5, null, 7, 4, 27, 26, 29, 37, 38,
    8, null, 46, null, 4, 28, 24, 30, 39, 40,
    8, 3, null, 1, 4, 23, 31, 32, 41, 42,
    12, 6, 6, 6, 11, 25, 33, 34, 43, 44,
];
const revtiles = tiles
    .map((number, index) => ({ number, index, dstIndex: 0 }))
    .filter(x => x.number != null);
revtiles.sort((a, b) => a.number - b.number);
revtiles.forEach((t, i) => t.dstIndex = i);
function tilesToSprites(canvas, spaceH, spaceV) {
    return revtiles
        .sort((a, b) => a.dstIndex - b.dstIndex)
        .map(t => {
        const srcIndex = t.index;
        const srcCol = srcIndex % cols;
        const srcRow = Math.floor(srcIndex / cols);
        const srcX = spaceH + srcCol * (tileWidth + spaceH);
        const srcY = spaceV + srcRow * (tileHeight + spaceV);
        return canvas_utils_1.cropCanvas(canvas, srcX, srcY, tileWidth, tileHeight);
    });
}
exports.tilesToSprites = tilesToSprites;
//# sourceMappingURL=convert-tiles.js.map