/* tslint:disable */

require('source-map-support').install();

(global as any).BETA = false;

import * as fs from 'fs';
import * as path from 'path';
import {
	max, range, flatten, mapValues, dropRightWhile, isEqual, uniq, times, compact, includes, toPairs,
} from 'lodash';
import {
	ColorShadow, Nose, Eye, Tree, Animation, ColorExtra, Button, Emote, Layer, Sprite, ExtCanvas, Psd,
	Result, TileSprites
} from './types';
import {
	findLayer, mkdir, cartesian, findLayerSafe, getCanvas, getLayerCanvas, getLayerCanvasSafe,
	getCanvasSafe, matcher, getDirectories, trimRight, addSprite, createSprite,
	TRANSPARENT, BLACK, defaultPalette, WHITE, OUTLINE_COLOR, SHADE_COLOR, TONGUE_COLOR, MOUTH_COLOR,
	TEETH_COLOR, TEETH_SHADE_COLOR, LIGHT_SHADE_COLOR, compareLayers, addImage,
	addSpriteWithColors, createPixelSprites, nameMatches, getPatternCanvases, clipPattern
} from './common';
import { createSpriteSheet, imageToSprite, saveSpriteSheet, saveCanvasAsRaw, saveSpriteSheetAsBinary } from './sprite-sheet';
import { tilesToSprites } from './convert-tiles';
import { createFont, FontSprite, createEmojis } from './create-font';
import {
	padCanvas, cropCanvas, mergeCanvases, colorCanvas, maskCanvas, saveCanvas, imageToCanvas,
	isCanvasEmpty, forEachPixel, mapColors, createExtCanvas, forEachPixelOf2Canvases,
	cropAndPadByColRow, cropByIndex, ByIndexGetter, reverseMaskCanvas, loadImage, mirrorCanvas,
} from './canvas-utils';
import { openPsd, openPsdFiles } from './psd-utils';
import { sheets, Sheet } from '../common/sheets';
import { colorToCSS } from '../common/color';
import { bitWriter } from '../common/bitUtils';

const head0Indices = [0, 1, 2, 4, 7, 8, 9, 10, 12, 13, 14, 16, 18, 19]; // regular
const head1Indices = [0, 1, 3, 5, 6, 8, 9, 11, 12, 13, 15, 17, 18, 19]; // clipped

const MAX_PALETTE_SIZE = 128;
const { assetsPath } = require('../../../config.json');
const rootPath = path.join(__dirname, '..', '..', '..');
const sourcePath = path.join(assetsPath);
const generatedPath = path.join(rootPath, 'src', 'ts', 'generated');
const outputPath = path.join(rootPath, 'tools', 'output');
const destPath = path.join(rootPath, 'tools', 'output', 'images');
const ponyPath = path.join(sourcePath, 'pony');

const shadowPalette = [TRANSPARENT, BLACK];
const isPng = matcher(/\.png$/);
const getPngs = (directory: string) => fs.readdirSync(directory).filter(isPng);
const getFrames = (layers: Layer[]) => layers.filter(nameMatches(/^frame/)).sort(compareLayers);
const ponyPsd = (name: string) => openPsd(path.join(ponyPath, name));

function openPng(fileName: string) {
	return imageToCanvas(loadImage(fileName));
}

function createPaletteFromList(canvases: ExtCanvas[]) {
	return canvases.reduce<number[]>((pal, can) => createPalette(can, pal), []);
}

function createPaletteFromLayers(layers: Layer[]) {
	return createPaletteFromList(layers.map(getCanvasSafe));
}

function addCMSprite(sprites: Sprite[], flip: boolean, ox = 43, oy = 49) {
	const canvas = createExtCanvas(5, 5, 'cm');
	const context = canvas.getContext('2d')!;
	const imageData = context.getImageData(0, 0, 5, 5);

	for (let i = 0, y = 0; y < 5; y++) {
		for (let x = 0; x < 5; x++) {
			imageData.data[i++] = flip ? (y * 5 + (4 - x)) : (y * 5 + x);
			imageData.data[i++] = 255;
			imageData.data[i++] = 0;
			imageData.data[i++] = 255;
		}
	}

	context.putImageData(imageData, 0, 0);
	sprites.push(createSprite(sprites.length, padCanvas(canvas, ox, oy), { x: ox, y: oy, w: 5, h: 5 }));
	return sprites.length - 1;
}

function createPalette(canvas: ExtCanvas, palette: number[] = []) {
	forEachPixel(canvas, c => {
		if (!includes(palette, c)) {
			palette.push(c);
		}
	});

	if (palette.length > MAX_PALETTE_SIZE) {
		throw new Error(`Exceeded max palette size ${palette.length}/${MAX_PALETTE_SIZE} (${canvas.info})`);
	}

	return palette.sort((a, b) => a - b);
}

function splitButton(canvas: ExtCanvas, border: number) {
	return {
		topLeft: cropCanvas(canvas, 0, 0, border, border),
		top: cropCanvas(canvas, border, 0, canvas.width - border * 2, border),
		topRight: cropCanvas(canvas, canvas.width - border, 0, border, border),
		left: cropCanvas(canvas, 0, border, border, canvas.height - border * 2),
		bg: cropCanvas(canvas, border, border, canvas.width - border * 2, canvas.height - border * 2),
		right: cropCanvas(canvas, canvas.width - border, border, border, canvas.height - border * 2),
		bottomLeft: cropCanvas(canvas, 0, canvas.height - border, border, border),
		bottom: cropCanvas(canvas, border, canvas.height - border, canvas.width - border * 2, border),
		bottomRight: cropCanvas(canvas, canvas.width - border, canvas.height - border, border, border),
	};
}

// main methods

function getEyesFromPsd({ objects2, sprites }: Result, eyesPsd: Psd, irisesPsd: Psd) {
	const eyeCount = 24;
	const left = 20;
	const top = 20;
	const rightEyeWidth = 12;
	const perLine = 10;
	const h = 30, dx = 30, dy = 30;
	const irisesCount = 8;

	const irises = colorCanvas(getLayerCanvasSafe('irises', irisesPsd), 'white');
	const whites = getLayerCanvasSafe('whites', eyesPsd);
	const lineart = getLayerCanvasSafe('lineart', eyesPsd);
	const eyeshadow = getLayerCanvasSafe('eyeshadow', eyesPsd);
	const bases = [mergeCanvases(whites, lineart), ...findLayerSafe('eyelashes', eyesPsd).children
		.sort(compareLayers)
		.map(getCanvas)
		.map(c => mergeCanvases(whites, lineart, c))];
	const shadow = colorCanvas(eyeshadow, 'white');
	const shine = mapColors(eyeshadow, c => c === 0xffffffff ? c : 0);

	const getRightEye = cropAndPadByColRow(left, top, rightEyeWidth, h, dx, dy, left, top);
	const getLeftEye = cropAndPadByColRow(left + rightEyeWidth, top, 30 - rightEyeWidth, h, dx, dy, left + rightEyeWidth, top);
	const getRight = cropByIndex(getRightEye, perLine);
	const getLeft = cropByIndex(getLeftEye, perLine);

	// const mirrored = (get: ByIndexGetter): ByIndexGetter => (canvas, index) => mirrorCanvas(get(canvas, index), -15);

	const palette = [0, WHITE, BLACK]; // 

	const getEye = (get: ByIndexGetter) => (i: number) => bases.map(base => {
		const s = addSprite(sprites, get(shadow, i), undefined, palette);

		return <Eye>{
			base: addSprite(sprites, get(base, i), undefined, palette),
			irises: range(0, irisesCount)
				.map(j => maskCanvas(get(irises, j), get(whites, i)))
				.map(canvas => addSprite(sprites, canvas, undefined, palette)),
			shadow: s ? s : addSprite(sprites, get(shadow, 0), undefined, palette),
			shine: s ? addSprite(sprites, get(shine, i), undefined, palette) : addSprite(sprites, get(shine, 0), undefined, palette),
		};
	});

	objects2['eyeRight: PonyEyes'] = [null, ...range(0, eyeCount).map(getEye(getRight))];
	objects2['eyeLeft: PonyEyes'] = [null, ...range(0, eyeCount).map(getEye(getLeft))];
	// objects2['eyeRight2: PonyEyes'] = [null, ...range(0, eyeCount).map(getEye(mirrored(getLeft)))];
}

