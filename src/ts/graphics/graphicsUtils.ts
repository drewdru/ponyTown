import {
	Says, Rect, SpriteBatch, Sprite, SpriteBorder, MessageType, Entity, Point, Pony, SpriteBatchCommons,
	PaletteSpriteBatch, Palette, isPartyMessage, PartyInfo, Camera, CommonPalettes, FontPalettes, PaletteManager,
	isWhisperTo, isWhisper, isThinking, isPublicMessage
} from '../common/interfaces';
import { clamp, contains, intersect, toInt, hasFlag } from '../common/utils';
import { BLACK, WHITE, OUTLINE_COLOR, getMessageColor, PARTY_COLOR, MESSAGE_COLOR, FRIENDS_COLOR } from '../common/colors';
import { tileWidth, tileHeight, tileElevation, PONY_TYPE } from '../common/constants';
import {
	HAlign, VAlign, TextOptions, lineBreak, drawTextAligned, measureText, drawText, drawOutlinedText
} from '../graphics/spriteFont';
import * as sprites from '../generated/sprites';
import { fontPal, fontSmallPal } from '../client/fonts';
import { getPonyChatHeight, isPony } from '../common/pony';
import { worldToScreen } from '../common/camera';
import { multiplyColor, colorToCSS } from '../common/color';
import { getTag, getTagPalette } from '../common/tags';
import { rect } from '../common/rect';
import { mockPaletteManager } from '../common/ponyInfo';
import { sortEntities, isHidden, isFriend } from '../common/entityUtils';

const baloonTaper = [
	{ w: 1, y: 2 },
	{ w: 1, y: 1 },
];

const roundTaper = [
	{ w: 1, y: 5 },
	{ w: 1, y: 3 },
	{ w: 2, y: 2 },
	{ w: 4, y: 1 },
];

export const commonPalettes = createCommonPalettes(mockPaletteManager);

type AnyBatch = SpriteBatch | PaletteSpriteBatch;

export function drawTaperedRect(
	batch: AnyBatch, color: number, x: number, y: number, w: number, h: number, taper: { w: number; y: number; }[]
) {
	x = Math.round(x) | 0;
	y = Math.round(y) | 0;
	w = Math.round(w) | 0;
	h = Math.round(h) | 0;

	let gap = 0;

	for (let i = 0; i < taper.length; i++) {
		const t = taper[i];
		const th = h - t.y * 2;
		batch.drawRect(color, x + gap, y + t.y, t.w, th);
		batch.drawRect(color, x + w - gap - t.w, y + t.y, t.w, th);
		gap += t.w;
	}

	batch.drawRect(color, x + gap, y, Math.max(0, w - gap * 2), h);
}

export function drawRectBaloon(batch: AnyBatch, color: number, x: number, y: number, w: number, h: number) {
	drawTaperedRect(batch, color, x, y, w, h, baloonTaper);
}

export function drawRoundBaloon(batch: AnyBatch, color: number, x: number, y: number, w: number, h: number) {
	drawTaperedRect(batch, color, x, y, w, h, roundTaper);
}

function getMessagePalette(type: MessageType, palettes: FontPalettes) {
	if (type === MessageType.Supporter2) {
		return palettes.supporter2;
	} else if (type === MessageType.Supporter3) {
		return palettes.supporter3;
	} else {
		return undefined;
	}
}

