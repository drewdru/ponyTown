import { Component, OnInit, OnDestroy, NgZone, ViewChild, TemplateRef } from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { Action } from '../../../common/interfaces';
import { GameService } from '../../services/gameService';
import { Model } from '../../services/model';
import { PonyTownGame } from '../../../client/game';
import { Dropdown } from '../directives/dropdown';
import {
	emptyIcon, faCog, faSearch, faSignOutAlt, faStepForward, faVolumeOff, faVolumeUp, faVolumeDown, faPlus, faMinus
} from '../../../client/icons';
import { SettingsService } from '../../services/settingsService';
import { Audio } from '../../services/audio';

@Component({
	selector: 'settings-box',
	templateUrl: 'settings-box.pug',
	styleUrls: ['settings-box.scss'],
})
export class SettingsBox implements OnInit, OnDestroy {
	readonly cogIcon = faCog;
	readonly searchIcon = faSearch;
	readonly signOutIcon = faSignOutAlt;
	readonly forwardIcon = faStepForward;
	readonly emptyIcon = emptyIcon;
	readonly plusIcon = faPlus;
	readonly minusIcon = faMinus;
	modalRef?: BsModalRef;
	time?: string;
	@ViewChild('dropdown', { static: true }) dropdown!: Dropdown;
	@ViewChild('actionsModal', { static: true }) actionsModal!: TemplateRef<any>;
	@ViewChild('settingsModal', { static: true }) settingsModal!: TemplateRef<any>;
	@ViewChild('invitesModal', { static: true }) invitesModal!: TemplateRef<any>;
	private subscription?: Subscription;
	constructor(
		private model: Model,
		private modalService: BsModalService,
		private settingsService: SettingsService,
		private gameService: GameService,
		private game: PonyTownGame,
		private audio: Audio,
		private zone: NgZone,
	) {
	}
	get scale() {
		return this.game.scale;
	}
	get volume() {
		return this.game.volume;
	}
	set volume(value: number) {
		this.settingsService.browser.volume = value;
		this.settingsService.saveBrowserSettings();
		this.audio.setVolume(value);
	}
	get server() {
		return this.gameService.server && this.gameService.server.name || '';
	}
	get settings() {
		return this.model.account && this.model.account.settings || {};
	}
	get track() {
		return this.game.audio.trackName;
	}
	get volumeIcon() {
		return this.volume === 0 ? faVolumeOff : (this.volume < 50 ? faVolumeDown : faVolumeUp);
	}
	get isMod() {
		return this.model.isMod;
	}
	get hasInvites() {
		return this.isMod; // TEMP
	}
	ngOnInit() {
		this.game.onClock
			.pipe(
				distinctUntilChanged(),
			)
			.subscribe(text => {
				if (this.dropdown.isOpen) {
					this.zone.run(() => this.time = text);
				} else {
					this.time = text;
				}
			});
	}
	ngOnDestroy() {
		this.subscription && this.subscription.unsubscribe();
	}
	toggleVolume() {
		this.volume = this.volume === 0 ? 50 : 0;
	}
	volumeStarted() {
		this.game.audio.forcePlay();
	}
	nextTrack() {
		this.game.audio.playRandomTrack();
	}
	leave() {
		this.gameService.leave('From settings dropdown');
		this.dropdown.close();
	}
	zoomOut() {
		this.game.zoomOut();
	}
	zoomIn() {
		this.game.zoomIn();
	}
	unhideAllHiddenPlayers() {
		this.game.send(server => server.action(Action.UnhideAllHiddenPlayers));
		this.dropdown.close();
	}
	openModal(template: TemplateRef<any>) {
		this.modalRef = this.modalService.show(template, { ignoreBackdropClick: true });
	}
	openSettings() {
		this.openModal(this.settingsModal);
		this.dropdown.close();
	}
	openActions() {
		this.openModal(this.actionsModal);
		this.dropdown.close();
	}
	openInvites() {
		if (BETA) {
			this.openModal(this.invitesModal);
			this.dropdown.close();
		}
	}
}
