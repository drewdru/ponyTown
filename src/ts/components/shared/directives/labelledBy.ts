import { Directive, Input, OnInit, ElementRef } from '@angular/core';
import { uniqueId } from 'lodash';
import { findParentElement } from '../../../client/htmlUtils';

@Directive({
	selector: '[labelledBy]',
})
export class LabelledBy implements OnInit {
	@Input('labelledBy') selector!: string;
	constructor(private element: ElementRef) {
	}
	ngOnInit() {
		const element = this.element.nativeElement as HTMLElement;
		const target = findParentElement(element, this.selector);
		const id = element.id = element.id || uniqueId('labelled-by-');

		if (target) {
			target.setAttribute('aria-labelledby', id);
		}
	}
}
