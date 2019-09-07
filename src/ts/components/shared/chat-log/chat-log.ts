import {
	Component, ViewChild, ElementRef, NgZone, AfterViewInit, OnDestroy, HostListener, Output, EventEmitter, DoCheck
} from '@angular/core';
import { Subscription } from 'rxjs';
import { clamp, escapeRegExp } from 'lodash';
import { PonyTownGame } from '../../../client/game';
import { MessageType, isPartyMessage, ChatMessage, Pony, FakeEntity, isWhisper, isWhisperTo } from '../../../common/interfaces';
import { SettingsService } from '../../services/settingsService';
import { AgDragEvent } from '../directives/agDrag';
import { element, textNode, removeAllNodes, replaceNodes } from '../../../client/htmlUtils';
import { DEFAULT_CHATLOG_OPACITY, PONY_TYPE } from '../../../common/constants';
import { faCaretUp, faArrowDown } from '../../../client/icons';
import { sampleMessages } from '../../../common/debugData';

interface IndexEntryUser {
	id: number;
	crc: number | undefined;
}

interface IndexEntry {
	users: IndexEntryUser[];
	counter: number;
}

interface ChatLogLineDOM {
	entry: ChatLogMessage;
	root: HTMLElement;
	label: HTMLElement;
	labelText: Text;
	name: HTMLElement;
	nameContent: HTMLElement;
	index: HTMLElement;
	indexText: Text;
	prefixText: Text;
	suffixText: Text;
	message: HTMLElement;
}

export interface ChatLogMessage {
	message: string;
	name?: string;
	crc?: number;
	prefix?: string;
	suffix?: string;
	label?: string;
	index: number;
	classes?: string;
	entityId?: number;
	dom?: ChatLogLineDOM;
}

type Tab = 'local' | 'party' | 'whisper';
type ClickHandler = (entry: ChatLogMessage) => void;

const GENERAL_CHAT_LIMIT = 100;
const PARTY_CHAT_LIMIT = 100;
const WHISPER_CHAT_LIMIT = 100;
const FORGET_INDEX_AFTER = 1000;
const SCROLL_END_THRESHOLD = 60;

const LABELS: (string | undefined)[] = [];
LABELS[MessageType.System] = 'system';
LABELS[MessageType.Admin] = 'admin';
LABELS[MessageType.Mod] = 'mod';
LABELS[MessageType.Party] = 'party';
LABELS[MessageType.PartyThinking] = 'party';
LABELS[MessageType.PartyAnnouncement] = 'party';

const PREFIXES: (string | undefined)[] = [];
PREFIXES[MessageType.WhisperTo] = 'To ';
PREFIXES[MessageType.WhisperToAnnouncement] = 'To ';

const SUFFIXES: (string | undefined)[] = [];
SUFFIXES[MessageType.Thinking] = 'thinks';
SUFFIXES[MessageType.PartyThinking] = 'thinks';
SUFFIXES[MessageType.Whisper] = 'whispers';
SUFFIXES[MessageType.WhisperAnnouncement] = 'whispers';

const CLASSES: (string | undefined)[] = [];
CLASSES[MessageType.System] = 'chat-line-system';
CLASSES[MessageType.Admin] = 'chat-line-admin';
CLASSES[MessageType.Mod] = 'chat-line-mod';
CLASSES[MessageType.Party] = 'chat-line-party';
CLASSES[MessageType.Thinking] = 'chat-line-thinking';
CLASSES[MessageType.PartyThinking] = 'chat-line-party-thinking';
CLASSES[MessageType.Announcement] = 'chat-line-announcement';
CLASSES[MessageType.PartyAnnouncement] = 'chat-line-party-announcement';
CLASSES[MessageType.Supporter1] = 'chat-line-supporter-1';
CLASSES[MessageType.Supporter2] = 'chat-line-supporter-2';
CLASSES[MessageType.Supporter3] = 'chat-line-supporter-3';
CLASSES[MessageType.Whisper] = 'chat-line-whisper';
CLASSES[MessageType.WhisperTo] = 'chat-line-whisper';
CLASSES[MessageType.WhisperAnnouncement] = 'chat-line-whisper-announcement';
CLASSES[MessageType.WhisperToAnnouncement] = 'chat-line-whisper-announcement';

