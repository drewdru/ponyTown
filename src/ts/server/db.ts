import { model, Schema, Types, Document, Query } from 'mongoose';
import {
	TimestampsBase, EventBase, CharacterBase, AccountBase, AuthBase, OriginBase, OriginInfoBase, CharacterState,
	SupporterInviteBase, FriendRequestBase, HideRequestBase, MergeHideData
} from '../common/adminInterfaces';
import { logger } from './logger';
import { isAdmin } from '../common/accountUtils';
import { FriendData } from '../common/interfaces';
import { replaceEmojis } from '../client/emoji';
import { filterForbidden } from './characterUtils';
import { filterName } from '../common/swears';

//set('debug', true); // debug mongoose

export interface Doc extends Document {
	updatedAt: Date;
}

export interface IOriginInfo extends OriginInfoBase { }
export interface ITimestamps extends TimestampsBase { }
export interface IAuth extends AuthBase<Types.ObjectId>, Doc { }
export interface IOrigin extends OriginBase, Doc { }
export interface IEvent extends EventBase<Types.ObjectId>, Doc { }
export interface ISupporterInvite extends SupporterInviteBase<Types.ObjectId>, Doc { }
export interface IFriendRequest extends FriendRequestBase<Types.ObjectId>, Doc { }
export interface IHideRequest extends HideRequestBase<Types.ObjectId>, Doc { }

export interface ICharacter extends CharacterBase<Types.ObjectId>, Doc {
	auth?: IAuth;
}

export interface IAccount extends AccountBase<Types.ObjectId>, Doc {
	auths?: IAuth[];
	characters?: ICharacter[];
}

export interface ISession extends Doc {
	session: string;
}

// schemas

const originInfo = {
	ip: String,
	country: String,
	last: Date,
};

const mergeInfo = {
	id: String,
	name: String,
	//code: Number,
	date: Date,
	reason: String,
	data: Object,
	split: Boolean,
};

const logEntry = {
	message: String,
	date: Date,
};

const authSchema = new Schema({
	account: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
	openId: String,
	provider: String,
	name: String,
	url: String,
	emails: [String],
	disabled: Boolean,
	banned: Boolean,
	pledged: Number,
	lastUsed: Date,
}, { timestamps: true });

authSchema.index({ updatedAt: 1 });
authSchema.index({ openId: 1, provider: 1 }, { unique: true });

const bannedMuted = {
	mute: Number,
	shadow: Number,
	ban: Number,
};

const originSchema = new Schema({
	ip: { type: String, index: true },
	country: String,
	...bannedMuted,
}, { timestamps: true });

originSchema.index({ updatedAt: 1 });

const accountSchema = new Schema({
	name: String,
	birthdate: Date,
	birthyear: Number,
	// code: Number,
	emails: { type: [String], index: true },
	lastVisit: Date,
	lastUserAgent: String,
	lastBrowserId: String,
	lastOnline: Date,
	lastCharacter: Schema.Types.ObjectId,
	roles: [String],
	origins: [originInfo],
	note: String,
	noteUpdated: Date,
	ignores: [String],
	// friends: [{ type: Schema.Types.ObjectId, unique: true, ref: 'Account' }],
	flags: Number,
	characterCount: { type: Number, default: 0 },
	// NOTE: use account.markModified('settings') if changed nested field
	settings: { type: Schema.Types.Mixed, default: () => ({}) },
	counters: { type: Schema.Types.Mixed, default: () => ({}) },
	patreon: Number,
	supporter: Number,
	supporterLog: [logEntry],
	supporterTotal: Number,
	supporterDeclinedSince: Date,
	merges: [mergeInfo],
	banLog: [logEntry],
	mute: Number,
	shadow: Number,
	ban: Number,
	// auths: [{ type: Schema.Types.ObjectId, ref: 'Auth' }],
	state: Object,
	alert: Object,
	savedMap: String,
}, { timestamps: true });

accountSchema.virtual('auths', {
	ref: 'Auth',
	localField: '_id',
	foreignField: 'account',
});

accountSchema.virtual('characters', {
	ref: 'Character',
	localField: '_id',
	foreignField: 'account',
});

