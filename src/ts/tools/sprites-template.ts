// generated file
/* tslint:disable */

import {
	Sprite, SpriteBorder, PonyNose, PonyEye, ColorExtra, ColorExtraSets, Shadow, ColorShadow, TileSprites, SpriteSheet
} from '../common/interfaces';
import { parseSpriteColor } from '../common/utils';
import { bitReaderCustom } from '../common/bitUtils';

// [frame][type][pattern]
export type StaticSprites = (ColorExtra[] | undefined)[];
export type AnimatedSprites = (StaticSprites | undefined)[];
export type StaticSpritesExtra = (ColorExtra[] | undefined)[];
export type AnimatedSpritesExtra = (StaticSprites | undefined)[];
export type PonyEyes = ((PonyEye | undefined)[] | undefined)[];

const sprites = createSprites('/*SPRITES*/');

const sprites2 = createSprites('/*SPRITES_PALETTE*/');

/*FONTS*/

const palettes: Uint32Array[] = createPalettes('/*COLORS*/', [
	/*PALETTES*/
]);

/*NAMED_SPRITES*/

/*NAMED_PALETTES*/

export const spriteSheets: SpriteSheet[] = [
	{
		src: '/*SPRITE_SHEET*/',
		data: undefined, texture: undefined, sprites: sprites, palette: false
	},
	{
		src: '/*SPRITE_SHEET_PALETTE*/', srcA: '/*SPRITE_SHEET_PALETTE_ALPHA*/',
		data: undefined, texture: undefined, sprites: sprites2, palette: true
	},
];

export const normalSpriteSheet = spriteSheets[0];
export const paletteSpriteSheet = spriteSheets[1];

export function createSprites(data: string): Sprite[] {
	const sprites: Sprite[] = [
		{ x: 0, y: 0, w: 0, h: 0, ox: 0, oy: 0, type: 0 },
	];

	let offset = 0;
	const read = bitReaderCustom(() => {
		const value = parseInt(data.substr(offset, 2), 16);
		offset += 2;
		return value;
	});

	while (offset < data.length) {
		sprites.push({
			x: read(12),
			y: read(12),
			w: read(9),
			h: read(9),
			ox: read(8),
			oy: read(8),
			type: read(6),
		});
	}

	return sprites;
}

export function createFont(sprites: Sprite[], groups: [number, number[]][]) {
	const chars: { code: number; sprite: Sprite; }[] = [];

	for (const [start, codes] of groups) {
		for (let i = 0; i < codes.length; i++) {
			if (codes[i]) {
				chars.push({ code: start + i, sprite: sprites[codes[i]] });
			}
		}
	}

	return chars;
}

export function createButton(
	border: number, topLeft: number, top: number, topRight: number, left: number, bg: number, right: number,
	bottomLeft: number, bottom: number, bottomRight: number
): SpriteBorder {
	return {
		border,
		topLeft: sprites[topLeft],
		top: sprites[top],
		topRight: sprites[topRight],
		left: sprites[left],
		bg: sprites[bg],
		right: sprites[right],
		bottomLeft: sprites[bottomLeft],
		bottom: sprites[bottom],
		bottomRight: sprites[bottomRight]
	};
}

export function mapSprites(frames: number[]) {
	return frames.map(i => sprites[i]);
}

export function mapSprites2(frames: number[]) {
	return frames.map(i => sprites2[i]);
}

export function createPalettes(colorsString: string, palettes: number[][]): Uint32Array[] {
	const colors = colorsString.split(/ /g).map(parseSpriteColor);

	return palettes.map(palette => {
		const result = new Uint32Array(palette.length);

		for (let i = 0; i < palette.length; i++) {
			result[i] = colors[palette[i]] >>> 0;
		}

		return result;
	});
}

export function createColorPal(color: number, colors: number): ColorExtra {
	return { color: sprites2[color], colors };
}

export function colorPal(colors: number) {
	return (color: number) => createColorPal(color, colors);
}

const colorPal3 = colorPal(3);
const colorPal5 = colorPal(5);
const colorPal7 = colorPal(7);
const colorPal9 = colorPal(9);
const colorPal11 = colorPal(11);
const colorPal13 = colorPal(13);
const colorPal17 = colorPal(17);

export function getPalette(index: number) {
	return palettes[index];
}

const emptyPalette = new Uint32Array(0);

export function emptyColorPalette(): ColorExtra {
	return { color: sprites2[0], palettes: [emptyPalette] };
}

export function createSpritesPalette(sprites: number[], paletteIndexes: number[]): TileSprites {
	return { sprites: sprites.map(i => sprites2[i]), palettes: paletteIndexes.map(getPalette) };
}

export function createColorPalette(color: number, paletteIndexes: number[]): ColorExtra {
	return { color: sprites2[color], palettes: paletteIndexes.map(getPalette) };
}

export function createColorExtraPal(color: number, colors: number, extra: number, paletteIndexes: number[]): ColorExtra {
	return { color: sprites2[color], colors, extra: sprites2[extra], palettes: paletteIndexes.map(getPalette) };
}

export function createShadow(shadow: number): Shadow {
	return { shadow: sprites2[shadow] };
}

export function createColorShadowPalette(color: number, shadow: number, paletteIndexes: number[]): ColorShadow {
	return { color: sprites2[color], shadow: sprites2[shadow], palettes: paletteIndexes.map(getPalette) };
}

export function createNose(color: number, colors: number, mouth: number, fangs: number) {
	return { color: sprites2[color], colors, mouth: sprites2[mouth], fangs: sprites2[fangs] };
}

export function createEye(base: number, irises: number[], shadow?: number, shine?: number): PonyEye {
	return { base: sprites2[base], irises: mapSprites2(irises), shadow: sprites2[shadow || 0], shine: sprites2[shine || 0] };
}

export function createAnimation(frames: number[]) {
	return { frames: mapSprites(frames) };
}

export function createAnimationPalette(frames: number[], palette: number) {
	return { frames: mapSprites2(frames), palette: getPalette(palette) };
}

export function createAnimationShadow(frames: number[], shadow: number, palette: number) {
	return { frames: mapSprites2(frames), shadow: sprites2[shadow], palette: getPalette(palette) };
}

export {
	Sprite, SpriteBorder, PonyNose, PonyEye, ColorExtra, ColorExtraSets,
	colorPal3, colorPal5, colorPal7, colorPal9, colorPal11, colorPal13, colorPal17
};
