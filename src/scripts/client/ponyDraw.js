"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("../common/interfaces");
const colors_1 = require("../common/colors");
const utils_1 = require("../common/utils");
const sprites = require("../generated/sprites");
const offsets = require("../common/offsets");
const ponyAnimations_1 = require("./ponyAnimations");
const positionUtils_1 = require("../common/positionUtils");
const ponyUtils_1 = require("./ponyUtils");
const offsets_1 = require("../common/offsets");
const mat2d_1 = require("../common/mat2d");
const ponyInfo_1 = require("../common/ponyInfo");
const holdingDrawOptions = Object.assign({}, interfaces_1.defaultDrawOptions, { shadowColor: colors_1.TRANSPARENT });
function checker(parts) {
    const set = new Set(parts);
    return (part) => set.has(part);
}
function partChecker(parts) {
    const check = checker(parts);
    return (set) => set !== undefined && !!set.type && check(set.type);
}
const SHADOW_OX = 20;
const SHADOW_OY = 64;
const FAR_OX = -3;
const FAR_OY = -1;
const FAR_WING_OX = -4;
const FAR_WING_OY = 0;
const hasNoMane = checker(ponyUtils_1.NO_MANE_HEAD_ACCESSORIES);
const behindBackAccessory = partChecker([1]);
const sleevedAccessory = partChecker(ponyUtils_1.SLEEVED_ACCESSORIES);
const sleevedBackAccessory = partChecker(ponyUtils_1.SLEEVED_BACK_ACCESSORIES);
const chestAccessoryInFront = partChecker(ponyUtils_1.CHEST_ACCESSORIES_IN_FRONT);
const pointZero = utils_1.point(0, 0);
const headFlipOffsetX = 35.5;
const headFlipOffsetY = 42;
const headTransform = mat2d_1.createMat2D();
function clamp(value, min, max) {
    return value > min ? (value < max ? value : max) : min;
}
function at(items, index) {
    // if (DEVELOPMENT) {
    // 	if (items.length === 0) {
    // 		console.warn(`Empty array at: ${getStackLocation(2)} / ${getStackLocation(3)}`);
    // 	} else if (index < 0 || index >= items.length) {
    // 		console.warn(`Index out of range ${index} of 0..${items.length} at: ${getStackLocation(2)} / ${getStackLocation(3)}`);
    // 	}
    // }
    return items[clamp(index | 0, 0, items.length - 1)];
}
function att(items, index) {
    return items && items[clamp(index | 0, 0, items.length - 1)];
}
function atDef(items, index, def) {
    return (items && items.length > 0 && index >= 0 && index < items.length) ? items[index | 0] : def;
}
function getPonyAnimationFrame({ frames }, frame, defaultFrame) {
    return frames.length > 0 ? frames[Math.max(0, frame) % frames.length] : defaultFrame;
}
exports.getPonyAnimationFrame = getPonyAnimationFrame;
function getHeadXY(x, y, turned, frame, headFrame) {
    const headOffset = at(offsets.headOffsets, frame.body);
    const headX = x + frame.headX + (headFrame.headX * (turned ? -1 : 1)) + headOffset.x;
    const headY = y + frame.headY + headFrame.headY + headOffset.y;
    return { headX, headY };
}
function getPonyHeadPosition(state, ponyX, ponyY) {
    const frame = getPonyAnimationFrame(state.animation, state.animationFrame, ponyAnimations_1.defaultBodyFrame);
    const headFrame = getPonyAnimationFrame(state.headAnimation || ponyAnimations_1.defaultHeadAnimation, state.headAnimationFrame, ponyAnimations_1.defaultHeadFrame);
    const baseX = ponyX - ponyUtils_1.PONY_WIDTH / 2;
    const baseY = ponyY - ponyUtils_1.PONY_HEIGHT;
    const x = baseX + frame.bodyX;
    const y = baseY + frame.bodyY;
    const { headX, headY } = getHeadXY(x, y, state.headTurned, frame, headFrame);
    return { x: headX, y: headY };
}
exports.getPonyHeadPosition = getPonyHeadPosition;
function createHeadTransform(originalTransform, headX, headY, { headTilt, headTurned }) {
    if (originalTransform !== undefined) {
        mat2d_1.copyMat2D(headTransform, originalTransform);
    }
    else {
        mat2d_1.identityMat2D(headTransform);
    }
    mat2d_1.translateMat2D(headTransform, headTransform, headX + headFlipOffsetX, headY + headFlipOffsetY);
    if (headTilt) {
        mat2d_1.rotateMat2D(headTransform, headTransform, headTilt * 0.1);
    }
    mat2d_1.scaleMat2D(headTransform, headTransform, headTurned ? -1 : 1, 1);
    mat2d_1.translateMat2D(headTransform, headTransform, -headFlipOffsetX, -headFlipOffsetY);
    return headTransform;
}
exports.createHeadTransform = createHeadTransform;
function getHeadY(frame, headFrame) {
    const headOffset = offsets.headOffsets[frame.body];
    return frame.bodyY + frame.headY + headFrame.headY + headOffset.y;
}
exports.getHeadY = getHeadY;
const defaultShadow = { frame: 0, offset: 0 };
const hairOffsets = [
    0, 0, 0, 0,
    -1, -1, 0, 0,
    0, 0, 0, -1,
    -1, 0, 0, 0,
    0, 0, 0, 0,
    ...utils_1.repeat(100, 0),
];
function draw(options, flag) {
    if (TOOLS) {
        return !utils_1.hasFlag(options.no, flag);
    }
    else {
        return true;
    }
}
const headOffsetsX = [0, 1, 1, 1, 1, 1, 0];
const headOffsetsY = [0, 0, 1, 1, 0, 0, 0];
let toys = [];
function initializeToys(paletteManager) {
    function set(type, pattern, colors) {
        const palette = [
            colors_1.TRANSPARENT,
            ...utils_1.flatten(colors.map(color => [color, ponyInfo_1.darkenForOutline(colors_1.fillToOutlineColor(color))]))
        ];
        return { type, pattern, palette: paletteManager.add(palette) };
    }
    toys = [
        undefined,
        // hat
        set(2, 0, [0xffffffff, 0xff2525ff]),
        set(2, 0, [0xffffffff, 0x22ac22ff]),
        set(2, 0, [0xffffffff, 0x2e58f4ff]),
        set(2, 0, [0xffffffff, 0xff71ffff]),
        // snowpony
        set(3, 0, [0xffffffff, 0x000000ff, 0xff9100ff, 0xff0000ff]),
        set(4, 0, [0xffffffff, 0x000000ff, 0xff9100ff, 0xff0000ff]),
        set(4, 0, [0x404040ff, 0xff0000ff, 0x000000ff, 0xff0000ff]),
        // gift
        set(6, 0, [0xcf1717ff, 0xecd132ff]),
        set(6, 0, [0xdfc588ff, 0xe7559bff]),
        set(6, 0, [0x7fc484ff, 0x4a79daff]),
        set(6, 0, [0xd56a69ff, 0x62ab64ff]),
        set(6, 0, [0xe586dfff, 0x9553c1ff]),
        // hanging thing
        set(5, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0xb9c0d8ff, 0xffd94fff, 0xeca242ff]),
        set(7, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0xb9c0d8ff, 0xc0ccc4ff]),
        set(17, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0x000000ff, 0xe7b86fff, 0x3f1d0fff]),
        set(10, 0, [0x91622fff, 0xc02455ff, 0x429a51ff, 0x000000ff]),
        // teddy
        set(8, 0, [0xa86230ff, 0xdfbe8bff, colors_1.TRANSPARENT, colors_1.TRANSPARENT]),
        set(8, 0, [0xa86230ff, 0xdfbe8bff, 0xffa500ff, 0xffffffff]),
        set(8, 0, [0x474444ff, 0x96623eff, colors_1.TRANSPARENT, colors_1.TRANSPARENT]),
        set(8, 0, [0x474444ff, 0x96623eff, 0xffa500ff, 0xffffffff]),
        set(9, 1, [0xa86230ff, 0xdfbe8bff, 0xff0000ff, colors_1.TRANSPARENT, 0xf5f5f5ff]),
        set(9, 1, [0x474444ff, 0x96623eff, 0xff0000ff, colors_1.TRANSPARENT, 0xf5f5f5ff]),
        set(9, 0, [0xdce5edff, 0xffffffff, 0xff0000ff, 0xdfbe8bff, 0x645137ff]),
        // xmas tree
        set(11, 0, [0x1a9b2fff, 0x56c7ffff, 0xde4d68ff, 0xf1d224ff]),
        set(11, 1, [0x1a9b2fff, 0xf1d224ff, 0x1a9b2fff, 0xde4d68ff]),
        // deer
        set(12, 0, [0x7b4b24ff, 0xcf0e0eff, 0xbfaa8cff]),
        set(16, 0, [0x7b4b24ff, 0xcf0e0eff, 0xbfaa8cff, 0xffffffff, 0x56c7ffff, 0xf1d224ff]),
        // candy horns
        set(13, 0, [0xffffffff, 0xff1b1bff, colors_1.TRANSPARENT, colors_1.TRANSPARENT]),
        set(13, 0, [0xffffffff, 0xff1b1bff, 0xffffffff, 0xff1b1bff]),
        set(13, 0, [0x58df6aff, 0xffffffff, 0x3387e9ff, 0xffffffff]),
        // star
        set(14, 0, [0xffd94fff, 0xeca242ff]),
        // halo
        set(15, 0, [0xffd94fff, 0xeca242ff]),
    ];
    if (DEVELOPMENT && toys.length > 33) {
        console.error('too many toys', toys.length);
    }
}
exports.initializeToys = initializeToys;
const zeroPoint = utils_1.point(0, 0);
const wakes = [
    { ox: 21, oy: 60, behind: sprites.pony_wake_4, front: sprites.pony_wake_3 },
    { ox: 24, oy: 60, behind: sprites.pony_wake_6, front: sprites.pony_wake_5 },
    { ox: 18, oy: 51, behind: sprites.pony_wake_2, front: sprites.pony_wake_1 },
];
const wakeIndices = [0, 2, 1, 0, 2, 2, 2, 0, 2, 2, 2, 1, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 1];
function getWakeIndex(info) {
    const tail = info.tail && info.tail.type || 0;
    return wakeIndices[tail];
}
function drawPony(batch, info, state, ponyX, ponyY, options) {
    const frame = getPonyAnimationFrame(state.animation, state.animationFrame, ponyAnimations_1.defaultBodyFrame);
    const headFrame = getPonyAnimationFrame(state.headAnimation || ponyAnimations_1.defaultHeadAnimation, state.headAnimationFrame, ponyAnimations_1.defaultHeadFrame);
    const baseX = ponyX - ponyUtils_1.PONY_WIDTH / 2;
    const baseY = ponyY - ponyUtils_1.PONY_HEIGHT;
    const x = baseX + frame.bodyX;
    const y = baseY + frame.bodyY;
    const body = frame.body;
    const { headX, headY } = getHeadXY(x, y, state.headTurned, frame, headFrame);
    const frontLegOffset = at(offsets.frontLegOffsets, body);
    const backLegOffset = at(offsets.backLegOffsets, body);
    const wingOffset = at(offsets.wingOffsets, body);
    const chestOffset = at(offsets.chestAccessoryOffsets, body);
    const chestX = x + chestOffset.x;
    const chestY = y + chestOffset.y;
    const shadow = atDef(state.animation.shadow, state.animationFrame, defaultShadow);
    const backOffset = at(offsets.backAccessoryOffsets, body);
    const wing = at(ponyUtils_1.wings, frame.wing);
    const flipped = options.flipped;
    const headOffset = clamp(state.headTurn, 0, headOffsetsX.length - 1);
    const headOffsetX = headOffsetsX[headOffset];
    const headOffsetY = headOffsetsY[headOffset];
    const headTotalY = headY + headOffsetY;
    const headTransform = createHeadTransform(undefined, headX + headOffsetX, headTotalY, state);
    const headCropY = 42 - ((headTotalY + headFlipOffsetY) - baseY);
    const cropW = 80;
    const cropH = 65;
    const shadowX = baseX + shadow.offset + SHADOW_OX;
    const shadowY = baseY + SHADOW_OY;
    const wake = wakes[getWakeIndex(info)];
    const wakeX = baseX + wake.ox;
    const wakeY = baseY + wake.oy;
    const wakeFrame = Math.floor(options.gameTime * 7 / 1000) % wake.behind.frames.length;
    const swimming = options.swimming;
    if (swimming) {
        batch.drawSprite(wake.behind.frames[wakeFrame], colors_1.WHITE, info.waterPalette, wakeX, wakeY);
        batch.crop(-40, -70, cropW, cropH);
    }
    // selection
    if (options.selected) {
        const sprite = at(sprites.ponySelections, shadow.frame);
        sprite && batch.drawSprite(sprite, colors_1.WHITE, info.defaultPalette, shadowX, shadowY);
    }
    // shadow
    if (options.shadow) {
        const sprite = at(sprites.ponyShadows, shadow.frame);
        sprite && batch.drawSprite(sprite, options.shadowColor, info.defaultPalette, shadowX, shadowY);
    }
    // head accessory
    const bounce = BETA && options.bounce;
    const maneOffsetY = bounce ? hairOffsets[state.animationFrame] : 0;
    const maneBehindOffsetY = bounce ? hairOffsets[state.animationFrame] : 0;
    const hatOffsetY = maneBehindOffsetY;
    let hatOffset = at(offsets_1.HEAD_ACCESSORY_OFFSETS, info.mane ? info.mane.type : 0);
    const noMane = !info.mane || hasNoMane(info.mane.type);
    if (info.headAccessory !== undefined && info.headAccessory.type === 20) {
        hatOffset = zeroPoint;
    }
    if (draw(options, 16 /* Behind */)) {
        // far wing
        drawSet(batch, wing, info.wings, x + FAR_WING_OX + wingOffset.x, y + FAR_WING_OY + wingOffset.y, colors_1.FAR_COLOR);
        batch.save();
        batch.multiplyTransform(headTransform);
        if (swimming) {
            // batch.drawRect(0xffff0066, 0, headCropY, cropW, cropH);
            batch.crop(0, headCropY, cropW, cropH);
        }
        if (noMane) {
            drawSet(batch, sprites.headAccessoriesBehind, info.headAccessory, hatOffset.x, hatOffset.y + hatOffsetY, colors_1.WHITE);
        }
        if (draw(options, 128 /* FarEar */)) {
            drawSet(batch, sprites.earAccessoriesBehind, info.earAccessory, 0, 0, colors_1.WHITE);
        }
    }
    if (draw(options, 32 /* Body */) && draw(options, 128 /* FarEar */)) {
        drawSet(batch, sprites.earsFar, info.ears, 0, 0, draw(options, 8388608 /* FarEarShade */) ? colors_1.FAR_COLOR : colors_1.WHITE);
    }
    if (draw(options, 16 /* Behind */)) {
        drawSet(batch, sprites.hornsBehind, info.horn, 0, 0, colors_1.WHITE);
        if (!noMane) {
            drawSet(batch, sprites.headAccessoriesBehind, info.headAccessory, hatOffset.x, hatOffset.y + hatOffsetY, colors_1.WHITE);
        }
        drawSet(batch, sprites.backBehindManes, info.backMane, 0, maneBehindOffsetY, colors_1.WHITE);
        if (!state.headTurned) {
            drawSet(batch, sprites.behindManes, info.mane, 0, maneBehindOffsetY, colors_1.WHITE);
        }
        batch.restore();
        // chest accessory behind
        drawSet(batch, ponyUtils_1.chestBehind[body], info.chestAccessory, chestX, chestY, colors_1.WHITE);
    }
    // legs
    const behindX = x + FAR_OX;
    const behindY = y + FAR_OY;
    const hasTailAccessory = behindBackAccessory(info.backAccessory);
    const hasSleeves = sleevedAccessory(info.chestAccessory);
    const hasBackSleeves = sleevedBackAccessory(info.backAccessory);
    const frontBehindX = behindX + frontLegOffset.x + frame.frontFarLegX;
    const frontBehindY = behindY + frontLegOffset.y + frame.frontFarLegY;
    const backBehindX = behindX + backLegOffset.x + frame.backFarLegX;
    const backBehindY = behindY + backLegOffset.y + frame.backFarLegY;
    // far leg back
    if (draw(options, 262144 /* BackFarLeg */)) {
        drawLeg(batch, backBehindX, backBehindY, frame.backFarLeg, sprites.backLegs, sprites.backLegHooves, sprites.backLegAccessories, info.backLegs, flipped ? info.backLegAccessory : info.backLegAccessoryRight, info.backHooves, ponyUtils_1.backHoovesInFront, colors_1.FAR_COLOR, undefined, false, 0, 0);
    }
    // far leg front
    if (draw(options, 1048576 /* FrontFarLeg */)) {
        drawLeg(batch, frontBehindX, frontBehindY, frame.frontFarLeg, sprites.frontLegs, ponyUtils_1.frontHooves, sprites.frontLegAccessories, info.frontLegs, flipped ? info.frontLegAccessory : info.frontLegAccessoryRight, info.frontHooves, ponyUtils_1.frontHoovesInFront, colors_1.FAR_COLOR, undefined, false, 0, 0);
    }
    // far leg back sleeve
    if (draw(options, 2097152 /* FarSleeves */) && hasBackSleeves) {
        drawSet(batch, at(sprites.backLegSleeves, frame.backFarLeg), info.backAccessory, backBehindX, backBehindY, colors_1.FAR_COLOR);
    }
    // far leg front sleeve
    if (draw(options, 2097152 /* FarSleeves */) && hasSleeves) {
        drawSet(batch, at(sprites.frontLegSleeves, frame.frontFarLeg), info.sleeveAccessory, frontBehindX, frontBehindY, colors_1.FAR_COLOR);
    }
    // tail
    const tailOffset = at(offsets.tailOffsets, body);
    const tailX = x + tailOffset.x;
    const tailY = y + tailOffset.y;
    const failFrame = utils_1.hasFlag(state.flags, 1 /* CurlTail */) ? 1 : frame.tail;
    drawSet(batch, at(ponyUtils_1.tails, failFrame), info.tail, tailX, tailY, colors_1.WHITE);
    // tail accessory
    if (draw(options, 65536 /* BackAccessory */) && hasTailAccessory) {
        drawSet(batch, ponyUtils_1.backAccessories[body], info.backAccessory, x + backOffset.x, y + backOffset.y, colors_1.WHITE);
    }
    // body
    if (draw(options, 32 /* Body */) && draw(options, 64 /* BodyOnly */)) {
        drawSet(batch, sprites.body[body], info.body, x, y, colors_1.WHITE);
    }
    // neck accessory
    const frontNeckAccessory = true; // hasPart(info.neckAccessory, FRONT_NECK_ACCESSORIES);
    // if (!frontNeckAccessory) {
    // 	drawSpriteSet(context, neckAccessories[frame.body], info.neckAccessory, x, y);
    // }
    const frontX = x + frontLegOffset.x + frame.frontLegX;
    const frontY = y + frontLegOffset.y + frame.frontLegY;
    const backX = x + backLegOffset.x + frame.backLegX;
    const backY = y + backLegOffset.y + frame.backLegY;
    const cmOffset = at(offsets.cmOffsets, body);
    const hooves = (TOOLS && options.useAllHooves) ? sprites.frontLegHooves : ponyUtils_1.frontHooves;
    // close legs back
    if (draw(options, 131072 /* BackLeg */)) {
        drawLeg(batch, backX, backY, frame.backLeg, sprites.backLegs, sprites.backLegHooves, sprites.backLegAccessories, info.backLegs, flipped ? info.backLegAccessoryRight : info.backLegAccessory, info.backHooves, ponyUtils_1.backHoovesInFront, colors_1.WHITE, info.cmPalette, flipped && !!info.cmFlip, x + cmOffset.x, y + cmOffset.y);
    }
    // back accessory
    if (draw(options, 65536 /* BackAccessory */) && !hasTailAccessory) {
        drawSet(batch, ponyUtils_1.backAccessories[body], info.backAccessory, x + backOffset.x, y + backOffset.y, colors_1.WHITE);
    }
    // close leg back sleeves
    if (draw(options, 4194304 /* CloseSleeves */) && hasBackSleeves) {
        drawSet(batch, at(ponyUtils_1.backLegSleeves, frame.backLeg), info.backAccessory, backX, backY, colors_1.WHITE);
    }
    const isChestAccessoryInFront = chestAccessoryInFront(info.chestAccessory);
    // chest accessory
    if (!isChestAccessoryInFront && draw(options, 1 /* Front */)) {
        drawSet(batch, ponyUtils_1.chest[body], info.chestAccessory, chestX, chestY, colors_1.WHITE);
    }
    // close legs front
    if (draw(options, 524288 /* FrontLeg */)) {
        drawLeg(batch, frontX, frontY, frame.frontLeg, sprites.frontLegs, hooves, sprites.frontLegAccessories, info.frontLegs, flipped ? info.frontLegAccessoryRight : info.frontLegAccessory, info.frontHooves, ponyUtils_1.frontHoovesInFront, colors_1.WHITE, undefined, false, 0, 0);
    }
    // close legs front sleeves
    if (draw(options, 4194304 /* CloseSleeves */) && hasSleeves) {
        drawSet(batch, at(sprites.frontLegSleeves, frame.frontLeg), info.sleeveAccessory, frontX, frontY, colors_1.WHITE);
    }
    // chest accessory
    if (isChestAccessoryInFront && draw(options, 1 /* Front */)) {
        drawSet(batch, ponyUtils_1.chest[body], info.chestAccessory, chestX, chestY, colors_1.WHITE);
    }
    // close legs back (2)
    if (draw(options, 131072 /* BackLeg */)) {
        drawLeg(batch, backX, backY, frame.backLeg, sprites.backLegs2, sprites.backLegHooves2, sprites.backLegAccessories2, info.backLegs, flipped ? info.backLegAccessoryRight : info.backLegAccessory, info.backHooves, ponyUtils_1.backHoovesInFront, colors_1.WHITE, undefined, false, 0, 0);
    }
    // close legs back sleeves (2)
    if (draw(options, 4194304 /* CloseSleeves */) && hasBackSleeves) {
        drawSet(batch, at(sprites.backLegSleeves2, frame.backLeg), info.backAccessory, backX, backY, colors_1.WHITE);
    }
    // neck accessory
    if (frontNeckAccessory) {
        const neckOffset = at(offsets.neckAccessoryOffsets, body);
        drawSet(batch, ponyUtils_1.neckAccessories[body], info.neckAccessory, x + neckOffset.x, y + neckOffset.y, colors_1.WHITE);
    }
    // waist accessory
    const waistFrame = frame.wing > 2 ? 16 : body;
    const waistOffset = at(offsets.waistAccessoryOffsets, waistFrame);
    drawSet(batch, ponyUtils_1.waistAccessories[waistFrame], info.waistAccessory, x + waistOffset.x, y + waistOffset.y, colors_1.WHITE);
    // wings
    drawSet(batch, wing, info.wings, x + wingOffset.x, y + wingOffset.y, colors_1.WHITE);
    // head
    const headTurned = state.headTurned;
    const headFlip = headTurned ? !flipped : flipped;
    const headSprite = headFlip ? sprites.head0[frame.head] : sprites.head1[frame.head];
    if (swimming) {
        batch.clearCrop();
    }
    batch.save();
    batch.multiplyTransform(headTransform);
    if (swimming) {
        batch.crop(0, headCropY, cropW, cropH);
    }
    if (headTurned) {
        drawSet(batch, sprites.behindManes, info.mane, 0, maneBehindOffsetY, colors_1.WHITE);
    }
    drawHead(batch, info, 0, 0, headSprite, headFrame, state, options, headFlip, maneOffsetY);
    drawSet(batch, sprites.headAccessories, info.headAccessory, hatOffset.x, hatOffset.y + hatOffsetY, colors_1.WHITE);
    batch.restore();
    if (swimming) {
        batch.drawSprite(wake.front.frames[wakeFrame], colors_1.WHITE, info.waterPalette, wakeX, wakeY);
    }
}
exports.drawPony = drawPony;
function drawHead(batch, info, x, y, headSprites, headFrame, { blinkFrame, expression, holding, blushColor, drawFaceExtra }, options, flip, maneOffsetY) {
    const extraOffset = at(offsets_1.EXTRA_ACCESSORY_OFFSETS, info.mane && info.mane.type) || pointZero;
    const extraX = x + extraOffset.x;
    const extraY = y + extraOffset.y;
    const toy = att(toys, options.toy);
    if (toy !== undefined) {
        drawSet(batch, sprites.extraAccessoriesBehind, toy, extraX, extraY, colors_1.WHITE);
    }
    else if (options.extra && draw(options, 16 /* Behind */)) {
        drawSet(batch, sprites.extraAccessoriesBehind, info.extraAccessory, extraX, extraY, colors_1.WHITE);
    }
    if (draw(options, 32 /* Body */)) {
        if (draw(options, 16384 /* Head */)) {
            drawSet(batch, headSprites, info.head, x, y, colors_1.WHITE);
        }
        let eyeLeftBase = -1;
        let eyeRightBase = -1;
        let irisLeft = 0 /* Forward */;
        let irisRight = 0 /* Forward */;
        if (expression !== undefined) {
            if (utils_1.hasFlag(expression.extra, 1 /* Blush */)) {
                batch.drawSprite(sprites.blush, blushColor, info.defaultPalette, x, y);
            }
            eyeLeftBase = expression.left;
            eyeRightBase = expression.right;
            irisLeft = expression.leftIris;
            irisRight = expression.rightIris;
            // make sure eyes are closed if sleeping
            if (utils_1.hasFlag(expression.extra, 2 /* Zzz */)) {
                if (!interfaces_1.isEyeSleeping(eyeLeftBase)) {
                    eyeLeftBase = 6 /* Closed */;
                }
                if (!interfaces_1.isEyeSleeping(eyeRightBase)) {
                    eyeRightBase = 6 /* Closed */;
                }
            }
        }
        const eyeRight = getEyeFrame(info.eyeOpennessRight || 1, eyeRightBase, headFrame.right, blinkFrame);
        const eyeLeft = getEyeFrame(info.eyeOpennessLeft || 1, eyeLeftBase, headFrame.left, blinkFrame);
        const eyeFrameLeft = flip ? eyeRight : eyeLeft;
        const eyeFrameRight = flip ? eyeLeft : eyeRight;
        const eyeColorLeft = flip ? info.eyeColorRight : info.eyeColorLeft;
        const eyeColorRight = flip ? info.eyeColorLeft : info.eyeColorRight;
        const eyePaletteLeft = flip ? info.eyePalette : info.eyePaletteLeft;
        const eyePaletteRight = flip ? info.eyePaletteLeft : info.eyePalette;
        const eyeIrisLeft = flip ? ponyUtils_1.flipIris(irisRight) : irisLeft;
        const eyeIrisRight = flip ? ponyUtils_1.flipIris(irisLeft) : irisRight;
        const eyeLeftSprites = sprites.eyeLeft;
        const eyeRightSprites = sprites.eyeRight;
        if (draw(options, 32768 /* Eyes */)) {
            drawEye(batch, att(at(eyeLeftSprites, eyeFrameLeft), info.eyelashes), eyeIrisLeft, info, eyeColorLeft, eyePaletteLeft, x, y);
            drawEye(batch, att(at(eyeRightSprites, eyeFrameRight), info.eyelashes), eyeIrisRight, info, eyeColorRight, eyePaletteRight, x, y);
        }
    }
    if (draw(options, 1 /* Front */)) {
        drawSet(batch, sprites.facialHairBehind, info.facialHair, x, y, colors_1.WHITE);
    }
    if (drawFaceExtra !== undefined) {
        drawFaceExtra(batch);
    }
    const faceAccessory = info.faceAccessory;
    let faceAccessoryType = 0;
    let faceAccessoryPattern = 0;
    if (faceAccessory !== undefined) {
        faceAccessoryType = flip ? ponyUtils_1.flipFaceAccessoryType(faceAccessory.type) : faceAccessory.type;
        faceAccessoryPattern = flip ? ponyUtils_1.flipFaceAccessoryPattern(faceAccessoryType, faceAccessory.pattern) : faceAccessory.pattern;
        if (draw(options, 512 /* FaceAccessory1 */)) {
            drawTypePattern(batch, sprites.faceAccessories, faceAccessoryType, faceAccessoryPattern, faceAccessory.palette, faceAccessory.extraPalette, x, y, colors_1.WHITE);
            // if (info.faceAccessoryExtraPalette) {
            // 	drawTypePattern(
            // 		batch, sprites.faceAccessoriesExtra, faceAccessoryType, faceAccessoryPattern,
            // 		info.faceAccessoryExtraPalette, x, y, WHITE);
            // }
        }
    }
    if (draw(options, 32 /* Body */) && draw(options, 8192 /* Nose */)) {
        const muzzle = holding ?
            0 /* Smile */ :
            headFrame.mouth === -1 ?
                (expression ? expression.muzzle : info.muzzle) :
                headFrame.mouth;
        const noses = at(sprites.noses, muzzle);
        const nose = att(noses, info.nose && info.nose.type)[0];
        nose.mouth && batch.drawSprite(nose.mouth, colors_1.WHITE, info.defaultPalette, x, y);
        if (holding !== undefined && holding.draw !== undefined) {
            holding.x = positionUtils_1.toWorldX(x + utils_1.toInt(holding.pickableX));
            holding.y = positionUtils_1.toWorldY(y + utils_1.toInt(holding.pickableY));
            holding.draw(batch, holdingDrawOptions);
        }
        drawSet(batch, noses, info.nose, x, y, colors_1.WHITE);
        if (info.fangs && nose.fangs) {
            batch.drawSprite(nose.fangs, colors_1.WHITE, info.defaultPalette, x, y);
        }
    }
    if (draw(options, 2 /* Front2 */)) {
        drawSet(batch, sprites.facialHair, info.facialHair, x, y, colors_1.WHITE);
    }
    const skipTopAndFrontMane = info.headAccessory !== undefined && info.headAccessory.type === 20;
    if (draw(options, 4096 /* FrontMane */)) {
        drawSet(batch, sprites.backFrontManes, info.backMane, x, y + maneOffsetY, colors_1.WHITE);
    }
    if (draw(options, 2048 /* TopMane */) && !skipTopAndFrontMane) {
        drawSet(batch, sprites.topManes, info.mane, x, y, colors_1.WHITE);
    }
    if (toy !== undefined) {
        drawSet(batch, sprites.extraAccessories, toy, extraX, extraY, colors_1.WHITE);
    }
    else if (options.extra && draw(options, 1 /* Front */)) {
        drawSet(batch, sprites.extraAccessories, info.extraAccessory, extraX, extraY, colors_1.WHITE);
    }
    if (draw(options, 1 /* Front */)) {
        drawSet(batch, sprites.horns, info.horn, x, y, colors_1.WHITE);
    }
    if (draw(options, 32 /* Body */) && draw(options, 256 /* CloseEar */) && !options.noEars) {
        drawSet(batch, sprites.ears, info.ears, x, y, colors_1.WHITE);
    }
    if (faceAccessory !== undefined && draw(options, 1024 /* FaceAccessory2 */)) {
        drawTypePattern(batch, sprites.faceAccessories2, faceAccessoryType, faceAccessoryPattern, faceAccessory.palette, faceAccessory.extraPalette, x, y, colors_1.WHITE);
        // if (info.faceAccessoryExtraPalette) {
        // 	drawTypePattern(
        // 		batch, sprites.faceAccessories2Extra, faceAccessoryType, faceAccessoryPattern,
        // 		info.faceAccessoryExtraPalette, x, y, WHITE);
        // }
    }
    const earAccessoryOffset = at(offsets_1.EAR_ACCESSORY_OFFSETS, info.ears && info.ears.type);
    const frontEarAccessory = false; // info.earAccessory !== undefined && info.earAccessory.type === 13;
    if (!frontEarAccessory && draw(options, 1 /* Front */) && draw(options, 256 /* CloseEar */)) {
        drawSet(batch, sprites.earAccessories, info.earAccessory, x + earAccessoryOffset.x, y + earAccessoryOffset.y, colors_1.WHITE);
    }
    if (draw(options, 4096 /* FrontMane */) && !skipTopAndFrontMane) {
        drawSet(batch, sprites.frontManes, info.mane, x, y + maneOffsetY, colors_1.WHITE);
    }
    if (frontEarAccessory && draw(options, 1 /* Front */) && draw(options, 256 /* CloseEar */)) {
        drawSet(batch, sprites.earAccessories, info.earAccessory, x + earAccessoryOffset.x, y + earAccessoryOffset.y, colors_1.WHITE);
    }
}
exports.drawHead = drawHead;
function drawLeg(batch, x, y, frame, leg, hoof, sock, legSet, sockSet, hoofSet, hoovesInFront, color, cmPalette, cmFlip, cmX, cmY) {
    const hoofInFront = hoofSet !== undefined && !!hoovesInFront[hoofSet.type];
    drawSet(batch, at(leg, frame), legSet, x, y, color);
    if (!hoofInFront) {
        drawSet(batch, at(hoof, frame), hoofSet, x, y, color);
    }
    // CM
    if (cmPalette !== undefined) {
        const cm = cmFlip ? sprites.cmsFlip : sprites.cms;
        batch.drawSprite(cm, colors_1.WHITE, cmPalette, cmX, cmY);
    }
    drawSet(batch, at(sock, frame), sockSet, x, y, color);
    if (hoofInFront) {
        const hasClaws = hoofSet && hoofSet.type === 3 && hoof === ponyUtils_1.frontHooves;
        const hasSocks = !!(sockSet && sockSet.type > 0);
        const hoofSprites = (hasClaws && hasSocks) ? ponyUtils_1.claws : hoof;
        drawSet(batch, at(hoofSprites, frame), hoofSet, x, y, color);
    }
}
function getEyeFrame(base, expression, anim, blinkFrame) {
    if (anim !== -1)
        return anim;
    const frame = expression === -1 ? base : expression;
    const blink = ponyUtils_1.blinkFrames[frame];
    if (blinkFrame > 1 && blink) {
        const frameOffset = 6 - blinkFrame;
        if (frameOffset < blink.length) {
            return blink[blink.length - frameOffset - 1];
        }
    }
    return frame;
}
function drawEye(batch, eye, iris, info, palette, eyePalette, x, y) {
    if (eye !== undefined) {
        if (info.eyeshadow === true) {
            eye.shadow && batch.drawSprite(eye.shadow, colors_1.WHITE, info.eyeshadowColor, x, y);
            eye.shine && batch.drawSprite(eye.shine, colors_1.SHINES_COLOR, info.defaultPalette, x, y);
        }
        eye.base && batch.drawSprite(eye.base, colors_1.WHITE, eyePalette, x, y);
        const sprite = at(eye.irises, iris);
        sprite && batch.drawSprite(sprite, colors_1.WHITE, palette, x, y);
    }
}
function drawSet(batch, sprites, set, x, y, tint) {
    if (set !== undefined) {
        const patterns = att(sprites, set.type);
        if (patterns !== undefined) {
            const patternSprite = at(patterns, set.pattern);
            if (patternSprite !== undefined) {
                batch.drawSprite(patternSprite.color, tint, set.palette, x, y);
            }
        }
    }
}
function drawTypePattern(batch, sprites, type, pattern, palette, extraPalette, x, y, tint) {
    const patterns = att(sprites, type);
    if (patterns !== undefined) {
        const patternSprite = at(patterns, pattern);
        if (patternSprite !== undefined) {
            batch.drawSprite(patternSprite.color, tint, palette, x, y);
            if (patternSprite.extra !== undefined && extraPalette !== undefined) {
                batch.drawSprite(patternSprite.extra, colors_1.WHITE, extraPalette, x, y);
            }
        }
    }
}
//# sourceMappingURL=ponyDraw.js.map