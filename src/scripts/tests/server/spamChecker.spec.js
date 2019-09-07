"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const counter_1 = require("../../server/services/counter");
const utils_1 = require("../../common/utils");
const stringUtils_1 = require("../../common/stringUtils");
const constants_1 = require("../../common/constants");
const spamChecker_1 = require("../../server/spamChecker");
const mocks_1 = require("../mocks");
const reporting_1 = require("../../server/reporting");
function times(count, action) {
    return Promise.all(utils_1.times(count, action));
}
describe('SpamChecker', () => {
    describe('check()', () => {
        let client;
        let settings;
        let spamCounter;
        let rapidCounter;
        let countSpamming;
        let timeoutAccount;
        let spamChecker;
        beforeEach(() => {
            client = mocks_1.mockClient();
            client.account.createdAt = utils_1.fromNow(-2 * constants_1.DAY);
            settings = {
                reportSpam: true,
                autoBanSpamming: true,
            };
            spamCounter = new counter_1.CounterService(1000);
            rapidCounter = new counter_1.CounterService(1000);
            countSpamming = sinon_1.stub().resolves();
            timeoutAccount = sinon_1.stub().resolves();
            spamChecker = lib_1.createFunctionWithPromiseHandler(spamChecker_1.createSpamChecker, spamCounter, rapidCounter, countSpamming, timeoutAccount);
        });
        it('does not count spam for mods', async () => {
            client.isMod = true;
            await times(10, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.notCalled(countSpamming);
        });
        it('counts spam if reporting is turned off', async () => {
            settings.reportSpam = false;
            await times(spamChecker_1.REPORT_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledOnce(countSpamming);
        });
        it('does not report if reporting is turned off', async () => {
            settings.reportSpam = false;
            const warn = sinon_1.stub(client.reporter, 'warn');
            await times(10, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.notCalled(warn);
        });
        it('reports spam', async () => {
            const warn = sinon_1.stub(client.reporter, 'warn');
            await times(spamChecker_1.REPORT_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledWith(warn, 'Spam', 'long_spam_text');
        });
        it(`counts spam after ${spamChecker_1.REPORT_AFTER_LIMIT} messages`, async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT - 1, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.notCalled(countSpamming);
            await times(1, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it(`counts spam after ${spamChecker_1.REPORT_AFTER_LIMIT} commands`, async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT - 1, () => spamChecker(client, '/random 1000', settings));
            sinon_1.assert.notCalled(countSpamming);
            await times(1, () => spamChecker(client, '/random 1000', settings));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it(`counts spam after ${spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.SHORT_MESSAGE_MUL} messages for short messages`, async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.SHORT_MESSAGE_MUL - 1, () => spamChecker(client, 'short', settings));
            sinon_1.assert.notCalled(countSpamming);
            await times(1, () => spamChecker(client, 'short', settings));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it(`counts spam after ${spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.TINY_MESSAGE_MUL} messages for tiny messages`, async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.TINY_MESSAGE_MUL - 1, () => spamChecker(client, 'abc', settings));
            sinon_1.assert.notCalled(countSpamming);
            await times(1, () => spamChecker(client, 'abc', settings));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it(`counts spam after ${spamChecker_1.REPORT_AFTER_LIMIT} messages mixed with other messages`, async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT - 1, async () => {
                await spamChecker(client, '1long_spam_text1', settings);
                await spamChecker(client, '2long_spam_text2', settings);
            });
            sinon_1.assert.notCalled(countSpamming);
            await times(1, () => spamChecker(client, '1long_spam_text1', settings));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it(`counts spam after ${spamChecker_1.REPORT_AFTER_LIMIT} message mixed with ${spamChecker_1.REPORT_AFTER_LIMIT} other messages`, async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT, async () => {
                await spamChecker(client, '1long_spam_text1', settings);
                await spamChecker(client, '2long_spam_text2', settings);
                await spamChecker(client, '3long_spam_text3', settings);
                await spamChecker(client, '4long_spam_text4', settings);
                await spamChecker(client, '5long_spam_text5', settings);
            });
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it(`forgets message after ${spamChecker_1.REPORT_AFTER_LIMIT} other messages`, async () => {
            await spamChecker(client, 'long_spam_text1', settings);
            for (let i = 0; i < spamChecker_1.REPORT_AFTER_LIMIT; i++) {
                await spamChecker(client, i + '2long_spam_text2', settings);
                await spamChecker(client, i + '3long_spam_text3', settings);
                await spamChecker(client, i + '4long_spam_text4', settings);
                await spamChecker(client, i + '5long_spam_text5', settings);
                await spamChecker(client, i + '6long_spam_text6', settings);
                await spamChecker(client, i + '7long_spam_text7', settings);
            }
            for (let i = 2; i < spamChecker_1.REPORT_AFTER_LIMIT; i++) {
                await spamChecker(client, 'long_spam_text1', settings);
            }
            sinon_1.assert.notCalled(countSpamming);
        });
        it(`counts spam with timeout if autoBanSpamming option is on and counter is ${spamChecker_1.MUTE_AFTER_LIMIT}`, async () => {
            settings.autoBanSpamming = true;
            sinon_1.stub(spamCounter, 'add').returns({ count: spamChecker_1.MUTE_AFTER_LIMIT, items: ['long_spam_text'], date: 0 });
            await times(spamChecker_1.REPORT_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it('adds entry to spam counter', async () => {
            const add = sinon_1.stub(spamCounter, 'add').returns({ count: 0, items: [], date: 0 });
            await times(spamChecker_1.REPORT_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledWith(add, client.accountId, 'long_spam_text', 1);
        });
        it('adds entry to spam counter with increment of 2 for max length message', async () => {
            const add = sinon_1.stub(spamCounter, 'add').returns({ count: 0, items: [], date: 0 });
            const message = stringUtils_1.randomString(constants_1.SAY_MAX_LENGTH);
            await times(spamChecker_1.REPORT_AFTER_LIMIT, () => spamChecker(client, message, {}));
            sinon_1.assert.calledWith(add, client.accountId, message, 2);
        });
        it('adds entry to spam counter with increment of 2 for long messages', async () => {
            const add = sinon_1.stub(spamCounter, 'add').returns({ count: 0, items: [], date: 0 });
            const message = 'AAAAALGIRNGLRINGLISAHGLEISRHGLISRHGLISRHGLISRHGISRXY';
            await times(spamChecker_1.REPORT_AFTER_LIMIT, () => spamChecker(client, message, {}));
            sinon_1.assert.calledWith(add, client.accountId, message, 2);
        });
        const longLimit = Math.ceil(spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.LONG_MESSAGE_MUL);
        it(`counts spam after ${longLimit} LONG messages`, async () => {
            const longestMessage = 'kgfdjhskgdfhgkdlufhgkdfghdfgudhrkughrdkughkdruhgkdurhgkdurhgkudh';
            await times(longLimit - 1, () => spamChecker(client, longestMessage, {}));
            sinon_1.assert.notCalled(countSpamming);
            await times(1, () => spamChecker(client, longestMessage, {}));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it(`matches spam`, async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT - 1, () => spamChecker(client, `some message`, {}));
            sinon_1.assert.notCalled(countSpamming);
            await times(1, () => spamChecker(client, `some message`, {}));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it(`matches partial spam `, async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT - 1, i => spamChecker(client, `common message part ${i} aaa`, {}));
            sinon_1.assert.notCalled(countSpamming);
            await times(1, () => spamChecker(client, `common message part x aaa`, {}));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
        it('timeouts for spamming', async () => {
            await times(spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.MUTE_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledWith(timeoutAccount, client.accountId);
        });
        it('uses double timeout length is doubleTimeouts setting is set', async () => {
            settings.doubleTimeouts = true;
            await times(spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.MUTE_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledWith(timeoutAccount, client.accountId);
            chai_1.expect(timeoutAccount.args[0][1].getTime()).greaterThan(utils_1.fromNow(reporting_1.SPAM_TIMEOUT * 1.9).getTime());
        });
        it('reports timing out', async () => {
            const system = sinon_1.stub(client.reporter, 'system');
            await times(spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.MUTE_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledWith(system, 'Timed out for spamming');
        });
        it('logs timing out if reporting is turned off', async () => {
            settings.reportSpam = false;
            const system = sinon_1.stub(client.reporter, 'system');
            const systemLog = sinon_1.stub(client.reporter, 'systemLog');
            await times(spamChecker_1.REPORT_AFTER_LIMIT * spamChecker_1.MUTE_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));
            sinon_1.assert.calledWith(systemLog, 'Timed out for spamming');
            sinon_1.assert.notCalled(system);
        });
        it('counts a lot of rapid messages as spam', async () => {
            await times(spamChecker_1.RAPID_MESSAGE_COUNT + 1, i => spamChecker(client, i + '-' + i, {}));
            sinon_1.assert.calledWith(countSpamming, client.accountId);
        });
    });
});
//# sourceMappingURL=spamChecker.spec.js.map