import { Sprite, Palette, PaletteSpriteBatch as IPaletteSpriteBatch, Matrix2D } from '../common/interfaces';
import { BaseSpriteBatch, getColorFloat } from './baseSpriteBatch';
import { colorFromRGBA, colorToFloat } from '../common/color';
import { createSprite } from '../client/spriteUtils';
import { createPalette } from './paletteManager';

const defaultRectSprite = createSprite(0, 0, 1, 1, 0, 0, 3);

const types = new Float32Array([
	colorToFloat(colorFromRGBA(255, 0, 0, 0)), // type 0 shade
	colorToFloat(colorFromRGBA(0, 0, 255, 0)), // type 2 shade
	colorToFloat(colorFromRGBA(0, 0, 0, 0)), // type 3 shade
	colorToFloat(colorFromRGBA(255, 0, 0, 255)), // type 0
	colorToFloat(colorFromRGBA(0, 255, 0, 255)), // type 1
	colorToFloat(colorFromRGBA(0, 0, 255, 255)), // type 2
	colorToFloat(colorFromRGBA(0, 0, 0, 255)), // type 3
]);

/*
function pushVertex(
	vertices: Float32Array, _verticesUint32: Uint32Array, index: number,
	x: number, y: number, u: number, v: number, pu: number, pv: number, c: number, c1: number, transform: Matrix2D
) {
	vertices[index++] = transform[0] * x + transform[2] * y + transform[4];
	vertices[index++] = transform[1] * x + transform[3] * y + transform[5];
	vertices[index++] = u;
	vertices[index++] = v;
	vertices[index++] = pu;
	vertices[index++] = pv;
	vertices[index++] = c;
	vertices[index++] = c1;
}

function pushQuad(
	vertices: Float32Array, verticesUint32: Uint32Array,
	transform: mat2d, index: number, type: number, color: number, palette: Palette,
	sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number
) {
	const c1 = types[type];

	const y2 = dy + dh;
	const x2 = dx + dw;

	const u1 = sx + 0.1;
	const v1 = sy + 0.1;
	const u2 = sx + sw;
	const v2 = sy + sh;

	const pu = palette.u;
	const pv = palette.v;

	pushVertex(vertices, verticesUint32, index, dx, dy, u1, v1, pu, pv, color, c1, transform);
	pushVertex(vertices, verticesUint32, index + 8, x2, dy, u2, v1, pu, pv, color, c1, transform);
	pushVertex(vertices, verticesUint32, index + 16, x2, y2, u2, v2, pu, pv, color, c1, transform);
	pushVertex(vertices, verticesUint32, index + 24, dx, y2, u1, v2, pu, pv, color, c1, transform);

	return index + 32;
}
*/

function pushQuad(
	vertices: Float32Array, //_verticesUint32: Uint32Array,
	transform: Matrix2D, index: number, type: number, color: number, palette: Palette,
	sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number,
) {
	const c1 = types[type];

	const y2 = dy + dh;
	const x2 = dx + dw;

	const u1 = sx + 0.1;
	const v1 = sy + 0.1;
	const u2 = sx + sw;
	const v2 = sy + sh;

	const pu = palette.u; // + palette.v * 1024;
	const pv = palette.v;

	const t0 = transform[0];
	const t1 = transform[1];
	const t2 = transform[2];
	const t3 = transform[3];
	const t4 = transform[4];
	const t5 = transform[5];

	// pushVertex(vertices, index, dx, dy, u1, v1, pu, pv, color, c1, transform);
	vertices[(index + 0) | 0] = t0 * dx + t2 * dy + t4;
	vertices[(index + 1) | 0] = t1 * dx + t3 * dy + t5;
	vertices[(index + 2) | 0] = u1;
	vertices[(index + 3) | 0] = v1;
	vertices[(index + 4) | 0] = pu;
	vertices[(index + 5) | 0] = pv;
	vertices[(index + 6) | 0] = color;
	vertices[(index + 7) | 0] = c1;

	// pushVertex(vertices, index + 8, x2, dy, u2, v1, pu, pv, color, c1, transform);
	vertices[(index + 8) | 0] = t0 * x2 + t2 * dy + t4;
	vertices[(index + 9) | 0] = t1 * x2 + t3 * dy + t5;
	vertices[(index + 10) | 0] = u2;
	vertices[(index + 11) | 0] = v1;
	vertices[(index + 12) | 0] = pu;
	vertices[(index + 13) | 0] = pv;
	vertices[(index + 14) | 0] = color;
	vertices[(index + 15) | 0] = c1;

	// pushVertex(vertices, index + 16, x2, y2, u2, v2, pu, pv, color, c1, transform);
	vertices[(index + 16) | 0] = t0 * x2 + t2 * y2 + t4;
	vertices[(index + 17) | 0] = t1 * x2 + t3 * y2 + t5;
	vertices[(index + 18) | 0] = u2;
	vertices[(index + 19) | 0] = v2;
	vertices[(index + 20) | 0] = pu;
	vertices[(index + 21) | 0] = pv;
	vertices[(index + 22) | 0] = color;
	vertices[(index + 23) | 0] = c1;

	// pushVertex(vertices, index + 24, dx, y2, u1, v2, pu, pv, color, c1, transform);
	vertices[(index + 24) | 0] = t0 * dx + t2 * y2 + t4;
	vertices[(index + 25) | 0] = t1 * dx + t3 * y2 + t5;
	vertices[(index + 26) | 0] = u1;
	vertices[(index + 27) | 0] = v2;
	vertices[(index + 28) | 0] = pu;
	vertices[(index + 29) | 0] = pv;
	vertices[(index + 30) | 0] = color;
	vertices[(index + 31) | 0] = c1;

	return index + 32;
}

