import { Component, Input, OnDestroy } from '@angular/core';
import { Account } from '../../../../common/adminInterfaces';
import { Subscription } from '../../../../common/interfaces';
import { AdminModel } from '../../../services/adminModel';

@Component({
	selector: 'account-info-remote',
	templateUrl: 'account-info-remote.pug',
})
export class AccountInfoRemote implements OnDestroy {
	@Input() extendedAuths = false;
	@Input() popoverPlacement?: string;
	@Input() showDuplicates = false;
	@Input() basic = false;
	account?: Account;
	private _accountId?: string;
	private subscription?: Subscription;
	constructor(private model: AdminModel) {
	}
	ngOnDestroy() {
		this.subscription && this.subscription.unsubscribe();
	}
	get accountId() {
		return this._accountId;
	}
	@Input() set accountId(value) {
		if (this._accountId !== value) {
			this._accountId = value;
			this.account = undefined;
			this.updateSubscription();
		}
	}
	private updateSubscription() {
		if (this.subscription) {
			this.subscription.unsubscribe();
			this.subscription = undefined;
		}

		if (this.accountId) {
			this.subscription = this.model.accounts
				.subscribe(this.accountId, account => this.account = account);
		}
	}
}
