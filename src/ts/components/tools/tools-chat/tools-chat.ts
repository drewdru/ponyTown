import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import {
	drawSpeechBaloon, drawNamePlate, createCommonPalettes, drawBaloon, DrawNameFlags
} from '../../../graphics/graphicsUtils';
import { drawCanvas } from '../../../graphics/contextSpriteBatch';
import {
	GRASS_COLOR, getMessageColor, OUTLINE_COLOR, MOD_COLOR, ADMIN_COLOR, PATREON_COLOR, ANNOUNCEMENT_COLOR,
	WHITE, PARTY_COLOR, RED, ORANGE, PURPLE, GREEN, YELLOW, BLUE, BLACK, CYAN, TRANSPARENT, WHISPER_COLOR
} from '../../../common/colors';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { MessageType, FontPalettes, Palette } from '../../../common/interfaces';
import { faHome, faStar } from '../../../client/icons';
import * as sprites from '../../../generated/sprites';
import { disableImageSmoothing } from '../../../client/canvasUtils';
import { mockPaletteManager } from '../../../common/ponyInfo';
import { fontPal, fontSmallPal } from '../../../client/fonts';
import { measureText, drawText, drawOutlinedText, lineBreak, drawTextAligned, HAlign } from '../../../graphics/spriteFont';
import { rect } from '../../../common/rect';
import { colorToCSS } from '../../../common/color';

interface Message {
	label: string;
	color: number;
	palette?: (palettes: FontPalettes) => Palette | undefined;
}

