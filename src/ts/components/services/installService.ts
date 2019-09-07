import { Injectable } from '@angular/core';
import { StorageService } from './storageService';

interface InstallEvent extends Event {
	prompt(): void;
	userChoice: Promise<'accepted' | 'dismissed'>;
}

@Injectable({
	providedIn: 'root',
})
export class InstallService {
	private installEvent?: InstallEvent;
	constructor(private storage: StorageService) {
		if (!this.storage.getBoolean('install-dismissed')) {
			window.addEventListener('beforeinstallprompt', event => {
				event.preventDefault();
				this.installEvent = event as any;
			});
		}
	}
	get canInstall() {
		return !!this.installEvent || (DEVELOPMENT && localStorage.getItem('install'));
	}
	install() {
		if (!this.installEvent) {
			return Promise.reject(new Error('Cannot install'));
		}

		this.installEvent.prompt();

		return this.installEvent.userChoice
			.finally(() => {
				this.installEvent = undefined;
			});
	}
	dismiss() {
		this.installEvent = undefined;
		this.storage.setBoolean('install-dismissed', true);
	}
}
