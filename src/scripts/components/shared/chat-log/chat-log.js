"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const game_1 = require("../../../client/game");
const interfaces_1 = require("../../../common/interfaces");
const settingsService_1 = require("../../services/settingsService");
const htmlUtils_1 = require("../../../client/htmlUtils");
const constants_1 = require("../../../common/constants");
const icons_1 = require("../../../client/icons");
const debugData_1 = require("../../../common/debugData");
const GENERAL_CHAT_LIMIT = 100;
const PARTY_CHAT_LIMIT = 100;
const WHISPER_CHAT_LIMIT = 100;
const FORGET_INDEX_AFTER = 1000;
const SCROLL_END_THRESHOLD = 60;
const LABELS = [];
LABELS[1 /* System */] = 'system';
LABELS[2 /* Admin */] = 'admin';
LABELS[3 /* Mod */] = 'mod';
LABELS[4 /* Party */] = 'party';
LABELS[6 /* PartyThinking */] = 'party';
LABELS[8 /* PartyAnnouncement */] = 'party';
const PREFIXES = [];
PREFIXES[14 /* WhisperTo */] = 'To ';
PREFIXES[16 /* WhisperToAnnouncement */] = 'To ';
const SUFFIXES = [];
SUFFIXES[5 /* Thinking */] = 'thinks';
SUFFIXES[6 /* PartyThinking */] = 'thinks';
SUFFIXES[13 /* Whisper */] = 'whispers';
SUFFIXES[15 /* WhisperAnnouncement */] = 'whispers';
const CLASSES = [];
CLASSES[1 /* System */] = 'chat-line-system';
CLASSES[2 /* Admin */] = 'chat-line-admin';
CLASSES[3 /* Mod */] = 'chat-line-mod';
CLASSES[4 /* Party */] = 'chat-line-party';
CLASSES[5 /* Thinking */] = 'chat-line-thinking';
CLASSES[6 /* PartyThinking */] = 'chat-line-party-thinking';
CLASSES[7 /* Announcement */] = 'chat-line-announcement';
CLASSES[8 /* PartyAnnouncement */] = 'chat-line-party-announcement';
CLASSES[9 /* Supporter1 */] = 'chat-line-supporter-1';
CLASSES[10 /* Supporter2 */] = 'chat-line-supporter-2';
CLASSES[11 /* Supporter3 */] = 'chat-line-supporter-3';
CLASSES[13 /* Whisper */] = 'chat-line-whisper';
CLASSES[14 /* WhisperTo */] = 'chat-line-whisper';
CLASSES[15 /* WhisperAnnouncement */] = 'chat-line-whisper-announcement';
CLASSES[16 /* WhisperToAnnouncement */] = 'chat-line-whisper-announcement';
function createChatLogLineDOM(clickLabel, clickName) {
    const line = {};
    line.root = htmlUtils_1.element('div', 'chat-line', [
        htmlUtils_1.element('span', 'chat-line-lead'),
        line.label = htmlUtils_1.element('span', 'chat-line-label mr-1', [line.labelText = htmlUtils_1.textNode('')], undefined, { click: () => clickLabel(line.entry) }),
        line.prefixText = htmlUtils_1.textNode(''),
        line.name = htmlUtils_1.element('span', 'chat-line-name', [
            htmlUtils_1.textNode('['),
            line.nameContent = htmlUtils_1.element('span', 'chat-line-name-content', [htmlUtils_1.textNode('')], undefined, { click: () => clickName(line.entry) }),
            line.index = htmlUtils_1.element('span', 'chat-line-name-index', [line.indexText = htmlUtils_1.textNode('')], { title: 'duplicate name' }),
            htmlUtils_1.textNode(']'),
        ]),
        line.suffixText = htmlUtils_1.textNode(''),
        line.message = htmlUtils_1.element('span', 'chat-line-message', [htmlUtils_1.textNode('')]),
    ]);
    return line;
}
exports.createChatLogLineDOM = createChatLogLineDOM;
function updateChatLogLine(line, entry) {
    const { classes, label, message, prefix, suffix } = entry;
    const hasSpace = message.indexOf(' ') !== -1;
    line.entry = entry;
    line.root.className = `chat-line ${hasSpace ? '' : 'chat-line-break '}${classes}`.trim();
    line.label.style.display = label ? 'inline' : 'none';
    line.labelText.nodeValue = label ? `[${label}]` : '';
    updateChatLogName(line, entry);
    line.prefixText.nodeValue = prefix || '';
    line.suffixText.nodeValue = suffix ? ` ${suffix}: ` : ': ';
    htmlUtils_1.replaceNodes(line.message, message);
}
exports.updateChatLogLine = updateChatLogLine;
function updateChatLogName(line, { name, index }) {
    if (name) {
        line.name.style.display = 'inline';
        htmlUtils_1.replaceNodes(line.nameContent, name);
        line.index.style.display = (index > 0) ? 'inline' : 'none';
        line.indexText.nodeValue = (index > 0) ? ` #${index + 1}` : '';
    }
    else {
        line.name.style.display = 'none';
    }
}
function isMatch(e, id, name, crc) {
    return e.name === name && (e.entityId === id || (e.crc === crc && crc !== undefined));
}
function addOrUpdatePony(pony, list) {
    for (const e of list) {
        if (isMatch(e, pony.id, pony.name, pony.crc)) {
            e.entityId = pony.id;
        }
    }
}
function updateEntityId(list, oldId, newId) {
    for (const e of list) {
        if (e.entityId === oldId) {
            e.entityId = newId;
        }
    }
}
function findUserIndex(users, id, crc) {
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (user.id === id || (crc !== undefined && user.crc === crc)) {
            user.id = id;
            return i;
        }
    }
    return -1;
}
let ChatLog = class ChatLog {
    constructor(game, settingsService, element, zone) {
        this.game = game;
        this.settingsService = settingsService;
        this.element = element;
        this.zone = zone;
        this.toBottomIcon = icons_1.faArrowDown;
        this.resizeIcon = icons_1.faCaretUp;
        this.toggleType = new core_1.EventEmitter();
        this.nameClick = new core_1.EventEmitter();
        this.innerWidth = 0;
        // TODO: move to game ?
        this.local = [];
        this.party = [];
        this.whisper = [];
        this.unread = 0;
        this.subscriptions = [];
        this.startX = 0;
        this.startY = 0;
        this.shouldScrollToEnd = false;
        this.scrolledToEnd = true;
        this.scrollingToEnd = false;
        this.scrollToEndAtFrame = false;
        this.indexes = new Map();
        this.messageCounter = 0;
        this.lastOpacity = 0;
        this.scrollHandler = () => {
            this.scrollingToEnd = true;
            this.scroll.nativeElement.scrollTop = 99999;
        };
        this.clickNameHandler = (message) => {
            this.zone.run(() => this.nameClick.emit(message));
        };
        this.clickLabel = (message) => {
            this.zone.run(() => {
                if (message.label) {
                    this.toggleType.emit(message.label);
                }
            });
        };
        this.findEntityFromMessages = (id) => {
            return findEntityFromMessages(id, this.whisper) ||
                findEntityFromMessages(id, this.party) ||
                findEntityFromMessages(id, this.local);
        };
        this.findEntityFromMessagesByName = (name) => {
            return findEntityFromMessagesByName(name, this.game.playerId, this.whisper) ||
                findEntityFromMessagesByName(name, this.game.playerId, this.party) ||
                findEntityFromMessagesByName(name, this.game.playerId, this.local);
        };
        // TODO: just put reference to chatlog on game ???
        this.subscriptions.push(game.onFrame.subscribe(() => {
            if (this.scrollToEndAtFrame) {
                this.scrollToEndAtFrame = false;
                this.scrollHandler();
            }
        }), game.onMessage.subscribe(message => {
            this.addMessage(message);
        }), 
        // TODO: move to game ?
        game.onPonyAddOrUpdate.subscribe(pony => {
            addOrUpdatePony(pony, this.local);
            addOrUpdatePony(pony, this.party);
            addOrUpdatePony(pony, this.whisper);
        }), game.onJoined.subscribe(() => {
            if (!DEVELOPMENT) {
                // TODO: move to game ?
                this.local = [];
                this.party = [];
                this.whisper = [];
                this.messageCounter = 0;
                this.indexes = new Map();
                this.clearList();
            }
        }), game.onEntityIdUpdate.subscribe(update => {
            updateEntityId(this.local, update.old, update.new);
            updateEntityId(this.party, update.old, update.new);
            updateEntityId(this.whisper, update.old, update.new);
        }));
    }
    get linesElement() {
        return this.lines.nativeElement;
    }
    updateOpen() {
        this.updateChatlog();
        if (this.open) {
            this.setUnread(0);
            this.regenerateList();
            this.scrollToEnd();
        }
        else {
            this.clearList();
        }
        this.updateInnerWidth();
    }
    updateChatlog() {
        const element = this.chatLog.nativeElement;
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
            const scroll = this.scroll.nativeElement;
            scroll.addEventListener('scroll', () => {
                if (this.scrollingToEnd) {
                    this.scrolledToEnd = true;
                    this.scrollingToEnd = false;
                }
                else {
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
            debugData_1.sampleMessages.forEach(({ name, id, message, type }) => this.addMessage({ id: id || 999999, crc: undefined, name, message, type: type || 0 /* Chat */ }));
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
    updateInnerWidth() {
        const maxWidth = this.element.nativeElement.getBoundingClientRect().width;
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
    get activeTab() {
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
        return this.settings2.chatlogOpacity === undefined ? constants_1.DEFAULT_CHATLOG_OPACITY : this.settings2.chatlogOpacity;
    }
    get bg() {
        return `rgba(0, 0, 0, ${this.opacity / 100})`;
    }
    get inactiveBg() {
        return `rgba(0, 0, 0, ${(this.opacity / 200) * 0.5})`;
    }
    createEntry({ id, crc, name, message, type }) {
        const system = type === 1 /* System */;
        const entry = {
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
    findOrCreateIndex(name, id, crc) {
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
    addMessage(message) {
        if (message.name && message.message) {
            const entry = this.createEntry(message);
            const party = interfaces_1.isPartyMessage(message.type);
            const whisper = interfaces_1.isWhisper(message.type) || interfaces_1.isWhisperTo(message.type);
            const open = this.open;
            const scrolledToEnd = open ? this.scrolledToEnd : false;
            const tab = this.activeTab;
            this.addEntryToList(this.local, GENERAL_CHAT_LIMIT, open && tab === 'local', entry);
            if (party || whisper) {
                const partyEntry = Object.assign({}, entry);
                partyEntry.dom = undefined;
                partyEntry.label = whisper ? partyEntry.label : undefined;
                this.addEntryToList(this.party, PARTY_CHAT_LIMIT, open && tab === 'party', partyEntry);
            }
            if (whisper) {
                const whisperEntry = Object.assign({}, entry);
                whisperEntry.dom = undefined;
                whisperEntry.label = undefined;
                this.addEntryToList(this.whisper, WHISPER_CHAT_LIMIT, open && tab === 'whisper', whisperEntry);
            }
            if (message.type === 13 /* Whisper */ && !this.open) {
                this.setUnread(this.unread + 1);
            }
            if (scrolledToEnd) {
                this.scrollToEnd();
            }
            this.messageCounter++;
        }
    }
    addEntryToList(list, limit, isOpen, entry) {
        let removedDom;
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
    switchTab(tab) {
        if (this.activeTab !== tab) {
            this.settings.chatlogTab = tab;
            this.settingsService.saveBrowserSettings();
            this.regenerateList();
            this.scrollToEnd();
            this.updateTabs();
        }
    }
    updateTabs() {
        this.setActiveTab(this.localTab.nativeElement, this.activeTab === 'local');
        this.setActiveTab(this.partyTab.nativeElement, this.activeTab === 'party');
        this.setActiveTab(this.whisperTab.nativeElement, this.activeTab === 'whisper');
    }
    setActiveTab(tab, active) {
        if (active) {
            tab.classList.add('active');
            tab.style.backgroundColor = this.bg;
        }
        else {
            tab.classList.remove('active');
            tab.style.backgroundColor = this.inactiveBg;
        }
    }
    scrollToEnd() {
        // requestAnimationFrame(this.scrollHandler);
        this.scrollToEndAtFrame = true;
    }
    clearList() {
        htmlUtils_1.removeAllNodes(this.linesElement);
    }
    regenerateList() {
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
    drag({ x, y, type, event }, resizeY, resizeX) {
        event.preventDefault();
        if (type === 'start') {
            const { left, top } = this.element.nativeElement.getBoundingClientRect();
            this.startX = left;
            this.startY = top;
            this.shouldScrollToEnd = this.scrolledToEnd;
        }
        if (resizeX) {
            this.settings.chatlogWidth = lodash_1.clamp(x - this.startX, 200, 2000);
        }
        if (resizeY) {
            this.settings.chatlogHeight = lodash_1.clamp(this.startY - y, 120, 2000);
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
    setUnread(value) {
        if (this.unread !== value) {
            this.unread = value;
            const count = this.countElement.nativeElement;
            const toggle = this.toggleButton.nativeElement;
            if (value) {
                count.textContent = value > 99 ? '99+' : `${value}`;
                toggle.classList.add('has-unread');
            }
            else {
                count.textContent = '';
                toggle.classList.remove('has-unread');
            }
        }
    }
};
tslib_1.__decorate([
    core_1.ViewChild('chatLog', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "chatLog", void 0);
tslib_1.__decorate([
    core_1.ViewChild('scroll', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "scroll", void 0);
tslib_1.__decorate([
    core_1.ViewChild('lines', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "lines", void 0);
tslib_1.__decorate([
    core_1.ViewChild('localTab', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "localTab", void 0);
tslib_1.__decorate([
    core_1.ViewChild('partyTab', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "partyTab", void 0);
tslib_1.__decorate([
    core_1.ViewChild('whisperTab', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "whisperTab", void 0);
tslib_1.__decorate([
    core_1.ViewChild('toggleButton', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "toggleButton", void 0);
tslib_1.__decorate([
    core_1.ViewChild('count', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "countElement", void 0);
tslib_1.__decorate([
    core_1.ViewChild('content', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatLog.prototype, "contentElement", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], ChatLog.prototype, "toggleType", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], ChatLog.prototype, "nameClick", void 0);
tslib_1.__decorate([
    core_1.HostListener('window:resize'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ChatLog.prototype, "updateInnerWidth", null);
ChatLog = tslib_1.__decorate([
    core_1.Component({
        selector: 'chat-log',
        templateUrl: 'chat-log.pug',
        styleUrls: ['chat-log.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [game_1.PonyTownGame,
        settingsService_1.SettingsService,
        core_1.ElementRef,
        core_1.NgZone])
], ChatLog);
exports.ChatLog = ChatLog;
function findEntityFromMessages(id, messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].entityId === id) {
            return { fake: true, id, type: constants_1.PONY_TYPE, name: messages[i].name, crc: messages[i].crc };
        }
    }
    return undefined;
}
function findEntityFromMessagesByName(name, playerId, messages) {
    const regex = new RegExp(`^${lodash_1.escapeRegExp(name)}$`, 'i');
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.name && message.entityId && message.entityId !== playerId && regex.test(message.name)) {
            return { fake: true, id: message.entityId, type: constants_1.PONY_TYPE, name: message.name, crc: message.crc };
        }
    }
    return undefined;
}
//# sourceMappingURL=chat-log.js.map