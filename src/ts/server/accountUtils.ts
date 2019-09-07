import * as moment from 'moment';
import { Types } from 'mongoose';
import { uniq, truncate } from 'lodash';
import { AccountState, AccountFlags, AuthBase } from '../common/adminInterfaces';
import { Profile, ModInfo, AccountDataFlags } from '../common/interfaces';
import { ACCOUNT_NAME_MAX_LENGTH, DAY } from '../common/constants';
import { fromNow, includes, hasFlag } from '../common/utils';
import {
	isAdmin, getCharacterLimit as getCharacterLimitInternal, getSupporterInviteLimit as getSupporterInviteLimitInternal
} from '../common/accountUtils';
import { cleanName } from '../client/clientUtils';
import {
	IAccount, IAuth, Account, ID, characterCount as getCharacterCount, findAccount, queryAccount, updateAccount,
	FriendRequest, IFriendRequest
} from './db';
import { assignAuth } from './authUtils';
import { UserError } from './userError';
import { system, logger } from './logger';
import { isActive, supporterLevel, isPastSupporter } from '../common/adminUtils';
import { IClient } from './serverInterfaces';
import { providers } from './oauth';
import { taskQueue } from './utils/taskQueue';

export interface SuspiciousCheckers {
	isSuspiciousName(name: string): boolean;
	isSuspiciousAuth(auth: AuthBase<any>): boolean;
}

export interface CreateAccountOptions extends SuspiciousCheckers {
	userAgent: string | undefined;
	browserId: string | undefined;
	connectOnly: boolean;
	creationLocked: boolean;
	canCreateAccounts: boolean;
	reportPotentialDuplicates: boolean;
	ip: string;
	warn: (accountId: string | Types.ObjectId, message: string, desc?: string) => void;
}

function getBanInfo(value: number | undefined): string | undefined {
	return isActive(value) ? (value === -1 ? 'perma' : moment(value).fromNow(true)) : undefined;
}

export function getModInfo({ accountId, account, country }: IClient): ModInfo {
	return {
		shadow: getBanInfo(account.shadow),
		mute: getBanInfo(account.mute),
		note: account.note,
		counters: account.counters || {},
		country,
		account: `${account.name} [${accountId.substr(-3)}]`,
	};
}

function findAccountByEmail(emails?: string[]) {
	return emails && emails.length ? queryAccount({ emails: { $in: emails } }) : Promise.resolve(undefined);
}

const availableProviders = providers.filter(a => !a.connectOnly).map(a => a.name).join(', ');

export const connectOnlySocialError =
	`Cannot create new account using this social site, new accounts can only be created using: ${availableProviders}`;

function createNewAccount(profile: Profile, options: CreateAccountOptions) {
	if (!options.canCreateAccounts) {
		throw new UserError(
			'Creating accounts is temporarily disabled, try again later');
	} else if (options.connectOnly) {
		throw new UserError(connectOnlySocialError);
	} else if (options.creationLocked) {
		throw new UserError(
			'Could not create account, try again later', { log: `account creation blocked by ACL (${options.ip})` });
	} else if (profile.suspended) {
		throw new UserError(
			'Cannot create new account using suspended social site account', { log: 'account creation blocked by suspended' });
	} else {
		return new Account();
	}
}

async function hasDuplicatesAtOrigin(account: IAccount, ip: string) {
	const now = Date.now();
	const query = { origins: { $elemMatch: { ip } } };
	const duplicates: IAccount[] = await Account.find(query, '_id ban mute shadow flags name').lean().exec();

	return duplicates.some(({ _id, ban = 0, mute = 0, shadow = 0, flags = 0, name }) => {
		if (_id.toString() === account._id.toString())
			return false;

		if (ban === -1 || ban > now || mute === -1 || mute > now || shadow === -1 || shadow > now)
			return true;

		if (hasFlag(flags, AccountFlags.CreatingDuplicates))
			return true;

		if (name === account.name)
			return true;

		return false;
	});
}

const newAccountCheckQueue = taskQueue();

