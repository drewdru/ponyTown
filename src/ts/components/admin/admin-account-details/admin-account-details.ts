import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { remove, uniq } from 'lodash';
import {
	Account, Event, Auth, ROLES, Character, MergeInfo, MergeAccountData, SupporterInvite, accountFlags,
	OriginInfoBase, DuplicateResult, AroundEntry, LogEntry
} from '../../../common/adminInterfaces';
import { compareByName, createSupporterChanges, SupporterChange, getTranslationUrl, getAge } from '../../../common/adminUtils';
import { hasRole } from '../../../common/accountUtils';
import { AdminModel } from '../../services/adminModel';
import {
	faCog, faSync, faLanguage, faTrash, faGlobe, faTerminal, faSpinner,
	faIdBadge, faEnvelope, faFont, faCompressArrowsAlt, faComment, faSignOutAlt, faUsers, faCheckCircle,
	faDatabase, faCopy, faCalendar, faExclamationCircle,
} from '../../../client/icons';
import { flagsToString, includes, flatten, removeItem } from '../../../common/utils';
import { Subscription } from '../../../common/interfaces';
import { showTextInNewTab } from '../../../client/htmlUtils';

const defaultLimit = 15;
const defaultDuplicatesLimit = 10;
const year = (new Date()).getFullYear();

