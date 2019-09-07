"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const movementUtils_1 = require("../../common/movementUtils");
const constants_1 = require("../../common/constants");
const rect_1 = require("../../common/rect");
const positionUtils_1 = require("../../common/positionUtils");
describe('movementUtils', () => {
    describe('flagsToSpeed()', () => {
        it('returns trotting speed for trotting state', () => {
            chai_1.expect(movementUtils_1.flagsToSpeed(32 /* PonyTrotting */)).equal(constants_1.PONY_SPEED_TROT);
        });
        it('returns trotting speed for mixed trotting state', () => {
            chai_1.expect(movementUtils_1.flagsToSpeed(32 /* PonyTrotting */ | 2 /* FacingRight */)).equal(constants_1.PONY_SPEED_TROT);
        });
        it('returns walk speed for trotting state', () => {
            chai_1.expect(movementUtils_1.flagsToSpeed(16 /* PonyWalking */)).equal(constants_1.PONY_SPEED_WALK);
        });
        it('returns 0 for standing state', () => {
            chai_1.expect(movementUtils_1.flagsToSpeed(0 /* PonyStanding */)).equal(0);
        });
    });
    describe('dirToVector()', () => {
        it('returns vector for given direction', () => {
            chai_1.expect(movementUtils_1.dirToVector(0)).eql({ x: 0, y: -1 });
        });
    });
    describe('vectorToDir()', () => {
        it('returns direction for given vector', () => {
            chai_1.expect(movementUtils_1.vectorToDir(0, -1)).eql(0);
        });
        it('returns direction for given vector', () => {
            chai_1.expect(movementUtils_1.vectorToDir(-1, -1)).eql(14);
        });
    });
    describe('encodeMovement() + decodeMovement()', () => {
        const tests = [
            [0.015625, 0.020833333333333332, 0, 0 /* None */],
            [10.015625, 20.020833333333332, 1, 32 /* PonyTrotting */],
            [5.515625, 2.2708333333333335, 1, 32 /* PonyTrotting */],
            [99999.015625, 88888.02083333333, 1, 32 /* PonyTrotting */],
        ];
        tests.forEach(movement => {
            it(JSON.stringify(movement), () => {
                const [x, y, dir, flags] = movement;
                const camera = rect_1.rect(positionUtils_1.roundPositionX(x) * constants_1.tileWidth, positionUtils_1.roundPositionY(y) * constants_1.tileHeight, 100, 100);
                const [a, b, c, d, e] = movementUtils_1.encodeMovement(x, y, dir, flags, 123, camera);
                chai_1.expect(movementUtils_1.decodeMovement(a, b, c, d, e)).eql({ x, y, dir, flags, time: 123, camera });
            });
        });
        it('decodes camera rect', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(100, 100, 1, 0 /* None */, 123, rect_1.rect(300, 200, 800, 600));
            chai_1.expect(movementUtils_1.decodeMovement(a, b, c, d, e)).eql({
                x: 100.015625, y: 100.02083333333333, dir: 1, flags: 0 /* None */, time: 123,
                camera: rect_1.rect(300, 200, 800, 600)
            });
        });
        it('clamps negative values', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(-10, -10, 1, 0 /* None */, 123, rect_1.rect(0, 0, 100, 100));
            chai_1.expect(movementUtils_1.decodeMovement(a, b, c, d, e)).eql({
                x: 0.015625, y: 0.020833333333333332, dir: 1, flags: 0 /* None */, time: 123,
                camera: rect_1.rect(0, 0, 100, 100)
            });
        });
        it('clamps values above 100000', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(100001, 100001, 1, 0 /* None */, 123, rect_1.rect(100000 * 32, 100000 * 24, 100, 100));
            chai_1.expect(movementUtils_1.decodeMovement(a, b, c, d, e)).eql({
                x: 100000.015625, y: 100000.020833333333334, dir: 1, flags: 0 /* None */, time: 123,
                camera: rect_1.rect(100000 * 32, 100000 * 24, 100, 100)
            });
        });
        it('handles invalid direction', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10, 10, 999, 0 /* None */, 123, rect_1.rect(0, 0, 100, 100));
            chai_1.expect(movementUtils_1.decodeMovement(a, b, c, d, e)).eql({
                x: 10.015625, y: 10.020833333333334, dir: 231, flags: 0 /* None */, time: 123,
                camera: rect_1.rect(0, 0, 100, 100)
            });
        });
        it('handles invalid flags', () => {
            const [a, b, c, d, e] = movementUtils_1.encodeMovement(10, 10, 1, 999, 123, rect_1.rect(0, 0, 100, 100));
            chai_1.expect(movementUtils_1.decodeMovement(a, b, c, d, e)).eql({
                x: 10.015625, y: 10.020833333333334, dir: 1, flags: 231, time: 123,
                camera: rect_1.rect(0, 0, 100, 100)
            });
        });
    });
    describe('isMovingRight()', () => {
        it('returns false for negative velocity', () => {
            chai_1.expect(movementUtils_1.isMovingRight(-1, true)).false;
        });
        it('returns true for positive velocity', () => {
            chai_1.expect(movementUtils_1.isMovingRight(1, false)).true;
        });
        it('returns previous facing for 0 velocity', () => {
            chai_1.expect(movementUtils_1.isMovingRight(0, true)).true;
        });
    });
    describe('shouldBeFacingRight()', () => {
        it('returns false for negative velocity', () => {
            chai_1.expect(movementUtils_1.shouldBeFacingRight({ vx: -1, state: 0 })).false;
        });
        it('returns true for positive velocity', () => {
            chai_1.expect(movementUtils_1.shouldBeFacingRight({ vx: 1, state: 0 })).true;
        });
        it('returns true for zero velocity if already facing right', () => {
            chai_1.expect(movementUtils_1.shouldBeFacingRight({ vx: 0, state: 2 /* FacingRight */ })).true;
        });
    });
});
//# sourceMappingURL=movementUtils.spec.js.map