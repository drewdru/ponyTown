"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors_1 = require("../common/colors");
const ponyAnimations_1 = require("./ponyAnimations");
const defaultBlushColor = colors_1.blushColor(0);
function defaultPonyState() {
    return {
        animation: ponyAnimations_1.stand,
        animationFrame: 0,
        headAnimation: undefined,
        headAnimationFrame: 0,
        headTurned: false,
        headTilt: 0,
        headTurn: 0,
        blinkFrame: 0,
        blushColor: defaultBlushColor,
        holding: undefined,
        expression: undefined,
        drawFaceExtra: undefined,
        flags: 0 /* None */,
    };
}
exports.defaultPonyState = defaultPonyState;
function isStateEqual(a, b) {
    return a.animation === b.animation &&
        a.animationFrame === b.animationFrame &&
        a.headAnimation === b.headAnimation &&
        a.headAnimationFrame === b.headAnimationFrame &&
        a.headTurned === b.headTurned &&
        a.headTilt === b.headTilt &&
        a.headTurn === b.headTurn &&
        a.blinkFrame === b.blinkFrame &&
        a.blushColor === b.blushColor &&
        a.holding === b.holding &&
        a.expression === b.expression &&
        a.drawFaceExtra === b.drawFaceExtra &&
        a.flags === b.flags;
}
exports.isStateEqual = isStateEqual;
function defaultDrawPonyOptions() {
    return {
        flipped: false,
        selected: false,
        shadow: false,
        extra: false,
        toy: 0,
        swimming: false,
        bounce: false,
        shadowColor: colors_1.SHADOW_COLOR,
        noEars: false,
        no: 0 /* None */,
        useAllHooves: false,
        gameTime: 0,
    };
}
exports.defaultDrawPonyOptions = defaultDrawPonyOptions;
//# sourceMappingURL=ponyHelpers.js.map