export function createChatLogLineDOM(clickLabel: ClickHandler, clickName: ClickHandler): ChatLogLineDOM {
	const line: ChatLogLineDOM = {} as any;

	line.root = element('div', 'chat-line', [
		element('span', 'chat-line-lead'),
		line.label = element(
			'span', 'chat-line-label mr-1', [line.labelText = textNode('')], undefined, { click: () => clickLabel(line.entry) }),
		line.prefixText = textNode(''),
		line.name = element('span', 'chat-line-name', [
			textNode('['),
			line.nameContent = element(
				'span', 'chat-line-name-content', [textNode('')], undefined, { click: () => clickName(line.entry) }),
			line.index = element('span', 'chat-line-name-index', [line.indexText = textNode('')], { title: 'duplicate name' }),
			textNode(']'),
		]),
		line.suffixText = textNode(''),
		line.message = element('span', 'chat-line-message', [textNode('')]),
	]);

	return line;
}

export function updateChatLogLine(line: ChatLogLineDOM, entry: ChatLogMessage) {
	const { classes, label, message, prefix, suffix } = entry;
	const hasSpace = message.indexOf(' ') !== -1;

	line.entry = entry;
	line.root.className = `chat-line ${hasSpace ? '' : 'chat-line-break '}${classes}`.trim();
	line.label.style.display = label ? 'inline' : 'none';
	line.labelText.nodeValue = label ? `[${label}]` : '';

	updateChatLogName(line, entry);

	line.prefixText.nodeValue = prefix || '';
	line.suffixText.nodeValue = suffix ? ` ${suffix}: ` : ': ';
	replaceNodes(line.message, message);
}

function updateChatLogName(line: ChatLogLineDOM, { name, index }: ChatLogMessage) {
	if (name) {
		line.name.style.display = 'inline';
		replaceNodes(line.nameContent, name);
		line.index.style.display = (index > 0) ? 'inline' : 'none';
		line.indexText.nodeValue = (index > 0) ? ` #${index + 1}` : '';
	} else {
		line.name.style.display = 'none';
	}
}

function isMatch(e: ChatLogMessage, id: number, name: string, crc: number | undefined) {
	return e.name === name && (e.entityId === id || (e.crc === crc && crc !== undefined));
}

function addOrUpdatePony(pony: Pony, list: ChatLogMessage[]) {
	for (const e of list) {
		if (isMatch(e, pony.id, pony.name!, pony.crc)) {
			e.entityId = pony.id;
		}
	}
}

function updateEntityId(list: ChatLogMessage[], oldId: number, newId: number) {
	for (const e of list) {
		if (e.entityId === oldId) {
			e.entityId = newId;
		}
	}
}

function findUserIndex(users: IndexEntryUser[], id: number, crc: number | undefined) {
	for (let i = 0; i < users.length; i++) {
		const user = users[i];

		if (user.id === id || (crc !== undefined && user.crc === crc)) {
			user.id = id;
			return i;
		}
	}

	return -1;
}

