import { Component, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { Sprite, PonyInfo } from '../../../../common/interfaces';

let openedPopover: ToolsFrame;

@Component({
	selector: 'tools-frame',
	templateUrl: 'tools-frame.pug',
	styleUrls: ['tools-frame.scss'],
})
export class ToolsFrame {
	@Input() x = 0;
	@Input() y = 0;
	@Input() sprites!: Sprite[];
	@Input() frame!: number;
	@Input() pony!: PonyInfo;
	@Input() reverseExtra = false;
	@Input() circle?: string;
	@Output() frameChange = new EventEmitter<number>();
	popoverIsOpen = false;
	placement = 'right';
	private savedFrame = 0;
	private selected = false;
	constructor(private element: ElementRef) {
	}
	get sprite() {
		return this.sprites[this.frame];
	}
	closePopover = () => {
		if (this.popoverIsOpen) {
			this.togglePopover();
		}
	}
	togglePopover() {
		const rect = (this.element.nativeElement as HTMLElement).getBoundingClientRect();
		this.placement = (rect.left < (window.innerWidth / 2)) ? 'right' : 'left';

		if (!this.popoverIsOpen) {
			if (openedPopover) {
				openedPopover.popoverIsOpen = false;
			}

			openedPopover = this;
		}

		this.popoverIsOpen = !this.popoverIsOpen;

		if (this.popoverIsOpen) {
			this.selected = false;
			window.addEventListener('mousedown', this.closePopover);
		} else {
			window.removeEventListener('mousedown', this.closePopover);
		}

		setTimeout(() => { }, 10);
	}
	select(index: number) {
		this.selected = true;
		this.frame = index;
		this.togglePopover();
		this.frameChange.emit(this.frame);
	}
	enter(index: number) {
		if (!this.selected) {
			this.savedFrame = this.frame;
			this.frame = index;
			this.frameChange.emit(this.frame);
		}
	}
	leave() {
		if (!this.selected) {
			this.frame = this.savedFrame;
			this.frameChange.emit(this.frame);
		}
	}
}
