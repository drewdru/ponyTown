import { findLastIndex, isString, isBoolean, isNumber, merge } from 'lodash';
import { fromByteArray, toByteArray } from 'base64-js';
import { PonyInfoNumber, SpriteSet, PonyInfo, PonyInfoBase, PaletteManager, PalettePonyInfo, ColorExtraSet } from './interfaces';
import { syncLockedPonyInfoNumber, syncLockedPonyInfo, createBasePony, toPaletteNumber } from './ponyInfo';
import { bitWriter, bitReader, ReadBits, WriteBits, countBits, numberToBitCount } from './bitUtils';
import { BLACK, WHITE, TRANSPARENT } from './colors';
import { at, toInt, pushUniq, array, clamp, includes, att } from './utils';
import { getColorCount } from '../client/spriteUtils';
import * as sprites from '../generated/sprites';
import { parseColorFast, colorToHexRGB } from './color';
import {
	SLEEVED_ACCESSORIES, frontHooves, mergedFacialHair, mergedBackAccessories, mergedManes,
	mergedBackManes, mergedExtraAccessories, mergedHeadAccessories
} from '../client/ponyUtils';
import { CM_SIZE } from './constants';

export const VERSION = 4;

interface FieldDefinition<T> {
	name: keyof PonyInfo;
	default?: T;
	omit?: (info: PonyInfoBase<any, SpriteSet<any>>) => boolean;
	dontSave?: boolean;
}

interface SetDefinition extends FieldDefinition<PrecompressedSet> {
	preserveOnZero?: boolean;
	sets: ColorExtraSet[];
	minColors?: number;
	// defaultLockFills?: boolean[];
	// defaultLockOutlines?: boolean[];
}

export interface PrecompressedSet {
	type: number;
	pattern: number;
	colors: number;
	fillLocks: number;
	fills: number[];
	outlineLocks: number;
	outlines: number[];
}

export interface Precompressed {
	version: number;
	colors: number[];
	setFields: (PrecompressedSet | undefined)[];
	colorFields: number[];
	numberFields: number[];
	booleanFields: boolean[];
	cm: number[];
}

const identity = <T>(x: T) => x;
const not = <T>(x: T) => !x;

function emptyOrUnlocked<T>(set: SpriteSet<T> | undefined): boolean {
	return !set || !set.type || !set.lockFills || set.lockFills.every(x => !x);
}

function emptyOrZeroLocked<T>(set: SpriteSet<T> | undefined, customOutlines: boolean): boolean {
	return !set || (
		set.type === 0 && set.pattern === 0 && set.lockFills !== undefined && set.lockFills[0] === true &&
		(!customOutlines || (set.lockOutlines !== undefined && set.lockOutlines[0] === true)));
}

function empty<T>(set: SpriteSet<T> | undefined): boolean {
	return !set || !set.type;
}

function omitMane(info: PonyInfoNumber) {
	return empty(info.mane) && emptyOrUnlocked(info.backMane)
		&& emptyOrUnlocked(info.tail) && emptyOrUnlocked(info.facialHair);
}

function omitHead(info: PonyInfoNumber): boolean {
	return emptyOrZeroLocked(info.head, !!info.customOutlines);
}

function omitSleeves(info: PonyInfoNumber) {
	return !info.chestAccessory || !includes(SLEEVED_ACCESSORIES, toInt(info.chestAccessory.type));
}

function omitFrontHooves(info: PonyInfoNumber) {
	return empty(info.frontHooves) && emptyOrUnlocked(info.backHooves);
}

function readTimes(read: ReadBits, count: number, bitsPerItem: number): number[] {
	const result: number[] = [];

	for (let i = 0; i < count; i++) {
		result[i] = read(bitsPerItem);
	}

	return result;
}

