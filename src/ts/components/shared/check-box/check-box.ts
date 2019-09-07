import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { faCheck } from '../../../client/icons';

@Component({
	selector: 'check-box',
	templateUrl: 'check-box.pug',
	styleUrls: ['check-box.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckBox {
	@Input() icon = faCheck;
	@Input() label?: string;
	@Input() disabled = false;
	@Input() checked = false;
	@Output() checkedChange = new EventEmitter<boolean>();
	toggle() {
		if (!this.disabled) {
			this.checked = !this.checked;
			this.checkedChange.emit(this.checked);
		}
	}
}
