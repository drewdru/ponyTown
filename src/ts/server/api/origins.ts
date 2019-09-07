import * as Bluebird from 'bluebird';
import { difference } from 'lodash';
import { DAY } from '../../common/constants';
import { fromNow } from '../../common/utils';
import { Account, AccountOrigins, OriginStats, OriginInfo, Origin, ClearOrignsOptions } from '../../common/adminInterfaces';
import { updateAccount } from '../db';
import { AdminService } from '../services/adminService';

export async function getOriginStats(accounts: Account[]): Promise<OriginStats> {
	let totalOrigins = 0;
	let totalOriginsIP4 = 0;
	let totalOriginsIP6 = 0;

	const distribution: number[] = [];
	const uniques = new Set<string>();
	const duplicates = new Set<string>();

	for (const account of accounts) {
		if (account.origins) {
			for (const origin of account.origins) {
				totalOrigins++;

				if (uniques.has(origin.ip)) {
					duplicates.add(origin.ip);
				} else {
					uniques.add(origin.ip);
				}

				if (origin.ip.indexOf(':') !== -1) {
					totalOriginsIP6++;
				} else {
					totalOriginsIP4++;
				}
			}
		}

		const count = account.origins ? account.origins.length : 0;

		while (distribution.length <= count) {
			distribution.push(0);
		}

		distribution[count]++;
	}

	const uniqueOrigins = uniques.size;
	const duplicateOrigins = duplicates.size;
	const singleOrigins = uniqueOrigins - duplicateOrigins;

	return {
		uniqueOrigins, duplicateOrigins, singleOrigins, totalOrigins, totalOriginsIP4, totalOriginsIP6, distribution
	};
}

export function removeAllOrigins(service: AdminService, accountId: string) {
	service.removeOriginsFromAccount(accountId);
	return updateAccount(accountId, { origins: [] });
}

export function removeOrigins(service: AdminService, accountId: string, ips: string[]) {
	service.removeOriginsFromAccount(accountId, ips);
	return updateAccount(accountId, { $pull: { origins: { ip: { $in: ips } } } });
}

export function addOrigin(accountId: string, { ip, country }: OriginInfo) {
	return updateAccount(accountId, { $push: { origins: { ip, country, last: new Date() } } });
}

export async function clearOriginsForAccount(service: AdminService, accountId: string, options: ClearOrignsOptions) {
	const account = service.accounts.get(accountId);

	if (account) {
		const { ips } = getOriginsToRemove(account, options);
		await removeOrigins(service, accountId, ips);
	}
}

export async function clearOriginsForAccounts(service: AdminService, accounts: string[], options: ClearOrignsOptions) {
	await Bluebird.map(accounts, id => clearOriginsForAccount(service, id, options), { concurrency: 4 });
}

export async function clearOrigins(
	service: AdminService, count: number, andHigher: boolean, options: ClearOrignsOptions
) {
	const origins = service.accounts.items
		.filter(a => a.originsRefs && (andHigher ? a.originsRefs.length >= count : a.originsRefs.length === count))
		.map(a => getOriginsToRemove(a, options))
		.filter(({ ips }) => !!ips.length);

	await Bluebird.map(origins, o => removeOrigins(service, o.accountId, o.ips), { concurrency: 4 });
}

const isBanned = (origin: Origin) => origin.ban || origin.mute || origin.shadow;

function getOriginsToRemove(account: Account, { old, singles, trim, veryOld, country }: ClearOrignsOptions): AccountOrigins {
	const date = fromNow((veryOld ? -90 : -14) * DAY).getTime();
	const originsRefs = account.originsRefs || [];
	const filtered = country ?
		originsRefs.filter(({ origin }) => origin.country === country) :
		originsRefs.filter(({ last, origin }) => {
			return (!old || (!last || last.getTime() < date))
				&& (!singles || origin.accounts!.length === 1)
				&& !isBanned(origin);
		});

	const ips = filtered.map(({ origin }) => origin.ip);

	if (trim) {
		ips.push(...difference(originsRefs.map(({ origin }) => origin.ip), ips).slice(10));
	}

	return { accountId: account._id, ips };
}
