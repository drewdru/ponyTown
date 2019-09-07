import { Component, Input, OnDestroy } from '@angular/core';
import { Subscription } from '../../../../common/interfaces';
import { AdminModel } from '../../../services/adminModel';

@Component({
	selector: 'auth-list-remote',
	templateUrl: 'auth-list-remote.pug',
	styleUrls: ['auth-list-remote.scss'],
})
export class AuthListRemote implements OnDestroy {
	@Input() limit = 6;
	@Input() extended = false;
	auths: string[] = [];
	loading = false;
	private _accountId?: string;
	private subscription?: Subscription;
	constructor(private model: AdminModel) {
	}
	get accountId() {
		return this._accountId;
	}
	@Input() set accountId(value: string | undefined) {
		if (this.accountId !== value) {
			this._accountId = value;
			this.auths = [];
			this.loading = true;
			this.subscription && this.subscription.unsubscribe();
			this.subscription = value ? this.model.accountAuths.subscribe(value, auths => {
				this.auths = auths || [];
				this.loading = false;
			}) : undefined;
		}
	}
	ngOnDestroy() {
		this.subscription && this.subscription.unsubscribe();
	}
}
