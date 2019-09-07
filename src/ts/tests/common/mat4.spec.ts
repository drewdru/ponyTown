import '../lib';
import { expect } from 'chai';
import { createMat4, ortho } from '../../common/mat4';

describe('mat4', () => {
	describe('createMat4()', () => {
		expect(createMat4()).eql(new Float32Array([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		]));
	});

	describe('ortho()', () => {
		expect(ortho(createMat4(), 100, 200, 300, 400, 10, 20)).eql(new Float32Array([
			0.019999999552965164, 0, 0, 0,
			0, 0.019999999552965164, 0, 0,
			0, 0, -0.20000000298023224, 0,
			-3, -7, -3, 1
		]));
	});
});