export function drawBaloon(
	batch: PaletteSpriteBatch, { message, type = MessageType.Chat, timer = 1, total = 10 }: Says,
	x: number, y: number, bounds: Rect, palettes: CommonPalettes
) {
	if (!fontPal)
		return;

	let { w, h } = measureText(message, fontPal);

	w = Math.max(w, 4);

	const screenPad = 8;
	const availableWidth = bounds.w - screenPad * 2;

	if (w > availableWidth) {
		message = lineBreak(message, fontPal, availableWidth);
		const size = measureText(message, fontPal);
		w = size.w;
		h = size.h;
	}

	const { dy, alpha } = calcAnimation(timer, total);

	y += dy;

	const nippleX = x;
	const toTheLeft = Math.max(0, screenPad - x);
	const toTheRight = Math.max(0, x - bounds.w + screenPad);

	x = clamp(x, screenPad + w / 2 - toTheLeft, bounds.w - screenPad - w / 2 + toTheRight);

	if (intersect(0, 0, bounds.w, bounds.h, x - w / 2, y - h / 2, w, h)) {
		const palette = getMessagePalette(type, palettes.mainFont);
		const color = palette ? WHITE : getMessageColor(type);
		const options: TextOptions = {
			palette: palette || palettes.mainFont.white,
			emojiPalette: palettes.mainFont.emoji,
		};

		if (isThinking(type)) {
			drawThinkingBaloon(batch, message, color, options, x, y, w, h, alpha, nippleX);
		} else if (isWhisper(type) || isWhisperTo(type)) {
			drawWhisperBaloon(batch, message, color, options, x, y, w, h, alpha, nippleX);
		} else {
			drawSpeechBaloon(batch, message, color, options, x, y, w, h, alpha, nippleX);
		}
	}
}

export function drawSpeechBaloon(
	batch: PaletteSpriteBatch, text: string, color: number, options: TextOptions, x: number, y: number, w: number, h: number,
	alpha: number, nippleX: number,
) {
	const pad = 4;
	const xx = x - Math.round(w / 2);
	const yy = y - h;
	const nipple = sprites.nipple_2.color;

	nippleX = clamp(nippleX, xx + pad, xx + w - pad);

	batch.globalAlpha = 0.6 * alpha;
	drawRectBaloon(batch, BLACK, xx - pad, yy - pad, w + pad * 2, h + pad * 2);
	batch.drawSprite(nipple, BLACK, undefined, nippleX - Math.round(nipple.w / 2), y + pad);

	batch.globalAlpha = alpha;
	drawText(batch, text, fontPal, color, xx, yy, options);
	batch.globalAlpha = 1;
}

export function drawWhisperBaloon(
	batch: PaletteSpriteBatch, text: string, color: number, options: TextOptions, x: number, y: number, w: number, h: number,
	alpha: number, nippleX: number,
) {
	const pad = 4;
	const xx = x - Math.round(w / 2);
	const yy = y - h;
	const nipple = sprites.nipple_alt_2.color;

	nippleX = clamp(nippleX, xx + pad, xx + w - pad);

	batch.globalAlpha = 0.6 * alpha;

	const left = xx - pad;
	const top = yy - pad;
	const width = w + pad * 2;
	const height = h + pad * 2;

	batch.drawRect(BLACK, left + 2, top, width - 4, 1);
	batch.drawRect(BLACK, left + 1, top + 1, width - 2, 1);
	batch.drawRect(BLACK, left, top + 2, width, height - 4);
	batch.drawRect(BLACK, left + 1, top + height - 2, width - 2, 1);
	batch.drawRect(BLACK, left + 2, top + height - 1, width - 4, 1);

	const yyy = top + height + 1;
	const right = left + width - 1;

	for (let tx = nippleX - 7; (tx + 5) > (left + 1); tx -= 5) {
		const shorten = Math.max(0, (left + 1) - tx);
		batch.drawRect(BLACK, tx + shorten, yyy, 4 - shorten, 1);
	}

	for (let tx = nippleX + 2; tx < right; tx += 5) {
		const shorten = Math.max(0, (tx + 5) - right);
		batch.drawRect(BLACK, tx, yyy, Math.min(4, 5 - shorten), 1);
	}

	batch.drawSprite(nipple, BLACK, undefined, nippleX - 3, y + pad + 2);

	batch.globalAlpha = alpha;
	drawText(batch, text, fontPal, color, xx, yy, options);
	batch.globalAlpha = 1;
}

