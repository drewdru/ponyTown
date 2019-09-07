import { Component, OnInit, NgZone, TemplateRef, OnDestroy } from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { random } from 'lodash';
import { OFFLINE_PONY, CM_SIZE, SUPPORTER_PONY, DEFAULT_CHATLOG_OPACITY } from '../../../common/constants';
import { toPalette, mockPaletteManager, getBaseFill, syncLockedPonyInfo } from '../../../common/ponyInfo';
import * as sprites from '../../../generated/sprites';
import { PonyTownGame, redrawActionButtons } from '../../../client/game';
import { fromNow, setFlag, times } from '../../../common/utils';
import { ChatLog } from '../../shared/chat-log/chat-log';
import { randomString } from '../../../common/stringUtils';
import { MessageType, Entity, EntityPlayerState } from '../../../common/interfaces';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { SettingsService } from '../../services/settingsService';
import { faHome, faStar, faLock, faHeart } from '../../../client/icons';
import { decompressPonyString } from '../../../common/compressPony';
import { getAllTags } from '../../../common/tags';
import { Model } from '../../services/model';
import { isPartyLeader } from '../../../client/partyUtils';
import { createPony } from '../../../common/pony';
import { serializeActions, deserializeActions } from '../../../client/buttonActions';
import { initializeToys } from '../../../client/ponyDraw';
import { ACTION_EXPRESSION_BG, updateActionColor } from '../../../common/colors';
import { parseColor, colorToCSS, colorNames } from '../../../common/color';
import { isHidden, isIgnored, isFriend } from '../../../common/entityUtils';
import { initFeatureFlags } from '../../../client/clientUtils';

const offlinePonyInfo = decompressPonyString(OFFLINE_PONY, true);
const offlinePonyPal = toPalette(offlinePonyInfo);
const defaultPalette = mockPaletteManager.addArray(sprites.defaultPalette);

const offlinePony = createPony(1, 0, OFFLINE_PONY, defaultPalette, mockPaletteManager);
offlinePony.name = 'Offline pony';

const supporterPony = createPony(2, 0, SUPPORTER_PONY, defaultPalette, mockPaletteManager);
supporterPony.name = 'Supporter pony';

const pendingPony = createPony(3, 0, SUPPORTER_PONY, defaultPalette, mockPaletteManager);
pendingPony.name = 'Pending pony';

const tails = sprites.tails[0]!.slice();
const labels = ['none', 'Long tail', 'Short tail', 'Short smooth tail', 'Long puffy tail', 'Long wavy tail'];
tails.forEach((t, i) => t ? t[0].label = labels[i] : undefined);
const colors = Object.values(colorNames);

