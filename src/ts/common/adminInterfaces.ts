import {
	PonyInfo, AccountSettings, AccountData, PonyObject, AccountCounters, ServerFeatureFlags, Dict, Subscription
} from './interfaces';

export const ITEM_LIMIT = 1000;

export const ROLES = ['superadmin', 'admin', 'mod', 'dev'];

export const SERVER_LABELS: { [key: string]: string; } = {
	'dev': 'badge-test',
	'test': 'badge-test',
	'main': 'badge-none',
	'main-ru': 'badge-none',
	'safe': 'badge-success',
	'safe-ru': 'badge-success',
	'safe-pr': 'badge-success',
	'safe-sp': 'badge-success',
};

export const enum Suspicious {
	No,
	Yes,
	Very,
}

export const enum CharacterFlags {
	None = 0,
	BadCM = 1,
	HideSupport = 4,
	RespawnAtSpawn = 8,
	ForbiddenName = 16,
}

// NOTE: also update createLoginServerStatus() (internal-login.ts)
export interface GeneralSettings {
	isPageOffline?: boolean;

	canCreateAccounts?: boolean;
	blockWebView?: boolean;
	reportPotentialDuplicates?: boolean;
	autoMergeDuplicates?: boolean;

	suspiciousNames?: string;
	suspiciousPonies?: string;
	suspiciousMessages?: string;
	suspiciousSafeMessages?: string;
	suspiciousSafeWholeMessages?: string;
	suspiciousSafeInstantMessages?: string;
	suspiciousSafeInstantWholeMessages?: string;
	suspiciousAuths?: string;
	patreonToken?: string;
}

// NOTE: also update createLoginServerStatus()
export const LOGIN_SERVER_SETTINGS: { id: keyof GeneralSettings; label: string; }[] = [
	{ id: 'canCreateAccounts', label: 'Can create accounts' },
	{ id: 'blockWebView', label: 'Block web view' },
	{ id: 'reportPotentialDuplicates', label: 'Report potential duplicates' },
	{ id: 'autoMergeDuplicates', label: 'Auto-merge duplicates' },
];

export interface ServerLiveSettings {
	updating: boolean;
	shutdown: boolean;
}

export interface GameServerSettings {
	isServerOffline?: boolean;
	filterSwears?: boolean;
	autoBanSwearing?: boolean;
	autoBanSpamming?: boolean;
	doubleTimeouts?: boolean;
	reportSpam?: boolean;
	reportSwears?: boolean;
	reportTeleporting?: boolean;
	logLagging?: boolean;
	logTeleporting?: boolean;
	logFixingPosition?: boolean;
	hideSwearing?: boolean;
	kickSwearing?: boolean;
	kickSwearingToSpawn?: boolean;
	blockJoining?: boolean;
	kickTeleporting?: boolean;
	fixTeleporting?: boolean;
	kickLagging?: boolean;
	reportSitting?: boolean;
}

export interface Settings extends GeneralSettings {
	servers: Dict<GameServerSettings>;
}

export const SERVER_SETTINGS: { id: keyof GameServerSettings; label: string; }[] = [
	{ id: 'filterSwears', label: 'Swear filter' },
	{ id: 'autoBanSwearing', label: 'Auto-Timeout for swearing' },
	{ id: 'autoBanSpamming', label: 'Auto-Timeout for spam' },
	{ id: 'doubleTimeouts', label: 'Double timeouts duration' },
	{ id: 'reportSpam', label: 'Report spam' },
	{ id: 'reportSwears', label: 'Report swearing' },
	{ id: 'reportTeleporting', label: 'Report teleporting' },
	{ id: 'logLagging', label: 'Log lagging' },
	{ id: 'logTeleporting', label: 'Log teleporting' },
	{ id: 'logFixingPosition', label: 'Log fixing position' },
	{ id: 'hideSwearing', label: 'Hide swearing' },
	{ id: 'kickSwearing', label: 'Kick for swearing' },
	{ id: 'kickSwearingToSpawn', label: 'Reset swearing to spawn' },
	{ id: 'blockJoining', label: 'Block joining' },
	{ id: 'kickTeleporting', label: 'Kick teleporting players' },
	{ id: 'fixTeleporting', label: 'Fix teleporting players' },
	{ id: 'kickLagging', label: 'Kick lagging players' },
	{ id: 'reportSitting', label: 'Report sitting' },
];