export function drawThinkingBaloon(
	batch: PaletteSpriteBatch, text: string, color: number, options: TextOptions, x: number, y: number, w: number, h: number,
	alpha: number, nippleX: number,
) {
	const padX = 6;
	const padY = 4;
	const xx = x - Math.round(w / 2);
	const yy = y - h;
	const ox = clamp(nippleX, xx, xx + w) - 1;
	const oy = y + 12;

	batch.globalAlpha = 0.6 * alpha;
	drawRoundBaloon(batch, BLACK, xx - padX, yy - padY, w + padX * 2, h + padY * 2);
	batch.drawRect(BLACK, ox, oy, 1, 1);
	batch.drawRect(BLACK, ox - 1, oy - 3, 2, 2);
	batch.drawRect(BLACK, ox, oy - 7, 3, 3);

	batch.globalAlpha = alpha;
	drawText(batch, text, fontPal, color, xx, yy, options);
	batch.globalAlpha = 1;
}

export enum DrawNameFlags {
	None = 0,
	Party = 1,
	Friend = 2,
}

function getNameColor(flags: DrawNameFlags) {
	if (hasFlag(flags, DrawNameFlags.Party)) {
		return PARTY_COLOR;
	} else if (hasFlag(flags, DrawNameFlags.Friend)) {
		return FRIENDS_COLOR;
	} else {
		return WHITE;
	}
}

export function drawNamePlate(
	batch: PaletteSpriteBatch, text: string, x: number, y: number, flags: DrawNameFlags,
	palettes: CommonPalettes, tagId?: string,
) {
	const tag = getTag(tagId);
	const size = measureText(text, fontPal);
	const xx = x - Math.round(size.w / 2);
	const yy = y - size.h + 6 - (tag ? 3 : 0);
	const color = getNameColor(flags);
	const options = { palette: palettes.mainFont.white, emojiPalette: palettes.mainFont.emoji };
	drawOutlinedText(batch, text, fontPal, color, OUTLINE_COLOR, xx, yy, options);

	if (tag) {
		const tagSize = measureText(tag.label, fontSmallPal);
		const textX = x - Math.round(tagSize.w / 2);
		const palette = getTagPalette(tag, palettes.smallFont);
		drawOutlinedText(batch, tag.label, fontSmallPal, tag.color, OUTLINE_COLOR, textX, yy + 11, { palette });
	}
}

export function drawBounds(batch: PaletteSpriteBatch, e: Entity, r: Rect | undefined, color: number) {
	if (r) {
		batch.drawRect(
			color,
			Math.round(e.x * tileWidth + r.x), Math.round(e.y * tileHeight + r.y),
			Math.round(r.w), Math.round(r.h));
	}
}

export function drawWorldBounds(batch: PaletteSpriteBatch, e: Entity, r: Rect | undefined, color: number) {
	if (r) {
		batch.drawRect(
			color,
			Math.round((e.x + r.x) * tileWidth), Math.round((e.y + r.y) * tileHeight),
			Math.round(r.w * tileWidth), Math.round(r.h * tileHeight));
	}
}


export function drawBoundsOutline(batch: PaletteSpriteBatch, e: Entity, r: Rect | undefined, color: number, thickness = 1) {
	if (r) {
		drawOutline(
			batch, color,
			Math.round(e.x * tileWidth + r.x), Math.round(e.y * tileHeight + r.y),
			Math.round(r.w), Math.round(r.h),
			thickness);
	}
}

export function drawOutlineRect(batch: SpriteBatchCommons, color: number, { x, y, w, h }: Rect, thickness = 1) {
	drawOutline(batch, color, x, y, w, h, thickness);
}

export function drawOutline(batch: SpriteBatchCommons, color: number, x: number, y: number, w: number, h: number, thickness = 1) {
	batch.drawRect(color, x - thickness, y - thickness, w + thickness * 2, thickness); // top
	batch.drawRect(color, x - thickness, y + h, w + thickness * 2, thickness); // bottom
	batch.drawRect(color, x - thickness, y, thickness, h); // left
	batch.drawRect(color, x + w, y, thickness, h); // right
}

export type DrawRect = (color: number, x: number, y: number, w: number, h: number) => void;

