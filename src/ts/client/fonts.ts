import { SpriteFont, createSpriteFont } from '../graphics/spriteFont';
import * as sprites from '../generated/sprites';

export let font: SpriteFont;
export let fontPal: SpriteFont;
export let fontSmall: SpriteFont;
export let fontSmallPal: SpriteFont;
export let fontMono: SpriteFont;
export let fontMonoPal: SpriteFont;

export function createFonts() {
	font = createSpriteFont(sprites.font, sprites.emoji, 3);
	font.lineSpacing = 3;
	font.letterShiftY = -2;

	fontPal = createSpriteFont(sprites.fontPal, sprites.emojiPal, 3);
	fontPal.lineSpacing = 3;
	fontPal.letterShiftY = -2;

	fontSmall = createSpriteFont(sprites.fontSmall, [], 2);
	fontSmall.lineSpacing = 4;
	fontSmall.letterShiftY = -2;
	fontSmall.letterHeightReal += 2;

	fontSmallPal = createSpriteFont(sprites.fontSmallPal, [], 2);
	fontSmallPal.lineSpacing = 4;
	fontSmallPal.letterShiftY = -2;
	fontSmallPal.letterHeightReal += 2;

	fontMono = createSpriteFont(sprites.fontMono, [], 4);
	fontMono.lineSpacing = 4;
	fontMono.letterShiftY = -2;
	fontMono.letterHeightReal += 2;

	fontMonoPal = createSpriteFont(sprites.fontMonoPal, [], 4);
	fontMonoPal.lineSpacing = 4;
	fontMonoPal.letterShiftY = -2;
	fontMonoPal.letterHeightReal += 2;
}
