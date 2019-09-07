import { Component } from '@angular/core';
import { faTimes } from '../../../client/icons';
import { InstallService } from '../../services/installService';
import { isMobile } from '../../../client/data';

@Component({
	selector: 'install-button',
	templateUrl: 'install-button.pug',
	styleUrls: ['install-button.scss'],
})
export class InstallButton {
	readonly closeIcon = faTimes;
	constructor(private installService: InstallService) {
	}
	get canInstall() {
		return this.installService.canInstall;
	}
	get isMobile() {
		return isMobile;
	}
	install() {
		this.installService.install();
	}
	dismiss() {
		this.installService.dismiss();
	}
}