// NOTE: do not reorder or remove
const setFields: SetDefinition[] = [
	{ name: 'extraAccessory', sets: mergedExtraAccessories!, preserveOnZero: true },
	{ name: 'nose', sets: sprites.noses[0]!, preserveOnZero: true },
	{ name: 'ears', sets: sprites.ears!, preserveOnZero: true },
	{ name: 'mane', sets: mergedManes!, preserveOnZero: true, minColors: 1, omit: omitMane },
	{ name: 'backMane', sets: mergedBackManes! },
	{ name: 'tail', sets: sprites.tails[0]! },
	{ name: 'horn', sets: sprites.horns! },
	{ name: 'wings', sets: sprites.wings[0]! },
	{ name: 'frontHooves', sets: frontHooves[1]!, preserveOnZero: true, minColors: 1, omit: omitFrontHooves },
	{ name: 'backHooves', sets: sprites.backLegHooves[1]! },
	{ name: 'facialHair', sets: mergedFacialHair! },
	{ name: 'headAccessory', sets: mergedHeadAccessories },
	{ name: 'earAccessory', sets: sprites.earAccessories! },
	{ name: 'faceAccessory', sets: sprites.faceAccessories! },
	{ name: 'neckAccessory', sets: sprites.neckAccessories[1]! },
	{ name: 'frontLegAccessory', sets: sprites.frontLegAccessories[1]! },
	{ name: 'backLegAccessory', sets: sprites.backLegAccessories[1]!, omit: info => !!info.lockBackLegAccessory },
	{ name: 'backAccessory', sets: mergedBackAccessories! },
	{ name: 'waistAccessory', sets: sprites.waistAccessories[1]! },
	{ name: 'chestAccessory', sets: sprites.chestAccessories[1]! },
	{ name: 'sleeveAccessory', sets: sprites.frontLegSleeves[1]!, preserveOnZero: true, omit: omitSleeves },
	{ name: 'head', sets: sprites.head0[1]!, preserveOnZero: true, omit: omitHead },
	{
		name: 'frontLegAccessoryRight',
		sets: sprites.frontLegAccessories[1]!,
		omit: info => !info.unlockFrontLegAccessory,
	},
	{
		name: 'backLegAccessoryRight',
		sets: sprites.backLegAccessories[1]!,
		omit: info => !info.unlockBackLegAccessory || !!info.lockBackLegAccessory,
	},
];

const booleanFields: FieldDefinition<boolean>[] = [
	{ name: 'customOutlines' },
	{ name: 'lockEyes' },
	{ name: 'lockEyeColor' },
	{ name: 'lockCoatOutline', omit: info => !info.customOutlines },
	{
		name: 'lockBackLegAccessory', omit: info =>
			empty(info.frontLegAccessory) && empty(info.backLegAccessory) &&
			empty(info.frontLegAccessoryRight) && empty(info.backLegAccessoryRight)
	},
	{ name: 'eyeshadow' },
	{ name: 'cmFlip', omit: info => info.cm === undefined || info.cm.every(not) },
	{ name: 'unlockEyeWhites' },
	{ name: 'freeOutlines' },
	{ name: 'unlockFrontLegAccessory' },
	{ name: 'unlockBackLegAccessory', omit: info => !!info.lockBackLegAccessory },
	{ name: 'unlockEyelashColor' },
	{ name: 'darkenLockedOutlines', omit: info => !info.freeOutlines },
];

const numberFields: FieldDefinition<number>[] = [
	{ name: 'eyelashes' },
	{ name: 'eyeOpennessRight' },
	{ name: 'eyeOpennessLeft', omit: info => !!info.lockEyes },
	{ name: 'fangs' },
	{ name: 'muzzle' },
	{ name: 'freckles', dontSave: true }, // TODO: remove
];

const colorFields: FieldDefinition<number>[] = [
	{ name: 'coatFill' },
	{ name: 'coatOutline', omit: info => !info.customOutlines || !!info.lockCoatOutline },
	{ name: 'eyeColorRight' },
	{ name: 'eyeColorLeft', omit: info => !!info.lockEyeColor },
	{ name: 'eyeWhites', default: WHITE },
	{ name: 'eyeshadowColor', omit: info => !info.eyeshadow },
	{ name: 'frecklesColor', omit: info => !info.freckles, dontSave: true }, // TODO: remove
	{ name: 'eyeWhitesLeft', default: WHITE, omit: info => !info.unlockEyeWhites },
	{ name: 'eyelashColor' },
	{ name: 'eyelashColorLeft', omit: info => !info.unlockEyelashColor },
	{ name: 'magicColor', default: WHITE },
];

const omittableFields: FieldDefinition<any>[] = [
	...setFields,
	...booleanFields,
	...numberFields,
	...colorFields,
].filter(f => !!f.omit);

const VERSION_BITS = 6; // max 63
const COLORS_LENGTH_BITS = 10; // max 1024
const BOOLEAN_FIELDS_LENGTH_BITS = 4; // max 15
const NUMBER_FIELDS_LENGTH_BITS = 4; // max 15
const COLOR_FIELDS_LENGTH_BITS = 4; // max 15
const SET_FIELDS_LENGTH_BITS = 6; // max 63
const CM_LENGTH_BITS = 5; // max 31
const NUMBERS_BITS = 6; // max 63

