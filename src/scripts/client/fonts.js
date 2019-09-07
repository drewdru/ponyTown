"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const spriteFont_1 = require("../graphics/spriteFont");
const sprites = require("../generated/sprites");
function createFonts() {
    exports.font = spriteFont_1.createSpriteFont(sprites.font, sprites.emoji, 3);
    exports.font.lineSpacing = 3;
    exports.font.letterShiftY = -2;
    exports.fontPal = spriteFont_1.createSpriteFont(sprites.fontPal, sprites.emojiPal, 3);
    exports.fontPal.lineSpacing = 3;
    exports.fontPal.letterShiftY = -2;
    exports.fontSmall = spriteFont_1.createSpriteFont(sprites.fontSmall, [], 2);
    exports.fontSmall.lineSpacing = 4;
    exports.fontSmall.letterShiftY = -2;
    exports.fontSmall.letterHeightReal += 2;
    exports.fontSmallPal = spriteFont_1.createSpriteFont(sprites.fontSmallPal, [], 2);
    exports.fontSmallPal.lineSpacing = 4;
    exports.fontSmallPal.letterShiftY = -2;
    exports.fontSmallPal.letterHeightReal += 2;
    exports.fontMono = spriteFont_1.createSpriteFont(sprites.fontMono, [], 4);
    exports.fontMono.lineSpacing = 4;
    exports.fontMono.letterShiftY = -2;
    exports.fontMono.letterHeightReal += 2;
    exports.fontMonoPal = spriteFont_1.createSpriteFont(sprites.fontMonoPal, [], 4);
    exports.fontMonoPal.lineSpacing = 4;
    exports.fontMonoPal.letterShiftY = -2;
    exports.fontMonoPal.letterHeightReal += 2;
}
exports.createFonts = createFonts;
//# sourceMappingURL=fonts.js.map