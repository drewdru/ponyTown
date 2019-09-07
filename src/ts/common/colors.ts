import { MessageType, Season, TileType } from './interfaces';
import { colorFromHSVA, colorToHexRGB, parseColorFast, colorToHSVA, withAlphaFloat } from './color';
import { invalidEnum, invalidEnumReturn } from './utils';
import { darkenForOutline } from './ponyInfo';

// basic

export const TRANSPARENT = 0;
export const WHITE = 0xffffffff;
export const BLACK = 0x000000ff;
export const ORANGE = 0xffa500ff;
export const BLUE = 0x0000ffff;
export const GREEN = 0x00ff00ff;
export const YELLOW = 0xffff00ff;
export const MAGENTA = 0xff00ffff;
export const CYAN = 0x00ffffff;
export const GRAY = 0x444444ff;
export const RED = 0xff0000ff;
export const HOTPINK = 0xff69b4ff;
export const PURPLE = 0x800080ff;

// messages

export const BG_COLOR = 0x333333ff;
export const ADMIN_COLOR = 0xff69b4ff;
export const MOD_COLOR = 0xb689ffff;
export const SYSTEM_COLOR = 0xbbbbbbff;
export const MESSAGE_COLOR = 0x333333ff;
export const ANNOUNCEMENT_COLOR = 0xf0e68Cff;
export const PARTY_COLOR = 0x71daffff;
export const THINKING_COLOR = 0xafafafff;
export const PARTY_THINKING_COLOR = 0x5da9c4ff;
export const OUTLINE_COLOR = withAlphaFloat(BLACK, 0.4);
export const PATREON_COLOR = 0xf86754ff;
export const WHISPER_COLOR = 0xffa1dfff;
export const FRIENDS_COLOR = 0x71ff7fff;

export const SUPPORTER1_COLOR = PATREON_COLOR;
export const SUPPORTER2_COLOR = 0xffa32bff;
export const SUPPORTER3_COLOR = 0xffcf00ff;

export const SUPPORTER2_BANDS = [0xffdfc1ff, 0xffcd99ff, 0xff9f3bff, 0xd97e09ff];
export const SUPPORTER3_BANDS = [0xffffffff, 0xfffda4ff, 0xffea3bff, 0xfdbb0bff];

// game

export const SHADOW_COLOR = withAlphaFloat(BLACK, 0.3);
export const CLOUD_SHADOW_COLOR = withAlphaFloat(BLACK, 0.2);
export const SHINES_COLOR = withAlphaFloat(WHITE, 0.4);
export const FAR_COLOR = colorFromHSVA(0, 0, 0.8, 1);
export const GRASS_COLOR = 0x90ee90ff;
export const HEARTS_COLOR = 0xf15f9dff;

export const CAVE_LIGHT = 0x090c21ff; // 0x253f76ff;
export const CAVE_SHADOW = 0x00000055;

export let ACTION_EXPRESSION_BG = '#e7aa4e';
export const ACTION_EXPRESSION_EYE_COLOR = '#b17a00';
export const ACTION_ACTION_BG = '#dc9d82';
export const ACTION_ACTION_COAT_COLOR = '#d9835e';
export const ACTION_COMMAND_BG = '#5fb7b3';
export const ACTION_ITEM_BG = '#cecf59';
export const ENTITY_ITEM_BG = '#dc76bc';

export const MAGIC_ALPHA = 150;

export function updateActionColor(color: string) {
	if (DEVELOPMENT) {
		ACTION_EXPRESSION_BG = color;
	}
}

// utils

export function getMessageColor(type: MessageType): number {
	switch (type) {
		case MessageType.Chat: return WHITE;
		case MessageType.System: return SYSTEM_COLOR;
		case MessageType.Admin: return ADMIN_COLOR;
		case MessageType.Mod: return MOD_COLOR;
		case MessageType.Party: return PARTY_COLOR;
		case MessageType.Thinking: return THINKING_COLOR;
		case MessageType.PartyThinking: return PARTY_THINKING_COLOR;
		case MessageType.Supporter1: return SUPPORTER1_COLOR;
		case MessageType.Supporter2: return SUPPORTER2_COLOR;
		case MessageType.Supporter3: return SUPPORTER3_COLOR;
		case MessageType.Whisper:
		case MessageType.WhisperTo:
			return WHISPER_COLOR;
		case MessageType.Announcement:
		case MessageType.PartyAnnouncement:
		case MessageType.WhisperAnnouncement:
		case MessageType.WhisperToAnnouncement:
			return ANNOUNCEMENT_COLOR;
		case MessageType.Dismiss: return TRANSPARENT;
		default:
			return invalidEnumReturn(type, WHITE);
	}
}

export function fillToOutline(color: string | undefined): string | undefined {
	return color ? colorToHexRGB(fillToOutlineColor(parseColorFast(color))) : undefined;
}

export function fillToOutlineWithDarken(color: string | undefined): string | undefined {
	return color ? colorToHexRGB(darkenForOutline(fillToOutlineColor(parseColorFast(color)))) : undefined;
}

export function fillToOutlineColor(color: number): number {
	const { h, s, v, a } = colorToHSVA(color);
	return colorFromHSVA(h, Math.min(s * 1.3, 1), v * 0.7, a);
}

const LIGHT_BLUSH = 0xff89aeff;
const DARK_BLUSH = 0xc90040ff;

export function blushColor(coat: number): number {
	const { h, s, v } = colorToHSVA(coat);

	if (
		(h < 15 && s > 0.2 && s < 0.7 && v > 0.85) ||
		(h > 15 && h < 50 && s > 0.2 && v > 0.85) ||
		(h > 280 && s > 0.2 && s < 0.7 && v > 0.85)
	) {
		return DARK_BLUSH;
	} else {
		return LIGHT_BLUSH;
	}
}

export function getTileColor(tile: TileType, season: Season) {
	switch (tile) {
		case TileType.Dirt:
		case TileType.ElevatedDirt:
			if (season === Season.Autumn) {
				return 0xedd29eff;
			} else if (season === Season.Winter) {
				return 0xd9c2a1ff;
			} else {
				return 0xf5d99bff;
			}
		case TileType.Water:
		case TileType.WalkableWater:
		case TileType.Boat:
			return 0x6dbdecff;
		case TileType.Grass:
			if (season === Season.Autumn) {
				return 0xddcf71ff;
			} else if (season === Season.Winter) {
				return 0xe1ebf8ff;
			} else {
				return 0x7cc991ff;
			}
		case TileType.Ice:
		case TileType.WalkableIce:
			return 0xc1dcecff;
		case TileType.SnowOnIce:
			return 0xe4eefbff;
		case TileType.Wood:
			return 0xd7ac7eff;
		case TileType.Stone:
			return 0x9da6abff;
		case TileType.Stone2:
			return 0xa0a691ff;
		case TileType.None:
		case TileType.WallH:
		case TileType.WallV:
			return BLACK;
		default:
			invalidEnum(tile);
			return BLACK;
	}
}
