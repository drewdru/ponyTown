import * as moment from 'moment';
import { ACCOUNT_NAME_MAX_LENGTH, ACCOUNT_NAME_MIN_LENGTH, MIN_CHATLOG_RANGE, MAX_CHATLOG_RANGE, HIDES_PER_PAGE } from '../../common/constants';
import {
	UpdateAccountData, AccountSettings, AccountData, ModAction, EntitiesEditorInfo, EntityNameTypes
} from '../../common/interfaces';
import { isMod } from '../../common/accountUtils';
import { cleanName } from '../../client/clientUtils';
import { toAccountData, toPonyObject, toSocialSite, toPonyObjectFields, toSocialSiteFields } from '../serverUtils';
import {
	IAccount, FindAccountSafe, FindAuth, FindAuths, FindCharacters, CountAuths, Auth,
	ID, findFriends, Account, HideRequest
} from '../db';
import { UserError } from '../userError';
import * as entities from '../../common/entities';
import { includes, clamp, createValidBirthDate, parseISODate, formatISODate } from '../../common/utils';
import { getAccountAlertMessage } from '../accountUtils';
import { getAge } from '../../common/adminUtils';

export type GetAccountCharacters = ReturnType<typeof createGetAccountCharacters>;
export type UpdateAccount = ReturnType<typeof createUpdateAccount>;
export type UpdateSettings = ReturnType<typeof createUpdateSettings>;
export type RemoveSite = ReturnType<typeof createRemoveSite>;
export type GetAccountData = ReturnType<typeof createGetAccountData>;

type LogAccount = (accountId: ID, message: string) => void;

const exclude = [
	'getEntityType', 'getEntityTypeName', 'createAnEntity', 'createEntity', 'pony',
	'createBaseEntity', 'getEntityTypesAndNames',
];

export const allEntities = Object.keys(entities)
	.filter(key => typeof (entities as any)[key] === 'function')
	.filter(key => !includes(exclude, key));

function getEntityNamesToTypes() {
	const result: EntityNameTypes[] = [];

	for (const name of allEntities) {
		const created = (entities as any)[name](0, 0);
		const array = Array.isArray(created) ? created : [created];
		const types = array.map(e => e.type);
		result.push({ name, types });
	}

	return result;
}

const entitiesInfo: EntitiesEditorInfo = {
	typeToName: entities.getEntityTypesAndNames(),
	nameToTypes: getEntityNamesToTypes(),
	names: allEntities,
};

const actions = [
	{ name: 'kick', action: ModAction.Kick },
	{ name: 'ban', action: ModAction.Ban },
];

export const modCheck = { xcz: { vdw: { qwe: { mnb: {} } } }, actions };

function fixUpdateAccountData(update: UpdateAccountData | undefined) {
	const fixed: UpdateAccountData = {} as any;

	if (update) {
		if (update.name && typeof update.name === 'string') {
			const name = cleanName(update.name);

			if (name.length >= ACCOUNT_NAME_MIN_LENGTH && name.length <= ACCOUNT_NAME_MAX_LENGTH) {
				fixed.name = name;
			}
		}

		if (update.birthdate && typeof update.birthdate === 'string') {
			fixed.birthdate = update.birthdate;
		}
	}

	return fixed;
}

function fixAccountSettings(settings: AccountSettings | undefined) {
	const fixed: Partial<AccountSettings> = {};

	if (settings) {
		if (settings.defaultServer !== undefined) {
			fixed.defaultServer = `${settings.defaultServer}`;
		}

		if (settings.filterCyrillic !== undefined) {
			fixed.filterCyrillic = !!settings.filterCyrillic;
		}

		if (settings.filterSwearWords !== undefined) {
			fixed.filterSwearWords = !!settings.filterSwearWords;
		}

		if (settings.ignorePartyInvites !== undefined) {
			fixed.ignorePartyInvites = !!settings.ignorePartyInvites;
		}

		if (settings.ignoreFriendInvites !== undefined) {
			fixed.ignoreFriendInvites = !!settings.ignoreFriendInvites;
		}

		if (settings.ignorePublicChat !== undefined) {
			fixed.ignorePublicChat = !!settings.ignorePublicChat;
		}

		if (settings.ignoreNonFriendWhispers !== undefined) {
			fixed.ignoreNonFriendWhispers = !!settings.ignoreNonFriendWhispers;
		}

		if (settings.chatlogOpacity !== undefined) {
			fixed.chatlogOpacity = clamp(settings.chatlogOpacity | 0, 0, 100);
		}

		if (settings.chatlogRange !== undefined) {
			fixed.chatlogRange = clamp(settings.chatlogRange | 0, MIN_CHATLOG_RANGE, MAX_CHATLOG_RANGE);
		}

		if (settings.seeThroughObjects !== undefined) {
			fixed.seeThroughObjects = !!settings.seeThroughObjects;
		}

		if (settings.filterWords !== undefined) {
			fixed.filterWords = `${settings.filterWords}`;
		}

		if (settings.actions !== undefined) {
			fixed.actions = `${settings.actions}`;
		}

		if (settings.hidden !== undefined) {
			fixed.hidden = !!settings.hidden;
		}
	}

	return fixed;
}

