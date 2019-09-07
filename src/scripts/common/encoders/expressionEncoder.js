"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.EMPTY_EXPRESSION = 0x1fffffff;
function encodeExpression(expression) {
    if (!expression)
        return exports.EMPTY_EXPRESSION;
    const { extra, rightIris, leftIris, right, left, muzzle } = expression;
    // bits: 5 | 4 | 4 | 5 | 5 | 5 = 28/32
    return ((extra << 23) | (rightIris << 19) | (leftIris << 15) | (right << 10) | (left << 5) | muzzle) >>> 0;
}
exports.encodeExpression = encodeExpression;
function decodeExpression(value) {
    value = value >>> 0;
    if (value === exports.EMPTY_EXPRESSION)
        return undefined;
    const muzzle = value & 0x1f;
    const left = (value >> 5) & 0x1f;
    const right = (value >> 10) & 0x1f;
    const leftIris = (value >> 15) & 0xf;
    const rightIris = (value >> 19) & 0xf;
    const extra = (value >> 23) & 0x1f;
    return { muzzle, left, right, leftIris, rightIris, extra };
}
exports.decodeExpression = decodeExpression;
function isCancellableExpression(expression) {
    return utils_1.hasFlag(expression.extra, 2 /* Zzz */);
}
exports.isCancellableExpression = isCancellableExpression;
//# sourceMappingURL=expressionEncoder.js.map