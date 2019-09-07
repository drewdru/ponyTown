import * as fs from 'fs';
import * as path from 'path';
import { Layer as PsdLayer, Psd as PsdFile, readPsd, initializeCanvas } from 'ag-psd';
import { Layer, Psd } from './types';
import { createExtCanvas } from './canvas-utils';
import { matcher, parseWithNumber } from './common';

initializeCanvas((width, height) => createExtCanvas(width, height, 'loaded from psd'));

export function openPsd(filePath: string) {
	try {
		const buffer = fs.readFileSync(filePath);
		const name = path.basename(filePath, '.psd');
		const dir = path.basename(path.dirname(filePath));
		const psd = readPsd(buffer, {
			skipCompositeImageData: true,
			skipThumbnail: true,
			throwForMissingFeatures: true,
			logMissingFeatures: true,
		});
		return toPsd(psd, name, dir);
	} catch (e) {
		console.error(`Failed to load: ${filePath}: ${e.message}`);
		throw e;
	}
}

function toPsd({ width, height, children }: PsdFile, name: string, dir: string): Psd {
	const info = `${dir}/${name}`;

	return {
		dir, name, width, height, info, children: (children || []).map(c => toLayer(c, width, height, info)),
	};
}

function toLayer({ name, canvas, left, top, children }: PsdLayer, width: number, height: number, parentInfo: string): Layer {
	const info = `${parentInfo}/${name}`;

	return {
		name: name || '<noname>',
		info,
		canvas: fixCanvas(canvas, width, height, left || 0, top || 0, info),
		children: (children || []).map(c => toLayer(c, width, height, info)),
	};
}

function fixCanvas(
	canvas: HTMLCanvasElement | undefined, width: number, height: number, left: number, top: number, info: string
) {
	if (!canvas)
		return undefined;

	const result = createExtCanvas(width, height, info);
	result.getContext('2d')!.drawImage(canvas, left, top);
	return result;
}

const isPsd = matcher(/\.psd$/);

export const getPsds = (directory: string) => fs.readdirSync(directory).filter(isPsd);

export function openPsdFiles(directory: string, match?: RegExp) {
	return getPsds(directory)
		.filter(f => match ? match.test(f) : true)
		.sort((a, b) => parseWithNumber(a) - parseWithNumber(b))
		.map(f => path.join(directory, f))
		.map(openPsd);
}
