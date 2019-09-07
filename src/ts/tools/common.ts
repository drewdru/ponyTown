/// <reference path="../../typings/my.d.ts" />

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { reduce, flatten, map, dropRightWhile } from 'lodash';
import { Layer, Psd, ExtCanvas, Sprite, Rect, Result, ColorExtra } from './types';
import { ColorsOutput, imageToPalette } from './palette-utils';
import { getSpriteRect } from './sprite-sheet';
import { createColorCanvas, isCanvasEmpty } from './canvas-utils';

(global as any).DEVELOPMENT = true;

export const TRANSPARENT = 0;
export const BLACK = 0x000000ff;
export const WHITE = 0xffffffff;
export const OUTLINE_COLOR = 0x9f9f9fff;
export const SHADE_COLOR = 0xccccccff;
export const LIGHT_SHADE_COLOR = 0xddddddff;
export const TEAR_COLOR = 0xc1eef0ff;
export const DARK_GRAY = 0x232728ff;
export const MOUTH_COLOR = 0x721946ff;
export const TONGUE_COLOR = 0xf39f4bff;
export const TEETH_COLOR = 0x8cffffff;
export const TEETH_SHADE_COLOR = 0x77d9d9ff;

// TEMP: remove after adding palettes for effects
const holdPoofColors = [
	0xffff47ff, 0xeaed58ff, 0xd8dc00ff, 0xff6741ff, 0xff0000ff, 0xff7af9ff, 0xff00ccff, 0xb67affff,
	0x9876ffff, 0x76a6ffff, 0x0097ffff, 0x00ff9bff, 0x76ed5cff, 0x28dc00ff, 0x76ed5cff,
];

export const defaultPalette = [
	TRANSPARENT, WHITE, BLACK, MOUTH_COLOR, TONGUE_COLOR, LIGHT_SHADE_COLOR, TEAR_COLOR, DARK_GRAY,
	...holdPoofColors,
];

export function cartesian<A, B>(a: A[], b: B[]): [A, B][];
export function cartesian<A, B, C>(a: A[], b: B[], c: C[]): [A, B, C][];
export function cartesian(...args: any[]) {
	return reduce<any[], any[][]>(args, (a, b) => flatten(map(a, x => map(b as any, y => x.concat([y])))), [[]]);
}

export function mkdir(dirpath: string) {
	try {
		fs.mkdirSync(dirpath);
	} catch { }
}

const isDirectory = (dir: string) => fs.lstatSync(dir).isDirectory();

export const getDirectories = (dir: string) => fs.readdirSync(dir).map(name => path.join(dir, name)).filter(isDirectory);

function findLayerByPath([name, ...child]: string[], layer: Layer | Psd | undefined): Layer | undefined {
	return name ? findLayerByPath(child, layer && findByName(layer.children, name)) : layer;
}

export function findLayer(path: string, layer: Layer | Psd | undefined): Layer | undefined {
	return findLayerByPath(path.split('/'), layer);
}

export function findLayerSafe(name: string, parent: Layer | Psd): Layer {
	const layer = findLayer(name, parent);

	if (!layer) {
		throw new Error(`Missing layer "${name}" in "${parent.info}"`);
	}

	return layer;
}

export function findByName<T extends { name?: string }>(items: T[], name: string): T | undefined {
	return items.find(i => i.name === name);
}

export function findByIndex<T extends { index?: number }>(items: T[], index: number) {
	return items.find(i => i.index === index);
}

export const nameMatches = (regex: RegExp) => (l: { name: string; }) => regex.test(l.name);

export function compareNames(a: { name: string }, b: { name: string }) {
	return a.name.localeCompare(b.name);
}

export const time = (function () {
	const start = Date.now();
	let last = start;

	return function (text: string) {
		console.log(text, (Date.now() - last), 'ms');
		last = Date.now();
		return true;
	};
})();

export function spawnAsync(command: string, args?: string[]) {
	return new Promise<void>((resolve, reject) => {
		spawn(command, args)
			.on('error', (err: Error) => reject(err))
			.on('exit', (code: number) => code === 0 ? resolve() : reject(new Error(`Non-zero return code for ${command} (${code})`)));
	});
}

// canvas

export function getCanvas(layer: Layer | undefined): ExtCanvas | undefined {
	if (!layer)
		return undefined;

	const canvas = layer.canvas;

	if (canvas) {
		canvas.info = layer.info;
	}

	return canvas;
}

