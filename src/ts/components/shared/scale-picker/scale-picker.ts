import { Component, Input, Output, EventEmitter } from '@angular/core';
import { times } from 'lodash';

@Component({
	selector: 'scale-picker',
	templateUrl: 'scale-picker.pug',
})
export class ScalePicker {
	@Input() scale = 1;
	@Output() scaleChange = new EventEmitter<number>();
	scales = [1, 2, 3, 4];
	@Input() set maxScale(value: number) {
		this.scales = times(value, i => i + 1);
	}
	setScale(value: number) {
		if (value !== this.scale) {
			this.scale = value;
			this.scaleChange.emit(value);
		}
	}
}
