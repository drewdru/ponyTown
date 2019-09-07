import '../lib';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import { createTexturesForSpriteSheets } from '../../graphics/spriteSheetUtils';
import { createCanvas } from '../../client/canvasUtils';
import { SpriteSheet } from '../../common/interfaces';

function createImageData() {
	return createCanvas(10, 10).getContext('2d')!.getImageData(0, 0, 10, 10);
}

describe('spriteSheetUtils', () => {
	describe('createTexturesForSpriteSheets()', () => {
		it('creates texture from image', () => {
			const gl = {} as any;
			const data = createImageData();
			const tex = {} as any;
			const createTexture = stub().returns(tex);
			const sheet: SpriteSheet[] = [
				{ sprites: [], src: 'foo', data, texture: undefined, palette: false },
			];

			createTexturesForSpriteSheets(gl, sheet, createTexture);

			assert.calledWith(createTexture, gl, data);
			expect(sheet[0].texture).equal(tex);
		});

		it('handles empty sprites', () => {
			const createTexture = stub().returns({});
			const sheet: SpriteSheet[] = [
				{ sprites: [undefined] as any, src: 'foo', data: createImageData(), texture: undefined, palette: false },
			];

			createTexturesForSpriteSheets({} as any, sheet, createTexture);
		});
	});

	// describe('releaseTexturesForSpriteSheets()', () => {
	// 	it('disposes textures', () => {
	// 		const deleteTexture = stub();
	// 		const sheet: SpriteSheet[] = [
	// 			{ sprites: [], src: 'foo', texture: { gl: { deleteTexture } } as any, palette: false },
	// 		];

	// 		disposeTexturesForSpriteSheets(sheet);

	// 		assert.calledOnce(deleteTexture);
	// 		expect(sheet[0].texture).undefined;
	// 	});

	// 	it('handles empty texture', () => {
	// 		const sheet: SpriteSheet[] = [
	// 			{ sprites: [], src: 'foo', texture: undefined, palette: false },
	// 		];

	// 		disposeTexturesForSpriteSheets(sheet);
	// 	});

	// 	it('handles empty sprites', () => {
	// 		const sheet: SpriteSheet[] = [
	// 			{ sprites: [undefined], src: 'foo', texture: undefined, palette: false },
	// 		];

	// 		disposeTexturesForSpriteSheets(sheet);
	// 	});

	// 	it('does nothing for empty list', () => {
	// 		disposeTexturesForSpriteSheets([]);
	// 	});
	// });
});
