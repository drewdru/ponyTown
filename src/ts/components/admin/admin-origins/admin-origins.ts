import { Component, OnInit } from '@angular/core';
import { RequestStats, OriginStats, OtherStats } from '../../../common/adminInterfaces';
import { faSync, faEraser, faClock, faUser, faChevronDown, faSpinner } from '../../../client/icons';
import { AdminModel } from '../../services/adminModel';

@Component({
	selector: 'admin-origins',
	templateUrl: 'admin-origins.pug',
})
export class AdminOrigins implements OnInit {
	readonly syncIcon = faSync;
	readonly eraserIcon = faEraser;
	readonly clockIcon = faClock;
	readonly userIcon = faUser;
	readonly chevronDownIcon = faChevronDown;
	readonly spinnerIcon = faSpinner;
	stats?: OriginStats;
	other?: OtherStats;
	requestStats: RequestStats[] = [];
	pending = false;
	constructor(public model: AdminModel) {
	}
	ngOnInit() {
		if (this.model.connected) {
			this.update();
		}
	}
	update() {
		this.model.getOriginStats().then(stats => this.stats = stats);
		this.model.getOtherStats().then(stats => this.other = stats);
	}
	clear(count: number, andHigher = false) {
		this.clearAll(count, andHigher, true, true, false);
	}
	clearOld(count: number) {
		this.clearAll(count, true, true, false, false);
	}
	clearSingles(count: number) {
		this.clearAll(count, true, false, true, false);
	}
	clearTo10(count: number) {
		this.clearAll(count, true, false, true, true);
	}
	clearAll(count: number, andHigher: boolean, old: boolean, singles: boolean, trim: boolean) {
		this.pending = true;

		return this.model.clearOrigins(count, andHigher, { old, singles, trim })
			.finally(() => {
				this.pending = false;
				this.update();
			});
	}
}
