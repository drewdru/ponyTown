import * as moment from 'moment';
import { escape, escapeRegExp, startsWith, range, uniq, compact } from 'lodash';
import { fromNow, toInt, hasFlag, compareDates, removeItem, includes } from './utils';
import { DAY } from './constants';
import {
	Account, OriginInfo, Document, OriginRef, SupporterFlags, BannedMuted, AccountBase, LogEntry,
	DuplicateResult, DuplicateBase, Duplicate, Auth, MergeInfo
} from './adminInterfaces';
import { hasRole } from './accountUtils';
import { filterBadWordsPartial } from './swears';
import { faPlusCircle, faClock, faMinusCircle, faCaretSquareUp, faCaretSquareDown } from '../client/icons';
import { element, textNode } from '../client/htmlUtils';

interface UpdatedAt {
	updatedAt: Date;
}

export const compareUpdatedAt = (a: UpdatedAt, b: UpdatedAt) => compareDates(a.updatedAt, b.updatedAt);
export const compareOrigins = (a: OriginInfo, b: OriginInfo) => a.ip.localeCompare(b.ip);
export const compareOriginRefs = (a: OriginRef, b: OriginRef) =>
	compareDates(b.last, a.last) || compareOrigins(a.origin, b.origin);
export const compareByName = <T extends { name: string; }>(a: T, b: T) => (a.name || '').localeCompare(b.name || '');
export const getId = (item: Document) => item._id;
export const tagBad = (s: string) => `<span class='bad'>${s}</span>`;

export function compareAccounts(a: Account, b: Account) {
	return compareDates(a.createdAt, b.createdAt);
}

export function compareAuths(a: Auth, b: Auth) {
	const aDeleted = a.disabled || a.banned || false;
	const bDeleted = b.disabled || b.banned || false;

	if (aDeleted && !bDeleted) {
		return 1;
	} else if (!aDeleted && bDeleted) {
		return -1;
	} else {
		return compareByName(a, b);
	}
}

export function highlightWords(text?: string) {
	text = text || '';
	text = filterBadWordsPartial(text, tagBad);
	return text;
}

export function getAge(birthdate: Date) {
	return moment().diff(birthdate, 'years');
}

// chat & events

function enc(text?: string): string {
	return escape(text || '');
}

function encWithHighlight(text?: string): string {
	return highlightWords(enc(text || ''));
}

export function formatEventDesc(text: string): string {
	return encWithHighlight(text).replace(/\[([a-z0-f]{24})\]/g, `<a tabindex onclick="goToAccount('$1')">[$1]</a>`);
}

function getMessageTag(message: string) {
	if (/^\/p /.test(message)) {
		return 'party';
	} else if (/^\/w /.test(message)) {
		return 'whisper';
	} else if (/^\/s[s123] /.test(message)) {
		return 'supporter';
	} else if (/^\//.test(message)) {
		return 'command';
	} else {
		return 'none';
	}
}

export function replaceSwears(element: HTMLElement) {
	const text = element.textContent;

	if (text) {
		const replaced = encWithHighlight(text);

		if (text !== replaced) {
			element.innerHTML = replaced;
		}
	}
}

