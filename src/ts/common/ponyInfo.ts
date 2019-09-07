import * as sprites from '../generated/sprites';
import { releasePalette, createPalette } from '../graphics/paletteManager';
import {
	PonyInfo, SpriteSet, PalettePonyInfo, PaletteSpriteSet, PaletteManager, Palette, ColorExtraSets, PonyInfoBase,
	PonyInfoNumber, ColorExtra
} from './interfaces';
import { toInt, array, includes, att } from './utils';
import { CM_SIZE } from './constants';
import { parseColorFast, getR, getAlpha, colorFromRGBA, getG, getB, colorToHexRGB } from './color';
import { BLACK, fillToOutline, fillToOutlineColor, WHITE, TRANSPARENT, fillToOutlineWithDarken } from './colors';
import {
	mergedManes, mergedBackManes, mergedFacialHair, mergedEarAccessories, mergedChestAccessories,
	SLEEVED_ACCESSORIES, mergedBackAccessories, mergedExtraAccessories, mergedHeadAccessories
} from '../client/ponyUtils';

const MAX_COLORS = 6;
const FILLS = ['1e90ff', '32cd32', 'da70d6', 'dc143c', '7fffd4'];

const frontHooves = sprites.frontLegHooves[1] as ColorExtraSets;
const backHooves = sprites.backLegHooves[1] as ColorExtraSets;
const frontLegAccessories = sprites.frontLegAccessories[1] as ColorExtraSets;
const backLegAccessories = sprites.backLegAccessories[1] as ColorExtraSets;
const frontLegSleeves = sprites.frontLegSleeves[1] as ColorExtraSets;

type Arr<T> = (T | undefined)[] | undefined;
type PonyInfoGeneric<T> = PonyInfoBase<T, SpriteSet<T>>;

export const mockPaletteManager: PaletteManager = {
	add(colors: number[]): Palette {
		return this.addArray(new Uint32Array(colors));
	},
	addArray(colors: Uint32Array): Palette {
		return createPalette(colors);
	},
	init() {
	}
};

export function spriteSet(type: number, lockFirstFill = true, fill = 'ffd700', otherFills = FILLS): SpriteSet<string> {
	if (otherFills.length !== (MAX_COLORS - 1))
		throw new Error('Invalid fills count');

	const fills = [fill, ...otherFills];
	const outlines = fills.map(fillToOutline);

	return {
		type,
		pattern: 0,
		fills,
		outlines,
		lockFills: [lockFirstFill, ...array(MAX_COLORS - 1, false)],
		lockOutlines: array(MAX_COLORS, true),
	};
}

export function createDefaultPony(): PonyInfo {
	const pony = createBasePony();
	pony.mane!.type = 2;
	pony.backMane!.type = 1;
	pony.tail!.type = 1;
	return pony;
}

