import {
	Component, Input, Output, EventEmitter, ElementRef, ChangeDetectionStrategy, HostListener, ViewChild
} from '@angular/core';
import { clamp } from 'lodash';
import { AgDragEvent } from '../directives/agDrag';
import { Key } from '../../../client/input/input';

@Component({
	selector: 'slider-bar',
	templateUrl: 'slider-bar.pug',
	styleUrls: ['slider-bar.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'role': 'slider',
		'[tabindex]': 'disabled ? -1 : 0',
		'[attr.aria-valuemin]': 'min',
		'[attr.aria-valuemax]': 'max',
		'[attr.aria-valuenow]': 'value',
		'[attr.aria-disabled]': 'disabled',
	},
})
export class SliderBar {
	@Input() min = 0;
	@Input() max = 100;
	@Input() step = 0;
	@Input() largeStep = 10;
	@Input() disabled = false;
	@Input() value = 0;
	@Output() valueChange = new EventEmitter<number>();
	@Output() changed = new EventEmitter<number>();
	@ViewChild('bar', { static: true }) bar!: ElementRef;
	private currentWidth = 0;
	get width() {
		return clamp(((this.value - this.min) / (this.max - this.min)) * 100, 0, 100);
	}
	drag({ type, x, event }: AgDragEvent) {
		if (this.disabled)
			return;

		event.preventDefault();

		if (type === 'start') {
			this.currentWidth = this.bar.nativeElement.getBoundingClientRect().width;
		}

		let val = this.min + clamp(x / this.currentWidth, 0, 1) * (this.max - this.min);

		if (this.step) {
			val = Math.round(val / this.step) * this.step;
		}

		this.setValue(val, false);

		if (type === 'end') {
			this.changed.emit(val);
		}
	}
	@HostListener('keydown', ['$event'])
	keydown(e: KeyboardEvent) {
		if (this.disabled)
			return;

		const step = this.step || 1;

		if (e.keyCode === Key.LEFT || e.keyCode === Key.DOWN || e.keyCode === Key.PAGE_DOWN) {
			e.preventDefault();
			this.setValue(this.value - step * (e.keyCode === Key.PAGE_DOWN ? this.largeStep : 1), true);
		} else if (e.keyCode === Key.RIGHT || e.keyCode === Key.UP || e.keyCode === Key.PAGE_UP) {
			e.preventDefault();
			this.setValue(this.value + step * (e.keyCode === Key.PAGE_UP ? this.largeStep : 1), true);
		} else if (e.keyCode === Key.HOME) {
			e.preventDefault();
			this.setValue(this.min, true);
		} else if (e.keyCode === Key.END) {
			e.preventDefault();
			this.setValue(this.max, true);
		}
	}
	private setValue(value: number, emit: boolean) {
		if (this.value !== value) {
			this.value = clamp(value, this.min, this.max);
			this.valueChange.emit(this.value);

			if (emit) {
				this.changed.emit(value);
			}
		}
	}
}
