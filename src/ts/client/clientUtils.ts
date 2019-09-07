import { clamp } from 'lodash';
import {
	SocialSite, SocialSiteInfo, Eye, Muzzle, Iris, ExpressionExtra, Expression, ServerInfo, ServerFeatureFlags,
	AccountData, AccountDataFlags
} from '../common/interfaces';
import {
	PLAYER_NAME_MAX_LENGTH, SAY_MAX_LENGTH, SAYS_TIME_MIN, SAYS_TIME_MAX, isChatlogRangeUnlimited, SUPPORTER_REWARDS,
	PAST_SUPPORTER_REWARDS
} from '../common/constants';
import { matcher, isSurrogate, fromSurrogate, isLowSurrogate } from '../common/stringUtils';
import { oauthProviders } from './data';
import { Subject } from '../../../node_modules/rxjs';
import { PonyTownGame } from './game';
import { toScreenX, toScreenY } from '../common/positionUtils';
import { hasFlag } from '../common/utils';

export const matchCyrillic = /[\u0400-\u04FF]/g;
export const containsCyrillic = matcher(matchCyrillic);

const otherValid = [
	'♂♀⚲⚥⚧☿♁⚨⚩⚦⚢⚣⚤', // gender symbols
	'™®♥♦♣♠❥♡♢♤♧ღஐ·´°•◦✿❀◆◇◈◉◊｡¥€«»，：■□—', // other
	'〈〉「」『』【】《》♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼№●○◌★☆✰✦✧▪▫･', // other 2
	'\u1160\u3000\u3164', // spaces (replaced later)
].join('').split('').reduce((set, c) => (set.add(c.charCodeAt(0)), set), new Set<number>());

export function isValid(c: number): boolean {
	return (c >= 0x0020 && c <= 0x007e) // latin
		|| (c >= 0x00a0 && c <= 0x00ff) // latin 1 supplement
		|| (c >= 0x0100 && c <= 0x017F) // Latin Extended-A
		|| (c >= 0x0180 && c <= 0x024F) // Latin Extended-B
		|| (c >= 0x1e00 && c <= 0x1eff) // Latin Extended Additional
		|| (c >= 0x0370 && c <= 0x03FF) // Greek and Coptic
		|| (c >= 0x0400 && c <= 0x0481) || (c >= 0x048A && c <= 0x04FF) // cyrillic
		|| (c >= 0x3041 && c <= 0x3096) // hiragana
		|| (c >= 0x30A0 && c <= 0x30FF) // hatakana
		|| (c >= 0x3400 && c <= 0x4DB5) || (c >= 0x4E00 && c <= 0x9FCB) || (c >= 0xF900 && c <= 0xFA6A) // kanji
		|| (c >= 0x2F00 && c <= 0x2FDF) // Kangxi Radicals
		|| (c >= 0x3000 && c <= 0x302D) // CJK Symbols and Punctuation
		|| (c >= 0x1D00 && c <= 0x1D7F) // Phonetic Extensions
		|| (c >= 0x0250 && c <= 0x02AF) // IPA Extensions
		|| (c >= 0xA720 && c <= 0xA7FF) // Latin Extended-D
		|| (c >= 0x0E00 && c <= 0x0E7F) // Thai
		|| (c >= 0xff01 && c <= 0xff5e) // Romaji (replaced later)
		|| (c >= 0x2200 && c <= 0x22FF) // Mathematical Operators
		|| (c >= 0x25A0 && c <= 0x25FF) // Geometric Shapes
		|| (c >= 0x2600 && c <= 0x26ff) || (c >= 0x2700 && c <= 0x27bf) || (c >= 0x2b00 && c <= 0x2bef) // emoji
		|| (c >= 0x1f600 && c <= 0x1f64f) || (c >= 0x1f680 && c <= 0x1f6f6) || (c >= 0x1f300 && c <= 0x1f5ff) // emoji
		|| (c >= 0x231a && c <= 0x231b) || (c >= 0x23e9 && c <= 0x23fa) // emoji
		|| (c >= 0x1f900 && c <= 0x1f9ff) // Supplemental Symbols and Pictographs
		|| otherValid.has(c) // other symbols
		;
}

