import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { parseColor, colorToCSS } from '../../../common/color';

@Component({
	selector: 'bitmap-box',
	templateUrl: 'bitmap-box.pug',
	styleUrls: ['bitmap-box.scss'],
})
export class BitmapBox implements OnChanges {
	@Input() width = 5;
	@Input() height = 5;
	@Input() bitmap?: string[];
	@Input() tool?: string;
	@Input() color = 'red';
	@Output() colorChange = new EventEmitter<string>();
	rows?: number[][];
	ngOnChanges(changes: SimpleChanges) {
		if (changes.width || changes.height) {
			this.rows = [];

			for (let y = 0; y < this.height; y++) {
				this.rows[y] = [];

				for (let x = 0; x < this.width; x++) {
					this.rows[y][x] = x + this.width * y;
				}
			}
		}
	}
	draw(index: number) {
		if (this.bitmap) {
			if (this.tool === 'eraser') {
				this.bitmap[index] = '';
			} else if (this.tool === 'brush') {
				this.bitmap[index] = parseColor(this.bitmap[index]) === parseColor(this.color) ? '' : this.color;
			} else if (this.tool === 'eyedropper') {
				this.color = this.bitmap[index];
				this.colorChange.emit(this.color);
			}
		}
	}
	colorAt(index: number) {
		return this.bitmap && this.bitmap[index] ? colorToCSS(parseColor(this.bitmap[index])) : '';
	}
}