function formatChatLine(l: string): HTMLElement {
	// 00:00:01 [system] Timed out for swearing
	// 00:00:01 [patreon] fetched patreon data
	// 00:00:01 [dev][Autumn Leafs] hello world
	// 00:00:01 [dev][Autumn Leafs][muted] hello world
	// 00:00:01 [dev][Autumn Leafs][ignored] hello world
	// 00:00:01 [dev-pl][Autumn Leafs][ignored] hello world
	// 00:00:01 [57a3dc6f2f0019a161cdebf6][dev][Autumn Leafs][ignored] hello world
	// 00:00:01 [1][dev][Autumn Leafs][ignored] hello world
	// 00:00:01 [1:merged][dev][Autumn Leafs][ignored] hello world
	// 00:00:01 [merged][dev][Autumn Leafs][ignored] hello world
	// 00:00:01 [merged][dev][main][Autumn Leafs][ignored] hello world

	/* tslint:disable:max-line-length */
	const regex = /^([0-9:]+) (\[(?:merged|\d+|\d+:merged|[a-z0-9]{24})\])?\[([a-z0-9_-]+)\](?:\[([a-z0-9_-]+)\])?((?:\[.*?\])?)(?:\[(muted|ignored|ignorepub)\])?\t(.*)$/;
	const m = regex.exec(l);

	if (m) {
		const [, time, accountId, server, map, name, mutedIgnored, message] = m;
		const messageTag = server === 'system' ? 'system' : getMessageTag(message);
		const modTag = mutedIgnored ? ' message-muted' : '';

		return element('div', 'chatlog-line', [
			element('span', 'time', [], { 'data-text': time }),
			accountId ? element('span', 'account-id', [textNode(accountId)]) : undefined,
			element('span', `server server-${server.replace(/-.+$/g, '')}`, [textNode(`[${server}]`)]),
			map ? element('span', `map map-${map}`, [textNode(`[${map}]`)]) : undefined,
			element('span', mutedIgnored ? `name ${mutedIgnored}` : `name`, [textNode(name)]),
			textNode(' '),
			element('span', `message message-${messageTag}${modTag}`, [textNode(message)]),
			textNode(' '),
			element('a', 'chat-translate', [], undefined, { click: translateChat }),
		]);
	} else {
		return element('div', '', [textNode(highlightWords(l))]);
	}
}

function translateChat(this: HTMLElement) {
	const lines: string[] = [];
	let parent = this.parentElement;

	for (let i = 0; parent && i < 10; i++) {
		lines.push(parent.querySelector('.message')!.textContent!);
		parent = parent.nextElementSibling as HTMLElement;
	}

	window.open(`https://translate.google.com/#auto/en/${encodeURIComponent(lines.join('\n'))}`);
}

if (typeof window !== 'undefined') {
	(window as any).goToAccount = (accountId: string) => {
		window.dispatchEvent(new CustomEvent('go-to-account', { detail: accountId }));
	};
}

export function formatChat(chat: string): HTMLElement[] {
	return (chat || '<no messages>')
		.trim()
		.split(/\r?\n/g)
		.reverse()
		.map(formatChatLine);
}

export interface ChatDate {
	value: string;
	label: string;
}

export function createChatDate(date: moment.Moment): ChatDate {
	return {
		value: date.toISOString(),
		label: date.format('MMMM Do YYYY'),
	};
}

export function createDateRange(startDate: string | Date, days: number): ChatDate[] {
	return range(days, 0)
		.map(d => moment(startDate).subtract(d, 'days'))
		.map(createChatDate);
}

// filtering

export function filterAccounts(items: Account[], search: string, showOnly: string, not: boolean) {
	if (search) {
		items = items.filter(createFilter(search));
	}

	const filter = createFilter2(showOnly);

	if (filter) {
		if (not) {
			items = items.filter(i => !filter(i));
		} else {
			items = items.filter(filter);
		}
	}

	return items;
}

