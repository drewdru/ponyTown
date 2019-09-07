import { Component, Input } from '@angular/core';
import { Origin, BannedMuted } from '../../../../common/adminInterfaces';
import { AdminModel } from '../../../services/adminModel';
import { countryCodeToName } from '../../../../common/countries';

@Component({
	selector: 'origin-info',
	templateUrl: 'origin-info.pug',
	styleUrls: ['origin-info.scss'],
})
export class OriginInfo {
	@Input() origin?: Origin;
	constructor(private model: AdminModel) {
	}
	get countryName() {
		return countryCodeToName[this.origin && this.origin.country || '??'] || 'Unknown';
	}
	toggleBan(field: keyof BannedMuted, value: number) {
		if (this.origin) {
			this.model.updateOrigin({ ip: this.origin.ip, country: this.origin.country, [field]: value });
		}
	}
}
