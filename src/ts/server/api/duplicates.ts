import { groupBy, uniq, compact } from 'lodash';
import {
	duplicatesCollector, emailName, compareDuplicates, getIdsFromNote, createDuplicateResult
} from '../../common/adminUtils';
import { Account, Origin, DuplicatesInfo, DuplicateResult } from '../../common/adminInterfaces';
import { HOUR } from '../../common/constants';
import { DuplicateInfoEntry } from '../../common/adminInterfaces';
import { Account as DBAccount, Character, ICharacter, IAccount } from '../db';
import { removeItem, includes, flatten } from '../../common/utils';
import { AdminService } from '../services/adminService';

// get duplicate entries

const DUPLICATE_TIMEOUT = 1 * HOUR;

let duplicateEntries: string[] | undefined = undefined;
let duplicateTimestamp = 0;

export async function getDuplicateEntries(accounts: Account[], force: boolean) {
	if (!duplicateEntries || force || (Date.now() - duplicateTimestamp) > DUPLICATE_TIMEOUT) {
		duplicateTimestamp = Date.now();
		duplicateEntries = [
			...getDuplicateEmails(accounts),
			// ...getDuplicateAuths(accounts),
		];
	}

	return duplicateEntries;
}

export function getDuplicateEmails(accounts: Account[]) {
	const duplicates: string[] = [];
	const collect = duplicatesCollector(duplicates);
	accounts.forEach(a => a.emails !== undefined && a.emails.forEach(collect));
	return duplicates;
}

export function getDuplicateAuths(accounts: Account[]) {
	const duplicates: string[] = [];
	const collect = duplicatesCollector(duplicates);
	accounts.forEach(a => a.auths !== undefined && a.auths.forEach(a => a.url && collect(a.url)));
	return duplicates;
}

// get duplicate info

export async function getDuplicateInfo(accountId: string, otherAccounts: string[]): Promise<DuplicateInfoEntry[]> {
	const ids = [accountId, ...otherAccounts];
	const [chars, accounts] = await Promise.all([
		Character.find({ account: ids }, 'account name').lean().exec() as Promise<ICharacter[]>,
		DBAccount.find({ _id: ids }, '_id lastUserAgent').lean().exec() as Promise<IAccount[]>,
	]);

	chars.forEach(c => c.name = c.name.toLowerCase());
	const groups = groupBy(chars, c => c.account);
	const account = accounts.find(a => a._id.toString() === accountId);
	const userAgent = account && account.lastUserAgent || '';

	return otherAccounts.map(id => {
		const account = accounts.find(a => a._id.toString() === id);

		return {
			account: id,
			userAgent: (account && userAgent && account.lastUserAgent === userAgent) ? userAgent : '',
			ponies: getDuplicateNames(groups[accountId], groups[id]),
		};
	});
}

function getDuplicateNames(mine: ICharacter[] = [], others: ICharacter[] = []): string[] {
	return uniq(mine.filter(a => others.some(b => a.name === b.name)).map(c => c.name));
}

// get all duplicates

export async function getAllDuplicatesQuickInfo(service: AdminService, accountId: string): Promise<DuplicatesInfo> {
	const duplicates = await getAllDuplicates(service, accountId);

	return {
		generatedAt: Date.now(),
		count: duplicates.length,
		name: duplicates.some(d => !!d.name),
		emails: duplicates.some(d => !!d.emails),
		browserId: duplicates.some(d => !!d.browserId),
		perma: duplicates.some(d => !!d.perma),
	};
}

export async function getAllDuplicatesWithInfo(service: AdminService, accountId: string) {
	const duplicates = await getAllDuplicates(service, accountId);
	const accountIds = duplicates.map(x => x.account);
	const duplicatesInfo = await getDuplicateInfo(accountId, accountIds);

	duplicatesInfo.forEach(({ account, ponies, userAgent }) => {
		const duplicate = duplicates.find(d => d.account === account);

		if (duplicate) {
			duplicate.ponies = ponies;
			duplicate.userAgent = userAgent;
		}
	});

	duplicates.forEach(d => d.ponies = d.ponies || []);

	return duplicates;
}

async function getAllDuplicates(service: AdminService, accountId: string): Promise<DuplicateResult[]> {
	const account = service.accounts.get(accountId);

	if (!account) {
		return [];
	} else {
		return uniq([
			...getDuplicatesByNote(service, account),
			...getDuplicatesByEmail(service, account),
			...getDuplicatesByBrowserId(service, account),
			...getDuplicates(account),
		])
			.filter(a => a !== account)
			.map(a => createDuplicateResult(a, account))
			.sort(compareDuplicates)
			.slice(0, 50);
	}
}

function getDuplicates(account: Account) {
	const accounts: Account[] = [];
	const origins: Origin[] = [];
	removeItem(accounts, account);
	collectDuplicates(accounts, origins, account, 3);
	return accounts;
}

function getDuplicatesByNote(service: AdminService, account: Account) {
	const linkedTo = compact(getIdsFromNote(account.note).map(id => service.accounts.get(id)));
	const linkedFrom = service.getAccountsByNoteRef(account._id);
	return uniqueOtherAccounts([...linkedTo, ...linkedFrom], account);
}

function getDuplicatesByEmail(service: AdminService, account: Account) {
	const accounts = (account.emails || [])
		.map(emailName)
		.map(name => service.getAccountsByEmailName(name));
	return uniqueOtherAccounts(flatten(accounts), account);
}

function getDuplicatesByBrowserId(service: AdminService, account: Account) {
	const browserId = account.lastBrowserId;
	const accounts = browserId && service.getAccountsByBrowserId(browserId) || [];
	return uniqueOtherAccounts(accounts, account);
}

function uniqueOtherAccounts(accounts: Account[], exclude: Account) {
	return uniq(accounts.filter(a => a !== exclude));
}

function collectDuplicates(accounts: Account[], origins: Origin[], account: Account, level: number) {
	if (level > 0 && !includes(accounts, account)) {
		accounts.push(account);
		account.originsRefs!.forEach(o => {
			if (!includes(origins, o.origin)) {
				origins.push(o.origin);

				if (o.origin.accounts) {
					o.origin.accounts.forEach(a => collectDuplicates(accounts, origins, a, level - 1));
				}
			}
		});
	}
}

// unused

export function getDuplicateEmailNames(accounts: Account[]) {
	const set = new Set();

	return uniq(accounts.reduce<string[]>((duplicates, a) => {
		if (a.emails !== undefined && a.emails.length > 0) {
			const names = a.emails.map(e => e.replace(/@.+$/, ''));
			duplicates.push(...names.filter(name => set.has(name)));
			names.forEach(name => set.add(name));
		}

		return duplicates;
	}, []));
}
