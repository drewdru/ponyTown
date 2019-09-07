"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEASON = 1 /* Summer */;
exports.HOLIDAY = 0 /* None */;
exports.SECOND = 1000;
exports.MINUTE = exports.SECOND * 60;
exports.HOUR = exports.MINUTE * 60;
exports.DAY = exports.HOUR * 24;
exports.WEEK = exports.DAY * 7;
exports.MONTH = exports.DAY * 30;
exports.YEAR = exports.DAY * 365;
exports.BATCH_SIZE_MAX = 10000;
exports.MAX_VELOCITY = 16; // do not change
exports.PONY_TYPE = 1;
exports.PONY_SPEED_TROT = 4; // tiles per sec
exports.PONY_SPEED_WALK = 2; // tiles per sec
exports.SAYS_TIME_MIN = 5; // sec
exports.SAYS_TIME_MAX = 8; // sec
exports.TILE_CHANGE_RANGE = 5;
exports.EXPRESSION_TIMEOUT = 7000; // ms
exports.FLY_DELAY = 0.4; // sec
exports.SERVER_FPS = 10;
exports.AFK_TIMEOUT = 15 * exports.MINUTE;
exports.REMOVE_TIMEOUT = 15 * exports.MINUTE;
exports.REMOVE_INTERVAL = 1 * exports.MINUTE;
exports.MAP_DISCARD_TIMEOUT = 15 * exports.MINUTE;
exports.MAP_SWITCH_DELAY = 1 * exports.SECOND;
exports.MAP_SWITCHES_PER_UPDATE = 1;
exports.JOINS_PER_UPDATE = 1;
exports.DEFAULT_CHATLOG_OPACITY = 35;
exports.MAX_CHATLOG_RANGE = 11;
exports.MIN_CHATLOG_RANGE = 2;
function isChatlogRangeUnlimited(range) {
    return !range || range < exports.MIN_CHATLOG_RANGE || range >= exports.MAX_CHATLOG_RANGE;
}
exports.isChatlogRangeUnlimited = isChatlogRangeUnlimited;
exports.WATER_FPS = 6;
exports.WATER_HEIGHT = [0, -1, -2, -1];
exports.CM_SIZE = 5;
exports.MIN_SCALE = 1;
exports.MAX_SCALE = 4;
exports.SAY_MAX_LENGTH = 64;
exports.PLAYER_NAME_MAX_LENGTH = 20;
exports.PLAYER_DESC_MAX_LENGTH = 40;
exports.ACCOUNT_NAME_MIN_LENGTH = 1;
exports.ACCOUNT_NAME_MAX_LENGTH = 32;
exports.MAX_FILTER_WORDS_LENGTH = 1000;
exports.PARTY_LIMIT = 30;
exports.FRIENDS_LIMIT = 100;
exports.HIDE_LIMIT = 1000;
exports.UNHIDE_TIMEOUT = exports.HOUR;
exports.MIN_HIDE_TIME = exports.HOUR;
exports.MAX_HIDE_TIME = 10 * exports.DAY;
exports.SWAP_TIMEOUT = 1000;
exports.MAP_LOAD_SAVE_TIMEOUT = 5000;
exports.HIDES_PER_PAGE = 20;
exports.LATEST_CHARACTER_LIMIT = 10;
exports.BASE_CHARACTER_LIMIT = 1000;
exports.ADDITIONAL_CHARACTERS_SUPPORTER1 = 200;
exports.ADDITIONAL_CHARACTERS_SUPPORTER2 = 300;
exports.ADDITIONAL_CHARACTERS_SUPPORTER3 = 450;
exports.ADDITIONAL_CHARACTERS_PAST_SUPPORTER = 100;
exports.ACTIONS_LIMIT = 50;
exports.COMMAND_ACTION_TIME_DELAY = 1000;
exports.ENTITY_TYPE_LIMIT = 0xffff;
exports.HOUSE_ENTITY_LIMIT = 150;
exports.CAMERA_WIDTH_MIN = 64;
exports.CAMERA_WIDTH_MAX = 0xbff; // 3071
exports.CAMERA_HEIGHT_MIN = 64;
exports.CAMERA_HEIGHT_MAX = 0x7ff; // 2047
exports.blinkFps = 24;
exports.tileWidth = 32;
exports.tileHeight = 24;
exports.tileElevation = 20; // 24;
exports.REGION_SIZE = 8; // in tiles
exports.REGION_WIDTH = exports.REGION_SIZE * exports.tileWidth;
exports.REGION_HEIGHT = exports.REGION_SIZE * exports.tileHeight;
exports.REGION_BORDER = 1; // in tiles
exports.TILES_RESTORE_MIN_SEC = 1; // max: TILES_RESTORE_MAX_SEC - 1
exports.TILES_RESTORE_MAX_SEC = 10; // max: 255
exports.PONY_INFO_KEY = 0x76;
exports.MIN_ADULT_AGE = 18;
exports.REQUEST_DATE_OF_BIRTH = true;
exports.TIMEOUTS = [
    { value: exports.MINUTE * 5, label: '5 minutes' },
    { value: exports.MINUTE * 10, label: '10 minutes' },
    { value: exports.MINUTE * 30, label: '30 minutes' },
    { value: exports.HOUR * 1, label: '1 hour' },
    { value: exports.HOUR * 5, label: '5 hours' },
    { value: exports.HOUR * 10, label: '10 hours' },
    { value: exports.HOUR * 24, label: '24 hours' },
    { value: exports.DAY * 2, label: '2 days' },
    { value: exports.DAY * 5, label: '5 days' },
];
exports.MONTH_NAMES_EN = [
    'January',
    'February ',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
exports.OFFLINE_PONY = 'DAKVlZUvLy82QIxomgCfgAYAGIAoQGEBwAEERFEUEA==';
exports.SUPPORTER_PONY = 'CAfz9PUFLUnapSD/1wD5aFT////+hHM2QIJkJ8AQLkkADAA6jXrsBT1Iw+wBMJOqoW1C2oW1AAI=';
// patreon reward tier IDs
exports.rewardLevel1 = '2255086';
exports.rewardLevel2 = '2411886';
exports.rewardLevel3 = '2411888';
const SUPPORTER_REWARDS_COMMON = [
    `In-game supporter tag`,
    `Supporter chat color`,
];
const SUPPORTER_REWARDS_MORE = [
    `Access to patreon posts`,
    `Early access to new and experimental features`,
];
exports.SUPPORTER_REWARDS = [
    [],
    [
        ...SUPPORTER_REWARDS_COMMON,
        `${exports.ADDITIONAL_CHARACTERS_SUPPORTER1} additional slots for saving ponies`,
    ],
    [
        ...SUPPORTER_REWARDS_COMMON,
        ...SUPPORTER_REWARDS_MORE,
        `${exports.ADDITIONAL_CHARACTERS_SUPPORTER2} additional slots for saving ponies`,
    ],
    [
        ...SUPPORTER_REWARDS_COMMON,
        ...SUPPORTER_REWARDS_MORE,
        `${exports.ADDITIONAL_CHARACTERS_SUPPORTER3} additional slots for saving ponies`,
    ],
];
exports.SUPPORTER_REWARDS_LIST = [
    ...SUPPORTER_REWARDS_COMMON,
    ...SUPPORTER_REWARDS_MORE,
    `Additional slots for saving ponies`,
];
exports.PAST_SUPPORTER_REWARDS = [
    `${exports.ADDITIONAL_CHARACTERS_PAST_SUPPORTER} additional slots for saving ponies`,
];
exports.GENERAL_RULES = [
    `Be kind to others`,
    `Don't spam`,
    `Don't use multiple accounts`,
    `Don't modify the game with hacks or scripts`,
    `Don't encourage behaviour violating the rules`,
    `Violation of the rules may result in temporary or permanent ban`,
];
//# sourceMappingURL=constants.js.map