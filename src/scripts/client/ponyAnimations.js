"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
// body animations
function createBodyFrame([body = 0, head = 0, wing = 0, tail = 0, frontLeg = 0, frontFarLeg = 0, backLeg = 0, backFarLeg = 0, bodyX = 0, bodyY = 0, headX = 0, headY = 0, frontLegX = 0, frontLegY = 0, frontFarLegX = 0, frontFarLegY = 0, backLegX = 0, backLegY = 0, backFarLegX = 0, backFarLegY = 0]) {
    return {
        body, head, wing, tail,
        frontLeg, frontFarLeg, backLeg, backFarLeg,
        bodyX, bodyY, headX, headY,
        frontLegX, frontLegY, frontFarLegX, frontFarLegY,
        backLegX, backLegY, backFarLegX, backFarLegY
    };
}
exports.createBodyFrame = createBodyFrame;
function createBodyAnimation(name, fps, loop, frames, shadowOffsets) {
    if (shadowOffsets && shadowOffsets.length !== frames.length) {
        throw new Error(`Incorrect frame count for shadowOffsets for ${name}`);
    }
    const shadow = shadowOffsets && shadowOffsets.map(([frame, offset]) => ({ frame, offset }));
    return { name, loop, fps, frames: frames.map(createBodyFrame), shadow };
}
exports.createBodyAnimation = createBodyAnimation;
exports.stand = createBodyAnimation('stand', 24, true, [
    [1, 1, 0, 0, 1, 1, 1, 1],
]);
exports.swim = createBodyAnimation('swim', 4, true, [
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 14],
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 13],
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 12],
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 13]
]);
exports.trotToSwim = createBodyAnimation('trot-to-swim', 24, false, [
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 2],
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 8],
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 10],
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 16]
]);
exports.swimToTrot = createBodyAnimation('swim-to-trot', 24, false, [
    [1, 1, 0, 0, 8, 10, 6, 5, 0, 12],
    [1, 1, 0, 0, 12, 3, 4, 23, 0, 8],
    [1, 1, 0, 0, 14, 26, 3, 24, 0, 4],
    [1, 1, 0, 0, 18, 27, 2, 5]
]);
exports.flyToSwim = createBodyAnimation('fly-to-swim', 16, false, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -12],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -8],
    [1, 1, 6, 0, 8, 10, 6, 5, 0, -2],
    [1, 1, 7, 0, 8, 10, 6, 5, 0, 4],
    [1, 1, 11, 0, 8, 10, 6, 5, 0, 10],
    [1, 1, 1, 0, 8, 10, 6, 5, 0, 14]
]);
exports.flyToSwimBug = createBodyAnimation('fly-to-swim-bug', 16, false, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -12],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -8],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -2],
    [1, 1, 3, 0, 8, 10, 6, 5, 0, 4],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, 10],
    [1, 1, 1, 0, 8, 10, 6, 5, 0, 14]
]);
exports.swimToFly = createBodyAnimation('swim-to-fly', 16, false, [
    [1, 1, 11, 0, 8, 10, 6, 5, 0, 13],
    [1, 1, 12, 0, 8, 10, 6, 5, 0, 14, 0, 0, 0, -1, 0, -1, 0, -1, 0, -1],
    [2, 1, 3, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [2, 1, 4, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [2, 1, 5, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [1, 1, 6, 0, 8, 10, 6, 1, 0, 13],
    [1, 1, 7, 0, 6, 7, 5, 5, 0, -7, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 8, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 9, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 10, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 11, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 12, 0, 8, 10, 6, 5, 0, -17]
]);
exports.swimToFlyBug = createBodyAnimation('swim-to-fly-bug', 16, false, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, 13],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, 14, 0, 0, 0, -1, 0, -1, 0, -1, 0, -1],
    [2, 1, 5, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [2, 1, 4, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [2, 1, 5, 0, 8, 10, 6, 5, 0, 15, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [1, 1, 4, 0, 8, 10, 6, 1, 0, 13],
    [1, 1, 5, 0, 6, 7, 5, 5, 0, -7, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -17]
]);
//const trotSkew = [-1, 0, 1, 0, -1, -2, -3, -2, -1, 0, 1, 0, -1, -2, -3, -2].map(x => (x + 2) * 0.25);
exports.trot = createBodyAnimation('trot', 24, true, [
    [1, 1, 0, 0, 2, 10, 2, 10, 0, 1, 0, -1],
    [1, 1, 0, 0, 3, 11, 3, 11],
    [1, 1, 0, 0, 4, 12, 4, 12, 0, -1],
    [1, 1, 0, 0, 5, 13, 5, 13, 0, -2],
    [1, 1, 0, 0, 6, 14, 6, 14, 0, -2],
    [1, 1, 0, 0, 7, 15, 7, 15, 0, -2],
    [1, 1, 0, 0, 8, 16, 8, 16, 0, -1],
    [1, 1, 0, 0, 9, 17, 9, 17],
    [1, 1, 0, 0, 10, 2, 10, 2, 0, 1, 0, -1],
    [1, 1, 0, 0, 11, 3, 11, 3],
    [1, 1, 0, 0, 12, 4, 12, 4, 0, -1],
    [1, 1, 0, 0, 13, 5, 13, 5, 0, -2],
    [1, 1, 0, 0, 14, 6, 14, 6, 0, -2],
    [1, 1, 0, 0, 15, 7, 15, 7, 0, -2],
    [1, 1, 0, 0, 16, 8, 16, 8, 0, -1],
    [1, 1, 0, 0, 17, 9, 17, 9],
]);
exports.boop = createBodyAnimation('boop', 24, false, [
    [1, 1, 0, 0, 1, 1, 1, 1],
    [1, 1, 0, 0, 18, 1, 1, 1],
    [1, 1, 0, 0, 19, 1, 1, 1],
    [1, 1, 0, 0, 20, 1, 1, 1],
    [1, 1, 0, 0, 21, 1, 1, 1],
    [1, 1, 0, 0, 22, 28, 18, 18, -1],
    [1, 1, 0, 0, 23, 26, 19, 19, -2, -1],
    ...utils_1.repeat(5, [1, 1, 0, 0, 23, 27, 20, 20, -3, -1]),
    [1, 1, 0, 0, 23, 26, 19, 19, -2, -1],
    [1, 1, 0, 0, 22, 1, 1, 1],
    [1, 1, 0, 0, 24, 1, 1, 1],
    [1, 1, 0, 0, 25, 1, 1, 1],
    [1, 1, 0, 0, 18, 1, 1, 1],
    [1, 1, 0, 0, 1, 1, 1, 1],
]);
exports.boopSit = createBodyAnimation('boop-sit', 24, false, [
    [9, 1, 2, 2, 34, 34, 26, 26],
    [9, 1, 2, 2, 13, 34, 26, 26, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 19, 34, 26, 26, 0, 0, 0, 0, 0, -3, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 20, 34, 26, 26, 0, 0, 0, 0, 0, -3, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 21, 34, 26, 26, 0, 0, 0, 0, 0, -3, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 22, 34, 26, 26, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 23, 34, 26, 26, 0, -1, 0, 0, -1, -1, 0, 1, 0, 1, 0, -1],
    ...utils_1.repeat(5, [9, 1, 2, 2, 23, 34, 26, 26, -1, -2, 0, 0, -2, -2, 1, 2, 1, 2, 1]),
    [9, 1, 2, 2, 23, 34, 26, 26, 0, -1, 0, 0, -1, -1, 0, 1, 0, 1, 0, -1],
    [9, 1, 2, 2, 22, 34, 26, 26, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 24, 34, 26, 26, 0, 0, 0, 0, 0, -3, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 25, 34, 26, 26, 0, 0, 0, 0, 0, -3, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 12, 34, 26, 26, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, -2],
    [9, 1, 2, 2, 34, 34, 26, 26],
], utils_1.repeat(18, [0, 6]));
exports.boopLie = createBodyAnimation('boop-lie', 24, false, [
    [15, 1, 0, 2, 38, 38, 26, 26],
    ...utils_1.repeat(2, [15, 1, 0, 2, 24, 38, 26, 26, 0, 0, 0, 0, 0, 1]),
    [15, 1, 0, 2, 21, 38, 26, 26, 0, 0, 0, 0, 0, 1],
    [15, 1, 0, 2, 22, 38, 26, 26, 0, 0, 0, 0, 0, 1],
    [15, 1, 0, 2, 23, 38, 26, 26, 0, 0, -1, -1, 0, 1],
    [12, 1, 0, 2, 23, 37, 26, 26, -1, 0, 0, 0, -1, 1, 0, 0, 1, 0, 1],
    ...utils_1.repeat(4, [12, 1, 0, 2, 23, 37, 26, 26, -1, 0, 0, 0, -2, 1, 0, 0, 1, 0, 1]),
    [15, 1, 0, 2, 23, 38, 26, 26, 0, 0, 0, 0, 0, 1],
    [15, 1, 0, 2, 22, 38, 26, 26, 0, 0, 0, 0, 0, 1],
    [15, 1, 0, 2, 21, 38, 26, 26, 0, 0, 0, 0, 0, 1],
], utils_1.repeat(14, [3, 3]));
exports.boopSwim = createBodyAnimation('boop-swim', 24, false, [
    [1, 1, 0, 0, 1, 10, 6, 5, 0, 13],
    [1, 1, 0, 0, 18, 10, 6, 5, 0, 13],
    [1, 1, 0, 0, 19, 10, 6, 5, 0, 13],
    [1, 1, 0, 0, 20, 10, 6, 5, 0, 13],
    [1, 1, 0, 0, 21, 10, 6, 5, 0, 12],
    [1, 1, 0, 0, 22, 9, 6, 5, -1, 12],
    [1, 1, 0, 0, 23, 8, 6, 5, -2, 11],
    ...utils_1.repeat(5, [1, 1, 0, 0, 23, 8, 6, 5, -3, 11]),
    [1, 1, 0, 0, 23, 9, 6, 5, -2, 11],
    [1, 1, 0, 0, 22, 10, 6, 5, 0, 13],
    [1, 1, 0, 0, 24, 10, 6, 5, 0, 13],
    [1, 1, 0, 0, 25, 10, 6, 5, 0, 14],
    [1, 1, 0, 0, 18, 10, 6, 5, 0, 14],
    [1, 1, 0, 0, 1, 10, 6, 5, 0, 14]
]);
exports.sit = createBodyAnimation('sit', 24, true, [
    [9, 1, 2, 2, 34, 34, 26, 26],
], [[0, 6]]);
const sitShadow = [0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 6].map(offset => [0, offset]);
exports.sitDown = createBodyAnimation('sit-down', 24, false, [
    [1, 1, 0, 0, 1, 1, 1, 1],
    ...utils_1.repeat(2, [2, 1, 0, 0, 29, 29, 1, 1]),
    ...utils_1.repeat(2, [3, 1, 0, 0, 30, 30, 21, 21]),
    [4, 1, 0, 0, 31, 31, 22, 22],
    [5, 1, 0, 1, 32, 32, 23, 23],
    [6, 1, 1, 2, 33, 33, 24, 24],
    [7, 1, 2, 2, 34, 34, 25, 25],
    [8, 1, 2, 2, 34, 34, 25, 25],
    [9, 1, 2, 2, 34, 34, 26, 26],
], sitShadow);
exports.standUp = createBodyAnimation('stand-up', 24, false, [
    [9, 1, 2, 2, 34, 34, 26, 26],
    [8, 1, 2, 2, 34, 34, 25, 25],
    [7, 1, 2, 2, 34, 34, 25, 25],
    [6, 1, 1, 2, 33, 33, 24, 24],
    [5, 1, 0, 1, 32, 32, 23, 23],
    [4, 1, 0, 0, 31, 31, 22, 22],
    ...utils_1.repeat(2, [3, 1, 0, 0, 30, 30, 21, 21]),
    [1, 1, 0, 0, 1, 1, 1, 1],
], sitShadow.slice(2).reverse());
exports.sitToTrot = createBodyAnimation('sit-to-trot', 24, false, [
    [7, 1, 2, 2, 34, 35, 24, 25, 0, -1, 0, 0, 0, 2, 1, 1, 0, -1],
    [6, 1, 1, 2, 27, 36, 23, 24, 0, -2, 0, 0, 0, -2, 0, 0, 0, 1],
    [5, 1, 0, 1, 5, 13, 5, 23, 0, -2],
    [4, 1, 0, 0, 6, 14, 6, 5, 0, -2],
    [3, 1, 0, 0, 7, 15, 7, 15, 0, -2],
    [2, 1, 0, 0, 8, 16, 8, 16, 0, -1],
], [[0, 6], [0, 5], [0, 4], [0, 3], [0, 1], [0, 0]]);
exports.lie = createBodyAnimation('lie', 24, true, [
    [15, 1, 0, 2, 38, 38, 26, 26],
], [[3, 3]]);
const lieShadow = [[0, 6], [0, 6], [1, 5], [2, 4], [3, 3], [3, 3], [3, 3]];
exports.lieDown = createBodyAnimation('lie-down', 24, false, [
    [9, 1, 2, 2, 34, 34, 26, 26],
    [10, 1, 2, 2, 35, 34, 26, 26, 0, 0, 0, 0, 0, 0, 0, -1],
    [11, 1, 1, 2, 36, 36, 26, 26, 0, 0, 0, 0, 0, 0, 1],
    [12, 1, 1, 2, 37, 37, 26, 26, 0, 0, 0, 0, 0, 0, 1],
    [13, 1, 0, 2, 38, 38, 26, 26, 0, 0, 0, 0, 0, 0, 1],
    ...utils_1.repeat(2, [14, 1, 0, 2, 38, 38, 26, 26]),
], lieShadow);
exports.sitUp = createBodyAnimation('sit-up', 24, false, [
    ...utils_1.repeat(2, [14, 1, 0, 2, 38, 38, 26, 26]),
    [13, 1, 0, 2, 38, 38, 26, 26],
    [12, 1, 1, 2, 37, 37, 26, 26],
    [11, 1, 1, 2, 36, 36, 26, 26],
    [10, 1, 2, 2, 35, 34, 26, 26, 0, 0, 0, 0, 0, 0, 0, -1],
    [9, 1, 2, 2, 34, 34, 26, 26],
], lieShadow.slice().reverse());
exports.lieToTrot = createBodyAnimation('lie-to-trot', 24, false, [
    [1, 1, 0, 1, 36, 37, 24, 25, 4, 8, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 30, 12, 23, 24, 2, 5, 0, 0, 0, -3],
    [1, 1, 0, 0, 5, 13, 5, 23, 1, 1],
    [1, 1, 0, 0, 6, 14, 6, 21, 0, 0, 0, -1],
    [1, 1, 0, 0, 7, 15, 7, 15, 0, -1, 0, -1],
    [1, 1, 0, 0, 8, 16, 8, 16, 0, -2],
], [[2, 1], [1, 0], ...utils_1.repeat(4, [0, 0])]);
exports.fly = createBodyAnimation('fly', 16, true, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -16],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 6, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 7, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 8, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 9, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 10, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 11, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 12, 0, 8, 10, 6, 5, 0, -17],
]);
exports.boopFly = createBodyAnimation('boop-fly', 16, false, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -16],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 5, 0, 20, 10, 6, 5, 0, -14],
    [1, 1, 6, 0, 21, 10, 6, 5, 0, -14],
    [1, 1, 7, 0, 22, 10, 6, 5, -1, -15],
    [1, 1, 8, 0, 23, 10, 5, 5, -1, -17, -1, 0, -1, -1, 2],
    [1, 1, 9, 0, 23, 10, 4, 5, -1, -18, -1, 0, -1, -1, 2],
    [1, 1, 10, 0, 23, 10, 4, 4, -1, -18, -1, 0, -1, -1, 2],
    [1, 1, 11, 0, 23, 10, 4, 3, -1, -18, -1, 0, -1, -1, 2],
    [1, 1, 12, 0, 22, 10, 4, 3, 0, -17, -1, 0, 0, 0, 2],
    [1, 1, 3, 0, 21, 10, 5, 4, 0, -16, 0, 0, 0, 0, 2],
    [1, 1, 4, 0, 14, 10, 6, 5, 0, -15, 0, 0, 0, 0, 2]
]);
exports.boopFlyBug = createBodyAnimation('boop-fly-bug', 20, false, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -16],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 5, 0, 20, 10, 6, 5, 0, -14],
    [1, 1, 4, 0, 21, 10, 6, 5, 0, -14],
    [1, 1, 3, 0, 22, 10, 6, 5, -1, -15],
    [1, 1, 4, 0, 23, 10, 5, 5, -1, -17, -1, 0, -1, -1, 2],
    [1, 1, 5, 0, 23, 10, 4, 5, -1, -18, -1, 0, -1, -1, 2],
    [1, 1, 4, 0, 23, 10, 4, 4, -1, -18, -1, 0, -1, -1, 2],
    [1, 1, 3, 0, 23, 10, 4, 3, -1, -18, -1, 0, -1, -1, 2],
    [1, 1, 4, 0, 22, 10, 4, 3, 0, -17, -1, 0, 0, 0, 2],
    [1, 1, 5, 0, 21, 10, 5, 4, 0, -16, 0, 0, 0, 0, 2],
    [1, 1, 4, 0, 14, 10, 6, 5, 0, -15, 0, 0, 0, 0, 2]
]);
exports.flyUp = createBodyAnimation('fly-up', 16, false, [
    [1, 1, 11, 0, 1, 1, 1, 1],
    [1, 1, 12, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, -1, 0, -1, 0, -1, 0, -1],
    [2, 1, 3, 0, 29, 29, 21, 21, 0, 2, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [2, 1, 4, 0, 29, 29, 21, 21, 0, 2, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [2, 1, 5, 0, 29, 29, 21, 21, 0, 2, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [1, 1, 6, 0, 1, 1, 1, 1],
    [1, 1, 7, 0, 6, 7, 5, 5, 0, -10, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 8, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 9, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 10, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 11, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 12, 0, 8, 10, 6, 5, 0, -17],
]);
exports.trotToFly = createBodyAnimation('trot-to-fly', 20, false, [
    [1, 1, 11, 0, 6, 14, 6, 14, 0, -2],
    [1, 1, 12, 0, 7, 15, 7, 15, 0, -2],
    [1, 1, 3, 0, 8, 16, 8, 16, 0, -1],
    [1, 1, 4, 0, 9, 17, 9, 17, 0, 1, 0, 1, 0, 0, 0, -1, 0, -1],
    [1, 1, 5, 0, 10, 2, 10, 2, 0, 3, 0, 1, 0, 0, 0, -2, 0, -2],
    [1, 1, 6, 0, 11, 3, 11, 3],
    [1, 1, 7, 0, 11, 4, 11, 4, 0, -10],
    [1, 1, 8, 0, 10, 5, 9, 5, 0, -15],
    [1, 1, 9, 0, 9, 10, 6, 6, 0, -17],
    [1, 1, 10, 0, 8, 10, 6, 7, 0, -18],
    [1, 1, 11, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 12, 0, 8, 10, 6, 5, 0, -17]
]);
exports.trotToFlyBug = createBodyAnimation('trot-to-fly-bug', 20, false, [
    [1, 1, 3, 0, 6, 14, 6, 14, 0, -2],
    [1, 1, 4, 0, 7, 15, 7, 15, 0, -2],
    [1, 1, 5, 0, 8, 16, 8, 16, 0, -1],
    [1, 1, 3, 0, 9, 17, 9, 17, 0, 1, 0, 1, 0, 0, 0, -1, 0, -1],
    [1, 1, 4, 0, 10, 2, 10, 2, 0, 3, 0, 1, 0, 0, 0, -2, 0, -2],
    [1, 1, 5, 0, 11, 3, 11, 3],
    [1, 1, 3, 0, 11, 4, 11, 4, 0, -10],
    [1, 1, 4, 0, 10, 5, 9, 5, 0, -15],
    [1, 1, 5, 0, 8, 10, 6, 6, 0, -17],
    [1, 1, 3, 0, 8, 10, 6, 7, 0, -18],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -17]
]);
exports.flyToTrot = createBodyAnimation('fly-to-trot', 20, false, [
    [1, 1, 3, 0, 8, 10, 6, 10, 0, -16],
    [1, 1, 4, 0, 8, 11, 5, 11, 0, -15],
    [1, 1, 5, 0, 8, 12, 4, 12, 0, -12],
    [1, 1, 6, 0, 7, 13, 5, 13, 0, -8],
    [1, 1, 6, 0, 7, 14, 6, 14, 0, -6],
    [1, 1, 6, 0, 7, 15, 7, 15, 0, -4],
    [1, 1, 7, 0, 8, 16, 8, 16, 0, -1],
    [1, 1, 11, 0, 9, 17, 9, 17],
    [1, 1, 0, 0, 10, 2, 10, 2, 0, 3, 0, -1, 0, 0, 0, -2, 0, -2]
    // [1, 1, 4, 0, 8, 10, 6, 10, 0, -16],
    // [1, 1, 5, 0, 8, 10, 6, 10, 0, -18],
    // [1, 1, 7, 0, 8, 11, 5, 11, 0, -20],
    // [1, 1, 8, 0, 10, 12, 4, 12, 0, -21],
    // [1, 1, 9, 0, 11, 13, 4, 13, 0, -20],
    // [1, 1, 10, 0, 12, 14, 5, 14, 0, -18],
    // [1, 1, 11, 0, 13, 15, 7, 15, 0, -14, 0, -1],
    // [1, 1, 4, 0, 14, 16, 8, 16, 0, 0, 0, -1],
    // [1, 1, 5, 0, 2, 17, 9, 17, 0, 2, 0, 0, 0, -1, 0, -2, 0, -2, 0, -2],
    // [1, 1, 6, 0, 3, 2, 10, 2, 0, 1, 0, 0, 0, -1, 0, 0, 0, 0, 0, 2]
]);
exports.flyToTrotBug = createBodyAnimation('fly-to-trot-bug', 20, false, [
    [1, 1, 3, 0, 8, 10, 6, 10, 0, -16],
    [1, 1, 4, 0, 8, 11, 5, 11, 0, -15],
    [1, 1, 5, 0, 8, 12, 4, 12, 0, -12],
    [1, 1, 4, 0, 7, 13, 5, 13, 0, -8],
    [1, 1, 3, 0, 7, 14, 6, 14, 0, -6],
    [1, 1, 4, 0, 7, 15, 7, 15, 0, -4],
    [1, 1, 5, 0, 8, 16, 8, 16, 0, -1],
    [1, 1, 4, 0, 9, 17, 9, 17],
    [1, 1, 3, 0, 10, 2, 10, 2, 0, 3, 0, -1, 0, 0, 0, -2, 0, -2]
    // [1, 1, 4, 0, 8, 10, 6, 10, 0, -16],
    // [1, 1, 5, 0, 8, 10, 6, 10, 0, -18],
    // [1, 1, 4, 0, 8, 11, 5, 11, 0, -20],
    // [1, 1, 3, 0, 10, 12, 4, 12, 0, -21],
    // [1, 1, 4, 0, 11, 13, 4, 13, 0, -20],
    // [1, 1, 5, 0, 12, 14, 5, 14, 0, -18],
    // [1, 1, 4, 0, 13, 15, 7, 15, 0, -14, 0, -1],
    // [1, 1, 3, 0, 14, 16, 8, 16, 0, 0, 0, -1],
    // [1, 1, 4, 0, 2, 17, 9, 17, 0, 2, 0, 0, 0, -1, 0, -2, 0, -2, 0, -2],
    // [1, 1, 5, 0, 3, 2, 10, 2, 0, 1, 0, 0, 0, -1, 0, 0, 0, 0, 0, 2]
]);
exports.flyDown = createBodyAnimation('fly-down', 16, false, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -12],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -10],
    [1, 1, 6, 0, 8, 10, 6, 5, 0, -8],
    [1, 1, 7, 0, 8, 10, 6, 5, 0, -6],
    [1, 1, 11, 0, 8, 10, 6, 5, 0, -4],
    [1, 1, 1, 0, 8, 10, 6, 5, 0, -2]
]);
exports.flyBug = createBodyAnimation('fly-bug', 24, true, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -16],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -16],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -16],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -17]
]);
exports.flyUpBug = createBodyAnimation('fly-up-bug', 16, false, [
    [1, 1, 3, 0, 1, 1, 1, 1],
    [1, 1, 4, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, -1, 0, -1, 0, -1, 0, -1],
    [2, 1, 5, 0, 29, 29, 21, 21, 0, 2, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [2, 1, 4, 0, 29, 29, 21, 21, 0, 2, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [2, 1, 5, 0, 29, 29, 21, 21, 0, 2, 0, 2, 0, -2, 0, -2, 2, -2, 2, -2],
    [1, 1, 4, 0, 1, 1, 1, 1],
    [1, 1, 5, 0, 6, 7, 5, 5, 0, -10, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -15],
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -17],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -18],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -17]
]);
exports.flyDownBug = createBodyAnimation('fly-down-bug', 16, false, [
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -14],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -12],
    [1, 1, 5, 0, 8, 10, 6, 5, 0, -10],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -8],
    [1, 1, 3, 0, 8, 10, 6, 5, 0, -6],
    [1, 1, 4, 0, 8, 10, 6, 5, 0, -4],
    [1, 1, 1, 0, 8, 10, 6, 5, 0, -2]
]);
exports.swing = createBodyAnimation('swing', 12, false, [
    ...utils_1.repeat(1, [1, 1, 0, 0, 1, 1, 1, 1]),
    ...utils_1.repeat(3, [2, 1, 0, 0, 12, 17, 11, 11, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1]),
]);
exports.flyAnims = [undefined, exports.fly, exports.fly, exports.fly, exports.flyBug];
exports.flyUpAnims = [undefined, exports.flyUp, exports.flyUp, exports.flyUp, exports.flyUpBug];
exports.flyDownAnims = [undefined, exports.flyDown, exports.flyDown, exports.flyDown, exports.flyDownBug];
exports.animations = [
    exports.stand, exports.trot, exports.boop, exports.boopSit, exports.boopLie, exports.boopSwim, exports.boopFly, exports.boopFlyBug, exports.sit, exports.sitDown, exports.standUp, exports.lie, exports.lieDown, exports.sitUp,
    exports.fly, exports.flyBug, exports.flyUp, exports.flyUpBug, exports.flyDown, exports.flyDownBug, exports.sitToTrot, exports.lieToTrot, exports.flyToTrot, exports.flyToTrotBug,
    exports.swim, exports.trotToSwim, exports.swimToTrot, exports.flyToSwim, exports.swimToFly,
];
exports.sitDownUp = mergeAnimations('sit', 24, false, [...utils_1.repeat(12, exports.stand), exports.sitDown, ...utils_1.repeat(12, exports.sit), exports.standUp]);
exports.lieDownUp = mergeAnimations('lie', 24, false, [...utils_1.repeat(12, exports.sit), exports.lieDown, ...utils_1.repeat(12, exports.lie), exports.sitUp]);
function mergeAnimations(name, fps, loop, animations) {
    return {
        name,
        fps,
        loop,
        frames: utils_1.flatten(animations.map(a => a.frames)),
        shadow: utils_1.flatten(animations.map(a => a.shadow || a.frames.map(() => ({ frame: 0, offset: 0 })))),
    };
}
exports.mergeAnimations = mergeAnimations;
// head animations
function createHeadFrame([headX = 0, headY = 0, left = 0, right = 0, mouth = 0]) {
    return { headX, headY, left, right, mouth };
}
exports.createHeadFrame = createHeadFrame;
function createHeadAnimation(name, fps, loop, frames) {
    return { name, fps, loop, frames: frames.map(createHeadFrame) };
}
exports.createHeadAnimation = createHeadAnimation;
exports.smile = createHeadAnimation('smile', 24, true, [
    [0, 0, 1, 1, 0],
]);
exports.nom = createHeadAnimation('nom', 12, true, [
    [0, 0, 1, 1, 0],
    [0, 0, 1, 1, 25],
]);
exports.laugh = createHeadAnimation('laugh', 8, false, [
    ...utils_1.repeat(4, [0, 0, 14, 14, 5], [0, 1, 14, 14, 5]),
]);
exports.yawn = createHeadAnimation('yawn', 12, false, [
    [0, 0, 3, 3, 8],
    ...utils_1.repeat(18, [1, -1, 12, 12, 16]),
    ...utils_1.repeat(8, [0, 0, 12, 12, 12]),
    [0, 0, 18, 18, 2],
]);
exports.surprise = createHeadAnimation('surprise', 8, false, [
    [0, 1, 6, 6, 1],
    ...utils_1.repeat(10, [0, 0, 1, 1, 12]),
]);
exports.excite = createHeadAnimation('excite', 8, false, [
    [0, 1, 6, 6, 0],
    ...utils_1.repeat(10, [0, 0, 1, 1, 5]),
]);
exports.surpriseSad = createHeadAnimation('surpriseSad', 8, false, [
    [0, 1, 15, 15, 8],
    ...utils_1.repeat(8, [0, 0, 15, 15, 8]),
]);
exports.sneeze = createHeadAnimation('sneeze', 12, false, [
    [0, 0, 18, 18, 8],
    ...utils_1.repeat(2, [1, -1, 18, 18, 16]),
    ...utils_1.repeat(8, [-1, 1, 23, 23, 13]),
    ...utils_1.repeat(4, [0, 0, 18, 18, 7]),
]);
exports.headAnimations = [
    exports.smile, exports.nom, exports.laugh, exports.yawn, exports.surprise, exports.surpriseSad, exports.sneeze, exports.excite,
];
// default animations
exports.defaultBodyAnimation = createBodyAnimation('default', 24, true, [[1, 1, 0, 0, 1, 1, 1, 1]]);
exports.defaultHeadAnimation = createHeadAnimation('default', 24, true, [[0, 0, -1, -1, -1]]);
exports.defaultBodyFrame = exports.defaultBodyAnimation.frames[0];
exports.defaultHeadFrame = exports.defaultHeadAnimation.frames[0];
//# sourceMappingURL=ponyAnimations.js.map