function getBlushFromPsd({ sprites, objects2 }: Result, psd: Psd) {
	objects2.blush = addSprite(sprites, getLayerCanvasSafe('color', psd));
}

function getPonyShadowsAndSelection({ sprites, objects2 }: Result, psd: Psd) {
	const count = 5;
	const shadow = colorCanvas(getLayerCanvasSafe('shadow', psd), 'white');
	const selection = getLayerCanvasSafe('selection', psd);
	const crop = cropAndPadByColRow(0, 0, psd.width, 10, 0, 10);

	objects2.ponyShadows = times(count, i => crop(shadow, 0, i)).map(c => addSprite(sprites, c));
	objects2.ponySelections = times(count, i => crop(selection, 0, i)).map(c => addSprite(sprites, c));
}

function splitMuzzleMouth(canvas: ExtCanvas) {
	const muzzleCanvas = mapColors(canvas, c => (c === WHITE || c === OUTLINE_COLOR || c === SHADE_COLOR) ? c : 0);
	const mouthCanvas = mapColors(canvas, c => {
		if (c === MOUTH_COLOR || c === TONGUE_COLOR) {
			return c;
		} else if (c === TEETH_COLOR) {
			return WHITE;
		} else if (c === TEETH_SHADE_COLOR) {
			return LIGHT_SHADE_COLOR;
		} else {
			return 0;
		}
	});

	return { mouthCanvas, muzzleCanvas };
}

function getMuzzlesFromPsd({ sprites, objects2 }: Result, psd: Psd) {
	const columns = 5;
	const typeCount = 2;
	const expressionsPerLine = 5;
	const expressionList = [
		0, 1, 24, 4, 9,
		5, 2, 3, 8, 10,
		11, 12, 13, 14, 15,
		17, 18, 19, 20, 21,
		22, 23, 30, 32, 6,
		33,
	];

	const { mouthCanvas, muzzleCanvas } = splitMuzzleMouth(getLayerCanvasSafe('muzzle', psd));
	const fangsCanvas = colorCanvas(getLayerCanvasSafe('fangs', psd), 'white');
	const noseCanvas = colorCanvas(getLayerCanvasSafe('nose', psd), 'white');
	const noseMuzzleCanvas = muzzleCanvas; // mergeCanvases(muzzleCanvas, noseCanvas);
	const nosePatternCanvas = mergeCanvases(colorCanvas(muzzleCanvas, 'red'), colorCanvas(noseCanvas, '#00ff00'));
	const getImage = cropAndPadByColRow(20, 20, 30, 30, 30, 30, 20, 20);
	const muzzleIndices = [...range(0, typeCount), -1];

	saveCanvas(path.join(outputPath, 'noseMuzzleCanvas.png'), noseMuzzleCanvas);
	saveCanvas(path.join(outputPath, 'nosePatternCanvas.png'), nosePatternCanvas);

	// [expression][type][pattern]
	objects2['noses: PonyNose[][][]'] = expressionList.map(expression => muzzleIndices.map(type => {
		const x = expression % expressionsPerLine + (type > 0 ? type : 0) * columns;
		const y = Math.floor(expression / expressionsPerLine);
		const fangs = addSprite(sprites, getImage(fangsCanvas, x, y)) || 0;
		const mouth = addSprite(sprites, getImage(mouthCanvas, x, y), undefined, defaultPalette);

		if (type < 0) {
			const color = getImage(noseMuzzleCanvas, x, y);
			const pattern = getImage(nosePatternCanvas, x, y);
			return [{ ...addSpriteWithColors(sprites, color, pattern), mouth, fangs }];
		} else {
			return [{ color: addSprite(sprites, getImage(muzzleCanvas, x, y)), colors: 3, mouth, fangs }];
		}
	}));
}

interface SetImportInfo {
	name: string;
	layerName: string;
	mask?: string;
	reverse?: boolean;
	maskFile?: string;
	mirror?: boolean;
	mirrorOffsetX?: number;
}

function getSetNameLayer(sheet: Sheet): SetImportInfo[] {
	const layersWithSets = sheet.layers.filter(l => l.set);

	return [
		...layersWithSets.map(l => ({
			name: l.set!,
			layerName: l.name
		})),
		...layersWithSets.filter(l => !!l.importMirrored).map(l => ({
			name: l.importMirrored!.fieldName!,
			layerName: l.name,
			mirror: true,
			mirrorOffsetX: l.importMirrored!.offsetX,
		})),
	];
}

