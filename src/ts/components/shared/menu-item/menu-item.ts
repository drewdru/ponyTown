import { Component, Input } from '@angular/core';
import { emptyIcon } from '../../../client/icons';

@Component({
	selector: 'menu-item',
	templateUrl: 'menu-item.pug',
	styleUrls: ['menu-item.scss'],
})
export class MenuItem {
	@Input() route: any;
	@Input() name?: string;
	@Input() icon = emptyIcon;
}