// function colorWithAlpha(color: number, alpha: number) {
// 	return ((color & 0xffffff00) | (((color & 0xff) * alpha) & 0xff)) >>> 0;
// }

export const PALETTE_BATCH_BYTES_PER_VERTEX = 2 * 4 + 4 * 4 + 4 + 4;

export class PaletteSpriteBatch extends BaseSpriteBatch implements IPaletteSpriteBatch {
	palette = true;
	defaultPalette: Palette = createPalette(new Uint32Array(0));
	constructor(
		gl: WebGLRenderingContext, capacity: number, buffer: ArrayBuffer, vertexBuffer: WebGLBuffer, indexBuffer: WebGLBuffer
	) {
		super(gl, capacity, buffer, vertexBuffer, indexBuffer, [
			{ name: 'position', size: 2 },
			{ name: 'texcoord0', size: 4 }, //, type: gl.UNSIGNED_SHORT },
			{ name: 'color', size: 4, type: gl.UNSIGNED_BYTE, normalized: true },
			{ name: 'color1', size: 4, type: gl.UNSIGNED_BYTE, normalized: true },
		]);
	}
	drawImage(
		type: number, color: number, palette: Palette | undefined,
		sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number
	) {
		if (this.capacity <= this.spritesCount) {
			this.flush();
		}

		this.index = pushQuad(
			this.vertices, //this.verticesUint32,
			this.transform, this.index, type, getColorFloat(color, this.globalAlpha),
			palette || this.defaultPalette, sx, sy, sw, sh, dx, dy, dw, dh,
		);
		this.spritesCount++;
		this.tris += 2;
	}
	drawRect(color: number, x: number, y: number, w: number, h: number) {
		if (w !== 0 && h !== 0) {
			if (this.capacity <= this.spritesCount) {
				this.flush();
			}

			const s = this.rectSprite || defaultRectSprite;
			this.index = pushQuad(
				this.vertices, //this.verticesUint32,
				this.transform, this.index, s.type, getColorFloat(color, this.globalAlpha),
				this.defaultPalette, s.x, s.y, s.w, s.h, x, y, w, h,
			);
			this.spritesCount++;
			this.tris += 2;
		}
	}
	drawSprite(s: Sprite, color: number, palette: Palette | undefined, x: number, y: number) {
		if (s.w !== 0 && s.h !== 0) {
			if (this.capacity <= this.spritesCount) {
				this.flush();
			}

			if (this.hasCrop) {
				const crop = this.cropRect;

				let sx = s.x;
				let sy = s.y;
				let w = s.w;
				let h = s.h;
				let dx = x + s.ox;
				let dy = y + s.oy;

				const cropX = crop.x; // - this.transform[4];
				const cropY = crop.y; // - this.transform[5];
				const shiftLeft = cropX - dx;
				const shiftTop = cropY - dy;
				const shiftRight = (dx + w) - (cropX + crop.w);
				const shiftBottom = (dy + h) - (cropY + crop.h);

				if (shiftLeft > 0) {
					sx += shiftLeft;
					dx += shiftLeft;
					w -= shiftLeft;
				}

				if (shiftRight > 0) {
					w -= shiftRight;
				}

				if (shiftTop > 0) {
					sy += shiftTop;
					dy += shiftTop;
					h -= shiftTop;
				}

				if (shiftBottom > 0) {
					h -= shiftBottom;
				}

				if (w > 0 && h > 0) {
					this.index = pushQuad(
						this.vertices, //this.verticesUint32,
						this.transform, this.index, s.type, getColorFloat(color, this.globalAlpha),
						palette || this.defaultPalette, sx, sy, w, h, dx, dy, w, h,
					);
					this.spritesCount++;
					this.tris += 2;
				}
			} else {
				this.index = pushQuad(
					this.vertices, //this.verticesUint32,
					this.transform, this.index, s.type, getColorFloat(color, this.globalAlpha),
					palette || this.defaultPalette, s.x, s.y, s.w, s.h, x + s.ox, y + s.oy, s.w, s.h,
				);
				this.spritesCount++;
				this.tris += 2;
			}
		}
	}
}