export interface InternalCommonApi {
	reloadSettings(): Promise<void>;
}

export interface InternalApi extends InternalCommonApi {
	state(): Promise<GameServerState>;
	stats(): Promise<ServerStats>;
	statsTable(stats: Stats): Promise<StatsTable>;
	action(action: string, accountId: string): Promise<void>;
	join(accountId: string, ponyId: string): Promise<string>;
	kick(accountId: string | undefined, characterId: string | undefined): Promise<boolean>;
	kickAll(): Promise<void>;
	accountChanged(accountId: string): Promise<void>;
	accountMerged(accountId: string, mergeId: string): Promise<void>;
	accountStatus(accountId: string): Promise<AccountStatus>;
	accountAround(accountId: string): Promise<AroundEntry[]>;
	accountHidden(accountId: string): Promise<HidingStats>;
	notifyUpdate(): Promise<void>;
	cancelUpdate(): Promise<void>;
	shutdownServer(value: boolean): Promise<void>;
	getTimings(): Promise<any[]>;
	teleportTo(adminAccountId: string, targetAccountId: string): Promise<void>;
}

export interface InternalLoginApi extends InternalCommonApi {
	state(): Promise<LoginServerStatus>;
	loginServerStats(): Promise<RequestStats[]>;
	updateLiveSettings(update: Partial<ServerLiveSettings>): Promise<void>;
	mergeAccounts(id: string, withId: string, reason: string, allowAdmin: boolean, creatingDuplicates: boolean): Promise<void>;
}

export interface ServerConfig {
	id: string;
	port: number;
	path: string;
	local: string;
	name: string;
	desc: string;
	flag: string;
	host?: string;
	alert?: string;
	require?: string;
	flags: ServerFeatureFlags;
	hidden?: boolean;
}

export interface GameServerState {
	id: string;
	path: string;
	name: string;
	desc: string;
	flag: string;
	host?: string;
	alert?: string;
	require?: string;
	world?: {
		mapSize: number;
		regionSize: number;
	};
	flags: ServerFeatureFlags;

	dead: boolean;
	maps: number;
	online: number;
	onMain: number;
	queued: number;
	shutdown: boolean;
	settings: GameServerSettings;
}

export interface InternalServerState {
	id: string;
	api: InternalCommonApi;
}

export interface InternalLoginServerState extends InternalServerState {
	api: InternalLoginApi;
	state: LoginServerStatus;
}

export interface InternalGameServerState extends InternalServerState {
	api: InternalApi;
	state: GameServerState;
}

export interface ServerStatus {
	diskSpace: string;
	memoryUsage: string;
	certificateExpiration: string;
	lastPatreonUpdate: string;
}

export interface LoginServerStatus extends GeneralSettings {
	updating: boolean;
	dead: boolean;
}

export interface AdminState {
	status: ServerStatus;
	loginServers: LoginServerStatus[];
	gameServers: GameServerState[];
}

export interface MemoryStatus {
	total: number;
	used: number;
	free: number;
}

export interface OriginInfoBase {
	ip: string;
	country: string;
	last?: Date;
}

export interface MergeItemData {
	id: string;
	name: string;
}

export interface MergeHideData {
	id: string;
	name: string;
	date: string;
}

export interface MergeAccountData {
	name: string;
	note: string;
	flags: AccountFlags;
	emails: string[];
	ignores: string[];
	counters: AccountCounters;
	auths: MergeItemData[];
	characters: MergeItemData[];
	state: AccountState;
	birthdate?: Date;
	settings?: AccountSettings;
	friends?: string[];
	hides?: MergeHideData[];
}

export interface MergeData {
	account: MergeAccountData;
	merge: MergeAccountData;
}

export interface MergeInfo {
	_id?: string;
	id: string;
	name: string;
	//code: number;
	date: Date;
	reason?: string;
	data?: MergeData;
	split?: boolean;
}

export interface LogEntry {
	message: string;
	date: Date;
}

export interface AccountDetails {
	merges: MergeInfo[];
	supporterLog: LogEntry[];
	banLog: LogEntry[];
	invitesReceived: SupporterInvite[];
	invitesSent: SupporterInvite[];
	state: AccountState;
}

export interface AuthDetails {
	id: string;
	lastUsed: string | undefined;
}

export interface BannedMuted {
	mute?: number;
	shadow?: number;
	ban?: number;
}

export interface Document extends Timestamps {
	_id: string;
	deleted?: boolean;
}

