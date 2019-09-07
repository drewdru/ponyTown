import { Component } from '@angular/core';
import { Model } from '../../services/model';
import { supporterLink } from '../../../client/data';

@Component({
	selector: 'support-button',
	templateUrl: 'support-button.pug',
	styleUrls: ['support-button.scss'],
})
export class SupportButton {
	readonly patreonLink = supporterLink;
	constructor(private model: Model) {
	}
	get supporter() {
		return this.model.supporter;
	}
}