/* istanbul ignore next */
if (DEVELOPMENT) {
	(function () {
		function verifyFields(obj: any, lengthBits: number, defs: FieldDefinition<any>[], verify: (field: any) => boolean) {
			const missing = Object.keys(obj)
				.filter(key => verify(obj[key]))
				.filter(key => defs.every(d => d.name !== key));

			const unnecessary = defs
				.filter(({ name }) => !verify(obj[name]));

			if (missing.length || unnecessary.length) {
				throw new Error(`Incorrect fields (${missing} / ${unnecessary})`);
			}

			if (lengthBits < countBits(defs.length)) {
				throw new Error(`Incorrect field length bits (${lengthBits}/${countBits(defs.length)})`);
			}
		}

		const defaultPony = createBasePony();
		verifyFields(defaultPony, SET_FIELDS_LENGTH_BITS, setFields, f => f.type !== undefined);
		verifyFields(defaultPony, COLOR_FIELDS_LENGTH_BITS, colorFields, isString);
		verifyFields(defaultPony, NUMBER_FIELDS_LENGTH_BITS, numberFields, isNumber);
		verifyFields(defaultPony, BOOLEAN_FIELDS_LENGTH_BITS, booleanFields, isBoolean);

		if (setFields.some(f => !f.sets)) {
			throw new Error(`Undefined set in set field (${setFields.find(f => !f.sets)!.name})`);
		}
	})();
}

function trimRight<T>(items: T[]) {
	const index = findLastIndex(items, x => !!x);
	return (index !== (items.length - 1)) ? items.slice(0, index + 1) : items;
}

export function precompressCM<T>(cm: (T | undefined)[] | undefined, addColor: (color: T | undefined) => number): number[] {
	const result: number[] = [];

	if (cm) {
		let length = CM_SIZE * CM_SIZE;

		while (length > 0 && !cm[length - 1]) {
			length--;
		}

		for (let i = 0; i < length; i++) {
			result.push(addColor(cm[i]));
		}
	}

	return result;
}

// lock sets

export function compressLockSet(set: boolean[] | undefined, count: number): number {
	const locks = set && set.slice ? set.slice(0, count) : [];
	return locks.reduce((result, l, i) => result | (l ? (1 << i) : 0), 0);
}

export function decompressLockSet(set: number, count: number, defaultValues: boolean[]): boolean[] {
	const result: boolean[] = [];

	for (let i = 0; i < MAX_COLORS; i++) {
		result[i] = i < count ? !!(set & (1 << i)) : defaultValues[i];
	}

	return result;
}

// colors

export function precompressColorSet<T>(
	set: (T | undefined)[] | undefined, count: number, locks: number, defaultColor: T, addColor: (color: T) => number
): number[] {
	const result: number[] = [];

	if (set) {
		for (let i = 0; i < count; i++) {
			if ((locks & (1 << i)) === 0) {
				const color = set[i];
				result.push(!color || color === defaultColor ? 0 : addColor(color));
			}
		}
	}

	return result;
}

export function postdecompressColorSet<T>(
	colors: number[], count: number, locks: number, colorList: number[], parseColor: (color: number) => T
): T[] {
	const result: T[] = [];

	for (let i = 0, j = 0; i < count; i++) {
		const locked = (locks & (1 << i)) !== 0;
		result.push(parseColor((locked ? 0 : colorList[colors[j++] - 1]) || BLACK));
	}

	return result;
}

// set

const MAX_COLORS = 6;
const ALL_UNLOCKED = array(MAX_COLORS, false);
const ALL_LOCKED = array(MAX_COLORS, true);

export function precompressSet<T>(
	set: SpriteSet<T> | undefined, def: SetDefinition, customOutlines: boolean, defaultColor: T, addColor: (color: T) => number
): PrecompressedSet | undefined {
	if (!set)
		return undefined;

	const type = clamp(toInt(set.type), 0, def.sets.length - 1);

	if (type === 0 && !def.preserveOnZero)
		return undefined;

	const patterns = at(def.sets, type);
	const pattern = clamp(toInt(set.pattern), 0, patterns ? patterns.length - 1 : 0);
	const sprite = att(patterns, pattern);
	const colors = Math.max(getColorCount(sprite), def.minColors || 0);

	/* istanbul ignore next */
	if (type === 0 && pattern === 0 && colors === 0)
		return undefined;

	const fillLocks = compressLockSet(set.lockFills, colors);
	const fills = precompressColorSet(set.fills, colors, fillLocks, defaultColor, addColor);
	const outlineLocks = customOutlines ? compressLockSet(set.lockOutlines, colors) : 0;
	const outlines = customOutlines ? precompressColorSet(set.outlines, colors, outlineLocks, defaultColor, addColor) : [];

	return { type, pattern, colors, fillLocks, fills, outlineLocks, outlines };
}