function importSprites({ sprites, objects2 }: Result, sheet: Sheet) {
	const psd = ponyPsd(`${sheet.file}.psd`);
	const { width, height, offset, offsetY = 0, padLeft = 0, padTop = 20, wrap = 0, importOffsets } = sheet;
	const setsWithEmpties = sheet.setsWithEmpties;
	let frameCount = Math.floor(psd.width / offset);
	let typeCount = Math.floor(psd.height / height);
	let getImage = cropAndPadByColRow(padLeft, 0, width, height, offset, height, 10 + padLeft, padTop - offsetY);
	let hasExtra = false;

	if (wrap) {
		typeCount = typeCount * frameCount;
		frameCount = 1;
		const oldGet = getImage;
		getImage = (canvas, _, type) => oldGet(canvas, type % wrap, Math.floor(type / wrap));
	} else if (sheet.single) {
		typeCount = typeCount * frameCount;
		frameCount = 1;
		const oldGet = getImage;
		getImage = (canvas, _, type) => oldGet(canvas, type, 0);
	}

	const sets: SetImportInfo[] = [
		...getSetNameLayer(sheet),
		...(sheet.masks || []),
	];

	const maskFiles: any = {};

	if (sheet.masks) {
		compact(sheet.masks.map(m => m.maskFile))
			.forEach(file => maskFiles[file] = openPsd(path.join(ponyPath, file + '.psd')));
	}

	const animations = sets.map(({ layerName, name, mask, reverse, maskFile, mirror, mirrorOffsetX }) => {
		const layer = findLayerSafe(layerName, psd);
		let color = getLayerCanvasSafe('color', layer);
		const extraCanvas = sheet.extra ? getLayerCanvas('extra', layer) : undefined;
		const patterns = getPatternCanvases(layer);

		if (mask) {
			const maskColor = getLayerCanvasSafe(mask, maskFiles[maskFile || ''] || psd);
			const maskRepeated = createExtCanvas(psd.width, psd.height, `${maskColor.info} repeated`);
			const maskContext = maskRepeated.getContext('2d')!;

			for (let i = 0; i < typeCount; i++) {
				maskContext.drawImage(maskColor, 0, i * (height + offsetY));
			}

			color = maskCanvas(color, reverse ? reverseMaskCanvas(maskRepeated) : maskRepeated);
		}

		// [frame][type][pattern]
		const frames = trimRight(range(0, frameCount).map(frame => {
			return trimRight(range(0, typeCount).map(type => {
				const { x, y } = importOffsets && importOffsets[frame] || { x: 0, y: 0 };
				const getAndPadBase = (canvas: ExtCanvas) => padCanvas(getImage(canvas, frame, type), -x, -y);
				const getAndPad = mirror ? (canvas: ExtCanvas) => mirrorCanvas(getAndPadBase(canvas), mirrorOffsetX) : getAndPadBase;
				const accessoryFrame = getAndPad(color);
				const extraFrame = extraCanvas && getAndPad(extraCanvas);

				if (isCanvasEmpty(accessoryFrame)) {
					return null;
				} else {
					let extraProps: any = {};

					if (extraFrame) {
						const palette = createPalette(extraFrame);
						const extra = addSprite(sprites, extraFrame, undefined, palette);
						extraProps = { extra, palette };
						hasExtra = true;
					}

					const patternCanvases = patterns
						.map(getAndPad)
						.map(pattern => clipPattern(accessoryFrame, pattern));

					return dropRightWhile(patternCanvases, isCanvasEmpty)
						.map(patternFrame => <ColorExtra>{
							...addSpriteWithColors(sprites, accessoryFrame, patternFrame),
							...extraProps
						});
				}
			}));
		}));

		return { name, frames };
	});

	// fill-in missing types
	if (animations.length > 1) {
		animations.forEach(({ frames }) => {
			frames.forEach((types, i) => {
				const typeCount = max(animations.map(({ frames }) => frames[i] ? frames[i]!.length : 0))!;

				while (types && types.length < typeCount) {
					types.push([]);
				}
			});
		});
	}

	// fix pattern color counts
	if (sheet.single) {
		const groups = sheet.groups || [animations.map(a => a.name)];
		const colorCounts: number[][][] = groups.map(() => []); // [group][type][pattern]

		animations.forEach(({ name, frames }) => {
			const gi = groups.findIndex(g => includes(g, name));
			const groupColorCounts = colorCounts[gi];

			frames.forEach(types => {
				(types || []).forEach((patterns, ti) => {
					groupColorCounts[ti] = groupColorCounts[ti] || [];

					(patterns || []).forEach((pattern, pi) => {
						if (pattern) {
							groupColorCounts[ti][pi] = Math.max(pattern.colors, groupColorCounts[ti][pi] || 0);
						}
					});
				});
			});
		});

		animations.forEach(({ name, frames }) => {
			const gi = groups.findIndex(g => includes(g, name));
			const groupColorCounts = colorCounts[gi];

			frames.forEach(types => {
				(types || []).forEach((patterns, ti) => {
					(patterns || []).forEach((pattern, pi) => {
						if (pattern) {
							pattern.colors = groupColorCounts[ti] && groupColorCounts[ti][pi] || 0;
						}
					});
				});
			});
		});
	}

	animations.map(({ name, frames }) => {
		if (sheet.empties && setsWithEmpties && includes(setsWithEmpties, name)) {
			for (let i = 0; i < frames.length; i++) {
				frames[i] = frames[i] && frames[i]!.filter((_, j) => !includes(sheet.empties, j));
			}
		}

		if (sheet.single) {
			objects2[`${name}: StaticSprites${hasExtra ? 'Extra' : ''}`] = frames[0];
		} else {
			objects2[`${name}: AnimatedSprites`] = frames;
		}
	});
}

function getTreesFromPsd({ sprites, objects2 }: Result, psd: Psd, name: string, palettes?: number[][]) {
	const groups = psd.children.filter(c => c.children && c.children.length).sort(compareLayers);
	const width = psd.width / groups.length;
	const spr = (name: string, index: number, palette: number[], parent: Layer) => {
		const canvas = getLayerCanvasSafe(name, parent);
		const cropped = cropCanvas(canvas, width * index, 0, width, canvas.height);
		return addSprite(sprites, cropped, undefined, palette);
	};

	const children = flatten(groups.map(c => c.children));
	const trunkPalettes = palettes || [createPaletteFromLayers(children.filter(l => /^(stump|trunk)$/.test(l.name)))];
	const crownPalettes = palettes || [createPaletteFromLayers(children.filter(l => /crown/.test(l.name)))];

	const hasStumpWinter = children.some(l => /stump winter/.test(l.name));
	const stumpWinterPalettes = hasStumpWinter ? [createPaletteFromLayers(children.filter(l => /stump winter/.test(l.name)))] : [];

	groups.forEach((group, index) => {
		objects2[`${name}Stump${index}`] = {
			color: spr('stump', index, trunkPalettes[0], group),
			//shadow: spr('stump shadow', index, shadowPalette, group),
			palettes: trunkPalettes,
		};

		if (hasStumpWinter) {
			objects2[`${name}StumpWinter${index}`] = {
				color: spr('stump winter', index, stumpWinterPalettes[0], group),
				//shadow: spr('stump shadow', index, shadowPalette, group),
				palettes: stumpWinterPalettes,
			};
		}

		if (findLayer('trunk', group)) {
			objects2[`${name}Trunk${index}`] = {
				color: spr('trunk', index, trunkPalettes[0], group),
				palettes: trunkPalettes,
			};
		}

		const crown = spr('crown', index, crownPalettes[0], group);

		for (let i = 0; i < groups.length; i++) {
			objects2[`${name}Crown${index}_${i}`] = {
				color: crown,
				shadow: spr(`shadow ${index + 1}`, i, shadowPalette, groups[i]),
				palettes: crownPalettes,
			};
		}
	});
}

function getTreesOrObjectFromPsd(result: Result, psd: Psd, name: string, palettes: number[][]) {
	if (findLayer('color', psd)) {
		const color = getLayerCanvas('color', psd);
		const shadow = getLayerCanvas('shadow', psd);
		addColorShadow(result, name, color, shadow, palettes);
	} else {
		getTreesFromPsd(result, psd, name, palettes);
	}
}

function getTreeStagesFromPsds(result: Result, psds: Psd[], name: string) {
	const groups = range(1, 3).map(i => `tree ${i}`);
	const layers = ['crown', 'trunk', 'stump'];
	const palettes = createPalettes(psds, ['color', ...cartesian(groups, layers).map(([a, b]) => `${a}/${b}`)]);

	psds
		.filter(psd => !isPalettePsd(psd))
		.forEach(psd => getTreesOrObjectFromPsd(result, psd, `${name}_${psd.name}`, palettes));
}

function getTreesFromPsds(result: Result, directory: string) {
	getDirectories(directory)
		.filter(dir => !/^_/.test(path.basename(dir)))
		.forEach(dir => getTreeStagesFromPsds(result, openPsdFiles(dir, /\d+\.psd$/), path.basename(dir)));
}

function addColorShadow(
	{ sprites, objects2 }: Result, name: string, color: ExtCanvas | undefined,
	shadow: ExtCanvas | undefined, palettes: number[][] | undefined
) {
	objects2[name] = {
		color: addSprite(sprites, color, undefined, palettes && palettes[0]),
		shadow: addSprite(sprites, shadow, undefined, shadowPalette),
		palettes,
	};
}

function getObjectFromPsd(result: Result, psd: Psd, name: string) {
	const color = getLayerCanvas('color', psd);
	const shadow = getLayerCanvas('shadow', psd);
	const palettes = color ? [createPalette(color)] : undefined;
	addColorShadow(result, name, color, shadow, palettes);
}

function createOtherPalette(basePalette: number[], base: ExtCanvas, color: ExtCanvas, palette: number[]): number[] {
	forEachPixelOf2Canvases(base, color, (b, c) => {
		if (b !== c) {
			const index = basePalette.indexOf(b);

			if (index === -1) {
				throw new Error(`cannot find color in palette`);
			}

			palette[index] = c;
		}
	});

	return palette;
}

function otherPaletteFromPsd(basePalette: number[], basePsd: Psd, palettePsd: Psd, palette: number[], layers: string[]) {
	return layers.reduce((palette, layer) => {
		const base = getLayerCanvas(layer, basePsd);
		const pal = getLayerCanvas(layer, palettePsd);
		return base && pal ? createOtherPalette(basePalette, base, pal, palette) : palette;
	}, palette);
}