export function createBasePony(): PonyInfo {
	return syncLockedPonyInfo({
		head: spriteSet(0, true, 'ff0000', ['800000', '32cd32', 'da70d6', 'dc143c', '7fffd4']),
		nose: spriteSet(0, true, 'ff0000', ['800000', '32cd32', 'da70d6', 'dc143c', '7fffd4']),
		ears: spriteSet(0, true, 'ff0000'),
		horn: spriteSet(0, true, 'ff0000'),
		wings: spriteSet(0, true, 'ff0000'),
		frontHooves: spriteSet(0, false, 'ffa500', ['ffff00', '32cd32', 'da70d6', 'dc143c', '7fffd4']),
		backHooves: spriteSet(0, true, 'ffa500'),

		mane: spriteSet(0, false),
		backMane: spriteSet(0),
		tail: spriteSet(0),
		facialHair: spriteSet(0),

		headAccessory: spriteSet(0, false, 'ee82ee'),
		earAccessory: spriteSet(0, false, '808080'),
		faceAccessory: spriteSet(0, false, '000000'),
		neckAccessory: spriteSet(0, false, 'ee82ee'),
		frontLegAccessory: spriteSet(0, false, 'ee82ee'),
		backLegAccessory: spriteSet(0, false, 'ee82ee'),
		frontLegAccessoryRight: spriteSet(0, false, 'ee82ee'),
		backLegAccessoryRight: spriteSet(0, false, 'ee82ee'),
		lockBackLegAccessory: true,
		unlockFrontLegAccessory: false,
		unlockBackLegAccessory: false,
		backAccessory: spriteSet(0, false, 'ee82ee'),
		waistAccessory: spriteSet(0, false, '95856f', ['674b43', '4f4f4f', '525252', 'c37850', '8a3d34']),
		chestAccessory: spriteSet(0, false, 'ee82ee'),
		sleeveAccessory: spriteSet(0, true, 'ee82ee'),
		extraAccessory: {
			...spriteSet(0, true, 'ff0000', ['daa520', 'ffd700', 'ffd700', 'ffd700', 'ffd700']),
			lockFills: array(5, true),
		},

		coatFill: 'ff0000',
		coatOutline: '8b0000',
		lockCoatOutline: true,

		eyelashes: 0,
		eyeColorLeft: 'daa520',
		eyeColorRight: 'daa520',
		eyeWhitesLeft: 'ffffff',
		eyeWhites: 'ffffff',
		eyeOpennessLeft: 1,
		eyeOpennessRight: 1,
		eyeshadow: false,
		eyeshadowColor: '000000',
		lockEyes: true,
		lockEyeColor: true,
		unlockEyeWhites: false,
		unlockEyelashColor: false,
		eyelashColor: '000000',
		eyelashColorLeft: '000000',

		fangs: 0,
		muzzle: 0,
		freckles: 0,
		frecklesColor: '8b0000',
		magicColor: 'ffffff',

		cm: [],
		cmFlip: false,

		customOutlines: false,
		freeOutlines: false,
		darkenLockedOutlines: false,
	});
}

// sync

type FillToOutline<T> = (fill: T | undefined) => T | undefined;

export function getBaseFill<T>(set?: SpriteSet<T>): T | undefined {
	return set && set.fills && set.fills[0];
}

export function getBaseOutline<T>(set?: SpriteSet<T>): T | undefined {
	return set && set.outlines && set.outlines[0];
}

export function syncLockedSpriteSet<T>(
	set: SpriteSet<T> | undefined, customOutlines: boolean, fillToOutline: FillToOutline<T>, baseFill?: T,
	baseOutline?: T
) {
	if (set === undefined)
		return;

	const fills = set.fills;

	if (!fills)
		return;

	const lockFills = set.lockFills;

	if (lockFills) {
		for (let i = 0; i < lockFills.length; i++) {
			if (lockFills[i]) {
				fills[i] = i === 0 ? baseFill : fills[0];
			}
		}
	}

	const outlines = set.outlines;
	const lockOutlines = set.lockOutlines;

	if (outlines && lockOutlines) {
		for (let i = 0; i < lockOutlines.length; i++) {
			if (!customOutlines) {
				lockOutlines[i] = true;
			}

			if (lockOutlines[i]) {
				if (i === 0 && baseOutline && lockFills && lockFills[i]) {
					outlines[i] = baseOutline;
				} else {
					outlines[i] = fillToOutline(fills[i]);
				}
			}
		}
	}
}

function syncLockedSpritesSet2<T>(
	set: SpriteSet<T> | undefined, fillToOutline: FillToOutline<T>, baseFills: (T | undefined)[],
	baseOutlines: (T | undefined)[]
) {
	if (set && set.fills && set.lockFills) {
		set.lockFills.forEach((locked, i) => {
			if (locked) {
				set.fills![i] = baseFills[i];
			}
		});
	}

	if (set && set.fills && set.outlines && set.lockOutlines) {
		set.lockOutlines.forEach((locked, i) => {
			if (locked) {
				if (baseOutlines[i] && set.lockFills && set.lockFills[i]) {
					set.outlines![i] = baseOutlines[i];
				} else {
					set.outlines![i] = fillToOutline(set.fills![i]);
				}
			}
		});
	}
}

function getFillOf2<T>(set: SpriteSet<T> | undefined, defaultColor: T): T | undefined {
	return set && set.type && set.fills && set.fills[0] || defaultColor;
}

function getOutlineOf2<T>(set: SpriteSet<T> | undefined, defaultColor: T): T | undefined {
	return set && set.type && set.outlines && set.outlines[0] || defaultColor;
}

