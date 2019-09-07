import * as moment from 'moment';
import { Socket, SocketServer, Method, ClientExtensions } from 'ag-sockets';
import { AccountCounters, Subscription } from '../common/interfaces';
import { HOUR } from '../common/constants';
import { fromNow, removeItem, formatDuration } from '../common/utils';
import { hasRole } from '../common/accountUtils';
import {
	Settings, UpdateOrigin, AccountUpdate, OriginInfo, AccountOrigins, IAdminServerActions, FindPonyQuery,
	AuthUpdate, PonyCreator, ServerConfig, GameServerSettings, AccountState, AuthDetails, MergeAccountData,
	FindAccountQuery, AdminCache, ClearOrignsOptions, ModelTypes, Stats
} from '../common/adminInterfaces';
import { ClientAdminActions, ClientUpdate } from '../client/clientAdminActions';
import { TokenData } from './serverInterfaces';
import { toAccountData, toPonyObjectAdmin } from './serverUtils';
import {
	IAccount, Account, ICharacter, Character, Auth, checkIfAdmin, ID, findCharacterById, updateAuth, queryAuths,
	nullToUndefined, findAccount, findFriendIds
} from './db';
import {
	updateAccountSafe, setRole, addEmail, removeEmail, removeIgnore, updateAccountCounter, timeoutAccount,
	addIgnores, setAccountState, findAccounts, getAccountsByEmails, getAccountsByOrigin,
	removeAccount, setAccountAlert
} from './api/admin-accounts';
import {
	getAdminState, getChat, kickFromAllServers, notifyUpdate, clearSessions, actionForAllServers, updateOrigin,
	getChatForAccounts, shutdownServers, resetUpdating, getUserCounts, getAccountDetails,
	EndPoints, getOtherStats, updateGameServerSettings, updateServerSettings, forAllGameServers,
} from './api/admin';
import {
	findPonies, removeCharactersAboveLimit, createCharacter, removeCharacter, assignCharacter, removeAllCharacters
} from './api/ponies';
import { accountStatus, accountAround, getServer, getLoginServer, RemovedDocument, accountHidden } from './internal';
import { create } from './reporter';
import { system } from './logger';
import { updatePatreonData, updatePastSupporters } from './polling';
import { AdminService } from './services/adminService';
import { getOriginStats, clearOrigins, removeAllOrigins, removeOrigins, addOrigin, clearOriginsForAccounts } from './api/origins';
import { getDuplicateEntries, getAllDuplicatesQuickInfo, getAllDuplicatesWithInfo } from './api/duplicates';
import { splitAccounts } from './api/merge';
import { removeAuth, assignAuth } from './api/admin-auths';
import { getLastPatreonData } from './patreon';
import { removeFriend, addFriend } from './accountUtils';

