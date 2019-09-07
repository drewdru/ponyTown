import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { merge } from 'lodash';
import { Subject } from 'rxjs';
import { HASH } from '../../generated/hash';
import {
	AccountData, UpdateAccountData, AccountSettings, GameStatus, SocialSiteInfo, PonyObject, JoinResponse,
	OAuthProvider, EntitiesEditorInfo, FriendData, PalettePonyInfo, HiddenPlayer
} from '../../common/interfaces';
import { createDefaultPony, syncLockedPonyInfo, mockPaletteManager } from '../../common/ponyInfo';
import { removeById, observableToPromise, delay, computeFriendsCRC } from '../../common/utils';
import { isMod, getSupporterInviteLimit, getCharacterLimit } from '../../common/accountUtils';
import {
	NAME_ERROR, ACCESS_ERROR, CHARACTER_SAVING_ERROR, NOT_AUTHENTICATED_ERROR, OFFLINE_ERROR, PROTECTION_ERROR
} from '../../common/errors';
import { version, host } from '../../client/data';
import {
	toSocialSiteInfo, cleanName, validatePonyName, isStandalone, attachDebugMethod
} from '../../client/clientUtils';
import { ErrorReporter } from './errorReporter';
import { randomString } from '../../common/stringUtils';
import { StorageService } from './storageService';
import { decompressPonyString, compressPonyString, decodePonyInfo } from '../../common/compressPony';
import { SECOND, PLAYER_DESC_MAX_LENGTH } from '../../common/constants';
import { canUseTag } from '../../common/tags';

export interface Friend extends FriendData {
	entityId: number;
	crc: number;
	online: boolean;
	ponyInfo: PalettePonyInfo | undefined;
	actualName: string;
}

const LIMIT_ERROR = 'Request limit reached, please wait';
const noneSite: SocialSiteInfo = { id: '', name: 'none', url: '', icon: '', color: '#222' };
const modStatus = {
	mod: false,
	check: {} as any,
	editor: {
		names: [],
		typeToName: [],
		nameToTypes: [],
	} as EntitiesEditorInfo,
};

function compareStrings(a: string | undefined, b: string | undefined) {
	return (a || '').localeCompare(b || '');
}

function comparePonies(a: PonyObject, b: PonyObject) {
	return compareStrings(a.name, b.name) || compareStrings(a.id, b.id);
}

function getDefaultPony(ponies: PonyObject[]) {
	let result = ponies[0];

	for (let i = 1; i < ponies.length; i++) {
		if (compareStrings(result.lastUsed, ponies[i].lastUsed) < 0) {
			result = ponies[i];
		}
	}

	return result || createDefaultPonyObject();
}

export function createDefaultPonyObject(): PonyObject {
	return {
		id: '',
		name: '',
		info: '',
		ponyInfo: createDefaultPony(),
	};
}

export function getPonyTag(pony: PonyObject, account: AccountData | undefined) {
	if (account) {
		const tag = canUseTag(account, pony.tag || '') ? pony.tag : undefined;
		return (!tag && account.supporter && !pony.hideSupport) ? `sup${account.supporter}` : tag;
	} else {
		return undefined;
	}
}

const entityTypeToName = new Map<number, string>();
const entityNameToTypes = new Map<string, number[]>();

export function getEntityNames() {
	return modStatus.editor.names;
}

export function getEntityTypesFromName(name: string) {
	return entityNameToTypes.get(name);
}

export function getEntityNameFromType(type: number) {
	return entityTypeToName.get(type);
}

export function compareFriends(a: Friend, b: Friend) {
	return a.online !== b.online ? (a.online ? -1 : 1) : a.accountName.localeCompare(b.accountName);
}

