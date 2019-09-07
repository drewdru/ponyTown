import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { TooltipConfig } from 'ngx-bootstrap/tooltip';
import { PopoverConfig } from 'ngx-bootstrap/popover';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { GameService } from '../services/gameService';
import { Model, Friend } from '../services/model';
import { version, host, contactEmail, supporterLink, twitterLink, copyrightName } from '../../client/data';
import { PonyTownGame } from '../../client/game';
import { faTwitter, faPatreon, faEnvelope, faCog, faHome, faGamepad, faInfoCircle, faHorseHead } from '../../client/icons';
import { InstallService } from '../services/installService';
import { OAuthProvider, Entity, FakeEntity, Pony } from '../../common/interfaces';
import { registerServiceWorker, isBrowserOutdated, checkIframeKey } from '../../client/clientUtils';
import { ErrorReporter } from '../services/errorReporter';
import { SECOND, PONY_TYPE } from '../../common/constants';
import { ChatBox } from '../shared/chat-box/chat-box';
import { ChatLogMessage } from '../shared/chat-log/chat-log';
import { isPony } from '../../common/pony';
import { findEntityById } from '../../common/worldMap';
import { isSelected } from '../../client/gameUtils';

export function tooltipConfig() {
	return Object.assign(new TooltipConfig(), { container: 'body' });
}

export function popoverConfig() {
	return Object.assign(new PopoverConfig(), { container: 'body' });
}

@Component({
	selector: 'pony-town-app',
	templateUrl: 'app.pug',
	styleUrls: ['app.scss'],
	providers: [
		{ provide: TooltipConfig, useFactory: tooltipConfig },
		{ provide: PopoverConfig, useFactory: popoverConfig },
	]
})
export class App implements OnInit, OnDestroy {
	@ViewChild('announcer', { static: true }) announcer!: ElementRef;
	@ViewChild('announcerText', { static: true }) announcerText!: ElementRef;
	@ViewChild('reloadModal', { static: true }) reloadModal!: TemplateRef<any>;
	@ViewChild('signInModal', { static: true }) signInModal!: TemplateRef<any>;
	readonly version = version;
	readonly date = new Date();
	readonly emailIcon = faEnvelope;
	readonly twitterIcon = faTwitter;
	readonly patreonIcon = faPatreon;
	readonly cogIcon = faCog;
	readonly homeIcon = faHome;
	readonly helpIcon = faGamepad;
	readonly aboutIcon = faInfoCircle;
	readonly charactersIcon = faHorseHead;
	readonly contactEmail = contactEmail;
	readonly patreonLink = supporterLink;
	readonly twitterLink = twitterLink;
	readonly copyright = copyrightName;
	private url = location.pathname;
	private reloadModalRef?: BsModalRef;
	private reloadInterval?: any;
	private subscriptions: Subscription[] = [];
	constructor(
		private modalService: BsModalService,
		private gameService: GameService,
		private model: Model,
		private game: PonyTownGame,
		private router: Router,
		private activatedRoute: ActivatedRoute,
		private installService: InstallService,
		private errorReporter: ErrorReporter,
	) {
	}
	get canInstall() {
		return this.installService.canInstall;
	}
	get loading() {
		return this.model.loading;
	}
	get account() {
		return this.model.account;
	}
	get isMod() {
		return this.model.isMod;
	}
	get notifications() {
		return this.game.notifications;
	}
	get selected() {
		return this.gameService.selected;
	}
	get playing() {
		return this.gameService.playing;
	}
	get showActionBar() {
		return this.playing;
	}
	get editingActions() {
		return this.game.editingActions;
	}
	ngOnInit() {
		if (typeof ga !== 'undefined') {
			this.subscriptions.push(this.router.events.subscribe(event => {
				if (event instanceof NavigationEnd && this.url !== event.url) {
					ga('set', 'page', this.url = event.url);
					ga('send', 'pageview');
				}
			}));
		}

		if (isBrowserOutdated) {
			this.errorReporter.disable();
		}

		if (!DEVELOPMENT) {
			registerServiceWorker(`${host}sw.js`, () => {
				this.model.updating = true;
				setTimeout(() => {
					this.model.updatingTakesLongTime = true;
				}, 20 * SECOND);
			});
		}

		if (DEVELOPMENT) {
			this.subscriptions.push(this.game.announcements.subscribe(message => {
				(this.announcer.nativeElement as HTMLElement).style.display = 'flex';
				const announcerText = this.announcerText.nativeElement as HTMLElement;
				announcerText.textContent = '';
				setTimeout(() => announcerText.textContent = message, 100);
			}));
		}

		this.activatedRoute.queryParams.subscribe(({ error, merged, alert }) => {
			this.model.authError = error;
			this.model.accountAlert = alert;
			this.model.mergedAccount = !!merged;
		});

		this.subscriptions.push(this.model.protectionErrors.subscribe(() => {
			this.openReloadModal();
		}));
	}
	ngOnDestroy() {
		this.subscriptions.forEach(s => s.unsubscribe());
	}
	@HostListener('window:focus')
	focus() {
		this.model.verifyAccount();
	}
	signIn(provider: OAuthProvider) {
		this.model.signIn(provider);
	}
	signOut() {
		this.model.signOut();
	}
	openReloadModal() {
		if (!this.reloadModalRef) {
			this.reloadModalRef = this.modalService.show(
				this.reloadModal, { class: 'modal-lg', ignoreBackdropClick: true, keyboard: false });

			this.reloadInterval = setInterval(() => {
				if (checkIframeKey('reload-frame', 'gep84r9jshge4g')) {
					this.cancelReloadModal();
				}
			}, 500);
		}
	}
	cancelReloadModal() {
		if (this.reloadModalRef) {
			this.reloadModalRef.hide();
			this.reloadModalRef = undefined;
		}

		clearInterval(this.reloadInterval);
	}
	chatLogNameClick(chatBox: ChatBox, message: ChatLogMessage) {
		if (!message.entityId) {
			return;
		}

		let entity = findEntityById(this.game.map, message.entityId);

		if (entity && (!isPony(entity) || entity === this.game.player)) {
			return;
		}

		if (!entity) {
			entity = { fake: true, type: PONY_TYPE, id: message.entityId, name: message.name } as FakeEntity as any;
		}

		if (isSelected(this.game, message.entityId)) {
			this.game.whisperTo = entity;
			chatBox.setChatType('whisper');
		} else {
			this.game.select(entity as Pony);
		}
	}
	messageToFriend(chatBox: ChatBox, friend: Friend) {
		if (friend.entityId) {
			const entity: any = { id: friend.entityId, name: friend.actualName || 'unknown' };
			this.messageToPony(chatBox, entity);
		}
	}
	messageToPony(chatBox: ChatBox, pony: Entity) {
		setTimeout(() => {
			this.game.whisperTo = pony;
			chatBox.setChatType('whisper');
		});
	}
}
