"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const texture2d_1 = require("./webgl/texture2d");
function createTexturesForSpriteSheets(gl, sheets, texture = texture2d_1.createTexture) {
    sheets.forEach(sheet => {
        if (sheet.data) {
            sheet.texture = texture(gl, sheet.data);
        }
    });
}
exports.createTexturesForSpriteSheets = createTexturesForSpriteSheets;
function disposeTexturesForSpriteSheets(gl, sheets) {
    sheets.forEach(sheet => {
        sheet.texture = texture2d_1.disposeTexture(gl, sheet.texture);
    });
}
exports.disposeTexturesForSpriteSheets = disposeTexturesForSpriteSheets;
//# sourceMappingURL=spriteSheetUtils.js.map