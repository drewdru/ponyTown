import { Component, Input, Output, EventEmitter } from '@angular/core';
import { clamp } from '../../../common/utils';
import { parseColorFast, colorToCSS, colorFromHSVA, colorToHSVA, colorToHexRGB } from '../../../common/color';
import { AgDragEvent } from '../directives/agDrag';
import { faChevronDown } from '../../../client/icons';

const SIZE = 175;

@Component({
	selector: 'color-picker',
	templateUrl: 'color-picker.pug',
	styleUrls: ['color-picker.scss'],
})
export class ColorPicker {
	readonly chevronIcon = faChevronDown;
	@Input() isOpen = false;
	@Input() isDisabled = false;
	@Input() disabledColor = '';
	@Input() color = '';
	@Input() indicatorColor = '';
	@Input() label?: string = undefined;
	@Input() labelledBy?: string = undefined;
	@Output() colorChange = new EventEmitter<string>();
	s = 0;
	v = 0;
	h = 0;
	private lastColor = '';
	private closeHandler = () => this.close();
	get inputColor() {
		return this.isDisabled && this.disabledColor ? this.disabledColor : this.color;
	}
	set inputColor(value) {
		if (!this.isDisabled) {
			this.color = value;
		}
	}
	get bg() {
		return colorToCSS(parseColorFast(this.inputColor));
	}
	get svLeft() {
		this.updateHsv();
		return this.s * 100;
	}
	get svTop() {
		this.updateHsv();
		return (1 - this.v) * 100;
	}
	get hueTop() {
		this.updateHsv();
		return this.h * 100 / 360;
	}
	get hue() {
		this.updateHsv();
		return colorToCSS(colorFromHSVA(this.h, 1, 1, 1));
	}
	focus(e: Event) {
		this.isOpen = true;
		(e.target as HTMLInputElement).select();
	}
	dragSV({ event, x, y }: AgDragEvent) {
		event.preventDefault();

		this.updateHsv();
		this.s = clamp(x / SIZE, 0, 1);
		this.v = 1 - clamp(y / SIZE, 0, 1);
		this.updateColor();
	}
	dragHue({ event, y }: AgDragEvent) {
		event.preventDefault();

		this.updateHsv();
		this.h = clamp(360 * y / SIZE, 0, 360);
		this.updateColor();
	}
	updateHsv() {
		if (this.lastColor !== this.color) {
			const { h, s, v } = colorToHSVA(parseColorFast(this.color), this.h);
			this.h = h;
			this.s = s;
			this.v = v;
			this.lastColor = this.color;
		}
	}
	updateColor() {
		const color = colorToHexRGB(colorFromHSVA(this.h, this.s, this.v, 1));
		const changed = this.color !== color;
		this.lastColor = this.color = color;

		if (changed) {
			this.colorChange.emit(color);
		}
	}
	inputChanged(value: string) {
		this.color = value;
		this.colorChange.emit(this.color);
	}
	stopEvent(e: Event) {
		e.stopPropagation();
		e.preventDefault();
	}
	open() {
		if (!this.isOpen) {
			this.isOpen = true;

			setTimeout(() => {
				document.addEventListener('mousedown', this.closeHandler);
				document.addEventListener('touchstart', this.closeHandler);
			});
		}
	}
	close() {
		this.isOpen = false;
		document.removeEventListener('mousedown', this.closeHandler);
		document.removeEventListener('touchstart', this.closeHandler);
	}
	toggleOpen() {
		if (!this.isDisabled) {
			if (this.isOpen) {
				this.close();
			} else {
				this.open();
			}
		}
	}
}
