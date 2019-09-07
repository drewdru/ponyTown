import { Component, ElementRef, NgZone, AfterViewInit, ViewChild, OnDestroy, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatType, isPartyChat, Entity, FakeEntity } from '../../../common/interfaces';
import { SAY_MAX_LENGTH } from '../../../common/constants';
import { Key } from '../../../client/input/input';
import { PonyTownGame } from '../../../client/game';
import { cleanMessage, isSpamMessage } from '../../../client/clientUtils';
import { faComment, faAngleDoubleRight } from '../../../client/icons';
import { isInParty } from '../../../client/partyUtils';
import { handleActionCommand } from '../../../client/playerActions';
import { hasHeadAnimation } from '../../../common/pony';
import { AutocompleteState, autocompleteMesssage, replaceEmojis } from '../../../client/emoji';
import { replaceNodes } from '../../../client/htmlUtils';
import { invalidEnumReturn } from '../../../common/utils';
import { findMatchingEntityNames, findEntityOrMockByAnyMeans, findBestEntityByName } from '../../../client/handlers';

const chatTypeNames: string[] = [];
const chatTypeClasses: string[] = [];

function setupChatType(type: ChatType, name: string) {
	chatTypeNames[type] = name;
	chatTypeClasses[type] = `chat-${name.replace(/ /, '-')}`;
}

setupChatType(ChatType.Say, 'say');
setupChatType(ChatType.Party, 'party');
setupChatType(ChatType.Supporter, 'sup');
setupChatType(ChatType.Supporter1, 'sup1');
setupChatType(ChatType.Supporter2, 'sup2');
setupChatType(ChatType.Supporter3, 'sup3');
setupChatType(ChatType.Whisper, 'whisper');
setupChatType(ChatType.Think, 'think');
setupChatType(ChatType.PartyThink, 'party think');

function isActionCommand(message: string) {
	return /^\/(yawn|sneeze|achoo|laugh|lol|haha|хаха|jaja)/i.test(message);
}

