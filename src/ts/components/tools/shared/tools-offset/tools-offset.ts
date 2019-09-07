import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Point } from '../../../../common/interfaces';
import { faChevronRight, faChevronLeft, faChevronDown, faChevronUp } from '../../../../client/icons';

@Component({
	selector: 'tools-offset',
	templateUrl: 'tools-offset.pug',
	styleUrls: ['tools-offset.scss'],
})
export class ToolsOffset {
	readonly rightIcon = faChevronRight;
	readonly leftIcon = faChevronLeft;
	readonly upIcon = faChevronUp;
	readonly downIcon = faChevronDown;
	@Input() offset?: Point;
	@Output() change = new EventEmitter<void>();
	moveX(value: number) {
		if (this.offset) {
			this.offset.x += value;
			this.change.emit();
		}
	}
	moveY(value: number) {
		if (this.offset) {
			this.offset.y += value;
			this.change.emit();
		}
	}
}
