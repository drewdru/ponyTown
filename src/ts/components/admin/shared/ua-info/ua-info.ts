import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { UAParser } from 'ua-parser-js';
import { uaIcons, faQuestionCircle, faGlobe, faDesktop } from '../../../../client/icons';

function icon(value: string | undefined, defaultValue: any): any {
	return value && uaIcons[value] || defaultValue;
}

const extensions = {
	browser: [
		[/(Amigo|YaBrowser)\/([\w\.]+)/i], [UAParser.BROWSER.NAME, UAParser.BROWSER.VERSION]
	],
};

@Component({
	selector: 'ua-info',
	templateUrl: 'ua-info.pug',
	styles: [`:host { display: inline-block; }`],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UAInfo {
	osClass?: string;
	osVersion?: string;
	browserClass?: string;
	browserVersion?: string;
	deviceClass?: string;
	private _userAgent?: string;
	@Input() set userAgent(value: string | undefined) {
		if (this._userAgent !== value) {
			this._userAgent = value;

			const parser = new UAParser(value, extensions);
			const { os, browser, device } = parser.getResult();

			this.osVersion = os.version;
			this.browserVersion = (browser.version || '').replace(/\..*$/, '');
			this.osClass = icon(os.name, faQuestionCircle);
			this.browserClass = icon(browser.name, faGlobe);
			this.deviceClass = icon(device.type, faDesktop);
		}
	}
	get userAgent() {
		return this._userAgent;
	}
}
