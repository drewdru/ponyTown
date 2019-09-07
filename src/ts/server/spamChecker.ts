import { ReportAccount, TimeoutAccount, IClient, LastSay, OnMessageSettings } from './serverInterfaces';
import { CounterService } from './services/counter';
import { fromNow } from '../common/utils';
import { SPAM_TIMEOUT } from './reporting';
import { isMutedOrShadowed } from './playerUtils';
import { handlePromiseDefault } from './serverUtils';
import { SECOND } from '../common/constants';
import { GameServerSettings } from '../common/adminInterfaces';

const TINY_MESSAGE_LENGTH = 3;
const SHORT_MESSAGE_LENGTH = 8;
const LONG_MESSAGE_LENGTH = 50;

export const MULTIPLE_MATCH_COUNT = 5;
export const REPORT_AFTER_LIMIT = 5;
export const MUTE_AFTER_LIMIT = 7;

export const TINY_MESSAGE_MUL = 1.5; // was 4
export const SHORT_MESSAGE_MUL = 1.5; // was 2
export const LONG_MESSAGE_MUL = 0.75;

export const RAPID_MESSAGE_COUNT = 35;
export const RAPID_MESSAGE_TIMEOUT = 30 * SECOND;

export const createSpamChecker =
	(
		spamCounter: CounterService<string>, rapidCounter: CounterService<number>, countSpamming: ReportAccount,
		timeoutAccount: TimeoutAccount, handlePromise = handlePromiseDefault,
	): OnMessageSettings => {
		async function countAndTimeout(
			client: IClient, timeout: boolean, message: string, items: string[], settings: GameServerSettings
		) {
			const timeoutTime = fromNow(SPAM_TIMEOUT * (settings.doubleTimeouts ? 2 : 1));

			await countSpamming(client.accountId);

			if (!isMutedOrShadowed(client)) {
				if (timeout && settings.autoBanSpamming) {
					await timeoutAccount(client.accountId, timeoutTime, 'Timed out for spamming');

					if (settings.reportSpam) {
						client.reporter.system('Timed out for spamming', items.join('\n'));
					} else {
						client.reporter.systemLog('Timed out for spamming');
					}
				} else if (settings.reportSpam && !ignoreReporting(message)) {
					client.reporter.warn('Spam', message);
				}
			}
		}

		async function countAndTimeoutForSpam(client: IClient, message: string, settings: GameServerSettings) {
			const increment = message.length >= LONG_MESSAGE_LENGTH ? 2 : 1;
			const { count, items } = spamCounter.add(client.accountId, message, increment);
			const timeout = count >= MUTE_AFTER_LIMIT;
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

				const spamLimit = REPORT_AFTER_LIMIT * getLengthMultiplier(message);

				if (lastMatch.count >= spamLimit) {
					lastMatch.count = 0;
					handlePromise(countAndTimeoutForSpam(client, message, settings), client.reporter.error);
				}
			} else {
				if (lastSays.length < MULTIPLE_MATCH_COUNT) {
					lastSays.push({ message, count: 1, age: 0 });
				} else {
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
			const threshold = now - RAPID_MESSAGE_TIMEOUT;
			const counter = rapidCounter.add(client.accountId, now);

			while (counter.items.length && counter.items[0] < threshold) {
				counter.items.shift();
				counter.count--;
			}

			if (counter.count > RAPID_MESSAGE_COUNT) {
				countAndTimeout(client, true, 'rapid messages', ['rapid messages'], settings);
				rapidCounter.remove(client.accountId);
			}
		};
	};

function findLastSayByPartialString(lastSays: LastSay[], message: string) {
	for (const say of lastSays) {
		if (partialString(say.message, message)) {
			return say;
		}
	}

	return undefined;
}

function byAge(a: LastSay, b: LastSay) {
	return b.age - a.age;
}

function ignoreReporting(message: string) {
	return message.length <= 3 || /^[aаz]+$|^\/roll/i.test(message);
}

function partialString(a: string, b: string): boolean {
	if (a === b) {
		return true;
	} else {
		const length = Math.floor(Math.min(a.length, b.length) * 0.75);
		return length > 8 && a.substr(0, length) === b.substr(0, length);
	}
}

function getLengthMultiplier(message: string) {
	if (message.length >= LONG_MESSAGE_LENGTH) {
		return LONG_MESSAGE_MUL;
	} else if (message.length <= TINY_MESSAGE_LENGTH) {
		return TINY_MESSAGE_MUL;
	} else if (message.length <= SHORT_MESSAGE_LENGTH) {
		return SHORT_MESSAGE_MUL;
	} else {
		return 1;
	}
}