export function getCanvasSafe(layer: Layer): ExtCanvas {
	const canvas = getCanvas(layer);

	if (!canvas) {
		throw new Error(`Cannot find canvas in layer "${layer.info}"`);
	}

	return canvas;
}

export function getLayerCanvas(name: string, parent: Layer | Psd | undefined) {
	return getCanvas(findLayer(name, parent));
}

export function getLayerCanvasSafe(name: string, parent: Layer | Psd): ExtCanvas {
	return getCanvasSafe(findLayerSafe(name, parent));
}

export function parseWithNumber(name: string) {
	const match = /(\d+)/.exec(name);
	return parseInt(match ? match[1] : '0', 10);
}

export const matcher = (regex: RegExp) => (text: string) => regex.test(text);

const isArrayEmpty = <T>(a: T[] | null) => !a || a.length === 0;
const nullForEmpty = <T>(a: T[] | null) => isArrayEmpty(a) ? null : a;

export function trimRight<T>(items: ((T | null)[] | null)[]): ((T | null)[] | null)[] {
	return dropRightWhile(items.map(nullForEmpty) as any, isArrayEmpty as any) as any;
}

// sprites

const redCanvas = createColorCanvas(1000, 1000, 'red');

export function addImage(images: HTMLCanvasElement[], canvas: HTMLCanvasElement) {
	if (canvas) {
		// TODO: remove duplicated
		images.push(canvas);
		return images.length - 1;
	} else {
		return 0;
	}
}

export function createSprite(index: number, image: HTMLCanvasElement, { w, h, x, y }: Rect) {
	return { index, image, w, h, x: 0, y: 0, ox: x, oy: y };
}

const maxSpriteWidth = 500;
const maxSpriteHeight = 500;

export function addSprite(
	sprites: Sprite[], canvas?: ExtCanvas, pattern?: ExtCanvas, palette?: number[], out: ColorsOutput = {}
): number {
	if (canvas) {
		const rect = getSpriteRect(canvas, 0, 0, canvas.width, canvas.height);

		if (rect.w && rect.h) {
			if (rect.w > maxSpriteWidth || rect.h > maxSpriteHeight) {
				throw new Error(`Sprite too large (${rect.w}, ${rect.h}) from [${canvas.info}]`);
			}

			const image = imageToPalette(rect, canvas, pattern || redCanvas, palette, out);
			sprites.push(createSprite(sprites.length, image, rect));
			return sprites.length - 1;
		}
	}

	return 0;
}

export function addSpriteWithColors(
	sprites: Sprite[], colorImage?: ExtCanvas, patternImage?: ExtCanvas, forceWhite?: boolean
): ColorExtra {
	const out: ColorsOutput = { forceWhite };
	const color = addSprite(sprites, colorImage, patternImage, undefined, out);
	return { color, colors: out.colors! };
}

export function getColorsCount(colorImage?: ExtCanvas, patternImage?: ExtCanvas, forceWhite?: boolean): number {
	const out: ColorsOutput = { forceWhite };
	addSprite([], colorImage, patternImage, undefined, out);
	return out.colors!;
}

export function createPixelSprites({ objects, objects2, images, sprites }: Result) {
	const pixel = createColorCanvas(3, 3, 'white');
	objects['pixelRect'] = addImage(images, pixel);
	objects2['pixelRect2'] = addSprite(sprites, pixel, undefined, defaultPalette);
}

// layers

export const compareLayers = (a: Layer, b: Layer) => parseWithNumber(a.name) - parseWithNumber(b.name);

export function getPatternLayers(layer: Layer) {
	return layer.children.filter(nameMatches(/^pattern/)).sort(compareLayers);
}

export function getPatternCanvases(layer: Layer): ExtCanvas[] {
	const canvases = getPatternLayers(layer).map(getCanvas);
	return dropRightWhile(canvases, isCanvasEmpty) as ExtCanvas[];
}

export function clipPattern(color: ExtCanvas, pattern: ExtCanvas | undefined): ExtCanvas | undefined {
	if (pattern) {
		const ctx = pattern.getContext('2d')!;
		ctx.globalCompositeOperation = 'destination-in';
		ctx.drawImage(color, 0, 0);
	}

	return pattern;
}