@Component({
	selector: 'chat-box',
	templateUrl: 'chat-box.pug',
	styleUrls: ['chat-box.scss'],
})
export class ChatBox implements AfterViewInit, OnDestroy {
	readonly maxSayLength = SAY_MAX_LENGTH;
	readonly commentIcon = faComment;
	readonly sendIcon = faAngleDoubleRight;
	@ViewChild('inputElement', { static: true }) inputElement!: ElementRef;
	@ViewChild('typeBox', { static: true }) typeBox!: ElementRef;
	@ViewChild('typePrefix', { static: true }) typePrefix!: ElementRef;
	@ViewChild('typeName', { static: true }) typeName!: ElementRef;
	@ViewChild('chatBox', { static: true }) chatBox!: ElementRef;
	@ViewChild('chatBoxInput', { static: true }) chatBoxInput!: ElementRef;
	isOpen = false;
	message: string | undefined = '';
	chatType = ChatType.Say;
	private pasted = false;
	private lastMessages: string[] = [];
	private state: AutocompleteState = {};
	private subscriptions: Subscription[];
	private _disabled = false;
	constructor(private game: PonyTownGame, zone: NgZone) {
		this.subscriptions = [
			this.game.onChat.subscribe(() => zone.run(() => this.chat(undefined))),
			this.game.onToggleChat.subscribe(() => zone.run(() => this.toggle())),
			this.game.onCommand.subscribe(() => zone.run(() => this.command())),
			this.game.onLeft.subscribe(() => {
				this.chatType = ChatType.Say;
				this.close();
			}),
		];

		this.game.onCancel = () => this.isOpen ? (zone.run(() => this.close()), true) : false;
	}
	@Input() get disabled() {
		return this._disabled;
	}
	set disabled(value) {
		this._disabled = value;

		if (value) {
			this.close();
		}
	}
	get input() {
		return this.inputElement.nativeElement as HTMLInputElement;
	}
	ngAfterViewInit() {
		this.chatBox.nativeElement.hidden = true;
		this.input.addEventListener('paste', () => this.pasted = true);
	}
	ngOnDestroy() {
		this.subscriptions.forEach(s => s.unsubscribe());
	}
	send(_event: Event | undefined) {
		let chatType = this.chatType;
		let message = replaceEmojis(cleanMessage(this.message || '')).substr(0, SAY_MAX_LENGTH);
		const handled = handleActionCommand(message, this.game);
		const spam = this.pasted && chatType !== ChatType.Party && isSpamMessage(message, this.lastMessages);
		const empty = !this.game.player || !message;
		const ignoreAction = isActionCommand(message) && this.game.player && hasHeadAnimation(this.game.player);
		const whisperTo = this.game.whisperTo;
		let entityId = whisperTo && whisperTo.id || 0;

		if (/^\/(w|whisper) .+$/i.test(message)) {
			chatType = ChatType.Whisper;
			message = message.substr(/^\/w /i.test(message) ? 3 : 9);

			let offset = 0;
			let entity: Entity | FakeEntity | undefined = undefined;

			do {
				offset = message.indexOf(' ', offset);

				if (offset === -1)
					break;

				const name = message.substr(0, offset);
				entity = findBestEntityByName(this.game, name);
				offset++;
			} while (!entity);

			if (entity) {
				message = message.substr(offset);
				entityId = entity.id;
			} else {
				entityId = 0;
			}
		}

		if (handled || spam || empty || ignoreAction || this.say(message, chatType, entityId)) {
			if (message) {
				this.lastMessages.push(message);

				while (this.lastMessages.length > 5) {
					this.lastMessages.shift();
				}
			}

			this.close();
		}
	}
	keydown(e: KeyboardEvent) {
		if (e.keyCode !== Key.TAB && e.keyCode !== Key.SHIFT) {
			this.state.lastEmoji = undefined;
		}

		if (e.keyCode === Key.TAB) {
			if (this.message) {
				if (/^\/(w|whisper) .+$/i.test(this.message)) {
					const space = this.message.indexOf(' ');
					const names = findMatchingEntityNames(this.game, this.message.substr(space + 1));

					if (names.length === 1) {
						this.message = `${this.message.substring(0, space)} ${names[0]}`;
					}
				} else {
					this.message = autocompleteMesssage(this.message, e.shiftKey, this.state);
				}
			}

			e.preventDefault();
		} else if (e.keyCode === Key.ENTER && this.isOpen) {
			this.send(e);
		} else if (e.keyCode === Key.ESCAPE) {
			this.close();
			e.preventDefault();
		} else if (e.keyCode === Key.SPACE) {
			if (!this.message)
				return;

			const isParty = /^\/(p|party)$/i.test(this.message);
			const isSay = /^\/(s|say)$/i.test(this.message);
			const isSup = /^\/(ss)$/i.test(this.message);
			const isSup1 = /^\/(s1)$/i.test(this.message);
			const isSup2 = /^\/(s2)$/i.test(this.message);
			const isSup3 = /^\/(s3)$/i.test(this.message);

			const supporter = this.game.model.supporter;
			const isSayOrInvalid = isSay
				|| (isParty && !isInParty(this.game))
				|| (isSup && supporter === 0)
				|| (isSup1 && supporter < 1)
				|| (isSup2 && supporter < 2)
				|| (isSup3 && supporter < 3);

			if (isSayOrInvalid) {
				this.changeChatType(e, ChatType.Say);
			} else if (isParty) {
				this.changeChatType(e, ChatType.Party);
			} else if (isSup) {
				this.changeChatType(e, ChatType.Supporter);
			} else if (isSup1) {
				this.changeChatType(e, ChatType.Supporter1);
			} else if (isSup2) {
				this.changeChatType(e, ChatType.Supporter2);
			} else if (isSup3) {
				this.changeChatType(e, ChatType.Supporter3);
			} else if (/^\/(t|think)$/i.test(this.message)) {
				if (isPartyChat(this.chatType)) {
					this.changeChatType(e, ChatType.PartyThink);
				} else {
					this.changeChatType(e, ChatType.Think);
				}
			} else if (/^\/(r|reply)$/i.test(this.message)) {
				const lastWhisperFrom = this.game.lastWhisperFrom;
				const entity = lastWhisperFrom && findEntityOrMockByAnyMeans(this.game, lastWhisperFrom.entityId);

				if (entity) {
					this.game.whisperTo = entity;
					this.changeChatType(e, ChatType.Whisper);
				} else {
					this.changeChatType(e, ChatType.Say);
				}
			} else if (/^\/(w|whisper) .+$/i.test(this.message) && !e.shiftKey) {
				const name = this.message.substr(/^\/w /i.test(this.message) ? 3 : 9);
				const entity = findBestEntityByName(this.game, name);

				if (entity) {
					this.game.whisperTo = entity;
					this.changeChatType(e, ChatType.Whisper);
				}
			}
		}
	}
	private say(message: string, chatType: ChatType, entityId: number): boolean {
		this.game.lastChatMessageType = chatType;
		return !!this.game.send(server => server.say(entityId, message, chatType));
	}
	private changeChatType(e: KeyboardEvent, chatType: ChatType) {
		this.chatType = chatType;
		this.message = '';
		this.updateChatType();
		e.preventDefault();
	}
	private chat(event: Event | undefined) {
		if (this.isOpen) {
			this.send(event);
		} else {
			this.open();
		}
	}
	private command() {
		if (!this.isOpen) {
			this.chat(undefined);
			this.message = '/';
			this.input.selectionStart = this.input.selectionEnd = 10000;
		}
	}
	private open() {
		if (!this.isOpen) {
			this.isOpen = true;
			this.chatBox.nativeElement.hidden = false;
		}

		this.chatType = isValidChatType(this.chatType, this.game) ? this.chatType : ChatType.Say;
		this.updateChatType();
		this.input.focus();
	}
	private close() {
		if (this.isOpen) {
			this.input.blur();
			this.isOpen = false;
			this.chatBox.nativeElement.hidden = true;
			this.message = '';
			this.pasted = false;
		}
	}
	toggle() {
		if (this.isOpen) {
			this.close();
		} else {
			this.open();
		}
	}
	toggleChatType() {
		const chatTypes = getChatTypes(this.game);
		this.chatType = chatTypes[(chatTypes.indexOf(this.chatType) + 1) % chatTypes.length];
		this.updateChatType();
		this.input.focus();
	}
	setChatType(type: 'say' | 'party' | 'whisper') {
		if (type === 'say') {
			this.chatType = ChatType.Say;
			this.open();
		} else if (type === 'party' && isInParty(this.game)) {
			this.chatType = ChatType.Party;
			this.open();
		} else if (type === 'whisper') {
			this.chatType = ChatType.Whisper;
			this.open();
		}
	}
	private currentTypeClass = '';
	private currentTypePrefix = '';
	private currentTypeName = '';
	private updateChatType() {
		let typeName: string;
		let typePrefix: string;
		let changed = false;

		const typeClass = chatTypeClass(this.chatType, this.game.model.supporter);

		if (this.currentTypeClass !== typeClass) {
			this.currentTypeClass = typeClass;
			(this.chatBoxInput.nativeElement as HTMLElement).className = typeClass;
		}

		if (this.chatType === ChatType.Whisper) {
			typePrefix = 'To ';
			typeName = this.game.whisperTo && this.game.whisperTo.name || 'unknown';
		} else {
			typePrefix = '';
			typeName = chatTypeNames[this.chatType];
		}

		if (this.currentTypePrefix !== typePrefix) {
			changed = true;
			this.currentTypePrefix = typePrefix;
			(this.typePrefix.nativeElement as HTMLElement).textContent = typePrefix;
		}

		if (this.currentTypeName !== typeName) {
			changed = true;
			this.currentTypeName = typeName;
			replaceNodes(this.typeName.nativeElement, typeName);
		}

		if (changed) {
			const { width } = (this.typeBox.nativeElement as HTMLElement).getBoundingClientRect();
			const padding = 35 + 13 + Math.ceil(width);
			(this.inputElement.nativeElement as HTMLElement).style.paddingLeft = `${padding}px`;
		}
	}
}