function isPalettePsd(psd: Psd) {
	return /^palette_/.test(psd.name);
}

function getLayerCanvases(names: string[], psd: Psd) {
	return compact(names.map(name => getLayerCanvas(name, psd)));
}

function createPalettes(psds: Psd[], layers: string[]) {
	const main = psds.filter(psd => !isPalettePsd(psd));
	const canvases = flatten(main.map(psd => getLayerCanvases(layers, psd)));
	const palette = createPaletteFromList(canvases);
	const otherPalettes = psds
		.filter(isPalettePsd)
		.map(psd => {
			const [, index, name] = psd.name.split('_');
			return { index: +index, name, psd };
		});
	const paletteCount = max(otherPalettes.map(p => p.index)) || 0;
	const other = range(1, paletteCount + 1)
		.map(i => otherPalettes.filter(p => p.index === i))
		.filter(x => x.length)
		.map(x => x.map(({ name, psd }) => ({ base: main.find(x => x.name === name)!, psd })))
		.map(x => x.reduce((pal, { base, psd }) => otherPaletteFromPsd(palette, base, psd, pal, layers), palette.slice()));

	return [palette, ...other];
}

function getObjectGroupFromPsd(result: Result, psds: Psd[], dir: string) {
	const palettes = createPalettes(psds, ['color']);

	psds
		.filter(psd => !isPalettePsd(psd))
		.forEach(psd => {
			const color = getLayerCanvas('color', psd);
			const shadow = getLayerCanvas('shadow', psd);
			addColorShadow(result, `${dir}_${psd.name}`, color, shadow, palettes);
		});
}

function getObjectsFromPsds(result: Result, directory: string) {
	openPsdFiles(directory, /psd$/)
		.forEach(psd => getObjectFromPsd(result, psd, psd.name));

	getDirectories(directory)
		.filter(dir => !/^_/.test(path.basename(dir)))
		.forEach(dir => {
			const files = openPsdFiles(dir, /psd$/)
				.filter(psd => !/^_/.test(path.basename(psd.name)));

			getObjectGroupFromPsd(result, files, path.basename(dir));
		});
}

function createOtherSprites({ objects, images }: Result, directory: string) {
	getPngs(directory).forEach(f => {
		const canvas = openPng(path.join(directory, f));
		const name = path.basename(f, '.png');
		objects[name] = addImage(images, canvas);
	});
}

function createOtherSpritesPalette({ objects2, sprites }: Result, directory: string) {
	getPngs(directory).forEach(f => {
		const canvas = openPng(path.join(directory, f));
		const name = path.basename(f, '.png');
		const palette = createPalette(canvas);
		const color = addSprite(sprites, canvas, undefined, palette);
		objects2[name + '_2'] = { color, palette };
	});
}

function createIcons({ objects2, sprites }: Result, directory: string) {
	getPngs(directory).forEach(f => {
		const canvas = openPng(path.join(directory, f));
		const name = path.basename(f, '.png');
		objects2[name] = addSprite(sprites, canvas, undefined, defaultPalette);
	});
}

function createOtherSpritesAnimations({ objects, images }: Result, directory: string) {
	openPsdFiles(directory).forEach(psd => {
		const canvases = getFrames(psd.children).map(getCanvas);
		const frames = canvases.map(c => c ? addImage(images, c) : 0);
		objects[psd.name] = { frames };
	});
}

function createButtons({ objects, objects2, images, sprites }: Result, directory: string) {
	getPngs(directory).forEach(f => {
		const [, name, borderText] = /^(.+)-(\d+)$/.exec(path.basename(f, '.png')) as string[];
		const border = +borderText;
		const canvas = openPng(path.join(directory, f));
		const canvases = splitButton(canvas, border);
		objects[name] = { border, ...mapValues(canvases, c => addImage(images, c)) };

		const palette = createPalette(canvas);
		objects2[name + '_2'] = { border, palette, ...mapValues(canvases, c => addSprite(sprites, c, undefined, palette)) };
	});
}

const lightsPad = 4;

function createLights({ objects, images }: Result, directory: string) {
	return getPngs(directory).map(f => {
		const canvas = openPng(path.join(directory, f));
		const name = path.basename(f, '.png');
		return objects[name] = addImage(images, padCanvas(canvas, lightsPad, lightsPad, lightsPad, lightsPad, 'black'));
	});
}

function createAnimations({ objects2, sprites }: Result, directory: string) {
	getPngs(directory).forEach(f => {
		const [, name, w, h] = /^(.+)-(\d+)x(\d+)\.png$/.exec(f)!;
		const canvas = imageToCanvas(loadImage(path.join(directory, f)));
		const spriteWidth = canvas.width / +w;
		const spriteHeight = canvas.height / +h;
		const palette = createPalette(canvas);
		const frames = cartesian(range(+w), range(+h))
			.map(([x, y]) => cropCanvas(canvas, x * spriteWidth, y * spriteHeight, spriteWidth, spriteHeight))
			.map(bitmap => addSprite(sprites, bitmap, undefined, palette));

		objects2[name] = { frames, palette } as Animation;
	});

	openPsdFiles(directory).forEach(psd => {
		const canvases = getFrames(psd.children).map(getCanvas);
		const palette = createPaletteFromList(compact(canvases));
		const frames = canvases.map(c => addSprite(sprites, c, undefined, palette));
		const shadowLayer = findLayer('shadow', psd);
		const shadow = shadowLayer ? addSprite(sprites, getCanvas(shadowLayer), undefined, shadowPalette) : undefined;

		objects2[psd.name] = { frames, palette, shadow } as Animation;
	});

	getDirectories(directory)
		.filter(dir => !/^_/.test(path.basename(dir)))
		.forEach(dir => {
			const psds = openPsdFiles(dir);
			const dirName = path.basename(dir);
			const canvases = flatten(psds.map(psd => compact(psd.children.filter(x => /^frame/i.test(x.name)).map(x => getCanvas(x)))));
			const palette = createPaletteFromList(canvases);

			for (const psd of psds) {
				const canvases = getFrames(psd.children).map(getCanvas);
				const frames = canvases.map(c => addSprite(sprites, c, undefined, palette));
				const shadowLayer = findLayer('shadow', psd);
				const shadow = shadowLayer ? addSprite(sprites, getCanvas(shadowLayer), undefined, shadowPalette) : undefined;

				objects2[`${dirName}_${psd.name}`] = { frames, palette, shadow } as Animation;
			}
		});
}

function createEmoteAnimations({ objects2, sprites }: Result, directory: string) {
	openPsdFiles(directory).forEach(psd => {
		const frames = getFrames(psd.children)
			.map(getCanvasSafe)
			.map(c => addSprite(sprites, c, undefined, defaultPalette));

		objects2[psd.name] = { frames, palette: [] } as Animation;
	});
}

// .ts file generation

const palettes = [defaultPalette];

function createObject(name: string, value: any) {
	if (!/^[a-z_][a-z0-9_]*(: [a-z]+(\[\])*)?$/i.test(name)) {
		throw new Error(`Invalid sprite name (${name})`);
	}

	return `export const ${name} = ${obj(value, name, true)};\n`;
}

function encodeArray(items: any[]) {
	return `[${items.join(', ')}]`;
}

function addPalette(palette: number[]) {
	const index = palettes.findIndex(p => isEqual(p, palette));
	const paletteIndex = index === -1 ? (palettes.push(palette) - 1) : index;
	return paletteIndex;
}

function addPalettes(palettes: number[][]) {
	return `[${palettes.map(addPalette).join(', ')}]`;
}