export function postdecompressSet<T>(
	set: PrecompressedSet, _def: SetDefinition, customOutlines: boolean, colorList: number[], parseColor: (color: number) => T
): SpriteSet<T> | undefined {
	return {
		type: set.type,
		pattern: set.pattern,
		lockFills: decompressLockSet(set.fillLocks, set.colors, /*def.defaultLockFills ||*/ ALL_UNLOCKED),
		fills: postdecompressColorSet(set.fills, set.colors, set.fillLocks, colorList, parseColor),
		lockOutlines: customOutlines ?
			decompressLockSet(set.outlineLocks, set.colors, /*def.defaultLockOutlines ||*/ ALL_LOCKED) :
			ALL_LOCKED,
		outlines: customOutlines ? postdecompressColorSet(set.outlines, set.colors, set.outlineLocks, colorList, parseColor) : [],
	};
}

// helpers

function precompressFields<TDef extends FieldDefinition<TResult>, TValue, TResult>(
	data: any, defs: TDef[], defaultValue: TResult, encode: (value: TValue | undefined, def: TDef) => TResult
): TResult[] {
	return trimRight(defs.map(def => {
		if (def.dontSave || (def.omit && def.omit(data))) {
			return defaultValue;
		} else {
			return encode(data[def.name], def);
		}
	}));
}

function postdecompressFields<TDef extends FieldDefinition<TValue>, TValue, TResult>(
	result: any, defs: TDef[], values: (TValue | undefined)[], defaultValue: TValue, decode: (value: TValue, def: TDef) => TResult
) {
	for (let i = 0; i < defs.length; i++) {
		const def = defs[i];
		const value = i >= values.length ? undefined : values[i];
		result[def.name] = decode(value === undefined ? defaultValue : value, def);
	}
}

// pony

type Info<T> = PonyInfoBase<T, SpriteSet<T>>;

export function precompressPony<T>(info: Info<T>, defaultColor: T, parseColor: (color: T) => number): Precompressed {
	const colors: number[] = [];
	const customOutlines = !!info.customOutlines;
	const addColor = (color: T | undefined) => {
		const c = color === undefined ? 0 : parseColor(color);
		return c === 0 ? 0 : pushUniq(colors, c);
	};

	return {
		version: VERSION,
		colors,
		booleanFields: precompressFields(info, booleanFields, false as boolean, x => !!x),
		numberFields: precompressFields(info, numberFields, 0, toInt),
		colorFields: precompressFields(info, colorFields, 0,
			(x: T | undefined, def) => (x === undefined || parseColor(x) === (def.default || BLACK)) ? 0 : addColor(x)),
		setFields: precompressFields(info, setFields, undefined,
			(x: SpriteSet<T> | undefined, def: SetDefinition) => precompressSet(x, def, customOutlines, defaultColor, addColor)),
		cm: precompressCM(info.cm, addColor),
	};
}

const frecklesToPattern = [0, 1, 1, 2, 2, 2, 1];
const frecklesToColor: number[][] = [[], [1], [1, 2], [2], [1], [1, 2], [2]];

function fixVersion<T>(result: Info<T>, data: Precompressed, parseColor: (color: number) => T) {
	if (data.version < 3) {
		result.head = {
			type: 0,
			pattern: frecklesToPattern[result.freckles || 0] || 0,
			fills: [result.coatFill],
			outlines: [result.coatOutline],
			lockFills: [true, true, true, true, true, true],
			lockOutlines: [true, true, true, true, true, true],
		};

		frecklesToColor[result.freckles || 0].forEach(index => {
			result.head!.fills![index] = result.frecklesColor || parseColor(BLACK);
			result.head!.lockFills![index] = false;
		});
	}
}

