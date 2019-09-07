"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const lodash_1 = require("lodash");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const accountUtils_1 = require("./accountUtils");
const swears_1 = require("./swears");
const icons_1 = require("../client/icons");
const htmlUtils_1 = require("../client/htmlUtils");
exports.compareUpdatedAt = (a, b) => utils_1.compareDates(a.updatedAt, b.updatedAt);
exports.compareOrigins = (a, b) => a.ip.localeCompare(b.ip);
exports.compareOriginRefs = (a, b) => utils_1.compareDates(b.last, a.last) || exports.compareOrigins(a.origin, b.origin);
exports.compareByName = (a, b) => (a.name || '').localeCompare(b.name || '');
exports.getId = (item) => item._id;
exports.tagBad = (s) => `<span class='bad'>${s}</span>`;
function compareAccounts(a, b) {
    return utils_1.compareDates(a.createdAt, b.createdAt);
}
exports.compareAccounts = compareAccounts;
function compareAuths(a, b) {
    const aDeleted = a.disabled || a.banned || false;
    const bDeleted = b.disabled || b.banned || false;
    if (aDeleted && !bDeleted) {
        return 1;
    }
    else if (!aDeleted && bDeleted) {
        return -1;
    }
    else {
        return exports.compareByName(a, b);
    }
}
exports.compareAuths = compareAuths;
function highlightWords(text) {
    text = text || '';
    text = swears_1.filterBadWordsPartial(text, exports.tagBad);
    return text;
}
exports.highlightWords = highlightWords;
function getAge(birthdate) {
    return moment().diff(birthdate, 'years');
}
exports.getAge = getAge;
// chat & events
function enc(text) {
    return lodash_1.escape(text || '');
}
function encWithHighlight(text) {
    return highlightWords(enc(text || ''));
}
function formatEventDesc(text) {
    return encWithHighlight(text).replace(/\[([a-z0-f]{24})\]/g, `<a tabindex onclick="goToAccount('$1')">[$1]</a>`);
}
exports.formatEventDesc = formatEventDesc;
function getMessageTag(message) {
    if (/^\/p /.test(message)) {
        return 'party';
    }
    else if (/^\/w /.test(message)) {
        return 'whisper';
    }
    else if (/^\/s[s123] /.test(message)) {
        return 'supporter';
    }
    else if (/^\//.test(message)) {
        return 'command';
    }
    else {
        return 'none';
    }
}
function replaceSwears(element) {
    const text = element.textContent;
    if (text) {
        const replaced = encWithHighlight(text);
        if (text !== replaced) {
            element.innerHTML = replaced;
        }
    }
}
exports.replaceSwears = replaceSwears;
function formatChatLine(l) {
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
        return htmlUtils_1.element('div', 'chatlog-line', [
            htmlUtils_1.element('span', 'time', [], { 'data-text': time }),
            accountId ? htmlUtils_1.element('span', 'account-id', [htmlUtils_1.textNode(accountId)]) : undefined,
            htmlUtils_1.element('span', `server server-${server.replace(/-.+$/g, '')}`, [htmlUtils_1.textNode(`[${server}]`)]),
            map ? htmlUtils_1.element('span', `map map-${map}`, [htmlUtils_1.textNode(`[${map}]`)]) : undefined,
            htmlUtils_1.element('span', mutedIgnored ? `name ${mutedIgnored}` : `name`, [htmlUtils_1.textNode(name)]),
            htmlUtils_1.textNode(' '),
            htmlUtils_1.element('span', `message message-${messageTag}${modTag}`, [htmlUtils_1.textNode(message)]),
            htmlUtils_1.textNode(' '),
            htmlUtils_1.element('a', 'chat-translate', [], undefined, { click: translateChat }),
        ]);
    }
    else {
        return htmlUtils_1.element('div', '', [htmlUtils_1.textNode(highlightWords(l))]);
    }
}
function translateChat() {
    const lines = [];
    let parent = this.parentElement;
    for (let i = 0; parent && i < 10; i++) {
        lines.push(parent.querySelector('.message').textContent);
        parent = parent.nextElementSibling;
    }
    window.open(`https://translate.google.com/#auto/en/${encodeURIComponent(lines.join('\n'))}`);
}
if (typeof window !== 'undefined') {
    window.goToAccount = (accountId) => {
        window.dispatchEvent(new CustomEvent('go-to-account', { detail: accountId }));
    };
}
function formatChat(chat) {
    return (chat || '<no messages>')
        .trim()
        .split(/\r?\n/g)
        .reverse()
        .map(formatChatLine);
}
exports.formatChat = formatChat;
function createChatDate(date) {
    return {
        value: date.toISOString(),
        label: date.format('MMMM Do YYYY'),
    };
}
exports.createChatDate = createChatDate;
function createDateRange(startDate, days) {
    return lodash_1.range(days, 0)
        .map(d => moment(startDate).subtract(d, 'days'))
        .map(createChatDate);
}
exports.createDateRange = createDateRange;
// filtering
function filterAccounts(items, search, showOnly, not) {
    if (search) {
        items = items.filter(createFilter(search));
    }
    const filter = createFilter2(showOnly);
    if (filter) {
        if (not) {
            items = items.filter(i => !filter(i));
        }
        else {
            items = items.filter(filter);
        }
    }
    return items;
}
exports.filterAccounts = filterAccounts;
function createFilter(search) {
    const regex = new RegExp(lodash_1.escapeRegExp(search), 'i');
    function test(value) {
        return !!value && regex.test(value);
    }
    function testAuth(auth) {
        return test(auth.name) || auth.provider === search || auth.url === search;
    }
    function testMerge(merge) {
        return merge.id === search;
    }
    function filter(account) {
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
    function prefixWith(prefix, action) {
        return lodash_1.startsWith(search, prefix) ? action(search.substr(prefix.length)) : undefined;
    }
    function prefixWithRegex(prefix, action) {
        return prefixWith(prefix, phrase => action(new RegExp(lodash_1.escapeRegExp(phrase), 'i')));
    }
    function prefixWithNumber(prefix, action) {
        return prefixWith(prefix, phrase => action(+phrase));
    }
    const exactMatch = (phrase) => (account) => account.nameLower === phrase;
    const isOld = (max) => (account) => !account.lastVisit || account.lastVisit.getTime() < max;
    return prefixWithRegex('name:', regex => account => regex.test(account.name))
        || prefixWithRegex('note:', regex => account => regex.test(account.note))
        || prefixWithRegex('email:', regex => account => !!account.emails && account.emails.some(e => regex.test(e)))
        || prefixWith('role:', role => account => accountUtils_1.hasRole(account, role))
        || prefixWith('exact:', phrase => exactMatch(phrase.toLowerCase()))
        || prefixWith('disabled!', () => account => !!account.auths && account.auths.some(a => !!a.disabled))
        || prefixWith('locked!', () => account => !!account.auths && account.auths.some(a => !!a.banned))
        || prefixWithNumber('ignores:', count => account => (account.ignoresCount || 0) >= count)
        || prefixWithNumber('ponies:', count => account => account.characterCount >= count)
        || prefixWithNumber('auths:', count => account => !!account.auths && account.auths.length >= count)
        || prefixWithNumber('old:', days => isOld(utils_1.fromNow(-days * constants_1.DAY).getTime()))
        || prefixWithNumber('spam:', count => account => !!account.counters && account.counters.spam >= count)
        || prefixWithNumber('swearing:', count => account => !!account.counters && account.counters.swears >= count)
        || prefixWithNumber('timeouts:', count => account => !!account.counters && account.counters.timeouts >= count)
        || prefixWithNumber('limits:', count => account => !!account.counters && account.counters.inviteLimit >= count)
        || filter;
}
exports.createFilter = createFilter;
function hasAnyBan(account) {
    return isBanned(account) || isMuted(account) || isShadowed(account);
}
function createPotentialDuplicatesFilter(getAccountsByBrowserId) {
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
exports.createPotentialDuplicatesFilter = createPotentialDuplicatesFilter;
function createFilter2(showOnly) {
    const now = Date.now();
    if (showOnly === 'banned') {
        return hasAnyBan;
    }
    else if (showOnly === 'timed out') {
        return i => !!((i.mute && i.mute > now) || (i.shadow && i.shadow > now) || (i.ban && i.ban > now));
    }
    else if (showOnly === 'with flags') {
        return i => !!i.flags;
    }
    else if (showOnly === 'notes') {
        return i => !!i.note;
    }
    else if (showOnly === 'supporters') {
        return i => !!(i.patreon || i.supporter || i.supporterDeclinedSince);
    }
    else {
        return undefined;
    }
}
exports.createFilter2 = createFilter2;
function getPotentialDuplicates(account, getAccountsByBrowserId) {
    const accounts = account.lastBrowserId ? getAccountsByBrowserId(account.lastBrowserId) : undefined;
    const name = account.nameLower;
    if (accounts !== undefined && accounts.length > 1 && name !== 'anonymous') {
        return accounts.filter(a => a !== account && a.nameLower === name);
    }
    else {
        return [];
    }
}
exports.getPotentialDuplicates = getPotentialDuplicates;
// duplicates
function compareDuplicates(a, b) {
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
exports.compareDuplicates = compareDuplicates;
function emailName(email) {
    return email.substr(0, email.indexOf('@')).toLowerCase();
}
exports.emailName = emailName;
function createEmailMatcher(emails) {
    if (!emails || !emails.length) {
        return undefined;
    }
    else {
        const match = emails.map(emailName).map(lodash_1.escapeRegExp).join('|');
        const regex = new RegExp(`^(?:${match})@`, 'i');
        return email => regex.test(email);
    }
}
exports.createEmailMatcher = createEmailMatcher;
function createDuplicate(account, base) {
    const indenticalEmail = account.emails && base.emails && account.emails.some(e => base.emails.indexOf(e) !== -1);
    const isMatch = createEmailMatcher(base.emails || []);
    const duplicateEmails = isMatch && account.emails
        && account.emails.reduce((sum, e) => sum + (isMatch(e) ? 1 : 0), 0);
    const duplicateOrigins = base.originsRefs && account.originsRefs
        && account.originsRefs.reduce((sum, o) => sum + (base.originsRefs.some(r => o.origin.ip === r.origin.ip) ? 1 : 0), 0);
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
        emails: utils_1.toInt(duplicateEmails),
        origins: utils_1.toInt(duplicateOrigins),
        lastVisit: account.lastVisit || new Date(0),
        browserId,
        birthdate,
        perma: isPermaBanned(account) || isPermaShadowed(account),
    };
}
exports.createDuplicate = createDuplicate;
function createDuplicateResult(account, base) {
    return Object.assign({}, createDuplicate(account, base), { account: account._id });
}
exports.createDuplicateResult = createDuplicateResult;
function pushOrdered(items, item, compare) {
    for (let i = 0; i < items.length; i++) {
        if (compare(items[i], item) >= 0) {
            items.splice(i, 0, item);
            return;
        }
    }
    items.push(item);
}
exports.pushOrdered = pushOrdered;
function duplicatesCollector(duplicates) {
    const set = new Set();
    return (item) => {
        if (set.has(item)) {
            duplicates.push(item);
        }
        else {
            set.add(item);
        }
    };
}
exports.duplicatesCollector = duplicatesCollector;
function patreonSupporterLevel(account) {
    return account.patreon & 0xf;
}
exports.patreonSupporterLevel = patreonSupporterLevel;
function supporterLevel(account) {
    const flags = account.supporter;
    const ignore = utils_1.hasFlag(flags, 128 /* IgnorePatreon */);
    const patreonSupporter = patreonSupporterLevel(account);
    const flagsSupporter = flags & 0xf;
    return Math.max(ignore ? 0 : patreonSupporter, flagsSupporter);
}
exports.supporterLevel = supporterLevel;
function isPastSupporter(account) {
    const flags = account.supporter;
    return (utils_1.hasFlag(flags, 256 /* PastSupporter */) || utils_1.hasFlag(flags, 512 /* ForcePastSupporter */)) &&
        !utils_1.hasFlag(flags, 1024 /* IgnorePastSupporter */);
}
exports.isPastSupporter = isPastSupporter;
const fieldToAction = {
    mute: 'Muted',
    shadow: 'Shadowed',
    ban: 'Banned',
};
function banMessage(field, value) {
    const action = fieldToAction[field] || 'Did';
    if (value === 0) {
        return `Un${action.toLowerCase()}`;
    }
    else if (value === -1) {
        return action;
    }
    else {
        return `${action} for (${moment.duration(value - Date.now()).humanize()})`;
    }
}
exports.banMessage = banMessage;
function isActive(value) {
    return !!value && (value === -1 || value > Date.now());
}
exports.isActive = isActive;
function isPerma(value) {
    return value === -1;
}
exports.isPerma = isPerma;
function isTemporarilyActive(value) {
    return !!value && value > Date.now();
}
exports.isTemporarilyActive = isTemporarilyActive;
function isMuted(account) {
    return isActive(account.mute);
}
exports.isMuted = isMuted;
function isShadowed(account) {
    return isActive(account.shadow);
}
exports.isShadowed = isShadowed;
function isBanned(account) {
    return isActive(account.ban);
}
exports.isBanned = isBanned;
function isPermaShadowed(account) {
    return isPerma(account.shadow);
}
exports.isPermaShadowed = isPermaShadowed;
function isPermaBanned(account) {
    return isPerma(account.ban);
}
exports.isPermaBanned = isPermaBanned;
function isTemporarilyBanned(account) {
    return isTemporarilyActive(account.ban);
}
exports.isTemporarilyBanned = isTemporarilyBanned;
function createSupporterChanges(entries) {
    const changes = entries.map(l => ({
        message: l.message,
        level: +((/\d+/.exec(l.message) || ['0'])[0]),
        added: /added/i.test(l.message),
        date: new Date(l.date),
        icon: /added/i.test(l.message) ? icons_1.faPlusCircle : (/decline/i.test(l.message) ? icons_1.faClock : icons_1.faMinusCircle),
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
                current.icon = icons_1.faCaretSquareUp;
                current.class = 'text-info';
            }
            else if (current.level < prev.level) {
                current.icon = icons_1.faCaretSquareDown;
                current.class = 'text-info';
            }
        }
    }
    return changes;
}
exports.createSupporterChanges = createSupporterChanges;
function getIdsFromNote(note) {
    return note ? lodash_1.uniq(note.match(/[0-9a-f]{24}/g)) : [];
}
exports.getIdsFromNote = getIdsFromNote;
function addToMap(map, key, item) {
    const items = map.get(key);
    if (items) {
        items.push(item);
    }
    else {
        map.set(key, [item]);
    }
}
exports.addToMap = addToMap;
function removeFromMap(map, key, item) {
    const items = map.get(key);
    if (items) {
        utils_1.removeItem(items, item);
        if (items.length === 0) {
            map.delete(key);
        }
    }
}
exports.removeFromMap = removeFromMap;
function parsePonies(ponies, filterIds) {
    return lodash_1.compact(ponies
        .split(/\n\r?/g)
        .map(x => /\[system\] removed pony \[([a-f0-9]{24})\] "(.+)" (\S+)/.exec(x)))
        .map(([_, id, name, info]) => ({ id, name, info }))
        .filter(({ id }) => !filterIds || utils_1.includes(filterIds, id));
}
exports.parsePonies = parsePonies;
function createIdStore() {
    const idsMap = new Map();
    return (id) => {
        const result = idsMap.get(id);
        if (result) {
            return result;
        }
        else {
            idsMap.set(id, id);
            return id;
        }
    };
}
exports.createIdStore = createIdStore;
function getTranslationUrl(text) {
    return `https://translate.google.com/#view=home&op=translate&sl=auto&tl=en&text=${encodeURIComponent(text)}`;
    // return `https://translate.google.com/#auto/en/${encodeURIComponent(text)}`;
}
exports.getTranslationUrl = getTranslationUrl;
//# sourceMappingURL=adminUtils.js.map