import { Directive, Input, OnDestroy, ElementRef, OnInit } from '@angular/core';
import { isParentOf, focusFirstElement, findFocusableElements } from '../../../client/htmlUtils';
import { isMobile } from '../../../client/data';

@Directive({
	selector: '[focusTrap]',
})
export class FocusTrap implements OnInit, OnDestroy {
	private on = true;
	private lastActiveElement?: HTMLElement;
	@Input() set focusTrap(value: boolean) {
		if (this.on !== value) {
			this.on = value;
			this.update();
		}
	}
	constructor(private element: ElementRef) {
	}
	ngOnInit() {
		this.update();
	}
	ngOnDestroy() {
		this.focusTrap = false;
	}
	private update() {
		if (!isMobile) {
			if (this.on) {
				this.lastActiveElement = document.activeElement as HTMLElement;
				document.addEventListener('focusin', this.focus);

				if (!isParentOf(this.element.nativeElement, this.lastActiveElement)) {
					setTimeout(() => this.lastActiveElement = focusFirstElement(this.element.nativeElement));
				}
			} else {
				this.lastActiveElement = undefined;
				document.removeEventListener('focusin', this.focus);
			}
		}
	}
	private focus = (e: Event) => {
		if (isParentOf(this.element.nativeElement, e.target as any)) {
			this.lastActiveElement = e.target as any;
		} else {
			const focusable = findFocusableElements(this.element.nativeElement);

			if (focusable.length) {
				if (this.lastActiveElement === focusable[0]) {
					this.lastActiveElement = focusable[focusable.length - 1];
				} else {
					this.lastActiveElement = focusable[0];
				}

				this.lastActiveElement.focus();
			}
		}
	}
}
