"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("../common/interfaces");
const colors_1 = require("../common/colors");
const stringUtils_1 = require("../common/stringUtils");
const spriteUtils_1 = require("../client/spriteUtils");
var HAlign;
(function (HAlign) {
    HAlign[HAlign["Left"] = 0] = "Left";
    HAlign[HAlign["Right"] = 1] = "Right";
    HAlign[HAlign["Center"] = 2] = "Center";
})(HAlign = exports.HAlign || (exports.HAlign = {}));
var VAlign;
(function (VAlign) {
    VAlign[VAlign["Top"] = 0] = "Top";
    VAlign[VAlign["Bottom"] = 1] = "Bottom";
    VAlign[VAlign["Middle"] = 2] = "Middle";
})(VAlign = exports.VAlign || (exports.VAlign = {}));
const SPACE = ' '.charCodeAt(0);
const TAB = '\t'.charCodeAt(0);
const DEFAULT = '?'.charCodeAt(0);
const LINEFEED = '\n'.charCodeAt(0);
const defaultOptions = {};
function createSpriteFont(charset, emojiCharset, spaceWidth) {
    const lineSpacing = 2;
    const letterSpacing = 1;
    const letterShiftX = 0;
    const letterShiftY = 0;
    const letterShiftWidth = 0;
    const letterShiftHeight = 0;
    const chars = new Map();
    const emoji = new Map();
    charset.filter(c => !!c).forEach(c => chars.set(c.code, c.sprite));
    emojiCharset.filter(e => !!e && !!e.code).forEach(e => emoji.set(e.code, e.sprite));
    const char0 = chars.get(0);
    const letterHeight = char0.h;
    const letterWidth = char0.w;
    const letterHeightReal = char0.h + char0.oy;
    chars.set(SPACE, spriteUtils_1.createSprite(0, 0, 0, 0, spaceWidth, char0.h, 0));
    chars.set(TAB, spriteUtils_1.createSprite(0, 0, 0, 0, spaceWidth * 4, char0.h, 0));
    const defaultChar = chars.get(DEFAULT);
    return {
        lineSpacing, letterSpacing, letterShiftX, letterShiftY, letterShiftWidth, letterShiftHeight,
        letterHeight, letterHeightReal, letterWidth, chars, emoji, defaultChar,
    };
}
exports.createSpriteFont = createSpriteFont;
function drawChars(batch, chars, length, font, color, x, y, options) {
    const { lineSpacing = font.lineSpacing, monospace = false } = options;
    x = Math.round(x) | 0;
    y = Math.round(y) | 0;
    let currentX = x;
    for (let i = 0; i < length; i++) {
        const code = chars[i];
        if (code === LINEFEED) {
            currentX = x;
            y += font.letterHeight + lineSpacing;
        }
        else {
            const charWidth = drawChar(batch, font, code, color, currentX, y, options);
            currentX += (monospace ? font.letterWidth : charWidth) + font.letterSpacing;
        }
    }
}
function drawText(batch, text, font, color, x, y, options = defaultOptions) {
    const length = stringUtils_1.stringToCodesTemp(text);
    drawChars(batch, stringUtils_1.codesBuffer, length, font, color, x, y, options);
}
exports.drawText = drawText;
function drawOutlinedText(batch, text, font, color, outlineColor, x, y, options = defaultOptions) {
    const length = stringUtils_1.stringToCodesTemp(text);
    options.skipEmotes = true;
    drawChars(batch, stringUtils_1.codesBuffer, length, font, outlineColor, x - 1, y - 1, options);
    drawChars(batch, stringUtils_1.codesBuffer, length, font, outlineColor, x + 1, y - 1, options);
    drawChars(batch, stringUtils_1.codesBuffer, length, font, outlineColor, x - 1, y + 1, options);
    drawChars(batch, stringUtils_1.codesBuffer, length, font, outlineColor, x + 1, y + 1, options);
    drawChars(batch, stringUtils_1.codesBuffer, length, font, outlineColor, x - 1, y, options);
    drawChars(batch, stringUtils_1.codesBuffer, length, font, outlineColor, x, y - 1, options);
    drawChars(batch, stringUtils_1.codesBuffer, length, font, outlineColor, x + 1, y, options);
    drawChars(batch, stringUtils_1.codesBuffer, length, font, outlineColor, x, y + 1, options);
    options.skipEmotes = false;
    drawChars(batch, stringUtils_1.codesBuffer, length, font, color, x, y, options);
}
exports.drawOutlinedText = drawOutlinedText;
function drawTextAligned(spriteBatch, text, font, color, rect, halign = 0 /* Left */, valign = 0 /* Top */, options = defaultOptions) {
    const length = stringUtils_1.stringToCodesTemp(text);
    const { x, y } = alignChars(font, stringUtils_1.codesBuffer, length, rect, halign, valign);
    drawChars(spriteBatch, stringUtils_1.codesBuffer, length, font, color, x, y, options);
}
exports.drawTextAligned = drawTextAligned;
function lineBreak(text, font, width) {
    const lines = [];
    const spaceWidth = measureChar(font, SPACE) + font.letterSpacing * 2;
    let line = [];
    let lineWidth = 0;
    for (const word of text.split(' ')) {
        const { w } = measureText(word, font);
        if (lineWidth) {
            lineWidth += spaceWidth;
            if (lineWidth + w > width) {
                lines.push(line);
                line = [];
                lineWidth = 0;
            }
        }
        line.push(word);
        lineWidth += w;
    }
    if (line.length) {
        lines.push(line);
    }
    return lines.map(x => x.join(' ')).join('\n');
}
exports.lineBreak = lineBreak;
function measureChars(chars, length, font) {
    let maxW = 0;
    let lines = 1;
    let w = 0;
    for (let i = 0; i < length; i++) {
        const code = chars[i];
        if (code === LINEFEED) {
            maxW = Math.max(maxW, w);
            w = 0;
            lines++;
        }
        else {
            if (w) {
                w += font.letterSpacing;
            }
            w += measureChar(font, code);
        }
    }
    return {
        w: Math.max(maxW, w),
        h: lines * font.letterHeight + (lines - 1) * font.lineSpacing
    };
}
function measureText(text, font) {
    const length = stringUtils_1.stringToCodesTemp(text);
    return measureChars(stringUtils_1.codesBuffer, length, font);
}
exports.measureText = measureText;
function getCharacterSprite(char, font) {
    let sprite;
    let unset = false;
    const length = stringUtils_1.stringToCodesTemp(char);
    for (let i = 0; i < length; i++) {
        const code = stringUtils_1.codesBuffer[i];
        unset = !!sprite;
        sprite = font.emoji.get(code) || getChar(font, code);
    }
    return unset ? undefined : sprite;
}
exports.getCharacterSprite = getCharacterSprite;
function measureChar(font, code) {
    const sprite = font.emoji.get(code) || getChar(font, code);
    return sprite.w + sprite.ox;
}
function drawChar(batch, font, code, color, x, y, options) {
    const emote = font.emoji.get(code);
    const px = x + font.letterShiftX;
    const py = y + font.letterShiftY;
    if (emote) {
        const skipEmote = !!options.skipEmotes;
        const colorEmote = !!options.colorEmotes;
        const emoteColor = colorEmote ? color : colors_1.WHITE;
        if (!skipEmote) {
            if (interfaces_1.isPaletteSpriteBatch(batch)) {
                batch.drawSprite(emote, emoteColor, options.emojiPalette, px, py);
            }
            else {
                batch.drawSprite(emote, emoteColor, px, py);
            }
        }
        return emote.w + emote.ox;
    }
    else {
        const c = getChar(font, code);
        if (interfaces_1.isPaletteSpriteBatch(batch)) {
            batch.drawSprite(c, color, options.palette, px, py);
        }
        else {
            batch.drawSprite(c, color, px, py);
        }
        return c.w + c.ox + font.letterShiftWidth;
    }
}
function alignChars(font, chars, length, rect, halign, valign) {
    let x = rect.x;
    let y = rect.y;
    if (halign !== 0 /* Left */ || valign !== 0 /* Top */) {
        const size = measureChars(chars, length, font);
        if (halign !== 0 /* Left */) {
            x += halign === 2 /* Center */ ? (rect.w - size.w) / 2 : (rect.w - size.w);
        }
        if (valign !== 0 /* Top */) {
            y += valign === 2 /* Middle */ ? (rect.h - size.h) / 2 : (rect.h - size.h);
        }
    }
    return { x, y };
}
function getChar(font, code) {
    return font.chars.get(code) || font.defaultChar;
}
//# sourceMappingURL=spriteFont.js.map