export function createFilter(search: string): (account: Account) => boolean {
	const regex = new RegExp(escapeRegExp(search), 'i');

	function test(value: string): boolean {
		return !!value && regex.test(value);
	}

	function testAuth(auth: Auth) {
		return test(auth.name) || auth.provider === search || auth.url === search;
	}

	function testMerge(merge: MergeInfo) {
		return merge.id === search;
	}

	function filter(account: Account): boolean {
		if (account._id === search)
			return true;
		if (test(account.name))
			return true;
		if (test(account.note))
			return true;
		if (account.roles && account.roles.some(test))
			return true;
		if (account.emails && account.emails.some(test))
			return true;
		if (account.auths && account.auths.some(testAuth))
			return true;
		if (account.merges && account.merges.some(testMerge))
			return true;

		return false;
	}

	function prefixWith(prefix: string, action: (phrase: string) => (account: Account) => boolean) {
		return startsWith(search, prefix) ? action(search.substr(prefix.length)) : undefined;
	}

	function prefixWithRegex(prefix: string, action: (regex: RegExp) => (account: Account) => boolean) {
		return prefixWith(prefix, phrase => action(new RegExp(escapeRegExp(phrase), 'i')));
	}

	function prefixWithNumber(prefix: string, action: (count: number) => (account: Account) => boolean) {
		return prefixWith(prefix, phrase => action(+phrase));
	}

	const exactMatch = (phrase: string) => (account: Account) => account.nameLower === phrase;
	const isOld = (max: number) => (account: Account) => !account.lastVisit || account.lastVisit.getTime() < max;

	return prefixWithRegex('name:', regex => account => regex.test(account.name))
		|| prefixWithRegex('note:', regex => account => regex.test(account.note))
		|| prefixWithRegex('email:', regex => account => !!account.emails && account.emails.some(e => regex.test(e)))
		|| prefixWith('role:', role => account => hasRole(account, role))
		|| prefixWith('exact:', phrase => exactMatch(phrase.toLowerCase()))
		|| prefixWith('disabled!', () => account => !!account.auths && account.auths.some(a => !!a.disabled))
		|| prefixWith('locked!', () => account => !!account.auths && account.auths.some(a => !!a.banned))
		|| prefixWithNumber('ignores:', count => account => (account.ignoresCount || 0) >= count)
		|| prefixWithNumber('ponies:', count => account => account.characterCount >= count)
		|| prefixWithNumber('auths:', count => account => !!account.auths && account.auths.length >= count)
		|| prefixWithNumber('old:', days => isOld(fromNow(-days * DAY).getTime()))
		|| prefixWithNumber('spam:', count => account => !!account.counters && account.counters.spam! >= count)
		|| prefixWithNumber('swearing:', count => account => !!account.counters && account.counters.swears! >= count)
		|| prefixWithNumber('timeouts:', count => account => !!account.counters && account.counters.timeouts! >= count)
		|| prefixWithNumber('limits:', count => account => !!account.counters && account.counters.inviteLimit! >= count)
		|| filter;
}

function hasAnyBan(account: Account) {
	return isBanned(account) || isMuted(account) || isShadowed(account);
}

export function createPotentialDuplicatesFilter(getAccountsByBrowserId: (id: string) => Account[] | undefined): (account: Account) => boolean {
	return i => {
		const name = i.nameLower;

		if (name === 'anonymous' || !i.lastBrowserId)
			return false;

		const accounts = getAccountsByBrowserId(i.lastBrowserId);

		if (accounts !== undefined && accounts.length > 1) {
			for (const a of accounts) {
				if (a !== i && a.nameLower === name) {
					return true;
				}
			}
		}

		return false;
	};
}

export function createFilter2(showOnly: string): ((account: Account) => boolean) | undefined {
	const now = Date.now();

	if (showOnly === 'banned') {
		return hasAnyBan;
	} else if (showOnly === 'timed out') {
		return i => !!((i.mute && i.mute > now) || (i.shadow && i.shadow > now) || (i.ban && i.ban > now));
	} else if (showOnly === 'with flags') {
		return i => !!i.flags;
	} else if (showOnly === 'notes') {
		return i => !!i.note;
	} else if (showOnly === 'supporters') {
		return i => !!(i.patreon || i.supporter || i.supporterDeclinedSince);
	} else {
		return undefined;
	}
}

export function getPotentialDuplicates(account: Account, getAccountsByBrowserId: (id: string) => Account[] | undefined) {
	const accounts = account.lastBrowserId ? getAccountsByBrowserId(account.lastBrowserId) : undefined;
	const name = account.nameLower;

	if (accounts !== undefined && accounts.length > 1 && name !== 'anonymous') {
		return accounts.filter(a => a !== account && a.nameLower === name);
	} else {
		return [];
	}
}

// duplicates

