import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ServerInfo, AccountDataFlags } from '../../../common/interfaces';
import { RequestError, delay, includes, hasFlag } from '../../../common/utils';
import {
	WEBGL_CREATION_ERROR, ACCESS_ERROR, ACCOUNT_ERROR, BROWSER_NOT_SUPPORTED_ERROR, NAME_ERROR, VERSION_ERROR,
	OFFLINE_ERROR, PROTECTION_ERROR, NOT_AUTHENTICATED_ERROR, CHARACTER_LIMIT_ERROR
} from '../../../common/errors';
import { version } from '../../../client/data';
import { GameService } from '../../services/gameService';
import { Model } from '../../services/model';
import { faSpinner, faExclamationCircle, faInfoCircle, faGlobe, faStar, faWrench } from '../../../client/icons';
import { isBrowserOutdated, hardReload, isAndroidBrowser } from '../../../client/clientUtils';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { StorageService } from '../../services/storageService';
import { ErrorReporter } from '../../services/errorReporter';
import { REQUEST_DATE_OF_BIRTH } from '../../../common/constants';

const ignoredErrors = [
	WEBGL_CREATION_ERROR,
	BROWSER_NOT_SUPPORTED_ERROR,
	NAME_ERROR,
	OFFLINE_ERROR,
	VERSION_ERROR,
	ACCESS_ERROR,
	PROTECTION_ERROR,
	NOT_AUTHENTICATED_ERROR,
	CHARACTER_LIMIT_ERROR,
	'Saving in progress',
];

@Component({
	selector: 'play-box',
	templateUrl: 'play-box.pug',
	styleUrls: ['play-box.scss'],
})
export class PlayBox implements OnInit {
	readonly spinnerIcon = faSpinner;
	readonly warningIcon = faExclamationCircle;
	readonly infoIcon = faInfoCircle;
	readonly requestBirthdate = REQUEST_DATE_OF_BIRTH;
	@Output() errorChange = new EventEmitter<string | undefined>();
	@Input() label?: string;
	joining = false;
	failedToLoadImages = false;
	birthdate = '';
	birthdateSet = false;
	private locked = false;
	constructor(
		public gameService: GameService,
		public model: Model,
		private storage: StorageService,
		private errorReporter: ErrorReporter,
	) {
	}
	@Input()
	get error() {
		return this.gameService.error;
	}
	set error(value: string | undefined) {
		if (this.gameService) {
			this.gameService.error = value;
			this.errorChange.emit(value);
		}
	}
	get server() {
		return this.gameService.server;
	}
	set server(value: ServerInfo | undefined) {
		this.gameService.server = value;
	}
	get servers() {
		return this.gameService.servers;
	}
	get offline(): boolean {
		return this.gameService.offline;
	}
	get updateWarning() {
		return this.gameService.updateWarning;
	}
	get invalidVersion(): boolean {
		return !!(this.gameService.versionError || this.error === VERSION_ERROR
			|| (this.gameService.version && this.gameService.version !== version));
	}
	get protectionError(): boolean {
		return this.gameService.protectionError || this.error === PROTECTION_ERROR;
	}
	get canPlay(): boolean {
		return !!this.server && this.gameService.canPlay && !this.locked && !this.invalidVersion && !this.failedToLoadImages;
	}
	get isAccessError(): boolean {
		return this.error === ACCESS_ERROR || this.error === ACCOUNT_ERROR;
	}
	get isWebGLError(): boolean {
		return this.error === WEBGL_CREATION_ERROR;
	}
	get isBrowserError(): boolean {
		return this.error === BROWSER_NOT_SUPPORTED_ERROR;
	}
	get isOtherError(): boolean {
		return !!this.error && !this.invalidVersion && !this.isAccessError && !this.isWebGLError && !this.isBrowserError;
	}
	get ponyLimit() {
		return this.model.characterLimit;
	}
	get hasTooManyPonies(): boolean {
		return this.model.ponies.length > this.ponyLimit;
	}
	get isMarkedForMultiples(): boolean {
		const account = this.model.account;
		return !!account && hasFlag(account.flags, AccountDataFlags.Duplicates);
	}
	get isAndroidBrowser() {
		return isAndroidBrowser;
	}
	get isBrowserOutdated() {
		return !isAndroidBrowser && isBrowserOutdated && !this.storage.getBoolean('dismiss-outdated-browser');
	}
	get leftMessage() {
		return this.gameService.leftMessage;
	}
	get accountAlert() {
		return this.model.accountAlert;
	}
	ngOnInit() {
		loadAndInitSpriteSheets()
			.then(loaded => this.failedToLoadImages = !loaded);
	}
	play() {
		if (this.canPlay) {
			this.joining = true;
			this.locked = true;
			this.error = undefined;

			const delayTime = (!DEVELOPMENT && this.gameService.wasPlaying) ? 1500 : 10;

			delay(delayTime) // delay joing if user reloaded the game instead of leaving cleanly
				.then(() => this.model.savePony(this.model.pony))
				.then(pony => this.joining ? this.gameService.join(pony.id) : Promise.resolve())
				.catch((e: RequestError) => {
					if (!/^Cancelled/.test(e.message)) {
						this.error = e.message;

						if (!includes(ignoredErrors, e.message) && !/shader/.test(e.message)) {
							this.errorReporter.reportError(e, { status: e.status, text: e.text });
						}

						DEVELOPMENT && console.error(e);
					}
				})
				.finally(() => this.joining = false)
				.then(() => delay(1500))
				.finally(() => this.locked = false);
		}
	}
	cancel() {
		this.gameService.leave('Cancelled joining');
	}
	reload() {
		location.reload(true);
	}
	hardReload() {
		hardReload();
	}
	hasFlag(server: ServerInfo) {
		return server.countryFlags && server.countryFlags.length;
	}
	getIcon(server: ServerInfo) {
		switch (server.flag) {
			case 'star': return faStar;
			case 'test': return faWrench;
			default: return faGlobe;
		}
	}
	dismissOutdatedBrowser() {
		this.storage.setBoolean('dismiss-outdated-browser', true);
	}
	saveBirthdate() {
		if (this.birthdate) {
			this.model.updateAccount({ birthdate: this.birthdate });
			this.birthdateSet = true;
		}
	}
}
