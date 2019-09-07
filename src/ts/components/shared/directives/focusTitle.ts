import { Directive, AfterViewInit, ElementRef } from '@angular/core';

@Directive({
	selector: '[focusTitle]',
	host: {
		'tabindex': '-1',
	},
})
export class FocusTitle implements AfterViewInit {
	constructor(private element: ElementRef) {
	}
	ngAfterViewInit() {
		setTimeout(() => this.element.nativeElement.focus());
	}
}
