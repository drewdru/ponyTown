import { Component, Output, EventEmitter } from '@angular/core';
import { signUpProviders, signInProviders, local } from '../../../client/data';
import { emptyIcon, oauthIcons } from '../../../client/icons';
import { OAuthProvider } from '../../../common/interfaces';

export function getProviderIcon(id: string) {
	return oauthIcons[id] || emptyIcon;
}

@Component({
	selector: 'sign-in-box',
	templateUrl: 'sign-in-box.pug',
	styleUrls: ['sign-in-box.scss'],
})
export class SignInBox {
	readonly signUpProviders = signUpProviders;
	readonly signInProviders = signInProviders;
	readonly local = local || DEVELOPMENT;
	@Output() signIn = new EventEmitter<OAuthProvider>();
	icon(id: string) {
		return getProviderIcon(id);
	}
	signInTo(provider: OAuthProvider) {
		this.signIn.emit(provider);
	}
}
