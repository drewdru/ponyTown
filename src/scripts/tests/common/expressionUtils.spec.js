"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const expressionUtils_1 = require("../../common/expressionUtils");
const expressions_1 = require("../../common/expressions");
const expressionEncoder_1 = require("../../common/encoders/expressionEncoder");
const ponyUtils_1 = require("../../client/ponyUtils");
function toExpression([right, left, muzzle, rightIris = 0, leftIris = 0, extra = 0]) {
    return { left, right, muzzle, rightIris, leftIris, extra };
}
describe('expressionUtils', () => {
    describe('parseExpression()', () => {
        expressions_1.expressions.forEach(([input, expected]) => {
            it(JSON.stringify(input), () => {
                if (expected) {
                    chai_1.expect(expressionUtils_1.parseExpression(input)).eql(toExpression(expected));
                }
                else {
                    chai_1.expect(expressionUtils_1.parseExpression(input)).undefined;
                }
            });
        });
        it('should return the same expression each time', () => {
            const expected = {
                right: 13 /* ClosedHappy2 */,
                left: 13 /* ClosedHappy2 */,
                muzzle: 0 /* Smile */,
                rightIris: 0 /* Forward */,
                leftIris: 0 /* Forward */,
                extra: 0 /* None */,
            };
            const expr = expressionUtils_1.parseExpression('^^');
            chai_1.expect(expr).eql(expected, '1st');
            expr.extra = 999;
            chai_1.expect(expressionUtils_1.parseExpression('^^')).eql(expected, '2nd');
        });
        it('should return nothing for "constructor" expression', () => {
            chai_1.expect(expressionUtils_1.parseExpression('constructor')).undefined;
        });
    });
    describe('encodeExpression() + decodeExpression()', () => {
        function test(expression) {
            return expressionEncoder_1.decodeExpression(expressionEncoder_1.encodeExpression(expression));
        }
        it('works for null and undefined', () => {
            chai_1.expect(test(null)).undefined;
            chai_1.expect(test(undefined)).undefined;
        });
        expressions_1.expressions.filter(([, x]) => !!x).forEach(([input, expected]) => {
            it(JSON.stringify(input), () => {
                const expression = toExpression(expected);
                chai_1.expect(test(expression)).eql(expression);
            });
        });
    });
    describe('flipIris()', () => {
        it('returns the same iris for non flippable irises', () => {
            chai_1.expect(ponyUtils_1.flipIris(0 /* Forward */)).equal(0 /* Forward */);
            chai_1.expect(ponyUtils_1.flipIris(1 /* Up */)).equal(1 /* Up */);
            chai_1.expect(ponyUtils_1.flipIris(6 /* Shocked */)).equal(6 /* Shocked */);
        });
        it('returns flipped iris', () => {
            chai_1.expect(ponyUtils_1.flipIris(2 /* Left */)).equal(3 /* Right */);
            chai_1.expect(ponyUtils_1.flipIris(3 /* Right */)).equal(2 /* Left */);
            chai_1.expect(ponyUtils_1.flipIris(4 /* UpLeft */)).equal(5 /* UpRight */);
            chai_1.expect(ponyUtils_1.flipIris(5 /* UpRight */)).equal(4 /* UpLeft */);
        });
    });
    describe('expression()', () => {
        it('creates expression with all parameters', () => {
            chai_1.expect(expressionUtils_1.expression(19 /* Angry */, 14 /* ClosedHappy */, 0 /* Smile */, 2 /* Left */, 3 /* Right */, 1 /* Blush */)).eql({
                right: 19 /* Angry */,
                left: 14 /* ClosedHappy */,
                muzzle: 0 /* Smile */,
                rightIris: 2 /* Left */,
                leftIris: 3 /* Right */,
                extra: 1 /* Blush */,
            });
        });
        it('creates expression with defaults', () => {
            chai_1.expect(expressionUtils_1.expression(19 /* Angry */, 14 /* ClosedHappy */, 0 /* Smile */)).eql({
                right: 19 /* Angry */,
                left: 14 /* ClosedHappy */,
                muzzle: 0 /* Smile */,
                rightIris: 0 /* Forward */,
                leftIris: 0 /* Forward */,
                extra: 0 /* None */,
            });
        });
    });
});
//# sourceMappingURL=expressionUtils.spec.js.map