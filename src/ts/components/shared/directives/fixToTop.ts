import { Directive, ElementRef, Input, HostListener, HostBinding, Output, EventEmitter } from '@angular/core';

@Directive({
	selector: '[fixToTop]',
})
export class FixToTop {
	@Input() fixToTopOffset = 0;
	@Output() fixToTop = new EventEmitter<boolean>();
	@HostBinding('class.fixed-to-top') fixed = false;
	constructor(private element: ElementRef) {
	}
	@HostListener('window:scroll')
	scroll() {
		const element = this.element.nativeElement as HTMLElement;
		const { top } = element.getBoundingClientRect();

		if (this.fixed !== top < this.fixToTopOffset) {
			this.fixed = top < this.fixToTopOffset;
			this.fixToTop.emit(this.fixed);
		}
	}
}
