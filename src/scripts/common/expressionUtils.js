"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const utils_1 = require("./utils");
const double = (items) => items.map(x => x + x);
const prefix = (items, fix) => items.map(x => fix + x);
const suffix = (items, fix) => items.map(x => x + fix);
exports.THREE_LETTER_WORDS = [
    'ace', 'act', 'ama', 'amp', 'amo', 'amu', 'amy', 'ana', 'ane', 'and', 'ant', 'any', 'ape', 'app', 'apo',
    'apt', 'ava', 'ave', 'avo', 'awe', 'awn', 'awp', 'axe',
    'boa', 'bob', 'bod', 'bog', 'bon', 'boo', 'bop', 'bot', 'boy', 'bub', 'bud', 'bug', 'bup', 'but', 'bun', 'buy',
    'dad', 'doe', 'dog', 'dot', 'doy', 'dna', 'dub', 'dud', 'due', 'dun', 'dug', 'duo', 'dup', 'dva', 'dvd',
    'eco', 'ecu', 'eme', 'emu', 'emo', 'eon', 'end', 'eng', 'eva', 'eve', 'exe', 'exp',
    'gnu', 'goa', 'god', 'gog', 'gon', 'goo', 'got', 'gud', 'gut', 'gun', 'guv', 'guy',
    'nnn', 'nog', 'non', 'noo', 'nop', 'not', 'nun', 'nut', 'nub',
    'oca', 'omo', 'one', 'ooo', 'oot', 'ope', 'opt', 'oud', 'out', 'ova', 'owe', 'own', 'oxo', 'oxe', 'omg',
    'pay', 'pnp', 'pod', 'pon', 'poo', 'pop', 'pot', 'pov', 'ppp', 'pub', 'pud', 'pug', 'pup', 'pun', 'put', 'pvp',
    'qqq', 'que', 'qua',
    'tnt', 'ton', 'top', 'tod', 'toe', 'tog', 'too', 'toy', 'tub', 'tug', 'tun', 'twa', 'two',
    'uuu', 'una', 'und', 'uno', 'ump', 'upo', 'uva',
    'voe', 'voy', 'vpn', 'vug', 'vvv',
    'yay', 'yob', 'yod', 'yon', 'you', 'yup',
];
exports.TWO_LETTER_WORDS = [
    'ox', 'ex', 'by', 'my', 'up', 'of', 'if', 'me', 'ow', 'am', 'we', 'uh', 'um', 'be', 'em', 'bi', 'oh',
    'go', 'eh', 'ah', 'ye', 'ya', 'he', 'hi', 'ho', 'ha', 'yo', 'us', 'on', 'id', 'an', 'do', 'no',
    'as', 'at', 'it', 'is', 'or', 'so', 'to', 'pc',
];
const threeLetterWords = new RegExp(`^(${exports.THREE_LETTER_WORDS.join('|')})$`);
const twoLetterWords = new RegExp(`^(${exports.TWO_LETTER_WORDS.join('|')})$`);
// vertical :)
const smilesRight = [')', ']', '}', '>'];
const smilesLeft = ['(', '[', '{', '<', 'C', 'c'];
const flatBoth = ['|', 'i', 'l'];
const concernedBoth = ['/', '\\', 's', 'S', '?'];
const muzzlesBoth = [
    [3 /* Scrunch */, 't', 'T', 'I'],
    [4 /* Blep */, 'P', 'p', 'd'],
    [25 /* FlatBlep */, 'b'],
    [6 /* Flat */, ...flatBoth],
    [7 /* Concerned */, ...concernedBoth],
    [8 /* ConcernedOpen */, '0', 'v'],
    [12 /* ConcernedOpen2 */, 'O'],
    [24 /* Oh */, 'o'],
    [13 /* Kiss */, '*', 'x', 'X'],
    [23 /* NeutralPant */, 'L'],
    [22 /* SmilePant */, 'Q'],
    [10 /* FrownOpen */, 'V'],
    [11 /* NeutralOpen2 */, 'u', 'n'],
    [15 /* NeutralOpen3 */, 'U'],
    [20 /* NeutralTeeth */, ...double(flatBoth)],
    [21 /* ConcernedTeeth */, ...double(concernedBoth)],
];
exports.muzzlesRight = createMap([
    ...muzzlesBoth,
    [0 /* Smile */, '3', ...smilesRight],
    [1 /* Frown */, ...smilesLeft],
    [5 /* SmileOpen */, 'D'],
    [9 /* SmileOpen2 */, 'DD'],
    [14 /* SmileOpen3 */, 'DDD'],
    [18 /* SmileTeeth */, ...double(smilesRight)],
    [19 /* FrownTeeth */, ...double(smilesLeft)],
]);
exports.muzzlesLeft = createMap([
    ...muzzlesBoth,
    [0 /* Smile */, ...smilesLeft],
    [1 /* Frown */, ...smilesRight],
    [12 /* ConcernedOpen2 */, 'D'],
    [16 /* ConcernedOpen3 */, 'DD', 'DDD'],
    [18 /* SmileTeeth */, ...double(smilesLeft)],
    [19 /* FrownTeeth */, ...double(smilesRight)],
]);
const neutralEyes = [';', ':', '=', '%', '8'];
const verticalEyesBoth = [
    [1 /* Neutral */, ...neutralEyes],
    [23 /* X */, 'X', 'x'],
    [3 /* Neutral3 */, 'B'],
    [11 /* Lines */, '|'],
];
exports.verticalEyesRight = createMap([
    ...verticalEyesBoth,
    [19 /* Angry */, ...prefix(neutralEyes, '>')],
    [20 /* Angry2 */, '>B'],
    [15 /* Sad */, ...prefix(neutralEyes, '<')],
    [16 /* Sad2 */, '<B'],
    [7 /* Frown */, ...prefix(neutralEyes, '|')],
    [8 /* Frown2 */, '|B'],
]);
exports.verticalEyesLeft = createMap([
    ...verticalEyesBoth,
    [19 /* Angry */, ...suffix(neutralEyes, '<')],
    [15 /* Sad */, ...suffix(neutralEyes, '>')],
    [7 /* Frown */, ...suffix(neutralEyes, '|')],
]);
// horizontal -_-
exports.horizontalMuzzles = createMap([
    [0 /* Smile */, 'c', 'C', 'v', 'V', 'u', 'U', 'w', 'W', '👃'],
    [22 /* SmilePant */, 'Q', 'P'],
    [1 /* Frown */, 'n', 'm', '^'],
    [2 /* Neutral */, '-', '//'],
    [23 /* NeutralPant */, 'q', 'p'],
    [6 /* Flat */, '_'],
    [13 /* Kiss */, '.', ',', '*', 'x', 'X', '3'],
    [7 /* Concerned */, '~'],
    [8 /* ConcernedOpen */, 'o'],
    [12 /* ConcernedOpen2 */, 'A', 'O', '0'],
]);
const horizontalEyes = [
    [1 /* Neutral */, `'`, '.', '0', '°', 'o', 'O', 'e', 'g', '9', '6', 'd', 'b'],
    [4 /* Neutral4 */, '='],
    [6 /* Closed */, '-', 'v', 'V', 'u', 'U', 'y', 'Y'],
    [14 /* ClosedHappy */, 'n'],
    [13 /* ClosedHappy2 */, '^'],
    [15 /* Sad */, 'q', 'Q', 'p', 'P', ';', ':', ','],
    [21 /* Peaceful */, 't', 'T'],
    [7 /* Frown */, 'ô', 'Ô', 'õ', 'Õ', 'ō', 'Ō', 'ŏ', 'Ŏ'],
    [8 /* Frown2 */, 'a'],
];
exports.horizontalEyesLeft = createMap([
    ...horizontalEyes,
    [2 /* Neutral2 */, '>'],
    [23 /* X */, '<'],
    [15 /* Sad */, 'ò', 'Ò'],
    [19 /* Angry */, 'ó', 'Ó'],
]);
exports.horizontalEyesRight = createMap([
    ...horizontalEyes,
    [2 /* Neutral2 */, '<'],
    [23 /* X */, '>'],
    [15 /* Sad */, 'ó', 'Ó'],
    [19 /* Angry */, 'ò', 'Ò'],
]);
const horizontalIrises = createMap([
    [1 /* Up */, '9'],
    [4 /* UpLeft */, 'e'],
    [5 /* UpRight */, 'g'],
    [3 /* Right */, '<', 'd'],
    [2 /* Left */, '>', 'b'],
]);
const muzzleToEye = [];
muzzleToEye[1 /* Frown */] = 15 /* Sad */;
muzzleToEye[10 /* FrownOpen */] = 15 /* Sad */;
muzzleToEye[12 /* ConcernedOpen2 */] = 15 /* Sad */;
muzzleToEye[16 /* ConcernedOpen3 */] = 15 /* Sad */;
const neutralToSmile = [];
neutralToSmile[8 /* ConcernedOpen */] = 9 /* SmileOpen2 */;
neutralToSmile[12 /* ConcernedOpen2 */] = 14 /* SmileOpen3 */;
function any(obj) {
    return `(${Object.keys(obj).map(lodash_1.escapeRegExp).join('|')})`;
}
const bigEyes = /[O0ÒÓÔÕŌŎQ]/;
const cryingEye = /[;pqPQTyY]/;
const tears = "(['`,]?)";
const tearsRegex = /['`,]/;
const verticalRightRegex = new RegExp(`^${any(exports.verticalEyesRight)}${tears}-?${any(exports.muzzlesRight)}$`);
const verticalLeftRegex = new RegExp(`^${any(exports.muzzlesLeft)}-?${tears}${any(exports.verticalEyesLeft)}$`);
const horizontalRegex = new RegExp(`^${any(exports.horizontalEyesRight)}(//)?${any(exports.horizontalMuzzles)}(//)?${any(exports.horizontalEyesLeft)}$`);
function matchVertical(text, regex, flip, muzzleMap, eyesMap) {
    if (/^([|]{2,}|BS|8x|x8|x-?x|\d+)$/i.test(text))
        return undefined;
    const match = regex.exec(text);
    if (!match)
        return undefined;
    const eyesStr = flip ? match[3] : match[1];
    const muzzleStr = flip ? match[1] : match[3];
    const muzzle = muzzleMap[muzzleStr];
    const veye = eyesMap[eyesStr];
    const eye = veye === 1 /* Neutral */ && !/[OV]/.test(muzzleStr) ? (muzzleToEye[muzzle] || veye) : veye;
    const blink = /;/.test(eyesStr);
    const tear = blink && muzzleToEye[muzzle] === 15 /* Sad */;
    const left = tear ? (/[<>]/.test(eyesStr) ? eye : 16 /* Sad2 */) : (blink && flip ? 6 /* Closed */ : eye);
    const right = tear ? (/[<>]/.test(eyesStr) ? eye : 16 /* Sad2 */) : (blink && !flip ? 6 /* Closed */ : eye);
    const shocked = /8/.test(eyesStr);
    const rightIris = shocked ? 6 /* Shocked */ : 0 /* Forward */;
    const leftIris = shocked ? 6 /* Shocked */ : (/%/.test(eyesStr) ? 1 /* Up */ : 0 /* Forward */);
    const extra = (tearsRegex.test(match[2]) || tear) ? 8 /* Tears */ : 0 /* None */;
    return { right, left, muzzle, rightIris, leftIris, extra };
}
function matchHorizontal(text) {
    if (/\.\.|--|vv|uu|qq|pp|nn|^\d+$/i.test(text)) {
        return undefined;
    }
    if (/[a-zA-Z][a-z][a-z]|[A-Z]{3}/.test(text)) {
        const clear = text.replace(/[^a-z]/ig, '').toLowerCase();
        if (clear.length === 3 && threeLetterWords.test(clear)) {
            return undefined;
        }
    }
    if (/[a-z][a-z][.,*-]/i.test(text)) {
        const clear = text.replace(/[^a-z]/ig, '').toLowerCase();
        if (clear.length === 2 && twoLetterWords.test(clear)) {
            return undefined;
        }
    }
    const match = horizontalRegex.exec(text);
    if (!match) {
        return undefined;
    }
    const [, rightStr, rightBlush, muzzleStr, leftBlush, leftStr] = match;
    if ((rightBlush || leftBlush) && rightBlush !== leftBlush) {
        return undefined;
    }
    const leftEye = exports.horizontalEyesLeft[leftStr];
    const rightEye = exports.horizontalEyesRight[rightStr];
    const muzzle = exports.horizontalMuzzles[muzzleStr];
    const same = rightStr === leftStr;
    const lookingToSide = same && /[<>]/.test(rightStr);
    const shocked = bigEyes.test(leftStr) && bigEyes.test(rightStr) && rightStr !== '0' && leftStr !== '0';
    const lookingDown = (same && rightStr === '6') || (rightStr === 'b' && leftStr === 'd');
    const unamused = !lookingDown && same && rightStr === '-' && /[.,_]/.test(muzzleStr);
    const left = (lookingToSide || (leftStr === 'o' && bigEyes.test(rightStr))) ? 2 /* Neutral2 */ : leftEye;
    const right = (lookingToSide || (rightStr === 'o' && bigEyes.test(leftStr))) ? 2 /* Neutral2 */ : rightEye;
    const blush = /[/][/]/.test(muzzleStr) || (rightBlush && rightBlush === leftBlush);
    const cry = cryingEye.test(leftStr) || cryingEye.test(rightStr);
    return {
        left: unamused ? 8 /* Frown2 */ : left,
        right: unamused ? 8 /* Frown2 */ : right,
        muzzle: same && (leftEye === 14 /* ClosedHappy */ || leftEye === 13 /* ClosedHappy2 */) ? (neutralToSmile[muzzle] || muzzle) : muzzle,
        rightIris: lookingDown ? 7 /* Down */ : (shocked ? 6 /* Shocked */ : (horizontalIrises[rightStr] || 0 /* Forward */)),
        leftIris: lookingDown ? 7 /* Down */ : (shocked ? 6 /* Shocked */ : (horizontalIrises[leftStr] || 0 /* Forward */)),
        extra: (blush ? 1 /* Blush */ : 0 /* None */) | (cry ? 4 /* Cry */ : 0 /* None */),
    };
}
function expression(right, left, muzzle, rightIris = 0 /* Forward */, leftIris = 0 /* Forward */, extra = 0 /* None */) {
    return { right, left, muzzle, rightIris, leftIris, extra };
}
exports.expression = expression;
const constants = utils_1.createPlainMap({
    '^^': () => expression(13 /* ClosedHappy2 */, 13 /* ClosedHappy2 */, 0 /* Smile */),
    '))': () => expression(1 /* Neutral */, 1 /* Neutral */, 0 /* Smile */),
    '((': () => expression(1 /* Neutral */, 1 /* Neutral */, 1 /* Frown */),
    '>>': () => expression(2 /* Neutral2 */, 2 /* Neutral2 */, 6 /* Flat */, 2 /* Left */, 2 /* Left */),
    '<<': () => expression(2 /* Neutral2 */, 2 /* Neutral2 */, 6 /* Flat */, 3 /* Right */, 3 /* Right */),
    '🙂': () => expression(1 /* Neutral */, 1 /* Neutral */, 0 /* Smile */),
    '😵': () => expression(1 /* Neutral */, 1 /* Neutral */, 0 /* Smile */, 1 /* Up */, 0 /* Forward */),
    '😐': () => expression(1 /* Neutral */, 1 /* Neutral */, 6 /* Flat */),
    '😑': () => expression(11 /* Lines */, 11 /* Lines */, 6 /* Flat */),
    '😆': () => expression(23 /* X */, 23 /* X */, 5 /* SmileOpen */),
    '😟': () => expression(15 /* Sad */, 15 /* Sad */, 2 /* Neutral */),
    '😠': () => expression(19 /* Angry */, 19 /* Angry */, 0 /* Smile */),
    '🤔': () => expression(1 /* Neutral */, 8 /* Frown2 */, 13 /* Kiss */),
    '😈': () => expression(19 /* Angry */, 19 /* Angry */, 0 /* Smile */, 1 /* Up */, 0 /* Forward */),
    '👿': () => expression(19 /* Angry */, 19 /* Angry */, 18 /* SmileTeeth */),
});
function matchOther(text) {
    if (/^A{5,}\.*$/.test(text)) {
        return expression(1 /* Neutral */, 1 /* Neutral */, 16 /* ConcernedOpen3 */, 6 /* Shocked */, 6 /* Shocked */);
    }
    else if (/^a{5,}\.*$/.test(text)) {
        return expression(1 /* Neutral */, 1 /* Neutral */, 16 /* ConcernedOpen3 */);
    }
    else if (/^z{3,}\.*$/i.test(text)) {
        return expression(6 /* Closed */, 6 /* Closed */, 2 /* Neutral */);
    }
    else {
        return constants[text] && constants[text]();
    }
}
function matchExpression(text) {
    if (/тот/ui.test(text)) {
        return undefined;
    }
    text = replaceRussian(text)
        .replace(/D{4,}/, 'DDD')
        .replace(/\\/g, '/')
        .replace(/\/{3,}/g, '//');
    return matchVertical(text, verticalRightRegex, false, exports.muzzlesRight, exports.verticalEyesRight)
        || matchVertical(text, verticalLeftRegex, true, exports.muzzlesLeft, exports.verticalEyesLeft)
        || matchHorizontal(text)
        || matchOther(text);
}
exports.matchExpression = matchExpression;
function parseExpression(text) {
    const emoteMatch = /(?:^| )(\S+)\s*$/.exec(text);
    const emote = emoteMatch && emoteMatch[1].trim();
    return emote ? matchExpression(emote) : undefined;
}
exports.parseExpression = parseExpression;
function createMap(values) {
    return values.reduce((obj, [exp, ...values]) => (values.forEach(v => obj[v] = exp), obj), Object.create(null));
}
const charMap = utils_1.createPlainMap({
    'З': '3', 'з': '3', 'Э': '3', 'э': '3',
    'А': 'A', 'а': 'a', 'Д': 'A', 'д': 'A',
    'В': 'B', 'в': 'B',
    'Г': 'L',
    'М': 'M', 'м': 'M',
    'О': 'O', 'о': 'o',
    'П': 'n', 'п': 'n',
    'Р': 'P', 'р': 'p',
    'С': 'C', 'с': 'c',
    'Т': 'T', 'т': 'T',
    'Х': 'X', 'х': 'x',
    'Ш': 'W', 'ш': 'w',
    'Ь': 'b', 'ь': 'b',
    'е': 'e',
    'у': 'y', 'У': 'Y',
});
const charRegex = new RegExp(`[${Object.keys(charMap).join('')}]`, 'g');
function mapChar(x) {
    return charMap[x];
}
function replaceRussian(text) {
    return text.replace(charRegex, mapChar);
}
//# sourceMappingURL=expressionUtils.js.map