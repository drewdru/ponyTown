import { Injectable } from '@angular/core';
import { AccountSettings, BrowserSettings } from '../../common/interfaces';
import { StorageService } from './storageService';
import { Model } from './model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
	browser: BrowserSettings;
	private save: (settings: AccountSettings) => boolean = () => false;
	constructor(private storage: StorageService, private model: Model) {
		this.browser = this.storage.getJSON('browser-settings', {});
	}
	get account(): AccountSettings {
		return this.model.account ? this.model.account.settings : {};
	}
	set account(value) {
		if (this.model.account) {
			this.model.account.settings = value;
		}
	}
	saving(save: (settings: AccountSettings) => boolean) {
		this.save = save;
	}
	saveAccountSettings(settings: AccountSettings) {
		if (this.model.account) {
			this.model.account.settings = settings;
		}

		if (settings.filterWords) {
			settings.filterWords = settings.filterWords.trim();
		}

		if (this.save(settings)) {
			return Promise.resolve();
		} else {
			return this.model.saveSettings(settings);
		}
	}
	saveBrowserSettings(settings?: BrowserSettings) {
		this.browser = settings || this.browser;
		this.storage.setJSON('browser-settings', this.browser);
	}
}
