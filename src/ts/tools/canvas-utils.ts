import * as fs from 'fs';
import { createCanvas, Image } from 'canvas';
import { ExtCanvas, Point } from './types';

export function loadImage(filePath: string) {
	const image = new Image();
	image.src = fs.readFileSync(filePath);
	(image as any).currentSrc = filePath;
	return image;
}

export function createExtCanvas(width: number, height: number, info: string): ExtCanvas {
	const canvas: ExtCanvas = createCanvas(width, height) as any;
	canvas.info = info;
	return canvas;
}

export function imageToCanvas(image: HTMLImageElement): ExtCanvas {
	const canvas = createExtCanvas(image.width, image.height, `imageToCanvas(${image.currentSrc})`);
	canvas.getContext('2d')!.drawImage(image, 0, 0);
	return canvas;
}

export function cropCanvas(canvas: ExtCanvas | undefined, x: number, y: number, w: number, h: number): ExtCanvas {
	if (Math.round(x) !== x || Math.round(y) !== y || Math.round(w) !== w || Math.round(h) !== h) {
		throw new Error(`Invalid cropping dimentions (${x} ${y} ${w} ${h})`);
	}

	const result = createExtCanvas(w, h, `${canvas ? canvas.info : 'from null'} (cropped ${x} ${y} ${w} ${h})`);

	if (canvas) {
		w = Math.min(w, canvas.width - x);
		h = Math.min(h, canvas.height - y);
		result.getContext('2d')!.drawImage(canvas, x, y, w, h, 0, 0, w, h);
	}

	return result;
}

export function mirrorCanvas(canvas: ExtCanvas, offsetX = 0) {
	const mirrored = createExtCanvas(canvas.width, canvas.height, `${canvas.info} (mirrored)`);
	const context = mirrored.getContext('2d')!;
	context.translate(canvas.width, 0);
	context.scale(-1, 1);
	context.translate(offsetX, 0);
	context.drawImage(canvas, 0, 0);
	return mirrored;
}

export function padCanvas(canvas: ExtCanvas, left: number, top: number, right = 0, bottom = 0, bg?: string) {
	if (left === 0 && top === 0 && right === 0 && bottom === 0)
		return canvas;

	const result = createExtCanvas(
		canvas.width + left + right, canvas.height + top + bottom, `${canvas.info} (pad ${left} ${top} ${right} ${bottom})`);
	const context = result.getContext('2d')!;

	if (bg) {
		context.fillStyle = bg;
		context.fillRect(0, 0, result.width, result.height);
	}

	context.drawImage(canvas, left, top);
	return result;
}

export function clipCanvas(canvas: ExtCanvas, x: number, y: number, w: number, h: number) {
	return padCanvas(cropCanvas(canvas, x, y, w, h), x, y, canvas.width - (w + x), canvas.height - (h + y));
}

export function mergeCanvases(...canvases: (ExtCanvas | undefined)[]): ExtCanvas {
	const existing = canvases.filter(c => !!c) as ExtCanvas[];
	const { width, height } = existing[0];
	const result = createExtCanvas(width, height, existing.map(c => c.info).join(' + '));
	const context = result.getContext('2d')!;
	existing.forEach(c => context.drawImage(c, 0, 0));
	return result;
}

export function reverseMaskCanvas(canvas: ExtCanvas): ExtCanvas;
export function reverseMaskCanvas(canvas: ExtCanvas | undefined): ExtCanvas | undefined;
export function reverseMaskCanvas(canvas: ExtCanvas | undefined) {
	if (!canvas)
		return undefined;

	const result = createExtCanvas(canvas.width, canvas.height, `${canvas.info} reversed mask`);
	const context = result.getContext('2d')!;
	context.fillStyle = 'white';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.globalCompositeOperation = 'destination-out';
	context.drawImage(canvas, 0, 0);
	return result;
}

export function maskCanvas(canvas: ExtCanvas, mask: ExtCanvas): ExtCanvas;
export function maskCanvas(canvas: ExtCanvas | undefined, mask: ExtCanvas | undefined): ExtCanvas | undefined;
export function maskCanvas(canvas: ExtCanvas | undefined, mask: ExtCanvas | undefined) {
	if (!canvas || !mask)
		return undefined;

	const result = createExtCanvas(canvas.width, canvas.height, `${canvas.info} masked by ${mask.info}`);
	const context = result.getContext('2d')!;
	context.drawImage(canvas, 0, 0);
	context.globalCompositeOperation = 'destination-in';
	context.drawImage(mask, 0, 0);
	return result;
}

export function colorCanvas(canvas: ExtCanvas, color: string): ExtCanvas;
export function colorCanvas(canvas: ExtCanvas | undefined, color: string): ExtCanvas | undefined;
export function colorCanvas(canvas: ExtCanvas | undefined, color: string): ExtCanvas | undefined {
	const copy = copyCanvas(canvas);

	if (copy) {
		const context = copy.getContext('2d')!;
		context.globalCompositeOperation = 'source-in';
		context.fillStyle = color;
		context.fillRect(0, 0, copy.width, copy.height);
	}

	return copy;
}

export function copyCanvas(canvas: ExtCanvas): ExtCanvas;
export function copyCanvas(canvas: ExtCanvas | undefined): ExtCanvas | undefined;
export function copyCanvas(canvas: ExtCanvas | undefined): ExtCanvas | undefined {
	if (!canvas)
		return undefined;

	const newCanvas = createExtCanvas(canvas.width, canvas.height, `${canvas.info} (copy)`);
	newCanvas.getContext('2d')!.drawImage(canvas, 0, 0);
	return newCanvas;
}

