import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
	selector: 'time-field',
	templateUrl: 'time-field.pug',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeField {
	@Input() time: any;
}
