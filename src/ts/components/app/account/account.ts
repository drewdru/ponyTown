import { Component, OnInit, OnDestroy } from '@angular/core';
import { ACCOUNT_NAME_MAX_LENGTH, ACCOUNT_NAME_MIN_LENGTH, HIDES_PER_PAGE } from '../../../common/constants';
import { UpdateAccountData, SocialSiteInfo, OAuthProvider, HiddenPlayer } from '../../../common/interfaces';
import {
	toSocialSiteInfo, cleanName, supporterTitle, supporterClass, isSupporterOrPastSupporter, supporterRewards
} from '../../../client/clientUtils';
import { oauthProviders } from '../../../client/data';
import { Model } from '../../services/model';
import { getProviderIcon } from '../../shared/sign-in-box/sign-in-box';
import { faStar, faExclamationCircle, faSync } from '../../../client/icons';

@Component({
	selector: 'account',
	templateUrl: 'account.pug',
	styleUrls: ['account.scss'],
})
export class Account implements OnInit, OnDestroy {
	readonly refreshIcon = faSync;
	readonly starIcon = faStar;
	readonly alertIcon = faExclamationCircle;
	readonly providers = oauthProviders.filter(p => !p.disabled);
	readonly nameMinLength = ACCOUNT_NAME_MIN_LENGTH;
	readonly nameMaxLength = ACCOUNT_NAME_MAX_LENGTH;
	readonly hidesPerPage = HIDES_PER_PAGE;
	data: UpdateAccountData = {
		name: '',
		birthdate: '',
	};
	sites?: SocialSiteInfo[];
	password?: string;
	removingSite?: boolean;
	mergeError?: string;
	removedAccount?: boolean;
	accountError?: string;
	accountSaved = false;
	hides: HiddenPlayer[] | undefined = undefined;
	page = 0;
	constructor(private model: Model) {
	}
	ngOnInit() {
		const account = this.account!;
		this.sites = account.sites && account.sites.map(toSocialSiteInfo);
		this.data = {
			name: account.name,
			birthdate: account.birthdate,
		};

		this.pageChanged();
	}
	ngOnDestroy() {
		this.model.mergedAccount = false;
	}
	pageChanged() {
		this.model.getHides(this.page)
			.then(result => this.hides = result);
	}
	get authError() {
		return this.model.authError;
	}
	get mergedAccount() {
		return this.model.mergedAccount;
	}
	get account() {
		return this.model.account;
	}
	get supporter() {
		return this.model.supporter;
	}
	get showSupporter() {
		return isSupporterOrPastSupporter(this.account);
	}
	get canSubmit() {
		return this.account && this.data.name && !!cleanName(this.data.name).length;
	}
	get supporterTitle() {
		return supporterTitle(this.account);
	}
	get supporterClass() {
		return supporterClass(this.account);
	}
	get supporterRewards() {
		return supporterRewards(this.account);
	}
	get showSupporterInfo() {
		const account = this.account;
		return !!(!this.supporter && account && account.sites && account.sites.some(s => s.provider === 'patreon'));
	}
	get showAccountAlert() {
		return this.model.missingBirthdate;
	}
	icon(id: string) {
		return getProviderIcon(id);
	}
	submit() {
		if (this.canSubmit) {
			this.resetAllMessages();
			this.data.name = cleanName(this.data.name).substr(0, ACCOUNT_NAME_MAX_LENGTH);
			this.model.updateAccount(this.data)
				.catch((e: Error) => this.accountError = e.message)
				.then(() => this.accountSaved = true);
		}
	}
	removeSite(site: SocialSiteInfo) {
		if (confirm('Are you sure you want to remove this social account ?')) {
			this.removingSite = true;
			this.resetAllMessages();
			this.model.removeSite(site.id)
				.then(() => this.sites = this.account!.sites!.map(toSocialSiteInfo))
				.then(() => this.removedAccount = true)
				.catch((e: Error) => this.mergeError = e.message)
				.then(() => this.removingSite = false);
		}
	}
	connectSite(provider: OAuthProvider) {
		this.model.connectSite(provider);
	}
	private resetAllMessages() {
		this.accountSaved = false;
		this.mergeError = undefined;
		this.accountError = undefined;
		this.removedAccount = false;
		this.model.authError = undefined;
		this.model.mergedAccount = false;
	}
	unhidePlayer(player: HiddenPlayer) {
		this.model.unhidePlayer(player.id)
			.then(() => this.pageChanged())
			.catch((e: Error) => console.error(e));
	}
}