accountSchema.index({ updatedAt: 1 });

const characterSchema = new Schema({
	account: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
	site: { type: Schema.Types.ObjectId, ref: 'Auth' },
	name: { type: String, index: true },
	desc: String,
	tag: String,
	info: String,
	flags: { type: Number, default: 0 },
	lastUsed: { type: Date, index: true },
	creator: String,
	state: Object,
}, { timestamps: true });

characterSchema.index({ updatedAt: 1 });
characterSchema.index({ createdAt: 1 });

const eventSchema = new Schema({
	account: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
	pony: Schema.Types.ObjectId,
	type: String,
	server: String,
	message: String,
	desc: String,
	origin: originInfo,
	count: { type: Number, default: 1 },
}, { timestamps: true });

eventSchema.index({ updatedAt: 1 });

const supporterInviteSchema = new Schema({
	source: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
	target: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
	name: String,
	info: String,
	active: Boolean,
}, { timestamps: true });

const friendRequestSchema = new Schema({
	source: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
	target: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
});

const hideRequestSchema = new Schema({
	source: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
	target: { type: Schema.Types.ObjectId, index: true, ref: 'Account' },
	name: String,
	date: Date,
});

const sessionSchema = new Schema({
	_id: String,
	session: String,
});

// models

export const Auth = model<IAuth>('Auth', authSchema);
export const Event = model<IEvent>('Event', eventSchema);
export const Origin = model<IOrigin>('Origin', originSchema);
export const Session = model<ISession>('session', sessionSchema);
export const Character = model<ICharacter>('Character', characterSchema);

accountSchema.post('remove', function (doc: Document) {
	Promise.all([
		Character.deleteMany({ account: doc._id }).exec(),
		Event.deleteMany({ account: doc._id }).exec(),
		Auth.deleteMany({ account: doc._id }).exec(),
		FriendRequest.deleteMany({ $or: [{ target: doc._id }, { source: doc._id }] }).exec(),
		HideRequest.deleteMany({ $or: [{ target: doc._id }, { source: doc._id }] }).exec(),
	]).catch(logger.error);
});

export const Account = model<IAccount>('Account', accountSchema);
export const SupporterInvite = model<ISupporterInvite>('SupporterInvite', supporterInviteSchema);
export const FriendRequest = model<IFriendRequest>('FriendRequest', friendRequestSchema);
export const HideRequest = model<IHideRequest>('HideRequest', hideRequestSchema);

// helpers

export type ID = Types.ObjectId | string;

export interface MongoQueryExpr<T> {
	$exists?: boolean;
	$ne?: T;
	$in?: T | T[];
	$gt?: T;
	$lt?: T;
	$not?: MongoQueryExpr<T>;
	$size?: number;
	$regex?: RegExp;
}

export interface MongoUpdateExprField<T> {
	$inc?: any;
	$dec?: any;
	$pull?: any;
	$push?: any;
	$unset?: {
		[P in keyof T]?: any;
	};
}

export interface MongoUpdateExpr<T> extends MongoUpdateExprField<T> {
	$addToSet?: any;
}

export type MongoQuery<T> = {
	[P in keyof T]?: T[P] | MongoQueryExpr<T[P]>;
};

export type MongoUpdate<T> = {
	[P in keyof T]?: T[P] | MongoUpdateExprField<T[P]>;
} & MongoUpdateExpr<T>;

export function iterate<T>(query: Query<T>, onData: (doc: T) => void) {
	return new Promise<void>(resolve => {
		query.cursor()
			.on('data', onData)
			.on('end', resolve);
	});
}

function throwOnEmpty<T>(message: string): (item: T | undefined) => T {
	return item => {
		if (item) {
			return item;
		} else {
			throw new Error(message);
		}
	};
}

export function nullToUndefined<T>(item: T | null): T | undefined {
	return item === null ? undefined : item;
}

export const checkCharacterExists = throwOnEmpty<ICharacter>('Character does not exist');
export const checkAccountExists = throwOnEmpty<IAccount>('Account does not exist');

// characters

