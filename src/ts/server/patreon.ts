import * as Bluebird from 'bluebird';
import { toPairs, groupBy, max } from 'lodash';
import { patreon, PatronData } from 'patreon';
import { IAuth, IAccount, UpdateAccounts, UpdateAccount, QueryAuths, QueryAccounts, UpdateAuth } from './db';
import { PatreonFlags, PatreonPledge, PatreonData, PatreonReward } from '../common/adminInterfaces';
import { Dict } from '../common/interfaces';
import { DAY, SECOND, MONTH, rewardLevel1, rewardLevel2, rewardLevel3 } from '../common/constants';
import { LogMessage, LogAccountMessage } from './serverInterfaces';
import { delay, fromNow } from '../common/utils';
import { logPatreon } from './logger';

export const declinedDayLimit = 14;
export const declinedTimeLimit = declinedDayLimit * DAY;
export const supporterLogLimit = 10;

export const SUPPORTER_REWARD_IDS: Dict<PatreonFlags> = {
	[rewardLevel1]: PatreonFlags.Supporter1,
	[rewardLevel2]: PatreonFlags.Supporter2,
	[rewardLevel3]: PatreonFlags.Supporter3,
};

export type RemoveOldSupporters = ReturnType<typeof createRemoveOldSupporters>;
export type UpdateSupporters = ReturnType<typeof createUpdateSupporters>;
export type AddTotalPledged = ReturnType<typeof createAddTotalPledged>;

let lastPatreonData: PatreonData | undefined = undefined;

export function getLastPatreonData() {
	return lastPatreonData;
}

/* istanbul ignore next */
export function createPatreonClient(accessToken: string): (path: string) => Promise<PatronData> {
	const timeoutLimit = 10 * SECOND;
	const client = patreon(accessToken);
	client.setStore({ sync() { } });

	return (path: string) => Promise.race([
		delay(timeoutLimit).then(() => { throw new Error('Patreon request timed out'); }),
		client(path),
	]);
}

export async function fetchPatreonData(client: (path: string) => Promise<PatronData>, log: LogMessage): Promise<PatreonData> {
	const campaignData = await client('/current_user/campaigns');
	const rewards = campaignData.rawJson.included
		.filter(x => x.type === 'reward')
		.map<PatreonReward>(x => ({
			id: x.id,
			title: x.attributes.title || '',
			description: x.attributes.description || '',
		}));

	const campaignId = campaignData.rawJson.data[0].id;
	const pledges: PatreonPledge[] = [];
	const queryParams = '&include=patron.null,reward.null&fields%5Bpledge%5D=total_historical_amount_cents,declined_since';
	const query = 'page%5Bcount%5D=100&sort=created';
	let url = `/campaigns/${campaignId}/pledges?${query}`;
	let pages = 0;

	do {
		const pledgeData = await client(`${url}${queryParams}`);
		const pledgeItems = pledgeData.rawJson.data
			.filter(x => x.relationships.patron.data && x.relationships.reward.data)
			.map<PatreonPledge>(x => ({
				user: x.relationships.patron.data.id,
				reward: x.relationships.reward.data.id,
				total: x.attributes.total_historical_amount_cents || 0,
				declinedSince: x.attributes.declined_since || undefined,
			}));

		pledges.push(...pledgeItems);
		url = (pledgeData.rawJson.links.next || '').replace('https://www.patreon.com/api/oauth2/api', '');
		pages++;

		if (pages > 100) {
			throw new Error('Exceeded 100 pages of patreon data');
		}
	} while (url);

	log(`fetched patreon data (pages: ${pages}, pledges: ${pledges.length}, rewards: ${rewards.length})`);

	return lastPatreonData = { pledges, rewards };
}

export const createUpdatePatreonInfo =
	(
		queryAuths: QueryAuths, queryAccounts: QueryAccounts, removeOldSupporters: RemoveOldSupporters,
		updateSupporters: UpdateSupporters, updateTotalPledged: AddTotalPledged
	) =>
		async ({ pledges }: PatreonData, now: Date) => {
			const ids = pledges.map(p => p.user);
			const query = {
				provider: 'patreon',
				openId: { $in: ids },
				account: { $exists: true },
				banned: { $ne: true },
				disabled: { $ne: true },
			};

			const patreonAuths = await queryAuths(query, '_id account openId pledged');
			const accountsWithPatreon = await queryAccounts({ patreon: { $exists: true, $ne: 0 } }, '_id patreon supporterDeclinedSince');
			// removes support from accounts without any non-banned patreon auth
			await removeOldSupporters(patreonAuths, accountsWithPatreon);
			await updateSupporters(patreonAuths, accountsWithPatreon, pledges, now);
			await updateTotalPledged(patreonAuths, pledges);
		};

