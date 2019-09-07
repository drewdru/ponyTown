import { NgZone, Injectable } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { merge, remove, repeat, noop } from 'lodash';
import { SocketService, createClientSocket } from 'ag-sockets/dist/browser';
import { fromNow } from '../../common/utils';
import { DAY, MINUTE } from '../../common/constants';
import { AccountData, AccountCounters } from '../../common/interfaces';
import {
	Account, Auth, Character, Origin, OriginInfo, Event, AdminState, UpdateOrigin, AccountFlags, IAdminServerActions,
	FindPonyQuery, AuthUpdate, ItemCounts, SupporterFlags, GameServerSettings, Settings,
	AccountState, MergeAccountData, FindAccountQuery, ClearOrignsOptions, OriginInfoBase, PonyIdDateName, Stats, BaseValues,
} from '../../common/adminInterfaces';
import { ClientAdminActions } from '../../client/clientAdminActions';
import { LiveCollection } from './liveCollection';
import { socketOptions, token } from '../../client/data';
import { getUrl } from '../../client/rev';
import {
	formatChat, formatEventDesc, getId, banMessage, parsePonies
} from '../../common/adminUtils';
import { StorageService } from './storageService';
import { decompressPonyString } from '../../common/compressPony';
import { ModelSubscriber } from './modelSubscriber';

interface FindPoniesResult {
	items: string[];
	totalCount: number;
}

const notification = window.Notification;

function shouldNotify(e: Event) {
	return !/^(Spam|Suspicious message|Invalid account|Invite limit reached|Timed out for (swearing|spamming))$/i
		.test(e.message);
}

