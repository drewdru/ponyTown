import { Component, forwardRef, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { faChevronRight, faChevronLeft, faChevronUp, faChevronDown } from '../../../../client/icons';

@Component({
	selector: 'tools-range',
	templateUrl: 'tools-range.pug',
	styleUrls: ['tools-range.scss'],
	providers: [
		{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ToolsRange), multi: true },
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsRange implements ControlValueAccessor {
	readonly rightIcon = faChevronRight;
	readonly leftIcon = faChevronLeft;
	readonly upIcon = faChevronUp;
	readonly downIcon = faChevronDown;
	@Input() min = 0;
	@Input() max = 100;
	@Input() vertical = false;
	@Input() small = false;
	@Input() placeholder?: string;
	@Output() change = new EventEmitter<number>();
	private _value = 0;
	private propagateChange: any = () => { };
	get value() {
		return this._value;
	}
	set value(value: number) {
		this._value = value;
		this.propagateChange(value);
		this.change.emit();
	}
	decrement() {
		if (this.value > this.min) {
			this.value = this.value - 1;
		}
	}
	increment() {
		if (this.value < this.max) {
			this.value = this.value + 1;
		}
	}
	writeValue(value: number | undefined) {
		if (value !== undefined) {
			this.value = value;
		}
	}
	registerOnChange(callback: any) {
		this.propagateChange = callback;
	}
	registerOnTouched() {
	}
}
