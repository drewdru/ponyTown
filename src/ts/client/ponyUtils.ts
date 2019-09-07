/// <reference path="../../typings/my.d.ts" />

import { range, dropRight, compact, max, zip } from 'lodash';
import {
	Eye, Iris, Muzzle, ExpressionExtra, Sprite, ColorExtraSets, PonyInfoBase, SpriteSetBase, ColorExtra, ColorExtraSet
} from '../common/interfaces';
import * as sprites from '../generated/sprites';
import { HEAD_ACCESSORY_OFFSETS, EXTRA_ACCESSORY_OFFSETS, EAR_ACCESSORY_OFFSETS } from '../common/offsets';

export const PONY_WIDTH = 80;
export const PONY_HEIGHT = 70;
export const BLINK_FRAMES = [2, 6, 6, 4, 2];
export const SLEEVED_ACCESSORIES = [2, 3, 4];
export const SLEEVED_BACK_ACCESSORIES = [5, 6];
export const CHEST_ACCESSORIES_IN_FRONT = [1];
export const NO_MANE_HEAD_ACCESSORIES = [0, 16];
// export const FRONT_NECK_ACCESSORIES = [2, 10];

export type Sprites = (Sprite | undefined)[];
export type Sets = ColorExtraSets[]; // [frame][type][pattern]

export const headCenter = [
	undefined,
	[[0].map(i => sprites.head[2]![0]![i])],
];

export const claws: Sets = sprites.frontLegHooves
	.map(f => f && [undefined, undefined, undefined, f[4], undefined, undefined]);
export const frontHooves: Sets = sprites.frontLegHooves
	.map(f => f && [...f.slice(0, 4), ...f.slice(5)]);

export const frontHoovesInFront = [false, false, true, true, false, false];
export const backHoovesInFront = [false, false, true, false, false];

const bodyFrames = sprites.body.length;

export const wings = createCompleteSets(sprites.wings, 3 + 10);
export const tails = createCompleteSets(sprites.tails, 3);
export const chest = createCompleteSets(sprites.chestAccessories, bodyFrames);
export const chestBehind = createCompleteSets(sprites.chestAccessoriesBehind, bodyFrames);
export const backAccessories = createCompleteSets(sprites.backAccessories, bodyFrames);
sprites.neckAccessories.forEach(f => f && f.pop()); // TEMP: remove headphones
export const neckAccessories = createCompleteSets(sprites.neckAccessories, bodyFrames);
export const waistAccessories = createCompleteSets(sprites.waistAccessories, bodyFrames + 1);

function frameType(sets: Sets, frame: number, type: number) {
	const set = sets[frame];
	return set && set[type];
}

function createCompleteSets(sets: Sets, frameCount: number): Sets {
	const typeCount = sets.reduce((max, s) => Math.max(max, s ? s.length : 0), 0);
	const typeRange = range(0, typeCount);
	const result: Sets = [];

	for (let frame = 0; frame < frameCount; frame++) {
		result.push(typeRange.map(type => frameType(sets, frame, type) || frameType(result, frame - 1, type)));
	}

	return result;
}

export function canFly(info: PonyInfoBase<any, SpriteSetBase>) {
	const type = info.wings && info.wings.type || 0;
	return type > 0;
}

export function canMagic(info: PonyInfoBase<any, SpriteSetBase>) {
	const type = info.horn && info.horn.type || 0;
	return type === 1 || type === 2 || type === 3 || type === 14;
}

export function flipIris(iris: Iris): Iris {
	if (iris === Iris.Left || iris === Iris.UpLeft) {
		return iris + 1;
	} else if (iris === Iris.Right || iris === Iris.UpRight) {
		return iris - 1;
	} else {
		return iris;
	}
}

export function flipFaceAccessoryType(type: number) {
	if (type === 6) return 7;
	if (type === 7) return 6;

	if (type === 9) return 10;
	if (type === 10) return 9;

	return type;
}

export function flipFaceAccessoryPattern(type: number, pattern: number) {
	if (type === 2) { // dark glasses
		if (pattern === 1) return 2;
		if (pattern === 2) return 1;
	} else if (type === 11) { // large dark glasses
		if (pattern === 1) return 2;
		if (pattern === 2) return 1;
	}

	return pattern;
}

