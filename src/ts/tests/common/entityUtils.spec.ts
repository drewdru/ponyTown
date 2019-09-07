import '../lib';
import { expect } from 'chai';
import { entity } from '../mocks';
import { compareEntities } from '../../common/entityUtils';

describe('entityUtils [common]', () => {
	describe('compareEntities()', () => {
		it('compares by y position', () => {
			const a = entity(0, 0, 1);
			const b = entity(0, 0, 2);

			expect(compareEntities(a, b)).lt(0);
			expect(compareEntities(b, a)).gt(0);
		});

		it('compares by x position', () => {
			const a = entity(0, 1, 1);
			const b = entity(0, 2, 1);

			expect(compareEntities(a, b)).lt(0);
			expect(compareEntities(b, a)).gt(0);
		});

		it('compares by id', () => {
			const a = entity(1, 1, 1);
			const b = entity(2, 1, 1);

			expect(compareEntities(a, b)).gt(0);
			expect(compareEntities(b, a)).lt(0);
		});

		it('returns 0 for identical entities', () => {
			const a = entity(1, 1, 1);
			const b = entity(1, 1, 1);

			expect(compareEntities(a, b)).equal(0);
		});
	});
});