// bases

export interface TimestampsBase {
	createdAt?: Date;
	updatedAt: Date;
}

export interface ChatMessageBase {
	createdAt: Date;
	message: string;
}

export const accountCounters = [
	{ name: 'spam', label: 'spam' },
	{ name: 'swears', label: 'swearing' },
	{ name: 'timeouts', label: 'timeouts' },
	{ name: 'inviteLimit', label: 'party limits' },
	{ name: 'friendLimit', label: 'friend limits' },
];

export const enum AccountFlags {
	None = 0,
	BlockPartyInvites = 1,
	CreatingDuplicates = 2,
	DuplicatesNotification = 4,
	BlockMerging = 16,
	BlockFriendRequests = 256,
}

export const accountFlags = [
	{ value: AccountFlags.BlockPartyInvites, name: 'BlockPartyInvites', label: 'block party invites' },
	{ value: AccountFlags.CreatingDuplicates, name: 'CreatingDuplicates', label: 'creating duplicates' },
	{ value: AccountFlags.DuplicatesNotification, name: 'DuplicatesNotification', label: 'duplicates notification' },
	{ value: AccountFlags.BlockMerging, name: 'BlockMerging', label: 'block merging' },
	{ value: AccountFlags.BlockFriendRequests, name: 'BlockFriendRequests', label: 'block friend requests' },
];

export const enum PatreonFlags {
	None = 0,
	Supporter1 = 1,
	Supporter2 = 2,
	Supporter3 = 3,
}

export const enum SupporterFlags {
	None = 0,
	Supporter1 = 1,
	Supporter2 = 2,
	Supporter3 = 3,
	SupporterMask = 0x0003,
	IgnorePatreon = 0x0080,
	PastSupporter = 0x0100,
	ForcePastSupporter = 0x0200,
	IgnorePastSupporter = 0x0400,
}

export const supporterFlags = [
	{ value: SupporterFlags.IgnorePatreon, label: 'ignore data from patreon' },
];

// NOTE: also update mergeStates (merge.ts)
export interface AccountState {
	gifts?: number;
	candies?: number;
	clovers?: number;
	toys?: number;
	eggs?: number;
}

export interface AccountAlert {
	expires: Date;
	message: string;
}

export interface AccountBase<ID> extends TimestampsBase, BannedMuted {
	name: string;
	birthdate?: Date;
	birthyear?: number;
	emails?: string[];
	roles: string[];
	origins: OriginInfoBase[];
	settings?: AccountSettings;
	note: string;
	noteUpdated?: Date;
	lastVisit: Date;
	lastUserAgent?: string;
	lastBrowserId?: string;
	lastOnline?: Date;
	lastCharacter?: ID;
	ignores?: string[];
	flags: AccountFlags;
	counters?: AccountCounters;
	characterCount: number;
	patreon?: PatreonFlags;
	supporter?: SupporterFlags;
	supporterLog?: LogEntry[];
	supporterTotal?: number;
	supporterDeclinedSince?: Date;
	merges?: MergeInfo[];
	banLog?: LogEntry[];
	state?: AccountState;
	alert?: AccountAlert;
	savedMap?: string;
}

export interface AuthBase<ID> extends TimestampsBase {
	account?: ID;
	openId?: string;
	provider: string;
	name: string;
	url: string;
	emails?: string[];
	disabled?: boolean;
	banned?: boolean;
	pledged?: number;
	lastUsed?: Date;
}

export interface OriginBase extends TimestampsBase, OriginInfoBase, BannedMuted {
}

export const enum CharacterStateFlags {
	None = 0,
	Right = 1,
	Extra = 2,
}

export interface CharacterState {
	x: number;
	y: number;
	map?: string;
	toy?: number;
	flags?: CharacterStateFlags;
	hold?: string;
}

export interface CharacterBase<ID> extends TimestampsBase {
	account: ID;
	site?: ID;
	tag?: string;
	name: string;
	desc?: string;
	info?: string;
	flags: CharacterFlags;
	lastUsed?: Date;
	creator?: string;
	state?: { [key: string]: CharacterState | undefined; };
}

export interface EventBase<ID> extends TimestampsBase {
	account?: ID;
	pony?: ID;
	type: string;
	server: string;
	message: string;
	desc: string;
	origin?: OriginInfoBase;
	count: number;
}

