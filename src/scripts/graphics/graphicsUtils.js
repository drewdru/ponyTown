"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("../common/interfaces");
const utils_1 = require("../common/utils");
const colors_1 = require("../common/colors");
const constants_1 = require("../common/constants");
const spriteFont_1 = require("../graphics/spriteFont");
const sprites = require("../generated/sprites");
const fonts_1 = require("../client/fonts");
const pony_1 = require("../common/pony");
const camera_1 = require("../common/camera");
const color_1 = require("../common/color");
const tags_1 = require("../common/tags");
const rect_1 = require("../common/rect");
const ponyInfo_1 = require("../common/ponyInfo");
const entityUtils_1 = require("../common/entityUtils");
const baloonTaper = [
    { w: 1, y: 2 },
    { w: 1, y: 1 },
];
const roundTaper = [
    { w: 1, y: 5 },
    { w: 1, y: 3 },
    { w: 2, y: 2 },
    { w: 4, y: 1 },
];
exports.commonPalettes = createCommonPalettes(ponyInfo_1.mockPaletteManager);
function drawTaperedRect(batch, color, x, y, w, h, taper) {
    x = Math.round(x) | 0;
    y = Math.round(y) | 0;
    w = Math.round(w) | 0;
    h = Math.round(h) | 0;
    let gap = 0;
    for (let i = 0; i < taper.length; i++) {
        const t = taper[i];
        const th = h - t.y * 2;
        batch.drawRect(color, x + gap, y + t.y, t.w, th);
        batch.drawRect(color, x + w - gap - t.w, y + t.y, t.w, th);
        gap += t.w;
    }
    batch.drawRect(color, x + gap, y, Math.max(0, w - gap * 2), h);
}
exports.drawTaperedRect = drawTaperedRect;
function drawRectBaloon(batch, color, x, y, w, h) {
    drawTaperedRect(batch, color, x, y, w, h, baloonTaper);
}
exports.drawRectBaloon = drawRectBaloon;
function drawRoundBaloon(batch, color, x, y, w, h) {
    drawTaperedRect(batch, color, x, y, w, h, roundTaper);
}
exports.drawRoundBaloon = drawRoundBaloon;
function getMessagePalette(type, palettes) {
    if (type === 10 /* Supporter2 */) {
        return palettes.supporter2;
    }
    else if (type === 11 /* Supporter3 */) {
        return palettes.supporter3;
    }
    else {
        return undefined;
    }
}
function drawBaloon(batch, { message, type = 0 /* Chat */, timer = 1, total = 10 }, x, y, bounds, palettes) {
    if (!fonts_1.fontPal)
        return;
    let { w, h } = spriteFont_1.measureText(message, fonts_1.fontPal);
    w = Math.max(w, 4);
    const screenPad = 8;
    const availableWidth = bounds.w - screenPad * 2;
    if (w > availableWidth) {
        message = spriteFont_1.lineBreak(message, fonts_1.fontPal, availableWidth);
        const size = spriteFont_1.measureText(message, fonts_1.fontPal);
        w = size.w;
        h = size.h;
    }
    const { dy, alpha } = calcAnimation(timer, total);
    y += dy;
    const nippleX = x;
    const toTheLeft = Math.max(0, screenPad - x);
    const toTheRight = Math.max(0, x - bounds.w + screenPad);
    x = utils_1.clamp(x, screenPad + w / 2 - toTheLeft, bounds.w - screenPad - w / 2 + toTheRight);
    if (utils_1.intersect(0, 0, bounds.w, bounds.h, x - w / 2, y - h / 2, w, h)) {
        const palette = getMessagePalette(type, palettes.mainFont);
        const color = palette ? colors_1.WHITE : colors_1.getMessageColor(type);
        const options = {
            palette: palette || palettes.mainFont.white,
            emojiPalette: palettes.mainFont.emoji,
        };
        if (interfaces_1.isThinking(type)) {
            drawThinkingBaloon(batch, message, color, options, x, y, w, h, alpha, nippleX);
        }
        else if (interfaces_1.isWhisper(type) || interfaces_1.isWhisperTo(type)) {
            drawWhisperBaloon(batch, message, color, options, x, y, w, h, alpha, nippleX);
        }
        else {
            drawSpeechBaloon(batch, message, color, options, x, y, w, h, alpha, nippleX);
        }
    }
}
exports.drawBaloon = drawBaloon;
function drawSpeechBaloon(batch, text, color, options, x, y, w, h, alpha, nippleX) {
    const pad = 4;
    const xx = x - Math.round(w / 2);
    const yy = y - h;
    const nipple = sprites.nipple_2.color;
    nippleX = utils_1.clamp(nippleX, xx + pad, xx + w - pad);
    batch.globalAlpha = 0.6 * alpha;
    drawRectBaloon(batch, colors_1.BLACK, xx - pad, yy - pad, w + pad * 2, h + pad * 2);
    batch.drawSprite(nipple, colors_1.BLACK, undefined, nippleX - Math.round(nipple.w / 2), y + pad);
    batch.globalAlpha = alpha;
    spriteFont_1.drawText(batch, text, fonts_1.fontPal, color, xx, yy, options);
    batch.globalAlpha = 1;
}
exports.drawSpeechBaloon = drawSpeechBaloon;
function drawWhisperBaloon(batch, text, color, options, x, y, w, h, alpha, nippleX) {
    const pad = 4;
    const xx = x - Math.round(w / 2);
    const yy = y - h;
    const nipple = sprites.nipple_alt_2.color;
    nippleX = utils_1.clamp(nippleX, xx + pad, xx + w - pad);
    batch.globalAlpha = 0.6 * alpha;
    const left = xx - pad;
    const top = yy - pad;
    const width = w + pad * 2;
    const height = h + pad * 2;
    batch.drawRect(colors_1.BLACK, left + 2, top, width - 4, 1);
    batch.drawRect(colors_1.BLACK, left + 1, top + 1, width - 2, 1);
    batch.drawRect(colors_1.BLACK, left, top + 2, width, height - 4);
    batch.drawRect(colors_1.BLACK, left + 1, top + height - 2, width - 2, 1);
    batch.drawRect(colors_1.BLACK, left + 2, top + height - 1, width - 4, 1);
    const yyy = top + height + 1;
    const right = left + width - 1;
    for (let tx = nippleX - 7; (tx + 5) > (left + 1); tx -= 5) {
        const shorten = Math.max(0, (left + 1) - tx);
        batch.drawRect(colors_1.BLACK, tx + shorten, yyy, 4 - shorten, 1);
    }
    for (let tx = nippleX + 2; tx < right; tx += 5) {
        const shorten = Math.max(0, (tx + 5) - right);
        batch.drawRect(colors_1.BLACK, tx, yyy, Math.min(4, 5 - shorten), 1);
    }
    batch.drawSprite(nipple, colors_1.BLACK, undefined, nippleX - 3, y + pad + 2);
    batch.globalAlpha = alpha;
    spriteFont_1.drawText(batch, text, fonts_1.fontPal, color, xx, yy, options);
    batch.globalAlpha = 1;
}
exports.drawWhisperBaloon = drawWhisperBaloon;
function drawThinkingBaloon(batch, text, color, options, x, y, w, h, alpha, nippleX) {
    const padX = 6;
    const padY = 4;
    const xx = x - Math.round(w / 2);
    const yy = y - h;
    const ox = utils_1.clamp(nippleX, xx, xx + w) - 1;
    const oy = y + 12;
    batch.globalAlpha = 0.6 * alpha;
    drawRoundBaloon(batch, colors_1.BLACK, xx - padX, yy - padY, w + padX * 2, h + padY * 2);
    batch.drawRect(colors_1.BLACK, ox, oy, 1, 1);
    batch.drawRect(colors_1.BLACK, ox - 1, oy - 3, 2, 2);
    batch.drawRect(colors_1.BLACK, ox, oy - 7, 3, 3);
    batch.globalAlpha = alpha;
    spriteFont_1.drawText(batch, text, fonts_1.fontPal, color, xx, yy, options);
    batch.globalAlpha = 1;
}
exports.drawThinkingBaloon = drawThinkingBaloon;
var DrawNameFlags;
(function (DrawNameFlags) {
    DrawNameFlags[DrawNameFlags["None"] = 0] = "None";
    DrawNameFlags[DrawNameFlags["Party"] = 1] = "Party";
    DrawNameFlags[DrawNameFlags["Friend"] = 2] = "Friend";
})(DrawNameFlags = exports.DrawNameFlags || (exports.DrawNameFlags = {}));
function getNameColor(flags) {
    if (utils_1.hasFlag(flags, DrawNameFlags.Party)) {
        return colors_1.PARTY_COLOR;
    }
    else if (utils_1.hasFlag(flags, DrawNameFlags.Friend)) {
        return colors_1.FRIENDS_COLOR;
    }
    else {
        return colors_1.WHITE;
    }
}
function drawNamePlate(batch, text, x, y, flags, palettes, tagId) {
    const tag = tags_1.getTag(tagId);
    const size = spriteFont_1.measureText(text, fonts_1.fontPal);
    const xx = x - Math.round(size.w / 2);
    const yy = y - size.h + 6 - (tag ? 3 : 0);
    const color = getNameColor(flags);
    const options = { palette: palettes.mainFont.white, emojiPalette: palettes.mainFont.emoji };
    spriteFont_1.drawOutlinedText(batch, text, fonts_1.fontPal, color, colors_1.OUTLINE_COLOR, xx, yy, options);
    if (tag) {
        const tagSize = spriteFont_1.measureText(tag.label, fonts_1.fontSmallPal);
        const textX = x - Math.round(tagSize.w / 2);
        const palette = tags_1.getTagPalette(tag, palettes.smallFont);
        spriteFont_1.drawOutlinedText(batch, tag.label, fonts_1.fontSmallPal, tag.color, colors_1.OUTLINE_COLOR, textX, yy + 11, { palette });
    }
}
exports.drawNamePlate = drawNamePlate;
function drawBounds(batch, e, r, color) {
    if (r) {
        batch.drawRect(color, Math.round(e.x * constants_1.tileWidth + r.x), Math.round(e.y * constants_1.tileHeight + r.y), Math.round(r.w), Math.round(r.h));
    }
}
exports.drawBounds = drawBounds;
function drawWorldBounds(batch, e, r, color) {
    if (r) {
        batch.drawRect(color, Math.round((e.x + r.x) * constants_1.tileWidth), Math.round((e.y + r.y) * constants_1.tileHeight), Math.round(r.w * constants_1.tileWidth), Math.round(r.h * constants_1.tileHeight));
    }
}
exports.drawWorldBounds = drawWorldBounds;
function drawBoundsOutline(batch, e, r, color, thickness = 1) {
    if (r) {
        drawOutline(batch, color, Math.round(e.x * constants_1.tileWidth + r.x), Math.round(e.y * constants_1.tileHeight + r.y), Math.round(r.w), Math.round(r.h), thickness);
    }
}
exports.drawBoundsOutline = drawBoundsOutline;
function drawOutlineRect(batch, color, { x, y, w, h }, thickness = 1) {
    drawOutline(batch, color, x, y, w, h, thickness);
}
exports.drawOutlineRect = drawOutlineRect;
function drawOutline(batch, color, x, y, w, h, thickness = 1) {
    batch.drawRect(color, x - thickness, y - thickness, w + thickness * 2, thickness); // top
    batch.drawRect(color, x - thickness, y + h, w + thickness * 2, thickness); // bottom
    batch.drawRect(color, x - thickness, y, thickness, h); // left
    batch.drawRect(color, x + w, y, thickness, h); // right
}
exports.drawOutline = drawOutline;
function drawCharacter(drawRect, x, y, color, char) {
    switch (char) {
        case '0':
            drawRect(color, x, y, 1, 5);
            drawRect(color, x + 1, y, 1, 1);
            drawRect(color, x + 1, y + 4, 1, 1);
            drawRect(color, x + 2, y, 1, 5);
            return 3;
        case '1':
            drawRect(color, x, y + 1, 1, 1);
            drawRect(color, x + 1, y, 1, 4);
            drawRect(color, x, y + 4, 3, 1);
            return 3;
        case '2':
            drawRect(color, x, y, 3, 1);
            drawRect(color, x, y + 2, 3, 1);
            drawRect(color, x, y + 4, 3, 1);
            drawRect(color, x + 2, y + 1, 1, 1);
            drawRect(color, x, y + 3, 1, 1);
            return 3;
        case '3':
            drawRect(color, x, y, 2, 1);
            drawRect(color, x, y + 2, 2, 1);
            drawRect(color, x, y + 4, 2, 1);
            drawRect(color, x + 2, y, 1, 5);
            return 3;
        case '4':
            drawRect(color, x, y, 1, 3);
            drawRect(color, x, y + 2, 3, 1);
            drawRect(color, x + 2, y, 1, 5);
            return 3;
        case '5':
            drawRect(color, x, y, 3, 1);
            drawRect(color, x, y + 2, 3, 1);
            drawRect(color, x, y + 4, 3, 1);
            drawRect(color, x, y + 1, 1, 1);
            drawRect(color, x + 2, y + 3, 1, 1);
            return 3;
        case '6':
            drawRect(color, x, y, 3, 1);
            drawRect(color, x, y + 2, 3, 1);
            drawRect(color, x, y + 4, 3, 1);
            drawRect(color, x, y, 1, 5);
            drawRect(color, x + 2, y + 3, 1, 1);
            return 3;
        case '7':
            drawRect(color, x, y, 3, 1);
            drawRect(color, x + 2, y + 1, 1, 4);
            return 3;
        case '8':
            drawRect(color, x, y, 1, 5);
            drawRect(color, x + 1, y, 1, 1);
            drawRect(color, x + 1, y + 2, 1, 1);
            drawRect(color, x + 1, y + 4, 1, 1);
            drawRect(color, x + 2, y, 1, 5);
            return 3;
        case '9':
            drawRect(color, x, y, 1, 3);
            drawRect(color, x + 1, y, 1, 1);
            drawRect(color, x + 1, y + 2, 1, 1);
            drawRect(color, x, y + 4, 2, 1);
            drawRect(color, x + 2, y, 1, 5);
            return 3;
        case ':':
            drawRect(color, x, y + 1, 1, 1);
            drawRect(color, x, y + 3, 1, 1);
            return 1;
        case '.':
            drawRect(color, x, y + 4, 1, 1);
            return 1;
        case '-':
            drawRect(color, x, y + 2, 3, 1);
            return 3;
        case ' ':
            return 2;
        default:
            drawRect(color, x, y, 3, 5);
            return 3;
    }
}
exports.drawCharacter = drawCharacter;
function drawPixelTextBase(drawRect, x, y, color, text) {
    for (let i = 0; i < text.length; i++) {
        x += drawCharacter(drawRect, x, y, color, text.charAt(i)) + 1;
    }
}
exports.drawPixelTextBase = drawPixelTextBase;
function drawPixelText(batch, x, y, color, text) {
    drawPixelTextBase(batch.drawRect.bind(batch), x, y, color, text);
}
exports.drawPixelText = drawPixelText;
function fillRect(context, color, x, y, w, h) {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
}
exports.fillRect = fillRect;
function drawPixelTextOnCanvas(context, x, y, color, text) {
    drawPixelTextBase((color, x, y, w, h) => fillRect(context, color_1.colorToCSS(color), x, y, w, h), x, y, color, text);
}
exports.drawPixelTextOnCanvas = drawPixelTextOnCanvas;
function compareSays(a, b) {
    return a.message.created - b.message.created;
}
exports.compareSays = compareSays;
function isPartyMember(entity, party) {
    return entity.type === constants_1.PONY_TYPE && party !== undefined && party.members.some(p => p.id === entity.id && !p.pending);
}
function drawNames(batch, entities, player, party, camera, hover, drawHidden, palettes) {
    entityUtils_1.sortEntities(entities);
    for (const e of entities) {
        if ((!entityUtils_1.isHidden(e) || drawHidden) && e.name && e !== player) {
            const nameOffsetBase = 12;
            const bounds = e.interactBounds || e.bounds;
            const chatBounds = e.chatBounds || bounds;
            if (chatBounds !== undefined && bounds !== undefined && utils_1.contains(e.x, e.y, bounds, hover)) {
                const { x, y } = camera_1.worldToScreen(camera, e);
                const nameOffset = nameOffsetBase - getChatHeight(e);
                const tag = (entityUtils_1.isHidden(e) && drawHidden) ? 'hidden' : e.tag;
                const flags = DrawNameFlags.None |
                    (isPartyMember(e, party) ? DrawNameFlags.Party : 0) |
                    (entityUtils_1.isFriend(e) ? DrawNameFlags.Friend : 0);
                drawNamePlate(batch, e.name, x, y + chatBounds.y - nameOffset, flags, palettes, tag);
            }
        }
    }
}
exports.drawNames = drawNames;
function getChatBallonXY(e, camera) {
    const nameOffsetBase = 12;
    const bounds = e.interactBounds || e.bounds;
    const chatBounds = e.chatBounds || bounds;
    const screen = camera_1.worldToScreen(camera, e);
    const nameOffset = nameOffsetBase - getChatHeight(e);
    const offset = (nameOffset + 6) + (e.tag ? 5 : 0);
    const yy = screen.y + (chatBounds ? chatBounds.y : 0) - offset;
    const x = screen.x + utils_1.toInt(e.chatX);
    const y = yy + utils_1.toInt(e.chatY);
    return { x, y };
}
exports.getChatBallonXY = getChatBallonXY;
function drawChatBaloon(batch, entity, camera, palettes) {
    const { x, y } = getChatBallonXY(entity, camera);
    drawBaloon(batch, entity.says, x, y, camera, palettes);
}
function drawChat(batch, entities, camera, drawHidden, palettes, hidePublic) {
    entityUtils_1.sortEntities(entities);
    for (const entity of entities) {
        if ((!entityUtils_1.isHidden(entity) || drawHidden) && !interfaces_1.isPartyMessage(entity.says.type || 0 /* Chat */)) {
            if (!hidePublic || !interfaces_1.isPublicMessage(entity.says.type || 0 /* Chat */)) {
                drawChatBaloon(batch, entity, camera, palettes);
            }
        }
    }
    for (const entity of entities) {
        if ((!entityUtils_1.isHidden(entity) || drawHidden) && interfaces_1.isPartyMessage(entity.says.type || 0 /* Chat */)) {
            drawChatBaloon(batch, entity, camera, palettes);
        }
    }
}
exports.drawChat = drawChat;
function getChatHeight(entity) {
    return pony_1.isPony(entity) ? pony_1.getPonyChatHeight(entity) : 0;
}
exports.chatAnimationDuration = 0.2;
function dismissSays(says) {
    if (says.timer !== undefined) {
        says.timer = Math.min(says.timer, exports.chatAnimationDuration);
    }
}
exports.dismissSays = dismissSays;
function calcAnimation(timer, total) {
    const start = (total - timer) / exports.chatAnimationDuration;
    const end = timer / exports.chatAnimationDuration;
    const dys = [3, 2, 1, 0, -1, 0];
    const dys2 = [-4, -3, -2, -1];
    const dyd = start * dys.length;
    const dyd2 = end * dys2.length;
    const dyi = utils_1.clamp(Math.round(dyd), 0, dys.length - 1);
    const dyi2 = utils_1.clamp(Math.round(dyd2), 0, dys2.length);
    const dy = dyi2 < dys2.length ? dys2[dyi2] : dys[dyi];
    const alpha = Math.min(start, end, 1);
    return { alpha, dy };
}
function drawBox(batch, color, shadowColor, x, y, z, w, l, h) {
    const darker = color_1.multiplyColor(color, 0.8);
    const left = (x - w / 2) * constants_1.tileWidth;
    const bottom = y * constants_1.tileHeight;
    const elevation = z * constants_1.tileElevation;
    const width = w * constants_1.tileWidth;
    const frontHeight = h * constants_1.tileElevation;
    const topHeight = l * constants_1.tileHeight;
    batch.drawRect(shadowColor, left, bottom - topHeight, width, topHeight); // shadow
    batch.drawRect(darker, left, bottom - elevation - frontHeight, width, frontHeight); // front
    batch.drawRect(color, left, bottom - elevation - frontHeight - topHeight, width, topHeight); // top
}
exports.drawBox = drawBox;
function drawSpriteBorder(batch, border, color, x, y, w, h) {
    x = Math.round(x) | 0;
    y = Math.round(y) | 0;
    w = Math.round(w) | 0;
    h = Math.round(h) | 0;
    const size = border.border;
    const right = x + w - size;
    const bottom = y + h - size;
    const bgWidth = w - size * 2;
    const bgHeight = h - size * 2;
    batch.drawSprite(border.topLeft, color, x, y);
    batch.drawSprite(border.topRight, color, right, y);
    batch.drawSprite(border.bottomLeft, color, x, bottom);
    batch.drawSprite(border.bottomRight, color, right, bottom);
    drawStretched(batch, border.top, color, x + size, y, bgWidth, size);
    drawStretched(batch, border.left, color, x, y + size, size, bgHeight);
    //drawStretched(batch, border.bg, color, x + size, y + size, bgWidth, bgHeight);
    batch.drawRect(color, x + size, y + size, bgWidth, bgHeight);
    drawStretched(batch, border.right, color, x + w - size, y + size, size, bgHeight);
    drawStretched(batch, border.bottom, color, x + size, y + h - size, bgWidth, size);
}
exports.drawSpriteBorder = drawSpriteBorder;
function drawStretched(batch, sprite, color, x, y, w, h) {
    if (sprite.h && sprite.w) {
        const sw = Math.min(sprite.w, w);
        const sh = Math.min(sprite.h, h);
        batch.drawImage(color, sprite.x, sprite.y, sw, sh, x, y, w, h);
    }
}
function drawSpriteCropped(batch, s, color, palette, x, y, maxY) {
    const top = y + s.oy;
    const bottom = Math.min(top + s.h, maxY);
    if (bottom > top) {
        batch.drawImage(s.type, color, palette, s.x, s.y, s.w, s.h, x + s.ox, top, s.w, bottom - top);
    }
}
exports.drawSpriteCropped = drawSpriteCropped;
function drawFullScreenMessage(batch, camera, text, palette) {
    const messageHeight = 100;
    const messageY = Math.round((camera.h - messageHeight) / 2);
    batch.drawRect(colors_1.MESSAGE_COLOR, 0, messageY, camera.w, messageHeight);
    const textRect = rect_1.rect(0, messageY, camera.w, messageHeight);
    spriteFont_1.drawTextAligned(batch, text, fonts_1.fontPal, colors_1.WHITE, textRect, 2 /* Center */, 2 /* Middle */, { palette });
}
exports.drawFullScreenMessage = drawFullScreenMessage;
function createCommonPalettes(paletteManager) {
    return {
        defaultPalette: paletteManager.addArray(sprites.defaultPalette),
        mainFont: {
            emoji: paletteManager.addArray(sprites.emojiPalette),
            white: paletteManager.addArray(sprites.fontPalette),
            supporter1: paletteManager.addArray(sprites.fontSupporter1Palette),
            supporter2: paletteManager.addArray(sprites.fontSupporter2Palette),
            supporter3: paletteManager.addArray(sprites.fontSupporter3Palette),
        },
        smallFont: {
            emoji: paletteManager.addArray(sprites.emojiPalette),
            white: paletteManager.addArray(sprites.fontSmallPalette),
            supporter1: paletteManager.addArray(sprites.fontSmallSupporter1Palette),
            supporter2: paletteManager.addArray(sprites.fontSmallSupporter2Palette),
            supporter3: paletteManager.addArray(sprites.fontSmallSupporter3Palette),
        },
    };
}
exports.createCommonPalettes = createCommonPalettes;
//# sourceMappingURL=graphicsUtils.js.map