"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const filterUtils_1 = require("./filterUtils");
const color_1 = require("./color");
// suspicious
exports.urlRegex = new RegExp(filterUtils_1.urlRegexTexts.join('|'), 'ui');
exports.ipRegex = new RegExp(filterUtils_1.ipRegexText, 'ui');
function createRegExpFromList(list, wholeWords = false) {
    const lines = list && lodash_1.compact(list.split(/\r?\n/).map(x => x.trim()));
    if (lines && lines.length) {
        const combined = lines.map(lodash_1.escapeRegExp).join('|');
        if (wholeWords) {
            return new RegExp(`\\b(${combined})\\b`, 'ui');
        }
        else {
            return new RegExp(combined, 'ui');
        }
    }
    else {
        return undefined;
    }
}
exports.createCachedTest = (wholeWords = false) => {
    let cachedList = undefined;
    let cachedRegex = undefined;
    return (list, value) => {
        if (cachedList !== list) {
            cachedList = list;
            cachedRegex = createRegExpFromList(list, wholeWords);
        }
        return cachedRegex ? cachedRegex.test(value) : false;
    };
};
exports.createIsSuspiciousMessage = (general) => {
    const test = exports.createCachedTest();
    const testSafe = exports.createCachedTest();
    const testWhole = exports.createCachedTest(true);
    const testSafeInstant = exports.createCachedTest();
    const testWholeInstant = exports.createCachedTest(true);
    return (text, { filterSwears }) => {
        if (test(general.suspiciousMessages, text))
            return 2 /* Very */;
        if (filterSwears) {
            if (testSafeInstant(general.suspiciousSafeInstantMessages, text) ||
                testWholeInstant(general.suspiciousSafeInstantWholeMessages, text)) {
                return 2 /* Very */;
            }
            if (testSafe(general.suspiciousSafeMessages, text) ||
                testWhole(general.suspiciousSafeWholeMessages, text)) {
                return 1 /* Yes */;
            }
        }
        return 0 /* No */;
    };
};
exports.createIsSuspiciousName = (settings) => {
    const test = exports.createCachedTest();
    return (name) => test(settings.suspiciousNames, name);
};
exports.createIsSuspiciousAuth = (settings) => {
    const test = exports.createCachedTest();
    return ({ name, emails = [] }) => test(settings.suspiciousAuths, name) ||
        emails.some(email => test(settings.suspiciousAuths, email));
};
// pony
function tryParseJSON(value) {
    try {
        return JSON.parse(value);
    }
    catch (_a) {
        return undefined;
    }
}
function createMatchesFromList(list) {
    return lodash_1.compact((list || '').split(/\n/g).map(x => x.trim()).map(tryParseJSON));
}
exports.createIsSuspiciousPony = (settings) => (info) => {
    const matches = createMatchesFromList(settings.suspiciousPonies);
    return matches.some(match => matchPony(info, match));
};
function matchPony(info, match) {
    return lodash_1.isMatchWith(info, match, comparePonyInfoFields);
}
function comparePonyInfoFields(a, b) {
    if (typeof a === 'number' && typeof b === 'string') {
        return a === color_1.parseColorFast(b);
    }
    else {
        return undefined;
    }
}
// forbidden messages
function isForbiddenMessage(_message) {
    // NOTE: uncomment, to filter offensive messages
    // if (/niggers$/.test(_message) || /faggots?/.test(_message)) return true;
    // NOTE: add more filters here
    return false;
}
exports.isForbiddenMessage = isForbiddenMessage;
// forbidden name
function isForbiddenName(_value) {
    // NOTE: uncomment, to filter offensive names
    // if (/niggers$/.test(_value) || /faggots?/.test(_value) || /hitler/.test(_value)) return true;
    // NOTE: uncomment, to filter links in names
    // if (ipRegex.test(_value) && !ipExceptionRegex.test(_value)) return true;
    // if (urlRegex.test(_value) && !urlExceptionRegex.test(_value)) return true;
    // NOTE: add more filters here
    return false;
}
exports.isForbiddenName = isForbiddenName;
//# sourceMappingURL=security.js.map