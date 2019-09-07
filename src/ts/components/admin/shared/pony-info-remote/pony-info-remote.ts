import { Component, Input, OnDestroy } from '@angular/core';
import { Subscription } from '../../../../common/interfaces';
import { AdminModel } from '../../../services/adminModel';
import { Character } from '../../../../common/adminInterfaces';

@Component({
	selector: 'pony-info-remote',
	templateUrl: 'pony-info-remote.pug',
})
export class PonyInfoRemote implements OnDestroy {
	@Input() highlight = false;
	@Input() showName = false;
	pony?: Character;
	private _ponyId?: string;
	private subscription?: Subscription;
	constructor(private model: AdminModel) {
	}
	get ponyId() {
		return this._ponyId;
	}
	@Input() set ponyId(value: string | undefined) {
		if (this.ponyId !== value) {
			this._ponyId = value;
			this.pony = undefined;
			this.subscription && this.subscription.unsubscribe();
			this.subscription = value ? this.model.ponies.subscribe(value, pony => this.pony = pony) : undefined;
		}
	}
	ngOnDestroy() {
		this.subscription && this.subscription.unsubscribe();
	}
}
