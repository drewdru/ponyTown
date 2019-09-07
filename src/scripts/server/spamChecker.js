"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const reporting_1 = require("./reporting");
const playerUtils_1 = require("./playerUtils");
const serverUtils_1 = require("./serverUtils");
const constants_1 = require("../common/constants");
const TINY_MESSAGE_LENGTH = 3;
const SHORT_MESSAGE_LENGTH = 8;
const LONG_MESSAGE_LENGTH = 50;
exports.MULTIPLE_MATCH_COUNT = 5;
exports.REPORT_AFTER_LIMIT = 5;
exports.MUTE_AFTER_LIMIT = 7;
exports.TINY_MESSAGE_MUL = 1.5; // was 4
exports.SHORT_MESSAGE_MUL = 1.5; // was 2
exports.LONG_MESSAGE_MUL = 0.75;
exports.RAPID_MESSAGE_COUNT = 35;
exports.RAPID_MESSAGE_TIMEOUT = 30 * constants_1.SECOND;
exports.createSpamChecker = (spamCounter, rapidCounter, countSpamming, timeoutAccount, handlePromise = serverUtils_1.handlePromiseDefault) => {
    async function countAndTimeout(client, timeout, message, items, settings) {
        const timeoutTime = utils_1.fromNow(reporting_1.SPAM_TIMEOUT * (settings.doubleTimeouts ? 2 : 1));
        await countSpamming(client.accountId);
        if (!playerUtils_1.isMutedOrShadowed(client)) {
            if (timeout && settings.autoBanSpamming) {
                await timeoutAccount(client.accountId, timeoutTime, 'Timed out for spamming');
                if (settings.reportSpam) {
                    client.reporter.system('Timed out for spamming', items.join('\n'));
                }
                else {
                    client.reporter.systemLog('Timed out for spamming');
                }
            }
            else if (settings.reportSpam && !ignoreReporting(message)) {
                client.reporter.warn('Spam', message);
            }
        }
    }
    async function countAndTimeoutForSpam(client, message, settings) {
        const increment = message.length >= LONG_MESSAGE_LENGTH ? 2 : 1;
        const { count, items } = spamCounter.add(client.accountId, message, increment);
        const timeout = count >= exports.MUTE_AFTER_LIMIT;
        await countAndTimeout(client, timeout, message, items, settings);
    }
    return (client, message, settings) => {
        if (client.isMod)
            return;
        if (message === '.')
            return;
        const lastSays = client.lastSays;
        const lastMatch = findLastSayByPartialString(lastSays, message);
        if (lastMatch) {
            lastMatch.count++;
            lastMatch.age = 0;
            const spamLimit = exports.REPORT_AFTER_LIMIT * getLengthMultiplier(message);
            if (lastMatch.count >= spamLimit) {
                lastMatch.count = 0;
                handlePromise(countAndTimeoutForSpam(client, message, settings), client.reporter.error);
            }
        }
        else {
            if (lastSays.length < exports.MULTIPLE_MATCH_COUNT) {
                lastSays.push({ message, count: 1, age: 0 });
            }
            else {
                lastSays.sort(byAge);
                const lastSay = lastSays[lastSays.length - 1];
                lastSay.message = message;
                lastSay.count = 1;
                lastSay.age = 0;
            }
        }
        for (const say of lastSays) {
            say.age++;
        }
        const now = Date.now();
        const threshold = now - exports.RAPID_MESSAGE_TIMEOUT;
        const counter = rapidCounter.add(client.accountId, now);
        while (counter.items.length && counter.items[0] < threshold) {
            counter.items.shift();
            counter.count--;
        }
        if (counter.count > exports.RAPID_MESSAGE_COUNT) {
            countAndTimeout(client, true, 'rapid messages', ['rapid messages'], settings);
            rapidCounter.remove(client.accountId);
        }
    };
};
function findLastSayByPartialString(lastSays, message) {
    for (const say of lastSays) {
        if (partialString(say.message, message)) {
            return say;
        }
    }
    return undefined;
}
function byAge(a, b) {
    return b.age - a.age;
}
function ignoreReporting(message) {
    return message.length <= 3 || /^[aаz]+$|^\/roll/i.test(message);
}
function partialString(a, b) {
    if (a === b) {
        return true;
    }
    else {
        const length = Math.floor(Math.min(a.length, b.length) * 0.75);
        return length > 8 && a.substr(0, length) === b.substr(0, length);
    }
}
function getLengthMultiplier(message) {
    if (message.length >= LONG_MESSAGE_LENGTH) {
        return exports.LONG_MESSAGE_MUL;
    }
    else if (message.length <= TINY_MESSAGE_LENGTH) {
        return exports.TINY_MESSAGE_MUL;
    }
    else if (message.length <= SHORT_MESSAGE_LENGTH) {
        return exports.SHORT_MESSAGE_MUL;
    }
    else {
        return 1;
    }
}
//# sourceMappingURL=spamChecker.js.map