@Socket({
	id: 'admin',
	path: '/ws-admin',
	connectionTokens: true,
	tokenLifetime: 12 * HOUR,
	perMessageDeflate: false,
})
export class AdminServerActions implements IAdminServerActions, SocketServer {
	private account: IAccount;
	private cache: AdminCache = {};
	private subscriptions = new Map<string, Subscription>();
	constructor(
		private client: ClientAdminActions & ClientExtensions,
		private server: ServerConfig,
		private settings: Settings,
		private adminService: AdminService,
		private endPoints: EndPoints,
		private removedDocument: RemovedDocument,
	) {
		this.account = (client.tokenData as TokenData).account;
		this.subscriptions.set('account:deleted', this.adminService.accountDeleted.subscribe(account => {
			if (this.cache.findAccounts) {
				removeItem(this.cache.findAccounts.result, account);
			}
		}));
	}
	disconnected() {
		this.subscriptions.forEach(subscription => subscription.unsubscribe());
		clearTimeout(this.updatesTimeout);
	}
	// other
	@Method({ promise: true })
	async getSignedAccount() {
		return toAccountData(this.account);
	}
	@Method({ promise: true })
	async getCounts() {
		const characters = await Promise.resolve(Character.estimatedDocumentCount() as any);

		return {
			characters,
			accounts: this.adminService.accounts.items.length,
			auths: this.adminService.auths.items.length,
			origins: this.adminService.origins.items.length,
		};
	}
	@Method({ promise: true })
	async getOtherStats() {
		return await getOtherStats(this.adminService);
	}
	// subscribing
	private updates: ClientUpdate[] = [];
	private updatesTimeout: any;
	private pushUpdate(type: ModelTypes, id: string, update: any) {
		const index = this.updates.findIndex(u => u.type === type && u.id === id);

		if (index !== -1) {
			this.updates[index].update = update;
		} else {
			this.updates.push({ type, id, update });
		}

		if (!this.updatesTimeout) {
			this.updatesTimeout = setTimeout(() => {
				this.client.updates(this.updates);
				this.updates = [];
				this.updatesTimeout = 0;
			}, 50);
		}
	}
	@Method()
	subscribe(type: ModelTypes, id: string) {
		const key = `${type}:${id}`;

		if (this.subscriptions.has(key))
			return;

		if (type === 'ponies') {
			if (!this.adminService.ponies.get(id)) {
				this.adminService.ponies.fetch({ _id: id });
			}
		}

		let subscription: Subscription | undefined;

		if (type === 'accountAuths') {
			subscription = this.adminService.subscribeToAccountAuths(id, update => this.pushUpdate(type, id, update));
		} else if (type === 'accountOrigins') {
			subscription = this.adminService.subscribeToAccountOrigins(id, update => this.pushUpdate(type, id, update));
		} else if (type === 'accountPonies') {
			subscription = this.adminService.subscribeToAccountPonies(id, update => this.pushUpdate(type, id, update));
		} else if (type in this.adminService) {
			subscription = this.adminService[type].subscribe(id, (id, update) => this.pushUpdate(type, id, update));
		} else {
			throw new Error(`Invalid model type (${type})`);
		}

		if (subscription) {
			this.subscriptions.set(key, subscription);
		}
	}
	@Method()
	unsubscribe(type: ModelTypes, id: string) {
		const key = `${type}:${id}`;
		const subscription = this.subscriptions.get(key);

		if (subscription) {
			subscription.unsubscribe();
			this.subscriptions.delete(key);

			if (type === 'ponies') {
				this.adminService.cleanupPony(id);
			} else if (type === 'accountPonies') {
				this.adminService.cleanupPoniesList(id);
			}
		}
	}
	// state
	@Method({ promise: true })
	async clearSessions(accountId: string) {
		await clearSessions(accountId);
	}
	@Method({ promise: true })
	async getState() {
		return getAdminState();
	}
	@Method({ promise: true })
	async updateSettings(update: Partial<Settings>) {
		await updateServerSettings(this.settings, update);
	}
	@Method({ promise: true })
	async updateGameServerSettings(serverId: string, update: Partial<GameServerSettings>) {
		await updateGameServerSettings(this.settings, serverId, update);
	}
	@Method({ promise: true })
	async fetchServerStats(serverId: string) {
		const server = getServer(serverId);
		return await server.api.stats();
	}
	@Method({ promise: true })
	async fetchServerStatsTable(serverId: string, stats: Stats) {
		const server = getServer(serverId);
		return await server.api.statsTable(stats);
	}
	@Method({ promise: true })
	async report(accountId: string) {
		create(this.server, accountId).info(`Reported by ${this.account.name}`);
	}
	@Method({ promise: true })
	async notifyUpdate(server: string) {
		await notifyUpdate(server);
	}
	@Method({ promise: true })
	async shutdownServers(server: string) {
		await shutdownServers(server, true);
	}
	@Method({ promise: true })
	async resetUpdating(server: string) {
		await resetUpdating(server);
	}
	@Method({ promise: true })
	async action(action: string, accountId: string) {
		await actionForAllServers(action, accountId);
	}
	@Method({ promise: true })
	async kick(accountId: string) {
		await kickFromAllServers(accountId);
	}
	@Method({ promise: true })
	async kickAll(serverId: string) {
		const server = getServer(serverId);
		await server.api.kickAll();
	}
	@Method({ promise: true })
	async getChat(search: string, date: string, caseInsensitive: boolean) {
		return await getChat(search, date, caseInsensitive);
	}
	@Method({ promise: true })
	async getChatForAccounts(accountIds: string[], date: string) {
		return await getChatForAccounts(accountIds, date);
	}
	@Method({ promise: true })
	async getRequestStats() {
		const loginServer = getLoginServer('login');
		const requests = await loginServer.api.loginServerStats();
		const userCounts = await getUserCounts();
		return { requests, userCounts };
	}
	// live (remove)
	@Method({ promise: true })
	async get(endPoint: keyof EndPoints, id: string) {
		// console.log('get', endPoint);
		// return this.adminService[endPoint].get(id);
		return await this.endPoints[endPoint].get(id) as any;
	}
	@Method({ promise: true })
	async getAll(endPoint: keyof EndPoints, timestamp?: string) {
		return await this.endPoints[endPoint].getAll(timestamp) as any;
	}
	@Method({ promise: true })
	async assignAccount(endPoint: keyof EndPoints, id: string, account: string) {
		return await this.endPoints[endPoint].assignAccount(id, account) as any;
	}
	@Method({ promise: true })
	async removeItem(endPoint: keyof EndPoints, id: string) {
		return await this.endPoints[endPoint].removeItem(id) as any;
	}
	// events
	@Method({ promise: true })
	async removeEvent(id: string) {
		await this.adminService.events.remove(id);
		await this.endPoints.events.removedItem(id);
	}
	// origins
	@Method({ promise: true })
	async updateOrigin(origin: UpdateOrigin) {
		await updateOrigin(origin);
	}
	@Method({ promise: true })
	async getOriginStats() {
		return await getOriginStats(this.adminService.accounts.items);
	}
	@Method({ promise: true })
	async clearOrigins(count: number, andHigher: boolean, options: ClearOrignsOptions) {
		if (!this.adminService.loaded) {
			throw new Error('Not loaded yet');
		} else {
			await clearOrigins(this.adminService, count, andHigher, options);
		}
	}
	@Method({ promise: true })
	async clearOriginsForAccounts(accounts: string[], options: ClearOrignsOptions) {
		if (!this.adminService.loaded) {
			throw new Error('Not loaded yet');
		} else {
			await clearOriginsForAccounts(this.adminService, accounts, options);
		}
	}
	// ponies
	@Method({ promise: true })
	async getPony(id: string) {
		return await Character.findById(id).exec().then(nullToUndefined) as any;
	}
	@Method({ promise: true })
	async getPonyInfo(id: string) {
		const character = await findCharacterById(id);
		return toPonyObjectAdmin(character);
	}
	@Method({ promise: true })
	async getPoniesCreators(account: string) {
		const items: ICharacter[] = await Character.find({ account }, '_id name creator').lean().exec();
		return items.map(({ _id, name, creator }) => <PonyCreator>{ _id, name, creator });
	}
	@Method({ promise: true })
	async getPoniesForAccount(account: string) {
		return await Character.find({ account }).lean().exec();
	}
	@Method({ promise: true })
	async getDetailsForAccount(accountId: string) {
		return await getAccountDetails(accountId);
	}
	@Method({ promise: true })
	async findPonies(query: FindPonyQuery, page: number, _skipTotalCount: boolean) {
		return await findPonies(query, page);
	}
	@Method({ promise: true })
	async createPony(account: string, name: string, info: string) {
		await createCharacter(account, name, info);
		system(account, `Created character (${name}) ${this.by()}`);
	}
	@Method({ promise: true })
	async assignPony(ponyId: string, accountId: string) {
		await assignCharacter(ponyId, accountId);
	}
	@Method({ promise: true })
	async removePony(id: string) {
		await removeCharacter(this.adminService, id);
	}
	@Method({ promise: true })
	async removePoniesAboveLimit(account: string) {
		await removeCharactersAboveLimit(this.removedDocument, account);
		system(account, `Removed ponies above limit ${this.by()}`);
	}
	@Method({ promise: true })
	async removeAllPonies(account: string) {
		await removeAllCharacters(this.removedDocument, account);
		system(account, `Removed all ponies ${this.by()}`);
	}
	// auths
	@Method({ promise: true })
	async	getAuth(id: string) {
		return await Auth.findById(id).exec().then(nullToUndefined) as any;
	}
	@Method({ promise: true })
	async getAuthsForAccount(accountId: string) {
		return await Auth.find({ account: accountId }).exec() as any;
	}
	@Method({ promise: true })
	async fetchAuthDetails(auths: string[]): Promise<AuthDetails[]> {
		const items = await queryAuths({ _id: { $in: auths } }, '_id lastUsed');

		return items.map(a => ({
			id: a._id.toString(),
			lastUsed: a.lastUsed && a.lastUsed.toISOString(),
		}));
	}
	@Method({ promise: true })
	async updateAuth(id: string, update: AuthUpdate) {
		const auth = await Auth.findById(id).exec();
		await throwOnAdmin(auth && auth.account);
		await updateAuth(id, update);
	}
	@Method({ promise: true })
	async assignAuth(authId: string, accountId: string) {
		await assignAuth(authId, accountId);
	}
	@Method({ promise: true })
	async removeAuth(id: string) {
		await removeAuth(this.adminService, id);
	}
	// accounts
	@Method({ promise: true })
	async getAccount(id: string) {
		return await findAccount(id) as any;
	}
	@Method({ promise: true })
	async findAccounts(query: FindAccountQuery) {
		return await findAccounts(this.cache, this.adminService, query);
	}
	@Method({ promise: true })
	async createAccount(name: string): Promise<string> {
		const account = await Account.create({ name });
		system(account._id.toString(), `Created account ${this.by()}`);
		return account._id.toString();
	}
	@Method({ promise: true })
	async getAccountsByEmails(emails: string[]) {
		return getAccountsByEmails(this.adminService, emails);
	}
	@Method({ promise: true })
	async getAccountsByOrigin(ip: string) {
		return getAccountsByOrigin(this.adminService, ip);
	}
	@Method({ promise: true })
	async setName(accountId: string, name: string) {
		await updateAccountSafe(accountId, { name });
		system(accountId, `Updated name (${name}) ${this.by()}`);
	}
	@Method({ promise: true })
	async setAge(accountId: string, age: number) {
		if (age === -1) {
			await Account.updateOne({ _id: accountId }, { $unset: { birthyear: 1 } }).exec();
		} else {
			const birthyear = (new Date()).getFullYear() - age;
			await Account.updateOne({ _id: accountId }, { birthyear }).exec();
		}

		system(accountId, `Updated birth year (${age}) ${this.by()}`);
	}
	@Method({ promise: true })
	async setRole(accountId: string, role: string, set: boolean) {
		await setRole(accountId, role, set, hasRole(this.account, 'superadmin'));
		system(accountId, `${set ? 'Added' : 'Removed'} role (${role}) ${this.by()}`);
	}
	@Method({ promise: true })
	async updateAccount(accountId: string, update: AccountUpdate, message?: string) {
		await updateAccountSafe(accountId, update);

		if (message) {
			system(accountId, `${message} ${this.by()}`);
		}
	}
	@Method({ promise: true })
	async timeoutAccount(accountId: string, timeout: number) {
		const message = timeout ? `Timed out ${moment.duration(timeout).humanize()}` : 'Unmuted';
		system(accountId, `${message} ${this.by()}`);
		await timeoutAccount(accountId, fromNow(timeout | 0));
	}
	@Method({ promise: true })
	async updateAccountCounter(accountId: string, name: keyof AccountCounters, value: number) {
		await updateAccountCounter(accountId, name, value);
	}
	@Method({ promise: true })
	async mergeAccounts(accountId: string, withId: string) {
		const server = getLoginServer('login');
		await server.api.mergeAccounts(accountId, withId, this.by(), hasRole(this.account, 'superadmin'), true);
	}
	@Method({ promise: true })
	async unmergeAccounts(accountId: string, mergeId: string | undefined, split: MergeAccountData, keep: MergeAccountData) {
		await splitAccounts(accountId, mergeId, split, keep, this.by());
	}
	@Method({ promise: true })
	async getAccountStatus(accountId: string) {
		return await accountStatus(accountId);
	}
	@Method({ promise: true })
	async getAccountAround(accountId: string) {
		return await accountAround(accountId);
	}
	@Method({ promise: true })
	async getAccountHidden(accountId: string) {
		return await accountHidden(accountId);
	}
	@Method({ promise: true })
	async getAccountFriends(accountId: string) {
		return findFriendIds(accountId);
	}
	@Method({ promise: true })
	async removeAccount(accountId: string) {
		await removeAccount(this.adminService, accountId);
	}
	@Method({ promise: true })
	async setAlert(accountId: string, message: string, expiresIn: number) {
		await setAccountAlert(accountId, message, fromNow(expiresIn));
		system(accountId, `${expiresIn ? 'Set' : 'Unset'} alert for ${formatDuration(expiresIn)} "${message}" ${this.by()}`);
	}
	// accounts - origins
	@Method({ promise: true })
	async removeAllOrigins(accountId: string) {
		await removeAllOrigins(this.adminService, accountId);
	}
	@Method({ promise: true })
	async removeOriginsForAccount(accountId: string, ips: string[]) {
		await removeOrigins(this.adminService, accountId, ips);
	}
	@Method({ promise: true })
	async removeOriginsForAccounts(origins: AccountOrigins[]) {
		await Promise.all(origins.map(o => removeOrigins(this.adminService, o.accountId, o.ips)));
	}
	@Method({ promise: true })
	async addOriginToAccount(accountId: string, origin: OriginInfo) {
		if (origin && origin.ip && origin.country) {
			await addOrigin(accountId, origin);
			system(accountId, `Added origin (${JSON.stringify(origin)}) ${this.by()}`);
		} else {
			throw new Error('Invalid origin');
		}
	}
	// accounts - emails
	@Method({ promise: true })
	async addEmail(accountId: string, email: string) {
		await addEmail(accountId, email);
		system(accountId, `Added email (${email}) ${this.by()}`);
	}
	@Method({ promise: true })
	async removeEmail(accountId: string, email: string) {
		await removeEmail(accountId, email);
		system(accountId, `Removed email (${email}) ${this.by()}`);
	}
	// accounts - ignores
	@Method({ promise: true })
	async removeIgnore(accountId: string, ignore: string) {
		await removeIgnore(accountId, ignore);
	}
	@Method({ promise: true })
	async addIgnores(accountId: string, ignores: string[]) {
		await addIgnores(accountId, ignores);
	}
	@Method({ promise: true })
	async setAccountState(accountId: string, state: AccountState) {
		await setAccountState(accountId, state);
	}
	@Method({ promise: true })
	async getIgnoresAndIgnoredBy(accountId: string): Promise<{ ignores: string[]; ignoredBy: string[]; }> {
		const [ignores, ignoredBy] = await Promise.all([
			Account
				.find({ ignores: { $in: [accountId] } }, '_id')
				.lean()
				.exec()
				.then((accounts: IAccount[]) => accounts.map(a => a._id.toString())),
			Account
				.findOne({ _id: accountId }, 'ignores')
				.lean()
				.exec()
				.then((account: IAccount | null) => account && account.ignores || []),
		]);

		return { ignores, ignoredBy };
	}
	// accounts - friends
	@Method({ promise: true })
	async removeFriend(accountId: string, friendId: string) {
		await removeFriend(accountId, friendId);
	}
	@Method({ promise: true })
	async addFriend(accountId: string, friendId: string) {
		await addFriend(accountId, friendId);
	}
	// accounts - duplicates
	@Method({ promise: true })
	async getAllDuplicatesQuickInfo(accountId: string) {
		return await getAllDuplicatesQuickInfo(this.adminService, accountId);
	}
	@Method({ promise: true })
	async getAllDuplicates(accountId: string) {
		return await getAllDuplicatesWithInfo(this.adminService, accountId);
	}
	@Method({ promise: true })
	async getDuplicateEntries(force: boolean) {
		return await getDuplicateEntries(this.adminService.accounts.items, force);
	}
	// patreon
	@Method({ promise: true })
	async updatePatreon() {
		await updatePatreonData(this.server, this.settings);
	}
	@Method({ promise: true })
	async resetSupporter(accountId: string) {
		await Account.updateOne(
			{ _id: accountId },
			{ $unset: { supporter: 1, patreon: 1, supporterDeclinedSince: 1 } }).exec();
	}
	@Method({ promise: true })
	async getLastPatreonData() {
		const data = await getLastPatreonData();

		// if (data) {
		// 	data.pledges.forEach(pledge => {
		// 		const auth = this.adminService.auths.items.find(a => a.openId === pledge.user);
		// 		pledge.account = auth && auth.account;
		// 	});
		// }

		return data;
	}
	@Method({ promise: true })
	async updatePastSupporters() {
		await updatePastSupporters();
	}
	// other
	@Method({ promise: true })
	async getTimings(serverId: string) {
		const server = getServer(serverId);
		return server.api.getTimings();
	}
	@Method({ promise: true })
	async teleportTo(accountId: string) {
		const adminAccountId = this.account._id.toString();
		await forAllGameServers(server => server.api.teleportTo(adminAccountId, accountId));
	}
	// utils
	private by() {
		return `by ${this.account.name} [${this.account._id}]`;
	}
}

async function throwOnAdmin(account: ID | null | undefined) {
	if (account) {
		const isAdmin = await checkIfAdmin(account);

		if (isAdmin) {
			throw new Error('Cannot change for admin user');
		}
	}
}