export function createPostDecompressPony() {
	return new Function('postdecompressSet', 'setFields', 'ommitableFields', 'fixVersion', [
		'function identity(x) { return x; }',
		'function getColor(colors, i) { return (i >= 0 && i < colors.length) ? colors[i] : 0; }',
		'function getCM(cm, colors) {',
		'  var result = [];',
		'  for(var i = 0; i < cm.length; i++) { result.push(getColor(colors, cm[i] - 1) || 0); }',
		'  return result;',
		'}',
		...omittableFields.map((def, i) => `var omit_${def.name} = ommitableFields[${i}].omit;`),
		'return function (data) {',
		'  var dataColors = data.colors;',
		'  var bools = data.booleanFields;',
		'  var numbers = data.numberFields;',
		'  var colors = data.colorFields;',
		'  var sets = data.setFields;',
		'  var result = {};',
		...booleanFields.map((def, i) => `  result.${def.name} = bools.length > ${i} ? bools[${i}] : false;`),
		...numberFields.map((def, i) => `  result.${def.name} = numbers.length > ${i} ? numbers[${i}] : 0;`),
		...colorFields.map((def, i) => `  result.${def.name} = colors.length > ${i} ? ` +
			`getColor(dataColors, colors[${i}] - 1) || ${def.default || BLACK} : ${def.default || BLACK};`),
		'  var customOutlines = !!result.customOutlines;',
		...setFields.map((def, i) => `  result.${def.name} = sets.length > ${i} && sets[${i}] !== undefined ? ` +
			`postdecompressSet(sets[${i}], setFields[${i}], customOutlines, data.colors, identity) : undefined;`),
		`  result.cm = data.cm.length ? getCM(data.cm, dataColors) : undefined;`,
		...omittableFields.map(def => `  if (omit_${def.name}(result)) result.${def.name} = undefined;`),
		'  fixVersion(result, data, identity);',
		'  return result;',
		'};',
	].join('\n'));
}

export const fastPostdecompressPony = createPostDecompressPony()(
	postdecompressSet, setFields, omittableFields, fixVersion);

export function postdecompressPony<T>(data: Precompressed, parseColor: (color: number) => T): Info<T> {
	// NOTE: when updating also update createPostDecompressPony()

	const result: Info<T> = {} as any;
	postdecompressFields(result, booleanFields, data.booleanFields, false as boolean, identity);
	postdecompressFields(result, numberFields, data.numberFields, 0 as number, identity);
	postdecompressFields(result, colorFields, data.colorFields, 0 as number,
		(x, def) => parseColor(data.colors[x - 1] || def.default || BLACK));
	const customOutlines = !!result.customOutlines;
	postdecompressFields(result, setFields, data.setFields, undefined,
		(x, def) => x === undefined ? undefined : postdecompressSet(x, def, customOutlines, data.colors, parseColor));

	result.cm = data.cm.length ? data.cm.map(x => parseColor(data.colors[x - 1] || TRANSPARENT)) : undefined;

	omittableFields.forEach(def => {
		if (def.omit && def.omit(result)) {
			result[def.name] = undefined;
		}
	});

	fixVersion(result, data, parseColor);

	return result;
}

// set

const TYPE_BITS = 5; // max 31
const PATTERN_BITS = 4; // max 15
const COLORS_BITS = 3; // max 7

export function writeSet(write: WriteBits, colorBits: number, customOutlines: boolean, set: PrecompressedSet | undefined) {
	write(set ? 1 : 0, 1);

	if (set) {
		write(set.type, TYPE_BITS);
		write(set.pattern, PATTERN_BITS);
		write(set.colors - 1, COLORS_BITS);
		write(set.fillLocks, set.colors);
		set.fills.forEach(c => write(c, colorBits));

		if (customOutlines) {
			write(set.outlineLocks, set.colors);
			set.outlines.forEach(c => write(c, colorBits));
		}
	}
}

export function readSet(read: ReadBits, colorBits: number, customOutlines: boolean): PrecompressedSet | undefined {
	const has = read(1);

	if (has) {
		const type = read(TYPE_BITS);
		const pattern = read(PATTERN_BITS);
		const colors = read(COLORS_BITS) + 1;
		const fillLocks = read(colors);
		const fills = readTimes(read, colors - countBits(fillLocks), colorBits);
		const outlineLocks = customOutlines ? read(colors) : 0;
		const outlines = customOutlines ? readTimes(read, colors - countBits(outlineLocks), colorBits) : [];
		return { type, pattern, colors, fillLocks, fills, outlineLocks, outlines };
	} else {
		return undefined;
	}
}

// helpers

function writeFields<T>(write: WriteBits, lengthBits: number, fields: T[], writeField: (value: T) => void) {
	write(fields.length, lengthBits);
	fields.forEach(writeField);
}