export type CreateCharacter = (account: IAccount) => ICharacter;
export type CharacterCount = (accountId: ID) => Promise<number>;
export type FindCharacter = (characterId: ID, accountId: ID) => Promise<ICharacter | undefined>;
export type FindCharacterSafe = (characterId: ID, accountId: ID) => Promise<ICharacter>;
export type FindCharacters = (accountId: ID, fields?: string) => Promise<ICharacter[]>;
export type UpdateCharacterState = (characterId: ID, serverName: string, state: CharacterState) => Promise<void>;
export type QueryCharacter = (query: MongoQuery<ICharacter>, fields?: string) => Promise<ICharacter | undefined>;

export function createCharacter(account: IAccount) {
	return new Character({ account: account._id, creator: `${account.name} [${account._id}]` });
}

export function characterCount(account: ID): Promise<number> {
	return Character.countDocuments({ account }).exec();
}

export function findCharacter(pony: ID, account: ID): Promise<ICharacter | undefined> {
	return Character.findOne({ _id: pony, account }).exec().then(nullToUndefined);
}

export function findCharacterSafe(pony: ID, accountId: ID): Promise<ICharacter> {
	return findCharacter(pony, accountId)
		.then(checkCharacterExists);
}

export function findCharacterById(id: string): Promise<ICharacter | undefined> {
	return Character.findById(id).exec().then(nullToUndefined);
}

export const findAllCharacters: FindCharacters = (account, fields) =>
	Character.find({ account }, fields).lean().exec();

export function findLatestCharacters(account: ID, count: number): Promise<ICharacter[]> {
	return Character.find({ account })
		.sort('-lastUsed')
		.limit(count)
		.exec();
}

export function removeCharacter(id: ID, account: ID): Promise<ICharacter | undefined> {
	return Character.findOneAndRemove({ _id: id, account }).exec().then(nullToUndefined);
}

export const updateCharacterState: UpdateCharacterState = (characterId, serverName, state) =>
	Character.updateOne({ _id: characterId }, { [`state.${serverName}`]: state }).exec().then(nullToUndefined);

export const queryCharacter: QueryCharacter = (query, fields) =>
	Character.findOne(query, fields).exec() as any;

// auths

export type FindAuth = (authId: ID, accountId: ID, fields?: string) => Promise<IAuth | undefined>;
export type FindAuths = (accountId: ID, fields?: string) => Promise<IAuth[]>;
export type CountAuths = (accountId: ID) => Promise<number>;
export type QueryAuths = (query: MongoQuery<IAuth>, fields?: string) => Promise<IAuth[]>;
export type UpdateAuth = (authId: ID, update: MongoUpdate<IAuth>) => Promise<void>;

export const findAuthByOpenId = (openId: string, provider: string): Promise<IAuth | undefined> =>
	Auth.findOne({ openId, provider }).exec().then(nullToUndefined);

export const findAuthByEmail = (emails: string[]): Promise<IAuth | undefined> =>
	Auth.findOne({ emails: { $in: emails } }).exec().then(nullToUndefined);

export const findAuth: FindAuth = (auth, account, fields) =>
	Auth.findOne({ _id: auth, account }, fields).exec().then(nullToUndefined);

export const findAllAuths: FindAuths = (account, fields) =>
	Auth.find({ account, fields }).exec();

export const findAllVisibleAuths: FindAuths = (account, fields) =>
	Auth.find({ account, disabled: { $ne: true }, banned: { $ne: true } }, fields).lean().exec();

export const countAllVisibleAuths: CountAuths = (account) =>
	Auth.find({ account, disabled: { $ne: true }, banned: { $ne: true } }).countDocuments().exec();

export const queryAuths: QueryAuths = (query, fields) =>
	Auth.find(query, fields).lean().exec();

export const updateAuth: UpdateAuth = (id, update) =>
	Auth.updateOne({ _id: id }, update).exec();

// accounts

