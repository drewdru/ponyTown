import { PaletteSpriteBatch, Sprite, Palette, SpriteBatch, SpriteSheet, Matrix2D } from '../common/interfaces';
import { createCanvas } from '../client/canvasUtils';
import { colorToRGBA, getR, getG, getB, getAlpha } from '../common/color';
import { BaseStateBatch } from './baseStateBatch';
import { commonPalettes } from './graphicsUtils';
import { isTranslation } from '../common/mat2d';
import { TRANSPARENT } from '../common/colors';

export function drawBatch(
	canvas: HTMLCanvasElement, sheet: SpriteSheet, bg: number | undefined, action: (batch: ContextSpriteBatch) => void
) {
	const batch = new ContextSpriteBatch(canvas);
	batch.start(sheet, bg || TRANSPARENT);
	action(batch);
	batch.end();
	return canvas;
}

export function drawCanvas(
	width: number, height: number, sheet: SpriteSheet, bg: number | undefined, action: (batch: ContextSpriteBatch) => void
) {
	return drawBatch(createCanvas(width, height), sheet, bg, action);
}

export class ContextSpriteBatch extends BaseStateBatch implements PaletteSpriteBatch, SpriteBatch {
	pixelSize = 1;
	disableShading = false;
	ignoreColor = 0;
	palette = false;
	private started = false;
	private data: ImageData | undefined = undefined;
	private sheet: SpriteSheet | undefined = undefined;
	private sheetData: ImageData | undefined = undefined;
	constructor(public canvas: HTMLCanvasElement) {
		super();
	}
	start(sheet: SpriteSheet, clearColor: number) {
		if (!this.data || this.data.width !== this.canvas.width || this.data.height !== this.canvas.height) {
			if (this.canvas && this.canvas.width && this.canvas.height) {
				this.data = this.canvas.getContext('2d')!.getImageData(0, 0, this.canvas.width, this.canvas.height);
			}
		}

		if (this.data) {
			const color = clearColor || 0;
			const r = getR(color);
			const g = getG(color);
			const b = getB(color);
			const a = getAlpha(color);
			const data = this.data.data;

			for (let i = 0; i < data.length; i += 4) {
				data[i] = r;
				data[i + 1] = g;
				data[i + 2] = b;
				data[i + 3] = a;
			}
		}

		this.sheet = sheet;
		this.sheetData = sheet.data;
		this.palette = this.sheet.palette;
		this.started = true;
	}
	// clear(color?: number) {
	// 	this.end();

	// 	const context = this.canvas.getContext('2d')!;

