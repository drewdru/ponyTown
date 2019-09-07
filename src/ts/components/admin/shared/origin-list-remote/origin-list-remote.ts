import { Component, Input, OnDestroy } from '@angular/core';
import { Subscription } from '../../../../common/interfaces';
import { AdminModel } from '../../../services/adminModel';
import { OriginInfoBase } from '../../../../common/adminInterfaces';

@Component({
	selector: 'origin-list-remote',
	templateUrl: 'origin-list-remote.pug',
})
export class OriginListRemote implements OnDestroy {
	@Input() limit = 2;
	@Input() extended = false;
	origins: OriginInfoBase[] = [];
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
			this.origins = [];
			this.subscription && this.subscription.unsubscribe();
			this.subscription = value ? this.model.accountOrigins.subscribe(value, x => this.origins = x || []) : undefined;
		}
	}
	ngOnDestroy() {
		this.subscription && this.subscription.unsubscribe();
	}
}