function readFields<T>(read: ReadBits, lengthBits: number, readField: (read: ReadBits) => T): T[] {
	const length = read(lengthBits);
	const result: T[] = [];

	for (let i = 0; i < length; i++) {
		result.push(readField(read));
	}

	return result;
}

// pony

export function writePony(write: WriteBits, data: Precompressed) {
	const colorBits = Math.max(numberToBitCount(data.colors.length), 1);
	const customOutlines = !!data.booleanFields[0];
	write(data.version, VERSION_BITS);
	writeFields(write, COLORS_LENGTH_BITS, data.colors, x => write(x >> 8, 24));
	writeFields(write, BOOLEAN_FIELDS_LENGTH_BITS, data.booleanFields, x => write(x ? 1 : 0, 1));
	writeFields(write, NUMBER_FIELDS_LENGTH_BITS, data.numberFields, x => write(x, NUMBERS_BITS));
	writeFields(write, COLOR_FIELDS_LENGTH_BITS, data.colorFields, x => write(x, colorBits));
	writeFields(write, SET_FIELDS_LENGTH_BITS, data.setFields, x => writeSet(write, colorBits, customOutlines, x));
	writeFields(write, CM_LENGTH_BITS, data.cm, x => write(x, colorBits));
}

const readColorValue = (read: ReadBits) => ((read(24) << 8) | 0xff) >>> 0;
const readBoolean = (read: ReadBits) => !!read(1);
const readBits = (bits: number) => (read: ReadBits) => read(bits);
const readNumber = readBits(NUMBERS_BITS);

export function readPony(read: ReadBits): Precompressed {
	const version = read(VERSION_BITS);

	if (version > VERSION) {
		throw new Error('Invalid version');
	}

	const colors = readFields(read, COLORS_LENGTH_BITS, readColorValue);
	const colorBits = Math.max(numberToBitCount(colors.length), 1);
	const readColor = readBits(colorBits);
	const booleanFields = readFields(read, BOOLEAN_FIELDS_LENGTH_BITS, readBoolean);
	const customOutlines = !!booleanFields[0];
	const numberFields = readFields(read, NUMBER_FIELDS_LENGTH_BITS, readNumber);
	const colorFields = readFields(read, COLOR_FIELDS_LENGTH_BITS, readColor);
	const setFields = readFields(read, version < 4 ? 5 : SET_FIELDS_LENGTH_BITS, read => readSet(read, colorBits, customOutlines));
	const cm = readFields(read, CM_LENGTH_BITS, readColor);
	return { version, colors, booleanFields, numberFields, colorFields, setFields, cm };
}

function writePonyToString(data: Precompressed): string {
	return fromByteArray(bitWriter(write => writePony(write, data)));
}

function readPonyFromBuffer(info: Uint8Array): Precompressed {
	return readPony(bitReader(info));
}

function readPonyFromString(info: string): Precompressed {
	return info ? readPonyFromBuffer(toByteArray(info)) : {
		version: VERSION,
		colors: [],
		booleanFields: [],
		numberFields: [],
		colorFields: [],
		setFields: [],
		cm: [],
	};
}

// compress

export function compressPony(info: PonyInfoNumber): string {
	return writePonyToString(precompressPony(info, BLACK, identity));
}

export function decompressPony(info: string | Uint8Array): PonyInfoNumber {
	const data = typeof info === 'string' ? readPonyFromString(info) : readPonyFromBuffer(info);
	const pony = fastPostdecompressPony(data); // postdecompressPony(data, identity);
	return syncLockedPonyInfoNumber(pony);
}

// compress (string)

function parseColorFastSafe(color: string): number {
	return color ? parseColorFast(color) : TRANSPARENT;
}

function colorToString(color: number): string {
	return color ? colorToHexRGB(color) : '';
}

export function compressPonyString(info: PonyInfo): string {
	return writePonyToString(precompressPony(info, '000000', parseColorFastSafe));
}

export function decompressPonyString(info: string, editable = false): PonyInfo {
	const data = readPonyFromString(info);
	const pony = postdecompressPony(data, colorToString);
	const result = editable ? merge(createBasePony(), pony) : pony;
	return syncLockedPonyInfo(result);
}

// decode

export function decodePonyInfo(info: string | Uint8Array, paletteManager: PaletteManager): PalettePonyInfo {
	return toPaletteNumber(decompressPony(info), paletteManager);
}
