import { Component, Input, OnDestroy } from '@angular/core';
import { Subscription } from '../../../../common/interfaces';
import { AdminModel } from '../../../services/adminModel';
import { Auth } from '../../../../common/adminInterfaces';

@Component({
	selector: 'auth-info-remote',
	templateUrl: 'auth-info-remote.pug',
})
export class AuthInfoRemote implements OnDestroy {
	@Input() showName = false;
	auth?: Auth;
	private _authId?: string;
	private subscription?: Subscription;
	constructor(private model: AdminModel) {
	}
	get authId() {
		return this._authId;
	}
	@Input() set authId(value: string | undefined) {
		if (this.authId !== value) {
			this._authId = value;
			this.auth = undefined;
			this.subscription && this.subscription.unsubscribe();
			this.subscription = value ? this.model.auths.subscribe(value, auth => this.auth = auth) : undefined;
		}
	}
	ngOnDestroy() {
		this.subscription && this.subscription.unsubscribe();
	}
}
