import { Directive, OnInit, ElementRef } from '@angular/core';

@Directive({
	selector: 'a[href]'
})
export class Anchor implements OnInit {
	constructor(private element: ElementRef) {
	}
	ngOnInit() {
		const a = this.element.nativeElement as HTMLAnchorElement;

		if (/^(https?|mailto):/.test(a.href) && !a.target) {
			a.setAttribute('target', '_blank');
			a.setAttribute('rel', 'noopener noreferrer');
		}
	}
}
