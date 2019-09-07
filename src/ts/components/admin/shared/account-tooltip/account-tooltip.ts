import { Component, Input } from '@angular/core';
import { Account } from '../../../../common/adminInterfaces';
import { getAge } from '../../../../common/adminUtils';

const year = (new Date()).getFullYear();

@Component({
	selector: 'account-tooltip',
	templateUrl: 'account-tooltip.pug',
})
export class AccountTooltip {
	@Input() account!: Account;
	@Input() extendedAuths = false;
	get age() {
		return this.account.birthdate ? getAge(this.account.birthdate) : '-';
	}
	get forceAge() {
		return this.account.birthyear ? (year - this.account.birthyear) : '';
	}
}