export function isValid2(c: number): boolean {
	return (c >= 0x2b0 && c <= 0x2ff) // Spacing Modifier Letters
		|| (c >= 0x531 && c <= 0x556) || (c >= 0x559 && c <= 0x55f) || (c >= 0x561 && c <= 0x587)
		|| (c >= 0x589 && c <= 0x58a) || (c >= 0x58c && c <= 0x58f) // Armenian
		|| (c >= 0x591 && c <= 0x5c7) || (c >= 0x5d0 && c <= 0x5ea) || (c >= 0x5f0 && c <= 0x5f4) // Hebrew
		|| (c >= 0x600 && c <= 0x6ff) // Arabic
		|| (c >= 0x7c0 && c <= 0x7fa) // NKo
		|| (c >= 0x900 && c <= 0x97f) // Devanagari
		|| (c === 0xb90) || (c === 0xb9c) // Tamil
		|| (c >= 0xc85 && c <= 0xc8c) || (c >= 0xc8e && c <= 0xc90) || (c >= 0xc91 && c <= 0xca8)
		|| (c >= 0xcaa && c <= 0xcb3) || (c >= 0xcb5 && c <= 0xcb9) || (c >= 0xce6 && c <= 0xcef) // Kannada
		|| (c >= 0x10a0 && c <= 0x10c5) || (c === 0x10c7) || (c === 0x10cd) || (c >= 0x10d0 && c <= 0x10ff) // Georgian
		|| (c >= 0x1100 && c <= 0x11ff) || (c >= 0x3130 && c <= 0x318f) || (c >= 0xac00 && c <= 0xd7af) // Hangul
		|| (c >= 0x1400 && c <= 0x167f) // Unified Canadian Aboriginal Syllabics
		|| (c >= 0x2010 && c <= 0x2027) || (c >= 0x2030 && c <= 0x205e)  // General Punctuation
		|| (c >= 0x20a0 && c <= 0x20bf) // Currency Symbols
		|| (c >= 0x2100 && c <= 0x214f) // Letterlike Symbols
		|| (c >= 0x2150 && c <= 0x218b) // Number Forms
		|| (c >= 0x2300 && c <= 0x239a) || (c >= 0x23b4 && c <= 0x23fa) // Miscellaneous Technical
		|| (c >= 0x2500 && c <= 0x257f) // Box Drawing
		|| (c >= 0x2800 && c <= 0x28ff) // Braille Patterns
		|| (c >= 0x3000 && c <= 0x303f) // CJK Symbols and Punctuation
		|| (c >= 0x3105 && c <= 0x312d) // Bopomofo
		|| (c >= 0xfe30 && c <= 0xfe4f) // CJK Compatibility Forms
		|| (c >= 0xff01 && c <= 0xffef) // Halfwidth and Fullwidth Forms
		// || (c >= 0x1f170 && c < 0x1f189) // Enclosed Alphanumeric Supplement [a-z]
		|| (c >= 0x1f000 && c <= 0x1f02b) // Mahjong Tiles
		|| (c >= 0x1f0a0 && c <= 0x1f0ae) || (c >= 0x1f0b1 && c <= 0x1f0bf) || (c >= 0x1f0c1 && c <= 0x1f0cf)
		|| (c >= 0x1f0d1 && c <= 0x1f0df) || (c >= 0x1f0e0 && c <= 0x1f0f5) // Playing Cards
		|| (c >= 0x1f1e6 && c <= 0x1f1ff) // Enclosed Alphanumeric Supplement (regional indicators)
		;
}

function isInvalid(c: number): boolean {
	return c === 0x1f595 // middle finger emoji
		|| c === 0x00ad // soft hyphen
		;
}

function isValidForName(c: number): boolean {
	return isValid(c) && !isInvalid(c);
}

function isValidForMessage(c: number): boolean {
	return (isValid(c) || isValid2(c)) && !isInvalid(c);
}

export const matchRomaji = /[\uff01-\uff5e]/g;

const matchOtherWhitespace = /[\u1160\u2800\u3000\u3164\uffa0]+/g;

export function replaceRomaji(match: string): string {
	return String.fromCharCode(match.charCodeAt(0) - 0xfee0);
}

export function cleanName(name: string | undefined): string {
	return filterString(name, isValidForName)
		.replace(matchOtherWhitespace, ' ') // whitespace characters
		.replace(/\s+/g, ' ')
		.replace(matchRomaji, replaceRomaji)
		.trim();
}

export function cleanMessage(text: string | undefined): string {
	return filterString(text, isValidForMessage)
		.replace(matchOtherWhitespace, ' ') // whitespace characters
		.replace(/[\r\n]/g, '')
		.replace(matchRomaji, replaceRomaji)
		.trim()
		.substr(0, SAY_MAX_LENGTH);
}

export function filterString(value: string | undefined, filter: (code: number) => boolean): string {
	value = value || '';

	for (let i = 0; i < value.length; i++) {
		let code = value.charCodeAt(i);
		let size = 1;
		let invalidSurrogate = false;

		if (isSurrogate(code) && (i + 1) < value.length) {
			const extra = value.charCodeAt(i + 1);

			if (isLowSurrogate(extra)) {
				code = fromSurrogate(code, extra);
				i++;
				size++;
			} else {
				invalidSurrogate = true;
			}
		}

		if (invalidSurrogate || !filter(code)) {
			i -= size;
			value = value.substr(0, i + 1) + value.substr(i + size + 1);
		}
	}

	return value;
}

