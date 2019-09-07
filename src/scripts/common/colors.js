"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const color_1 = require("./color");
const utils_1 = require("./utils");
const ponyInfo_1 = require("./ponyInfo");
// basic
exports.TRANSPARENT = 0;
exports.WHITE = 0xffffffff;
exports.BLACK = 0x000000ff;
exports.ORANGE = 0xffa500ff;
exports.BLUE = 0x0000ffff;
exports.GREEN = 0x00ff00ff;
exports.YELLOW = 0xffff00ff;
exports.MAGENTA = 0xff00ffff;
exports.CYAN = 0x00ffffff;
exports.GRAY = 0x444444ff;
exports.RED = 0xff0000ff;
exports.HOTPINK = 0xff69b4ff;
exports.PURPLE = 0x800080ff;
// messages
exports.BG_COLOR = 0x333333ff;
exports.ADMIN_COLOR = 0xff69b4ff;
exports.MOD_COLOR = 0xb689ffff;
exports.SYSTEM_COLOR = 0xbbbbbbff;
exports.MESSAGE_COLOR = 0x333333ff;
exports.ANNOUNCEMENT_COLOR = 0xf0e68Cff;
exports.PARTY_COLOR = 0x71daffff;
exports.THINKING_COLOR = 0xafafafff;
exports.PARTY_THINKING_COLOR = 0x5da9c4ff;
exports.OUTLINE_COLOR = color_1.withAlphaFloat(exports.BLACK, 0.4);
exports.PATREON_COLOR = 0xf86754ff;
exports.WHISPER_COLOR = 0xffa1dfff;
exports.FRIENDS_COLOR = 0x71ff7fff;
exports.SUPPORTER1_COLOR = exports.PATREON_COLOR;
exports.SUPPORTER2_COLOR = 0xffa32bff;
exports.SUPPORTER3_COLOR = 0xffcf00ff;
exports.SUPPORTER2_BANDS = [0xffdfc1ff, 0xffcd99ff, 0xff9f3bff, 0xd97e09ff];
exports.SUPPORTER3_BANDS = [0xffffffff, 0xfffda4ff, 0xffea3bff, 0xfdbb0bff];
// game
exports.SHADOW_COLOR = color_1.withAlphaFloat(exports.BLACK, 0.3);
exports.CLOUD_SHADOW_COLOR = color_1.withAlphaFloat(exports.BLACK, 0.2);
exports.SHINES_COLOR = color_1.withAlphaFloat(exports.WHITE, 0.4);
exports.FAR_COLOR = color_1.colorFromHSVA(0, 0, 0.8, 1);
exports.GRASS_COLOR = 0x90ee90ff;
exports.HEARTS_COLOR = 0xf15f9dff;
exports.CAVE_LIGHT = 0x090c21ff; // 0x253f76ff;
exports.CAVE_SHADOW = 0x00000055;
exports.ACTION_EXPRESSION_BG = '#e7aa4e';
exports.ACTION_EXPRESSION_EYE_COLOR = '#b17a00';
exports.ACTION_ACTION_BG = '#dc9d82';
exports.ACTION_ACTION_COAT_COLOR = '#d9835e';
exports.ACTION_COMMAND_BG = '#5fb7b3';
exports.ACTION_ITEM_BG = '#cecf59';
exports.ENTITY_ITEM_BG = '#dc76bc';
exports.MAGIC_ALPHA = 150;
function updateActionColor(color) {
    if (DEVELOPMENT) {
        exports.ACTION_EXPRESSION_BG = color;
    }
}
exports.updateActionColor = updateActionColor;
// utils
function getMessageColor(type) {
    switch (type) {
        case 0 /* Chat */: return exports.WHITE;
        case 1 /* System */: return exports.SYSTEM_COLOR;
        case 2 /* Admin */: return exports.ADMIN_COLOR;
        case 3 /* Mod */: return exports.MOD_COLOR;
        case 4 /* Party */: return exports.PARTY_COLOR;
        case 5 /* Thinking */: return exports.THINKING_COLOR;
        case 6 /* PartyThinking */: return exports.PARTY_THINKING_COLOR;
        case 9 /* Supporter1 */: return exports.SUPPORTER1_COLOR;
        case 10 /* Supporter2 */: return exports.SUPPORTER2_COLOR;
        case 11 /* Supporter3 */: return exports.SUPPORTER3_COLOR;
        case 13 /* Whisper */:
        case 14 /* WhisperTo */:
            return exports.WHISPER_COLOR;
        case 7 /* Announcement */:
        case 8 /* PartyAnnouncement */:
        case 15 /* WhisperAnnouncement */:
        case 16 /* WhisperToAnnouncement */:
            return exports.ANNOUNCEMENT_COLOR;
        case 12 /* Dismiss */: return exports.TRANSPARENT;
        default:
            return utils_1.invalidEnumReturn(type, exports.WHITE);
    }
}
exports.getMessageColor = getMessageColor;
function fillToOutline(color) {
    return color ? color_1.colorToHexRGB(fillToOutlineColor(color_1.parseColorFast(color))) : undefined;
}
exports.fillToOutline = fillToOutline;
function fillToOutlineWithDarken(color) {
    return color ? color_1.colorToHexRGB(ponyInfo_1.darkenForOutline(fillToOutlineColor(color_1.parseColorFast(color)))) : undefined;
}
exports.fillToOutlineWithDarken = fillToOutlineWithDarken;
function fillToOutlineColor(color) {
    const { h, s, v, a } = color_1.colorToHSVA(color);
    return color_1.colorFromHSVA(h, Math.min(s * 1.3, 1), v * 0.7, a);
}
exports.fillToOutlineColor = fillToOutlineColor;
const LIGHT_BLUSH = 0xff89aeff;
const DARK_BLUSH = 0xc90040ff;
function blushColor(coat) {
    const { h, s, v } = color_1.colorToHSVA(coat);
    if ((h < 15 && s > 0.2 && s < 0.7 && v > 0.85) ||
        (h > 15 && h < 50 && s > 0.2 && v > 0.85) ||
        (h > 280 && s > 0.2 && s < 0.7 && v > 0.85)) {
        return DARK_BLUSH;
    }
    else {
        return LIGHT_BLUSH;
    }
}
exports.blushColor = blushColor;
function getTileColor(tile, season) {
    switch (tile) {
        case 1 /* Dirt */:
        case 12 /* ElevatedDirt */:
            if (season === 2 /* Autumn */) {
                return 0xedd29eff;
            }
            else if (season === 4 /* Winter */) {
                return 0xd9c2a1ff;
            }
            else {
                return 0xf5d99bff;
            }
        case 3 /* Water */:
        case 7 /* WalkableWater */:
        case 8 /* Boat */:
            return 0x6dbdecff;
        case 2 /* Grass */:
            if (season === 2 /* Autumn */) {
                return 0xddcf71ff;
            }
            else if (season === 4 /* Winter */) {
                return 0xe1ebf8ff;
            }
            else {
                return 0x7cc991ff;
            }
        case 5 /* Ice */:
        case 9 /* WalkableIce */:
            return 0xc1dcecff;
        case 6 /* SnowOnIce */:
            return 0xe4eefbff;
        case 4 /* Wood */:
            return 0xd7ac7eff;
        case 10 /* Stone */:
            return 0x9da6abff;
        case 11 /* Stone2 */:
            return 0xa0a691ff;
        case 0 /* None */:
        case 100 /* WallH */:
        case 101 /* WallV */:
            return exports.BLACK;
        default:
            utils_1.invalidEnum(tile);
            return exports.BLACK;
    }
}
exports.getTileColor = getTileColor;
//# sourceMappingURL=colors.js.map