function syncLockedBasePonyInfo<T>(
	info: PonyInfoGeneric<T>, fillToOutline: FillToOutline<T>, defaultColor: T
): PonyInfoGeneric<T> {
	const customOutlines = !!info.customOutlines;

	if (!customOutlines || info.lockCoatOutline) {
		info.coatOutline = fillToOutline(info.coatFill);
	}

	if (info.lockEyes) {
		info.eyeOpennessLeft = info.eyeOpennessRight;
	}

	if (info.lockEyeColor) {
		info.eyeColorLeft = info.eyeColorRight;
	}

	if (!info.unlockEyeWhites) {
		info.eyeWhitesLeft = info.eyeWhites;
	}

	if (!info.unlockEyelashColor) {
		info.eyelashColorLeft = info.eyelashColor;
	}

	syncLockedSpriteSet<T>(info.head, customOutlines, fillToOutline, info.coatFill, info.coatOutline);
	syncLockedSpriteSet<T>(info.nose, customOutlines, fillToOutline, info.coatFill, info.coatOutline);
	syncLockedSpriteSet<T>(info.ears, customOutlines, fillToOutline, info.coatFill, info.coatOutline);
	syncLockedSpriteSet<T>(info.horn, customOutlines, fillToOutline, info.coatFill, info.coatOutline);
	syncLockedSpriteSet<T>(info.wings, customOutlines, fillToOutline, info.coatFill, info.coatOutline);
	syncLockedSpriteSet<T>(info.frontHooves, customOutlines, fillToOutline, info.coatFill, info.coatOutline);
	syncLockedSpriteSet<T>(
		info.backHooves, customOutlines, fillToOutline, getBaseFill(info.frontHooves), getBaseOutline(info.frontHooves));

	syncLockedSpriteSet<T>(info.mane, customOutlines, fillToOutline);

	const baseManeFill = getBaseFill(info.mane);
	const baseManeOutline = getBaseOutline(info.mane);

	syncLockedSpriteSet<T>(info.backMane, customOutlines, fillToOutline, baseManeFill, baseManeOutline);
	syncLockedSpriteSet<T>(info.tail, customOutlines, fillToOutline, baseManeFill, baseManeOutline);
	syncLockedSpriteSet<T>(info.facialHair, customOutlines, fillToOutline, baseManeFill, baseManeOutline);

	syncLockedSpriteSet<T>(info.headAccessory, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.earAccessory, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.faceAccessory, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.neckAccessory, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.frontLegAccessory, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.backLegAccessory, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.frontLegAccessoryRight, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.backLegAccessoryRight, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.backAccessory, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.waistAccessory, customOutlines, fillToOutline);
	syncLockedSpriteSet<T>(info.chestAccessory, customOutlines, fillToOutline);

	if (info.chestAccessory && !info.sleeveAccessory && includes(SLEEVED_ACCESSORIES, info.chestAccessory.type)) {
		info.sleeveAccessory = {
			type: 0,
			pattern: 0,
			fills: [],
			outlines: [],
			lockFills: array(MAX_COLORS, true),
			lockOutlines: array(MAX_COLORS, true),
		};
	}

	syncLockedSpriteSet<T>(
		info.sleeveAccessory, customOutlines, fillToOutline, getBaseFill(info.chestAccessory), getBaseOutline(info.chestAccessory));

	syncLockedSpritesSet2<T>(info.extraAccessory, fillToOutline, [
		info.coatFill,
		info.eyeColorRight,
		getFillOf2(info.mane, defaultColor),
		getFillOf2(info.backMane, defaultColor),
		getFillOf2(info.tail, defaultColor),
	], [
			info.coatOutline,
			info.eyeColorRight,
			getOutlineOf2(info.mane, defaultColor),
			getOutlineOf2(info.backMane, defaultColor),
			getOutlineOf2(info.tail, defaultColor),
		]);

	return info;
}

export function syncLockedPonyInfo(info: PonyInfo): PonyInfo {
	const darkenLocked = !!info.freeOutlines && !!info.darkenLockedOutlines;
	const fillToOutlineFunc = darkenLocked ? fillToOutlineWithDarken : fillToOutline;
	return syncLockedBasePonyInfo<string>(info, fillToOutlineFunc, '000000');
}

