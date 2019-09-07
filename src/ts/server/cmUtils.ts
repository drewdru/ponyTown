import { uniq, compact } from 'lodash';
import { hex } from 'color-convert';
import { getDeltaE00, LAB } from 'delta-e';
import { repeat } from '../common/utils';
import { CM_SIZE } from '../common/constants';

const patterns = [
	[ // 0
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[ // 1
		1, 1, 1, 0, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 0, 1, 1, 1,
	],
	[ // 2
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 0, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[ // 3
		1, 1, 1, 0, 1,
		0, 0, 1, 0, 1,
		1, 1, 0, 1, 1,
		1, 0, 1, 0, 0,
		1, 0, 1, 1, 1,
	],
	[ // 4
		0, 0, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 0, 0,
	],
	[ // 5
		0, 0, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 1, 0, 1, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 0, 0,
	],
	[ // 6
		0, 1, 1, 0, 0,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		0, 0, 1, 1, 0,
	],
	[ // 7
		1, 1, 1, 0, 0,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		0, 0, 1, 1, 1,
	],
	[ // 8
		0, 1, 1, 0, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 0, 1, 1, 0,
	],
	[ // 9
		0, 1, 1, 0, 0,
		0, 0, 1, 0, 1,
		1, 1, 0, 1, 1,
		1, 0, 1, 0, 0,
		0, 0, 1, 1, 0,
	],
	[ // 10
		0, 1, 1, 0, 0,
		0, 0, 1, 0, 1,
		1, 1, 0, 1, 1,
		1, 0, 1, 0, 0,
		0, 0, 1, 1, 0,
	],
	[ // 11
		0, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 0,
	],
	[ // 12
		1, 0, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 0, 1,
	],
	// short arms
	[ // 13
		1, 0, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[ // 14
		0, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[ // 15
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 0, 1,
	],
	[ // 16
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 0,
	],
	// short arms inverted
	[
		1, 1, 1, 0, 0,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 0, 1, 1, 1,
	],
	[
		1, 1, 1, 0, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 0, 1, 1, 0,
	],
	[
		1, 1, 1, 0, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		0, 0, 1, 1, 1,
	],
	[ // 20
		0, 1, 1, 0, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 0, 1, 1, 1,
	],
	// long arms
	[
		0, 0, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 0, 1,
	],
	[
		0, 0, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 0,
	],
	[
		1, 0, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 0, 0,
	],
	[
		0, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 0, 0,
	],
	// no corners
	[ // 25
		1, 0, 0, 1, 1,
		1, 0, 1, 0, 0,
		0, 1, 1, 1, 0,
		0, 0, 1, 0, 1,
		1, 1, 0, 0, 1,
	],
	[
		1, 1, 0, 0, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 0, 0, 1, 1,
	],
	// small
	[
		0, 1, 1, 0, 1,
		0, 0, 1, 1, 1,
		0, 1, 1, 1, 0,
		0, 1, 0, 1, 1,
		0, 0, 0, 0, 0,
	],
	[
		1, 1, 0, 1, 0,
		0, 1, 1, 1, 0,
		1, 1, 1, 0, 0,
		1, 0, 1, 1, 0,
		0, 0, 0, 0, 0,
	],
	[
		0, 0, 0, 0, 0,
		0, 1, 1, 0, 1,
		0, 0, 1, 1, 1,
		0, 1, 1, 1, 0,
		0, 1, 0, 1, 1,
	],
	[ // 30
		0, 0, 0, 0, 0,
		1, 1, 0, 1, 0,
		0, 1, 1, 1, 0,
		1, 1, 1, 0, 0,
		1, 0, 1, 1, 0,
	],
	[
		0, 1, 0, 1, 1,
		0, 1, 1, 1, 0,
		0, 0, 1, 1, 1,
		0, 1, 1, 0, 1,
		0, 0, 0, 0, 0,
	],
	[
		1, 0, 1, 1, 0,
		1, 1, 1, 0, 0,
		0, 1, 1, 1, 0,
		1, 1, 0, 1, 0,
		0, 0, 0, 0, 0,
	],
	[
		0, 0, 0, 0, 0,
		0, 1, 0, 1, 1,
		0, 1, 1, 1, 0,
		0, 0, 1, 1, 1,
		0, 1, 1, 0, 1,
	],
	[
		0, 0, 0, 0, 0,
		1, 0, 1, 1, 0,
		1, 1, 1, 0, 0,
		0, 1, 1, 1, 0,
		1, 1, 0, 1, 0,
	],
	// weird shapes
	[ // 35
		0, 1, 1, 0, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 1, 1,
		0, 1, 0, 1, 0,
		0, 1, 0, 1, 1,
	],
	[
		1, 1, 0, 1, 0,
		0, 1, 0, 1, 0,
		1, 1, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 0, 1, 1, 0,
	],
	[
		1, 0, 1, 1, 0,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 1, 0, 0, 1,
		1, 1, 0, 0, 1,
	],
	[
		1, 0, 0, 1, 1,
		1, 0, 0, 1, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		0, 1, 1, 0, 1,
	],
	[
		0, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		0, 1, 1, 1, 0,
		0, 0, 1, 0, 1,
		1, 1, 0, 0, 1,
	],
	[ // 40
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		0, 1, 1, 1, 0,
		0, 0, 1, 0, 1,
		1, 1, 0, 0, 0,
	],
	[
		1, 0, 0, 1, 0,
		1, 0, 1, 0, 0,
		0, 1, 1, 1, 0,
		0, 0, 1, 0, 1,
		1, 1, 0, 0, 1,
	],
	[
		1, 0, 0, 1, 1,
		1, 0, 1, 0, 0,
		0, 1, 1, 1, 0,
		0, 0, 1, 0, 1,
		0, 1, 0, 0, 1,
	],
	// additional pixels
	[
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 1, 1,
		1, 1, 1, 0, 1,
	],
	[
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 1, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[ // 45
		1, 0, 1, 1, 1,
		1, 1, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[
		1, 0, 1, 1, 1,
		1, 0, 1, 1, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	// very wonky
	[
		1, 1, 1, 0, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 1, 0,
		1, 0, 1, 0, 0,
		0, 0, 1, 1, 1,
	],
	[
		1, 1, 1, 0, 0,
		0, 0, 1, 0, 1,
		0, 1, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 0, 1, 1, 1,
	],
	// missing one corner
	[
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		0, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[ // 50
		1, 0, 0, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 0,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 0, 0, 1,
	],
	// missing arms
	[
		0, 0, 1, 1, 1,
		0, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[
		1, 0, 1, 0, 0,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		1, 1, 1, 0, 1,
	],
	[ // 55
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 0,
		1, 1, 1, 0, 0,
	],
	[
		1, 0, 1, 1, 1,
		1, 0, 1, 0, 0,
		1, 1, 1, 1, 1,
		0, 0, 1, 0, 1,
		0, 0, 1, 0, 1,
	],
];

export function hexToLab(c: string): LAB {
	const [L, A, B] = hex.lab(c);
	return { L, A, B };
}

// export function colorToGrayscale(c: string) {
// 	const color = parseColorFast(c);
// 	const grayscale = toGrayscale(color);
// 	return getB(grayscale);
// }

export function theSameColor(a: LAB, b: LAB, delta = 27): boolean { // 27
	return getDeltaE00(a, b) < delta;
}

export function isBadCM(cmString: string[], coatColor: string | undefined): string | undefined {
	if (!cmString || !cmString.length)
		return undefined;

	const pad = CM_SIZE * CM_SIZE - cmString.length;
	const coat = hexToLab(coatColor || '000000');
	const padded = [...cmString, ...repeat(pad, '')];
	const cmAlpha = padded.map(c => (!c || (coatColor && theSameColor(hexToLab(c), coat, 1))) ? 0 : 1);
	const cmAlpha2 = padded.map(c => c ? 1 : 0);

	const hasAlpha = cmString.some(c => !c);
	const cm = [...cmString.map(c => c ? hexToLab(c) : coat), ...repeat(pad, coat)];
	const colorsString = compact(uniq([coatColor, ...cmString]));
	const colors = colorsString.map(hexToLab);

	// const cmGrayscale = padded.map(colorToGrayscale);
	// const grays = compact(uniq(cmGrayscale));

	let patternIndex = 0;

	for (const pattern of patterns) {
		if (matchesAlpha(pattern, cmAlpha)) {
			return `alpha(pattern:${patternIndex})`;
		}

		if (matchesAlpha(pattern, cmAlpha2)) {
			return `alpha2(pattern:${patternIndex})`;
		}

		for (const color of colors) {
			if (matchesColor(pattern, hasAlpha, color, cm)) {
				return `color(pattern:${patternIndex}, color:${colorsString[colors.indexOf(color)]})`;
			}
		}

		// for (const gray of grays) {
		// 	if (matchesGrayscale(pattern, gray, cmGrayscale, patternIndex > 1 ? 50 : 120)) {
		// 		return `grayscale(pattern:${patternIndex}, gray:${gray})`;
		// 	}
		// }

		patternIndex++;
	}

	return undefined;
}

function matchesAlpha(pattern: number[], cm: number[]): boolean {
	const length = Math.max(pattern.length, cm.length);

	for (let i = 0; i < length; i++) {
		if (pattern[i] !== cm[i]) {
			return false;
		}
	}

	return true;
}

function matchesColor(pattern: number[], hasAlpha: boolean, color: LAB, cm: LAB[]): boolean {
	for (let i = 0; i < pattern.length; i++) {
		const delta = hasAlpha ? 27 : 30;
		const on = pattern[i] === 1;
		const same = theSameColor(cm[i], color, delta);

		if (on !== same) {
			return false;
		}
	}

	return true;
}

// function matchesGrayscale(pattern: number[], color: number, cm: number[], delta: number): boolean {
// 	for (let i = 0; i < pattern.length; i++) {
// 		const on = pattern[i] === 1;
// 		const same = Math.abs(cm[i] - color) < delta;

// 		if (on !== same) {
// 			return false;
// 		}
// 	}

// 	return true;
// }
