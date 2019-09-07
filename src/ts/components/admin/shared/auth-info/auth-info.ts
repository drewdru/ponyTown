import { Component, Input } from '@angular/core';
import { Auth } from '../../../../common/adminInterfaces';
import { oauthIcons, faGlobe } from '../../../../client/icons';

@Component({
	selector: 'auth-info',
	templateUrl: 'auth-info.pug',
	styleUrls: ['auth-info.scss'],
	host: {
		'[class.deleted]': 'deleted',
	},
})
export class AuthInfo {
	@Input() auth?: Auth;
	@Input() showName = false;
	get deleted(): boolean {
		return !!(this.auth && (this.auth.disabled || this.auth.banned));
	}
	get name(): string {
		return this.auth && this.auth.name || '';
	}
	get icon() {
		return oauthIcons[this.auth && this.auth.provider || ''] || faGlobe;
	}
	get pledged() {
		return (this.auth && this.auth.pledged || 0) / 100;
	}
}
