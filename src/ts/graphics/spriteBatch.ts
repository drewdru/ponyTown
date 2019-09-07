import { Sprite, SpriteBatch as ISpriteBatch, Matrix2D } from '../common/interfaces';
import { BaseSpriteBatch, getColorFloat } from './baseSpriteBatch';

function vertex(
	vertices: Float32Array, _verticesUint32: Uint32Array, index: number,
	x: number, y: number, u: number, v: number, c: number, transform: Matrix2D
) {
	vertices[index++] = transform[0] * x + transform[2] * y + transform[4];
	vertices[index++] = transform[1] * x + transform[3] * y + transform[5];
	vertices[index++] = u;
	vertices[index++] = v;
	vertices[index++] = c;
}

// function colorWithAlpha(color: number, alpha: number) {
// 	return ((color & 0xffffff00) | (((color & 0xff) * alpha) & 0xff)) >>> 0;
// }

export class SpriteBatch extends BaseSpriteBatch implements ISpriteBatch {
	palette = false;
	depth = 0;
	constructor(
		gl: WebGLRenderingContext,
		capacity: number,
		buffer: ArrayBuffer,
		vertexBuffer: WebGLBuffer,
		indexBuffer: WebGLBuffer
	) {
		super(gl, capacity, buffer, vertexBuffer, indexBuffer, [
			{ name: 'position', size: 2 },
			{ name: 'texcoord0', size: 2 }, // , type: gl.UNSIGNED_SHORT },
			{ name: 'color', size: 4, type: gl.UNSIGNED_BYTE, normalized: true },
		]);
	}
	drawImage(
		color: number, sx: number, sy: number, sw: number, sh: number,
		dx: number, dy: number, dw: number, dh: number
	) {
		if (this.capacity <= this.spritesCount) {
			this.flush();
		}

		const c = getColorFloat(color, this.globalAlpha);

		const x2 = dx + dw;
		const y2 = dy + dh;

		const u1 = sx;
		const v1 = sy;
		const u2 = sx + sw;
		const v2 = sy + sh;

		const vertices = this.vertices;
		const verticesUint32 = this.verticesUint32;
		const transform = this.transform;

		const index = this.index;

		vertex(vertices, verticesUint32, index, dx, dy, u1, v1, c, transform);
		vertex(vertices, verticesUint32, index + 5, x2, dy, u2, v1, c, transform);
		vertex(vertices, verticesUint32, index + 10, x2, y2, u2, v2, c, transform);
		vertex(vertices, verticesUint32, index + 15, dx, y2, u1, v2, c, transform);

		this.index += 20;
		this.spritesCount++;
		this.tris += 2;
	}
	drawRect(color: number, x: number, y: number, w: number, h: number) {
		if (w && h) {
			const rect = this.rectSprite;

			if (rect) {
				this.drawImage(color, rect.x, rect.y, rect.w, rect.h, x, y, w, h);
			} else {
				this.drawImage(color, 0, 0, 1, 1, x, y, w, h);
			}
		}
	}
	drawSprite(s: Sprite, color: number, x: number, y: number) {
		if (s && s.w && s.h) {
			this.drawImage(color, s.x, s.y, s.w, s.h, x + s.ox, y + s.oy, s.w, s.h);
		}
	}
}