export function validatePonyName(name: string | undefined): boolean {
	return !!name && !!name.length && name.length <= PLAYER_NAME_MAX_LENGTH && !/^[.,_-]+$/.test(name);
}

export function toSocialSiteInfo({ id, name, url, provider }: SocialSite): SocialSiteInfo {
	const oauth = oauthProviders.find(p => p.id === provider);

	return {
		id,
		name,
		url,
		icon: oauth && oauth.id,
		color: oauth && oauth.color,
	};
}

function isMultipleMatch(message: string, last: string): boolean {
	const minMessageLength = 4;

	if (message.length >= minMessageLength && last.length >= minMessageLength) {
		let current = last;

		while (current.length < message.length) {
			current += last;
		}

		return message === current.substr(0, SAY_MAX_LENGTH);
	} else {
		return false;
	}
}

function checkTrailing(message: string, last: string) {
	return message.indexOf(last) === 0 && (message.length - last.length) < 3;
}

function isTrailingMatch(message: string, last: string) {
	const minMessageLength = 5;

	if (message.length > last.length && last.length > minMessageLength) {
		return checkTrailing(message, last);
	} else if (message.length < last.length && message.length > minMessageLength) {
		return checkTrailing(last, message);
	} else {
		return false;
	}
}

export function isSpamMessage(message: string, lastMessages: string[]): boolean {
	if (!/^\//.test(message) && lastMessages.length) {
		return lastMessages.some(last => message === last || isMultipleMatch(message, last) || isTrailingMatch(message, last));
	} else {
		return false;
	}
}

export function getSaysTime(message: string): number {
	return SAYS_TIME_MIN + clamp(message.length / SAY_MAX_LENGTH, 0, 1) * (SAYS_TIME_MAX - SAYS_TIME_MIN);
}

export function createExpression(
	right: Eye, left: Eye, muzzle: Muzzle, rightIris = Iris.Forward, leftIris = Iris.Forward, extra = ExpressionExtra.None
): Expression {
	return { right, left, muzzle, rightIris, leftIris, extra };
}

export const isAndroidBrowser = (() => {
	const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;

	// Android browser
	// Mozilla/5.0 (Linux; U; Android 4.4.2; es-ar; LG-D375AR Build/KOT49I)
	// AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.1599.103 Mobile Safari/537.36
	if (/Android /.test(ua) && /AppleWebKit/.test(ua) && (!/chrome/i.test(ua) || /Chrome\/30\./.test(ua))) {
		return true;
	}

	return false;
})();

/* istanbul ignore next */
export const isBrowserOutdated = (() => {
	const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;

	// Safari <= 8
	// Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1)
	// AppleWebKit/600.1.25 (KHTML, like Gecko) Version/8.0 Safari/600.1.25
	const safari = /Version\/(\d+)\.[0-9.]+ Safari/.exec(ua);

	if (safari && parseInt(safari[1], 10) <= 8) {
		return true;
	}

	// Android browser
	// Mozilla/5.0 (Linux; U; Android 4.4.2; es-ar; LG-D375AR Build/KOT49I)
	// AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/30.0.1599.103 Mobile Safari/537.36
	if (isAndroidBrowser) {
		return true;
	}

	if (!supportsLetAndConst()) {
		return true;
	}

	return false;
})();

export function getLocale() {
	return (navigator.languages ? navigator.languages[0] : navigator.language) || 'en-US';
}

/* istanbul ignore next */
export function isLanguage(lang: string) {
	const languages = navigator.languages || [navigator.language];
	return languages.some(l => l === lang);
}

/* istanbul ignore next */
export function sortServersForRussian(a: ServerInfo, b: ServerInfo) {
	if (a.flag === 'ru' && a.flag !== b.flag) {
		return -1;
	}

	if (b.flag === 'ru' && a.flag !== b.flag) {
		return 1;
	}

	return a.id.localeCompare(b.id);
}

export function readFileAsText(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e: any) => resolve(e.target && e.target.result || '');
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsText(file);
	});
}

/* istanbul ignore next */
export function isFileSaverSupported() {
	try {
		return !!new Blob;
	} catch {
		return false;
	}
}

export let isInIncognitoMode = false;

export function setIsIncognitoMode(value: boolean) {
	isInIncognitoMode = value;
}

/* istanbul ignore next */
function checkIncognitoMode(wnd: any) {
	if (!wnd || !wnd.chrome)
		return;

	const fs = wnd.RequestFileSystem || wnd.webkitRequestFileSystem;

	if (!fs)
		return;

	fs(wnd.TEMPORARY, 100, () => { }, () => isInIncognitoMode = true);
}

let focused = true;

