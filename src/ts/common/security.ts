import { escapeRegExp, compact, isMatchWith } from 'lodash';
import { PonyInfoNumber, PonyInfo } from './interfaces';
import { urlRegexTexts, ipRegexText } from './filterUtils';
import { AuthBase, GeneralSettings, Suspicious, GameServerSettings } from './adminInterfaces';
import { parseColorFast } from './color';

// suspicious

export const urlRegex = new RegExp(urlRegexTexts.join('|'), 'ui');
export const ipRegex = new RegExp(ipRegexText, 'ui');

function createRegExpFromList(list: string | undefined, wholeWords = false): RegExp | undefined {
	const lines = list && compact(list.split(/\r?\n/).map(x => x.trim()));

	if (lines && lines.length) {
		const combined = lines.map(escapeRegExp).join('|');

		if (wholeWords) {
			return new RegExp(`\\b(${combined})\\b`, 'ui');
		} else {
			return new RegExp(combined, 'ui');
		}
	} else {
		return undefined;
	}
}

export const createCachedTest = (wholeWords = false) => {
	let cachedList: string | undefined = undefined;
	let cachedRegex: RegExp | undefined = undefined;

	return (list: string | undefined, value: string) => {
		if (cachedList !== list) {
			cachedList = list;
			cachedRegex = createRegExpFromList(list, wholeWords);
		}

		return cachedRegex ? cachedRegex.test(value) : false;
	};
};

export const createIsSuspiciousMessage = (general: GeneralSettings) => {
	const test = createCachedTest();
	const testSafe = createCachedTest();
	const testWhole = createCachedTest(true);
	const testSafeInstant = createCachedTest();
	const testWholeInstant = createCachedTest(true);

	return (text: string, { filterSwears }: GameServerSettings): Suspicious => {
		if (test(general.suspiciousMessages, text))
			return Suspicious.Very;

		if (filterSwears) {
			if (testSafeInstant(general.suspiciousSafeInstantMessages, text) ||
				testWholeInstant(general.suspiciousSafeInstantWholeMessages, text)) {
				return Suspicious.Very;
			}

			if (testSafe(general.suspiciousSafeMessages, text) ||
				testWhole(general.suspiciousSafeWholeMessages, text)) {
				return Suspicious.Yes;
			}
		}

		return Suspicious.No;
	};
};

export const createIsSuspiciousName =
	(settings: GeneralSettings) => {
		const test = createCachedTest();
		return (name: string) => test(settings.suspiciousNames, name);
	};

export const createIsSuspiciousAuth =
	(settings: GeneralSettings) => {
		const test = createCachedTest();
		return ({ name, emails = [] }: AuthBase<any>) =>
			test(settings.suspiciousAuths, name) ||
			emails.some(email => test(settings.suspiciousAuths, email));
	};

// pony

function tryParseJSON(value: string): any {
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

function createMatchesFromList(list: string | undefined): Partial<PonyInfo>[] {
	return compact((list || '').split(/\n/g).map(x => x.trim()).map(tryParseJSON));
}

export const createIsSuspiciousPony =
	(settings: GeneralSettings) =>
		(info: PonyInfoNumber) => {
			const matches = createMatchesFromList(settings.suspiciousPonies);
			return matches.some(match => matchPony(info, match));
		};

function matchPony(info: PonyInfoNumber, match: Partial<PonyInfo>) {
	return isMatchWith(info, match, comparePonyInfoFields);
}

function comparePonyInfoFields(a: any, b: any): boolean {
	if (typeof a === 'number' && typeof b === 'string') {
		return a === parseColorFast(b);
	} else {
		return undefined as any;
	}
}

// forbidden messages

export function isForbiddenMessage(_message: string): boolean {
	// NOTE: uncomment, to filter offensive messages
	// if (/niggers$/.test(_message) || /faggots?/.test(_message)) return true;

	// NOTE: add more filters here

	return false;
}

// forbidden name

export function isForbiddenName(_value: string): boolean {
	// NOTE: uncomment, to filter offensive names
	// if (/niggers$/.test(_value) || /faggots?/.test(_value) || /hitler/.test(_value)) return true;

	// NOTE: uncomment, to filter links in names
	// if (ipRegex.test(_value) && !ipExceptionRegex.test(_value)) return true;
	// if (urlRegex.test(_value) && !urlExceptionRegex.test(_value)) return true;

	// NOTE: add more filters here

	return false;
}