async function checkNewAccount(account: IAccount, options: CreateAccountOptions) {
	newAccountCheckQueue.push(async () => {
		try {
			if (options.reportPotentialDuplicates) {
				const duplicate = await hasDuplicatesAtOrigin(account, options.ip);

				if (duplicate) {
					options.warn(account._id, `Potential duplicate`);
				}
			}
		} catch (e) {
			options.warn(account._id, `Error when checking new account`, e.message);
		}
	});
}

export async function findOrCreateAccount(auth: IAuth, profile: Profile, options: CreateAccountOptions): Promise<IAccount> {
	let account: IAccount | undefined = undefined;
	let isNew = false;

	if (auth.account) {
		account = await findAccount(auth.account);
	}

	if (!account) {
		account = await findAccountByEmail(profile.emails);
	}

	if (!account) {
		account = createNewAccount(profile, options);
		isNew = true;
	}

	const assigned = await assignAuth(auth, account);

	if (assigned && options.isSuspiciousAuth(auth)) {
		options.warn(account._id, 'Suspicious auth');
	}

	// fix accounts fields

	account.name = account.name || truncate(cleanName(profile.name) || 'Anonymous', { length: ACCOUNT_NAME_MAX_LENGTH });
	account.emails = account.emails || [];

	if (profile.emails.some(e => !includes(account!.emails, e))) {
		const suspiciousEmails = profile.emails.filter(options.isSuspiciousName);

		if (suspiciousEmails.length) {
			options.warn(account._id, 'Suspicious email', suspiciousEmails.join(', '));
		}

		account.emails = uniq([...account.emails, ...profile.emails]);
	}

	account.lastVisit = new Date();
	account.lastUserAgent = options.userAgent || account.lastUserAgent;
	account.lastBrowserId = options.browserId || account.lastBrowserId;

	// save account

	if (isNew) {
		await account.save();
		system(account._id, `created account "${account.name}"`);
		checkNewAccount(account, options);
	} else {
		const { name, emails, lastVisit, lastUserAgent, lastBrowserId } = account;
		await Account.updateOne({ _id: account._id }, { name, emails, lastVisit, lastUserAgent, lastBrowserId }).exec();
	}

	return account;
}

export function isNew(account: IAccount): boolean {
	return !account.createdAt || account.createdAt.getTime() > fromNow(-DAY).getTime();
}

export function checkIfNotAdmin(account: IAccount, message: string) {
	if (isAdmin(account)) {
		logger.warn(`Cannot perform this action on admin user (${message})`);
		throw new Error('Cannot perform this action on admin user');
	} else {
		return account;
	}
}

export async function updateCharacterCount(account: ID) {
	const characterCount = await getCharacterCount(account);
	await updateAccount(account, { characterCount });
}

export function updateAccountState(account: IAccount, update: (state: AccountState) => void) {
	const state = account.state || {};
	update(state);
	account.state = state;
	updateAccount(account._id, { state: account.state })
		.catch(e => logger.error(e));
}

export function getAccountAlertMessage(account: IAccount) {
	return (account.alert && account.alert.expires.getTime() > Date.now()) ? account.alert.message : undefined;
}

async function findFriendRequest(accountId: string, friendId: string): Promise<IFriendRequest | undefined> {
	const requests = await FriendRequest.find({
		$or: [
			{ source: accountId, target: friendId },
			{ source: friendId, target: accountId },
		]
	}).exec();

	return requests[0];
}

export async function addFriend(accountId: string, friendId: string) {
	const existing = await findFriendRequest(accountId, friendId);

	if (existing) {
		throw new Error(`Friend request already exists`);
	}

	await FriendRequest.create({ source: accountId, target: friendId });
}

export async function removeFriend(accountId: string, friendId: string) {
	const existing = await findFriendRequest(accountId, friendId);

	if (existing) {
		existing.remove();
	}
}

export function getCharacterLimit(account: IAccount) {
	return getCharacterLimitInternal({
		flags: isPastSupporter(account) ? AccountDataFlags.PastSupporter : 0,
		supporter: supporterLevel(account),
	});
}

export function getSupporterInviteLimit(account: IAccount) {
	return getSupporterInviteLimitInternal({
		roles: account.roles,
		flags: isPastSupporter(account) ? AccountDataFlags.PastSupporter : 0,
		supporter: supporterLevel(account),
	});
}
