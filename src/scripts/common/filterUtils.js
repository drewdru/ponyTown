"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MAX_REPEATS = 16; // needs to be even for emoji
exports.ipRegexText = '(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})';
exports.ipExceptionRegex = /\d\.\d\.\d\.\d/i;
exports.urlExceptionRegex = /^(battle|paint|f(im|an)fiction)\.net$/i;
exports.urlRegexTexts = [
    'https?:?//\\S+',
    '\\bwww\\.[^. ]\\S+',
    '\\S+[^. ]\\. *(c[o0]m|net)\\b',
    '\\S+[^. ] *\\.(c[o0]m|net)\\b',
    '(^| )[a-z][a-z0-9]{2,}[.,][a-z]{2,3}(/[a-z0-9_?=+-]+)+\\b',
];
function trimRepeatedLetters(test) {
    if (test.length > MAX_REPEATS && (/^.?(.)\1+$/u.test(test) || /^.?(..)\1+$/u.test(test))) {
        return test.substr(0, MAX_REPEATS) + '…';
    }
    else {
        return test;
    }
}
exports.trimRepeatedLetters = trimRepeatedLetters;
//# sourceMappingURL=filterUtils.js.map