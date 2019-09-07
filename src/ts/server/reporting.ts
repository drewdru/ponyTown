import { HOUR } from '../common/constants';
import { isMuted } from '../common/adminUtils';
import { fromNow } from '../common/utils';
import { isNew } from './accountUtils';
import { ReportAccount, TimeoutAccount, ReportInviteLimit, OnSuspiciousMessage, OnMessageSettings } from './serverInterfaces';
import { CounterService } from './services/counter';
import { handlePromiseDefault } from './serverUtils';
import { Suspicious } from '../common/adminInterfaces';

type Counter = CounterService<string>;

export const SPAM_TIMEOUT = 1 * HOUR;
export const SWEAR_TIMEOUT = 10 * HOUR;
export const FORBIDDEN_TIMEOUT = 1 * HOUR;

export const createReportSuspicious =
	(counter: Counter): OnSuspiciousMessage =>
		(client, message, suspicious) => {
			const { accountId, account, reporter, shadowed } = client;
			const limit = 5;
			const { count, items } = counter.add(accountId, message);

			if (count > limit || suspicious === Suspicious.Very) {
				const msg = items.join('\n');
				counter.remove(accountId);

				if (!(isMuted(account) || shadowed)) {
					reporter.warn('Suspicious messages', msg);
				}
			}
		};

export const createReportSwears =
	(
		counter: Counter, reportSwearing: ReportAccount, timeoutAccount: TimeoutAccount, handlePromise = handlePromiseDefault,
	): OnMessageSettings =>
		(client, message, settings) => {
			const { accountId, account, reporter, shadowed } = client;
			const limit = 5; // isNew ? 3 : 6;
			const { count, items } = counter.add(accountId, message);

			if (count > limit) {
				const msg = items.join('\n');
				const timeout = settings.autoBanSwearing && !(isMuted(account) || shadowed);
				const duration = SWEAR_TIMEOUT * (settings.doubleTimeouts ? 2 : 1);
				counter.remove(accountId);

				handlePromise(Promise.resolve()
					.then(() => reportSwearing(accountId))
					.then(() => timeout ? timeoutAccount(accountId, fromNow(duration), 'Timed out for swearing') : undefined)
					.then(() => {
						if (timeout) {
							reporter.system('Timed out for swearing', msg, !!settings.reportSwears);
						} else if (!(isMuted(account) || shadowed)) {
							reporter.warn('Swearing', msg);
						}
					}), reporter.error);
			}
		};

export const createReportForbidden =
	(
		counter: Counter, timeoutAccount: TimeoutAccount, handlePromise = handlePromiseDefault
	): OnMessageSettings =>
		(client, message, settings) => {
			const { accountId, account, reporter, shadowed } = client;
			const newAccount = isNew(account);
			const limit = newAccount ? 5 : 10;
			const { count, items } = counter.add(accountId, message);
			const mutedOrShadowed = isMuted(account) || shadowed;

			if (!mutedOrShadowed) {
				if (count >= limit) {
					const msg = items.join('\n');
					const duration = FORBIDDEN_TIMEOUT * (settings.doubleTimeouts ? 2 : 1);
					counter.remove(accountId);

					if (newAccount || settings.autoBanSwearing) {
						handlePromise(timeoutAccount(accountId, fromNow(duration))
							.then(() => reporter.system('Timed out for forbidden messages', msg)), reporter.error);
					} else {
						reporter.warn('Forbidden messages', msg);
					}
				}
			}
		};

export const reportInviteLimit =
	(
		reportInviteLimitAccount: (account: string) => Promise<number>, message: string, handlePromise = handlePromiseDefault
	): ReportInviteLimit =>
		({ accountId, reporter }) =>
			handlePromise(reportInviteLimitAccount(accountId)
				.then(count => {
					reporter.systemLog(message);

					if (count % 10 === 0) {
						reporter.warn(`${message} (${count})`);
					}
				}), reporter.error);