@Component({
	selector: 'admin-account-details',
	templateUrl: 'admin-account-details.pug',
	styleUrls: ['admin-account-details.scss'],
})
export class AdminAccountDetails implements OnInit, OnDestroy {
	readonly cogIcon = faCog;
	readonly syncIcon = faSync;
	readonly langIcon = faLanguage;
	readonly trashIcon = faTrash;
	readonly signOutIcon = faSignOutAlt;
	readonly duplicateNoteIcon = faExclamationCircle;
	readonly duplicateBrowserIcon = faGlobe;
	readonly duplicateBrowserIdIcon = faIdBadge;
	readonly duplicateEmailIcon = faEnvelope;
	readonly duplicateNameIcon = faFont;
	readonly duplicateBirthdateIcon = faCalendar;
	readonly mergeIcon = faCompressArrowsAlt;
	readonly commentIcon = faComment;
	readonly partyIcon = faUsers;
	readonly checkIcon = faCheckCircle;
	readonly consoleIcon = faTerminal;
	readonly spinnerIcon = faSpinner;
	readonly dataIcon = faDatabase;
	readonly copyIcon = faCopy;
	readonly roles = ROLES;
	ages = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
	account?: Account;
	duplicates?: DuplicateResult[];
	ponyNames?: string[];
	ignores?: string[];
	ignoredBy?: string[];
	hidden?: string[];
	hiddenBy?: string[];
	permaHidden?: string[];
	permaHiddenBy?: string[];
	friends?: string[];
	events?: Event[];
	merges?: MergeInfo[];
	banLog?: LogEntry[];
	support?: SupporterChange[];
	rawData?: string;
	invites?: SupporterInvite[];
	auths: string[] = [];
	origins: OriginInfoBase[] = [];
	counters: { key: string; value: any; }[] = [];
	authLimit = defaultLimit;
	emailLimit = defaultLimit;
	loadingDuplicates = false;
	accountObject?: Account;
	clearingSessions = false;
	authData?: string;
	authDataAccount?: string;
	restoringPonies = false;
	poniesToRestore = '';
	poniesToRestoreFilter = '';
	friendsLimit = defaultLimit;
	hiddenByLimit = defaultLimit;
	hiddenLimit = defaultLimit;
	permaHiddenByLimit = defaultLimit;
	permaHiddenLimit = defaultLimit;
	private id?: string;
	private aroundMap = new Map<string, AroundEntry[]>();
	private duplicatesLimits = new Map<string, number>();
	private ignoresLimits = new Map<string, number>();
	private ignoredByLimits = new Map<string, number>();
	private authsSubscription?: Subscription;
	private accountSubscription?: Subscription;
	private originsSubscription?: Subscription;
	constructor(private route: ActivatedRoute, private model: AdminModel) {
	}
	get canRemove() {
		return hasRole(this.model.account, 'superadmin');
	}
	get around() {
		return this.aroundMap.get(this.id || '');
	}
	get duplicatesLimit() {
		return (this.id && this.duplicatesLimits.has(this.id)) ? this.duplicatesLimits.get(this.id)! : defaultDuplicatesLimit;
	}
	set duplicatesLimit(value) {
		if (this.id) {
			this.duplicatesLimits.set(this.id, value);
		}
	}
	get ignoresLimit() {
		return (this.id && this.ignoresLimits.has(this.id)) ? this.ignoresLimits.get(this.id)! : defaultLimit;
	}
	set ignoresLimit(value) {
		if (this.id) {
			this.ignoresLimits.set(this.id, value);
		}
	}
	get ignoredByLimit() {
		return (this.id && this.ignoredByLimits.has(this.id)) ? this.ignoredByLimits.get(this.id)! : defaultLimit;
	}
	set ignoredByLimit(value) {
		if (this.id) {
			this.ignoredByLimits.set(this.id, value);
		}
	}
	get originRegions() {
		return uniq(this.origins.map(o => o.country));
	}
	get age() {
		return (this.account && this.account.birthdate) ? getAge(this.account.birthdate) : '-';
	}
	get forceAge() {
		return (this.account && this.account.birthyear) ? (year - this.account.birthyear) : '-';
	}
	ngOnInit() {
		this.route.params.subscribe(({ id }) => {
			this.id = id;
			this.update();
		});

		this.model.updated = () => this.update();
		this.update();
	}
	ngOnDestroy() {
		this.model.updated = () => { };
		this.authsSubscription && this.authsSubscription.unsubscribe();
		this.accountSubscription && this.accountSubscription.unsubscribe();
		this.originsSubscription && this.originsSubscription.unsubscribe();
	}
	refresh() {
		const account = this.account;

		this.ponyNames = [];
		this.banLog = undefined;
		this.merges = undefined;
		this.support = undefined;
		this.invites = undefined;
		this.accountObject = undefined;
		this.loadingDuplicates = false;

		this.authsSubscription && this.authsSubscription.unsubscribe();
		this.authsSubscription = undefined;

		this.originsSubscription && this.originsSubscription.unsubscribe();
		this.originsSubscription = undefined;

		this.auths = [];
		this.origins = [];
		this.counters = [];

		this.friends = undefined;
		this.hidden = undefined;
		this.hiddenBy = undefined;
		this.permaHidden = undefined;
		this.permaHiddenBy = undefined;

		if (account) {
			account.ignoredByLimit = account.ignoredByLimit || 10;
			account.ignoresLimit = account.ignoresLimit || 10;
			account.duplicatesLimit = account.duplicatesLimit || 10;

			this.loadingDuplicates = true;
			this.model.getAllDuplicates(account._id)
				.then(duplicates => {
					if (duplicates) {
						this.ponyNames = uniq(flatten(duplicates.map(d => (d.ponies || []).map(x => x.toLowerCase()))));
						this.duplicates = duplicates;
						this.loadingDuplicates = false;
					}
				});

			this.model.getAccount(account._id)
				.then(account => this.accountObject = account);

			this.refreshDetails();

			this.authsSubscription = this.model.accountAuths
				.subscribe(account._id, auths => this.auths = auths || []);

			this.originsSubscription = this.model.accountOrigins
				.subscribe(account._id, origins => this.origins = origins || []);
		} else {
			this.duplicates = [];
			this.ignores = [];
			this.ignoredBy = [];
		}
	}
	refreshAround() {
		const account = this.account;

		if (account) {
			this.model.getAccountAround(account._id)
				.then(accounts => {
					if (accounts) {
						this.aroundMap.set(account._id, accounts);
					}
				});
		}
	}
	refreshDetails() {
		function createCounter(key: string, value: any) {
			if (key === 'toys') {
				value = (value >>> 0).toString(2).padStart(32, '0');
			}

			return { key, value };
		}

		if (this.account) {
			this.model.getDetailsForAccount(this.account)
				.then(details => {
					if (details) {
						this.banLog = details.banLog;
						this.merges = details.merges;
						this.support = createSupporterChanges(details.supporterLog);
						this.invites = [
							...details.invitesSent!.map(i => ({ ...i, type: 'sent' })),
							...details.invitesReceived!.map(i => ({ ...i, type: 'recv' })),
						];
						const state = details.state as any;
						this.counters = Object.keys(state).map(key => createCounter(key, state[key]));
					}
				});
		}
	}
	fetchIgnores() {
		if (this.id) {
			this.model.getIgnoresAndIgnoredBy(this.id)
				.then(result => {
					if (result) {
						this.ignores = result.ignores;
						this.ignoredBy = result.ignoredBy;
					}
				});
		}
	}
	fetchHidden() {
		if (this.id) {
			this.model.getAccountHidden(this.id)
				.then(result => {
					if (result) {
						this.hidden = result.hidden;
						this.hiddenBy = result.hiddenBy;
						this.permaHidden = result.permaHidden;
						this.permaHiddenBy = result.permaHiddenBy;
					}
				});
		}
	}
	fetchFriends() {
		if (this.id) {
			this.model.getAccountFriends(this.id)
				.then(result => this.friends = result);
		}
	}
	removeFriend(friendId: string) {
		if (this.id && confirm('Are you sure ?')) {
			this.model.removeFriend(this.id, friendId)
				.then(() => this.friends && removeItem(this.friends, friendId));
		}
	}
	canToggleRole(role: string) {
		return role !== 'superadmin' && hasRole(this.model.account, 'superadmin');
	}
	hasRole(role: string) {
		return hasRole(this.account, role);
	}
	toggleRole(role: string) {
		if (this.id) {
			this.model.setRole(this.id, role, !this.hasRole(role));
		}
	}
	showAccountData() {
		if (this.id) {
			this.model.getAccount(this.id)
				.then(account => {
					(window as any).$data = account;
					console.log(account);
					console.log('accessible in $data');
				});
		}
	}
	printAuthList() {
		this.forAuths(auths => {
			const authList = auths.map((a, i) => `${i + 1}. [${a.provider}] ${a.name || '<no name>'}`).join('\n');
			this.authData = authList;
			this.authDataAccount = this.account ? `${this.account.name} [${this.account._id}]` : '';
			console.log(authList);
		});
	}
	printAuthData() {
		this.forAuths(auths => {
			const authData = auths.map((a, i) => `${i + 1}. [${a._id}] [${a.provider}] ${a.name || '<no name>'} (${a.emails})`).join('\n');
			this.authData = authData;
			this.authDataAccount = this.account ? `${this.account.name} [${this.account._id}]` : '';
			console.log(authData);
		});
	}
	copyAuthData() {
		if ('clipboard' in navigator) {
			(navigator as any).clipboard.writeText(this.authData);
		}
	}
	clearAuthData() {
		this.authData = undefined;
		this.authDataAccount = undefined;
	}
	fetchAuths() {
		this.forAuths(auths => {
			(window as any).$auths = auths;
			console.log(auths);
		});
	}
	private forAuths(callback: (auths: Auth[]) => void) {
		if (this.account) {
			this.model.getAuthsForAccount(this.account._id)
				.then(auths => callback(auths || []));
		}
	}
	printJSON() {
		if (this.id) {
			this.model.getAccount(this.id)
				.then(account => this.rawData = JSON.stringify(account, undefined, 2));
		}
	}
	clearOrigins(old: boolean, singles: boolean) {
		if (this.id) {
			this.model.clearOriginsForAccount(this.id, { old, singles })
				.then(() => this.refresh());
		}
	}
	clearOriginsInRegion(country: string) {
		if (this.id) {
			this.model.clearOriginsForAccount(this.id, { country })
				.then(() => this.refresh());
		}
	}
	clearOriginsFromDuplicates() {
		if (this.account) {
			const duplicates = (this.duplicates || []).slice(0, this.account.duplicatesLimit || 0);
			const accounts = duplicates.map(d => d.account);
			this.model.clearOriginsForAccounts(accounts, { old: true })
				.then(() => this.refresh());
		}
	}
	removeOrigin(ip: string) {
		if (this.id) {
			this.model.removeOriginsForAccount(this.id, [ip])
				.then(() => this.refresh());
		}
	}
	merge(accountId: string) {
		if (this.account && confirm('Are you sure?')) {
			this.model.mergeAccounts(this.account._id, accountId)
				.then(() => remove(this.duplicates || [], d => d.account === accountId))
				.then(() => this.refresh());
		}
	}
	remove() {
		if (this.account && confirm('Are you sure?')) {
			this.model.removeAccount(this.account._id);
		}
	}
	translateUrl(text: string) {
		return getTranslationUrl(text);
	}
	getPoniesCreators() {
		if (this.account) {
			this.model.getPoniesCreators(this.account._id)
				.then(items => {
					if (items) {
						items.sort(compareByName);
						(window as any).$ponies = items;
						console.log(items.map(i => `[${i._id}] "${i.name}" ${i.creator}`).join('\n'));
					}
				});
		}
	}
	removePoniesAboveLimit() {
		if (this.account && confirm('Are you sure?')) {
			this.model.removePoniesAboveLimit(this.account._id);
		}
	}
	removeAllPonies() {
		if (this.account && confirm('Are you sure?')) {
			this.model.removeAllPonies(this.account._id);
		}
	}
	restorePonies() {
		if (this.account && this.poniesToRestore) {
			let ids: string[] | undefined = undefined;

			if (this.poniesToRestoreFilter) {
				const matches = Array.from(this.poniesToRestoreFilter.match(/\[[a-f0-9]{24}\]/g) || [])
					.map(id => id.substr(1, 24));

				if (matches.length) {
					ids = matches;
				}
			}

			this.model.restorePonies(this.account._id, this.poniesToRestore, ids);
			this.poniesToRestore = '';
			this.restoringPonies = false;
		}
	}
	removeEmail(email: string) {
		if (this.account && confirm('Are you sure?')) {
			this.model.removeEmail(this.account._id, email);
		}
	}
	removeIgnore(account: string, ignoredAccount: string) {
		this.model.removeIgnore(account, ignoredAccount)
			.then(() => this.fetchIgnores());
	}
	highlighCharacter = (char: Character | undefined): boolean => {
		return !!char && includes(this.ponyNames, char.name.toLowerCase());
	}
	clearSessions() {
		if (this.account) {
			this.clearingSessions = true;
			this.model.clearSessions(this.account._id)
				.finally(() => this.clearingSessions = false);
		}
	}
	getMergeTooltip(merge: MergeInfo) {
		function mergeInfo(title: string, account: MergeAccountData) {
			return [
				title,
				`\tname: ${account.name}`,
				`\tnote: ${account.note || ''}`,
				`\tflags: ${flagsToString(account.flags, accountFlags)}`,
				`\tage: ${account.birthdate ? getAge(account.birthdate) : '-'}`,
				`\tfriends: ${account.friends ? account.friends.length : 0}`,
				`\tcounters:`,
				...Object.keys(account.counters || {}).sort().map(key => `\t\t${key}: ${(account.counters as any)[key]}`),
				`\tstate:`,
				...(account.state ? JSON.stringify(account.state, null, 2).split(/\n/).map(x => `\t\t${x}`) : []),
				`\temails:`,
				...account.emails.map(e => `\t\t${e}`),
				`\tauths:`,
				...account.auths.map(a => `\t\t[${a.id}] ${a.name}`),
				`\tcharacters: ${account.characters.length}`,
			].join('\n');
		}

		if (merge.data) {
			return `${mergeInfo('ACCOUNT', merge.data.account)}\n\n${mergeInfo('MERGED', merge.data.merge)}`;
		} else {
			return '<empty>';
		}
	}
	printMerge(merge: MergeInfo) {
		console.log(this.mergeInfo(merge));
	}
	printMerge2(merge: MergeInfo) {
		console.log(this.mergeInfo2(merge));
	}
	mergeInfo(merge: MergeInfo) {
		function mergeInfo(title: string, account: MergeAccountData) {
			return [
				title,
				`\tname: ${account.name}`,
				`\tnote: ${account.note || ''}`,
				`\tflags: ${flagsToString(account.flags, accountFlags)}`,
				`\tage: ${account.birthdate ? getAge(account.birthdate) : '-'}`,
				`\tcounters:`,
				...Object.keys(account.counters || {}).sort().map(key => `\t\t${key}: ${(account.counters as any)[key]}`),
				`\tstate:`,
				...(account.state ? JSON.stringify(account.state, null, 2).split(/\n/).map(x => `\t\t${x}`) : []),
				`\temails:`,
				...account.emails.map(e => `\t\t${e}`),
				`\tauths:`,
				...account.auths.map(a => `\t\t[${a.id}] ${a.name}`),
				`\tcharacters:`,
				...account.characters.map(a => `\t\t[${a.id}] ${a.name}`),
				`\tfriends:`,
				...(account.friends || []).map(i => `\t\t[${i}]`),
				`\tignores:`,
				...(account.ignores || []).map(i => `\t\t[${i}]`),
			].join('\n');
		}

		return merge.data && `${mergeInfo('ACCOUNT', merge.data.account)}\n\n${mergeInfo('MERGED', merge.data.merge)}`;
	}
	private mergeInfo2(merge: MergeInfo) {
		function mergeInfo(title: string, account: MergeAccountData) {
			return [
				title,
				`\tname: ${JSON.stringify(account.name)}`,
				`\tnote: ${JSON.stringify(account.note)}`,
				`\tflags: ${JSON.stringify(account.flags)}`,
				`\tcounters: ${JSON.stringify(account.counters)}`,
				`\tstate: ${JSON.stringify(account.state)}`,
				`\temails: ${JSON.stringify(account.emails)}`,
				`\tauths: ${JSON.stringify(account.auths)}`,
				`\tcharacters: ${JSON.stringify(account.characters)}`,
				`\tfriends: ${JSON.stringify(account.friends)}`,
				`\tignores: ${JSON.stringify(account.ignores)}`,
			].join('\n');
		}

		return merge.data && `${mergeInfo('ACCOUNT', merge.data.account)}\n\n${mergeInfo('MERGED', merge.data.merge)}`;
	}
	showMergeInNewTab(merge: MergeInfo) {
		showTextInNewTab(this.mergeInfo(merge) || '');
	}
	showMergeInNewTab2(merge: MergeInfo) {
		showTextInNewTab(this.mergeInfo2(merge) || '');
	}
	unmerge(mergeId: string | undefined, split: MergeAccountData, keep: MergeAccountData) {
		if (this.account) {
			this.model.unmergeAccounts(this.account._id, mergeId, split, keep)
				.then(() => this.refresh());
		}
	}
	setAge(age: number) {
		if (this.account) {
			this.model.setAge(this.account._id, age);
		}
	}
	addEmail() {
		if (this.account) {
			const email = prompt('enter email');

			if (email && /@/.test(email)) {
				this.model.addEmail(this.account._id, email);
			}
		}
	}
	private update() {
		if (this.id) {
			this.accountSubscription && this.accountSubscription.unsubscribe();
			this.accountSubscription = this.id ? this.model.accounts.subscribe(this.id, a => this.setAccount(a)) : undefined;

			this.events = this.model.events
				.filter(e => e.account === this.id)
				.slice(0, 10);
		}
	}
	private setAccount(account: Account | undefined) {
		const theSame = this.account === account || (this.account && account && this.account._id === account._id);
		this.account = account;

		if (!theSame) {
			this.duplicates = [];
			this.ponyNames = [];
			this.ignores = [];
			this.ignoredBy = [];
			this.rawData = undefined;
			this.authLimit = defaultLimit;
			this.emailLimit = defaultLimit;
			this.duplicatesLimit = defaultDuplicatesLimit;
			this.refresh();
			this.friendsLimit = defaultLimit;
			this.hiddenByLimit = defaultLimit;
			this.hiddenLimit = defaultLimit;
			this.permaHiddenByLimit = defaultLimit;
			this.permaHiddenLimit = defaultLimit;
			(window as any).$account = account;
		}
	}
}