@Injectable({ providedIn: 'root' })
export class Model {
	loading = true;
	loadingError?: string;
	account?: AccountData;
	ponies: PonyObject[] = [];
	pending = false;
	sites: SocialSiteInfo[] = [noneSite];
	accountPromise!: Promise<AccountData | undefined>;
	accountChanged = new Subject<void>();
	protectionErrors = new Subject<void>();
	authError?: string;
	accountAlert?: string;
	mergedAccount = false;
	updating = false;
	updatingTakesLongTime = false;
	suffix = '';
	friends: Friend[] | undefined = undefined;
	private _pony: PonyObject = createDefaultPonyObject();
	constructor(
		private http: HttpClient,
		private router: Router,
		private storage: StorageService,
		private errorReporter: ErrorReporter,
	) {
		this.initialize();

		// handle completed sign-in
		if (typeof window !== 'undefined') {
			window.addEventListener('message', event => {
				if (event.data && event.data.type === 'loaded-page') {
					const path = event.data.path;

					if (event.source && 'close' in event.source) {
						event.source.close();
					}

					this.initialize();
					this.accountPromise.then(() => router.navigateByUrl(path));
				}
			});
		}

		if (DEVELOPMENT) {
			attachDebugMethod('ddos', () => this.protectionErrors.next());
			attachDebugMethod('userModel', this);
		}
	}
	private initialize() {
		this.loading = true;
		this.account = undefined;
		this.loadingError = undefined;
		this.accountAlert = undefined;
		this.ponies = [];
		this.friends = undefined;
		this.sites = [noneSite];
		this._pony = createDefaultPonyObject();
		this.storage.setItem('bid', this.storage.getItem('bid') || randomString(20));
		this.accountPromise = this.initializeAccount();
	}
	private initializeAccount(): Promise<AccountData | undefined> {
		return this.getAccount()
			.then(account => {
				if (!account) {
					throw new Error(ACCESS_ERROR);
				}

				if ('limit' in account) {
					throw new Error(LIMIT_ERROR);
				}

				this.errorReporter.configureUser({ id: account.id, username: account.name });

				try {
					modStatus.mod = isMod(account);
					modStatus.check = account.check;
					modStatus.editor = account.editor || modStatus.editor;
				} catch { }

				if (modStatus.editor) {
					modStatus.editor.typeToName.forEach(({ type, name }) => entityTypeToName.set(type, name));
					modStatus.editor.nameToTypes.forEach(({ types, name }) => entityNameToTypes.set(name, types));
				}

				this.account = account;
				this.sites = [noneSite, ...(account.sites || []).map(toSocialSiteInfo)];
				this.ponies = account.ponies ? account.ponies.sort(comparePonies) : [];
				this.friends = undefined;

				this.selectPony(getDefaultPony(this.ponies));
				this.storage.setItem('vid', account.id);
				this.loading = false;
				this.accountAlert = account.alert;
				this.accountChanged.next();
				this.fetchFriends();

				return account;
			})
			.catch((e: Error) => {
				if (e.message === ACCESS_ERROR) {
					this.loading = false;
					this.storage.setItem('vid', '---');
				} else if (e.message === LIMIT_ERROR) {
					this.loadingError = 'request-limit';
					return delay(5000).then(() => this.initializeAccount());
				} else if (e.message === OFFLINE_ERROR) {
					this.loadingError = 'cannot-connect';
					return delay(5000).then(() => this.initializeAccount());
				} else if (e.message === PROTECTION_ERROR) {
					this.loadingError = 'cloudflare-error';
					this.protectionErrors.next();
					// } else if (e.message === VERSION_ERROR) {
					// 	this.updating = true;
				} else {
					setTimeout(() => this.loadingError = 'unexpected-error', 5 * SECOND);
					console.error(e);
				}

				return undefined;
			});
	}
	private fetchFriends() {
		this.getFriends()
			.then(friends => {
				this.friends = friends.map(f => ({
					...f,
					online: false,
					entityId: 0,
					crc: 0,
					ponyInfo: f.pony && decodePonyInfo(f.pony, mockPaletteManager) || undefined,
					actualName: '',
				})).sort(compareFriends);
			})
			.catch(e => {
				DEVELOPMENT && console.error(e);
				setTimeout(() => this.fetchFriends(), 5000);
			});
	}
	get characterLimit() {
		return this.account ? getCharacterLimit(this.account) : 0;
	}
	get supporterInviteLimit() {
		return this.account ? getSupporterInviteLimit(this.account) : 0;
	}
	get isMod() {
		return modStatus.mod;
	}
	get modCheck() {
		return modStatus.check;
	}
	get editorInfo() {
		return modStatus.editor;
	}
	get pony() {
		return this._pony;
	}
	get supporter() {
		return this.account && this.account.supporter || 0;
	}
	get missingBirthdate() {
		return !!this.account && !this.account.birthdate;
	}
	computeFriendsCRC() {
		return this.friends ? computeFriendsCRC(this.friends.map(f => f.accountId)) : 0;
	}
	parsePonyObject(pony: PonyObject): PonyObject {
		try {
			const ponyInfo = decompressPonyString(pony.info, true);
			return { ponyInfo, ...pony };
		} catch (e) {
			this.errorReporter.reportError(e, { ponyInfo: pony.info });
			this.errorReporter.reportError('Pony info reading error', { originalError: e.message, ponyInfo: pony.info });
			throw new Error('Error while reading pony info');
		}
	}
	selectPony(pony: PonyObject) {
		const copy = this.parsePonyObject(pony);
		copy.ponyInfo && syncLockedPonyInfo(copy.ponyInfo);
		this._pony = copy;
	}
	// account
	signIn(provider: OAuthProvider) {
		this.authError = undefined;
		this.openAuth(provider.url!);
	}
	connectSite(provider: OAuthProvider) {
		this.authError = undefined;
		this.openAuth(`${provider.url}/merge`);
	}
	signOut() {
		this.authError = undefined;

		return this.post<AccountData | undefined>('/auth/sign-out', {}, false)
			.catch(e => console.error(e))
			.then(() => this.initialize())
			.then(() => this.router.navigate(['/']));
	}
	private openAuth(url: string) {
		url = `${host.replace(/\/$/, '')}${url}`;

		if (isStandalone()) {
			window.open(url);
		} else {
			location.href = url;
		}
	}
	getAccount() {
		return this.post<AccountData | { limit: true; } | undefined>('/api1/account', {}, false);
	}
	getAccountCharacters() {
		return this.post<PonyObject[]>('/api/account-characters', {});
	}
	updateAccount(account: Partial<UpdateAccountData>) {
		return this.post<AccountData>('/api/account-update', { account })
			.then(a => merge(this.account, a));
	}
	saveSettings(settings: AccountSettings) {
		return this.post<AccountData>('/api/account-settings', { settings })
			.then(a => merge(this.account, a));
	}
	removeSite(siteId: string) {
		return this.post('/api/remove-site', { siteId })
			.then(() => {
				if (this.account && this.account.sites) {
					removeById(this.account.sites, siteId);
				}
			});
	}
	unhidePlayer(hideId: string) {
		return this.post('/api/remove-hide', { hideId });
	}
	verifyAccount() {
		const verificationId = this.storage.getItem('vid');
		const accountId = this.account && this.account.id || '---';

		if (!this.loading && verificationId && accountId !== verificationId) {
			this.initialize();
		}
	}
	getHides(page: number) {
		return this.post<HiddenPlayer[]>('/api/get-hides', { page });
	}
	getFriends() {
		return this.post<FriendData[]>('/api/get-friends', {});
	}
	// ponies
	savePony(pony: PonyObject, fast = false) {
		return Promise.resolve()
			.then(() => {
				if (this.pending) {
					throw new Error('Saving in progress');
				}

				pony.name = cleanName(pony.name);
				pony.desc = pony.desc && pony.desc.substr(0, PLAYER_DESC_MAX_LENGTH) || '';

				if (!validatePonyName(pony.name)) {
					throw new Error(NAME_ERROR);
				}

				if (pony.ponyInfo) {
					pony.info = compressPonyString(pony.ponyInfo);
				}

				const { id, name, desc, site, tag, info, hideSupport, respawnAtSpawn } = pony;

				if (!fast) {
					this.pending = true;
				}

				return this.post<PonyObject | undefined>('/api/pony/save', {
					pony: { id, name, desc, site, tag, info, hideSupport, respawnAtSpawn }
				});
			})
			.catch((e: Error) => {
				if (e.message === CHARACTER_SAVING_ERROR) {
					this.errorReporter.reportError(e, { pony });
				}

				throw e;
			})
			.then(newPony => {
				if (!newPony) {
					throw new Error('Failed to save pony');
				}

				if (pony.id) {
					removeById(this.ponies, pony.id);
				} else {
					this.account!.characterCount++;
				}

				this.ponies.push(newPony);
				this.ponies.sort(comparePonies);

				if (this.pony === pony) {
					this.selectPony(newPony);
				}

				return newPony;
			})
			.finally(() => this.pending = false);
	}
	removePony(pony: PonyObject) {
		return this.post('/api/pony/remove', { id: pony.id })
			.then(() => {
				removeById(this.ponies, pony.id);
				this.account!.characterCount--;

				if (this.pony === pony) {
					this.selectPony(getDefaultPony(this.ponies));
				}
			});
	}
	loadPonies() {
		return this.getAccountCharacters()
			.then(ponies => {
				if (this.account) {
					this.account.ponies = ponies || [];
					this.ponies = this.account.ponies.sort(comparePonies);
				}
			});
	}
	sortPonies() {
		this.ponies.sort(comparePonies);
	}
	// game
	status(short: boolean): Promise<GameStatus> {
		let age = 6;

		if (this.account) {
			const now = new Date();
			const currentYear = now.getFullYear();
			const currentMonth = now.getMonth() + 1;

			if (this.account.birthyear) {
				age = currentYear - this.account.birthyear;
			} else if (this.account.birthdate) {
				const [year, month] = this.account.birthdate.split('-');
				const before = parseInt(month, 10) > currentMonth;
				age = Math.max(0, currentYear - parseInt(year, 10) - (before ? 1 : 0));
			}
		}

		const params = new HttpParams()
			.set('short', short.toString())
			.set('d', age.toString())
			.set('t', (Date.now() % 0x10000).toString(16));

		return observableToPromise(this.http.get<GameStatus>('/api2/game/status', { params }));
	}
	join(serverId: string, ponyId: string): Promise<JoinResponse> {
		if (this.pending)
			return Promise.reject(new Error('Joining in progress'));
		if (!serverId)
			return Promise.reject(new Error('Invalid server ID'));
		if (!ponyId)
			return Promise.reject(new Error('Invalid pony ID'));

		this.pending = true;

		const alert = !!this.accountAlert ? 'y' : '';

		return this.post<JoinResponse>('/api/game/join', { version, ponyId, serverId, alert, url: location.href })
			.finally(() => this.pending = false);
	}
	private post<T = void>(url: string, data: any, authenticate = true): Promise<T> {
		if (authenticate) {
			if (!this.account) {
				return Promise.reject(new Error(NOT_AUTHENTICATED_ERROR));
			}

			const accountId = this.account.id + this.suffix;
			const accountName = this.account.name + this.suffix;
			data = { accountId, accountName, ...data };
		}

		const params = new HttpParams()
			.set('t', (Date.now() % 0x10000).toString(16));
		const headers = new HttpHeaders({ 'api-version': HASH, 'api-bid': this.storage.getItem('bid') || '-' });

		return observableToPromise(this.http.post<T>(url, data, { params, headers }));
	}
}
