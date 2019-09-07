import { Component, OnInit, OnDestroy } from '@angular/core';
import { compact } from 'lodash';
import { AdminModel } from '../../services/adminModel';
import { Account, GeneralSettings } from '../../../common/adminInterfaces';
import { Subscription } from '../../../common/interfaces';
import { showTextInNewTab } from '../../../client/htmlUtils';

interface Field {
	key: keyof GeneralSettings;
	title: string;
	value: string | undefined;
}

@Component({
	selector: 'admin-other',
	templateUrl: 'admin-other.pug',
})
export class AdminOther implements OnInit, OnDestroy {
	fields: Field[] = [
		{ key: 'suspiciousNames', title: 'Suspicious pony names & emails to report', value: undefined },
		{ key: 'suspiciousAuths', title: 'Suspicious auths to report', value: undefined },
		{ key: 'suspiciousMessages', title: 'Suspicious messages to report (instant)', value: undefined },
		{ key: 'suspiciousSafeMessages', title: 'Suspicious messages to report (safe only) (5+)', value: undefined },
		{ key: 'suspiciousSafeWholeMessages', title: 'Suspicious messages to report (safe only) (5+) (whole words)', value: undefined },
		{ key: 'suspiciousSafeInstantMessages', title: 'Suspicious messages to report (safe only) (instant)', value: undefined },
		{
			key: 'suspiciousSafeInstantWholeMessages',
			title: 'Suspicious messages to report (safe only) (whole words) (instant)',
			value: undefined
		},
	];
	max = 100;
	value = 0;
	error?: string;
	succeeded = false;
	suspiciousPonies?: string;
	suspiciousPoniesError?: string;
	ignoreErrors?: string;
	account: Account | undefined;
	private subscription?: Subscription;
	constructor(public model: AdminModel) {
	}
	ngOnInit() {
		this.model.accountPromise.then(() => {
			this.resetFields();
			this.resetSuspiciousPonies();
		});
	}
	ngOnDestroy() {
		this.subscription && this.subscription.unsubscribe();
	}
	saveFields() {
		let settings: any = {};
		this.fields.forEach(field => settings[field.key] = field.value);
		this.model.updateSettings(settings);
	}
	resetFields() {
		this.fields.map(field => {
			field.value = this.model.state.loginServers[0][field.key] as string | undefined;
		});
	}
	saveSuspiciousPonies() {
		this.suspiciousPoniesError = undefined;

		try {
			compact(this.suspiciousPonies!.split(/\n/g).map(x => x.trim())).map(x => JSON.parse(x));
			this.model.updateSettings({ suspiciousPonies: this.suspiciousPonies });
		} catch (e) {
			this.suspiciousPoniesError = e.message;
		}
	}
	resetSuspiciousPonies() {
		this.suspiciousPonies = this.model.state.loginServers[0].suspiciousPonies;
	}
	updatePatreon() {
		this.model.server.updatePatreon();
	}
	updatePatreonToken(patreonToken: string) {
		this.model.updateSettings({ patreonToken });
	}
	getLastPatreonData() {
		this.model.getLastPatreonData()
			.then(data => {
				showTextInNewTab(JSON.stringify(data, null, 2));
			});
	}
	updatePastSupporters() {
		this.model.updatePastSupporters();
	}
}
