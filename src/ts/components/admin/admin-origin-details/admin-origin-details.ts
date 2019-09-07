import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Event } from '../../../common/adminInterfaces';
import { AdminModel } from '../../services/adminModel';

@Component({
	selector: 'admin-origin-details',
	templateUrl: 'admin-origin-details.pug',
})
export class AdminOriginDetails implements OnInit {
	events?: Event[];
	accounts: string[] = [];
	ip?: string;
	constructor(private route: ActivatedRoute, private model: AdminModel) {
	}
	get whoisHref() {
		return `http://whois.urih.com/record/${this.ip}/`;
	}
	ngOnInit() {
		this.route.params.forEach(p => {
			this.ip = p['ip'];
			this.update();
		});
	}
	private update() {
		this.accounts = [];

		if (this.model.connected && this.ip) {
			this.model.getAccountsByOrigin(this.ip)
				.then(accounts => this.accounts = accounts || []);
			this.events = this.model.events
				.filter(e => e.origin && e.origin.ip === this.ip)
				.slice(0, 20);
		}
	}
}
