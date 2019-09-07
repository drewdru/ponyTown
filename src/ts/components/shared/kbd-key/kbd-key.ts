import { Component, Input } from '@angular/core';

@Component({
	selector: 'kbd-key',
	templateUrl: 'kbd-key.pug',
})
export class KbdKey {
	@Input() title?: string;
}
