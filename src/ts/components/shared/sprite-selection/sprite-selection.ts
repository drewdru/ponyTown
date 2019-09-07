import { Component, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { uniqueId } from 'lodash';
import { ColorExtra } from '../../../common/interfaces';
import { Key } from '../../../client/input/input';
import { focusElementAfterTimeout } from '../../../client/htmlUtils';

const MAX = 999999;

@Component({
	selector: 'sprite-selection',
	templateUrl: 'sprite-selection.pug',
	styleUrls: ['sprite-selection.scss'],
	host: {
		'role': 'radiogroup',
		'tabindex': '0',
		'(keydown)': 'keydown($event)',
		'[attr.aria-activedescendant]': 'activeDescendant',
	},
})
export class SpriteSelection {
	@Input() selected = 0;
	@Output() selectedChange = new EventEmitter<number>();
	@Input() sprites?: ColorExtra[];
	@Input() fill?: string | string[];
	@Input() outline?: string | string[];
	@Input() circle?: string;
	@Input() reverseExtra = false;
	@Input() limit = MAX;
	@Input() skip = 0;
	@Input() disabled = false;
	@Input() emptyLabel?: string;
	@Input() invisible = false;
	@Input() darken = true;
	id = uniqueId('sprite-selection-');
	constructor(private element: ElementRef) {
	}
	get hasMore() {
		return this.sprites && this.sprites.length > this.limit;
	}
	get end() {
		return this.skip + this.limit;
	}
	get activeDescendant() {
		return `${this.id}-${this.selected - this.skip}`;
	}
	isSelected(index: number) {
		return this.selected === (index + this.skip);
	}
	select(index: number, focus = false) {
		if (!this.disabled && this.selected !== index) {
			this.selected = index;
			this.selectedChange.emit(index);

			if (this.hasMore && index >= this.end) {
				this.showMore();
			}

			if (focus) {
				focusElementAfterTimeout(this.element.nativeElement, '.active');
			}
		}
	}
	showMore() {
		this.limit = MAX;
	}
	keydown(e: KeyboardEvent) {
		const select = this.handleKey(e.keyCode);

		if (select !== undefined) {
			e.preventDefault();
			this.select(select, true);
		}
	}
	private handleKey(keyCode: number): number | undefined {
		if (this.sprites) {
			if (keyCode === Key.RIGHT || keyCode === Key.DOWN) {
				if (this.selected >= (this.sprites.length - 1)) {
					return this.skip;
				} else {
					return this.selected + 1;
				}
			} else if (keyCode === Key.LEFT || keyCode === Key.UP) {
				if (this.selected <= this.skip) {
					return this.sprites.length - 1;
				} else {
					return this.selected - 1;
				}
			} else if (keyCode === Key.HOME) {
				return this.skip;
			} else if (keyCode === Key.END) {
				return this.sprites.length - 1;
			}
		}

		return undefined;
	}
}