export function drawCharacter(drawRect: DrawRect, x: number, y: number, color: number, char: string) {
	switch (char) {
		case '0':
			drawRect(color, x, y, 1, 5);
			drawRect(color, x + 1, y, 1, 1);
			drawRect(color, x + 1, y + 4, 1, 1);
			drawRect(color, x + 2, y, 1, 5);
			return 3;
		case '1':
			drawRect(color, x, y + 1, 1, 1);
			drawRect(color, x + 1, y, 1, 4);
			drawRect(color, x, y + 4, 3, 1);
			return 3;
		case '2':
			drawRect(color, x, y, 3, 1);
			drawRect(color, x, y + 2, 3, 1);
			drawRect(color, x, y + 4, 3, 1);
			drawRect(color, x + 2, y + 1, 1, 1);
			drawRect(color, x, y + 3, 1, 1);
			return 3;
		case '3':
			drawRect(color, x, y, 2, 1);
			drawRect(color, x, y + 2, 2, 1);
			drawRect(color, x, y + 4, 2, 1);
			drawRect(color, x + 2, y, 1, 5);
			return 3;
		case '4':
			drawRect(color, x, y, 1, 3);
			drawRect(color, x, y + 2, 3, 1);
			drawRect(color, x + 2, y, 1, 5);
			return 3;
		case '5':
			drawRect(color, x, y, 3, 1);
			drawRect(color, x, y + 2, 3, 1);
			drawRect(color, x, y + 4, 3, 1);
			drawRect(color, x, y + 1, 1, 1);
			drawRect(color, x + 2, y + 3, 1, 1);
			return 3;
		case '6':
			drawRect(color, x, y, 3, 1);
			drawRect(color, x, y + 2, 3, 1);
			drawRect(color, x, y + 4, 3, 1);
			drawRect(color, x, y, 1, 5);
			drawRect(color, x + 2, y + 3, 1, 1);
			return 3;
		case '7':
			drawRect(color, x, y, 3, 1);
			drawRect(color, x + 2, y + 1, 1, 4);
			return 3;
		case '8':
			drawRect(color, x, y, 1, 5);
			drawRect(color, x + 1, y, 1, 1);
			drawRect(color, x + 1, y + 2, 1, 1);
			drawRect(color, x + 1, y + 4, 1, 1);
			drawRect(color, x + 2, y, 1, 5);
			return 3;
		case '9':
			drawRect(color, x, y, 1, 3);
			drawRect(color, x + 1, y, 1, 1);
			drawRect(color, x + 1, y + 2, 1, 1);
			drawRect(color, x, y + 4, 2, 1);
			drawRect(color, x + 2, y, 1, 5);
			return 3;
		case ':':
			drawRect(color, x, y + 1, 1, 1);
			drawRect(color, x, y + 3, 1, 1);
			return 1;
		case '.':
			drawRect(color, x, y + 4, 1, 1);
			return 1;
		case '-':
			drawRect(color, x, y + 2, 3, 1);
			return 3;
		case ' ':
			return 2;
		default:
			drawRect(color, x, y, 3, 5);
			return 3;
	}
}

export function drawPixelTextBase(drawRect: DrawRect, x: number, y: number, color: number, text: string) {
	for (let i = 0; i < text.length; i++) {
		x += drawCharacter(drawRect, x, y, color, text.charAt(i)) + 1;
	}
}

export function drawPixelText(batch: PaletteSpriteBatch, x: number, y: number, color: number, text: string) {
	drawPixelTextBase(batch.drawRect.bind(batch), x, y, color, text);
}

export function fillRect(context: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
	context.fillStyle = color;
	context.fillRect(x, y, w, h);
}

export function drawPixelTextOnCanvas(context: CanvasRenderingContext2D, x: number, y: number, color: number, text: string) {
	drawPixelTextBase((color, x, y, w, h) => fillRect(context, colorToCSS(color), x, y, w, h), x, y, color, text);
}

interface Say {
	message: Says;
	x: number;
	y: number;
}

export function compareSays(a: Say, b: Say) {
	return a.message.created - b.message.created;
}

function isPartyMember(entity: Entity, party: PartyInfo | undefined) {
	return entity.type === PONY_TYPE && party !== undefined && party.members.some(p => p.id === entity.id && !p.pending);
}

