import { Rect, Sprite, SpriteBatch, PaletteSpriteBatch, Palette, isPaletteSpriteBatch } from '../common/interfaces';
import { WHITE } from '../common/colors';
import { stringToCodesTemp, codesBuffer } from '../common/stringUtils';
import { createSprite } from '../client/spriteUtils';

export const enum HAlign {
	Left,
	Right,
	Center,
}

export const enum VAlign {
	Top,
	Bottom,
	Middle,
}

export interface TextOptions {
	skipEmotes?: boolean;
	colorEmotes?: boolean;
	palette?: Palette;
	emojiPalette?: Palette;
	lineSpacing?: number;
	monospace?: boolean;
}

type Charset = { code: number; sprite: Sprite; }[];
type Batch = SpriteBatch | PaletteSpriteBatch;

const SPACE = ' '.charCodeAt(0);
const TAB = '\t'.charCodeAt(0);
const DEFAULT = '?'.charCodeAt(0);
const LINEFEED = '\n'.charCodeAt(0);
const defaultOptions: TextOptions = {};

export interface SpriteFont {
	lineSpacing: number;
	letterSpacing: number;
	letterShiftX: number;
	letterShiftY: number;
	letterShiftWidth: number;
	letterShiftHeight: number;
	letterHeight: number;
	letterHeightReal: number;
	letterWidth: number;
	chars: Map<number, Sprite>;
	emoji: Map<number, Sprite>;
	defaultChar: Sprite;
}

export function createSpriteFont(charset: Charset, emojiCharset: Charset, spaceWidth: number): SpriteFont {
	const lineSpacing = 2;
	const letterSpacing = 1;
	const letterShiftX = 0;
	const letterShiftY = 0;
	const letterShiftWidth = 0;
	const letterShiftHeight = 0;

	const chars = new Map<number, Sprite>();
	const emoji = new Map<number, Sprite>();

	charset.filter(c => !!c).forEach(c => chars.set(c.code, c.sprite));
	emojiCharset.filter(e => !!e && !!e.code).forEach(e => emoji.set(e.code, e.sprite));

	const char0 = chars.get(0)!;
	const letterHeight = char0.h;
	const letterWidth = char0.w;
	const letterHeightReal = char0.h + char0.oy;
	chars.set(SPACE, createSprite(0, 0, 0, 0, spaceWidth, char0.h, 0));
	chars.set(TAB, createSprite(0, 0, 0, 0, spaceWidth * 4, char0.h, 0));
	const defaultChar = chars.get(DEFAULT)!;

	return {
		lineSpacing, letterSpacing, letterShiftX, letterShiftY, letterShiftWidth, letterShiftHeight,
		letterHeight, letterHeightReal, letterWidth, chars, emoji, defaultChar,
	};
}

function drawChars(
	batch: Batch, chars: Uint32Array, length: number, font: SpriteFont, color: number, x: number, y: number,
	options: TextOptions
) {
	const { lineSpacing = font.lineSpacing, monospace = false } = options;
	x = Math.round(x) | 0;
	y = Math.round(y) | 0;
	let currentX = x;

	for (let i = 0; i < length; i++) {
		const code = chars[i];

		if (code === LINEFEED) {
			currentX = x;
			y += font.letterHeight + lineSpacing;
		} else {
			const charWidth = drawChar(batch, font, code, color, currentX, y, options);
			currentX += (monospace ? font.letterWidth : charWidth) + font.letterSpacing;
		}
	}
}

export function drawText(
	batch: Batch, text: string, font: SpriteFont, color: number, x: number, y: number, options = defaultOptions
) {
	const length = stringToCodesTemp(text);
	drawChars(batch, codesBuffer, length, font, color, x, y, options);
}

export function drawOutlinedText(
	batch: Batch, text: string, font: SpriteFont, color: number, outlineColor: number, x: number, y: number,
	options = defaultOptions
) {
	const length = stringToCodesTemp(text);

	options.skipEmotes = true;

	drawChars(batch, codesBuffer, length, font, outlineColor, x - 1, y - 1, options);
	drawChars(batch, codesBuffer, length, font, outlineColor, x + 1, y - 1, options);
	drawChars(batch, codesBuffer, length, font, outlineColor, x - 1, y + 1, options);
	drawChars(batch, codesBuffer, length, font, outlineColor, x + 1, y + 1, options);

	drawChars(batch, codesBuffer, length, font, outlineColor, x - 1, y, options);
	drawChars(batch, codesBuffer, length, font, outlineColor, x, y - 1, options);
	drawChars(batch, codesBuffer, length, font, outlineColor, x + 1, y, options);
	drawChars(batch, codesBuffer, length, font, outlineColor, x, y + 1, options);

	options.skipEmotes = false;

	drawChars(batch, codesBuffer, length, font, color, x, y, options);
}