export type FindAccountSafe = (accountId: ID, projection?: string) => Promise<IAccount>;
export type UpdateAccount = (accountId: ID, update: MongoUpdate<IAccount>) => Promise<void>;
export type UpdateAccounts = (query: MongoQuery<IAccount>, update: MongoUpdate<IAccount>) => Promise<void>;
export type QueryAccounts = (query: MongoQuery<IAccount>, fields?: string) => Promise<IAccount[]>;
export type QueryAccount = (query: MongoQuery<IAccount>, fields?: string) => Promise<IAccount | undefined>;

export const findAccount = (account: ID, projection?: string): Promise<IAccount | undefined> =>
	Account.findById(account, projection).exec().then(nullToUndefined);

export function checkIfAdmin(account: ID): Promise<boolean> {
	return Account.findOne({ _id: account }, 'roles').lean().exec()
		.then(a => a && isAdmin(a));
}

export function findAccountSafe(account: ID, projection?: string): Promise<IAccount> {
	return findAccount(account, projection)
		.then(checkAccountExists);
}

export const updateAccount: UpdateAccount = (accountId, update) =>
	Account.updateOne({ _id: accountId }, update).exec();

export const updateAccounts: UpdateAccounts = (query, update) =>
	Account.updateMany(query, update).exec();

export const queryAccounts: QueryAccounts = (query, fields) =>
	Account.find(query, fields).lean().exec();

export const queryAccount: QueryAccount = (query, fields) =>
	Account.findOne(query, fields).exec().then(nullToUndefined);

// supporter invites

export type HasActiveSupporterInvites = (accountId: ID) => Promise<boolean>;

export const hasActiveSupporterInvites: HasActiveSupporterInvites = (accountId) =>
	SupporterInvite.countDocuments({ target: accountId, active: true }).exec()
		.then(count => count > 0);

// friend requests

export async function findFriendIds(accountId: ID) {
	const accountIdString = accountId.toString();

	const friendRequests = await FriendRequest
		.find({ $or: [{ source: accountId }, { target: accountId }] }, 'source target')
		.lean()
		.exec();

	const friendIds = friendRequests
		.map((f: any) => f.source.toString() === accountIdString ? f.target.toString() : f.source.toString());

	return friendIds;
}

export async function findFriends(accountId: ID, withCharacters: boolean): Promise<FriendData[]> {
	const friendIds = await findFriendIds(accountId);
	const accounts: IAccount[] = await Account.find({ _id: { $in: friendIds } }, '_id name lastOnline lastCharacter').lean().exec();
	let characters: ICharacter[] = [];

	if (withCharacters) {
		const characterIds = accounts.map(a => a.lastCharacter).filter(id => id);
		characters = await Character.find({ _id: { $in: characterIds } }, '_id name info').lean().exec();
	}

	return accounts.map(a => {
		const characterId = a.lastCharacter && a.lastCharacter.toString();
		const character = characterId && characters.find(c => c._id.toString() === characterId);
		const name = character && filterForbidden(replaceEmojis(character.name));
		const nameFiltered = name && filterName(name);

		return {
			accountId: a._id.toString(),
			accountName: a.name,
			name,
			pony: character && character.info,
			nameBad: name !== nameFiltered,
		};
	});
}

// hide requests

export async function findHideIds(accountId: ID) {
	const hideRequests: IHideRequest[] = await HideRequest.find({ source: accountId }, 'target').lean().exec();
	return hideRequests.map(f => f.target.toString());
}

export async function findHideIdsRev(accountId: ID) {
	const hideRequests: IHideRequest[] = await HideRequest.find({ target: accountId }, 'source').lean().exec();
	return hideRequests.map(f => f.source.toString());
}

export async function findHidesForMerge(accountId: ID): Promise<MergeHideData[]> {
	const hideRequests: IHideRequest[] = await HideRequest
		.find({ source: accountId }, '_id name date')
		.lean()
		.exec();

	return hideRequests.map(f => ({
		id: f._id.toString(),
		name: f.name,
		date: f.date.toString(),
	}));
}

export async function addHide(source: ID, target: ID, name: string) {
	if (source.toString() === target.toString())
		return;

	const existing = await HideRequest.findOne({ source, target }, '_id').lean().exec();

	if (!existing) {
		await HideRequest.create({ source, target, name, date: new Date() });
	}
}