function obj(value: any, name: string, indent = false): string {
	if (value == null) {
		return 'undefined';
	} else if (typeof value === 'string') {
		return value;
	} else if (typeof value === 'number') {
		return `sprites[${value.toString()}]`;
	} else if (Array.isArray(value)) {
		if (/: StaticSprites(Extra)?$/.test(name)) {
			// [type][pattern]
			const types = value as (({ color: number; colors: number; extra?: number; palette?: number[]; } | null)[] | null)[];
			const key = name.replace(/: StaticSprites(Extra)?/, '');
			const lines: string[] = [];
			// const typeCount = types.length;
			// const patternCounts = types.map(type => type ? type.length : 0);
			// const patternCountMax = max(patternCounts)!;
			// const emptyLine = times(patternCountMax, () => 0);
			// const colorsCounts = types.map(type => {
			// 	type = type || [];
			// 	// console.log(type);
			// 	return [...type.map(p => p!.colors), ...emptyLine.slice(0, patternCountMax - type.length)];
			// });

			// lines.push(`/* NEW */ export const ${key}SpritesArray = mapSprites2([\n${
			// 	types.map(patterns => `  ${
			// 		padArray(patterns, patternCountMax, { color: 0, colors: 0 }).map(x => x!.color).join(', ')
			// 		},`).join('\n')
			// 	}\n]);`);

			// lines.push(`/* NEW */ export const ${key}TypeCount = ${typeCount};`);
			// lines.push(`/* NEW */ export const ${key}PatternCounts = [${patternCounts.join(', ')}];`);
			// lines.push(`/* NEW */ export const ${key}PatternCountsMax = ${patternCountMax};`);
			// lines.push(`/* NEW */ export const ${key}PatternColorCounts = [\n` +
			// 	`${colorsCounts.map(counts => `  ${counts.join(', ')},`).join('\n')}` +
			// 	`\n];`);

			if (/Extra$/.test(name)) {
				lines.push(`export const ${key}Extra: StaticSprites = [\n${
					types.map(patterns => patterns ?
						`\t[${patterns.map(x => x!.extra ?
							`createColorPalette(${x!.extra}, [${addPalette(x!.palette!)}])` :
							'emptyColorPalette()').join(', ')}],` :
						'\tundefined,'
					).join('\n')}\n];`);
			}

			const items = `\n${value.map((x, i) => '\t' + obj(x, `${name}[${i}]`)).join(',\n')}\n`;
			return `[${indent ? items : items.replace(/\t/g, '').replace(/\n/g, ' ').trim()}];` +
				'\n' + lines.join('\n') + '\n';
		} else {
			const items = `\n${value.map((x, i) => '\t' + obj(x, `${name}[${i}]`)).join(',\n')}\n`;
			return `[${indent ? items : items.replace(/\t/g, '').replace(/\n/g, ' ').trim()}]`;
		}
	} else {
		return createObj(value, name);
	}
}

function encodeColor(value: number) {
	const alpha = value & 0xff;

	if (alpha === 0) {
		return '0';
	} else if (alpha !== 0xff) {
		return value.toString(16).padStart(8, '0');
	} else {
		return (value >>> 8).toString(16).padStart(6, '0');
	}
}

function createObj(
	s: ColorShadow & Nose & Eye & Tree & Animation & ColorExtra & TileSprites & Button & Emote, name: string
) {
	if (s.frames && s.palette && s.shadow) {
		return `createAnimationShadow(${encodeArray(s.frames)}, ${s.shadow}, ${addPalette(s.palette)})`;
	} else if (s.frames && s.palette) {
		return `createAnimationPalette(${encodeArray(s.frames)}, ${addPalette(s.palette)})`;
	} else if (s.frames) {
		return `createAnimation(${encodeArray(s.frames)})`;
	} else if (s.fangs != null) {
		return `createNose(${s.color}, ${s.colors}, ${s.mouth}, ${s.fangs})`;
	} else if (s.color && s.colors && s.extra && s.palette) {
		return `createColorExtraPal(${s.color}, ${s.colors}, ${s.extra}, [${addPalette(s.palette)}])`;
	} else if (s.color && s.colors) {
		return `colorPal${s.colors}(${s.color})`;
	} else if (s.base && s.irises != null) {
		return `createEye(${s.base}, ${encodeArray(s.irises)}, ${s.shadow}, ${s.shine})`;
	} else if (s.color && s.shadow && s.palettes) {
		return `createColorShadowPalette(${s.color}, ${s.shadow}, ${addPalettes(s.palettes)})`;
	} else if (s.color && s.palettes) {
		return `createColorPalette(${s.color}, ${addPalettes(s.palettes)})`;
	} else if (s.sprites && s.palettes) {
		return `createSpritesPalette(${encodeArray(s.sprites)}, ${addPalettes(s.palettes)})`;
	} else if (s.color && s.palette) {
		return `/* no palettes */ createColorPalette(${s.color}, [${addPalette(s.palette)}])`;
	} else if (s.color && s.shadow) {
		return `createColorShadow(${s.color}, ${s.shadow})`;
	} else if (s.color) {
		return `createColor(${s.color})`;
	} else if (s.shadow) {
		return `createShadow(${s.shadow})`;
	} else if (s.topLeft) {
		return `createButton(${s.border}, ${s.topLeft}, ${s.top}, ${s.topRight}, ${s.left}, ${s.bg},`
			+ ` ${s.right}, ${s.bottomLeft}, ${s.bottom}, ${s.bottomRight})`;
	} else if (s.name && s.sprite) {
		return `createEmote('${s.name}', ${s.sprite})`;
	} else {
		throw new Error(`Failed '${name}' createSprite(${JSON.stringify(s)})`);
	}
}

function spriteType({ shade, layer }: Sprite) {
	return shade ? (layer ? layer - 1 : (layer || 0)) : (3 + (layer || 0));
}

let minOX = 0, minOY = 0;
let maxOX = 0, maxOY = 0;
let maxW = 0, maxH = 0;

function toHex(value: number): string {
	const result = value.toString(16);
	return result.length === 1 ? `0${result}` : result;
}
function encodeSprite(s: Sprite) {
	if (s.x > 0xfff || s.y > 0xfff || s.ox > 0xff || s.oy > 0xff || s.w > 0x1ff || s.h > 0x1ff || spriteType(s) > 0x3f) {
		throw new Error(`Invalid sprite (${s})`);
	}

	const buffer = bitWriter(write => {
		write(s.x, 12);
		write(s.y, 12);
		write(s.w, 9);
		write(s.h, 9);
		write(s.ox, 8);
		write(s.oy, 8);
		write(spriteType(s), 6);
	});

	if (buffer.length !== 8) {
		throw new Error(`Invalid encoded sprite length (${buffer.length} !== 8)`);
	}

	let result = '';

	for (let i = 0; i < buffer.length; i++) {
		result += toHex(buffer[i]);
	}

	return result;
}

function toSpritesArray(sprites: (Sprite | null)[]): string {
	const index = sprites.findIndex((s, i) => !!i && (!s || !s.w || !s.h));

	if (index !== -1) {
		console.error(`Invalid sprite at ${index}`, sprites[index]);
		throw new Error(`Invalid sprite at ${index}`);
	}

	return compact(sprites)
		.filter(s => s.w && s.h)
		.map(s => {
			maxW = Math.max(maxW, s.w);
			maxH = Math.max(maxH, s.h);
			minOX = Math.min(minOX, s.ox);
			maxOX = Math.max(maxOX, s.ox);
			minOY = Math.min(minOY, s.oy);
			maxOY = Math.max(maxOY, s.oy);
			return encodeSprite(s); // `\t${s.x}, ${s.y}, ${s.w}, ${s.h}, ${s.ox}, ${s.oy}, ${spriteType(s)},\n`;
		})
		.join('')
		.trim();
}

