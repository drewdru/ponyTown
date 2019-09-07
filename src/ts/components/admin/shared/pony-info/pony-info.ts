import { Component, Input, OnChanges } from '@angular/core';
import { hasFlag } from '../../../../common/utils';
import { Character, CharacterFlags } from '../../../../common/adminInterfaces';
import { isForbiddenName } from '../../../../common/security';
import { AdminModel } from '../../../services/adminModel';

@Component({
	selector: 'pony-info',
	templateUrl: 'pony-info.pug',
	styleUrls: ['pony-info.scss'],
})
export class PonyInfo implements OnChanges {
	@Input() pony?: Character;
	@Input() highlight = false;
	labelClass = 'badge-none';
	private promise?: Promise<void>;
	constructor(private model: AdminModel) {
	}
	get isBadCM() {
		return !!this.pony && hasFlag(this.pony.flags, CharacterFlags.BadCM);
	}
	ngOnChanges() {
		if (this.pony) {
			if (isForbiddenName(this.pony.name)) {
				this.labelClass = 'badge-forbidden';
			} else if (hasFlag(this.pony.flags, CharacterFlags.BadCM)) {
				this.labelClass = 'badge-danger';
			} else {
				this.labelClass = 'badge-none';
			}
		}
	}
	onShown() {
		if (this.pony && !this.pony.ponyInfo && !this.promise) {
			this.promise = this.model.getPonyInfo(this.pony)
				.finally(() => this.promise = undefined);
		}
	}
	click() {
		console.log(this.pony);
	}
}
