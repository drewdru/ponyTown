import { createFunctionWithPromiseHandler } from '../lib';
import { expect } from 'chai';
import { stub, assert, SinonStub } from 'sinon';
import { GameServerSettings } from '../../common/adminInterfaces';
import { CounterService } from '../../server/services/counter';
import { IClient, OnMessageSettings } from '../../server/serverInterfaces';
import { fromNow, times as utilsTimes } from '../../common/utils';
import { randomString } from '../../common/stringUtils';
import { DAY, SAY_MAX_LENGTH } from '../../common/constants';
import {
	REPORT_AFTER_LIMIT, MUTE_AFTER_LIMIT, SHORT_MESSAGE_MUL, LONG_MESSAGE_MUL, TINY_MESSAGE_MUL,
	createSpamChecker, RAPID_MESSAGE_COUNT
} from '../../server/spamChecker';
import { mockClient } from '../mocks';
import { SPAM_TIMEOUT } from '../../server/reporting';

function times(count: number, action: (i: number) => any) {
	return Promise.all(utilsTimes(count, action));
}

describe('SpamChecker', () => {
	describe('check()', () => {
		let client: IClient;
		let settings: GameServerSettings;
		let spamCounter: CounterService<string>;
		let rapidCounter: CounterService<void>;
		let countSpamming: SinonStub;
		let timeoutAccount: SinonStub;
		let spamChecker: OnMessageSettings;

		beforeEach(() => {
			client = mockClient();
			client.account.createdAt = fromNow(-2 * DAY);
			settings = {
				reportSpam: true,
				autoBanSpamming: true,
			};
			spamCounter = new CounterService<string>(1000);
			rapidCounter = new CounterService<void>(1000);
			countSpamming = stub().resolves();
			timeoutAccount = stub().resolves();
			spamChecker = createFunctionWithPromiseHandler(
				createSpamChecker, spamCounter, rapidCounter, countSpamming, timeoutAccount);
		});

		it('does not count spam for mods', async () => {
			client.isMod = true;

			await times(10, () => spamChecker(client, 'long_spam_text', settings));

			assert.notCalled(countSpamming);
		});

		it('counts spam if reporting is turned off', async () => {
			settings.reportSpam = false;

			await times(REPORT_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledOnce(countSpamming);
		});

		it('does not report if reporting is turned off', async () => {
			settings.reportSpam = false;
			const warn = stub(client.reporter, 'warn');

			await times(10, () => spamChecker(client, 'long_spam_text', settings));

			assert.notCalled(warn);
		});

		it('reports spam', async () => {
			const warn = stub(client.reporter, 'warn');

			await times(REPORT_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledWith(warn, 'Spam', 'long_spam_text');
		});

		it(`counts spam after ${REPORT_AFTER_LIMIT} messages`, async () => {
			await times(REPORT_AFTER_LIMIT - 1, () => spamChecker(client, 'long_spam_text', settings));

			assert.notCalled(countSpamming);

			await times(1, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledWith(countSpamming, client.accountId);
		});

		it(`counts spam after ${REPORT_AFTER_LIMIT} commands`, async () => {
			await times(REPORT_AFTER_LIMIT - 1, () => spamChecker(client, '/random 1000', settings));

			assert.notCalled(countSpamming);

			await times(1, () => spamChecker(client, '/random 1000', settings));

			assert.calledWith(countSpamming, client.accountId);
		});

		it(`counts spam after ${REPORT_AFTER_LIMIT * SHORT_MESSAGE_MUL} messages for short messages`, async () => {
			await times(REPORT_AFTER_LIMIT * SHORT_MESSAGE_MUL - 1, () => spamChecker(client, 'short', settings));

			assert.notCalled(countSpamming);

			await times(1, () => spamChecker(client, 'short', settings));

			assert.calledWith(countSpamming, client.accountId);
		});

		it(`counts spam after ${REPORT_AFTER_LIMIT * TINY_MESSAGE_MUL} messages for tiny messages`, async () => {
			await times(REPORT_AFTER_LIMIT * TINY_MESSAGE_MUL - 1, () => spamChecker(client, 'abc', settings));

			assert.notCalled(countSpamming);

			await times(1, () => spamChecker(client, 'abc', settings));

			assert.calledWith(countSpamming, client.accountId);
		});

		it(`counts spam after ${REPORT_AFTER_LIMIT} messages mixed with other messages`, async () => {
			await times(REPORT_AFTER_LIMIT - 1, async () => {
				await spamChecker(client, '1long_spam_text1', settings);
				await spamChecker(client, '2long_spam_text2', settings);
			});

			assert.notCalled(countSpamming);

			await times(1, () => spamChecker(client, '1long_spam_text1', settings));

			assert.calledWith(countSpamming, client.accountId);
		});

		it(`counts spam after ${REPORT_AFTER_LIMIT} message mixed with ${REPORT_AFTER_LIMIT} other messages`, async () => {
			await times(REPORT_AFTER_LIMIT, async () => {
				await spamChecker(client, '1long_spam_text1', settings);
				await spamChecker(client, '2long_spam_text2', settings);
				await spamChecker(client, '3long_spam_text3', settings);
				await spamChecker(client, '4long_spam_text4', settings);
				await spamChecker(client, '5long_spam_text5', settings);
			});

			assert.calledWith(countSpamming, client.accountId);
		});

		it(`forgets message after ${REPORT_AFTER_LIMIT} other messages`, async () => {
			await spamChecker(client, 'long_spam_text1', settings);

			for (let i = 0; i < REPORT_AFTER_LIMIT; i++) {
				await spamChecker(client, i + '2long_spam_text2', settings);
				await spamChecker(client, i + '3long_spam_text3', settings);
				await spamChecker(client, i + '4long_spam_text4', settings);
				await spamChecker(client, i + '5long_spam_text5', settings);
				await spamChecker(client, i + '6long_spam_text6', settings);
				await spamChecker(client, i + '7long_spam_text7', settings);
			}

			for (let i = 2; i < REPORT_AFTER_LIMIT; i++) {
				await spamChecker(client, 'long_spam_text1', settings);
			}

			assert.notCalled(countSpamming);
		});

		it(`counts spam with timeout if autoBanSpamming option is on and counter is ${MUTE_AFTER_LIMIT}`, async () => {
			settings.autoBanSpamming = true;
			stub(spamCounter, 'add').returns({ count: MUTE_AFTER_LIMIT, items: ['long_spam_text'], date: 0 });

			await times(REPORT_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledWith(countSpamming, client.accountId);
		});

		it('adds entry to spam counter', async () => {
			const add = stub(spamCounter, 'add').returns({ count: 0, items: [], date: 0 });

			await times(REPORT_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledWith(add, client.accountId, 'long_spam_text', 1);
		});

		it('adds entry to spam counter with increment of 2 for max length message', async () => {
			const add = stub(spamCounter, 'add').returns({ count: 0, items: [], date: 0 });
			const message = randomString(SAY_MAX_LENGTH);

			await times(REPORT_AFTER_LIMIT, () => spamChecker(client, message, {}));

			assert.calledWith(add, client.accountId, message, 2);
		});

		it('adds entry to spam counter with increment of 2 for long messages', async () => {
			const add = stub(spamCounter, 'add').returns({ count: 0, items: [], date: 0 });
			const message = 'AAAAALGIRNGLRINGLISAHGLEISRHGLISRHGLISRHGLISRHGISRXY';

			await times(REPORT_AFTER_LIMIT, () => spamChecker(client, message, {}));

			assert.calledWith(add, client.accountId, message, 2);
		});

		const longLimit = Math.ceil(REPORT_AFTER_LIMIT * LONG_MESSAGE_MUL);

		it(`counts spam after ${longLimit} LONG messages`, async () => {
			const longestMessage = 'kgfdjhskgdfhgkdlufhgkdfghdfgudhrkughrdkughkdruhgkdurhgkdurhgkudh';

			await times(longLimit - 1, () => spamChecker(client, longestMessage, {}));

			assert.notCalled(countSpamming);

			await times(1, () => spamChecker(client, longestMessage, {}));

			assert.calledWith(countSpamming, client.accountId);
		});

		it(`matches spam`, async () => {
			await times(REPORT_AFTER_LIMIT - 1, () => spamChecker(client, `some message`, {}));

			assert.notCalled(countSpamming);

			await times(1, () => spamChecker(client, `some message`, {}));

			assert.calledWith(countSpamming, client.accountId);
		});

		it(`matches partial spam `, async () => {
			await times(REPORT_AFTER_LIMIT - 1, i => spamChecker(client, `common message part ${i} aaa`, {}));

			assert.notCalled(countSpamming);

			await times(1, () => spamChecker(client, `common message part x aaa`, {}));

			assert.calledWith(countSpamming, client.accountId);
		});

		it('timeouts for spamming', async () => {
			await times(REPORT_AFTER_LIMIT * MUTE_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledWith(timeoutAccount, client.accountId);
		});

		it('uses double timeout length is doubleTimeouts setting is set', async () => {
			settings.doubleTimeouts = true;

			await times(REPORT_AFTER_LIMIT * MUTE_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledWith(timeoutAccount, client.accountId);
			expect(timeoutAccount.args[0][1].getTime()).greaterThan(fromNow(SPAM_TIMEOUT * 1.9).getTime());
		});

		it('reports timing out', async () => {
			const system = stub(client.reporter, 'system');

			await times(REPORT_AFTER_LIMIT * MUTE_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledWith(system, 'Timed out for spamming');
		});

		it('logs timing out if reporting is turned off', async () => {
			settings.reportSpam = false;
			const system = stub(client.reporter, 'system');
			const systemLog = stub(client.reporter, 'systemLog');

			await times(REPORT_AFTER_LIMIT * MUTE_AFTER_LIMIT, () => spamChecker(client, 'long_spam_text', settings));

			assert.calledWith(systemLog, 'Timed out for spamming');
			assert.notCalled(system);
		});

		it('counts a lot of rapid messages as spam', async () => {
			await times(RAPID_MESSAGE_COUNT + 1, i => spamChecker(client, i + '-' + i, {}));

			assert.calledWith(countSpamming, client.accountId);
		});
	});
});