export interface SupporterInviteBase<ID> extends TimestampsBase {
	source: ID;
	target: ID;
	name: string;
	info: string;
	active: boolean;
}

export interface FriendRequestBase<ID> {
	source: ID;
	target: ID;
}

export interface HideRequestBase<ID> {
	source: ID;
	target: ID;
	name: string;
	date: Date;
}

export const eventFields: (keyof Event)[] = [
	'_id', 'updatedAt', 'createdAt', 'type', 'server', 'message', 'desc', 'count', 'origin', 'account', 'pony'
];

// models

export interface OriginInfo extends OriginInfoBase {
}

export interface Timestamps extends TimestampsBase {
}

export interface AccountStatus {
	online: boolean;
	server?: string;
	map?: string;
	incognito?: boolean;
	character?: string;
	x?: number;
	y?: number;
	userAgent?: string;
	duration?: string;
}

export interface DuplicatesInfo {
	count: number;
	name: boolean;
	emails: boolean;
	browserId: boolean;
	generatedAt: number;
	perma: boolean;
}

export type ListListener<T> = (items: T[]) => void;

export interface IObservableList<T, V> {
	hasSubscribers(): boolean;
	trigger(): void;
	push(item: T): void;
	pushOrdered(item: T, compare: (a: T, b: T) => number): void;
	remove(item: T): boolean;
	replace(list: T[]): void;
	subscribe(listener: ListListener<V>): Subscription;
}

export interface PonyIdDateName {
	id: string;
	date: number;
	name: string;
}

export interface Account extends AccountBase<string>, Document {
	nameLower?: string;
	auths?: Auth[];
	originsRefs?: OriginRef[];
	ignoredByLimit?: number;
	ignoresLimit?: number;
	ignoresCount?: number;
	duplicatesLimit?: number;
	totalPledged?: number;

	ponies?: Character[];
	invitesReceived?: SupporterInvite[];
	invitesSent?: SupporterInvite[];

	authsList?: IObservableList<Auth, string>;
	poniesList?: IObservableList<Character, PonyIdDateName>;
	originsList?: IObservableList<OriginRef, OriginInfoBase>;
}

export interface Auth extends AuthBase<string>, Document {
}

export interface Character extends CharacterBase<string>, Document {
	ponyInfo?: PonyInfo;
	deleted?: boolean;
}

export interface Origin extends OriginBase, Document {
	accounts?: Account[];
	accountsCount?: number;
}

export interface OriginRef {
	origin: Origin;
	last: Date;
}

export interface Event extends EventBase<string>, Document {
	deleted?: boolean;
	descHTML?: any;
}

export interface ChatEvent {
	event: Event;
	account: Account | undefined;
}

export interface SupporterInvite extends SupporterInviteBase<string>, Document {
}

export interface FriendRequest extends FriendRequestBase<string>, Document {
}

// other

export interface UpdateOrigin extends OriginInfo, BannedMuted {
}

export interface AccountUpdate extends BannedMuted {
	age?: number;
	name?: string;
	note?: string;
	flags?: number;
	supporter?: number;
}

export interface BaseValues {
	updatedAt?: string;
	createdAt?: string;
	lastVisit?: string;
}

export interface LiveResponse {
	updates: any[][];
	deletes: string[];
	base: BaseValues;
	more: boolean;
}

export interface RequestStats {
	path: string;
	count: number;
	average: string;
	total: string;
	order: string;
	totalCount: number;
}

export interface UserCountStats {
	count: number;
	date: string;
}

export interface LoginStats {
	requests: RequestStats[];
	userCounts: UserCountStats[];
}

export interface ItemCounts {
	accounts: number;
	characters: number;
	auths: number;
	origins: number;
}

export interface FindPonyQuery {
	search?: string;
	orderBy?: string;
}

export interface AuthUpdate {
	disabled?: boolean;
	banned?: boolean;
	pledged?: number;
}

export interface AccountPonies {
	account: string;
	count: number;
	ponies: any[][];
}

export interface AccountPoniesResponse {
	base: BaseValues;
	accounts: AccountPonies[];
}

export interface PoniesResponse {
	base: BaseValues;
	ponies: any[][];
}

export interface PonyCreator {
	_id: string;
	name: string;
	creator: string;
}

export interface AccountOrigins {
	accountId: string;
	ips: string[];
}

export interface ServerStats {
	actions: {
		id: number;
		name: string;
		type: string;
		countBin: number;
		countStr: number;
		average: string;
		total: string;
	}[];
}