export const createGetAccountData =
	(findCharacters: FindCharacters, findAuths: FindAuths) =>
		async (account: IAccount): Promise<AccountData> => {
			const [ponies, auths] = await Promise.all([
				findCharacters(account._id, toPonyObjectFields),
				findAuths(account._id, toSocialSiteFields),
			]);

			const data = toAccountData(account);
			data.ponies = ponies.map(toPonyObject) as any;
			data.sites = auths.map(toSocialSite);
			data.alert = getAccountAlertMessage(account);

			if (isMod(account)) {
				data.check = modCheck;
			}

			if (BETA && isMod(account)) {
				data.editor = entitiesInfo;
			}

			return data;
		};

export async function getFriends(account: IAccount) {
	return findFriends(account._id, true);
}

export async function getHides(account: IAccount, page: number) {
	const hideRequests = await HideRequest
		.find({ source: account._id }, '_id name date')
		.sort({ date: -1 })
		.skip(page * HIDES_PER_PAGE)
		.limit(HIDES_PER_PAGE)
		.lean()
		.exec();

	return hideRequests.map((f: any) => ({
		id: f._id.toString(),
		name: f.name,
		date: moment(f.date).fromNow(),
	}));
}

export const createGetAccountCharacters =
	(findCharacters: FindCharacters) =>
		async (account: IAccount) => {
			const ponies = await findCharacters(account._id);
			return ponies.map(toPonyObject);
		};

export const createUpdateAccount =
	(findAccount: FindAccountSafe, log: LogAccount) =>
		async (account: IAccount, update: UpdateAccountData | undefined) => {
			const a = await findAccount(account._id);

			if (update) {
				const fixed = fixUpdateAccountData(update);
				const up: Partial<IAccount> = {};

				if (fixed.name && fixed.name !== a.name) {
					up.name = fixed.name;
					log(a._id, `Renamed "${a.name}" => "${fixed.name}"`);
				}

				if (fixed.birthdate) {
					const { day, month, year } = parseISODate(fixed.birthdate);
					const date = createValidBirthDate(day, month, year);

					if ((date && a.birthdate && date.getTime() !== a.birthdate.getTime()) || !a.birthdate) {
						up.birthdate = date;

						const from = a.birthdate ? `${formatISODate(a.birthdate)} (${getAge(a.birthdate)}yo)` : `undefined`;
						const to = up.birthdate ? `${formatISODate(up.birthdate)} (${getAge(up.birthdate)}yo)` : `undefined`;
						log(a._id, `Changed birthdate ${from} => ${to}`);
					}
				}

				Object.assign(a, up);
				await Account.updateOne({ _id: a._id }, up).exec();
			}

			return toAccountData(a);
		};

export const createUpdateSettings =
	(findAccount: FindAccountSafe) =>
		async (account: IAccount, settings: AccountSettings | undefined) => {
			const a = await findAccount(account._id);
			account.settings = a.settings = { ...a.settings, ...fixAccountSettings(settings) };
			await Account.updateOne({ _id: account._id }, { settings: account.settings }).exec();
			return toAccountData(a);
		};

export const createRemoveSite =
	(findAuth: FindAuth, countAllVisibleAuths: CountAuths, log: LogAccount) =>
		async (account: IAccount, siteId: unknown) => {
			const [auth, auths] = await Promise.all([
				siteId && typeof siteId === 'string' ? findAuth(siteId, account._id) : Promise.resolve(undefined),
				countAllVisibleAuths(account._id),
			]);

			if (!auth || auth.disabled) {
				throw new UserError('Social account not found');
			} else if (auths === 1) {
				throw new UserError('Cannot remove your only one social account');
			} else {
				log(account._id, `removed auth: ${auth.name} [${auth._id}]`);
				await Auth.updateOne({ _id: auth._id }, { disabled: true }).exec();
			}

			return {};
		};

export async function removeHide(account: IAccount, hideId: string) {
	await HideRequest.deleteOne({ source: account._id, _id: hideId }).exec();
}
