"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const constants_1 = require("../common/constants");
const stringUtils_1 = require("../common/stringUtils");
const data_1 = require("./data");
const rxjs_1 = require("../../../node_modules/rxjs");
const positionUtils_1 = require("../common/positionUtils");
const utils_1 = require("../common/utils");
exports.matchCyrillic = /[\u0400-\u04FF]/g;
exports.containsCyrillic = stringUtils_1.matcher(exports.matchCyrillic);
const otherValid = [
    '♂♀⚲⚥⚧☿♁⚨⚩⚦⚢⚣⚤',
    '™®♥♦♣♠❥♡♢♤♧ღஐ·´°•◦✿❀◆◇◈◉◊｡¥€«»，：■□—',
    '〈〉「」『』【】《》♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼№●○◌★☆✰✦✧▪▫･',
    '\u1160\u3000\u3164',
].join('').split('').reduce((set, c) => (set.add(c.charCodeAt(0)), set), new Set());
function isValid(c) {
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
exports.isValid = isValid;
function isValid2(c) {
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
        || (c >= 0x2010 && c <= 0x2027) || (c >= 0x2030 && c <= 0x205e) // General Punctuation
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
exports.isValid2 = isValid2;
function isInvalid(c) {
    return c === 0x1f595 // middle finger emoji
        || c === 0x00ad // soft hyphen
    ;
}
function isValidForName(c) {
    return isValid(c) && !isInvalid(c);
}
function isValidForMessage(c) {
    return (isValid(c) || isValid2(c)) && !isInvalid(c);
}
exports.matchRomaji = /[\uff01-\uff5e]/g;
const matchOtherWhitespace = /[\u1160\u2800\u3000\u3164\uffa0]+/g;
function replaceRomaji(match) {
    return String.fromCharCode(match.charCodeAt(0) - 0xfee0);
}
exports.replaceRomaji = replaceRomaji;
function cleanName(name) {
    return filterString(name, isValidForName)
        .replace(matchOtherWhitespace, ' ') // whitespace characters
        .replace(/\s+/g, ' ')
        .replace(exports.matchRomaji, replaceRomaji)
        .trim();
}
exports.cleanName = cleanName;
function cleanMessage(text) {
    return filterString(text, isValidForMessage)
        .replace(matchOtherWhitespace, ' ') // whitespace characters
        .replace(/[\r\n]/g, '')
        .replace(exports.matchRomaji, replaceRomaji)
        .trim()
        .substr(0, constants_1.SAY_MAX_LENGTH);
}
exports.cleanMessage = cleanMessage;
function filterString(value, filter) {
    value = value || '';
    for (let i = 0; i < value.length; i++) {
        let code = value.charCodeAt(i);
        let size = 1;
        let invalidSurrogate = false;
        if (stringUtils_1.isSurrogate(code) && (i + 1) < value.length) {
            const extra = value.charCodeAt(i + 1);
            if (stringUtils_1.isLowSurrogate(extra)) {
                code = stringUtils_1.fromSurrogate(code, extra);
                i++;
                size++;
            }
            else {
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
exports.filterString = filterString;
function validatePonyName(name) {
    return !!name && !!name.length && name.length <= constants_1.PLAYER_NAME_MAX_LENGTH && !/^[.,_-]+$/.test(name);
}
exports.validatePonyName = validatePonyName;
function toSocialSiteInfo({ id, name, url, provider }) {
    const oauth = data_1.oauthProviders.find(p => p.id === provider);
    return {
        id,
        name,
        url,
        icon: oauth && oauth.id,
        color: oauth && oauth.color,
    };
}
exports.toSocialSiteInfo = toSocialSiteInfo;
function isMultipleMatch(message, last) {
    const minMessageLength = 4;
    if (message.length >= minMessageLength && last.length >= minMessageLength) {
        let current = last;
        while (current.length < message.length) {
            current += last;
        }
        return message === current.substr(0, constants_1.SAY_MAX_LENGTH);
    }
    else {
        return false;
    }
}
function checkTrailing(message, last) {
    return message.indexOf(last) === 0 && (message.length - last.length) < 3;
}
function isTrailingMatch(message, last) {
    const minMessageLength = 5;
    if (message.length > last.length && last.length > minMessageLength) {
        return checkTrailing(message, last);
    }
    else if (message.length < last.length && message.length > minMessageLength) {
        return checkTrailing(last, message);
    }
    else {
        return false;
    }
}
function isSpamMessage(message, lastMessages) {
    if (!/^\//.test(message) && lastMessages.length) {
        return lastMessages.some(last => message === last || isMultipleMatch(message, last) || isTrailingMatch(message, last));
    }
    else {
        return false;
    }
}
exports.isSpamMessage = isSpamMessage;
function getSaysTime(message) {
    return constants_1.SAYS_TIME_MIN + lodash_1.clamp(message.length / constants_1.SAY_MAX_LENGTH, 0, 1) * (constants_1.SAYS_TIME_MAX - constants_1.SAYS_TIME_MIN);
}
exports.getSaysTime = getSaysTime;
function createExpression(right, left, muzzle, rightIris = 0 /* Forward */, leftIris = 0 /* Forward */, extra = 0 /* None */) {
    return { right, left, muzzle, rightIris, leftIris, extra };
}
exports.createExpression = createExpression;
exports.isAndroidBrowser = (() => {
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
exports.isBrowserOutdated = (() => {
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
    if (exports.isAndroidBrowser) {
        return true;
    }
    if (!supportsLetAndConst()) {
        return true;
    }
    return false;
})();
function getLocale() {
    return (navigator.languages ? navigator.languages[0] : navigator.language) || 'en-US';
}
exports.getLocale = getLocale;
/* istanbul ignore next */
function isLanguage(lang) {
    const languages = navigator.languages || [navigator.language];
    return languages.some(l => l === lang);
}
exports.isLanguage = isLanguage;
/* istanbul ignore next */
function sortServersForRussian(a, b) {
    if (a.flag === 'ru' && a.flag !== b.flag) {
        return -1;
    }
    if (b.flag === 'ru' && a.flag !== b.flag) {
        return 1;
    }
    return a.id.localeCompare(b.id);
}
exports.sortServersForRussian = sortServersForRussian;
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target && e.target.result || '');
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
exports.readFileAsText = readFileAsText;
/* istanbul ignore next */
function isFileSaverSupported() {
    try {
        return !!new Blob;
    }
    catch (_a) {
        return false;
    }
}
exports.isFileSaverSupported = isFileSaverSupported;
exports.isInIncognitoMode = false;
function setIsIncognitoMode(value) {
    exports.isInIncognitoMode = value;
}
exports.setIsIncognitoMode = setIsIncognitoMode;
/* istanbul ignore next */
function checkIncognitoMode(wnd) {
    if (!wnd || !wnd.chrome)
        return;
    const fs = wnd.RequestFileSystem || wnd.webkitRequestFileSystem;
    if (!fs)
        return;
    fs(wnd.TEMPORARY, 100, () => { }, () => exports.isInIncognitoMode = true);
}
let focused = true;
/* istanbul ignore next */
function isFocused() {
    return focused;
}
exports.isFocused = isFocused;
/* istanbul ignore next */
if (typeof window !== 'undefined') {
    checkIncognitoMode(window);
    window.addEventListener('focus', () => focused = true);
    window.addEventListener('blur', () => focused = false);
}
/* istanbul ignore next */
function isStandalone() {
    return !!window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true; // safari
}
exports.isStandalone = isStandalone;
/* istanbul ignore next */
function supportsLetAndConst() {
    try {
        return (new Function('let x = true; return x;'))();
    }
    catch (_a) {
        return false;
    }
}
exports.supportsLetAndConst = supportsLetAndConst;
/* istanbul ignore next */
function registerServiceWorker(url, onUpdate) {
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
    }
    catch (e) {
        console.error(e);
    }
}
exports.registerServiceWorker = registerServiceWorker;
/* istanbul ignore next */
function unregisterServiceWorker() {
    if ('serviceWorker' in navigator && typeof navigator.serviceWorker.getRegistrations === 'function') {
        return navigator.serviceWorker.getRegistrations()
            .then(registrations => {
            for (const registration of registrations) {
                registration.unregister();
            }
        });
    }
    else {
        return Promise.resolve();
    }
}
exports.unregisterServiceWorker = unregisterServiceWorker;
/* istanbul ignore next */
function attachDebugMethod(name, method) {
    if (typeof window !== 'undefined') {
        window[name] = method;
    }
}
exports.attachDebugMethod = attachDebugMethod;
/* istanbul ignore next */
function updateRangeIndicator(range, { player, scale, camera }) {
    const e = document.getElementById('range-indicator');
    if (player && !constants_1.isChatlogRangeUnlimited(range)) {
        const x = (positionUtils_1.toScreenX(player.x) - camera.x) * scale;
        const y = (positionUtils_1.toScreenY(player.y) - camera.actualY) * scale;
        const w = positionUtils_1.toScreenX(range) * scale * 2;
        const h = positionUtils_1.toScreenY(range) * scale * 2;
        e.style.width = `${w}px`;
        e.style.height = `${h}px`;
        e.style.left = `${-w / 2}px`;
        e.style.top = `${-h / 2}px`;
        e.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        e.style.display = 'block';
    }
    else {
        e.style.display = 'none';
    }
}
exports.updateRangeIndicator = updateRangeIndicator;
/* istanbul ignore next */
function checkIframeKey(iframeId, expectedKey) {
    try {
        const iframe = document.getElementById(iframeId);
        const doc = iframe && iframe.contentWindow && iframe.contentWindow.document;
        const key = doc && doc.body && doc.body.getAttribute('data-key');
        return key === expectedKey;
    }
    catch (e) {
        if (DEVELOPMENT) {
            console.error(e);
        }
        return false;
    }
}
exports.checkIframeKey = checkIframeKey;
let flags = {};
exports.featureFlagsChanged = new rxjs_1.Subject();
function initFeatureFlags(newFlags) {
    flags = newFlags;
    exports.featureFlagsChanged.next(newFlags);
}
exports.initFeatureFlags = initFeatureFlags;
function hasFeatureFlag(flag) {
    return !!flags[flag];
}
exports.hasFeatureFlag = hasFeatureFlag;
function hardReload() {
    unregisterServiceWorker()
        .then(() => location.reload(true));
}
exports.hardReload = hardReload;
const LOGGING = false;
let logger = (_) => { };
function initLogger(newLogger) {
    if (LOGGING) {
        logger = newLogger;
    }
}
exports.initLogger = initLogger;
function log(message) {
    if (LOGGING) {
        logger(message);
    }
}
exports.log = log;
function isSupporterOrPastSupporter(account) {
    return !!account && (!!account.supporter || utils_1.hasFlag(account.flags, 4 /* PastSupporter */));
}
exports.isSupporterOrPastSupporter = isSupporterOrPastSupporter;
function supporterTitle(account) {
    if (account && account.supporter) {
        return `Supporter Tier ${account.supporter}`;
    }
    else if (account && utils_1.hasFlag(account.flags, 4 /* PastSupporter */)) {
        return 'Past supporter';
    }
    else {
        return '';
    }
}
exports.supporterTitle = supporterTitle;
function supporterClass(account) {
    if (account && account.supporter) {
        return `supporter-${account.supporter}`;
    }
    else if (account && utils_1.hasFlag(account.flags, 4 /* PastSupporter */)) {
        return 'supporter-past';
    }
    else {
        return 'd-none';
    }
}
exports.supporterClass = supporterClass;
function supporterRewards(account) {
    if (account && account.supporter) {
        return constants_1.SUPPORTER_REWARDS[account.supporter];
    }
    else if (account && utils_1.hasFlag(account.flags, 4 /* PastSupporter */)) {
        return constants_1.PAST_SUPPORTER_REWARDS;
    }
    else {
        return constants_1.SUPPORTER_REWARDS[0];
    }
}
exports.supporterRewards = supporterRewards;
//# sourceMappingURL=clientUtils.js.map