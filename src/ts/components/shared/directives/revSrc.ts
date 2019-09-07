import { Directive, Input, HostBinding } from '@angular/core';
import { getUrl } from '../../../client/rev';

@Directive({
	selector: '[revSrc]',
})
export class RevSrc {
	@HostBinding() get src() {
		return this.revSrc && getUrl(this.revSrc);
	}
	@Input() revSrc?: string;
}