/* istanbul ignore next */
export function isFocused() {
	return focused;
}

/* istanbul ignore next */
if (typeof window !== 'undefined') {
	checkIncognitoMode(window);
	window.addEventListener('focus', () => focused = true);
	window.addEventListener('blur', () => focused = false);
}

/* istanbul ignore next */
export function isStandalone() {
	return !!window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as any).standalone === true; // safari
}

/* istanbul ignore next */
export function supportsLetAndConst() {
	try {
		return (new Function('let x = true; return x;'))();
	} catch {
		return false;
	}
}

/* istanbul ignore next */
export function registerServiceWorker(url: string, onUpdate: () => void) {
	try {
		if ('serviceWorker' in navigator && typeof navigator.serviceWorker.register === 'function') {
			let hadWorker = false;

			navigator.serviceWorker.register(url)
				.then(worker => {
					hadWorker = !!worker.active;

					worker.addEventListener('updatefound', () => {
						if (hadWorker) {
							onUpdate();
						}
					});
				});

			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (hadWorker) {
					location.reload();
				}
			});
		}
	} catch (e) {
		console.error(e);
	}
}

/* istanbul ignore next */
export function unregisterServiceWorker() {
	if ('serviceWorker' in navigator && typeof navigator.serviceWorker.getRegistrations === 'function') {
		return navigator.serviceWorker.getRegistrations()
			.then(registrations => {
				for (const registration of registrations) {
					registration.unregister();
				}
			});
	} else {
		return Promise.resolve();
	}
}

/* istanbul ignore next */
export function attachDebugMethod(name: string, method: any) {
	if (typeof window !== 'undefined') {
		(window as any)[name] = method;
	}
}

/* istanbul ignore next */
export function updateRangeIndicator(range: number | undefined, { player, scale, camera }: PonyTownGame) {
	const e = document.getElementById('range-indicator')!;

	if (player && !isChatlogRangeUnlimited(range)) {
		const x = (toScreenX(player.x) - camera.x) * scale;
		const y = (toScreenY(player.y) - camera.actualY) * scale;
		const w = toScreenX(range!) * scale * 2;
		const h = toScreenY(range!) * scale * 2;
		e.style.width = `${w}px`;
		e.style.height = `${h}px`;
		e.style.left = `${-w / 2}px`;
		e.style.top = `${-h / 2}px`;
		e.style.transform = `translate3d(${x}px, ${y}px, 0)`;
		e.style.display = 'block';
	} else {
		e.style.display = 'none';
	}
}

/* istanbul ignore next */
export function checkIframeKey(iframeId: string, expectedKey: string) {
	try {
		const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
		const doc = iframe && iframe.contentWindow && iframe.contentWindow.document;
		const key = doc && doc.body && doc.body.getAttribute('data-key');
		return key === expectedKey;
	} catch (e) {
		if (DEVELOPMENT) {
			console.error(e);
		}

		return false;
	}
}

let flags: ServerFeatureFlags = {};

export const featureFlagsChanged = new Subject<ServerFeatureFlags>();

export function initFeatureFlags(newFlags: ServerFeatureFlags) {
	flags = newFlags;
	featureFlagsChanged.next(newFlags);
}

export function hasFeatureFlag(flag: keyof ServerFeatureFlags) {
	return !!flags[flag];
}

export function hardReload() {
	unregisterServiceWorker()
		.then(() => location.reload(true));
}

const LOGGING = false;

let logger = (_: string) => { };

export function initLogger(newLogger: (message: string) => void) {
	if (LOGGING) {
		logger = newLogger;
	}
}

export function log(message: string) {
	if (LOGGING) {
		logger(message);
	}
}

export function isSupporterOrPastSupporter(account: AccountData | undefined) {
	return !!account && (!!account.supporter || hasFlag(account.flags, AccountDataFlags.PastSupporter));
}

export function supporterTitle(account: AccountData | undefined) {
	if (account && account.supporter) {
		return `Supporter Tier ${account.supporter}`;
	} else if (account && hasFlag(account.flags, AccountDataFlags.PastSupporter)) {
		return 'Past supporter';
	} else {
		return '';
	}
}

export function supporterClass(account: AccountData | undefined) {
	if (account && account.supporter) {
		return `supporter-${account.supporter}`;
	} else if (account && hasFlag(account.flags, AccountDataFlags.PastSupporter)) {
		return 'supporter-past';
	} else {
		return 'd-none';
	}
}

export function supporterRewards(account: AccountData | undefined) {
	if (account && account.supporter) {
		return SUPPORTER_REWARDS[account.supporter];
	} else if (account && hasFlag(account.flags, AccountDataFlags.PastSupporter)) {
		return PAST_SUPPORTER_REWARDS;
	} else {
		return SUPPORTER_REWARDS[0];
	}
}
