"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const color_convert_1 = require("color-convert");
const delta_e_1 = require("delta-e");
const utils_1 = require("../common/utils");
const constants_1 = require("../common/constants");
const patterns = [
    [
        1, 0, 1, 1, 1,
        1, 0, 1, 0, 0,
        1, 1, 1, 1, 1,
        0, 0, 1, 0, 1,
        1, 1, 1, 0, 1,
    ],
    [
        1, 1, 1, 0, 1,
        0, 0, 1, 0, 1,
        1, 1, 1, 1, 1,
        1, 0, 1, 0, 0,
        1, 0, 1, 1, 1,
    ],
    [
        1, 0, 1, 1, 1,
        1, 0, 1, 0, 0,
        1, 1, 0, 1, 1,
        0, 0, 1, 0, 1,
        1, 1, 1, 0, 1,
    ],
    [
        1, 1, 1, 0, 1,
        0, 0, 1, 0, 1,
        1, 1, 0, 1, 1,
        1, 0, 1, 0, 0,
        1, 0, 1, 1, 1,
    ],
    [
        0, 0, 1, 1, 0,
        1, 0, 1, 0, 0,
        1, 1, 1, 1, 1,
        0, 0, 1, 0, 1,
        0, 1, 1, 0, 0,
    ],
    [
        0, 0, 1, 1, 0,
        1, 0, 1, 0, 0,
        1, 1, 0, 1, 1,
        0, 0, 1, 0, 1,
        0, 1, 1, 0, 0,
    ],
    [
        0, 1, 1, 0, 0,
        0, 0, 1, 0, 1,
        1, 1, 1, 1, 1,
        1, 0, 1, 0, 0,
        0, 0, 1, 1, 0,
    ],
    [
        1, 1, 1, 0, 0,
        0, 0, 1, 0, 1,
        1, 1, 1, 1, 1,
        1, 0, 1, 0, 0,
        0, 0, 1, 1, 1,
    ],
    [
        0, 1, 1, 0, 1,
        0, 0, 1, 0, 1,
        1, 1, 1, 1, 1,
        1, 0, 1, 0, 0,
        1, 0, 1, 1, 0,
    ],
    [
        0, 1, 1, 0, 0,
        0, 0, 1, 0, 1,
        1, 1, 0, 1, 1,
        1, 0, 1, 0, 0,
        0, 0, 1, 1, 0,
    ],
    [
        0, 1, 1, 0, 0,
        0, 0, 1, 0, 1,
        1, 1, 0, 1, 1,
        1, 0, 1, 0, 0,
        0, 0, 1, 1, 0,
    ],
    [
        0, 0, 1, 1, 1,
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
        0, 1, 1, 0, 1,
    ],
    // short arms
    [
        1, 0, 1, 1, 0,
        1, 0, 1, 0, 0,
        1, 1, 1, 1, 1,
        0, 0, 1, 0, 1,
        1, 1, 1, 0, 1,
    ],
    [
        0, 0, 1, 1, 1,
        1, 0, 1, 0, 0,
        1, 1, 1, 1, 1,
        0, 0, 1, 0, 1,
        1, 1, 1, 0, 1,
    ],
    [
        1, 0, 1, 1, 1,
        1, 0, 1, 0, 0,
        1, 1, 1, 1, 1,
        0, 0, 1, 0, 1,
        0, 1, 1, 0, 1,
    ],
    [
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
    [
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
    [
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
    [
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
    [
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
    [
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
    [
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
    [
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
    [
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
function hexToLab(c) {
    const [L, A, B] = color_convert_1.hex.lab(c);
    return { L, A, B };
}
exports.hexToLab = hexToLab;
// export function colorToGrayscale(c: string) {
// 	const color = parseColorFast(c);
// 	const grayscale = toGrayscale(color);
// 	return getB(grayscale);
// }
function theSameColor(a, b, delta = 27) {
    return delta_e_1.getDeltaE00(a, b) < delta;
}
exports.theSameColor = theSameColor;
function isBadCM(cmString, coatColor) {
    if (!cmString || !cmString.length)
        return undefined;
    const pad = constants_1.CM_SIZE * constants_1.CM_SIZE - cmString.length;
    const coat = hexToLab(coatColor || '000000');
    const padded = [...cmString, ...utils_1.repeat(pad, '')];
    const cmAlpha = padded.map(c => (!c || (coatColor && theSameColor(hexToLab(c), coat, 1))) ? 0 : 1);
    const cmAlpha2 = padded.map(c => c ? 1 : 0);
    const hasAlpha = cmString.some(c => !c);
    const cm = [...cmString.map(c => c ? hexToLab(c) : coat), ...utils_1.repeat(pad, coat)];
    const colorsString = lodash_1.compact(lodash_1.uniq([coatColor, ...cmString]));
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
exports.isBadCM = isBadCM;
function matchesAlpha(pattern, cm) {
    const length = Math.max(pattern.length, cm.length);
    for (let i = 0; i < length; i++) {
        if (pattern[i] !== cm[i]) {
            return false;
        }
    }
    return true;
}
function matchesColor(pattern, hasAlpha, color, cm) {
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
//# sourceMappingURL=cmUtils.js.map