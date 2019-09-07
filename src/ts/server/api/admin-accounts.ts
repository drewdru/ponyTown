import { noop, uniq, fromPairs } from 'lodash';
import { AccountCounters, Dict } from '../../common/interfaces';
import {
	AccountUpdate, AccountState, FindAccountQuery, FindAccountResult, AdminCache, AdminCacheEntry,
	Account as AccountInterface
} from '../../common/adminInterfaces';
import { checkIfNotAdmin } from '../accountUtils';
import { updateAccount, findAccountSafe, IAccount, MongoUpdate, findAccount, Account } from '../db';
import { accountChanged } from '../internal';
import { MINUTE } from '../../common/constants';
import { fromNow, includes, arraysEqual } from '../../common/utils';
import { isMuted, isShadowed, filterAccounts, emailName } from '../../common/adminUtils';
import { AdminService } from '../services/adminService';

const banLogLimit = 10;

async function updateAccountAndNotify(accountId: string, update: MongoUpdate<IAccount>) {
	await updateAccount(accountId, update);
	await accountChanged(accountId);
}

export async function timeoutAccount(accountId: string, timeout: Date, message?: string) {
	const account = await findAccountSafe(accountId, 'roles mute shadow');

	checkIfNotAdmin(account, `timeout account: ${accountId}`);

	const update: MongoUpdate<IAccount> = { mute: timeout.getTime() };

	if (!isMuted(account) && !isShadowed(account)) {
		update.$inc = { 'counters.timeouts': 1 };

		if (message) {
			update.$push = {
				banLog: {
					$each: [{ message, date: new Date() }],
					$slice: -banLogLimit,
				},
			};
		}
	}

	await updateAccountAndNotify(accountId, update);
}

function incrementAccountCounter(accountId: string, counter: keyof AccountCounters) {
	return updateAccountAndNotify(accountId, { $inc: { [`counters.${counter}`]: 1 } });
}

export function updateAccountCounter(accountId: string, counter: keyof AccountCounters, value: number) {
	return updateAccountAndNotify(accountId, { [`counters.${counter}`]: value });
}

let logSwearing: () => void = noop;
let logSpamming: () => void = noop;

export function initLogSwearingAndSpamming(swearing: typeof logSwearing, spamming: typeof logSpamming) {
	logSwearing = swearing;
	logSpamming = spamming;
}

export function reportSwearingAccount(accountId: string) {
	logSwearing();
	return incrementAccountCounter(accountId, 'swears');
}

export function reportSpammingAccount(accountId: string) {
	logSpamming();
	return incrementAccountCounter(accountId, 'spam');
}

export async function reportInviteLimitAccount(accountId: string) {
	await incrementAccountCounter(accountId, 'inviteLimit');
	const account = await findAccountSafe(accountId, 'counters');
	return account.counters && account.counters.inviteLimit || 0;
}

export async function reportFriendLimitAccount(accountId: string) {
	await incrementAccountCounter(accountId, 'friendLimit');
	const account = await findAccountSafe(accountId, 'counters');
	return account.counters && account.counters.friendLimit || 0;
}

export async function updateAccountSafe(accountId: string, update: AccountUpdate) {
	const keys = Object.keys(update);
	const allowAdmin = arraysEqual(keys, ['note']) || arraysEqual(keys, ['supporter']);
	const account = await findAccountSafe(accountId);

	if (!allowAdmin) {
		checkIfNotAdmin(account, `update account: ${accountId}`);
	}

	const isNoteUpdate = 'note' in update && update.note !== account.note;
	const accountUpdate = isNoteUpdate ? { ...update, noteUpdated: new Date() } : update;

	await updateAccountAndNotify(accountId, accountUpdate);
}

export async function setRole(accountId: string, role: string, set: boolean, isSuperadmin: boolean) {
	if (role === 'superadmin' || !isSuperadmin) {
		throw new Error('Not allowed');
	} else {
		await updateAccountAndNotify(accountId, set ? { $addToSet: { roles: [role] } } : { $pull: { roles: role } });
	}
}

export function addEmail(accountId: string, email: string) {
	return updateAccount(accountId, { $addToSet: { emails: [email.trim().toLowerCase()] } });
}

export function removeEmail(accountId: string, email: string) {
	return updateAccount(accountId, { $pull: { emails: email } });
}

export function removeIgnore(accountId: string, ignoredAccount: string) {
	return updateAccountAndNotify(ignoredAccount, { $pull: { ignores: accountId } });
}

export function addIgnores(accountId: string, ignores: string[]) {
	return updateAccountAndNotify(accountId, { $addToSet: { ignores } });
}

export function setAccountState(accountId: string, state: AccountState) {
	return updateAccountAndNotify(accountId, { state });
}

function isValidCache<T>(entry: AdminCacheEntry<T>, query: string, duration: number): boolean {
	return entry.query === query && entry.timestamp.getTime() > fromNow(-duration).getTime();
}

export async function findAccounts(
	cache: AdminCache, service: AdminService, { search, showOnly, not, page, itemsPerPage, force }: FindAccountQuery
): Promise<FindAccountResult> {
	const query = JSON.stringify({ search, showOnly, not });
	let found: AccountInterface[];

	if (force) {
		cache.findAccounts = undefined;
	}

	if (cache.findAccounts && isValidCache(cache.findAccounts, query, 5 * MINUTE)) {
		found = cache.findAccounts.result;
	} else {
		found = filterAccounts(service.accounts.items, search, showOnly, not);
		cache.findAccounts = {
			query,
			result: found,
			timestamp: new Date(),
		};
	}

	const start = page * itemsPerPage;

	return {
		accounts: found.slice(start, start + itemsPerPage).map(a => a._id),
		page,
		totalItems: found.length,
	};
}

export function getAccountsByEmail(service: AdminService, email: string) {
	email = email.toLowerCase();
	const name = emailName(email);
	const accounts = service.getAccountsByEmailName(name) || [];
	return accounts.filter(a => includes(a.emails, email)).map(a => a._id);
}

export function getAccountsByEmails(service: AdminService, emails: string[]): Dict<string[]> {
	const pairs = uniq(emails)
		.map(email => [email, getAccountsByEmail(service, email)] as [string, string[]])
		.filter(([_, accounts]) => accounts.length > 0);

	return fromPairs(pairs);
}

export function getAccountsByOrigin(service: AdminService, ip: string): string[] {
	const origin = service.origins.get(ip);
	return origin && origin.accounts && origin.accounts.map(a => a._id) || [];
}

export async function removeAccount(service: AdminService, accountId: string) {
	const account = await findAccount(accountId);

	if (account) {
		checkIfNotAdmin(account, `remove account: ${accountId}`);

		await account.remove();

		service.removedItem('accounts', accountId);
	}
}

export async function setAccountAlert(accountId: string, message: string, expires: Date) {
	const update = message ? { alert: { message, expires } } : { $unset: { alert: 1 } };
	await Account.updateOne({ _id: accountId }, update).exec();
}
