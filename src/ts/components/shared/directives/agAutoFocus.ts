import { Directive, AfterViewInit, ElementRef } from '@angular/core';

@Directive({
	selector: '[agAutoFocus]'
})
export class AgAutoFocus implements AfterViewInit {
	constructor(private element: ElementRef) {
	}
	ngAfterViewInit() {
		setTimeout(() => this.element.nativeElement.focus(), 100);
	}
}