interface FontCharGroup {
	firstCode: number;
	lastCode: number;
	sprites: FontSprite[];
}

function groupFont(fontSprites: FontSprite[], maxWaste: number) {
	const groups: FontCharGroup[] = [];
	let group: FontCharGroup | undefined = undefined;

	for (const codeSprite of fontSprites) {
		if (!group || (codeSprite.code - group.lastCode) > maxWaste) {
			group = { firstCode: codeSprite.code, lastCode: codeSprite.code, sprites: [] };
			groups.push(group);
		}

		while ((codeSprite.code - group.lastCode) > 1) {
			group.sprites.push({ sprite: 0, code: 0 });
			group.lastCode++;
		}

		group.sprites.push(codeSprite);
		group.lastCode = codeSprite.code;
	}

	return groups;
}

function createFontCode(name: string, fontSprites: FontSprite[], sprites: string) {
	const groups = groupFont(fontSprites, 5);

	return `export const ${name} = createFont(${sprites}, [\n` +
		`${groups.map(g => `  [${g.firstCode}, [${g.sprites.map(s => s.sprite).join(', ')}]],`).join('\n')}\n]);`;
}

interface SpriteTSConfig {
	spriteFileName: string;
	paletteFileName: string;
	paletteAlphaFileName: string;
	sprites: (Sprite | null)[];
	paletteSprites: (Sprite | null)[];
	result: Result;
	palettes: number[][];
	fonts: { [key: string]: FontSprite[]; };
	fontsPal: { [key: string]: FontSprite[]; };
	namedPalettes: { [key: string]: number; };
}