function chatTypeClass(chatType: ChatType, supporter: number) {
	if (chatType === ChatType.Supporter) {
		switch (supporter) {
			case 1: return 'chat-sup chat-sup1';
			case 2: return 'chat-sup chat-sup2';
			case 3: return 'chat-sup chat-sup3';
		}
	}

	return chatTypeClasses[chatType];
}

function isValidChatType(type: ChatType, game: PonyTownGame) {
	const supporter = game.model.supporter;

	switch (type) {
		case ChatType.Say:
		case ChatType.Think:
		case ChatType.Whisper:
			return true;
		case ChatType.Party:
		case ChatType.PartyThink:
			return isInParty(game);
		case ChatType.Supporter:
			return supporter > 0;
		case ChatType.Supporter1:
			return supporter >= 1;
		case ChatType.Supporter2:
			return supporter >= 2;
		case ChatType.Supporter3:
			return supporter >= 3;
		case ChatType.Dismiss:
			return false;
		default:
			return invalidEnumReturn(type, false);
	}
}

function getChatTypes(game: PonyTownGame) {
	const chatTypes = [ChatType.Say];
	const supporter = game.model.supporter;

	if (isInParty(game)) {
		chatTypes.push(ChatType.Party);
	}

	if (supporter) {
		chatTypes.push(ChatType.Supporter);
	}

	return chatTypes;
}
