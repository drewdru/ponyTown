import { assignWith, uniq, uniqBy, clone, mapValues, difference } from 'lodash';
import { toInt, maxDate, minDate, compareDates } from '../../common/utils';
import { updateCharacterCount, checkIfNotAdmin } from '../accountUtils';
import {
	Account, Auth, Character, Event, IAccount, SupporterInvite, findAccountSafe, MongoUpdate, ID, FriendRequest,
	findFriendIds, findHidesForMerge, HideRequest
} from '../db';
import { accountChanged, accountMerged, RemovedDocument } from '../internal';
import { system } from '../logger';
import { makeQueued } from '../utils/taskQueue';
import {
	AccountBase, MergeData, MergeAccountData, AccountState, AccountFlags, MergeHideData
} from '../../common/adminInterfaces';
import { kickFromAllServers } from './admin';

function mergeBan(a: number | undefined, b: number | undefined): number {
	return (a === -1 || b === -1) ? -1 : Math.max(a || 0, b || 0);
}

function mergeLists<T extends { date: Date; }>(a: T[] | undefined, b: T[] | undefined, limit: number) {
	return [...(a || []), ...(b || [])].sort((a, b) => compareDates(a.date, b.date)).slice(-limit);
}

async function findAccounts(id: ID, withId: ID, allowAdmin = false) {
	const accounts = await Account.find({ _id: { $in: [id, withId] } })
		.populate('auths', 'name')
		.populate('characters', 'name')
		.exec();

	if (!allowAdmin) {
		accounts.forEach(a => checkIfNotAdmin(a, `merge: ${a._id}`));
	}

	const account = accounts.find(a => a._id.toString() === id);
	const merge = accounts.find(a => a._id.toString() === withId);

	if (accounts.length !== 2 || !account || !merge) {
		throw new Error('Account does not exist');
	}

	return { account, merge };
}

function dumpData(account: IAccount, friends: string[], hides: MergeHideData[]): MergeAccountData {
	const {
		name, note, flags, counters = {}, auths = [], characters = [], ignores = [], emails = [], state = {},
		birthdate,
	} = account;

	return {
		name,
		note,
		flags,
		state,
		birthdate,
		emails: emails.slice(),
		ignores: ignores.slice(),
		counters: clone(counters),
		auths: auths.map(({ _id, name }) => ({ id: _id.toString(), name })),
		characters: characters.map(({ _id, name }) => ({ id: _id.toString(), name })),
		settings: account.settings,
		friends: friends.slice(),
		hides: hides.slice(),
	};
}

function mergeStates(a: AccountState | undefined, b: AccountState | undefined) {
	if (a && b) {
		return {
			...b,
			...a,
			gifts: toInt(a.gifts) + toInt(b.gifts),
			candies: toInt(a.candies) + toInt(b.candies),
			clovers: toInt(a.clovers) + toInt(b.clovers),
			toys: toInt(a.toys) | toInt(b.toys),
		};
	} else {
		return a || b;
	}
}

async function merge(
	id: string, withId: string, reason: string, removedDocument: RemovedDocument, allowAdmin = false,
	creatingDuplicates = false
) {
	const start = Date.now();

	const [{ account, merge }, accountFriends, mergeFriends, accountHides, mergeHides] = await Promise.all([
		findAccounts(id, withId, allowAdmin),
		findFriendIds(id),
		findFriendIds(withId),
		findHidesForMerge(id),
		findHidesForMerge(withId),
	]);

	const data: MergeData = {
		account: dumpData(account, accountFriends, accountHides),
		merge: dumpData(merge, mergeFriends, mergeHides),
	};

	const origins = uniqBy([...(account.origins || []), ...(merge.origins || [])], x => x.ip);
	const ignores = uniq([...(account.ignores || []), ...(merge.ignores || [])]);
	const emails = uniq([...(account.emails || []), ...(merge.emails || [])]);
	const note = `${account.note || ''}\n${merge.note || ''}`.trim();
	const createdAt = minDate(account.createdAt, merge.createdAt);
	const lastVisit = maxDate(account.lastVisit, merge.lastVisit);
	const ban = mergeBan(account.ban, merge.ban);
	const shadow = mergeBan(account.shadow, merge.shadow);
	const mute = mergeBan(account.mute, merge.mute);
	const patreon = Math.max(toInt(account.patreon), toInt(merge.patreon));
	const counters = assignWith(account.counters || {}, merge.counters || {}, (a, b) => (a | 0) + (b | 0));
	const creatingDuplicatesFlag = creatingDuplicates ? AccountFlags.CreatingDuplicates : 0;
	const flags = account.flags | merge.flags | creatingDuplicatesFlag;
	const supporter = toInt(account.supporter) | toInt(merge.supporter);
	const birthdate = account.birthdate || merge.birthdate;
	const supporterLog = mergeLists(account.supporterLog, merge.supporterLog, 10);
	const supporterTotal = toInt(account.supporterTotal) + toInt(merge.supporterTotal);
	const banLog = mergeLists(account.banLog, merge.banLog, 10);
	const merges = mergeLists(account.merges, merge.merges, 20);
	const state = mergeStates(account.state, merge.state);
	const alert = account.alert || merge.alert;
	merges.push({ id: withId, name: merge.name, date: new Date(), reason, data });

	const update: Partial<AccountBase<string>> = {
		origins, ignores, emails, note, lastVisit, ban, shadow, mute, flags, counters, patreon, supporter, merges,
		createdAt, supporterLog, supporterTotal, banLog, state, alert, birthdate,
	};

	await Promise.all([
		Account.updateOne({ _id: account._id }, update).exec(),
		Account.updateMany({ ignores: { $exists: true, $ne: [], $in: [withId] } }, { $addToSet: { ignores: id } }).exec()
			.then(() => Account.updateMany({ ignores: { $exists: true, $ne: [], $in: [withId] } }, { $pull: { ignores: withId } }).exec()),
		Auth.updateMany({ account: merge._id }, { account: account._id }).exec(),
		Event.updateMany({ account: merge._id }, { account: account._id }).exec(),
		Character.updateMany({ account: merge._id }, { account: account._id }).exec(),
		Promise.all([
			SupporterInvite.updateMany({ source: merge._id }, { source: account._id }).exec(),
			SupporterInvite.updateMany({ target: merge._id }, { target: account._id }).exec(),
		]).then(() => SupporterInvite.remove({ target: account._id, source: account._id }).exec()),
		Promise.all([
			FriendRequest.updateMany({ source: merge._id }, { source: account._id }).exec(),
			FriendRequest.updateMany({ target: merge._id }, { target: account._id }).exec(),
		]).then(() => FriendRequest.remove({ target: account._id, source: account._id }).exec()),
		Promise.all([
			HideRequest.updateMany({ source: merge._id }, { source: account._id }).exec(),
			HideRequest.updateMany({ target: merge._id }, { target: account._id }).exec(),
		]).then(() => HideRequest.remove({ target: account._id, source: account._id }).exec()),
	]);

	await removeDuplicateFriendRequests(id);
	await merge.remove();
	await kickFromAllServers(withId);
	await removedDocument('accounts', withId);
	await updateCharacterCount(id);
	await accountMerged(id, withId);
	await accountChanged(id);

	system(account._id, `Merged ${account.name} with ${merge.name} [${merge._id}] (${reason}) (${Date.now() - start}ms)`);
}