export interface DuplicateInfoEntry {
	account: string;
	userAgent: string;
	ponies: string[];
}

export interface AroundEntry {
	account: string;
	distance: number;
	party: boolean;
}

export const enum Stats {
	Country,
	Support,
	Maps,
}

export type StatsTable = string[][];

export interface OriginStats {
	uniqueOrigins: number;
	duplicateOrigins: number;
	singleOrigins: number;
	totalOrigins: number;
	totalOriginsIP4: number;
	totalOriginsIP6: number;
	distribution: number[];
}

export interface OtherStats {
	totalIgnores: number;
	authsWithEmptyAccount: number;
	authsWithMissingAccount: number;
}

export interface Around {
	account: Account;
	distance: number;
	party: boolean;
}

export interface DuplicateBase {
	indenticalEmail: boolean;
	emails: number;
	origins: number;
	ponies?: string[];
	userAgent?: string;
	browserId?: boolean;
	birthdate: boolean;
	perma: boolean;
	name: number;
	note: number;
	lastVisit: Date;
}

export interface DuplicateResult extends DuplicateBase {
	account: string;
}

export interface Duplicate extends DuplicateBase {
	account: Account;
}

export interface FindAccountQuery {
	search: string;
	showOnly: string;
	not: boolean;
	page: number;
	itemsPerPage: number;
	force?: boolean;
}

export interface FindAccountResult {
	accounts: string[];
	page: number;
	totalItems: number;
}

export interface AdminCacheEntry<T> {
	query: string;
	result: T;
	timestamp: Date;
}

export interface AdminCache {
	findAccounts?: AdminCacheEntry<Account[]>;
}

export interface ClearOrignsOptions {
	old?: boolean;
	singles?: boolean;
	trim?: boolean;
	veryOld?: boolean;
	country?: string;
}

export interface PatreonReward {
	id: string;
	title: string;
	description: string;
}

export interface PatreonPledge {
	user: string;
	reward: string;
	total: number;
	declinedSince?: string;
	account?: string;
}

export interface PatreonData {
	rewards: PatreonReward[];
	pledges: PatreonPledge[];
}

export interface HidingStats {
	account: string;
	hidden: string[];
	hiddenBy: string[];
	permaHidden: string[];
	permaHiddenBy: string[];
}

export const enum TimingEntryType {
	Start,
	End,
}

export interface TimingEntry {
	type: TimingEntryType;
	time: number;
	name?: string;
}

export type ModelTypes =
	'accounts' | 'auths' | 'origins' | 'ponies' | 'accountAuths' | 'accountOrigins' | 'accountPonies';

