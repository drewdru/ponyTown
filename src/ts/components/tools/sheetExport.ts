import { max, compact } from 'lodash';
import { saveAs } from 'file-saver';
import { Psd, writePsd, Layer } from 'ag-psd';
import { SpriteSet, PonyInfoNumber, PaletteSpriteSet, NoDraw } from '../../common/interfaces';
import { times, cloneDeep, setFlag, includes, toInt } from '../../common/utils';
import { createDefaultPony, syncLockedPonyInfoNumber, toPaletteNumber, mockPaletteManager } from '../../common/ponyInfo';
import { Sets } from '../../client/ponyUtils';
import { defaultDrawPonyOptions, defaultPonyState } from '../../client/ponyHelpers';
import { createCanvas, disableImageSmoothing } from '../../client/canvasUtils';
import { ContextSpriteBatch } from '../../graphics/contextSpriteBatch';
import { BLACK, BLUE, CYAN, WHITE, RED, GREEN, YELLOW, MAGENTA, TRANSPARENT } from '../../common/colors';
import { colorToCSS } from '../../common/color';
import { decompressPony, compressPonyString } from '../../common/compressPony';
import { drawPony } from '../../client/ponyDraw';
import * as sprites from '../../generated/sprites';
import { drawPixelTextOnCanvas, fillRect } from '../../graphics/graphicsUtils';
import { Sheet, SheetLayer, ignoreSet, DEFAULT_COLOR } from '../../common/sheets';
import { createHeadAnimation } from '../../client/ponyAnimations';

const PONY_X = 30;
const PONY_Y = 50;
const patternColors = [RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE, BLACK];
const whiteColors = [WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE];

function maxPatterns(sprites: Sets): number {
	return max(sprites.map(s => s && s.length ? max(s.map(x => x ? x.length : 0)) : 0))!;
}

const backupSprites: any = {
	head: [
		undefined,
		[
			[
				{}
			],
		],
	],
};

function getSets(sheet: Sheet, key: string, override?: string): Sets | undefined {
	const setsKey = override || key || '';
	const sets = backupSprites[setsKey] || (sprites as any)[setsKey];

	if (sheet.duplicateFirstFrame !== undefined) {
		return times(sheet.duplicateFirstFrame, () => sets[0]);
	} else {
		return sheet.single ? [sets] : sets;
	}
}

function getSetsForFirstKey(sheet: Sheet) {
	const layer = sheet.layers.find(l => !!l.set);
	return layer && getSets(sheet, layer.set!);
}

export function getCols(sheet: Sheet) {
	return sheet.state!.animation.frames.length;
}

export function getRows(sheet: Sheet) {
	if (sheet.rows !== undefined) {
		return sheet.rows;
	} else {
		const sets = getSetsForFirstKey(sheet);
		const maxFrames = sets && max(sets.map(f => f ? f.length : 0));
		return (maxFrames || 0) + 1;
	}
}

export function savePsd(psd: Psd, name: string) {
	saveAs(new Blob([writePsd(psd, { generateThumbnail: true })], { type: 'application/octet-stream' }), name);
}

export function createPsd(sheet: Sheet, rows: number, cols: number): Psd {
	const width = canvasWidth(sheet, rows, cols);
	const height = canvasHeight(sheet, rows, cols);

	return {
		width,
		height,
		children: compact([
			{ name: '<bg>', canvas: createBackground(rows, cols, width, height, sheet), transparencyProtected: true },
			...sheet.layers!.map(layer => createPsdLayer(sheet, rows, cols, layer)),
			{ name: '<refs>', canvas: createRefsCanvas(width, height, sheet.paletteOffsetY) },
		]),
	};
}

function canvasWidth(sheet: Sheet, _rows: number, cols: number) {
	if (sheet.wrap) {
		cols = sheet.wrap;
	}

	return (sheet.offset * (cols - 1)) + sheet.width;
}

function canvasHeight(sheet: Sheet, rows: number, _cols: number) {
	if (sheet.wrap) {
		rows = Math.ceil(rows / sheet.wrap);
	}

	return sheet.height * rows;
}