@Component({
	selector: 'tools-ui',
	templateUrl: 'tools-ui.pug',
})
export class ToolsUI implements OnInit, OnDestroy {
	readonly homeIcon = faHome;
	readonly starIcon = faStar;
	readonly heartIcon = faHeart;
	readonly lockIcon = faLock;
	isHidden = isHidden;
	isIgnored = isIgnored;
	focusTrap = true;
	tails = tails;
	cmSize = CM_SIZE;
	pony = offlinePonyInfo;
	customOutlines = false;
	pal = offlinePonyPal;
	color = 'cornflowerblue';
	checked = true;
	radio = 'a';
	slider = 50;
	sprite = sprites.tails[0]![1]![0];
	fills = ['ff0000', '00ff00'];
	outlines = ['990000', '009900'];
	spriteActive = false;
	selected = offlinePony;
	timeout = fromNow(1000 * 3600 * 10).toISOString();
	autoCloseDropdown: any = true;
	spamChatInterval: any;
	initialized = false;
	customChecked = false;
	actionBarEditable = true;
	tags = ['', ...getAllTags().map(t => t.id)];
	animationFrame: any;
	virtualItems = times(1000, i => ({ value: i, name: `This is item ${i}`, color: colors[i % colors.length] }));
	virtualItems2 = [{ name: 'An item 0' }];
	constructor(
		private game: PonyTownGame,
		private zone: NgZone,
		public settings: SettingsService,
		private modalService: BsModalService,
		private model: Model,
	) {
		this.selected.name = 'Offline Pony';
		this.selected.site = {
			id: '',
			name: 'Offline Pony (official)',
			provider: 'twitter',
			url: 'https://twitter.com/offlinepony',
		};
		this.selected.tag = 'dev';
		this.selected.modInfo = {
			account: 'offline-pony [abc]',
			country: 'PL',
			counters: { swears: 5 },
			age: 12,
		};

		game.player = {
			id: 123,
			name: 'Player pony',
		} as any;
		game.party = {
			leaderId: 0,
			members: [
				{ id: 1, leader: true, offline: false, pending: false, pony: offlinePony, self: false },
				{ id: 2, leader: false, offline: true, pending: false, pony: supporterPony, self: false },
				{ id: 3, leader: false, offline: false, pending: true, pony: pendingPony, self: false },
			],
		};
		game.onClock.next('00:00');
		game.failedFBO = true;
		game.send = <T>(action: (server: any) => T) => action({
			action() { },
			select() { },
			say() { },
			expression() { },
			getInvites: () => Promise.resolve([
				{ id: 'a', info: OFFLINE_PONY, name: 'Offline Pony', active: true },
				{ id: 'b', info: OFFLINE_PONY, name: 'Fuzzy', active: true },
				{ id: 'c', info: OFFLINE_PONY, name: 'Meno', active: true },
				{ id: 'd', info: OFFLINE_PONY, name: 'Offline Pony', active: true },
				{ id: 'e', info: OFFLINE_PONY, name: 'Fuzzy', active: true },
				{ id: 'f', info: OFFLINE_PONY, name: 'Meno', active: false },
				{ id: 'g', info: OFFLINE_PONY, name: 'Offline Pony', active: false },
				{ id: 'h', info: OFFLINE_PONY, name: 'Fuzzy', active: false },
				{ id: 'i', info: OFFLINE_PONY, name: 'Meno', active: false },
				{ id: 'j', info: OFFLINE_PONY, name: 'Meno', active: false },
			]),
		} as any);
	}
	ngOnInit() {
		initFeatureFlags({});

		return loadAndInitSpriteSheets()
			.then(() => {
				initializeToys(mockPaletteManager);
				this.initialized = true;
				this.model.loading = true;
				this.zone.runOutsideAngular(() => this.update());
			});
	}
	ngOnDestroy() {
		cancelAnimationFrame(this.animationFrame);
	}
	get baseHairColor() {
		return getBaseFill(this.pony.mane);
	}
	get isFriend() {
		return isFriend(this.selected);
	}
	set isFriend(value) {
		this.selected.playerState = setFlag(this.selected.playerState, EntityPlayerState.Friend, value);
	}
	update() {
		this.animationFrame = requestAnimationFrame(() => this.update());
		redrawActionButtons(this.game.actionsChanged);
		this.game.actionsChanged = false;
		this.game.onFrame.next();
	}
	changed() {
		syncLockedPonyInfo(this.pony);
	}
	toggleIgnored(entity: Entity) {
		entity.playerState = setFlag(entity.playerState, EntityPlayerState.Ignored, !isIgnored(entity));
	}
	toggleHidden(entity: Entity) {
		entity.playerState = setFlag(entity.playerState, EntityPlayerState.Hidden, !isHidden(entity));
	}
	spamChat(chatlog: ChatLog) {
		if (this.spamChatInterval) {
			clearInterval(this.spamChatInterval);
			this.spamChatInterval = 0;
		} else {
			this.spamChatInterval = 1;
			this.zone.runOutsideAngular(() => this.spamChatInterval = setInterval(() => {
				chatlog.addMessage({
					id: 0,
					crc: undefined,
					name: randomString(random(1, 20)),
					message: randomString(random(1, 40)),
					type: MessageType.Chat
				});
			}, 50));
		}
	}
	get isPartyLeader() {
		return isPartyLeader(this.game);
	}
	set isPartyLeader(value: boolean) {
		if (value) {
			this.game.party!.leaderId = this.game.player!.id;
		} else {
			this.game.party!.leaderId = 1;
		}
	}
	get chatlogOpacity() {
		return this.settings.account.chatlogOpacity || DEFAULT_CHATLOG_OPACITY;
	}
	set chatlogOpacity(value: number) {
		this.settings.account.chatlogOpacity = value;
	}
	addMessage(chatlog: ChatLog, message: string) {
		chatlog.addMessage({ name: 'test name', id: 123, crc: undefined, message, type: MessageType.Chat });
	}
	addWhisper(chatlog: ChatLog, message: string) {
		chatlog.addMessage({ name: 'test name', id: 123, crc: undefined, message, type: MessageType.Whisper });
	}
	angle = 45;
	get angleInRad() {
		return (this.angle / 180) * Math.PI;
	}
	get horizontalTileHeight() {
		return 32 * Math.sin(this.angleInRad);
	}
	get verticalTileHeight() {
		return 32 * Math.cos(this.angleInRad);
	}
	// angle = Math.asin(expectedHorizontalTileHeight / 32) // 0.848062078981481
	modalRef?: BsModalRef;
	showModal(template: TemplateRef<any>) {
		this.modalRef = this.modalService.show(template, {});
	}
	saveActions() {
		if (DEVELOPMENT) {
			const serialized = serializeActions(this.game.actions);
			this.game.actions = deserializeActions(serialized);
			console.log(serialized);
		}
	}
	// actions
	get expressionActionsColor() {
		return ACTION_EXPRESSION_BG;
	}
	set expressionActionsColor(value) {
		updateActionColor(colorToCSS(parseColor(value)));
		this.game.actionsChanged = true;
	}
}
