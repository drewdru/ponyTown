"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
function toScreenX(x) {
    return Math.floor(x * constants_1.tileWidth) | 0;
}
exports.toScreenX = toScreenX;
function toScreenY(y) {
    return Math.floor(y * constants_1.tileHeight) | 0;
}
exports.toScreenY = toScreenY;
function toScreenYWithZ(y, z) {
    return Math.floor(y * constants_1.tileHeight - z * constants_1.tileElevation) | 0;
}
exports.toScreenYWithZ = toScreenYWithZ;
function toWorldX(x) {
    return x / constants_1.tileWidth;
}
exports.toWorldX = toWorldX;
function toWorldY(y) {
    return y / constants_1.tileHeight;
}
exports.toWorldY = toWorldY;
function toWorldZ(z) {
    return z / constants_1.tileElevation;
}
exports.toWorldZ = toWorldZ;
function pointToScreen({ x, y }) {
    return {
        x: toScreenX(x),
        y: toScreenY(y),
    };
}
exports.pointToScreen = pointToScreen;
function pointToWorld({ x, y }) {
    return {
        x: toWorldX(x),
        y: toWorldY(y),
    };
}
exports.pointToWorld = pointToWorld;
function rectToScreen({ x, y, w, h }) {
    return {
        x: toScreenX(x),
        y: toScreenY(y),
        w: toScreenX(w),
        h: toScreenY(h),
    };
}
exports.rectToScreen = rectToScreen;
function roundPositionX(x) {
    return Math.floor(x * constants_1.tileWidth) / constants_1.tileWidth;
}
exports.roundPositionX = roundPositionX;
function roundPositionY(y) {
    return Math.floor(y * constants_1.tileHeight) / constants_1.tileHeight;
}
exports.roundPositionY = roundPositionY;
function roundPositionXMidPixel(x) {
    return (Math.floor(x * constants_1.tileWidth) + 0.5) / constants_1.tileWidth;
}
exports.roundPositionXMidPixel = roundPositionXMidPixel;
function roundPositionYMidPixel(y) {
    return (Math.floor(y * constants_1.tileHeight) + 0.5) / constants_1.tileHeight;
}
exports.roundPositionYMidPixel = roundPositionYMidPixel;
function roundPosition(point) {
    point.x = roundPositionX(point.x);
    point.y = roundPositionY(point.y);
}
exports.roundPosition = roundPosition;
//# sourceMappingURL=positionUtils.js.map