function drawPsdLayer(
	sheet: Sheet, rows: number, cols: number, layer: SheetLayer, pattern = -1, extra = false
): HTMLCanvasElement {
	const { width, height, offset, offsetY = 0, wrap } = sheet;
	const pony = createPony();
	const baseState = { ...defaultPonyState(), ...sheet.state, blushColor: BLACK };
	const options = { ...defaultDrawPonyOptions(), ...layer.options };
	const ignoreColor = (layer.drawBlack === undefined ? !!layer.head : layer.drawBlack) ? TRANSPARENT : BLACK;
	const fieldName = layer.fieldName || sheet.fieldName;

	if (!layer.head) {
		baseState.headAnimation = createHeadAnimation('', 1, false, [[]]);
		pony.head = ignoreSet();
		pony.nose = ignoreSet();
		pony.ears = ignoreSet();
	} else if (layer.noFace) {
		baseState.headAnimation = createHeadAnimation('', 1, false, [[]]);
		pony.head = ignoreSet();
		pony.nose = ignoreSet();
	}

	if (!layer.body) {
		options.no = setFlag(options.no, NoDraw.BodyOnly, true);
	}

	if (!layer.frontLeg) {
		options.no = setFlag(options.no, NoDraw.FrontLeg, true);
	}

	if (!layer.backLeg) {
		options.no = setFlag(options.no, NoDraw.BackLeg, true);
	}

	if (!layer.frontFarLeg) {
		options.no = setFlag(options.no, NoDraw.FrontFarLeg, true);
	}

	if (!layer.backFarLeg) {
		options.no = setFlag(options.no, NoDraw.BackFarLeg, true);
	}

	layer.setup && layer.setup(pony, baseState);

	syncLockedPonyInfoNumber(pony);

	const actualRows = wrap ? Math.ceil(rows / wrap) : rows;
	const actualCols = wrap ? wrap : cols;
	const empties = sheet.empties && includes(sheet.setsWithEmpties, layer.set) ? sheet.empties : [];

	return drawFrames(actualRows, actualCols, width, height, offset, (batch, x, y) => {
		const xIndexBase = (wrap ? actualCols * y + x : x);
		const xIndexOffset = empties.filter(i => i <= xIndexBase).length;
		const xIndex = includes(empties, xIndexBase) ? 0 : (xIndexBase - xIndexOffset);
		const yIndex = wrap ? 0 : y;

		const state = cloneDeep(baseState);

		sheet.frame && sheet.frame(pony, state, options, xIndex, yIndex, pattern);
		layer.frame && layer.frame(pony, state, options, xIndex, yIndex, pattern);

		state.animationFrame = xIndex;

		if (layer.set && fieldName) {
			const sets = getSets(sheet, layer.set, layer.setOverride);

			if (!sets) {
				throw new Error(`Missing sets for (${layer.set})`);
			}

			const frameIndex = sheet.single ? 0 : xIndex;
			const typeIndex = sheet.single ? xIndex : yIndex;
			const aframe = sets[frameIndex];
			const type = (aframe && typeIndex < aframe.length) ? typeIndex : -1;
			const set: SpriteSet<number> = { type };

			if (pattern !== -1) {
				set.fills = patternColors;
				set.outlines = patternColors;

				if (aframe && typeIndex < aframe.length && aframe[typeIndex] && pattern < aframe[typeIndex]!.length) {
					set.pattern = pattern;
				} else {
					set.type = -1;
				}
			} else {
				set.fills = whiteColors;
				set.outlines = whiteColors;

				if (!(aframe && typeIndex < aframe.length && aframe[typeIndex])) {
					set.type = -1;
				}
			}

			layer.frameSet && layer.frameSet(set, xIndex, yIndex, pattern);

			(pony as any)[fieldName] = set.type === -1 ? ignoreSet() : set;
		}

		batch.disableShading = pattern !== -1;
		batch.ignoreColor = ignoreColor;

		const pal = toPaletteNumber(pony);

		if (layer.extra !== undefined) {
			const set = pal[layer.extra] as PaletteSpriteSet;

			if (extra) {
				set.palette = mockPaletteManager.add([0, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK, BLACK]);
			} else {
				set.extraPalette = undefined;
			}
		}

		drawPony(batch, pal, state, PONY_X, PONY_Y + offsetY + toInt(layer.shiftY), options);
	});
}

function createPsdPatternLayers(sheet: Sheet, rows: number, cols: number, layer: SheetLayer): Layer[] {
	const sets = getSets(sheet, layer.set!, layer.setOverride);
	const patterns = layer.patterns || (sets ? maxPatterns(sets) : 0) || 6;

	return compact([
		layer.extra && {
			name: 'extra',
			canvas: drawPsdLayer(sheet, rows, cols, layer, -1, true),
		},
		{
			name: 'color',
			canvas: drawPsdLayer(sheet, rows, cols, layer),
		},
		...times(patterns, i => ({
			name: `pattern ${i}`,
			canvas: drawPsdLayer(sheet, rows, cols, layer, i),
			hidden: true,
			clipping: true,
			blendMode: 'multiply',
		})),
	]);
}