async function removeDuplicateFriendRequests(id: string) {
	const friendRequests = await FriendRequest.find({ $or: [{ source: id }, { target: id }] }).exec();
	const checked = new Set<string>();
	const removeRequests: ID[] = [];

	for (const request of friendRequests) {
		const friendId = request.source.toString() === id ? request.target.toString() : request.source.toString();

		if (checked.has(friendId)) {
			removeRequests.push(request._id);
		} else {
			checked.add(friendId);
		}
	}

	if (removeRequests.length) {
		await FriendRequest.remove({ _id: { $in: removeRequests } }).exec();
	}
}

export async function split(
	accountId: string, mergeId: string | undefined, split: MergeAccountData, keep: MergeAccountData, reason: string
) {
	const start = Date.now();
	const account = await findAccountSafe(accountId);
	const unmerge = await Account.create({
		name: split.name,
		note: split.note,
		flags: split.flags || 0,
		emails: split.emails,
		state: split.state,
		ignores: split.ignores,
		counters: split.counters,
		birthdate: split.birthdate,
		settings: split.settings,
	});

	const accountUpdate: MongoUpdate<IAccount> = {
		note: `${account.note}\nsplit: [${unmerge._id}]`.trim(),
		state: keep.state,
	};

	const removeIgnores = difference(split.ignores, account.ignores || []);

	if (removeIgnores.length) {
		accountUpdate.$pull = { ignores: removeIgnores };
	}

	const newCounters = split.counters || {};

	if (Object.keys(newCounters).length > 0) {
		const oldCounters = account.counters || {} as any;
		const counters = mapValues(newCounters, (value, key) => Math.max(0, toInt(oldCounters[key]) - toInt(value)));
		accountUpdate.counters = counters;
	}

	const authIds = split.auths.map(x => x.id);

	await Promise.all([
		Auth.updateMany({ _id: { $in: authIds } }, { account: unmerge._id, disabled: false }).exec(),
		Character.updateMany({ _id: { $in: split.characters.map(x => x.id) } }, { account: unmerge._id }).exec(),
		Account.updateOne({ _id: account._id }, accountUpdate).exec(),
	]);

	// friends

	const friendsToRemove = [...(keep.friends || []), ...(split.friends || [])];

	await FriendRequest.deleteMany({
		$or: [
			{ target: account._id, source: { $in: friendsToRemove } },
			{ source: account._id, target: { $in: friendsToRemove } },
		],
	}).exec();

	await FriendRequest.create([
		...(keep.friends || []).map(id => ({ source: account._id, target: id })),
		...(split.friends || []).map(id => ({ source: unmerge._id, target: id }))
	]);

	// hides

	const hidesToRemove = [...(keep.hides || []), ...(split.hides || [])].map(hide => hide.id);

	await HideRequest.deleteMany({
		$or: [
			{ source: account._id, target: { $in: hidesToRemove } },
		],
	}).exec();

	await HideRequest.create([
		...(keep.hides || []).map(hide => ({ source: account._id, target: hide.id, name: hide.name, date: new Date(hide.date) })),
		...(split.hides || []).map(hide => ({ source: unmerge._id, target: hide.id, name: hide.name, date: new Date(hide.date) }))
	]);

	// other

	if (mergeId) {
		await Account.updateOne({ _id: account._id, 'merges._id': mergeId }, { 'merges.$.split': true }).exec();
	}

	await Promise.all([
		updateCharacterCount(accountId),
		updateCharacterCount(unmerge._id),
		accountChanged(accountId),
	]);

	system(account._id, `Split off ${unmerge.name} [${unmerge._id}] (${reason}) (${Date.now() - start}ms)`);
}

export const mergeAccounts = makeQueued(merge);
export const splitAccounts = makeQueued(split);
