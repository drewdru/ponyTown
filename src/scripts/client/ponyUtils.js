"use strict";
/// <reference path="../../typings/my.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const sprites = require("../generated/sprites");
const offsets_1 = require("../common/offsets");
exports.PONY_WIDTH = 80;
exports.PONY_HEIGHT = 70;
exports.BLINK_FRAMES = [2, 6, 6, 4, 2];
exports.SLEEVED_ACCESSORIES = [2, 3, 4];
exports.SLEEVED_BACK_ACCESSORIES = [5, 6];
exports.CHEST_ACCESSORIES_IN_FRONT = [1];
exports.NO_MANE_HEAD_ACCESSORIES = [0, 16];
exports.headCenter = [
    undefined,
    [[0].map(i => sprites.head[2][0][i])],
];
exports.claws = sprites.frontLegHooves
    .map(f => f && [undefined, undefined, undefined, f[4], undefined, undefined]);
exports.frontHooves = sprites.frontLegHooves
    .map(f => f && [...f.slice(0, 4), ...f.slice(5)]);
exports.frontHoovesInFront = [false, false, true, true, false, false];
exports.backHoovesInFront = [false, false, true, false, false];
const bodyFrames = sprites.body.length;
exports.wings = createCompleteSets(sprites.wings, 3 + 10);
exports.tails = createCompleteSets(sprites.tails, 3);
exports.chest = createCompleteSets(sprites.chestAccessories, bodyFrames);
exports.chestBehind = createCompleteSets(sprites.chestAccessoriesBehind, bodyFrames);
exports.backAccessories = createCompleteSets(sprites.backAccessories, bodyFrames);
sprites.neckAccessories.forEach(f => f && f.pop()); // TEMP: remove headphones
exports.neckAccessories = createCompleteSets(sprites.neckAccessories, bodyFrames);
exports.waistAccessories = createCompleteSets(sprites.waistAccessories, bodyFrames + 1);
function frameType(sets, frame, type) {
    const set = sets[frame];
    return set && set[type];
}
function createCompleteSets(sets, frameCount) {
    const typeCount = sets.reduce((max, s) => Math.max(max, s ? s.length : 0), 0);
    const typeRange = lodash_1.range(0, typeCount);
    const result = [];
    for (let frame = 0; frame < frameCount; frame++) {
        result.push(typeRange.map(type => frameType(sets, frame, type) || frameType(result, frame - 1, type)));
    }
    return result;
}
function canFly(info) {
    const type = info.wings && info.wings.type || 0;
    return type > 0;
}
exports.canFly = canFly;
function canMagic(info) {
    const type = info.horn && info.horn.type || 0;
    return type === 1 || type === 2 || type === 3 || type === 14;
}
exports.canMagic = canMagic;
function flipIris(iris) {
    if (iris === 2 /* Left */ || iris === 4 /* UpLeft */) {
        return iris + 1;
    }
    else if (iris === 3 /* Right */ || iris === 5 /* UpRight */) {
        return iris - 1;
    }
    else {
        return iris;
    }
}
exports.flipIris = flipIris;
function flipFaceAccessoryType(type) {
    if (type === 6)
        return 7;
    if (type === 7)
        return 6;
    if (type === 9)
        return 10;
    if (type === 10)
        return 9;
    return type;
}
exports.flipFaceAccessoryType = flipFaceAccessoryType;
function flipFaceAccessoryPattern(type, pattern) {
    if (type === 2) { // dark glasses
        if (pattern === 1)
            return 2;
        if (pattern === 2)
            return 1;
    }
    else if (type === 11) { // large dark glasses
        if (pattern === 1)
            return 2;
        if (pattern === 2)
            return 1;
    }
    return pattern;
}
exports.flipFaceAccessoryPattern = flipFaceAccessoryPattern;
exports.defaultExpression = {
    left: 1 /* Neutral */,
    leftIris: 0 /* Forward */,
    right: 1 /* Neutral */,
    rightIris: 0 /* Forward */,
    muzzle: 2 /* Neutral */,
    extra: 0 /* None */,
};
exports.blinkFrames = [];
function setupBlinkFrames(frames) {
    lodash_1.dropRight(frames, 1).forEach((f, i) => exports.blinkFrames[f] = exports.blinkFrames[f] || frames.slice(i + 1));
}
setupBlinkFrames([1 /* Neutral */, 2 /* Neutral2 */, 3 /* Neutral3 */, 4 /* Neutral4 */, 5 /* Neutral5 */, 6 /* Closed */]);
setupBlinkFrames([7 /* Frown */, 8 /* Frown2 */, 9 /* Frown3 */, 10 /* Frown4 */, 6 /* Closed */]);
setupBlinkFrames([15 /* Sad */, 16 /* Sad2 */, 17 /* Sad3 */, 18 /* Sad4 */, 5 /* Neutral5 */, 6 /* Closed */]);
setupBlinkFrames([19 /* Angry */, 20 /* Angry2 */, 4 /* Neutral4 */, 5 /* Neutral5 */, 6 /* Closed */]);
// sets
function mergeColorExtras(sprites) {
    const filtered = lodash_1.compact(sprites);
    return Object.assign({}, filtered[0], { colors: lodash_1.max(filtered.map(x => x.colors || 0)), colorMany: filtered.length > 1 ? filtered.map(x => x.color) : undefined });
}
function mergeSprites(sets) {
    return lodash_1.zip(...sets).map(mergeColorExtras);
}
function mergeSpriteSets(...sets) {
    return lodash_1.zip(...sets).map(mergeSprites);
}
exports.backLegSleeves = sprites.backLegSleeves
    .map(sets => sets && [undefined, undefined, undefined, undefined, undefined, ...sets]);
