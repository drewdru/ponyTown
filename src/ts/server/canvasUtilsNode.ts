/// <reference path="../../typings/my.d.ts" />

import { readFileAsync, readFileSync } from 'fs';
import { createCanvas as createNodeCanvas, Image } from 'canvas';
import { setup } from '../client/canvasUtils';

export const createCanvas = createNodeCanvas;

export async function loadImage(src: string) {
	const buffer = await readFileAsync(src);
	const image = new Image();
	image.src = buffer;
	return image;
}

export function loadImageSync(src: string) {
	const image = new Image();
	image.src = readFileSync(src);
	return image;
}

setup({ createCanvas: createNodeCanvas, loadImage });