export function compareDuplicates(a: DuplicateBase, b: DuplicateBase): number {
	if (a.note !== b.note)
		return b.note - a.note;
	if (a.emails !== b.emails)
		return b.emails - a.emails;
	if (a.name !== b.name)
		return b.name - a.name;
	if (a.browserId !== b.browserId)
		return a.browserId ? -1 : 1;
	if (a.origins !== b.origins)
		return b.origins - a.origins;
	if (a.ponies !== b.ponies)
		return (b.ponies ? b.ponies.length : 0) - (a.ponies ? a.ponies.length : 0);
	return b.lastVisit.getTime() - a.lastVisit.getTime();
}

export function emailName(email: string): string {
	return email.substr(0, email.indexOf('@')).toLowerCase();
}

export function createEmailMatcher(emails: string[]): ((email: string) => boolean) | undefined {
	if (!emails || !emails.length) {
		return undefined;
	} else {
		const match = emails.map(emailName).map(escapeRegExp).join('|');
		const regex = new RegExp(`^(?:${match})@`, 'i');
		return email => regex.test(email);
	}
}

export function createDuplicate(account: Account, base: Account): Duplicate {
	const indenticalEmail = account.emails && base.emails && account.emails.some(e => base.emails!.indexOf(e) !== -1);

	const isMatch = createEmailMatcher(base.emails || []);
	const duplicateEmails = isMatch && account.emails
		&& account.emails.reduce((sum, e) => sum + (isMatch(e) ? 1 : 0), 0);

	const duplicateOrigins = base.originsRefs && account.originsRefs
		&& account.originsRefs.reduce((sum, o) => sum + (base.originsRefs!.some(r => o.origin.ip === r.origin.ip) ? 1 : 0), 0);

	const name = account.nameLower !== 'anonymous' && account.nameLower === base.nameLower;

	const note = (account.note && account.note.indexOf(base._id) !== -1)
		|| (base.note && base.note.indexOf(account._id) !== -1);

	const browserId = !!account.lastBrowserId && account.lastBrowserId === base.lastBrowserId;
	const birthdate = !!(base.birthdate && account.birthdate && base.birthdate.getTime() === account.birthdate.getTime());

	return {
		account,
		name: name ? 1 : 0,
		note: note ? 1 : 0,
		indenticalEmail: !!indenticalEmail,
		emails: toInt(duplicateEmails),
		origins: toInt(duplicateOrigins),
		lastVisit: account.lastVisit || new Date(0),
		browserId,
		birthdate,
		perma: isPermaBanned(account) || isPermaShadowed(account),
	};
}

export function createDuplicateResult(account: Account, base: Account): DuplicateResult {
	return { ...createDuplicate(account, base), account: account._id };
}

export function pushOrdered<T>(items: T[], item: T, compare: (a: T, b: T) => number) {
	for (let i = 0; i < items.length; i++) {
		if (compare(items[i], item) >= 0) {
			items.splice(i, 0, item);
			return;
		}
	}

	items.push(item);
}

export function duplicatesCollector(duplicates: string[]) {
	const set = new Set();

	return (item: string) => {
		if (set.has(item)) {
			duplicates.push(item);
		} else {
			set.add(item);
		}
	};
}

export function patreonSupporterLevel(account: AccountBase<any>) {
	return account.patreon! & 0xf;
}

export function supporterLevel(account: AccountBase<any>) {
	const flags = account.supporter!;
	const ignore = hasFlag(flags, SupporterFlags.IgnorePatreon);
	const patreonSupporter = patreonSupporterLevel(account);
	const flagsSupporter = flags & 0xf;
	return Math.max(ignore ? 0 : patreonSupporter, flagsSupporter);
}

export function isPastSupporter(account: AccountBase<any>) {
	const flags = account.supporter!;
	return (hasFlag(flags, SupporterFlags.PastSupporter) || hasFlag(flags, SupporterFlags.ForcePastSupporter)) &&
		!hasFlag(flags, SupporterFlags.IgnorePastSupporter);
}

