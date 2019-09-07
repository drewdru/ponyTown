import { Directive, HostBinding } from '@angular/core';
import { RouterLinkActive } from '@angular/router';

@Directive({
	selector: '[linkCurrent]',
})
export class LinkCurrent {
	constructor(private routerLinkActive: RouterLinkActive) {
	}
	@HostBinding('attr.aria-current')
	get current() {
		return this.routerLinkActive.isActive ? 'true' : undefined;
	}
}
