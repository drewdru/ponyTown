"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const spriteSheetUtils_1 = require("../../graphics/spriteSheetUtils");
const canvasUtils_1 = require("../../client/canvasUtils");
function createImageData() {
    return canvasUtils_1.createCanvas(10, 10).getContext('2d').getImageData(0, 0, 10, 10);
}
describe('spriteSheetUtils', () => {
    describe('createTexturesForSpriteSheets()', () => {
        it('creates texture from image', () => {
            const gl = {};
            const data = createImageData();
            const tex = {};
            const createTexture = sinon_1.stub().returns(tex);
            const sheet = [
                { sprites: [], src: 'foo', data, texture: undefined, palette: false },
            ];
            spriteSheetUtils_1.createTexturesForSpriteSheets(gl, sheet, createTexture);
            sinon_1.assert.calledWith(createTexture, gl, data);
            chai_1.expect(sheet[0].texture).equal(tex);
        });
        it('handles empty sprites', () => {
            const createTexture = sinon_1.stub().returns({});
            const sheet = [
                { sprites: [undefined], src: 'foo', data: createImageData(), texture: undefined, palette: false },
            ];
            spriteSheetUtils_1.createTexturesForSpriteSheets({}, sheet, createTexture);
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
//# sourceMappingURL=spriteSheetUtils.spec.js.map