import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TooltipConfig } from 'ngx-bootstrap/tooltip';
import { PopoverConfig } from 'ngx-bootstrap/popover';
import { hasRole } from '../../common/accountUtils';
import { AdminModel } from '../services/adminModel';
import {
	faSpinner, faSlidersH, faExclamationCircle, faUsers, faHorseHead, faMapMarkerAlt, faChartPie, faCog
} from '../../client/icons';

export function tooltipConfig() {
	return Object.assign(new TooltipConfig(), { container: 'body' });
}

export function popoverConfig() {
	return Object.assign(new PopoverConfig(), { container: 'body' });
}

@Component({
	selector: 'pony-town-app',
	templateUrl: 'admin.pug',
	styleUrls: ['admin.scss'],
	providers: [
		{ provide: TooltipConfig, useFactory: tooltipConfig },
		{ provide: PopoverConfig, useFactory: popoverConfig },
	]
})
export class AdminApp {
	readonly spinnerIcon = faSpinner;
	readonly stateIcon = faSlidersH;
	readonly eventsIcon = faExclamationCircle;
	readonly accountsIcon = faUsers;
	readonly poniesIcon = faHorseHead;
	readonly originsIcon = faMapMarkerAlt;
	readonly reportsIcon = faChartPie;
	readonly otherIcon = faCog;
	constructor(public model: AdminModel, private router: Router) {
	}
	get loading() {
		if (!this.model.initialized) {
			return 'Initializing';
		} else if (!this.model.connected) {
			return 'Connecting';
		} else if (!this.model.loaded) {
			return 'Loading';
		} else {
			return '';
		}
	}
	get clients() {
		return this.model.state.gameServers.reduce((sum, s) => sum + s.online, 0);
	}
	get events() {
		return this.model.events.length;
	}
	get accounts() {
		return this.model.counts.accounts;
	}
	get ponies() {
		return this.model.counts.characters;
	}
	get origins() {
		return this.model.counts.origins;
	}
	get isSuperadmin() {
		return hasRole(this.model.account, 'superadmin');
	}
	@HostListener('window:go-to-account', ['$event'])
	goToAccount({ detail }: CustomEvent) {
		this.router.navigate(['/accounts', detail]);
	}
	signOut() {
		window.location.href = '/';
	}
}
