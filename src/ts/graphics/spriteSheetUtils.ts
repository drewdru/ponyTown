import { SpriteSheet } from '../common/interfaces';
import { createTexture, disposeTexture } from './webgl/texture2d';

export function createTexturesForSpriteSheets(gl: WebGLRenderingContext, sheets: SpriteSheet[], texture = createTexture) {
	sheets.forEach(sheet => {
		if (sheet.data) {
			sheet.texture = texture(gl, sheet.data);
		}
	});
}

export function disposeTexturesForSpriteSheets(gl: WebGLRenderingContext, sheets: SpriteSheet[]) {
	sheets.forEach(sheet => {
		sheet.texture = disposeTexture(gl, sheet.texture);
	});
}
