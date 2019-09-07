import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { AdminModel } from '../../../services/adminModel';
import { Account, AccountStatus as IAccountStatus } from '../../../../common/adminInterfaces';
import { faUserSecret } from '../../../../client/icons';

@Component({
	selector: 'account-status',
	templateUrl: 'account-status.pug',
})
export class AccountStatus implements OnInit, OnChanges {
	readonly incognitoIcon = faUserSecret;
	@Input() account!: Account;
	@Input() verbose = false;
	status: IAccountStatus[] | undefined = undefined;
	constructor(private model: AdminModel) {
	}
	ngOnInit() {
		this.refresh();
	}
	ngOnChanges() {
		this.status = undefined;
		this.refresh();
	}
	refresh() {
		this.model.getAccountStatus(this.account._id)
			.then(status => this.status = status);
	}
}
