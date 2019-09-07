import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { AccountData, OAuthProvider } from '../../../common/interfaces';
import { signUpProviders, signInProviders } from '../../../client/data';
import { getProviderIcon } from '../sign-in-box/sign-in-box';
import { faStar, faSpinner, faUser, faExclamationCircle, faCog, faCircle } from '../../../client/icons';
import { Model } from '../../services/model';
import { supporterClass, supporterTitle, isSupporterOrPastSupporter } from '../../../client/clientUtils';
import { SettingsService } from '../../services/settingsService';
import { REQUEST_DATE_OF_BIRTH } from '../../../common/constants';

@Component({
	selector: 'menu-bar',
	templateUrl: 'menu-bar.pug',
	styleUrls: ['menu-bar.scss'],
})
export class MenuBar {
	readonly signUpProviders = signUpProviders;
	readonly signInProviders = signInProviders;
	readonly starIcon = faStar;
	readonly spinnerIcon = faSpinner;
	readonly userIcon = faUser;
	readonly alertIcon = faExclamationCircle;
	readonly cogIcon = faCog;
	readonly statusIcon = faCircle;
	@Input() logo = false;
	@Input() loading = false;
	@Input() loadingError = false;
	@Input() account?: AccountData;
	@Output() signOut = new EventEmitter();
	@Output() signIn = new EventEmitter<OAuthProvider>();
	constructor(private model: Model, private settings: SettingsService) {
	}
	get hasSupporterIcon() {
		return isSupporterOrPastSupporter(this.account);
	}
	get supporterTitle() {
		return supporterTitle(this.account);
	}
	get supporterClass() {
		return supporterClass(this.account);
	}
	get showAccountAlert() {
		return this.model.missingBirthdate && REQUEST_DATE_OF_BIRTH;
	}
	get hidden() {
		return !!this.settings.account.hidden;
	}
	icon(id: string) {
		return getProviderIcon(id);
	}
	signInTo(provider: OAuthProvider) {
		this.signIn.emit(provider);
	}
	@HostListener('window:resize')
	resize() {
	}
	setStatus(status: string) {
		this.settings.account.hidden = status === 'invisible';
		this.settings.saveAccountSettings(this.settings.account);
	}
}
