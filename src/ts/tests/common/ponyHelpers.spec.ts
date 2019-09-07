import '../lib';
import { expect } from 'chai';
import { defaultPonyState, isStateEqual } from '../../client/ponyHelpers';

describe('interfaces', () => {
	describe('isStateEqual()', () => {
		it('returns true if two states are equal', () => {
			expect(isStateEqual(defaultPonyState(), defaultPonyState())).true;
		});

		it('returns true if two states are not equal', () => {
			expect(isStateEqual({ ...defaultPonyState(), blinkFrame: 5 }, defaultPonyState())).false;
		});
	});
});
