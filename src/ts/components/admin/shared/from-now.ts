import { Component, Input, OnInit, OnDestroy, OnChanges, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import * as moment from 'moment';
import { IntervalUpdateService } from '../../services/intervalUpdateService';

@Component({
	selector: 'from-now',
	template: '<span></span>',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FromNow implements OnInit, OnDestroy, OnChanges {
	@Input() time?: any;
	private moment?: moment.Moment;
	private text?: string;
	private unsubscribe?: () => void;
	constructor(private element: ElementRef, private updateService: IntervalUpdateService) {
	}
	ngOnChanges() {
		this.moment = this.time ? moment(this.time) : undefined;
		this.update();
	}
	ngOnInit() {
		this.unsubscribe = this.updateService.subscribe(() => this.update());
		this.update();
	}
	ngOnDestroy() {
		this.unsubscribe && this.unsubscribe();
	}
	private update() {
		const text = this.moment ? this.moment.fromNow(true).replace('seconds', 'secs') : '';

		if (this.text !== text) {
			this.text = text;
			(this.element.nativeElement as HTMLElement).children[0].textContent = text;
		}
	}
}
