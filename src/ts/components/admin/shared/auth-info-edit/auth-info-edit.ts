import { Component, OnDestroy, Input } from '@angular/core';
import { Auth, DuplicateResult } from '../../../../common/adminInterfaces';
import { Subscription } from '../../../../common/interfaces';
import { AdminModel } from '../../../services/adminModel';
import { faInfo, faLock, faTrash, faEyeSlash, faArrowRight } from '../../../../client/icons';

@Component({
	selector: 'auth-info-edit',
	templateUrl: 'auth-info-edit.pug',
})
export class AuthInfoEdit implements OnDestroy {
	readonly assignIcon = faArrowRight;
	readonly infoIcon = faInfo;
	readonly lockIcon = faLock;
	readonly trashIcon = faTrash;
	readonly eyeSlashIcon = faEyeSlash;
	@Input() duplicates?: DuplicateResult[];
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
	removeAuth(auth: Auth | undefined) {
		if (auth && confirm('Are you sure?')) {
			this.model.removeAuth(auth._id);
		}
	}
	showAuthData(auth: Auth | undefined) {
		if (auth) {
			this.model.getAuth(auth._id)
				.then(x => console.log(x));
		}
	}
	toggleAuthDisabled(auth: Auth | undefined) {
		if (auth) {
			this.model.updateAuth(auth._id, { disabled: !auth.disabled });
		}
	}
	toggleAuthBanned(auth: Auth | undefined) {
		if (auth) {
			this.model.updateAuth(auth._id, { banned: !auth.banned });
		}
	}
	assignTo(accountId: string) {
		if (this.authId) {
			this.model.assignAuth(this.authId, accountId);
		}
	}
}