@Injectable({ providedIn: 'root' })
export class AdminModel {
	account?: AccountData;
	counts: ItemCounts = {
		accounts: 0,
		characters: 0,
		auths: 0,
		origins: 0,
	};
	initialized = false;
	state: AdminState = {
		status: {
			diskSpace: '',
			memoryUsage: '',
			certificateExpiration: '',
			lastPatreonUpdate: '',
		},
		loginServers: [
			{
				updating: false,
				dead: false,
			},
		],
		gameServers: [],
	};
	updated?: (list: string, added: boolean) => void; // TODO: remove this
	duplicateEntries?: string[];
	error?: string;
	log = (..._: any[]) => { };
	get loading(): boolean {
		return !this.account;
	}
	accountPromise!: Promise<AccountData>;
	accounts: ModelSubscriber<Account>;
	origins: ModelSubscriber<Origin>;
	auths: ModelSubscriber<Auth>;
	ponies: ModelSubscriber<Character>;
	accountAuths: ModelSubscriber<string[]>;
	accountPonies: ModelSubscriber<PonyIdDateName[]>;
	accountOrigins: ModelSubscriber<OriginInfoBase[]>;
	private liveEvents: LiveCollection<Event>;
	private handleError = (error: Error) => {
		console.error(error);
		this.error = error.message;
		return undefined;
	}
	private checkError = <T>(promise: Promise<T>) => promise.catch(this.handleError) as Promise<T | undefined>;
	private running = true;
	private initializedLive = false;
	private socket: SocketService<ClientAdminActions, IAdminServerActions>;
	private resolveAccount!: (account: AccountData) => void;
	private initAccountPromise() {
		this.accountPromise = new Promise(resolve => {
			this.resolveAccount = resolve;
		});
	}
	constructor(private sanitizer: DomSanitizer, private storage: StorageService, zone: NgZone) {
		this.initAccountPromise();
		this.socket = createClientSocket<ClientAdminActions, IAdminServerActions>(
			{ ...socketOptions() }, token, undefined, zone.run.bind(zone));

		(window as any).model = this;

		if (this.socket) {
			this.socket.client = new ClientAdminActions(this);
			this.socket.connect();
		}

		this.accounts = new ModelSubscriber<Account>('accounts', this.socket, {
			fix: account => {
				account.createdAt = new Date(account.createdAt!);
				account.updatedAt = new Date(account.updatedAt!);
				account.lastVisit = account.lastVisit && new Date(account.lastVisit);

				if (account.alert) {
					account.alert.expires = new Date(account.alert.expires);
				}
			},
		});

		this.auths = new ModelSubscriber<Auth>('auths', this.socket, {
			fix: account => {
				account.updatedAt = new Date(account.updatedAt!);
				account.lastUsed = account.lastUsed && new Date(account.lastUsed);
			},
		});

		this.ponies = new ModelSubscriber<Character>('ponies', this.socket, {
			fix: character => {
				character.createdAt = new Date(character.createdAt!);
				character.updatedAt = new Date(character.updatedAt!);
				character.lastUsed = character.lastUsed && new Date(character.lastUsed);
			},
		});

		this.origins = new ModelSubscriber<Origin>('origins', this.socket, {});

		this.accountAuths = new ModelSubscriber<string[]>('accountAuths', this.socket, {}, []);
		this.accountPonies = new ModelSubscriber<PonyIdDateName[]>('accountPonies', this.socket, {}, []);
		this.accountOrigins = new ModelSubscriber<OriginInfoBase[]>('accountOrigins', this.socket, {}, []);

		this.liveEvents = new LiveCollection<Event>('events', 1000, getId, {
			decode: decodeEvent,
			onUpdated: (added, all) => {
				if (all.length) {
					this.log(`events ${all.length}`);
				}

				all.forEach(e => {
					e.descHTML = this.sanitizer.bypassSecurityTrustHtml(formatEventDesc(e.desc));
				});

				this.callUpdated('events', !!added);
				this.updateTitle();

				if (this.notifications) {
					added.filter(shouldNotify).forEach(e => this.notify(e.message, e.desc));
					all.filter(e => e.count === 10).forEach(e => this.notify(e.message, e.desc));
				}
			},
			onDelete: () => this.updateTitle(),
		}, this.socket);

		if (!this.socket) {
			this.initialize(true);
		}
	}
	get server() {
		return this.socket.server;
	}
	get notifications() {
		return this.storage.getItem('admin-notifications') === 'true';
	}
	get connected() {
		return this.socket.isConnected;
	}
	get events() {
		return this.liveEvents.items;
	}
	get loaded() {
		return this.liveEvents.finished;
	}
	initialize(live: boolean) {
		if (this.initializedLive)
			return;

		notification.requestPermission();

		this.initializedLive = true;
		this.server.getSignedAccount()
			.then(account => {
				this.account = account;
				this.updateState();
				this.resolveAccount(account);

				if (live) {
					setTimeout(() => this.liveEvents.live(), 100);
					setInterval(() => this.checkDuplicateEntries(), 60 * MINUTE);
					setInterval(() => {
						if (this.connected) {
							this.getCounts().then(counts => this.counts = counts || this.counts);
						}
					}, 5 * 1000);
				}
			});
	}
	connectedToSocket() {
		this.accounts.connected();
		this.origins.connected();
		this.auths.connected();
		this.ponies.connected();
		this.accountAuths.connected();
		this.accountPonies.connected();
		this.accountOrigins.connected();
		this.updateTitle();
	}
	checkDuplicateEntries(force = false) {
		return this.server.getDuplicateEntries(force)
			.then(entries => this.duplicateEntries = entries || [])
			.catch(noop);
	}
	stop() {
		this.running = false;
		this.liveEvents.stop();
	}
	toggleNotifications() {
		this.storage.setItem('admin-notifications', this.notifications ? 'false' : 'true');
	}
	// other
	getCounts() {
		return this.checkError(this.server.getCounts());
	}
	getRequestStats() {
		return this.checkError(this.server.getRequestStats());
	}
	getOtherStats() {
		return this.checkError(this.server.getOtherStats());
	}
	// auths
	getAuth(id: string) {
		return this.checkError(this.server.getAuth(id));
	}
	getAuthsForAccount(accountId: string) {
		return this.checkError(this.server.getAuthsForAccount(accountId));
	}
	removeAuth(id: string) {
		return this.checkError(this.server.removeAuth(id));
	}
	assignAuth(authId: string, accountId: string) {
		return this.checkError(this.server.assignAuth(authId, accountId));
	}
	updateAuth(id: string, update: AuthUpdate) {
		return this.checkError(this.server.updateAuth(id, update));
	}
	setAuthPledged(id: string, pledged: number) {
		return this.checkError(this.server.updateAuth(id, { pledged }));
	}
	// ponies
	getPoniesCreators(accountId: string) {
		return this.checkError(this.server.getPoniesCreators(accountId));
	}
	getPoniesForAccount(accountId: string) {
		return this.checkError(this.server.getPoniesForAccount(accountId));
	}
	getPonyInfo(pony: Character) {
		return this.server.getPonyInfo(pony._id)
			.then(data => {
				if (data) {
					pony.info = data.info;
					pony.ponyInfo = decompressPonyString(data.info, false);
					pony.lastUsed = data.lastUsed ? new Date(data.lastUsed) : undefined;
					pony.creator = data.creator;
				}
			});
	}
	removePony(id: string) {
		return this.checkError(this.server.removePony(id));
	}
	assignPony(ponyId: string, accountId: string) {
		return this.checkError(this.server.assignPony(ponyId, accountId));
	}
	findPonies(query: FindPonyQuery, page: number, skipTotalCount: boolean): Promise<FindPoniesResult | undefined> {
		return this.checkError(this.server.findPonies(query, page, skipTotalCount));
	}
	removePoniesAboveLimit(account: string) {
		return this.checkError(this.server.removePoniesAboveLimit(account));
	}
	removeAllPonies(account: string) {
		return this.checkError(this.server.removeAllPonies(account));
	}
	createPony(accountId: string, name: string, info: string) {
		return this.checkError(this.server.createPony(accountId, name, info));
	}
	restorePonies(accountId: string, chatlog: string, onlyIds?: string[]) {
		const ponies = parsePonies(chatlog, onlyIds);
		return Promise.all(ponies.map(({ name, info }) => this.createPony(accountId, name, info)));
	}
	// origins
	updateOrigin(origin: UpdateOrigin) {
		return this.checkError(this.server.updateOrigin(origin));
	}
	removeOriginsForAccount(accountId: string, ips: string[]) {
		return this.checkError(this.server.removeOriginsForAccount(accountId, ips));
	}
	clearOriginsForAccount(accountId: string, options: ClearOrignsOptions) {
		return this.clearOriginsForAccounts([accountId], options);
	}
	clearOriginsForAccounts(accounts: string[], options: ClearOrignsOptions) {
		return this.checkError(this.server.clearOriginsForAccounts(accounts, options));
	}
	clearOrigins(count: number, andHigher: boolean, options: ClearOrignsOptions) {
		return this.checkError(this.server.clearOrigins(count, andHigher, options));
	}
	addOriginToAccount(accountId: string, origin: OriginInfo) {
		return this.checkError(this.server.addOriginToAccount(accountId, origin));
	}
	getOriginStats() {
		return this.checkError(this.server.getOriginStats());
	}
	// accounts
	getAccount(id: string) {
		return this.checkError(this.server.getAccount(id));
	}
	getDetailsForAccount(account: Account) {
		return this.checkError(this.server.getDetailsForAccount(account._id));
	}
	findAccounts(query: FindAccountQuery) {
		return this.checkError(this.server.findAccounts(query));
	}
	createAccount(name = '') {
		return this.checkError(this.server.createAccount(name)
			.then(id => (console.log(`created account: [${id}]`), id)));
	}
	getAccountStatus(accountId: string) {
		return this.checkError(this.server.getAccountStatus(accountId));
	}
	getAccountAround(accountId: string) {
		return this.checkError(this.server.getAccountAround(accountId));
	}
	getAccountHidden(accountId: string) {
		return this.checkError(this.server.getAccountHidden(accountId));
	}
	getAccountFriends(accountId: string) {
		return this.checkError(this.server.getAccountFriends(accountId));
	}
	getAllDuplicatesQuickInfo(accountId: string) {
		return this.checkError(this.server.getAllDuplicatesQuickInfo(accountId));
	}
	getAllDuplicates(accountId: string) {
		return this.checkError(this.server.getAllDuplicates(accountId));
	}
	getAccountsByEmails(emails: string[]) {
		return this.checkError(this.server.getAccountsByEmails(emails));
	}
	getAccountsByOrigin(ip: string) {
		return this.checkError(this.server.getAccountsByOrigin(ip));
	}
	removeAccount(accountId: string) {
		return this.checkError(this.server.removeAccount(accountId));
	}
	setAlert(accountId: string, message: string, expiresIn: number) {
		return this.checkError(this.server.setAlert(accountId, message, expiresIn));
	}
	setName(accountId: string, name: string) {
		return this.checkError(this.server.setName(accountId, name));
	}
	setAge(accountId: string, age: number) {
		return this.checkError(this.server.setAge(accountId, age));
	}
	setRole(accountId: string, role: string, set: boolean) {
		return this.checkError(this.server.setRole(accountId, role, set));
	}
	setNote(accountId: string, note: string) {
		const account = this.accounts.get(accountId);

		if (account && account.note !== note) {
			account.note = note;
			account.noteUpdated = new Date();
		}

		return this.checkError(this.server.updateAccount(accountId, { note }));
	}
	setAccountFlags(accountId: string, flags: AccountFlags) {
		return this.checkError(this.server.updateAccount(accountId, { flags }));
	}
	setSupporterFlags(accountId: string, supporter: SupporterFlags) {
		return this.checkError(this.server.updateAccount(accountId, { supporter }));
	}
	setAccountBanField(accountId: string, field: string, value: number) {
		return this.checkError(this.server.updateAccount(accountId, { [field]: value }, banMessage(field, value)));
	}
	setAccountTimeout(accountId: string, timeout: number) {
		return this.checkError(this.server.timeoutAccount(accountId, timeout));
	}
	setAccountCounter(accountId: string, name: keyof AccountCounters, value: number) {
		return this.checkError(this.server.updateAccountCounter(accountId, name, value));
	}
	updateAccount(accountId: string, update: Partial<Account>) {
		return this.checkError(this.server.updateAccount(accountId, update));
	}
	mergeAccounts(accountId: string, withId: string) {
		return this.checkError(this.server.mergeAccounts(accountId, withId));
	}
	unmergeAccounts(accountId: string, mergeId: string | undefined, split: MergeAccountData, keep: MergeAccountData) {
		return this.checkError(this.server.unmergeAccounts(accountId, mergeId, split, keep));
	}
	addEmail(accountId: string, email: string) {
		return this.checkError(this.server.addEmail(accountId, email));
	}
	removeEmail(accountId: string, email: string) {
		return this.checkError(this.server.removeEmail(accountId, email));
	}
	removeIgnore(accountId: string, ignore: string) {
		return this.checkError(this.server.removeIgnore(accountId, ignore));
	}
	addIgnores(accountId: string, ignores: string[]) {
		return this.checkError(this.server.addIgnores(accountId, ignores));
	}
	removeFriend(accountId: string, friendId: string) {
		return this.checkError(this.server.removeFriend(accountId, friendId));
	}
	addFriend(accountId: string, friendId: string) {
		return this.checkError(this.server.addFriend(accountId, friendId));
	}
	setAccountState(accountId: string, state: AccountState) {
		return this.checkError(this.server.setAccountState(accountId, state));
	}
	getIgnoresAndIgnoredBy(accountId: string) {
		return this.checkError(this.server.getIgnoresAndIgnoredBy(accountId));
	}
	clearSessions(accountId: string) {
		return this.checkError(this.server.clearSessions(accountId));
	}
	// events
	removeEvent(eventId: string) {
		// return this.checkError(this.server.removeEvent(eventId))
		return this.liveEvents.remove(eventId)
			.then(() => this.callUpdated('events', false))
			.then(() => this.updateTitle())
			.catch(this.handleError);
	}
	cleanupDeletedEvents() {
		if (remove(this.events, e => e.deleted).length) {
			this.callUpdated('events', false);
			this.updateTitle();
		}
	}
	// state
	updateSettings(settings: Partial<Settings>) {
		return this.server.updateSettings(settings)
			.then(() => this.updateState());
	}
	updateGameServerSettings(serverId: string, settings: Partial<GameServerSettings>) {
		return this.server.updateGameServerSettings(serverId, settings)
			.then(() => this.updateState());
	}
	report(accountId: string) {
		return this.checkError(this.server.report(accountId));
	}
	action(action: string, accountId: string) {
		return this.checkError(this.server.action(action, accountId));
	}
	kick(accountId: string) {
		return this.checkError(this.server.kick(accountId));
	}
	kickAll(serverId: string) {
		return this.server.kickAll(serverId)
			.then(() => this.updateState());
	}
	getChat(search: string, date?: string, caseInsensitive = false) {
		date = date || (new Date()).toISOString();
		return search ? this.server.getChat(search, date, caseInsensitive) : Promise.resolve('');
	}
	getChatForAccounts(accountIds: string[], date?: string) {
		date = date || (new Date()).toISOString();
		return accountIds.length ? this.server.getChatForAccounts(accountIds, date) : Promise.resolve('');
	}
	searchFormattedChat(search: string, date?: string) {
		return this.formatChat(this.getChat(search, date, true));
	}
	accountsFormattedChat(accountIds: string[], date?: string) {
		return this.formatChat(this.getChatForAccounts(accountIds, date));
	}
	private formatChat(promise: Promise<string>) {
		return this.checkError(promise)
			.then(chat => chat === undefined ? 'ERROR' : chat)
			.then(raw => ({ raw, html: formatChat(raw) }));
	}
	fetchServerStats(serverId: string) {
		return this.checkError(this.server.fetchServerStats(serverId));
	}
	fetchServerStatsTable(serverId: string, stats: Stats) {
		return this.checkError(this.server.fetchServerStatsTable(serverId, stats));
	}
	notifyUpdate(server: string) {
		return this.server.notifyUpdate(server)
			.then(() => this.updateState())
			.catch(this.handleError);
	}
	shutdownServers(server: string) {
		return this.server.shutdownServers(server)
			.then(() => this.updateState())
			.catch(this.handleError);
	}
	resetUpdating(server: string) {
		return this.server.resetUpdating(server)
			.then(() => this.updateState())
			.catch(this.handleError);
	}
	resetSupporter(accountId: string) {
		return this.server.resetSupporter(accountId)
			.catch(this.handleError);
	}
	getLastPatreonData() {
		return this.server.getLastPatreonData()
			.catch(this.handleError);
	}
	updatePastSupporters() {
		return this.server.updatePastSupporters()
			.catch(this.handleError);
	}
	// other
	getTimings(server: string) {
		return this.server.getTimings(server)
			.catch(this.handleError);
	}
	teleportTo(accountId: string) {
		return this.server.teleportTo(accountId)
			.catch(this.handleError);
	}
	// helpers
	get isLowDiskSpace() {
		return parseInt(this.state.status.diskSpace || '0', 10) > 95;
	}
	get isLowMemory() {
		return parseInt(this.state.status.memoryUsage || '0', 10) > 90;
	}
	get isOldCertificate() {
		const date = this.state.status.certificateExpiration;
		return date && (new Date(date)).getTime() < fromNow(7 * DAY).getTime();
	}
	get isOldPatreon() {
		const date = this.state.status.lastPatreonUpdate;
		return date && (new Date(date)).getTime() < fromNow(-21 * MINUTE).getTime();
	}
	private requestState() {
		return this.socket.isConnected ? this.server.getState().then(s => this.readState(s)) : Promise.resolve();
	}
	private readState(state: AdminState) {
		merge(this.state, state);
		this.initialized = true;
		this.updateTitle();
	}
	private updateStateTimeout: any;
	private updateState(): void {
		if (!this.running)
			return;

		clearTimeout(this.updateStateTimeout);

		this.requestState()
			.catch((e: Error) => console.error(e.stack))
			.then(() => {
				this.updateStateTimeout = setTimeout(() => this.updateState(), 1000);
			});
	}
	private callUpdated(list: string, added: boolean) {
		if (this.updated) {
			this.updated(list, added);
		}
	}
	updateTitle() {
		const ponies = this.state.gameServers.reduce((sum, s) => sum + s.online, 0);
		const count = this.events.reduce((sum, e) => sum + (e.deleted ? 0 : 1), 0);
		const inred = this.events.reduce((sum, e) => sum + ((!e.deleted && e.count > 9) ? 1 : 0), 0);
		const flag = this.isLowDiskSpace || this.isLowMemory || this.isOldCertificate || this.isOldPatreon;
		document.title = `${ponies} | ${count}${repeat('!', inred)}${flag ? ' 🚩' : ''}${!this.connected ? ' ⚠' : ''} | Pony Town`;
	}
	private notify(title: string, body: string) {
		if (this.notifications && notification.permission === 'granted') {
			const n = new notification(title, {
				body: body || '',
				icon: getUrl('images/logo-120.png'),
			});

			n.onclick = () => {
				window.focus();
				n.close();
			};

			n.onshow = () => {
				setTimeout(() => n.close(), 4000);
			};
		}
	}
}

function decodeDate(value: number | undefined, base: string | undefined): Date {
	if (value == null || base == null) {
		return new Date(0);
	} else {
		const d = new Date(base);
		d.setTime(d.getTime() + value);
		return d;
	}
}

export function decodeEvent(values: any[], base: BaseValues): Event {
	return {
		_id: values[0],
		updatedAt: decodeDate(values[1], base.updatedAt!),
		createdAt: decodeDate(values[2], base.createdAt!),
		type: values[3],
		server: values[4],
		message: values[5],
		desc: values[6],
		count: values[7] | 0,
		origin: values[8],
		account: values[9],
		pony: values[10],
	};
}
