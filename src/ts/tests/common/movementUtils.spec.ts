import '../lib';
import { expect } from 'chai';
import { EntityState } from '../../common/interfaces';
import {
	flagsToSpeed, dirToVector, vectorToDir, isMovingRight, encodeMovement, decodeMovement, shouldBeFacingRight
} from '../../common/movementUtils';
import { PONY_SPEED_TROT, PONY_SPEED_WALK, tileWidth, tileHeight } from '../../common/constants';
import { rect } from '../../common/rect';
import { roundPositionX, roundPositionY } from '../../common/positionUtils';

describe('movementUtils', () => {
	describe('flagsToSpeed()', () => {
		it('returns trotting speed for trotting state', () => {
			expect(flagsToSpeed(EntityState.PonyTrotting)).equal(PONY_SPEED_TROT);
		});

		it('returns trotting speed for mixed trotting state', () => {
			expect(flagsToSpeed(EntityState.PonyTrotting | EntityState.FacingRight)).equal(PONY_SPEED_TROT);
		});

		it('returns walk speed for trotting state', () => {
			expect(flagsToSpeed(EntityState.PonyWalking)).equal(PONY_SPEED_WALK);
		});

		it('returns 0 for standing state', () => {
			expect(flagsToSpeed(EntityState.PonyStanding)).equal(0);
		});
	});

	describe('dirToVector()', () => {
		it('returns vector for given direction', () => {
			expect(dirToVector(0)).eql({ x: 0, y: -1 });
		});
	});

	describe('vectorToDir()', () => {
		it('returns direction for given vector', () => {
			expect(vectorToDir(0, -1)).eql(0);
		});

		it('returns direction for given vector', () => {
			expect(vectorToDir(-1, -1)).eql(14);
		});
	});

	describe('encodeMovement() + decodeMovement()', () => {
		const tests: [number, number, number, EntityState][] = [
			[0.015625, 0.020833333333333332, 0, EntityState.None],
			[10.015625, 20.020833333333332, 1, EntityState.PonyTrotting],
			[5.515625, 2.2708333333333335, 1, EntityState.PonyTrotting],
			[99999.015625, 88888.02083333333, 1, EntityState.PonyTrotting],
		];

		tests.forEach(movement => {
			it(JSON.stringify(movement), () => {
				const [x, y, dir, flags] = movement;
				const camera = rect(roundPositionX(x) * tileWidth, roundPositionY(y) * tileHeight, 100, 100);
				const [a, b, c, d, e] = encodeMovement(x, y, dir, flags, 123, camera);
				expect(decodeMovement(a, b, c, d, e)).eql({ x, y, dir, flags, time: 123, camera });
			});
		});

		it('decodes camera rect', () => {
			const [a, b, c, d, e] = encodeMovement(100, 100, 1, EntityState.None, 123, rect(300, 200, 800, 600));

			expect(decodeMovement(a, b, c, d, e)).eql({
				x: 100.015625, y: 100.02083333333333, dir: 1, flags: EntityState.None, time: 123,
				camera: rect(300, 200, 800, 600)
			});
		});

		it('clamps negative values', () => {
			const [a, b, c, d, e] = encodeMovement(-10, -10, 1, EntityState.None, 123, rect(0, 0, 100, 100));

			expect(decodeMovement(a, b, c, d, e)).eql({
				x: 0.015625, y: 0.020833333333333332, dir: 1, flags: EntityState.None, time: 123,
				camera: rect(0, 0, 100, 100)
			});
		});

		it('clamps values above 100000', () => {
			const [a, b, c, d, e] = encodeMovement(100001, 100001, 1, EntityState.None, 123, rect(100000 * 32, 100000 * 24, 100, 100));

			expect(decodeMovement(a, b, c, d, e)).eql({
				x: 100000.015625, y: 100000.020833333333334, dir: 1, flags: EntityState.None, time: 123,
				camera: rect(100000 * 32, 100000 * 24, 100, 100)
			});
		});

		it('handles invalid direction', () => {
			const [a, b, c, d, e] = encodeMovement(10, 10, 999, EntityState.None, 123, rect(0, 0, 100, 100));

			expect(decodeMovement(a, b, c, d, e)).eql({
				x: 10.015625, y: 10.020833333333334, dir: 231, flags: EntityState.None, time: 123,
				camera: rect(0, 0, 100, 100)
			});
		});

		it('handles invalid flags', () => {
			const [a, b, c, d, e] = encodeMovement(10, 10, 1, 999, 123, rect(0, 0, 100, 100));

			expect(decodeMovement(a, b, c, d, e)).eql({
				x: 10.015625, y: 10.020833333333334, dir: 1, flags: 231, time: 123,
				camera: rect(0, 0, 100, 100)
			});
		});
	});

	describe('isMovingRight()', () => {
		it('returns false for negative velocity', () => {
			expect(isMovingRight(-1, true)).false;
		});

		it('returns true for positive velocity', () => {
			expect(isMovingRight(1, false)).true;
		});

		it('returns previous facing for 0 velocity', () => {
			expect(isMovingRight(0, true)).true;
		});
	});

	describe('shouldBeFacingRight()', () => {
		it('returns false for negative velocity', () => {
			expect(shouldBeFacingRight({ vx: -1, state: 0 } as any)).false;
		});

		it('returns true for positive velocity', () => {
			expect(shouldBeFacingRight({ vx: 1, state: 0 } as any)).true;
		});

		it('returns true for zero velocity if already facing right', () => {
			expect(shouldBeFacingRight({ vx: 0, state: EntityState.FacingRight } as any)).true;
		});
	});
});
