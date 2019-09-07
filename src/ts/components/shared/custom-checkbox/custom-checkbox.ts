import { Component, ChangeDetectionStrategy, Output, Input, EventEmitter } from '@angular/core';
import { uniqueId } from 'lodash';

@Component({
	selector: 'custom-checkbox',
	templateUrl: 'custom-checkbox.pug',
	styleUrls: ['custom-checkbox.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomCheckbox {
	@Input() disabled = false;
	@Input() help = '';
	@Input() checked = false;
	@Output() checkedChange = new EventEmitter<boolean>();
	helpId = uniqueId('custom-checkbox-help-');
}