@Component({
	selector: 'tools-chat',
	templateUrl: 'tools-chat.pug',
})
export class ToolsChat implements AfterViewInit {
	readonly homeIcon = faHome;
	readonly starIcon = faStar;
	@ViewChild('canvas', { static: true }) element!: ElementRef;
	messages: Message[] = [
		{ label: 'Chat message', color: getMessageColor(MessageType.Chat) },
		{ label: 'System message', color: getMessageColor(MessageType.System) },
		{ label: 'Admin message', color: getMessageColor(MessageType.Admin) },
		{ label: 'Mod message', color: getMessageColor(MessageType.Mod) },
		{ label: 'Announcement message', color: getMessageColor(MessageType.Announcement) },
		{ label: 'Party message', color: getMessageColor(MessageType.Party) },
		{ label: 'Thinking message', color: getMessageColor(MessageType.Thinking) },
		{ label: 'PartyThinking message', color: getMessageColor(MessageType.PartyThinking) },
		{ label: 'PartyAnnouncement message', color: getMessageColor(MessageType.PartyAnnouncement) },
		// {
		// 	label: 'PartyAnnouncement msg ⚧', color: WHITE,
		// 	palette: () => mockPaletteManager.add([
		// 		TRANSPARENT,
		// 		ANNOUNCEMENT_COLOR,
		// 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
		// 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
		// 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
		// 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
		// 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
		// 	]),
		// },
		// {
		// 	label: 'PartyAnnouncement msg ⚧', color: WHITE,
		// 	palette: () => mockPaletteManager.add([
		// 		TRANSPARENT,
		// 		ANNOUNCEMENT_COLOR,
		// 		ANNOUNCEMENT_COLOR, ANNOUNCEMENT_COLOR,
		// 		ANNOUNCEMENT_COLOR, ANNOUNCEMENT_COLOR,
		// 		ANNOUNCEMENT_COLOR, PARTY_COLOR,
		// 		PARTY_COLOR, PARTY_COLOR,
		// 		PARTY_COLOR, PARTY_COLOR,
		// 	]),
		// },
		// { label: 'Red message', color: getMessageColor(MessageType.Red) },
		// { label: 'Green message', color: getMessageColor(MessageType.Green) },
		// { label: 'Blue message', color: getMessageColor(MessageType.Blue) },
		{ label: 'Supporter message 1', color: getMessageColor(MessageType.Supporter1) },
		{ label: 'Supporter message 2', color: WHITE, palette: p => p.supporter2 },
		{ label: 'Supporter message 3', color: WHITE, palette: p => p.supporter3 },
		{ label: 'Whisper message', color: WHISPER_COLOR },
		// { label: 'Supporter message 2', color: 0xffd45aff },
	];
	names = [
		{ label: 'Regular name', color: WHITE, font: () => fontPal },
		{ label: 'Party name', color: PARTY_COLOR, font: () => fontPal },
		{ label: 'MODERATOR tag', color: MOD_COLOR, font: () => fontSmallPal },
		{ label: 'DEVELOPER tag', color: ADMIN_COLOR, font: () => fontSmallPal },
		{ label: 'SUPPORTER tag', color: PATREON_COLOR, font: () => fontSmallPal },
		{ label: 'HIDDEN tag', color: ANNOUNCEMENT_COLOR, font: () => fontSmallPal },
	];
	private bg = GRASS_COLOR;
	private initialized = false;
	ngAfterViewInit() {
		loadAndInitSpriteSheets()
			.then(() => this.initialized = true)
			.then(() => this.redraw());
	}
	toggleBg() {
		this.bg = this.bg === GRASS_COLOR ? 0x172e14ff : GRASS_COLOR;
		this.redraw();
	}
	redraw() {
		if (!this.initialized)
			return;

		const canvas1 = drawCanvas(500, 400, sprites.paletteSpriteSheet, undefined, batch => {
			const palettes = createCommonPalettes(mockPaletteManager);

			this.messages.forEach(({ label, color, palette }, index) => {
				const size = measureText(label, fontPal);
				const options = { palette: palette ? palette(palettes.mainFont) : palettes.mainFont.white };
				drawSpeechBaloon(batch, label, color, options, 10 + size.w / 2, 20 + 20 * index, size.w, size.h, 1, 5);
			});

			this.names.forEach(({ label, color, font }, index) => {
				const palette = font() === fontSmallPal ? palettes.smallFont.white : palettes.mainFont.white;
				drawOutlinedText(batch, label, font(), color, OUTLINE_COLOR, 190, 10 + 15 * index, { palette });
			});

			// ---

			drawOutlinedText(
				batch, '<SUPPORTER>', fontSmallPal, PATREON_COLOR, OUTLINE_COLOR, 190, 120, { palette: palettes.smallFont.white });

			// names

			drawNamePlate(batch, 'Some name 1', 220, 150, DrawNameFlags.None, palettes, 'sup1');
			drawNamePlate(batch, 'Some name 2', 220, 175, DrawNameFlags.None, palettes, 'sup2');
			drawNamePlate(batch, 'Some name 3', 220, 200, DrawNameFlags.None, palettes, 'sup3');

			// speech baloons

			drawBaloon(
				batch, { message: 'regular baloon', type: MessageType.Chat, created: 0 },
				50, 300, rect(0, 0, 1000, 1000), palettes);
			drawBaloon(
				batch, { message: 'thinking baloon', type: MessageType.Thinking, created: 0 },
				50, 330, rect(0, 0, 1000, 1000), palettes);
			drawBaloon(
				batch, { message: 'whisper baloon', type: MessageType.Whisper, created: 0 },
				50, 360, rect(0, 0, 1000, 1000), palettes);
		});

		const canvas2 = drawCanvas(500, 400, sprites.paletteSpriteSheet, undefined, batch => {
			const emojiPalette = mockPaletteManager.addArray(sprites.emojiPalette);

			for (let i = 0; i < sprites.emojiPal.length; i++) {
				const x = i % 10;
				const y = Math.floor(i / 10);
				batch.drawSprite(sprites.emojiPal[i].sprite, WHITE, emojiPalette, 10 + x * 12, 10 + y * 12);
			}

			const palette = mockPaletteManager.addArray(sprites.fontSupporter2Palette);
			drawText(batch, 'Lorem 🍎 ipsum', fontPal, WHITE, 10, 150, { palette, emojiPalette });

			const palette1 = mockPaletteManager.addArray(sprites.fontSupporter1Palette);
			drawText(batch, '<SUPPÓĄRTER>', fontSmallPal, WHITE, 20, 180, { palette: palette1 });

			const palette2 = mockPaletteManager.addArray(sprites.fontSupporter2Palette);
			drawText(batch, '<SUPPÓĄRTER>', fontSmallPal, WHITE, 20, 195, { palette: palette2 });

			let palette3 = mockPaletteManager.add([TRANSPARENT, RED, BLUE, ORANGE, WHITE, PURPLE, BLACK, GREEN, CYAN, YELLOW]);
			palette3 = mockPaletteManager.addArray(sprites.fontSupporter3Palette);
			drawText(batch, '<SUPPÓĄ⚧RTER>', fontSmallPal, WHITE, 20, 210, { palette: palette3 });
		});

		const canvas3 = drawCanvas(500, 400, sprites.paletteSpriteSheet, undefined, batch => {
			/* tslint:disable */
			const loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce scelerisque interdum scelerisque. Suspendisse malesuada, enim in viverra ornare, dui ex laoreet ipsum, at mollis orci felis vitae ipsum. In faucibus venenatis augue, ac ornare libero. Etiam vitae aliquet neque.';
			const text = lineBreak(loremIpsum, fontPal, 200);

			batch.drawRect(WHITE, 10, 10, 200, 100);
			drawText(batch, text, fontPal, BLACK, 10, 10);

			const bounds = rect(10 + 200 + 20, 10, 200, 100);
			batch.drawRect(WHITE, bounds.x, bounds.y, bounds.w, bounds.h);
			drawTextAligned(batch, text, fontPal, BLACK, bounds, HAlign.Right);

			const bounds2 = rect(10 + 200 + 20, 10 + 120, 200, 20);
			batch.drawRect(WHITE, bounds2.x, bounds2.y, bounds2.w, bounds2.h);
			drawTextAligned(batch, 'test text', fontPal, BLACK, bounds2, HAlign.Right);
		});

		const canvas = this.element.nativeElement as HTMLCanvasElement;
		const context = canvas.getContext('2d')!;
		context.fillStyle = colorToCSS(this.bg);
		context.fillRect(0, 0, canvas.width, canvas.height);
		disableImageSmoothing(context);
		context.save();
		context.scale(2, 2);
		context.drawImage(canvas1, 0, 0);
		context.drawImage(canvas2, 300, 0);
		context.drawImage(canvas3, 0, 400);
		context.restore();
	}
}
