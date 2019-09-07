import '../lib';
import { expect } from 'chai';
import { rect, centerPoint } from '../../common/rect';

describe('rect', () => {
	describe('centerPoint()', () => {
		it('returns center point', () => {
			expect(centerPoint(rect(10, 20, 20, 40))).eql({ x: 20, y: 40 });
		});
	});
});
