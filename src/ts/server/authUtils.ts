import { uniq } from 'lodash';
import { Types } from 'mongoose';
import { Profile } from '../common/interfaces';
import { arraysEqual } from '../common/utils';
import { IAccount, IAuth, Auth, findAuthByOpenId, updateAuth, UpdateAuth, Account } from './db';
import { system } from './logger';
import { UserError } from './userError';
import { CreateAccountOptions, connectOnlySocialError } from './accountUtils';

export async function assignAuth(auth: IAuth, account: IAccount) {
	if (!auth.account || !auth.account.equals(account._id)) {
		system(account._id, `connected auth ${auth.name} [${auth._id}]`);
		await updateAuth(auth._id, { account: account._id });
		return true;
	} else {
		return false;
	}
}

export async function findOrCreateAuth(profile: Profile, accountId: string | undefined, options: CreateAccountOptions) {
	let auth = await findAuthByOpenId(profile.id, profile.provider);

	if (auth) {
		await updateAuthInfo(updateAuth, auth, profile, accountId);
	} else {
		if (options.connectOnly && !accountId) {
			if (profile.emails.length) {
				const account = await Account.findOne({ emails: { $in: profile.emails } }).exec();

				if (!account) {
					throw new UserError(connectOnlySocialError);
				}
			} else {
				throw new UserError(connectOnlySocialError);
			}
		}

		auth = await createAuth(profile, accountId);
	}

	await verifyOrRestoreAuth(auth, accountId);
	return auth;
}

export async function updateAuthInfo(
	updateAuth: UpdateAuth, auth: IAuth | undefined, profile: Profile, accountId: string | undefined
) {
	if (!auth)
		return;

	const changes: Partial<IAuth> = {};

	if (profile.url && auth.url !== profile.url) {
		changes.url = profile.url;
	}

	if (profile.username && auth.name !== profile.username) {
		changes.name = profile.username;
	}

	if (profile.emails && profile.emails.length) {
		if (!auth.emails || !arraysEqual(auth.emails.sort(), profile.emails.sort())) {
			changes.emails = uniq([...(auth.emails || []), ...profile.emails]);
		}
	}

	if (!auth.account && accountId) {
		changes.account = Types.ObjectId(accountId);
	}

	if (Object.keys(changes).length > 0) {
		Object.assign(auth, changes);
		await updateAuth(auth._id, changes);
	}
}

async function createAuth(profile: Profile, account: string | undefined) {
	if (!profile.id) {
		throw new Error('Missing profile ID');
	}

	return await Auth.create(<IAuth>{
		account,
		openId: profile.id,
		provider: profile.provider,
		name: profile.username,
		url: profile.url,
		emails: profile.emails || [],
		lastUsed: new Date(),
	});
}

async function verifyOrRestoreAuth(auth: IAuth, mergeAccount: string | undefined) {
	const changes: Partial<IAuth> = { lastUsed: new Date() };

	if (auth.disabled || auth.banned) {
		if (!auth.banned && auth.account && !!mergeAccount) {
			changes.disabled = false;
		} else {
			throw new UserError('Cannot sign-in using this social account');
		}
	}

	Object.assign(auth, changes);
	await updateAuth(auth._id, changes);
}