export function drawNames(
	batch: PaletteSpriteBatch, entities: Entity[], player: Pony | undefined, party: PartyInfo | undefined,
	camera: Camera, hover: Point, drawHidden: boolean, palettes: CommonPalettes
) {
	sortEntities(entities);

	for (const e of entities) {
		if ((!isHidden(e) || drawHidden) && e.name && e !== player) {
			const nameOffsetBase = 12;
			const bounds = e.interactBounds || e.bounds;
			const chatBounds = e.chatBounds || bounds;

			if (chatBounds !== undefined && bounds !== undefined && contains(e.x, e.y, bounds, hover)) {
				const { x, y } = worldToScreen(camera, e);
				const nameOffset = nameOffsetBase - getChatHeight(e);
				const tag = (isHidden(e) && drawHidden) ? 'hidden' : e.tag;
				const flags = DrawNameFlags.None |
					(isPartyMember(e, party) ? DrawNameFlags.Party : 0) |
					(isFriend(e) ? DrawNameFlags.Friend : 0);
				drawNamePlate(batch, e.name, x, y + chatBounds.y - nameOffset, flags, palettes, tag);
			}
		}
	}
}

export function getChatBallonXY(e: Entity, camera: Camera): Point {
	const nameOffsetBase = 12;
	const bounds = e.interactBounds || e.bounds;
	const chatBounds = e.chatBounds || bounds;
	const screen = worldToScreen(camera, e);
	const nameOffset = nameOffsetBase - getChatHeight(e);
	const offset = (nameOffset + 6) + (e.tag ? 5 : 0);
	const yy = screen.y + (chatBounds ? chatBounds.y : 0) - offset;
	const x = screen.x + toInt(e.chatX);
	const y = yy + toInt(e.chatY);
	return { x, y };
}

function drawChatBaloon(batch: PaletteSpriteBatch, entity: Entity, camera: Camera, palettes: CommonPalettes) {
	const { x, y } = getChatBallonXY(entity, camera);
	drawBaloon(batch, entity.says!, x, y, camera, palettes);
}

export function drawChat(
	batch: PaletteSpriteBatch, entities: Entity[], camera: Camera, drawHidden: boolean, palettes: CommonPalettes,
	hidePublic: boolean
) {
	sortEntities(entities);

	for (const entity of entities) {
		if ((!isHidden(entity) || drawHidden) && !isPartyMessage(entity.says!.type || MessageType.Chat)) {
			if (!hidePublic || !isPublicMessage(entity.says!.type || MessageType.Chat)) {
				drawChatBaloon(batch, entity, camera, palettes);
			}
		}
	}

	for (const entity of entities) {
		if ((!isHidden(entity) || drawHidden) && isPartyMessage(entity.says!.type || MessageType.Chat)) {
			drawChatBaloon(batch, entity, camera, palettes);
		}
	}
}

function getChatHeight(entity: Entity): number {
	return isPony(entity) ? getPonyChatHeight(entity) : 0;
}

export const chatAnimationDuration = 0.2;

export function dismissSays(says: Says) {
	if (says.timer !== undefined) {
		says.timer = Math.min(says.timer, chatAnimationDuration);
	}
}

function calcAnimation(timer: number, total: number) {
	const start = (total - timer) / chatAnimationDuration;
	const end = timer / chatAnimationDuration;

	const dys = [3, 2, 1, 0, -1, 0];
	const dys2 = [-4, -3, -2, -1];
	const dyd = start * dys.length;
	const dyd2 = end * dys2.length;
	const dyi = clamp(Math.round(dyd), 0, dys.length - 1);
	const dyi2 = clamp(Math.round(dyd2), 0, dys2.length);
	const dy = dyi2 < dys2.length ? dys2[dyi2] : dys[dyi];
	const alpha = Math.min(start, end, 1);

	return { alpha, dy };
}

