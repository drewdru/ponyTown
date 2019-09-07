import { Component, Input, OnDestroy } from '@angular/core';
import { Subscription } from '../../../../common/interfaces';
import { AdminModel } from '../../../services/adminModel';
import { Origin } from '../../../../common/adminInterfaces';

@Component({
	selector: 'origin-info-remote',
	templateUrl: 'origin-info-remote.pug',
})
export class OriginInfoRemote implements OnDestroy {
	@Input() showName = false;
	origin?: Origin;
	private _originIP?: string;
	private subscription?: Subscription;
	constructor(private model: AdminModel) {
	}
	get originIP() {
		return this._originIP;
	}
	@Input() set originIP(value: string | undefined) {
		if (this.originIP !== value) {
			this._originIP = value;
			this.origin = undefined;
			this.subscription && this.subscription.unsubscribe();
			this.subscription = value ? this.model.origins.subscribe(value, origin => this.origin = origin) : undefined;
		}
	}
	ngOnDestroy() {
		this.subscription && this.subscription.unsubscribe();
	}
}