function createSpritesTS(dest: string, config: SpriteTSConfig) {
	const { objects, objects2 } = config.result;

	let ts = fs.readFileSync(path.join(rootPath, 'src', 'ts', 'tools', 'sprites-template.ts'), 'utf8');
	ts = ts.replace(/export \{.+?\r\n/, '');
	ts = ts.replace('/*SPRITE_SHEET*/', `images/${config.spriteFileName}`);
	ts = ts.replace('/*SPRITE_SHEET_PALETTE*/', `images/${config.paletteFileName}`);
	ts = ts.replace('/*SPRITE_SHEET_PALETTE_ALPHA*/', `images/${config.paletteAlphaFileName}`);
	ts = ts.replace('/*SPRITES*/', toSpritesArray(config.sprites));
	ts = ts.replace('/*SPRITES_PALETTE*/', toSpritesArray(config.paletteSprites));
	ts = ts.replace('/*FONTS*/', [
		Object.keys(config.fonts).map(key => createFontCode(key, config.fonts[key], 'sprites')).join('\n\n'),
		Object.keys(config.fontsPal).map(key => createFontCode(key, config.fontsPal[key], 'sprites2')).join('\n\n'),
	].join('\n\n'));

	ts += Object.keys(objects).map(key => createObject(key, objects[key])).join('');
	ts += Object.keys(objects2).map(key => createObject(key, objects2[key])).join('').replace(/sprites/g, 'sprites2');

	const colors = uniq(flatten(config.palettes)).sort((a, b) => a - b);
	const palettesCode = config.palettes
		.map(p => p.map(c => colors.indexOf(c)).join(', '))
		.map(p => `\t[${p}]`)
		.join(',\n')
		.trim();

	ts = ts.replace('/*COLORS*/', colors.map(encodeColor).join(' '));
	ts = ts.replace('/*PALETTES*/', palettesCode);
	ts = ts.replace('/*NAMED_PALETTES*/', toPairs(config.namedPalettes)
		.map(([key, value]) => `export const ${key} = palettes[${value}];`).join('\n'));
	ts = ts.replace('/*NAMED_SPRITES*/', `export const emptySprite = sprites[0];\nexport const emptySprite2 = sprites2[0];`);

	ts += `
export const head0 = [
	undefined,
	[[${head0Indices.join(', ')}].map(i => head[1]![0]![i])],
];

export const head1 = [
	undefined,
	[[${head1Indices.join(', ')}].map(i => head[1]![0]![i])],
];
	`;

	fs.writeFileSync(dest, ts.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'), 'utf8');
}

function fixPixelRect(sprites: (Sprite | null)[], objects: any, srcName: string, dstName: string) {
	const r = sprites[objects[srcName]]!;
	sprites.push({ x: r.x + 1, y: r.y + 1, w: 1, h: 1, ox: 0, oy: 0, layer: r.layer, image: null as any });
	objects[dstName] = sprites.length - 1;
}

export function getFramesFromPSD({ sprites }: Result, psd: Psd, padY = 5): any[] {
	return findLayerSafe('frames', psd).children
		.slice()
		.sort(compareLayers)
		.map(getCanvasSafe)
		.map(canvas => {
			const cropped = padCanvas(canvas, 0, padY);
			const pattern = clipPattern(cropped, colorCanvas(cropped, 'red'));
			return addSpriteWithColors(sprites, cropped, pattern);
		});
}

// main

function createResult(): Result {
	return {
		objects: {},
		objects2: {},
		images: [createExtCanvas(1, 1, 'empty')],
		sprites: [{ image: createExtCanvas(1, 1, 'empty'), x: 0, y: 0, w: 0, h: 0, ox: 0, oy: 0 }],
	};
}

function createPonySprites(result: Result) {
	getEyesFromPsd(result, ponyPsd('eyes.psd'), ponyPsd('irises.psd'));
	getMuzzlesFromPsd(result, ponyPsd('muzzles.psd'));
	getBlushFromPsd(result, ponyPsd('blush.psd'));
	getPonyShadowsAndSelection(result, ponyPsd('shadows.psd'));

	result.objects2.cms = addCMSprite(result.sprites, false);
	result.objects2.cmsFlip = addCMSprite(result.sprites, true);

	sheets
		.filter(s => 'name' in s && !!s.file && !s.skipImport)
		.forEach(s => importSprites(result, s as Sheet));

	// const bug = getFramesFromPSD(result, ponyPsd('fly-bug.psd'));
	// result.objects2['wings: AnimatedSprites'].slice(3)
	// 	.forEach((frame: any, i: number) => frame[1] = [pegasus[i]]);

	getTreesFromPsds(result, path.join(sourcePath, 'trees'));
	getObjectsFromPsds(result, path.join(sourcePath, 'objects'));

	createButtons(result, path.join(sourcePath, 'buttons'));
	createAnimations(result, path.join(sourcePath, 'animations'));
	createOtherSprites(result, path.join(sourcePath, 'sprites'));
	createOtherSpritesPalette(result, path.join(sourcePath, 'sprites-palette'));
	createIcons(result, path.join(sourcePath, 'icons'));
	createOtherSpritesAnimations(result, path.join(sourcePath, 'sprites-animations'));
	createEmoteAnimations(result, path.join(sourcePath, 'emotes'));
	createWalls(result, path.join(sourcePath, 'walls'));

	createPixelSprites(result);
}

interface WallConfig {
	thickness: number;
	fullHeight: number;
	halfHeight: number;
	fullHeightVertical: number;
	halfHeightVertical: number;
}

function createWalls(result: Result, rootPath: string) {
	createWall(result, 'wall_wood', openPsd(path.join(rootPath, 'wood.psd')), {
		thickness: 8, fullHeight: 85, halfHeight: 22, fullHeightVertical: 97, halfHeightVertical: 34,
	});

	createWall(result, 'wall_stone', openPsd(path.join(rootPath, 'stone.psd')), {
		thickness: 8, fullHeight: 85, halfHeight: 22, fullHeightVertical: 97, halfHeightVertical: 34,
	});
}

function createWall(result: Result, name: string, psd: Psd, config: WallConfig) {
	const full = getCanvasSafe(findLayerSafe('full', psd));
	const half = getCanvasSafe(findLayerSafe('half', psd));
	const palette = createPaletteFromList([full, half]);
	const h0wall = 16;
	const v0wall = 17;
	const lcut = 18;
	const rcut = 19;
	const thickness = config.thickness;
	const map: { x: number; w: number; vertical: boolean; }[] = [];
	let offset = 0;

	function push(index: number, w: number, vertical = false) {
		if (map[index]) {
			throw new Error('Already taken');
		}

		map[index] = { x: offset, w, vertical };
		offset += w;
	}

	function gap() {
		offset++;
	}

	function createSprites(canvas: ExtCanvas, y: number, height: number, verticalHeight: number) {
		return map
			.map(({ x, w, vertical }) => cropCanvas(canvas, x, y, w, vertical ? verticalHeight : height))
			.map(part => ({ palette, color: addSprite(result.sprites, part, undefined, palette) }));
	}

	// 0b	top right bottom left
	push(0b0100, thickness);
	push(h0wall, 32 - thickness);
	push(0b0101, thickness);
	push(0b0001, thickness);
	gap();
	push(0b0000, thickness);
	gap();
	push(0b0010, thickness);
	gap();
	push(0b1000, thickness);
	gap();
	push(0b1100, thickness);
	push(0b1101, thickness);
	push(0b1001, thickness);
	gap();
	push(0b0110, thickness);
	push(0b0111, thickness);
	push(0b0011, thickness);
	gap();
	push(0b1010, thickness);
	gap();
	push(0b1110, thickness);
	push(0b1111, thickness);
	push(0b1011, thickness);
	gap();
	push(v0wall, thickness, true);
	gap();
	push(lcut, 32 - thickness);
	push(rcut, 32 - thickness);

	result.objects2[`${name}_full`] = createSprites(full, 0, config.fullHeight, config.fullHeightVertical);

	map.pop();
	map.pop();

	result.objects2[`${name}_half`] = createSprites(
		half, config.fullHeight - config.halfHeight, config.halfHeight, config.halfHeightVertical);
}

function createTileSprites({ sprites, objects2 }: Result) {
	const basePath = path.join(sourcePath, 'tiles');
	const types = [
		{ name: 'grassTiles', file: 'dirt-grass.png', space: 1, alts: ['dirt-grass-autumn.png'] },
		{ name: 'snowTiles', file: 'dirt-snow.png', space: 1, alts: [] },
		{ name: 'woodTiles', file: 'wood-tiles.png', space: 1, alts: [] },
		{ name: 'stoneTiles', file: 'stone-tiles.png', space: 1, alts: [] },
		{ name: 'stone2Tiles', file: 'stone2-tiles.png', space: 1, alts: [] },
		{
			name: 'waterTiles1', file: 'dirt-water-1.png', space: 1,
			alts: ['dirt-water-1-autumn.png', 'dirt-water-1-winter.png', 'dirt-water-1-cave.png']
		},
		{ name: 'waterTiles2', file: 'dirt-water-2.png', space: 1, alts: [] },
		{ name: 'waterTiles3', file: 'dirt-water-3.png', space: 1, alts: [] },
		{ name: 'waterTiles4', file: 'dirt-water-4.png', space: 1, alts: [] },
		{ name: 'iceTiles', file: 'dirt-ice.png', space: 0, alts: ['dirt-ice-autumn.png', 'dirt-ice-winter.png'] },
		{ name: 'grassTilesNew', file: 'grass.png', space: 1, alts: [] },
		{ name: 'snowOnIceTiles', file: 'ice-snow.png', space: 1, alts: [] },
		{ name: 'caveTiles', file: 'dirt-stone-cave.png', space: 1, alts: [] },
	];

	types.forEach(({ name, file, alts, space }) => {
		const tileSprites = tilesToSprites(openPng(path.join(basePath, file)), space, space);
		const palette = createPaletteFromList(tileSprites);
		const palettes = [palette, ...alts.map(altFile => {
			const altSprites = tilesToSprites(openPng(path.join(basePath, altFile)), space, space);
			const altPalette = palette.slice();
			return altSprites.reduce((pal, s, i) => createOtherPalette(palette, tileSprites[i], s, pal), altPalette);
		})];

		objects2[name] = {
			palettes,
			sprites: tileSprites.map(s => addSprite(sprites, s, undefined, palette)),
		};
	});

	const otherTiles: string[] = [];

	otherTiles.forEach(tile => {
		const image = openPng(path.join(basePath, `${tile}.png`));
		const palette = createPaletteFromList([image]);

		objects2[`${tile}Tiles`] = {
			palettes: [palette],
			sprites: [addSprite(sprites, image, undefined, palette)],
		};
	});

	const cliffs = openPng(path.join(sourcePath, 'tiles', 'cliffs-grass.png'));
	const cliffsAutumn = openPng(path.join(sourcePath, 'tiles', 'cliffs-grass-autumn.png'));
	const cliffsWinter = openPng(path.join(sourcePath, 'tiles', 'cliffs-grass-winter.png'));
	const cliffsPalette = createPaletteFromList([cliffs]);
	const cliffsPaletteAutumn = createOtherPalette(cliffsPalette, cliffs, cliffsAutumn, [...cliffsPalette]);
	const cliffsPaletteWinter = createOtherPalette(cliffsPalette, cliffs, cliffsWinter, [...cliffsPalette]);

	const cave = openPng(path.join(sourcePath, 'tiles', 'cave-walls.png'));
	const cavePalette = createPaletteFromList([cave]);

	createCliffs('cliffs_grass', cliffs, [cliffsPalette, cliffsPaletteAutumn, cliffsPaletteWinter]);
	createCliffs('cave_walls', cave, [cavePalette]);

	function createCliffs(baseName: string, canvas: ExtCanvas, palettes: number[][]) {
		function addCliffSprite(name: string, x: number, y: number, w = 1, h = 1) {
			const color = addSprite(sprites, cropCanvas(canvas, 32 * x, 24 * y, 32 * w, 24 * h), undefined, palettes[0]);
			objects2[`${baseName}_${name}`] = { color, palettes };
		}

		addCliffSprite('decal_1', 3, 1);
		addCliffSprite('decal_2', 3, 2);
		addCliffSprite('decal_3', 4, 2);
		addCliffSprite('decal_l', 4, 0);
		addCliffSprite('decal_r', 4, 1);

		addCliffSprite('top_nw', 1, 0);
		addCliffSprite('top_n', 3, 0);
		addCliffSprite('top_ne', 5, 0);
		addCliffSprite('top_w', 1, 1);
		addCliffSprite('top_e', 5, 1);
		addCliffSprite('top_sw', 1, 2);
		addCliffSprite('top_se', 5, 2);
		addCliffSprite('top_s1', 2, 3);
		addCliffSprite('top_s2', 3, 3);
		addCliffSprite('top_s3', 4, 3);
		addCliffSprite('mid_sw1', 1, 4);
		addCliffSprite('mid_sw2', 1, 3);
		addCliffSprite('mid_s1', 2, 4);
		addCliffSprite('mid_s2', 3, 4);
		addCliffSprite('mid_s3', 4, 4);
		addCliffSprite('mid_se1', 5, 4);
		addCliffSprite('mid_se2', 5, 3);
		addCliffSprite('bot_sw', 1, 5);
		addCliffSprite('bot_s1', 2, 5);
		addCliffSprite('bot_s2', 3, 5);
		addCliffSprite('bot_s3', 4, 5);
		addCliffSprite('bot_se', 5, 5);

		addCliffSprite('top_sb', 2, 0);
		addCliffSprite('mid_sb', 2, 1);
		addCliffSprite('bot_sb', 2, 2);

		addCliffSprite('top_trim_left', 0, 1);
		addCliffSprite('mid_trim_left', 0, 2);
		addCliffSprite('bot_trim_left', 0, 4);
		addCliffSprite('top_trim_right', 6, 1);
		addCliffSprite('mid_trim_right', 6, 2);
		addCliffSprite('bot_trim_right', 6, 4);

		// combined sections
		addCliffSprite('sw', 1, 2, 1, 4);
		addCliffSprite('s1', 2, 3, 1, 3);
		addCliffSprite('s2', 3, 3, 1, 3);
		addCliffSprite('s3', 4, 3, 1, 3);
		addCliffSprite('sb', 2, 0, 1, 3);
		addCliffSprite('se', 5, 2, 1, 4);
	}
}

function fontCanvas(name: string) {
	const filePath = path.join(sourcePath, 'fonts', name);
	const file = openPsd(filePath);
	return getLayerCanvasSafe('color', file);
}

function createStripedCanvas(canvas: ExtCanvas, colors: number[]) {
	const stripes = createExtCanvas(canvas.width, canvas.height, `${canvas.info} (stripes)`);
	const context = stripes.getContext('2d')!;

	for (let y = 0; y < canvas.height; y++) {
		context.fillStyle = colorToCSS(colors[y % colors.length]);
		context.fillRect(0, y, canvas.width, 1);
	}

	context.globalCompositeOperation = 'destination-in';
	context.drawImage(canvas, 0, 0);
	return stripes;
}

function bandedPalette(colors: number[], bands: number[]) {
	return flatten(bands.map((t, i) => times(t, () => colors[i] >>> 0)));
}

function bandedTextPalette(colors: number[]) {
	return bandedPalette(colors, [3, 2, 3, 2]);
}

function bandedTinyPalette(colors: number[]) {
	return bandedPalette(colors, [2, 2, 2, 3]);
}

const SUPPORTER1 = 0xf86754ff;
const SUPPORTER2_BANDS = [0xffdfc1ff, 0xffcd99ff, 0xff9f3bff, 0xd97e09ff];
const SUPPORTER3_BANDS = [0xffffffff, 0xfffda4ff, 0xffea3bff, 0xfdbb0bff];

export function createSprites(log: boolean) {
	mkdir(destPath);
	mkdir(generatedPath);

	const result = createResult();

	createPonySprites(result);
	createTileSprites(result);

	const mainFont = fontCanvas('main.psd');
	const mainEmoji = fontCanvas('emoji.psd');
	const tinyFont = fontCanvas('tiny.psd');
	const monoFont = fontCanvas('mono.psd');
	const emojiPalette = createPalette(mainEmoji);

	const mainFontPalette = [TRANSPARENT, ...times(10, i => 0xff + i * 256)];
	const stripedMainFont = createStripedCanvas(mainFont, mainFontPalette.slice(1));
	const smallFontPalette = [TRANSPARENT, ...times(9, i => 0xff + i * 256)];
	const stripedSmallFont = createStripedCanvas(tinyFont, smallFontPalette.slice(1));
	const stripedMonoFont = createStripedCanvas(monoFont, smallFontPalette.slice(1));

	const fontSprites = createFont(mainFont, 10, 10,
		canvas => addImage(result.images, canvas), { noChinese: true });
	const emojiSprites = createEmojis(mainEmoji, 10, 10,
		canvas => addImage(result.images, canvas));
	const smallFontSprites = createFont(tinyFont, 8, 9,
		canvas => addImage(result.images, canvas), { noChinese: true });
	const monoFontSprites = createFont(monoFont, 8, 9,
		canvas => addImage(result.images, canvas), { noChinese: true, mono: 4, onlyBase: true });

	const fontSpritesPal = createFont(stripedMainFont, 10, 10,
		canvas => addSprite(result.sprites, canvas, undefined, mainFontPalette));
	const emojiSpritesPal = createEmojis(mainEmoji, 10, 10,
		canvas => addSprite(result.sprites, canvas, undefined, emojiPalette));
	const smallFontSpritesPal = createFont(stripedSmallFont, 8, 9,
		canvas => addSprite(result.sprites, canvas, undefined, smallFontPalette), { noChinese: true });
	const monoFontSpritesPal = createFont(stripedMonoFont, 8, 9,
		canvas => addSprite(result.sprites, canvas, undefined, smallFontPalette), { noChinese: true, mono: 4, onlyBase: true });

	const lights = createLights(result, path.join(sourcePath, 'lights'));

	const ponySheet = createSpriteSheet('ponySheet', result.images.map(imageToSprite), log, 1024);
	const ponySheet2 = createSpriteSheet('ponySheet2', result.sprites, log, 1024, 'black', true);

	fixPixelRect(ponySheet.sprites, result.objects, 'pixelRect', 'pixel');
	fixPixelRect(ponySheet2.sprites, result.objects2, 'pixelRect2', 'pixel2');

	lights.map(i => ponySheet.sprites[i]).forEach(s => {
		if (s) {
			s.x += lightsPad;
			s.y += lightsPad;
			s.w -= lightsPad * 2;
			s.h -= lightsPad * 2;
		}
	});

	saveSpriteSheetAsBinary(path.join(generatedPath, 'pony.bin'), ponySheet.image);

	const spritesConfig: SpriteTSConfig = {
		spriteFileName: saveSpriteSheet(path.join(destPath, 'pony.png'), ponySheet.image),
		paletteFileName: saveSpriteSheet(path.join(destPath, 'pony2.png'), ponySheet2.image),
		paletteAlphaFileName: saveSpriteSheet(path.join(destPath, 'pony2a.png'), ponySheet2.alpha),
		sprites: ponySheet.sprites,
		paletteSprites: ponySheet2.sprites,
		result,
		palettes,
		fonts: {
			font: fontSprites,
			emoji: emojiSprites,
			fontSmall: smallFontSprites,
			fontMono: monoFontSprites,
		},
		fontsPal: {
			fontPal: fontSpritesPal,
			emojiPal: emojiSpritesPal,
			fontSmallPal: smallFontSpritesPal,
			fontMonoPal: monoFontSpritesPal,
		},
		namedPalettes: {
			defaultPalette: 0,
			emojiPalette: addPalette(emojiPalette),
			// main
			fontPalette: addPalette([TRANSPARENT, ...times(10, () => WHITE)]),
			fontSupporter1Palette: addPalette([TRANSPARENT, ...times(10, () => SUPPORTER1)]),
			fontSupporter2Palette: addPalette([TRANSPARENT, ...bandedTextPalette(SUPPORTER2_BANDS)]),
			fontSupporter3Palette: addPalette([TRANSPARENT, ...bandedTextPalette(SUPPORTER3_BANDS)]),
			// small
			fontSmallPalette: addPalette([TRANSPARENT, ...times(9, () => WHITE)]),
			fontSmallSupporter1Palette: addPalette([TRANSPARENT, ...times(9, () => SUPPORTER1)]),
			fontSmallSupporter2Palette: addPalette([TRANSPARENT, ...bandedTinyPalette(SUPPORTER2_BANDS)]),
			fontSmallSupporter3Palette: addPalette([TRANSPARENT, ...bandedTinyPalette(SUPPORTER3_BANDS)]),
		},
	};

	createSpritesTS(path.join(generatedPath, 'sprites.ts'), spritesConfig);

	// Other exports
	saveCanvasAsRaw(path.join(outputPath, 'pony2.raw'), ponySheet2.image);
}

if (require.main === module) {
	const start = Date.now();
	createSprites(true);
	const time = ((Date.now() - start) / 1000).toFixed(2);
	console.log(`[sprites] done: ${time}s, stats: { w: ${0}-${maxW} h: ${0}-${maxH} ox: ${minOX}-${maxOX} oy: ${minOY}-${maxOY} }`);
}