@Component({
	selector: 'chat-log',
	templateUrl: 'chat-log.pug',
	styleUrls: ['chat-log.scss'],
})
export class ChatLog implements AfterViewInit, OnDestroy, DoCheck {
	readonly toBottomIcon = faArrowDown;
	readonly resizeIcon = faCaretUp;
	@ViewChild('chatLog', { static: true }) chatLog!: ElementRef;
	@ViewChild('scroll', { static: true }) scroll!: ElementRef;
	@ViewChild('lines', { static: true }) lines!: ElementRef;
	@ViewChild('localTab', { static: true }) localTab!: ElementRef;
	@ViewChild('partyTab', { static: true }) partyTab!: ElementRef;
	@ViewChild('whisperTab', { static: true }) whisperTab!: ElementRef;
	@ViewChild('toggleButton', { static: true }) toggleButton!: ElementRef;
	@ViewChild('count', { static: true }) countElement!: ElementRef;
	@ViewChild('content', { static: true }) contentElement!: ElementRef;
	@Output() toggleType = new EventEmitter<string>();
	@Output() nameClick = new EventEmitter<ChatLogMessage>();
	innerWidth = 0;
	// TODO: move to game ?
	local: ChatLogMessage[] = [];
	party: ChatLogMessage[] = [];
	whisper: ChatLogMessage[] = [];
	unread = 0;
	private subscriptions: Subscription[] = [];
	private startX = 0;
	private startY = 0;
	private shouldScrollToEnd = false;
	private scrolledToEnd = true;
	private scrollingToEnd = false;
	private scrollToEndAtFrame = false;
	private indexes = new Map<string, IndexEntry>();
	private messageCounter = 0;
	private lastOpacity = 0;
	constructor(
		private game: PonyTownGame,
		private settingsService: SettingsService,
		private element: ElementRef,
		private zone: NgZone,
	) {
		// TODO: just put reference to chatlog on game ???
		this.subscriptions.push(
			game.onFrame.subscribe(() => {
				if (this.scrollToEndAtFrame) {
					this.scrollToEndAtFrame = false;
					this.scrollHandler();
				}
			}),
			game.onMessage.subscribe(message => {
				this.addMessage(message);
			}),
			// TODO: move to game ?
			game.onPonyAddOrUpdate.subscribe(pony => {
				addOrUpdatePony(pony, this.local);
				addOrUpdatePony(pony, this.party);
				addOrUpdatePony(pony, this.whisper);
			}),
			game.onJoined.subscribe(() => {
				if (!DEVELOPMENT) {
					// TODO: move to game ?
					this.local = [];
					this.party = [];
					this.whisper = [];
					this.messageCounter = 0;
					this.indexes = new Map();
					this.clearList();
				}
			}),
			game.onEntityIdUpdate.subscribe(update => {
				updateEntityId(this.local, update.old, update.new);
				updateEntityId(this.party, update.old, update.new);
				updateEntityId(this.whisper, update.old, update.new);
			}),
		);
	}
	get linesElement() {
		return this.lines.nativeElement as HTMLElement;
	}
	private updateOpen() {
		this.updateChatlog();

		if (this.open) {
			this.setUnread(0);
			this.regenerateList();
			this.scrollToEnd();
		} else {
			this.clearList();
		}

		this.updateInnerWidth();
	}
	private updateChatlog() {
		const element = this.chatLog.nativeElement as HTMLElement;
		element.style.display = this.open ? 'flex' : 'none';

		if (this.open) {
			element.style.width = `${this.width}px`;
			element.style.height = `${this.height}px`;
		}
	}
	ngAfterViewInit() {
		this.game.findEntityFromChatLog = this.findEntityFromMessages;
		this.game.findEntityFromChatLogByName = this.findEntityFromMessagesByName;

		this.updateTabs();
		this.updateOpen();

		this.zone.runOutsideAngular(() => {
			const scroll = this.scroll.nativeElement as HTMLElement;

			scroll.addEventListener('scroll', () => {
				if (this.scrollingToEnd) {
					this.scrolledToEnd = true;
					this.scrollingToEnd = false;
				} else {
					const clientHeight = scroll.getBoundingClientRect().height;
					this.scrolledToEnd = scroll.scrollTop >= (scroll.scrollHeight - clientHeight - SCROLL_END_THRESHOLD);
				}
			});
		});

		setTimeout(() => {
			this.scrollToEnd();
			this.updateInnerWidth();
		});

		if (DEVELOPMENT) {
			sampleMessages.forEach(({ name, id, message, type }) =>
				this.addMessage({ id: id || 999999, crc: undefined, name, message, type: type || MessageType.Chat }));
		}
	}
	ngOnDestroy() {
		if (this.game.findEntityFromChatLog === this.findEntityFromMessages) {
			this.game.findEntityFromChatLog = () => undefined;
		}

		if (this.game.findEntityFromChatLogByName === this.findEntityFromMessagesByName) {
			this.game.findEntityFromChatLogByName = () => undefined;
		}

		this.subscriptions.forEach(s => s.unsubscribe());
		this.subscriptions = [];
	}
	ngDoCheck() {
		if (this.lastOpacity !== this.opacity) {
			this.lastOpacity = this.opacity;
			this.contentElement.nativeElement.style.backgroundColor = this.bg;
			this.updateTabs();
		}
	}
	@HostListener('window:resize')
	updateInnerWidth() {
		const maxWidth = (this.element.nativeElement as HTMLElement).getBoundingClientRect().width;
		const innerWidth = Math.min(maxWidth || this.width, this.width) - 40;

		if (this.innerWidth !== innerWidth) {
			this.innerWidth = innerWidth;
			this.linesElement.style.width = `${innerWidth}px`;
		}

		if (!maxWidth) {
			setTimeout(() => this.updateInnerWidth(), 10);
		}
	}
	get messages() {
		return this[this.activeTab];
	}
	get settings() {
		return this.settingsService.browser;
	}
	get settings2() {
		return this.settingsService.account;
	}
	get activeTab(): Tab {
		const tab = this.settings.chatlogTab;
		return (tab === 'local' || tab === 'party' || tab === 'whisper') ? tab : 'local';
	}
	get open() {
		return !this.settings.chatlogClosed;
	}
	get width() {
		return this.settings.chatlogWidth || 500;
	}
	get height() {
		return this.settings.chatlogHeight || 310;
	}
	get opacity() {
		return this.settings2.chatlogOpacity === undefined ? DEFAULT_CHATLOG_OPACITY : this.settings2.chatlogOpacity;
	}
	get bg() {
		return `rgba(0, 0, 0, ${this.opacity / 100})`;
	}
	get inactiveBg() {
		return `rgba(0, 0, 0, ${(this.opacity / 200) * 0.5})`;
	}
	private createEntry({ id, crc, name, message, type }: ChatMessage): ChatLogMessage {
		const system = type === MessageType.System;
		const entry: ChatLogMessage = {
			entityId: system ? 0 : id,
			name: system ? '' : name,
			index: 0,
			crc,
			message,
			label: LABELS[type] || '',
			prefix: PREFIXES[type] || '',
			suffix: SUFFIXES[type] || '',
			classes: CLASSES[type] || '',
		};

		if (!system) {
			entry.index = this.findOrCreateIndex(name, id, crc);
		}

		return entry;
	}
	private findOrCreateIndex(name: string, id: number, crc: number | undefined) {
		let found = this.indexes.get(name);

		if (!found || (this.messageCounter - found.counter) > FORGET_INDEX_AFTER) {
			found = {
				users: [{ id, crc }],
				counter: 0,
			};

			this.indexes.set(name, found);
		}

		found.counter = this.messageCounter;

		let index = findUserIndex(found.users, id, crc);

		if (index === -1) {
			index = found.users.length;
			found.users.push({ id, crc });
		}

		return index;
	}
	addMessage(message: ChatMessage) {
		if (message.name && message.message) {
			const entry = this.createEntry(message);
			const party = isPartyMessage(message.type);
			const whisper = isWhisper(message.type) || isWhisperTo(message.type);
			const open = this.open;
			const scrolledToEnd = open ? this.scrolledToEnd : false;
			const tab = this.activeTab;

			this.addEntryToList(this.local, GENERAL_CHAT_LIMIT, open && tab === 'local', entry);

			if (party || whisper) {
				const partyEntry = { ...entry };
				partyEntry.dom = undefined;
				partyEntry.label = whisper ? partyEntry.label : undefined;
				this.addEntryToList(this.party, PARTY_CHAT_LIMIT, open && tab === 'party', partyEntry);
			}

			if (whisper) {
				const whisperEntry = { ...entry };
				whisperEntry.dom = undefined;
				whisperEntry.label = undefined;
				this.addEntryToList(this.whisper, WHISPER_CHAT_LIMIT, open && tab === 'whisper', whisperEntry);
			}

			if (message.type === MessageType.Whisper && !this.open) {
				this.setUnread(this.unread + 1);
			}

			if (scrolledToEnd) {
				this.scrollToEnd();
			}

			this.messageCounter++;
		}
	}
	private addEntryToList(list: ChatLogMessage[], limit: number, isOpen: boolean, entry: ChatLogMessage) {
		let removedDom: ChatLogLineDOM | undefined;

		while (list.length >= limit) {
			const removed = list.shift();

			if (isOpen && removed && removed.dom) {
				if (removed.dom.root.parentElement) {
					removed.dom.root.parentElement.removeChild(removed.dom.root);
				}

				removedDom = removed.dom;
				removed.dom = undefined;
			}
		}

		list.push(entry);

		if (isOpen) {
			entry.dom = removedDom || createChatLogLineDOM(this.clickLabel, this.clickNameHandler);
			updateChatLogLine(entry.dom, entry);
			this.linesElement.appendChild(entry.dom.root);
		}
	}
	toggle() {
		this.settings.chatlogClosed = !this.settings.chatlogClosed;
		this.settingsService.saveBrowserSettings();
		this.updateOpen();
	}
	switchTab(tab: Tab) {
		if (this.activeTab !== tab) {
			this.settings.chatlogTab = tab;
			this.settingsService.saveBrowserSettings();
			this.regenerateList();
			this.scrollToEnd();
			this.updateTabs();
		}
	}
	private updateTabs() {
		this.setActiveTab(this.localTab.nativeElement, this.activeTab === 'local');
		this.setActiveTab(this.partyTab.nativeElement, this.activeTab === 'party');
		this.setActiveTab(this.whisperTab.nativeElement, this.activeTab === 'whisper');
	}
	private setActiveTab(tab: HTMLElement, active: boolean) {
		if (active) {
			tab.classList.add('active');
			tab.style.backgroundColor = this.bg;
		} else {
			tab.classList.remove('active');
			tab.style.backgroundColor = this.inactiveBg;
		}
	}
	scrollToEnd() {
		// requestAnimationFrame(this.scrollHandler);
		this.scrollToEndAtFrame = true;
	}
	scrollHandler = () => {
		this.scrollingToEnd = true;
		this.scroll.nativeElement.scrollTop = 99999;
	}
	clickNameHandler = (message: ChatLogMessage) => {
		this.zone.run(() => this.nameClick.emit(message));
	}
	clickLabel = (message: ChatLogMessage) => {
		this.zone.run(() => {
			if (message.label) {
				this.toggleType.emit(message.label);
			}
		});
	}
	private clearList() {
		removeAllNodes(this.linesElement);
	}
	private regenerateList() {
		this.clearList();

		const lines = this.linesElement;

		this.messages.forEach(entry => {
			if (!entry.dom) {
				entry.dom = createChatLogLineDOM(this.clickLabel, this.clickNameHandler);
				updateChatLogLine(entry.dom, entry);
			}

			lines.appendChild(entry.dom.root);
		});
	}
	drag({ x, y, type, event }: AgDragEvent, resizeY: boolean, resizeX: boolean) {
		event.preventDefault();

		if (type === 'start') {
			const { left, top } = (this.element.nativeElement as HTMLElement).getBoundingClientRect();
			this.startX = left;
			this.startY = top;
			this.shouldScrollToEnd = this.scrolledToEnd;
		}

		if (resizeX) {
			this.settings.chatlogWidth = clamp(x - this.startX, 200, 2000);
		}

		if (resizeY) {
			this.settings.chatlogHeight = clamp(this.startY - y, 120, 2000);
		}

		this.updateChatlog();
		this.updateInnerWidth();

		if (type === 'end') {
			this.settingsService.saveBrowserSettings();
		}

		if (this.shouldScrollToEnd) {
			this.scrollToEnd();
		}
	}
	private setUnread(value: number) {
		if (this.unread !== value) {
			this.unread = value;
			const count = this.countElement.nativeElement as HTMLElement;
			const toggle = this.toggleButton.nativeElement as HTMLElement;

			if (value) {
				count.textContent = value > 99 ? '99+' : `${value}`;
				toggle.classList.add('has-unread');
			} else {
				count.textContent = '';
				toggle.classList.remove('has-unread');
			}
		}
	}
	private findEntityFromMessages = (id: number): FakeEntity | undefined => {
		return findEntityFromMessages(id, this.whisper) ||
			findEntityFromMessages(id, this.party) ||
			findEntityFromMessages(id, this.local);
	}
	private findEntityFromMessagesByName = (name: string): FakeEntity | undefined => {
		return findEntityFromMessagesByName(name, this.game.playerId, this.whisper) ||
			findEntityFromMessagesByName(name, this.game.playerId, this.party) ||
			findEntityFromMessagesByName(name, this.game.playerId, this.local);
	}
}

function findEntityFromMessages(id: number, messages: ChatLogMessage[]): FakeEntity | undefined {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i].entityId === id) {
			return { fake: true, id, type: PONY_TYPE, name: messages[i].name, crc: messages[i].crc };
		}
	}

	return undefined;
}

function findEntityFromMessagesByName(
	name: string, playerId: number | undefined, messages: ChatLogMessage[]
): FakeEntity | undefined {
	const regex = new RegExp(`^${escapeRegExp(name)}$`, 'i');

	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];

		if (message.name && message.entityId && message.entityId !== playerId && regex.test(message.name)) {
			return { fake: true, id: message.entityId, type: PONY_TYPE, name: message.name, crc: message.crc };
		}
	}

	return undefined;
}