export function drawTextAligned(
	spriteBatch: Batch, text: string, font: SpriteFont, color: number, rect: Rect, halign = HAlign.Left, valign = VAlign.Top,
	options: TextOptions = defaultOptions
) {
	const length = stringToCodesTemp(text);
	const { x, y } = alignChars(font, codesBuffer, length, rect, halign, valign);
	drawChars(spriteBatch, codesBuffer, length, font, color, x, y, options);
}

export function lineBreak(text: string, font: SpriteFont, width: number) {
	const lines: string[][] = [];
	const spaceWidth = measureChar(font, SPACE) + font.letterSpacing * 2;

	let line: string[] = [];
	let lineWidth = 0;

	for (const word of text.split(' ')) {
		const { w } = measureText(word, font);

		if (lineWidth) {
			lineWidth += spaceWidth;

			if (lineWidth + w > width) {
				lines.push(line);
				line = [];
				lineWidth = 0;
			}
		}

		line.push(word);
		lineWidth += w;
	}

	if (line.length) {
		lines.push(line);
	}

	return lines.map(x => x.join(' ')).join('\n');
}

function measureChars(chars: Uint32Array, length: number, font: SpriteFont): { w: number; h: number; } {
	let maxW = 0;
	let lines = 1;
	let w = 0;

	for (let i = 0; i < length; i++) {
		const code = chars[i];

		if (code === LINEFEED) {
			maxW = Math.max(maxW, w);
			w = 0;
			lines++;
		} else {
			if (w) {
				w += font.letterSpacing;
			}
			w += measureChar(font, code);
		}
	}

	return {
		w: Math.max(maxW, w),
		h: lines * font.letterHeight + (lines - 1) * font.lineSpacing
	};
}

export function measureText(text: string, font: SpriteFont) {
	const length = stringToCodesTemp(text);
	return measureChars(codesBuffer, length, font);
}

export function getCharacterSprite(char: string, font: SpriteFont): Sprite | undefined {
	let sprite: Sprite | undefined;
	let unset = false;
	const length = stringToCodesTemp(char);

	for (let i = 0; i < length; i++) {
		const code = codesBuffer[i];
		unset = !!sprite;
		sprite = font.emoji.get(code) || getChar(font, code);
	}

	return unset ? undefined : sprite;
}

function measureChar(font: SpriteFont, code: number): number {
	const sprite = font.emoji.get(code) || getChar(font, code);
	return sprite.w + sprite.ox;
}

function drawChar(
	batch: Batch, font: SpriteFont, code: number, color: number, x: number, y: number, options: TextOptions
): number {
	const emote = font.emoji.get(code);
	const px = x + font.letterShiftX;
	const py = y + font.letterShiftY;

	if (emote) {
		const skipEmote = !!options.skipEmotes;
		const colorEmote = !!options.colorEmotes;
		const emoteColor = colorEmote ? color : WHITE;

		if (!skipEmote) {
			if (isPaletteSpriteBatch(batch)) {
				batch.drawSprite(emote, emoteColor, options.emojiPalette, px, py);
			} else {
				batch.drawSprite(emote, emoteColor, px, py);
			}
		}

		return emote.w + emote.ox;
	} else {
		const c = getChar(font, code);

		if (isPaletteSpriteBatch(batch)) {
			batch.drawSprite(c, color, options.palette, px, py);
		} else {
			batch.drawSprite(c, color, px, py);
		}

		return c.w + c.ox + font.letterShiftWidth;
	}
}

function alignChars(font: SpriteFont, chars: Uint32Array, length: number, rect: Rect, halign: HAlign, valign: VAlign) {
	let x = rect.x;
	let y = rect.y;

	if (halign !== HAlign.Left || valign !== VAlign.Top) {
		const size = measureChars(chars, length, font);

		if (halign !== HAlign.Left) {
			x += halign === HAlign.Center ? (rect.w - size.w) / 2 : (rect.w - size.w);
		}

		if (valign !== VAlign.Top) {
			y += valign === VAlign.Middle ? (rect.h - size.h) / 2 : (rect.h - size.h);
		}
	}

	return { x, y };
}

function getChar(font: SpriteFont, code: number): Sprite {
	return font.chars.get(code) || font.defaultChar;
}