const fieldToAction: { [key: string]: string | undefined; } = {
	mute: 'Muted',
	shadow: 'Shadowed',
	ban: 'Banned',
};

export function banMessage(field: string, value: number) {
	const action = fieldToAction[field] || 'Did';

	if (value === 0) {
		return `Un${action.toLowerCase()}`;
	} else if (value === -1) {
		return action;
	} else {
		return `${action} for (${moment.duration(value - Date.now()).humanize()})`;
	}
}

export function isActive(value: number | undefined): boolean {
	return !!value && (value === -1 || value > Date.now());
}

export function isPerma(value: number | undefined): boolean {
	return value === -1;
}

export function isTemporarilyActive(value: number | undefined): boolean {
	return !!value && value > Date.now();
}

export function isMuted(account: BannedMuted): boolean {
	return isActive(account.mute);
}

export function isShadowed(account: BannedMuted): boolean {
	return isActive(account.shadow);
}

export function isBanned(account: BannedMuted): boolean {
	return isActive(account.ban);
}

export function isPermaShadowed(account: BannedMuted): boolean {
	return isPerma(account.shadow);
}

export function isPermaBanned(account: BannedMuted): boolean {
	return isPerma(account.ban);
}

export function isTemporarilyBanned(account: BannedMuted): boolean {
	return isTemporarilyActive(account.ban);
}

export interface SupporterChange {
	message: string;
	date: Date;
	icon: any;
	class: string;
}

export function createSupporterChanges(entries: LogEntry[]): SupporterChange[] {
	const changes = entries.map(l => ({
		message: l.message,
		level: +((/\d+/.exec(l.message) || ['0'])[0]),
		added: /added/i.test(l.message),
		date: new Date(l.date),
		icon: /added/i.test(l.message) ? faPlusCircle : (/decline/i.test(l.message) ? faClock : faMinusCircle),
		class: /added/i.test(l.message) ? 'text-success' : (/decline/i.test(l.message) ? 'text-warning' : 'text-danger'),
	}));

	for (let i = 1; i < changes.length; i++) {
		const prev = changes[i - 1];
		const current = changes[i];

		if (current.date.getMonth() !== prev.date.getMonth()) {
			current.class += ' border-left border-success pl-2';
		}

		if (current.added && prev.added) {
			if (current.level > prev.level) {
				current.icon = faCaretSquareUp;
				current.class = 'text-info';
			} else if (current.level < prev.level) {
				current.icon = faCaretSquareDown;
				current.class = 'text-info';
			}
		}
	}

	return changes;
}

export function getIdsFromNote(note: string | undefined) {
	return note ? uniq(note.match(/[0-9a-f]{24}/g)) : [];
}

export function addToMap<T>(map: Map<string, T[]>, key: string, item: T) {
	const items = map.get(key);

	if (items) {
		items.push(item);
	} else {
		map.set(key, [item]);
	}
}

export function removeFromMap<T>(map: Map<string, T[]>, key: string, item: T) {
	const items = map.get(key);

	if (items) {
		removeItem(items, item);

		if (items.length === 0) {
			map.delete(key);
		}
	}
}

export function parsePonies(ponies: string, filterIds?: string[]) {
	return compact(ponies
		.split(/\n\r?/g)
		.map(x => /\[system\] removed pony \[([a-f0-9]{24})\] "(.+)" (\S+)/.exec(x)))
		.map(([_, id, name, info]) => ({ id, name, info }))
		.filter(({ id }) => !filterIds || includes(filterIds, id));
}

export function createIdStore() {
	const idsMap = new Map<string, string>();

	return (id: string) => {
		const result = idsMap.get(id);

		if (result) {
			return result;
		} else {
			idsMap.set(id, id);
			return id;
		}
	};
}

export function getTranslationUrl(text: string) {
	return `https://translate.google.com/#view=home&op=translate&sl=auto&tl=en&text=${encodeURIComponent(text)}`;
	// return `https://translate.google.com/#auto/en/${encodeURIComponent(text)}`;
}
