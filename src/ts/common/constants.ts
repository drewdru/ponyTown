import { Season, Holiday } from './interfaces';

export const SEASON: Season = Season.Summer;
export const HOLIDAY: Holiday = Holiday.None;

export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const WEEK = DAY * 7;
export const MONTH = DAY * 30;
export const YEAR = DAY * 365;

export const BATCH_SIZE_MAX = 10000;

export const MAX_VELOCITY = 16; // do not change

export const PONY_TYPE = 1;
export const PONY_SPEED_TROT = 4; // tiles per sec
export const PONY_SPEED_WALK = 2; // tiles per sec

export const SAYS_TIME_MIN = 5; // sec
export const SAYS_TIME_MAX = 8; // sec

export const TILE_CHANGE_RANGE = 5;

export const EXPRESSION_TIMEOUT = 7000; // ms
export const FLY_DELAY = 0.4; // sec

export const SERVER_FPS = 10;

export const AFK_TIMEOUT = 15 * MINUTE;
export const REMOVE_TIMEOUT = 15 * MINUTE;
export const REMOVE_INTERVAL = 1 * MINUTE;
export const MAP_DISCARD_TIMEOUT = 15 * MINUTE;
export const MAP_SWITCH_DELAY = 1 * SECOND;
export const MAP_SWITCHES_PER_UPDATE = 1;
export const JOINS_PER_UPDATE = 1;

export const DEFAULT_CHATLOG_OPACITY = 35;
export const MAX_CHATLOG_RANGE = 11;
export const MIN_CHATLOG_RANGE = 2;

export function isChatlogRangeUnlimited(range: number | undefined) {
	return !range || range < MIN_CHATLOG_RANGE || range >= MAX_CHATLOG_RANGE;
}

export const WATER_FPS = 6;
export const WATER_HEIGHT = [0, -1, -2, -1];

export const CM_SIZE = 5;
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;

export const SAY_MAX_LENGTH = 64;
export const PLAYER_NAME_MAX_LENGTH = 20;
export const PLAYER_DESC_MAX_LENGTH = 40;
export const ACCOUNT_NAME_MIN_LENGTH = 1;
export const ACCOUNT_NAME_MAX_LENGTH = 32;
export const MAX_FILTER_WORDS_LENGTH = 1000;
export const PARTY_LIMIT = 30;
export const FRIENDS_LIMIT = 100;

export const HIDE_LIMIT = 1000;
export const UNHIDE_TIMEOUT = HOUR;
export const MIN_HIDE_TIME = HOUR;
export const MAX_HIDE_TIME = 10 * DAY;

export const SWAP_TIMEOUT = 1000;
export const MAP_LOAD_SAVE_TIMEOUT = 5000;

export const HIDES_PER_PAGE = 20;

export const LATEST_CHARACTER_LIMIT = 10;
export const BASE_CHARACTER_LIMIT = 1000;
export const ADDITIONAL_CHARACTERS_SUPPORTER1 = 200;
export const ADDITIONAL_CHARACTERS_SUPPORTER2 = 300;
export const ADDITIONAL_CHARACTERS_SUPPORTER3 = 450;
export const ADDITIONAL_CHARACTERS_PAST_SUPPORTER = 100;

export const ACTIONS_LIMIT = 50;
export const COMMAND_ACTION_TIME_DELAY = 1000;

export const ENTITY_TYPE_LIMIT = 0xffff;

export const HOUSE_ENTITY_LIMIT = 150;

export const CAMERA_WIDTH_MIN = 64;
export const CAMERA_WIDTH_MAX = 0xbff; // 3071
export const CAMERA_HEIGHT_MIN = 64;
export const CAMERA_HEIGHT_MAX = 0x7ff; // 2047

export const blinkFps = 24;
export const tileWidth = 32;
export const tileHeight = 24;
export const tileElevation = 20; // 24;

export const REGION_SIZE = 8; // in tiles
export const REGION_WIDTH = REGION_SIZE * tileWidth;
export const REGION_HEIGHT = REGION_SIZE * tileHeight;
export const REGION_BORDER = 1; // in tiles
export const TILES_RESTORE_MIN_SEC = 1; // max: TILES_RESTORE_MAX_SEC - 1
export const TILES_RESTORE_MAX_SEC = 10; // max: 255

export const PONY_INFO_KEY = 0x76;

export const MIN_ADULT_AGE = 18;
export const REQUEST_DATE_OF_BIRTH = true;

export const TIMEOUTS = [
	{ value: MINUTE * 5, label: '5 minutes' },
	{ value: MINUTE * 10, label: '10 minutes' },
	{ value: MINUTE * 30, label: '30 minutes' },
	{ value: HOUR * 1, label: '1 hour' },
	{ value: HOUR * 5, label: '5 hours' },
	{ value: HOUR * 10, label: '10 hours' },
	{ value: HOUR * 24, label: '24 hours' },
	{ value: DAY * 2, label: '2 days' },
	{ value: DAY * 5, label: '5 days' },
];

export const MONTH_NAMES_EN = [
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

export const OFFLINE_PONY = 'DAKVlZUvLy82QIxomgCfgAYAGIAoQGEBwAEERFEUEA==';
export const SUPPORTER_PONY = 'CAfz9PUFLUnapSD/1wD5aFT////+hHM2QIJkJ8AQLkkADAA6jXrsBT1Iw+wBMJOqoW1C2oW1AAI=';

// patreon reward tier IDs
export const rewardLevel1 = '2255086';
export const rewardLevel2 = '2411886';
export const rewardLevel3 = '2411888';

const SUPPORTER_REWARDS_COMMON = [
	`In-game supporter tag`,
	`Supporter chat color`,
];

const SUPPORTER_REWARDS_MORE = [
	`Access to patreon posts`,
	`Early access to new and experimental features`,
];

export const SUPPORTER_REWARDS = [
	[],
	[
		...SUPPORTER_REWARDS_COMMON,
		`${ADDITIONAL_CHARACTERS_SUPPORTER1} additional slots for saving ponies`,
	],
	[
		...SUPPORTER_REWARDS_COMMON,
		...SUPPORTER_REWARDS_MORE,
		`${ADDITIONAL_CHARACTERS_SUPPORTER2} additional slots for saving ponies`,
	],
	[
		...SUPPORTER_REWARDS_COMMON,
		...SUPPORTER_REWARDS_MORE,
		`${ADDITIONAL_CHARACTERS_SUPPORTER3} additional slots for saving ponies`,
	],
];

export const SUPPORTER_REWARDS_LIST = [
	...SUPPORTER_REWARDS_COMMON,
	...SUPPORTER_REWARDS_MORE,
	`Additional slots for saving ponies`,
];

export const PAST_SUPPORTER_REWARDS = [
	`${ADDITIONAL_CHARACTERS_PAST_SUPPORTER} additional slots for saving ponies`,
];

export const GENERAL_RULES = [
	`Be kind to others`,
	`Don't spam`,
	`Don't use multiple accounts`,
	`Don't modify the game with hacks or scripts`,
	`Don't encourage behaviour violating the rules`,
	`Violation of the rules may result in temporary or permanent ban`,
];