// TEMP: remove summer hat
sprites.headAccessoriesBehind.pop();
sprites.headAccessories.pop();
exports.mergedManes = mergeSpriteSets(sprites.behindManes, sprites.topManes, sprites.frontManes);
exports.mergedBackManes = mergeSpriteSets(sprites.backBehindManes, sprites.backFrontManes);
exports.mergedFacialHair = mergeSpriteSets(sprites.facialHairBehind, sprites.facialHair);
exports.mergedEarAccessories = mergeSpriteSets(sprites.earAccessoriesBehind, sprites.earAccessories);
exports.mergedHeadAccessories = mergeSpriteSets(sprites.headAccessoriesBehind, sprites.headAccessories);
exports.mergedFaceAccessories = mergeSpriteSets(sprites.faceAccessories, sprites.faceAccessories2);
exports.mergedChestAccessories = mergeSpriteSets(sprites.chestAccessoriesBehind[1], sprites.chestAccessories[1]);
exports.mergedBackAccessories = mergeSpriteSets(exports.backAccessories[1], [undefined, undefined, undefined, undefined, undefined, ...sprites.backLegSleeves[1]]);
exports.mergedExtraAccessories = mergeSpriteSets(sprites.extraAccessoriesBehind, sprites.extraAccessories)
    .slice(0, DEVELOPMENT ? 100 : 2);
if (DEVELOPMENT) {
    assertSizes('HEAD_ACCESSORY_OFFSETS', offsets_1.HEAD_ACCESSORY_OFFSETS, exports.mergedManes);
    assertSizes('EXTRA_ACCESSORY_OFFSETS', offsets_1.EXTRA_ACCESSORY_OFFSETS, exports.mergedManes);
    assertSizes('EAR_ACCESSORY_OFFSETS', offsets_1.EAR_ACCESSORY_OFFSETS, sprites.ears);
    assertSizes('frontHoovesInFront', exports.frontHoovesInFront, exports.frontHooves[1]);
    assertSizes('backHoovesInFront', exports.backHoovesInFront, sprites.backLegHooves[1]);
}
function assertSizes(name, a, b) {
    if (a.length !== b.length) {
        throw new Error(`Invalid ${name} length (${a.length} !== ${b.length})`);
    }
}
//# sourceMappingURL=ponyUtils.js.map