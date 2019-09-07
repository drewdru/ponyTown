import { Injectable, NgZone } from '@angular/core';
import { removeItem } from '../../common/utils';

@Injectable({
	providedIn: 'root',
})
export class IntervalUpdateService {
	private interval: any;
	private actions: (() => void)[] = [];
	constructor(private zone: NgZone) {
	}
	subscribe(action: () => void) {
		this.actions.push(action);

		if (!this.interval) {
			this.zone.runOutsideAngular(() => {
				this.interval = setInterval(() => {
					this.actions.forEach(a => a());
				}, 1000 * 10);
			});
		}

		return () => {
			removeItem(this.actions, action);

			if (this.actions.length === 0) {
				clearInterval(this.interval);
				this.interval = undefined;
			}
		};
	}
	toggle(action: () => void) {
		let unsubscribe: (() => void) | undefined;

		return (on: boolean) => {
			if (on && !unsubscribe) {
				unsubscribe = this.subscribe(action);
			} else if (!on && unsubscribe) {
				unsubscribe();
				unsubscribe = undefined;
			}
		};
	}
}
