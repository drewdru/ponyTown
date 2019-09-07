import { escapeRegExp } from 'lodash';
import { Muzzle, Eye, Expression, Iris, ExpressionExtra, Dict } from './interfaces';
import { createPlainMap } from './utils';

const double = (items: string[]) => items.map(x => x + x);
const prefix = (items: string[], fix: string) => items.map(x => fix + x);
const suffix = (items: string[], fix: string) => items.map(x => x + fix);

export const THREE_LETTER_WORDS = [
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

export const TWO_LETTER_WORDS = [
	'ox', 'ex', 'by', 'my', 'up', 'of', 'if', 'me', 'ow', 'am', 'we', 'uh', 'um', 'be', 'em', 'bi', 'oh',
	'go', 'eh', 'ah', 'ye', 'ya', 'he', 'hi', 'ho', 'ha', 'yo', 'us', 'on', 'id', 'an', 'do', 'no',
	'as', 'at', 'it', 'is', 'or', 'so', 'to', 'pc',
];

const threeLetterWords = new RegExp(`^(${THREE_LETTER_WORDS.join('|')})$`);
const twoLetterWords = new RegExp(`^(${TWO_LETTER_WORDS.join('|')})$`);

// vertical :)

const smilesRight = [')', ']', '}', '>'];
const smilesLeft = ['(', '[', '{', '<', 'C', 'c'];
const flatBoth = ['|', 'i', 'l'];
const concernedBoth = ['/', '\\', 's', 'S', '?'];
const muzzlesBoth = [
	[Muzzle.Scrunch, 't', 'T', 'I'],
	[Muzzle.Blep, 'P', 'p', 'd'],
	[Muzzle.FlatBlep, 'b'],
	[Muzzle.Flat, ...flatBoth],
	[Muzzle.Concerned, ...concernedBoth],
	[Muzzle.ConcernedOpen, '0', 'v'],
	[Muzzle.ConcernedOpen2, 'O'],
	[Muzzle.Oh, 'o'],
	[Muzzle.Kiss, '*', 'x', 'X'],
	[Muzzle.NeutralPant, 'L'],
	[Muzzle.SmilePant, 'Q'],
	[Muzzle.FrownOpen, 'V'],
	[Muzzle.NeutralOpen2, 'u', 'n'],
	[Muzzle.NeutralOpen3, 'U'],
	[Muzzle.NeutralTeeth, ...double(flatBoth)],
	[Muzzle.ConcernedTeeth, ...double(concernedBoth)],
];

export const muzzlesRight = createMap<Muzzle>([
	...muzzlesBoth,
	[Muzzle.Smile, '3', ...smilesRight],
	[Muzzle.Frown, ...smilesLeft],
	[Muzzle.SmileOpen, 'D'],
	[Muzzle.SmileOpen2, 'DD'],
	[Muzzle.SmileOpen3, 'DDD'],
	[Muzzle.SmileTeeth, ...double(smilesRight)],
	[Muzzle.FrownTeeth, ...double(smilesLeft)],
]);

export const muzzlesLeft = createMap<Muzzle>([
	...muzzlesBoth,
	[Muzzle.Smile, ...smilesLeft],
	[Muzzle.Frown, ...smilesRight],
	[Muzzle.ConcernedOpen2, 'D'],
	[Muzzle.ConcernedOpen3, 'DD', 'DDD'],
	[Muzzle.SmileTeeth, ...double(smilesLeft)],
	[Muzzle.FrownTeeth, ...double(smilesRight)],
]);

const neutralEyes = [';', ':', '=', '%', '8'];

const verticalEyesBoth = [
	[Eye.Neutral, ...neutralEyes],
	[Eye.X, 'X', 'x'],
	[Eye.Neutral3, 'B'],
	[Eye.Lines, '|'],
];

export const verticalEyesRight = createMap<Eye>([
	...verticalEyesBoth,
	[Eye.Angry, ...prefix(neutralEyes, '>')],
	[Eye.Angry2, '>B'],
	[Eye.Sad, ...prefix(neutralEyes, '<')],
	[Eye.Sad2, '<B'],
	[Eye.Frown, ...prefix(neutralEyes, '|')],
	[Eye.Frown2, '|B'],
]);

export const verticalEyesLeft = createMap<Eye>([
	...verticalEyesBoth,
	[Eye.Angry, ...suffix(neutralEyes, '<')],
	[Eye.Sad, ...suffix(neutralEyes, '>')],
	[Eye.Frown, ...suffix(neutralEyes, '|')],
]);

// horizontal -_-

export const horizontalMuzzles = createMap<Muzzle>([
	[Muzzle.Smile, 'c', 'C', 'v', 'V', 'u', 'U', 'w', 'W', '👃'],
	[Muzzle.SmilePant, 'Q', 'P'],
	[Muzzle.Frown, 'n', 'm', '^'],
	[Muzzle.Neutral, '-', '//'],
	[Muzzle.NeutralPant, 'q', 'p'],
	[Muzzle.Flat, '_'],
	[Muzzle.Kiss, '.', ',', '*', 'x', 'X', '3'],
	[Muzzle.Concerned, '~'],
	[Muzzle.ConcernedOpen, 'o'],
	[Muzzle.ConcernedOpen2, 'A', 'O', '0'],
]);

const horizontalEyes = [
	[Eye.Neutral, `'`, '.', '0', '°', 'o', 'O', 'e', 'g', '9', '6', 'd', 'b'],
	[Eye.Neutral4, '='],
	[Eye.Closed, '-', 'v', 'V', 'u', 'U', 'y', 'Y'],
	[Eye.ClosedHappy, 'n'],
	[Eye.ClosedHappy2, '^'],
	[Eye.Sad, 'q', 'Q', 'p', 'P', ';', ':', ','],
	[Eye.Peaceful, 't', 'T'],
	[Eye.Frown, 'ô', 'Ô', 'õ', 'Õ', 'ō', 'Ō', 'ŏ', 'Ŏ'],
	[Eye.Frown2, 'a'],
];

export const horizontalEyesLeft = createMap<Eye>([
	...horizontalEyes,
	[Eye.Neutral2, '>'],
	[Eye.X, '<'],
	[Eye.Sad, 'ò', 'Ò'],
	[Eye.Angry, 'ó', 'Ó'],
]);

export const horizontalEyesRight = createMap<Eye>([
	...horizontalEyes,
	[Eye.Neutral2, '<'],
	[Eye.X, '>'],
	[Eye.Sad, 'ó', 'Ó'],
	[Eye.Angry, 'ò', 'Ò'],
]);

const horizontalIrises = createMap<Iris>([
	[Iris.Up, '9'],
	[Iris.UpLeft, 'e'],
	[Iris.UpRight, 'g'],
	[Iris.Right, '<', 'd'],
	[Iris.Left, '>', 'b'],
]);

const muzzleToEye: Eye[] = [];
muzzleToEye[Muzzle.Frown] = Eye.Sad;
muzzleToEye[Muzzle.FrownOpen] = Eye.Sad;
muzzleToEye[Muzzle.ConcernedOpen2] = Eye.Sad;
muzzleToEye[Muzzle.ConcernedOpen3] = Eye.Sad;

const neutralToSmile: Muzzle[] = [];
neutralToSmile[Muzzle.ConcernedOpen] = Muzzle.SmileOpen2;
neutralToSmile[Muzzle.ConcernedOpen2] = Muzzle.SmileOpen3;

function any(obj: object) {
	return `(${Object.keys(obj).map(escapeRegExp).join('|')})`;
}

const bigEyes = /[O0ÒÓÔÕŌŎQ]/;
const cryingEye = /[;pqPQTyY]/;
const tears = "(['`,]?)";
const tearsRegex = /['`,]/;
const verticalRightRegex = new RegExp(`^${any(verticalEyesRight)}${tears}-?${any(muzzlesRight)}$`);
const verticalLeftRegex = new RegExp(`^${any(muzzlesLeft)}-?${tears}${any(verticalEyesLeft)}$`);
const horizontalRegex = new RegExp(`^${any(horizontalEyesRight)}(//)?${any(horizontalMuzzles)}(//)?${any(horizontalEyesLeft)}$`);

function matchVertical(
	text: string, regex: RegExp, flip: boolean, muzzleMap: Dict<Muzzle>, eyesMap: Dict<Eye>
): Expression | undefined {
	if (/^([|]{2,}|BS|8x|x8|x-?x|\d+)$/i.test(text))
		return undefined;

	const match = regex.exec(text);

	if (!match)
		return undefined;

	const eyesStr = flip ? match[3] : match[1];
	const muzzleStr = flip ? match[1] : match[3];
	const muzzle = muzzleMap[muzzleStr];
	const veye = eyesMap[eyesStr];
	const eye = veye === Eye.Neutral && !/[OV]/.test(muzzleStr) ? (muzzleToEye[muzzle] || veye) : veye;
	const blink = /;/.test(eyesStr);
	const tear = blink && muzzleToEye[muzzle] === Eye.Sad;
	const left = tear ? (/[<>]/.test(eyesStr) ? eye : Eye.Sad2) : (blink && flip ? Eye.Closed : eye);
	const right = tear ? (/[<>]/.test(eyesStr) ? eye : Eye.Sad2) : (blink && !flip ? Eye.Closed : eye);
	const shocked = /8/.test(eyesStr);
	const rightIris = shocked ? Iris.Shocked : Iris.Forward;
	const leftIris = shocked ? Iris.Shocked : (/%/.test(eyesStr) ? Iris.Up : Iris.Forward);
	const extra = (tearsRegex.test(match[2]) || tear) ? ExpressionExtra.Tears : ExpressionExtra.None;

	return { right, left, muzzle, rightIris, leftIris, extra };
}

function matchHorizontal(text: string): Expression | undefined {
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

	const leftEye = horizontalEyesLeft[leftStr];
	const rightEye = horizontalEyesRight[rightStr];
	const muzzle = horizontalMuzzles[muzzleStr];
	const same = rightStr === leftStr;
	const lookingToSide = same && /[<>]/.test(rightStr);
	const shocked = bigEyes.test(leftStr) && bigEyes.test(rightStr) && rightStr !== '0' && leftStr !== '0';
	const lookingDown = (same && rightStr === '6') || (rightStr === 'b' && leftStr === 'd');
	const unamused = !lookingDown && same && rightStr === '-' && /[.,_]/.test(muzzleStr);
	const left = (lookingToSide || (leftStr === 'o' && bigEyes.test(rightStr))) ? Eye.Neutral2 : leftEye;
	const right = (lookingToSide || (rightStr === 'o' && bigEyes.test(leftStr))) ? Eye.Neutral2 : rightEye;
	const blush = /[/][/]/.test(muzzleStr) || (rightBlush && rightBlush === leftBlush);
	const cry = cryingEye.test(leftStr) || cryingEye.test(rightStr);

	return {
		left: unamused ? Eye.Frown2 : left,
		right: unamused ? Eye.Frown2 : right,
		muzzle: same && (leftEye === Eye.ClosedHappy || leftEye === Eye.ClosedHappy2) ? (neutralToSmile[muzzle] || muzzle) : muzzle,
		rightIris: lookingDown ? Iris.Down : (shocked ? Iris.Shocked : (horizontalIrises[rightStr] || Iris.Forward)),
		leftIris: lookingDown ? Iris.Down : (shocked ? Iris.Shocked : (horizontalIrises[leftStr] || Iris.Forward)),
		extra: (blush ? ExpressionExtra.Blush : ExpressionExtra.None) | (cry ? ExpressionExtra.Cry : ExpressionExtra.None),
	};
}

export function expression(
	right: Eye, left: Eye, muzzle: Muzzle, rightIris = Iris.Forward, leftIris = Iris.Forward, extra = ExpressionExtra.None
): Expression {
	return { right, left, muzzle, rightIris, leftIris, extra };
}

const constants = createPlainMap<() => Expression | undefined>({
	'^^': () => expression(Eye.ClosedHappy2, Eye.ClosedHappy2, Muzzle.Smile),
	'))': () => expression(Eye.Neutral, Eye.Neutral, Muzzle.Smile),
	'((': () => expression(Eye.Neutral, Eye.Neutral, Muzzle.Frown),
	'>>': () => expression(Eye.Neutral2, Eye.Neutral2, Muzzle.Flat, Iris.Left, Iris.Left),
	'<<': () => expression(Eye.Neutral2, Eye.Neutral2, Muzzle.Flat, Iris.Right, Iris.Right),
	'🙂': () => expression(Eye.Neutral, Eye.Neutral, Muzzle.Smile),
	'😵': () => expression(Eye.Neutral, Eye.Neutral, Muzzle.Smile, Iris.Up, Iris.Forward),
	'😐': () => expression(Eye.Neutral, Eye.Neutral, Muzzle.Flat),
	'😑': () => expression(Eye.Lines, Eye.Lines, Muzzle.Flat),
	'😆': () => expression(Eye.X, Eye.X, Muzzle.SmileOpen),
	'😟': () => expression(Eye.Sad, Eye.Sad, Muzzle.Neutral),
	'😠': () => expression(Eye.Angry, Eye.Angry, Muzzle.Smile),
	'🤔': () => expression(Eye.Neutral, Eye.Frown2, Muzzle.Kiss),
	'😈': () => expression(Eye.Angry, Eye.Angry, Muzzle.Smile, Iris.Up, Iris.Forward),
	'👿': () => expression(Eye.Angry, Eye.Angry, Muzzle.SmileTeeth),
});

function matchOther(text: string): Expression | undefined {
	if (/^A{5,}\.*$/.test(text)) {
		return expression(Eye.Neutral, Eye.Neutral, Muzzle.ConcernedOpen3, Iris.Shocked, Iris.Shocked);
	} else if (/^a{5,}\.*$/.test(text)) {
		return expression(Eye.Neutral, Eye.Neutral, Muzzle.ConcernedOpen3);
	} else if (/^z{3,}\.*$/i.test(text)) {
		return expression(Eye.Closed, Eye.Closed, Muzzle.Neutral);
	} else {
		return constants[text] && constants[text]();
	}
}

export function matchExpression(text: string): Expression | undefined {
	if (/тот/ui.test(text)) {
		return undefined;
	}

	text = replaceRussian(text)
		.replace(/D{4,}/, 'DDD')
		.replace(/\\/g, '/')
		.replace(/\/{3,}/g, '//');

	return matchVertical(text, verticalRightRegex, false, muzzlesRight, verticalEyesRight)
		|| matchVertical(text, verticalLeftRegex, true, muzzlesLeft, verticalEyesLeft)
		|| matchHorizontal(text)
		|| matchOther(text);
}

export function parseExpression(text: string): Expression | undefined {
	const emoteMatch = /(?:^| )(\S+)\s*$/.exec(text);
	const emote = emoteMatch && emoteMatch[1].trim();
	return emote ? matchExpression(emote) : undefined;
}

function createMap<T>(values: any[][]): Dict<T> {
	return values.reduce((obj: Dict<T>, [exp, ...values]) => (values.forEach(v => obj[v] = exp), obj), Object.create(null));
}

const charMap = createPlainMap<string>({
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

function mapChar(x: string) {
	return charMap[x];
}

function replaceRussian(text: string): string {
	return text.replace(charRegex, mapChar);
}