	// 	if (color !== undefined) {
	// 		context.fillStyle = colorToCSS(color);
	// 		context.fillRect(0, 0, this.canvas.width, this.canvas.height);
	// 	} else {
	// 		context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	// 	}
	// }
	end() {
		if (this.started) {
			if (this.data) {
				this.canvas.getContext('2d')!.putImageData(this.data, 0, 0);
			}

			this.started = false;
		}
	}
	drawSprite(s: Sprite | undefined, color: number, palette: Palette | undefined | number, x: number, y?: number) {
		if (s !== undefined) {
			if (y === undefined) {
				y = x;
				x = palette as number;
				drawImageNormal(
					this.sheetData, this.data, this.transform, this.globalAlpha,
					color, s.x, s.y, s.w, s.h, x + s.ox, y + s.oy, s.w, s.h);
			} else {
				drawImagePalette(
					this.sheetData, this.data, this.transform, this.globalAlpha,
					this.ignoreColor, this.disableShading,
					s.type, color, palette as Palette, s.x, s.y, s.w, s.h, x + s.ox, y + s.oy, s.w, s.h);
			}
		}
	}
	drawImage( // SpriteBatch
		color: number,
		sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number
	): void;
	drawImage( // PaletteSpriteBatch3
		type: number, color: number, palette: Palette | undefined,
		sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(
		colorOrType: number, sxOrColor: number, syOrPalette: Palette | undefined | number,
		swOrSx: number, shOrSy: number, dxOrSw: number, dyOrSh: number,
		dwOrDx: number, dhOrDy: number, _OrDw?: number, _OrDh?: number,
	) {
		if (_OrDh === undefined) {
			drawImageNormal(
				this.sheetData, this.data, this.transform, this.globalAlpha,
				colorOrType, sxOrColor, syOrPalette as number,
				swOrSx, shOrSy, dxOrSw, dyOrSh, dwOrDx, dhOrDy);
		} else {
			drawImagePalette(
				this.sheetData, this.data, this.transform, this.globalAlpha,
				this.ignoreColor, this.disableShading,
				colorOrType, sxOrColor, syOrPalette as Palette | undefined,
				swOrSx, shOrSy, dxOrSw, dyOrSh, dwOrDx, dhOrDy, _OrDw!, _OrDh!);
		}
	}
	drawRect(color: number, x: number, y: number, w: number, h: number) {
		drawRect(this.data, this.transform, this.globalAlpha, color, x, y, w, h);
	}
	drawBatch() {
		throw new Error('drawBatch not supported');
	}
	startBatch() {
	}
	finishBatch() {
		return undefined;
	}
	releaseBatch() {
	}
}

const min = Math.min;
const typeOffsets = [0, 2, 3, 0, 1, 2, 3];

function drawRect(
	dst: ImageData | undefined, transform: Matrix2D, globalAlpha: number,
	color: number, x: number, y: number, w: number, h: number
) {
	if (DEVELOPMENT && !isTranslation(transform)) {
		console.error('Transform not supported');
	}

	if (!dst)
		return;

	x = Math.round(x + transform[4]);
	y = Math.round(y + transform[5]);

	const xx = min(0, x, x);
	w += xx;
	x -= xx;

	const yy = min(0, y, y);
	h += yy;
	y -= yy;

	w += min(0, dst.width - (x + w));
	h += min(0, dst.height - (y + h));

	if (w <= 0 && h <= 0)
		return;

	const { r, g, b, a } = colorToRGBA(color);
	const alpha = (globalAlpha * a) | 0;

	if (alpha === 0)
		return;

	const dstData = dst.data;
	const dstWidth = dst.width | 0;

	for (let iy = 0; iy < h; iy++) {
		for (let ix = 0; ix < w; ix++) {
			const dst0 = ((ix + x) + (iy + y) * dstWidth) << 2;
			blendPrecise(dstData, dst0, r, g, b, alpha);
		}
	}
}

function drawImageNormal(
	src: ImageData | undefined, dst: ImageData | undefined, transform: Matrix2D, globalAlpha: number,
	tint: number, sx: number, sy: number, sw: number, sh: number,
	dx: number, dy: number, dw: number, dh: number
) {
	if (sw !== dw || sh !== dh)
		throw new Error('Different dimentions not supported');

	if (DEVELOPMENT && !isTranslation(transform)) {
		console.error('Transform not supported');
	}

	if (!src || !dst)
		return;

	dx = Math.round(dx + transform[4]);
	dy = Math.round(dy + transform[5]);

	let w = sw;
	let h = sh;

	const xx = min(0, sx, dx);
	w += xx;
	dx -= xx;
	sx -= xx;

	const yy = min(0, sy, dy);
	h += yy;
	dy -= yy;
	sy -= yy;

	w += min(0, src.width - (sx + w), dst.width - (dx + w));
	h += min(0, src.height - (sy + h), dst.height - (dy + h));

	if (w <= 0 && h <= 0)
		return;

	const { r, g, b, a } = colorToRGBA(tint);
	const alpha = (globalAlpha * a) | 0;
	const dstData = dst.data;
	const srcData = src.data;
	const dstWidth = dst.width | 0;
	const srcWidth = src.width | 0;

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const srcO = ((sx + x) + (sy + y) * srcWidth) << 2;
			const sr = srcData[srcO];
			const sg = srcData[srcO + 1];
			const sb = srcData[srcO + 2];
			const sa = srcData[srcO + 3];
			const srcAlpha = blendColor(alpha, sa, 255);

			if (srcAlpha !== 0) {
				const rr = blendColor(r, sr, 255);
				const gg = blendColor(g, sg, 255);
				const bb = blendColor(b, sb, 255);
				const dst0 = ((dx + x) + (dy + y) * dstWidth) << 2;
				blendPrecise(dstData, dst0, rr, gg, bb, srcAlpha);
			}
		}
	}
}

