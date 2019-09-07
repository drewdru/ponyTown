import { Directive, Input, Optional } from '@angular/core';
import { NgModel } from '@angular/forms';

@Directive({
	selector: '[btnHighlight]',
	host: {
		'[class.btn-default]': '!on',
		'[class.btn-primary]': 'on',
	},
})
export class BtnHighlight {
	@Input() btnHighlight?: boolean = undefined;
	constructor(@Optional() private model?: NgModel) {
	}
	get on() {
		const value = this.btnHighlight;
		return (value === true || value === false || !this.model) ? value : !!this.model.value;
	}
}

@Directive({
	selector: '[btnHighlightDanger]',
	host: {
		'[class.btn-default]': '!btnHighlightDanger',
		'[class.btn-danger]': 'btnHighlightDanger',
	},
})
export class BtnHighlightDanger {
	@Input() btnHighlightDanger = false;
}