function createPsdLayer(sheet: Sheet, rows: number, cols: number, layer: SheetLayer): Layer {
	const name = layer.name;

	if (layer.set) {
		return { name, children: createPsdPatternLayers(sheet, rows, cols, layer) };
	} else {
		return { name, canvas: drawPsdLayer(sheet, rows, cols, layer) };
	}
}

function drawFrames(
	rows: number, cols: number, w: number, h: number, offset: number,
	draw: (batch: ContextSpriteBatch, x: number, y: number) => void
): HTMLCanvasElement {
	const canvas = createCanvas((offset * (cols - 1)) + w, h * rows);
	const buffer = createCanvas(w, h);
	const batch = new ContextSpriteBatch(buffer);
	const viewContext = canvas.getContext('2d')!;
	viewContext.save();
	disableImageSmoothing(viewContext);

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			batch.start(sprites.paletteSpriteSheet, 0);
			draw(batch, x, y);
			batch.end();
			viewContext.drawImage(buffer, x * offset, y * h);
		}
	}

	viewContext.restore();
	return canvas;
}

function createBackground(rows: number, cols: number, width: number, height: number, sheet: Sheet) {
	const canvas = createCanvas(width, height);
	const context = canvas.getContext('2d')!;

	if (sheet.wrap) {
		cols = sheet.wrap;
		rows = Math.ceil(rows / sheet.wrap);
	}

	fillRect(context, 'lightgreen', 0, 0, canvas.width, canvas.height);

	context.globalAlpha = 0.1;

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const color = (x + (y % 2)) % 2 ? 'green' : 'blue';
			fillRect(context, color, x * sheet.offset, y * sheet.height, sheet.width, sheet.height);
		}
	}

	context.globalAlpha = 1;

	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			const gap = sheet.width - sheet.offset;
			const index = sheet.wrap ? (cols * y + x) : x;
			drawPixelTextOnCanvas(context, x * sheet.offset + gap + 2, y * sheet.height + 2, 0x76c189ff, index.toString());
		}
	}

	return canvas;
}

function createRefsCanvas(width: number, height: number, offsetY = 0) {
	const canvas = createCanvas(width, height);
	const context = canvas.getContext('2d')!;
	const h = 2;

	patternColors.forEach((c, i) => fillRect(context, colorToCSS(c), 5, 5 + h * i + offsetY, 10, h));

	fillRect(context, '#888888', 25, 10 + offsetY, 8, 10);
	fillRect(context, '#d9d9d9', 27, 12 + offsetY, 4, 4);
	fillRect(context, '#afafaf', 27, 16 + offsetY, 4, 2);
	fillRect(context, '#9f9f9f', 20, 5 + offsetY, 8, 10);
	fillRect(context, '#ffffff', 22, 7 + offsetY, 4, 4);
	fillRect(context, '#cdcdcd', 22, 11 + offsetY, 4, 2);

	return canvas;
}

function createPony(): PonyInfoNumber {
	const pony = decompressPony(compressPonyString(createDefaultPony()));
	pony.mane!.type = 0;
	pony.backMane!.type = 0;
	pony.tail!.type = 0;
	pony.coatFill = DEFAULT_COLOR;
	pony.lockCoatOutline = true;
	pony.lockBackLegAccessory = false;
	return syncLockedPonyInfoNumber(pony);
}

export function drawPsd(psd: Psd, scale: number, canvas?: HTMLCanvasElement): HTMLCanvasElement {
	const buffer = canvas || createCanvas(100, 100);
	buffer.width = psd.width * scale;
	buffer.height = psd.height * scale;
	const context = buffer.getContext('2d')!;
	context.save();
	context.scale(scale, scale);
	disableImageSmoothing(context);
	drawLayer(psd, context);
	context.restore();
	return buffer;
}

function drawLayer(layer: Layer, context: CanvasRenderingContext2D) {
	if (!layer.hidden) {
		layer.canvas && context.drawImage(layer.canvas, 0, 0);
		layer.children && layer.children.forEach(c => drawLayer(c, context));
	}
}