function drawImagePalette(
	src: ImageData | undefined, dst: ImageData | undefined, transform: Matrix2D, globalAlpha: number,
	ignoreColorOption: number, disableShadingOption: boolean,
	type: number, tint: number, palette: Palette | undefined,
	sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number
) {
	if (sw !== dw || sh !== dh)
		throw new Error('Different dimentions not supported');

	if (DEVELOPMENT && !isTranslation(transform)) {
		console.error('Transform not supported');
	}

	if (palette === undefined) {
		palette = commonPalettes.defaultPalette;
	}

	if (!src || !dst)
		return;

	dx = Math.round(dx + transform[4]);
	dy = Math.round(dy + transform[5]);

	let w = sw;
	let h = sh;

	const xx = min(0, sx, dx);
	w += xx;
	dx -= xx;
	sx -= xx;

	const yy = min(0, sy, dy);
	h += yy;
	dy -= yy;
	sy -= yy;

	w += min(0, src.width - (sx + w), dst.width - (dx + w));
	h += min(0, src.height - (sy + h), dst.height - (dy + h));

	if (w <= 0 && h <= 0)
		return;

	const { r, g, b, a } = colorToRGBA(tint);
	const alpha = (globalAlpha * a) | 0;
	const colors = palette.colors;
	const dstData = dst.data;
	const srcData = src.data;
	const dstWidth = dst.width | 0;
	const srcWidth = src.width | 0;
	const ignoreColor = ignoreColorOption >>> 0;
	const disableShading = disableShadingOption || type > 2;
	const offset = typeOffsets[type];

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const srcO = ((sx + x) + (sy + y) * srcWidth) << 2;
			const index = srcData[srcO + offset];
			const color = colors[index];
			const srcAlpha = ignoreColor === color ? 0 : blendColor(getAlpha(color), alpha, 255);

			if (srcAlpha !== 0) {
				const shade = disableShading ? 255 : srcData[srcO + 1];
				const rr = blendColor(getR(color), r, shade);
				const gg = blendColor(getG(color), g, shade);
				const bb = blendColor(getB(color), b, shade);
				const dst0 = ((dx + x) + (dy + y) * dstWidth) << 2;
				blendPrecise(dstData, dst0, rr, gg, bb, srcAlpha);
			}
		}
	}
}

function blendColor(base: number, tint: number, shade: number) {
	return (((((base * tint) | 0) * shade) | 0) / 65025) | 0;
}

function blendPrecise(dstData: Uint8ClampedArray, dst0: number, r: number, g: number, b: number, alpha: number) {
	if (alpha === 0xff || dstData[dst0 + 3] === 0) {
		dstData[dst0] = r;
		dstData[dst0 + 1] = g;
		dstData[dst0 + 2] = b;
		dstData[dst0 + 3] = alpha;
	} else {
		const dstAlpha = (0xff - alpha) | 0;
		dstData[dst0] = ((((r * alpha) | 0) / 255) | 0) + ((((dstData[dst0] * dstAlpha) | 0) / 255) | 0);
		dstData[dst0 + 1] = ((((g * alpha) | 0) / 255) | 0) + ((((dstData[dst0 + 1] * dstAlpha) | 0) / 255) | 0);
		dstData[dst0 + 2] = ((((b * alpha) | 0) / 255) | 0) + ((((dstData[dst0 + 2] * dstAlpha) | 0) / 255) | 0);
		const a = (alpha + ((((dstData[dst0 + 3] * dstAlpha) | 0) / 255) | 0)) | 0;
		dstData[dst0 + 3] = a > 0xff ? 0xff : a;
	}
}

// function blendFast(dstData: Uint8ClampedArray, dst0: number, r: number, g: number, b: number, alpha: number) {
// 	if (alpha === 0xff) {
// 		dstData[dst0] = r;
// 		dstData[dst0 + 1] = g;
// 		dstData[dst0 + 2] = b;
// 		dstData[dst0 + 3] = alpha;
// 	} else {
// 		const dstAlpha = (0xff - alpha) | 0;
// 		dstData[dst0] = ((r * alpha) >> 8) + ((dstData[dst0] * dstAlpha) >> 8);
// 		dstData[dst0 + 1] = ((g * alpha) >> 8) + ((dstData[dst0 + 1] * dstAlpha) >> 8);
// 		dstData[dst0 + 2] = ((b * alpha) >> 8) + ((dstData[dst0 + 2] * dstAlpha) >> 8);
// 		dstData[dst0 + 3] = min(0xff, alpha + ((dstData[dst0 + 3] * dstAlpha) >> 8));
// 	}
// }