export function drawBox(
	batch: SpriteBatchCommons, color: number, shadowColor: number, x: number, y: number, z: number,
	w: number, l: number, h: number
) {
	const darker = multiplyColor(color, 0.8);
	const left = (x - w / 2) * tileWidth;
	const bottom = y * tileHeight;
	const elevation = z * tileElevation;
	const width = w * tileWidth;
	const frontHeight = h * tileElevation;
	const topHeight = l * tileHeight;

	batch.drawRect(shadowColor, left, bottom - topHeight, width, topHeight); // shadow
	batch.drawRect(darker, left, bottom - elevation - frontHeight, width, frontHeight); // front
	batch.drawRect(color, left, bottom - elevation - frontHeight - topHeight, width, topHeight); // top
}

export function drawSpriteBorder(
	batch: SpriteBatch, border: SpriteBorder, color: number, x: number, y: number, w: number, h: number
) {
	x = Math.round(x) | 0;
	y = Math.round(y) | 0;
	w = Math.round(w) | 0;
	h = Math.round(h) | 0;

	const size = border.border;
	const right = x + w - size;
	const bottom = y + h - size;
	const bgWidth = w - size * 2;
	const bgHeight = h - size * 2;

	batch.drawSprite(border.topLeft, color, x, y);
	batch.drawSprite(border.topRight, color, right, y);
	batch.drawSprite(border.bottomLeft, color, x, bottom);
	batch.drawSprite(border.bottomRight, color, right, bottom);

	drawStretched(batch, border.top, color, x + size, y, bgWidth, size);
	drawStretched(batch, border.left, color, x, y + size, size, bgHeight);
	//drawStretched(batch, border.bg, color, x + size, y + size, bgWidth, bgHeight);
	batch.drawRect(color, x + size, y + size, bgWidth, bgHeight);
	drawStretched(batch, border.right, color, x + w - size, y + size, size, bgHeight);
	drawStretched(batch, border.bottom, color, x + size, y + h - size, bgWidth, size);
}

function drawStretched(batch: SpriteBatch, sprite: Sprite, color: number, x: number, y: number, w: number, h: number) {
	if (sprite.h && sprite.w) {
		const sw = Math.min(sprite.w, w);
		const sh = Math.min(sprite.h, h);
		batch.drawImage(color, sprite.x, sprite.y, sw, sh, x, y, w, h);
	}
}

export function drawSpriteCropped(
	batch: PaletteSpriteBatch, s: Sprite, color: number, palette: Palette | undefined, x: number, y: number,
	maxY: number
) {
	const top = y + s.oy;
	const bottom = Math.min(top + s.h, maxY);

	if (bottom > top) {
		batch.drawImage(s.type, color, palette, s.x, s.y, s.w, s.h, x + s.ox, top, s.w, bottom - top);
	}
}

export function drawFullScreenMessage(batch: PaletteSpriteBatch, camera: Camera, text: string, palette: Palette) {
	const messageHeight = 100;
	const messageY = Math.round((camera.h - messageHeight) / 2);
	batch.drawRect(MESSAGE_COLOR, 0, messageY, camera.w, messageHeight);
	const textRect = rect(0, messageY, camera.w, messageHeight);
	drawTextAligned(batch, text, fontPal, WHITE, textRect, HAlign.Center, VAlign.Middle, { palette });
}

export function createCommonPalettes(paletteManager: PaletteManager): CommonPalettes {
	return {
		defaultPalette: paletteManager.addArray(sprites.defaultPalette),
		mainFont: {
			emoji: paletteManager.addArray(sprites.emojiPalette),
			white: paletteManager.addArray(sprites.fontPalette),
			supporter1: paletteManager.addArray(sprites.fontSupporter1Palette),
			supporter2: paletteManager.addArray(sprites.fontSupporter2Palette),
			supporter3: paletteManager.addArray(sprites.fontSupporter3Palette),
		},
		smallFont: {
			emoji: paletteManager.addArray(sprites.emojiPalette),
			white: paletteManager.addArray(sprites.fontSmallPalette),
			supporter1: paletteManager.addArray(sprites.fontSmallSupporter1Palette),
			supporter2: paletteManager.addArray(sprites.fontSmallSupporter2Palette),
			supporter3: paletteManager.addArray(sprites.fontSmallSupporter3Palette),
		},
	};
}