function fillToOutlineSafe(color: number | undefined) {
	return fillToOutlineColor((color === undefined || color === 0) ? BLACK : color);
}

function fillToOutlineSafeWithDarken(color: number | undefined) {
	return darkenForOutline(fillToOutlineColor((color === undefined || color === 0) ? BLACK : color));
}

export function syncLockedPonyInfoNumber(info: PonyInfoNumber): PonyInfoNumber {
	const darkenLocked = !!info.freeOutlines && !!info.darkenLockedOutlines;
	const fillToOutlineFunc = darkenLocked ? fillToOutlineSafeWithDarken : fillToOutlineSafe;
	return syncLockedBasePonyInfo<number>(info, fillToOutlineFunc, BLACK);
}

// PalettePonyInfo

function parseFast(color: string | undefined): number {
	return color ? parseColorFast(color) : BLACK;
}

function parseCMColor(color: string): number {
	return color ? parseColorFast(color) : TRANSPARENT;
}

export function toColorList(colors: (string | undefined)[]): Uint32Array {
	const result = new Uint32Array(colors.length + 1);

	for (let i = 0; i < colors.length; i++) {
		result[i + 1] = parseFast(colors[i]);
	}

	return result;
}

export function darkenForOutline(color: number) {
	const mult = (159 / 255);
	const r = (mult * getR(color)) | 0;
	const g = (mult * getG(color)) | 0;
	const b = (mult * getB(color)) | 0;
	const a = getAlpha(color);
	return colorFromRGBA(r, g, b, a);
}

function getColorsGeneric(
	fillColors: Arr<string>, outlineColors: Arr<string>, defaultColor: string, length: number, darken: boolean
): string[] {
	const fills = fillColors || [];
	const outlines = outlineColors || [];
	const colors = array(length * 2, defaultColor);

	for (let i = 0; i < length; i++) {
		colors[i * 2] = fills[i] || defaultColor;

		if (darken) {
			colors[i * 2 + 1] = outlines[i] ? colorToHexRGB(darkenForOutline(parseColorFast(outlines[i]!))) : defaultColor;
		} else {
			colors[i * 2 + 1] = outlines[i] || defaultColor;
		}
	}

	return colors;
}

export function getColorsFromSet({ fills, outlines }: SpriteSet<string>, defaultColor: string, darken: boolean): string[] {
	const length = Math.max(fills ? fills.length : 0, outlines ? outlines.length : 0);
	return getColorsGeneric(fills, outlines, defaultColor, length, darken);
}

export function toColorListNumber(colors: (number | undefined)[]): Uint32Array {
	const result = new Uint32Array(colors.length + 1);

	for (let i = 0; i < colors.length; i++) {
		result[i + 1] = colors[i] || BLACK;
	}

	return result;
}

export type GetColorsForSet<T> = (set: SpriteSet<T>, count: number, darken: boolean) => Uint32Array;

export const getColorsForSet: GetColorsForSet<string> = (set, count, darken) => {
	const t = getColorsGeneric(set.fills, set.outlines, '000000', count, darken);
	return toColorList(t);
};

const emptyArray: number[] = [];

export const getColorsForSetNumber: GetColorsForSet<number> = (set, length, darken) => {
	const fills = set.fills || emptyArray;
	const outlines = set.outlines || emptyArray;
	const result = new Uint32Array(length * 2 + 1);

	for (let i = 0; i < length; i++) {
		result[((i << 1) + 1) | 0] = i < fills.length ? (fills[i] || BLACK) : BLACK;

		if (darken) {
			result[((i << 1) + 2) | 0] = i < outlines.length ? darkenForOutline(outlines[i] || BLACK) : BLACK;
		} else {
			result[((i << 1) + 2) | 0] = i < outlines.length ? (outlines[i] || BLACK) : BLACK;
		}
	}

	return result;
};

function getExtraPalette(pattern: ColorExtra | undefined, manager: PaletteManager): Palette | undefined {
	const extraPalette = pattern && pattern.palettes && pattern.palettes[0];
	return extraPalette && manager.addArray(new Uint32Array(extraPalette));
}