export const createRemoveOldSupporters =
	(updateAccounts: UpdateAccounts, log: LogAccountMessage) =>
		async (auths: IAuth[], accounts: IAccount[]) => {
			const clear = accounts
				.filter(account => auths.every(auth => !auth.account || !account._id.equals(auth.account)))
				.map(account => account._id);

			clear.forEach(id => log(`${id}`, `removed supporter`));

			await updateAccounts({ _id: { $in: clear } }, {
				$unset: { patreon: 1, supporterDeclinedSince: 1 },
				$push: {
					supporterLog: {
						$each: [{ date: new Date(), message: 'removed supporter' }],
						$slice: -supporterLogLimit,
					},
				},
			});

			await updateAccounts(
				{ supporterDeclinedSince: { $exists: true, $lt: fromNow(-2 * MONTH) } },
				{ $unset: { supporterDeclinedSince: 1 } });
		};

export const createUpdateSupporters =
	(updateAccount: UpdateAccount, log: LogAccountMessage) =>
		async (auths: IAuth[], accountsWithPatreon: IAccount[], pledges: PatreonPledge[], now: Date) => {
			const start = Date.now();
			const pledgesMap = new Map<string, PatreonPledge>();
			const accountsWithPatreonMap = new Map<string, IAccount>();

			for (const pledge of pledges) {
				pledgesMap.set(pledge.user, pledge);
			}

			for (const account of accountsWithPatreon) {
				accountsWithPatreonMap.set(account._id.toString(), account);
			}

			const setup = auths
				.filter(auth => auth.account)
				.map(auth => {
					const accountId = auth.account!.toString();
					const pledge = auth.openId && pledgesMap.get(auth.openId);
					const pledgeFlags = pledge && SUPPORTER_REWARD_IDS[pledge.reward] || PatreonFlags.None;
					const declinedSince = (pledge && pledge.declinedSince) ? new Date(pledge.declinedSince) : undefined;
					const account = accountsWithPatreonMap.get(accountId!);
					const declined = isDeclined(declinedSince, now);
					const patreon = declined ? PatreonFlags.None : pledgeFlags;
					const current = account && account.patreon || 0;
					const declinedChanged = !!account && !datesEqual(account.supporterDeclinedSince, declinedSince);
					const hadPatreon = !!account;

					return {
						account: accountId, patreon, declinedSince, declinedChanged, declined, current, hadPatreon
					};
				});

			const grouped = toPairs(groupBy(setup, x => x.account))
				.map(([account, items]) => {
					const current = max(items.map(i => i.current))!;
					const patreon = max(items.map(i => i.patreon))!;

					return {
						account,
						changed: items.some(i => !i.hadPatreon) || current !== patreon,
						declinedChanged: items.some(i => i.declinedChanged),
						patreon,
						declinedSince: items.map(i => i.declinedSince).find(x => !!x),
						declined: items.some(i => i.declined),
						hadPatreon: items.some(i => i.hadPatreon),
					};
				})
				.filter(({ changed, declinedChanged }) => changed || declinedChanged);

			grouped
				.filter(g => g.changed)
				.map(g => ({ account: g.account, message: supporterMessage(g.patreon, g.declined, g.hadPatreon) }))
				.filter(({ message }) => !!message)
				.forEach(({ account, message }) => log(`${account}`, message!));

			logPatreon(`update supporters (${Date.now() - start}ms) ` +
				`[auths: ${auths.length}, grouped: ${grouped.length}, pledges: ${pledges.length}, ` +
				`accountsWithPatreon: ${accountsWithPatreon.length}]`);

			await Bluebird.map(grouped, ({ account, patreon, declinedSince, changed, declined, hadPatreon }) => {
				const message = changed ? supporterMessage(patreon, declined, hadPatreon) : undefined;

				return updateAccount(account, {
					supporterDeclinedSince: declinedSince,
					...(changed ? { patreon } : {}),
					...(message ? {
						$push: {
							supporterLog: {
								$each: [{ date: new Date(), message }],
								$slice: -supporterLogLimit,
							},
						}
					} : {}),
				});
			}, { concurrency: 4 });
		};

function isDeclined(declinedSince: Date | undefined, now: Date): boolean {
	return !!declinedSince && (
		now.getDate() > declinedDayLimit ||
		(now.getTime() - declinedSince.getTime()) > declinedTimeLimit);
}

function supporterMessage(patreon: PatreonFlags, declined: boolean, hadPatreon: boolean) {
	return patreon ?
		`added supporter (${patreon})` :
		(hadPatreon ? `removed supporter${declined ? ' (declined)' : ''}` : undefined);
}

function datesEqual(a: Date | undefined, b: Date | undefined) {
	return (!a && !b) || (a && b && a.getTime() === b.getTime());
}

export const createAddTotalPledged =
	(updateAuth: UpdateAuth) =>
		async (auths: IAuth[], pledges: PatreonPledge[]) => {
			const setup = auths
				.map(auth => ({ auth, pledge: pledges.find(p => p.user === auth.openId) }))
				.filter(({ auth, pledge }) => pledge && pledge.total !== auth.pledged);

			await Bluebird.map(setup, ({ auth, pledge }) =>
				updateAuth(auth._id, { pledged: pledge!.total }), { concurrency: 4 });
		};
