const lowercaseCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789_';
const uppercaseCharacters = lowercaseCharacters + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CARRIAGERETURN = '\r'.charCodeAt(0);

export function randomString(length: number, useUpperCase = false): string {
	const characters = useUpperCase ? uppercaseCharacters : lowercaseCharacters;
	let result = '';

	for (let i = 0; i < length; i++) {
		result += characters[(Math.random() * characters.length) | 0];
	}

	return result;
}

export function isSurrogate(code: number): boolean {
	return code >= 0xd800 && code <= 0xdbff;
}

export function isLowSurrogate(code: number): boolean {
	return (code & 0xfc00) === 0xdc00;
}

export function fromSurrogate(high: number, low: number): number {
	return (((high & 0x3ff) << 10) + (low & 0x3ff) + 0x10000) | 0;
}

export function charsToCodes(text: string) {
	const chars: number[] = [];

	for (let i = 0; i < text.length; i++) {
		let code = text.charCodeAt(i);

		if (isSurrogate(code) && (i + 1) < text.length) {
			const extra = text.charCodeAt(i + 1);

			if (isLowSurrogate(extra)) {
				code = fromSurrogate(code, extra);
				i++;
			}
		}

		chars.push(code);
	}

	return chars;
}

export function stringToCodes(buffer: Uint32Array, text: string): number {
	const textLength = text.length | 0;
	let length = 0 | 0;

	for (let i = 0; i < textLength; i = (i + 1) | 0) {
		let code = text.charCodeAt(i) | 0;

		if (isSurrogate(code) && ((i + 1) | 0) < textLength) {
			const extra = text.charCodeAt(i + 1) | 0;

			if (isLowSurrogate(extra)) {
				code = fromSurrogate(code, extra) | 0;
				i = (i + 1) | 0;
			}
		}

		if (isVisibleChar(code)) {
			buffer[length] = code;
			length = (length + 1) | 0;
		}
	}

	return length;
}

export let codesBuffer = new Uint32Array(32);

export function stringToCodesTemp(text: string) {
	while (text.length > codesBuffer.length) {
		codesBuffer = new Uint32Array(codesBuffer.length * 2);
	}

	return stringToCodes(codesBuffer, text);
}

export function matcher(regex: RegExp) {
	return (text: string): boolean => !!text && regex.test(text);
}

export function isVisibleChar(code: number) {
	return code !== CARRIAGERETURN && !(code >= 0xfe00 && code <= 0xfe0f);
}