export function toPaletteSet<T>(
	set: SpriteSet<T>, sets: ColorExtraSets, manager: PaletteManager, getColorsForSet: GetColorsForSet<T>,
	hasExtra: boolean, darken: boolean
): PaletteSpriteSet | undefined {
	const pattern = att(att(sets, set.type), set.pattern);
	const colorCount = pattern !== undefined && pattern.colors !== undefined ? ((pattern.colors - 1) >> 1) : 0;
	const colors = getColorsForSet(set, colorCount, darken);

	return {
		type: toInt(set.type),
		pattern: toInt(set.pattern),
		palette: manager.addArray(colors),
		extraPalette: hasExtra ? getExtraPalette(pattern, manager) : undefined,
	};
}

function createCMPalette<T>(
	cm: T[] | undefined, manager: PaletteManager, parseColor: (color: T) => number
): Palette | undefined {
	const size = CM_SIZE * CM_SIZE;

	if (cm === undefined || cm.length === 0 || cm.length > size)
		return undefined;

	const result = new Uint32Array(size);

	for (let i = 0; i < cm.length; i++) {
		result[i] = parseColor(cm[i]);
	}

	return manager.addArray(result);
}

export type ToSet<T> = (set: SpriteSet<T> | undefined, sets: ColorExtraSets, extra?: boolean) => PaletteSpriteSet | undefined;

const defaultPalette = new Uint32Array(sprites.defaultPalette);

export const createToPaletteSet =
	<T>(manager: PaletteManager, getColorsForSet: GetColorsForSet<T>, extra: boolean, darken: boolean): ToSet<T> =>
		(set, sets) => set === undefined ? undefined : toPaletteSet(set, sets, manager, getColorsForSet, extra, darken);

