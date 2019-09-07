import '../lib';
import { expect } from 'chai';
import { parseExpression, expression } from '../../common/expressionUtils';
import { expressions } from '../../common/expressions';
import { Expression, Iris, Eye, Muzzle, ExpressionExtra } from '../../common/interfaces';
import { decodeExpression, encodeExpression } from '../../common/encoders/expressionEncoder';
import { flipIris } from '../../client/ponyUtils';

function toExpression([right, left, muzzle, rightIris = 0, leftIris = 0, extra = 0]: any): Expression {
	return { left, right, muzzle, rightIris, leftIris, extra };
}

describe('expressionUtils', () => {
	describe('parseExpression()', () => {
		expressions.forEach(([input, expected]) => {
			it(JSON.stringify(input), () => {
				if (expected) {
					expect(parseExpression(input)).eql(toExpression(expected));
				} else {
					expect(parseExpression(input)).undefined;
				}
			});
		});

		it('should return the same expression each time', () => {
			const expected = {
				right: Eye.ClosedHappy2,
				left: Eye.ClosedHappy2,
				muzzle: Muzzle.Smile,
				rightIris: Iris.Forward,
				leftIris: Iris.Forward,
				extra: ExpressionExtra.None,
			};

			const expr = parseExpression('^^');
			expect(expr).eql(expected, '1st');
			expr!.extra = 999;

			expect(parseExpression('^^')).eql(expected, '2nd');
		});

		it('should return nothing for "constructor" expression', () => {
			expect(parseExpression('constructor')).undefined;
		});
	});

	describe('encodeExpression() + decodeExpression()', () => {
		function test(expression: Expression | undefined) {
			return decodeExpression(encodeExpression(expression));
		}

		it('works for null and undefined', () => {
			expect(test(null as any)).undefined;
			expect(test(undefined)).undefined;
		});

		expressions.filter(([, x]) => !!x).forEach(([input, expected]) => {
			it(JSON.stringify(input), () => {
				const expression = toExpression(expected);
				expect(test(expression)).eql(expression);
			});
		});
	});

	describe('flipIris()', () => {
		it('returns the same iris for non flippable irises', () => {
			expect(flipIris(Iris.Forward)).equal(Iris.Forward);
			expect(flipIris(Iris.Up)).equal(Iris.Up);
			expect(flipIris(Iris.Shocked)).equal(Iris.Shocked);
		});

		it('returns flipped iris', () => {
			expect(flipIris(Iris.Left)).equal(Iris.Right);
			expect(flipIris(Iris.Right)).equal(Iris.Left);
			expect(flipIris(Iris.UpLeft)).equal(Iris.UpRight);
			expect(flipIris(Iris.UpRight)).equal(Iris.UpLeft);
		});
	});

	describe('expression()', () => {
		it('creates expression with all parameters', () => {
			expect(expression(Eye.Angry, Eye.ClosedHappy, Muzzle.Smile, Iris.Left, Iris.Right, ExpressionExtra.Blush)).eql({
				right: Eye.Angry,
				left: Eye.ClosedHappy,
				muzzle: Muzzle.Smile,
				rightIris: Iris.Left,
				leftIris: Iris.Right,
				extra: ExpressionExtra.Blush,
			});
		});

		it('creates expression with defaults', () => {
			expect(expression(Eye.Angry, Eye.ClosedHappy, Muzzle.Smile)).eql({
				right: Eye.Angry,
				left: Eye.ClosedHappy,
				muzzle: Muzzle.Smile,
				rightIris: Iris.Forward,
				leftIris: Iris.Forward,
				extra: ExpressionExtra.None,
			});
		});
	});
});