export function recolorCanvas(canvas: ExtCanvas, color: string) {
	const result = createExtCanvas(canvas.width, canvas.height, `recolorCanvas(${canvas.info}, ${color})`);
	const context = result.getContext('2d')!;
	context.fillStyle = color;
	context.fillRect(0, 0, result.width, result.height);
	context.globalCompositeOperation = 'destination-in';
	context.drawImage(canvas, 0, 0);
	return result;
}

export function createColorCanvas(width: number, height: number, color: string) {
	const canvas = createExtCanvas(width, height, `createColorCanvas(${color})`);
	const context = canvas.getContext('2d')!;
	context.fillStyle = color;
	context.fillRect(0, 0, canvas.width, canvas.height);
	return canvas;
}

export function isCanvasEmpty(canvas: ExtCanvas | undefined): boolean {
	if (canvas && canvas.width > 0 && canvas.height > 0) {
		const context = canvas.getContext('2d')!;
		const data = context.getImageData(0, 0, canvas.width, canvas.height);
		const size = data.width * data.height * 4;

		for (let i = 0; i < size; i++) {
			if (data.data[i] !== 0) {
				return false;
			}
		}
	}

	return true;
}

export function saveCanvas(filePath: string, canvas: HTMLCanvasElement) {
	fs.writeFileSync(filePath, canvas.toBuffer());
}

function getColorAt(d: Uint8ClampedArray, i: number) {
	return ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
}

export function forEachPixel(canvas: ExtCanvas, action: (color: number, x: number, y: number) => void) {
	const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);

	for (let y = 0, i = 0; y < data.height; y++) {
		for (let x = 0; x < data.width; x++ , i += 4) {
			action(getColorAt(data.data, i), x, y);
		}
	}
}

export function forEachPixelOf2Canvases(
	canvas1: ExtCanvas, canvas2: ExtCanvas, action: (color1: number, color2: number, x: number, y: number) => void
) {
	if (canvas1.width !== canvas2.width || canvas1.height !== canvas2.height) {
		throw new Error('Canvas not the same size');
	}

	const data1 = canvas1.getContext('2d')!.getImageData(0, 0, canvas1.width, canvas1.height);
	const data2 = canvas2.getContext('2d')!.getImageData(0, 0, canvas2.width, canvas2.height);

	for (let y = 0, i = 0; y < data1.height; y++) {
		for (let x = 0; x < data1.width; x++ , i += 4) {
			action(getColorAt(data1.data, i), getColorAt(data2.data, i), x, y);
		}
	}
}

type MapColor = (color: number, x: number, y: number) => number;

export function mapEachPixel(canvas: ExtCanvas, action: MapColor) {
	const context = canvas.getContext('2d')!;
	const data = context.getImageData(0, 0, canvas.width, canvas.height);
	const d = data.data;

	for (let y = 0, i = 0; y < data.height; y++) {
		for (let x = 0; x < data.width; x++ , i += 4) {
			const c = ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;
			const out = action(c, x, y);
			d[i] = (out >>> 24) & 0xff;
			d[i + 1] = (out >>> 16) & 0xff;
			d[i + 2] = (out >>> 8) & 0xff;
			d[i + 3] = out & 0xff;
		}
	}

	context.putImageData(data, 0, 0);
}

export function mapColors(canvas: ExtCanvas, map: MapColor): ExtCanvas;
export function mapColors(canvas: ExtCanvas | undefined, map: MapColor): ExtCanvas | undefined;
export function mapColors(canvas: ExtCanvas | undefined, map: MapColor): ExtCanvas | undefined {
	const result = copyCanvas(canvas);

	if (result) {
		mapEachPixel(result, map);
	}

	return result;
}

function compareTemplate(canvas: ImageData, template: ImageData, ox: number, oy: number) {
	for (let y = 0; y < template.height; y++) {
		for (let x = 0; x < template.width; x++) {
			for (let i = 0; i < 4; i++) {
				if (canvas.data[i + (x + ox) * 4 + (y + oy) * canvas.width * 4] !== template.data[i + x * 4 + y * template.width * 4]) {
					return false;
				}
			}
		}
	}

	return true;
}

export function findTemplate(canvas: HTMLCanvasElement, template: HTMLCanvasElement) {
	const canvasData = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
	const templateData = template.getContext('2d')!.getImageData(0, 0, template.width, template.height);
	const maxX = canvas.width - template.width;
	const maxY = canvas.height - template.height;

	for (let y = 0; y <= maxY; y++) {
		for (let x = 0; x <= maxX; x++) {
			if (compareTemplate(canvasData, templateData, x, y)) {
				return { x, y };
			}
		}
	}

	return null;
}

export function offsetCanvas(canvas: ExtCanvas | undefined, { x, y }: Point) {
	return canvas && padCanvas(canvas, x, y);
}

export type CanvasGetter = (Canvas: ExtCanvas, col: number, row: number) => ExtCanvas;
export type ByIndexGetter = (Canvas: ExtCanvas, index: number) => ExtCanvas;

export function cropAndPadByColRow(
	x: number, y: number, w: number, h: number, dx: number, dy: number, padLeft = 0, padTop = 0
): CanvasGetter {
	return (canvas, col, row) => padCanvas(cropCanvas(canvas, x + dx * col, y + dy * row, w, h), padLeft, padTop);
}

export function cropByIndex(get: CanvasGetter, perLine: number): ByIndexGetter {
	return (canvas, i) => get(canvas, i % perLine, Math.floor(i / perLine));
}
