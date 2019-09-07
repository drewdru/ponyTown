import { Component, Input, ViewChild, ElementRef, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { ButtonAction } from '../../../common/interfaces';
import { PonyTownGame, actionButtons } from '../../../client/game';
import { drawAction } from '../../../client/buttonActions';
import { removeItem } from '../../../common/utils';

@Component({
	selector: 'action-button',
	templateUrl: 'action-button.pug',
	styleUrls: ['action-button.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: {
		'[class.empty]': '!editable && !action',
	},
})
export class ActionButton {
	@Input() action?: ButtonAction;
	@Input() editable = false;
	@Input() active = false;
	@Input() shadow = true;
	@Input() shortcut = '';
	@Output() use = new EventEmitter<ButtonAction>();
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	dirty = true;
	private state: any = {};
	constructor(private game: PonyTownGame) {
	}
	ngOnInit() {
		actionButtons.push(this);
	}
	ngOnDestroy() {
		removeItem(actionButtons, this);
	}
	ngOnChanges() {
		this.dirty = true;
	}
	click() {
		if (this.action) {
			this.use.emit(this.action);
		}
	}
	draw() {
		drawAction(this.canvas.nativeElement, this.action, this.state, this.game);
		this.dirty = false;
	}
}