export function toPaletteGeneric<T>(
	info: PonyInfoGeneric<T>, manager: PaletteManager, toColorList: (color: (T | undefined)[]) => Uint32Array,
	getColorsForSet: GetColorsForSet<T>, blackColor: T, whiteColor: T, parseCMColor: (color: T) => number
): PalettePonyInfo {
	const darken = !info.freeOutlines;
	const toSet = createToPaletteSet(manager, getColorsForSet, false, darken);
	const toSetExtra = createToPaletteSet(manager, getColorsForSet, true, darken);

	const defaultSet = { type: 0, pattern: 0, fills: [info.coatFill], outlines: [info.coatOutline] };
	// const defaultSet = { type: 0, pattern: 1, fills: [info.coatFill, whiteColor], outlines: [info.coatOutline, blackColor] };

	return {
		body: toSet(defaultSet, sprites.body[1]),
		head: toSet(info.head || defaultSet, sprites.head0[1]),
		nose: toSet(info.nose, sprites.noses[0]),
		ears: toSet(info.ears || defaultSet, sprites.ears),
		horn: toSet(info.horn, sprites.horns),
		wings: toSet(info.wings, sprites.wings[0]),
		frontLegs: toSet(defaultSet, sprites.frontLegs[1]),
		backLegs: toSet(defaultSet, sprites.backLegs[1]),
		frontHooves: toSet(info.frontHooves, frontHooves),
		backHooves: toSet(info.backHooves, backHooves),

		mane: toSet(info.mane, mergedManes),
		backMane: toSet(info.backMane, mergedBackManes),
		tail: toSet(info.tail, sprites.tails[0]),
		facialHair: toSet(info.facialHair, mergedFacialHair),

		headAccessory: toSet(info.headAccessory, mergedHeadAccessories),
		earAccessory: toSet(info.earAccessory, mergedEarAccessories),
		faceAccessory: toSetExtra(info.faceAccessory, sprites.faceAccessories),
		// faceAccessoryExtraPalette: getExtraPartPalette(info.faceAccessory, sprites.faceAccessoriesExtra, manager),
		neckAccessory: toSet(info.neckAccessory, sprites.neckAccessories[1]),
		frontLegAccessory: toSet(
			info.frontLegAccessory, frontLegAccessories),
		backLegAccessory: toSet(
			info.lockBackLegAccessory ? info.frontLegAccessory : info.backLegAccessory, backLegAccessories),
		frontLegAccessoryRight: toSet(
			info.unlockFrontLegAccessory ? info.frontLegAccessoryRight : info.frontLegAccessory, frontLegAccessories),
		backLegAccessoryRight: toSet(
			info.lockBackLegAccessory ?
				(info.unlockFrontLegAccessory ? info.frontLegAccessoryRight : info.frontLegAccessory) :
				(info.unlockBackLegAccessory ? info.backLegAccessoryRight : info.backLegAccessory), backLegAccessories),
		lockBackLegAccessory: info.lockBackLegAccessory,
		unlockFrontLegAccessory: info.unlockFrontLegAccessory,
		unlockBackLegAccessory: info.unlockBackLegAccessory,
		backAccessory: toSet(info.backAccessory, mergedBackAccessories),
		waistAccessory: toSet(info.waistAccessory, sprites.waistAccessories[1]),
		chestAccessory: toSet(info.chestAccessory, mergedChestAccessories),
		sleeveAccessory: toSet(info.sleeveAccessory, frontLegSleeves),
		extraAccessory: toSet(info.extraAccessory, mergedExtraAccessories),

		coatPalette: manager.addArray(toColorList([info.coatFill, info.coatOutline])),
		coatFill: undefined,
		coatOutline: undefined,
		lockCoatOutline: !!info.lockCoatOutline,

		eyelashes: toInt(info.eyelashes),
		eyePaletteLeft: manager.addArray(toColorList([
			info.eyeWhitesLeft || whiteColor,
			info.eyelashColor || blackColor
		])),
		eyePalette: manager.addArray(toColorList([
			info.eyeWhites || whiteColor,
			(info.unlockEyelashColor ? info.eyelashColorLeft : info.eyelashColor) || blackColor
		])),
		eyeColorLeft: manager.addArray(toColorList([info.eyeColorLeft])),
		eyeColorRight: manager.addArray(toColorList([info.eyeColorRight])),
		eyeWhitesLeft: undefined,
		eyeWhites: undefined,
		eyeOpennessLeft: toInt(info.eyeOpennessLeft),
		eyeOpennessRight: toInt(info.eyeOpennessRight),
		eyeshadow: info.eyeshadow,
		eyeshadowColor: manager.addArray(toColorList([info.eyeshadowColor])),
		lockEyes: !!info.lockEyes,
		lockEyeColor: !!info.lockEyeColor,
		unlockEyeWhites: !!info.unlockEyeWhites,
		unlockEyelashColor: !!info.unlockEyelashColor,
		eyelashColor: undefined,
		eyelashColorLeft: undefined,

		fangs: toInt(info.fangs),
		muzzle: toInt(info.muzzle),
		freckles: 0, // remove
		frecklesColor: undefined, // TODO: remove
		magicColor: undefined,
		magicColorValue: typeof info.magicColor === 'string' ? parseColorFast(info.magicColor) : toInt(info.magicColor),

		cm: undefined,
		cmFlip: !!info.cmFlip,
		cmPalette: createCMPalette<T>(info.cm, manager, parseCMColor),

		customOutlines: !!info.customOutlines,
		freeOutlines: !!info.freeOutlines,
		darkenLockedOutlines: !!info.darkenLockedOutlines,
		defaultPalette: manager.addArray(defaultPalette),
		waterPalette: manager.addArray(sprites.pony_wake_1.palette),
	};
}

export function toPalette(info: PonyInfo, manager = mockPaletteManager): PalettePonyInfo {
	return toPaletteGeneric(info, manager, toColorList, getColorsForSet, '000000', 'ffffff', parseCMColor);
}

export function toPaletteNumber(info: PonyInfoNumber, manager = mockPaletteManager): PalettePonyInfo {
	return toPaletteGeneric<number>(info, manager, toColorListNumber, getColorsForSetNumber, BLACK, WHITE, x => x);
}

export function releasePalettes(info: PalettePonyInfo): void {
	for (const key of Object.keys(info)) {
		const value = (info as any)[key]; // undefined | number | string | PaletteSpriteSet | Palette;

		if (value && typeof value === 'object') {
			if ('refs' in value) {
				const palette = value as Palette;
				releasePalette(palette);
			} else if ('palette' in value) {
				const set = value as PaletteSpriteSet;
				releasePalette(set.palette);
				releasePalette(set.extraPalette);
			}
		}
	}
}