export const defaultExpression = {
	left: Eye.Neutral,
	leftIris: Iris.Forward,
	right: Eye.Neutral,
	rightIris: Iris.Forward,
	muzzle: Muzzle.Neutral,
	extra: ExpressionExtra.None,
};

export const blinkFrames: Eye[][] = [];

function setupBlinkFrames(frames: Eye[]) {
	dropRight(frames, 1).forEach((f, i) => blinkFrames[f] = blinkFrames[f] || frames.slice(i + 1));
}

setupBlinkFrames([Eye.Neutral, Eye.Neutral2, Eye.Neutral3, Eye.Neutral4, Eye.Neutral5, Eye.Closed]);
setupBlinkFrames([Eye.Frown, Eye.Frown2, Eye.Frown3, Eye.Frown4, Eye.Closed]);
setupBlinkFrames([Eye.Sad, Eye.Sad2, Eye.Sad3, Eye.Sad4, Eye.Neutral5, Eye.Closed]);
setupBlinkFrames([Eye.Angry, Eye.Angry2, Eye.Neutral4, Eye.Neutral5, Eye.Closed]);

// sets

function mergeColorExtras(sprites: (ColorExtra | undefined)[]): ColorExtra | undefined {
	const filtered = compact(sprites);

	return {
		...filtered[0],
		colors: max(filtered.map(x => x.colors || 0)),
		colorMany: filtered.length > 1 ? filtered.map(x => x.color) : undefined,
	};
}

function mergeSprites(sets: ColorExtraSet[]): ColorExtraSet {
	return zip(...sets).map(mergeColorExtras);
}

function mergeSpriteSets(...sets: ColorExtraSets[]): ColorExtraSets {
	return zip(...sets).map(mergeSprites);
}

export const backLegSleeves: Sets = sprites.backLegSleeves
	.map(sets => sets && [undefined, undefined, undefined, undefined, undefined, ...sets]);

// TEMP: remove summer hat
sprites.headAccessoriesBehind.pop();
sprites.headAccessories.pop();

export const mergedManes = mergeSpriteSets(sprites.behindManes, sprites.topManes, sprites.frontManes)!;
export const mergedBackManes = mergeSpriteSets(sprites.backBehindManes, sprites.backFrontManes)!;
export const mergedFacialHair = mergeSpriteSets(sprites.facialHairBehind, sprites.facialHair)!;
export const mergedEarAccessories = mergeSpriteSets(sprites.earAccessoriesBehind, sprites.earAccessories)!;
export const mergedHeadAccessories = mergeSpriteSets(sprites.headAccessoriesBehind, sprites.headAccessories)!;
export const mergedFaceAccessories = mergeSpriteSets(sprites.faceAccessories, sprites.faceAccessories2)!;
export const mergedChestAccessories = mergeSpriteSets(sprites.chestAccessoriesBehind[1], sprites.chestAccessories[1])!;
export const mergedBackAccessories = mergeSpriteSets(
	backAccessories[1], [undefined, undefined, undefined, undefined, undefined, ...sprites.backLegSleeves[1]!])!;
export const mergedExtraAccessories = mergeSpriteSets(sprites.extraAccessoriesBehind, sprites.extraAccessories)!
	.slice(0, DEVELOPMENT ? 100 : 2);

if (DEVELOPMENT) {
	assertSizes('HEAD_ACCESSORY_OFFSETS', HEAD_ACCESSORY_OFFSETS, mergedManes);
	assertSizes('EXTRA_ACCESSORY_OFFSETS', EXTRA_ACCESSORY_OFFSETS, mergedManes);
	assertSizes('EAR_ACCESSORY_OFFSETS', EAR_ACCESSORY_OFFSETS, sprites.ears);
	assertSizes('frontHoovesInFront', frontHoovesInFront, frontHooves[1]!);
	assertSizes('backHoovesInFront', backHoovesInFront, sprites.backLegHooves[1]!);
}

function assertSizes(name: string, a: any[], b: any[]) {
	if (a.length !== b.length) {
		throw new Error(`Invalid ${name} length (${a.length} !== ${b.length})`);
	}
}
