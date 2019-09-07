import { Component, Input, ChangeDetectionStrategy, EventEmitter, Output } from '@angular/core';
import { faChevronRight, faChevronLeft, faChevronUp, faChevronDown } from '../../../../client/icons';

@Component({
	selector: 'tools-xy',
	templateUrl: 'tools-xy.pug',
	styleUrls: ['tools-xy.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsXY {
	readonly rightIcon = faChevronRight;
	readonly leftIcon = faChevronLeft;
	readonly upIcon = faChevronUp;
	readonly downIcon = faChevronDown;
	@Input() min = 0;
	@Input() max = 100;
	@Input() x = 0;
	@Input() y = 0;
	@Output() xChange = new EventEmitter<number>();
	@Output() yChange = new EventEmitter<number>();
	@Output() change = new EventEmitter<void>();
	changeX(value: number) {
		this.x = value;
		this.xChange.emit(value);
		this.change.emit();
	}
	changeY(value: number) {
		this.y = value;
		this.yChange.emit(value);
		this.change.emit();
	}
}