export interface IAdminServerActions {
	// subscribing
	subscribe(model: ModelTypes, id: string): void;
	unsubscribe(model: ModelTypes, id: string): void;
	// other
	getSignedAccount(): Promise<AccountData>;
	getCounts(): Promise<ItemCounts>;
	getState(): Promise<AdminState>;
	updateSettings(update: Partial<Settings>): Promise<void>;
	updateGameServerSettings(serverId: string, update: Partial<GameServerSettings>): Promise<void>;
	fetchServerStats(serverId: string): Promise<ServerStats>;
	fetchServerStatsTable(serverId: string, stats: Stats): Promise<StatsTable>;
	notifyUpdate(serverId: string): Promise<void>;
	shutdownServers(serverId: string): Promise<void>;
	resetUpdating(serverId: string): Promise<void>;
	report(accountId: string): Promise<void>;
	action(action: string, accountId: string): Promise<void>;
	kick(accountId: string): Promise<void>;
	kickAll(serverId: string): Promise<void>;
	getChat(search: string, date: string, caseInsensitive: boolean): Promise<string>;
	getChatForAccounts(accountIds: string[], date: string): Promise<string>;
	getRequestStats(): Promise<LoginStats>;
	updatePatreon(): Promise<void>;
	resetSupporter(accountId: string): Promise<void>;
	getLastPatreonData(): Promise<PatreonData | undefined>;
	updatePastSupporters(): Promise<void>;
	// live
	get(endPoint: 'events', id: string): Promise<any>;
	getAll(endPoint: 'events', timestamp?: string): Promise<LiveResponse>;
	assignAccount(endPoint: 'events', id: string, account: string): Promise<void>;
	removeItem(endPoint: 'events', id: string): Promise<void>;
	// events
	removeEvent(id: string): Promise<void>;
	// origins
	updateOrigin(origin: UpdateOrigin): Promise<void>;
	getOriginStats(): Promise<OriginStats>;
	getOtherStats(): Promise<OtherStats>;
	clearOrigins(count: number, andHigher: boolean, options: ClearOrignsOptions): Promise<void>;
	clearOriginsForAccounts(accounts: string[], options: ClearOrignsOptions): Promise<void>;
	// characters
	getPony(id: string): Promise<Character | undefined>;
	getPonyInfo(id: string): Promise<PonyObject | null>;
	getPoniesCreators(accountId: string): Promise<PonyCreator[]>;
	getPoniesForAccount(accountId: string): Promise<Character[]>;
	getDetailsForAccount(accountId: string): Promise<AccountDetails>;
	findPonies(query: FindPonyQuery, page: number, skipTotalCount: boolean): Promise<{ items: string[]; totalCount: number; }>;
	createPony(account: string, name: string, info: string): Promise<void>;
	assignPony(ponyId: string, accountId: string): Promise<void>;
	removePony(id: string): Promise<void>;
	removePoniesAboveLimit(accountId: string): Promise<void>;
	removeAllPonies(accountId: string): Promise<void>;
	// auths
	getAuth(id: string): Promise<Auth | undefined>;
	getAuthsForAccount(accountId: string): Promise<Auth[]>;
	fetchAuthDetails(auths: string[]): Promise<AuthDetails[]>;
	updateAuth(id: string, update: AuthUpdate): Promise<void>;
	assignAuth(authId: string, accountId: string): Promise<void>;
	removeAuth(id: string): Promise<void>;
	// accounts
	getAccount(id: string): Promise<Account | undefined>;
	findAccounts(query: FindAccountQuery): Promise<FindAccountResult>;
	createAccount(name: string): Promise<string>;
	getAccountsByEmails(emails: string[]): Promise<Dict<string[]>>;
	getAccountsByOrigin(ip: string): Promise<string[]>;
	setName(accountId: string, name: string): Promise<void>;
	setAge(accountId: string, age: number): Promise<void>;
	setRole(accountId: string, role: string, set: boolean): Promise<void>;
	updateAccount(accountId: string, update: AccountUpdate, message?: string): Promise<void>;
	timeoutAccount(accountId: string, timeout: number): Promise<void>;
	updateAccountCounter(accountId: string, name: keyof AccountCounters, value: number): Promise<void>;
	removeAllOrigins(accountId: string): Promise<void>;
	removeOriginsForAccount(accountId: string, ips: string[]): Promise<void>;
	removeOriginsForAccounts(origins: AccountOrigins[]): Promise<void>;
	addOriginToAccount(accountId: string, origin: OriginInfo): Promise<void>;
	mergeAccounts(accountId: string, withId: string): Promise<void>;
	unmergeAccounts(accountId: string, mergeId: string | undefined, split: MergeAccountData, keep: MergeAccountData): Promise<void>;
	addEmail(accountId: string, email: string): Promise<void>;
	removeEmail(accountId: string, email: string): Promise<void>;
	removeIgnore(accountId: string, ignore: string): Promise<void>;
	addIgnores(accountId: string, ignores: string[]): Promise<void>;
	removeFriend(accountId: string, friendId: string): Promise<void>;
	addFriend(accountId: string, friendId: string): Promise<void>;
	setAccountState(accountId: string, state: AccountState): Promise<void>;
	getAccountStatus(accountId: string): Promise<AccountStatus[]>;
	getAccountAround(accountId: string): Promise<AroundEntry[]>;
	getAccountHidden(accountId: string): Promise<HidingStats>;
	getAccountFriends(accountId: string): Promise<string[]>;
	removeAccount(accountId: string): Promise<void>;
	setAlert(accountId: string, message: string, expiresIn: number): Promise<void>;
	getIgnoresAndIgnoredBy(accountId: string): Promise<{ ignores: string[]; ignoredBy: string[]; }>;
	getAllDuplicatesQuickInfo(accountId: string): Promise<DuplicatesInfo>;
	getAllDuplicates(accountId: string): Promise<DuplicateResult[]>;
	getDuplicateEntries(force: boolean): Promise<string[]>;
	clearSessions(accountId: string): Promise<void>;
	// other
	getTimings(serverId: string): Promise<any[]>;
	teleportTo(accountId: string): Promise<void>;
}
