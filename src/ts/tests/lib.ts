/// <reference path="../../typings/my.d.ts" />

import '../server/boot';
import * as mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as del from 'del';
import { once, mapValues } from 'lodash';
import { spawnSync } from 'child_process';
import { createStubInstance, SinonStubbedInstance, stub } from 'sinon';
import { loadAndInitSheets } from '../client/spriteUtils';
import '../server/canvasUtilsNode';
import { setPaletteManager } from '../common/mixins';
import { mockPaletteManager } from '../common/ponyInfo';
import { spriteSheets } from '../generated/sprites';
import { pathTo } from '../server/paths';
import { loadImage, loadImageSync, createCanvas } from '../server/canvasUtilsNode';

require('chai').use(require('chai-as-promised'));

(mongoose as any).models = {};
(mongoose as any).modelSchemas = {};
(global as any).TESTS = true;
(global as any).TOOLS = true;
(global as any).performance = Date;

setPaletteManager(mockPaletteManager);

export function loadImageServer(src: string) {
	return loadImage(pathTo('assets', src));
}

export const loadSprites = once(() => loadAndInitSheets(spriteSheets, loadImageServer));

export function loadImageAsCanvas(filePath: string): HTMLCanvasElement {
	try {
		const image = loadImageSync(filePath);
		const expected = createCanvas(image.width, image.height);
		expected.getContext('2d')!.drawImage(image, 0, 0);
		return expected;
	} catch (e) {
		console.error(e);
	}

	return createCanvas(0, 0);
}

export function generateDiff(expectedPath: string, actualPath: string) {
	spawnSync(
		'magick', ['compare', actualPath, expectedPath, actualPath.replace(/\.png$/, '-diff.png')], { encoding: 'utf8' });
}

export async function clearCompareResults(group: string) {
	await del([pathTo('tools', 'temp', group, '*.png').replace(/\\/g, '/')]);
}

export function compareCanvases(
	expected: HTMLCanvasElement | undefined, actual: HTMLCanvasElement | undefined,
	filePath: string, group: string, diff = true
) {
	try {
		if (expected === actual)
			return;
		if (!expected)
			throw new Error(`Expected canvas is null`);
		if (!actual)
			throw new Error(`Actual canvas is null`);
		if (expected.width !== actual.width || expected.height !== actual.height)
			throw new Error(`Canvas size is different than expected`);

		const expectedData = expected.getContext('2d')!.getImageData(0, 0, expected.width, expected.height);
		const actualData = actual.getContext('2d')!.getImageData(0, 0, actual.width, actual.height);
		const length = expectedData.width * expectedData.height * 4;

		for (let i = 0; i < length; i++) {
			if (expectedData.data[i] !== actualData.data[i]) {
				const x = Math.floor(i / 4) % actualData.width;
				const y = Math.floor((i / 4) / actualData.width);
				throw new Error(`Actual canvas different than expected at (${x}, ${y})`);
			}
		}
	} catch (e) {
		if (actual && diff) {
			const tempRoot = pathTo('tools', 'temp', group);
			const tempPath = path.join(tempRoot, filePath ? path.basename(filePath) : `${Date.now()}-failed-test.png`);
			fs.writeFileSync(tempPath, actual.toBuffer());

			if (filePath) {
				generateDiff(filePath, tempPath);
			}
		}

		throw e;
	}
}

const testsPath = pathTo('src', 'tests', 'filters');

export function readTestsFile(fileName: string): string[] {
	const lines = fs.readFileSync(path.join(testsPath, fileName), 'utf8')
		.split(/\r?\n/g)
		.map(x => x.trim())
		.filter(x => !!x);

	for (let i = lines.length - 1; i > 0; i--) {
		if (lines.indexOf(lines[i]) < i) {
			console.error(`Duplicate line "${lines[i]}" in ${fileName}`);
		}
	}

	return lines;
}

export function createFunctionWithPromiseHandler(ctor: any, ...deps: any[]): any {
	return (...args: any[]) => {
		let result: any;
		const func = ctor(...deps, (promise: Promise<any>, handleError: any) => result = promise.catch(handleError));
		func(...args);
		return result;
	};
}

export function stubClass<T>(ctor: new (...args: any[]) => T): SinonStubbedInstance<T> {
	return createStubInstance(ctor) as any;
}

export function stubFromInstance<T>(instance: any): SinonStubbedInstance<T> {
	return mapValues(instance, () => stub()) as any;
}

export function resetStubMethods<T>(stub: SinonStubbedInstance<T>, ...methods: (keyof T)[]) {
	methods.forEach(method => {
		(stub[method] as any).resetBehavior();
		(stub[method] as any).reset();
	});
}
