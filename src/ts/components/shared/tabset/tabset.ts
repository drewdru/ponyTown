import {
	Component, Directive, TemplateRef, Input, ContentChild, ContentChildren, QueryList, Output, EventEmitter
} from '@angular/core';
import { uniqueId } from 'lodash';
import { Key } from '../../../client/input/input';

@Directive({
	selector: '[tabTitle]'
})
export class TabTitle {
	constructor(public templateRef: TemplateRef<any>) {
	}
}

@Directive({
	selector: '[tabContent]',
})
export class TabContent {
	constructor(public templateRef: TemplateRef<any>) {
	}
}

@Directive({
	selector: 'tab',
})
export class Tab {
	@Input() id = uniqueId(`tabset-tab`);
	@Input() title?: string;
	@Input() icon?: any;
	@Input() disabled = false;
	@ContentChild(TabContent, { static: false }) contentTpl?: TabContent;
	@ContentChild(TabTitle, { static: false }) titleTpl?: TabTitle;
}

@Component({
	selector: 'tabset',
	templateUrl: 'tabset.pug',
})
export class Tabset {
	justifyClass?: string;
	@ContentChildren(Tab) tabs!: QueryList<Tab>;
	@Input() label = '';
	@Input() destroyOnHide = true;
	@Input()
	set justify(className: 'start' | 'center' | 'end' | 'fill' | 'justified') {
		if (className === 'fill' || className === 'justified') {
			this.justifyClass = `nav-${className}`;
		} else {
			this.justifyClass = `justify-content-${className}`;
		}
	}
	@Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
	@Input() type: 'tabs' | 'pills' = 'tabs';
	@Input() activeIndex = 0;
	@Output() activeIndexChange = new EventEmitter<number>();
	constructor() {
		this.justify = 'start';
	}
	get navClass() {
		return `nav-${this.type}${this.orientation === 'horizontal' ? ` ${this.justifyClass}` : ' flex-column'}`;
	}
	select(index: number) {
		if (this.activeIndex !== index) {
			this.activeIndex = index;
			this.activeIndexChange.emit(index);
		}
	}
	keydown(e: KeyboardEvent) {
		const index = this.handleKey(e.keyCode);

		if (index !== undefined) {
			e.preventDefault();
			const element = document.getElementById(this.tabs.toArray()[index].id);
			element && element.focus();
			this.select(index);
		}
	}
	private handleKey(keyCode: number) {
		if (keyCode === Key.LEFT) {
			return this.activeIndex === 0 ? this.tabs.length - 1 : this.activeIndex - 1;
		} else if (keyCode === Key.RIGHT) {
			return this.activeIndex === this.tabs.length - 1 ? 0 : this.activeIndex + 1;
		} else if (keyCode === Key.HOME) {
			return 0;
		} else if (keyCode === Key.END) {
			return this.tabs.length - 1;
		} else {
			return undefined;
		}
	}
}

export const tabsetComponents = [TabContent, TabTitle, Tabset, Tab];
