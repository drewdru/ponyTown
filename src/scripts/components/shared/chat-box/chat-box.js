"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const interfaces_1 = require("../../../common/interfaces");
const constants_1 = require("../../../common/constants");
const game_1 = require("../../../client/game");
const clientUtils_1 = require("../../../client/clientUtils");
const icons_1 = require("../../../client/icons");
const partyUtils_1 = require("../../../client/partyUtils");
const playerActions_1 = require("../../../client/playerActions");
const pony_1 = require("../../../common/pony");
const emoji_1 = require("../../../client/emoji");
const htmlUtils_1 = require("../../../client/htmlUtils");
const utils_1 = require("../../../common/utils");
const handlers_1 = require("../../../client/handlers");
const chatTypeNames = [];
const chatTypeClasses = [];
function setupChatType(type, name) {
    chatTypeNames[type] = name;
    chatTypeClasses[type] = `chat-${name.replace(/ /, '-')}`;
}
setupChatType(0 /* Say */, 'say');
setupChatType(1 /* Party */, 'party');
setupChatType(4 /* Supporter */, 'sup');
setupChatType(5 /* Supporter1 */, 'sup1');
setupChatType(6 /* Supporter2 */, 'sup2');
setupChatType(7 /* Supporter3 */, 'sup3');
setupChatType(9 /* Whisper */, 'whisper');
setupChatType(2 /* Think */, 'think');
setupChatType(3 /* PartyThink */, 'party think');
function isActionCommand(message) {
    return /^\/(yawn|sneeze|achoo|laugh|lol|haha|хаха|jaja)/i.test(message);
}
let ChatBox = class ChatBox {
    constructor(game, zone) {
        this.game = game;
        this.maxSayLength = constants_1.SAY_MAX_LENGTH;
        this.commentIcon = icons_1.faComment;
        this.sendIcon = icons_1.faAngleDoubleRight;
        this.isOpen = false;
        this.message = '';
        this.chatType = 0 /* Say */;
        this.pasted = false;
        this.lastMessages = [];
        this.state = {};
        this._disabled = false;
        this.currentTypeClass = '';
        this.currentTypePrefix = '';
        this.currentTypeName = '';
        this.subscriptions = [
            this.game.onChat.subscribe(() => zone.run(() => this.chat(undefined))),
            this.game.onToggleChat.subscribe(() => zone.run(() => this.toggle())),
            this.game.onCommand.subscribe(() => zone.run(() => this.command())),
            this.game.onLeft.subscribe(() => {
                this.chatType = 0 /* Say */;
                this.close();
            }),
        ];
        this.game.onCancel = () => this.isOpen ? (zone.run(() => this.close()), true) : false;
    }
    get disabled() {
        return this._disabled;
    }
    set disabled(value) {
        this._disabled = value;
        if (value) {
            this.close();
        }
    }
    get input() {
        return this.inputElement.nativeElement;
    }
    ngAfterViewInit() {
        this.chatBox.nativeElement.hidden = true;
        this.input.addEventListener('paste', () => this.pasted = true);
    }
    ngOnDestroy() {
        this.subscriptions.forEach(s => s.unsubscribe());
    }
    send(_event) {
        let chatType = this.chatType;
        let message = emoji_1.replaceEmojis(clientUtils_1.cleanMessage(this.message || '')).substr(0, constants_1.SAY_MAX_LENGTH);
        const handled = playerActions_1.handleActionCommand(message, this.game);
        const spam = this.pasted && chatType !== 1 /* Party */ && clientUtils_1.isSpamMessage(message, this.lastMessages);
        const empty = !this.game.player || !message;
        const ignoreAction = isActionCommand(message) && this.game.player && pony_1.hasHeadAnimation(this.game.player);
        const whisperTo = this.game.whisperTo;
        let entityId = whisperTo && whisperTo.id || 0;
        if (/^\/(w|whisper) .+$/i.test(message)) {
            chatType = 9 /* Whisper */;
            message = message.substr(/^\/w /i.test(message) ? 3 : 9);
            let offset = 0;
            let entity = undefined;
            do {
                offset = message.indexOf(' ', offset);
                if (offset === -1)
                    break;
                const name = message.substr(0, offset);
                entity = handlers_1.findBestEntityByName(this.game, name);
                offset++;
            } while (!entity);
            if (entity) {
                message = message.substr(offset);
                entityId = entity.id;
            }
            else {
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
    keydown(e) {
        if (e.keyCode !== 9 /* TAB */ && e.keyCode !== 16 /* SHIFT */) {
            this.state.lastEmoji = undefined;
        }
        if (e.keyCode === 9 /* TAB */) {
            if (this.message) {
                if (/^\/(w|whisper) .+$/i.test(this.message)) {
                    const space = this.message.indexOf(' ');
                    const names = handlers_1.findMatchingEntityNames(this.game, this.message.substr(space + 1));
                    if (names.length === 1) {
                        this.message = `${this.message.substring(0, space)} ${names[0]}`;
                    }
                }
                else {
                    this.message = emoji_1.autocompleteMesssage(this.message, e.shiftKey, this.state);
                }
            }
            e.preventDefault();
        }
        else if (e.keyCode === 13 /* ENTER */ && this.isOpen) {
            this.send(e);
        }
        else if (e.keyCode === 27 /* ESCAPE */) {
            this.close();
            e.preventDefault();
        }
        else if (e.keyCode === 32 /* SPACE */) {
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
                || (isParty && !partyUtils_1.isInParty(this.game))
                || (isSup && supporter === 0)
                || (isSup1 && supporter < 1)
                || (isSup2 && supporter < 2)
                || (isSup3 && supporter < 3);
            if (isSayOrInvalid) {
                this.changeChatType(e, 0 /* Say */);
            }
            else if (isParty) {
                this.changeChatType(e, 1 /* Party */);
            }
            else if (isSup) {
                this.changeChatType(e, 4 /* Supporter */);
            }
            else if (isSup1) {
                this.changeChatType(e, 5 /* Supporter1 */);
            }
            else if (isSup2) {
                this.changeChatType(e, 6 /* Supporter2 */);
            }
            else if (isSup3) {
                this.changeChatType(e, 7 /* Supporter3 */);
            }
            else if (/^\/(t|think)$/i.test(this.message)) {
                if (interfaces_1.isPartyChat(this.chatType)) {
                    this.changeChatType(e, 3 /* PartyThink */);
                }
                else {
                    this.changeChatType(e, 2 /* Think */);
                }
            }
            else if (/^\/(r|reply)$/i.test(this.message)) {
                const lastWhisperFrom = this.game.lastWhisperFrom;
                const entity = lastWhisperFrom && handlers_1.findEntityOrMockByAnyMeans(this.game, lastWhisperFrom.entityId);
                if (entity) {
                    this.game.whisperTo = entity;
                    this.changeChatType(e, 9 /* Whisper */);
                }
                else {
                    this.changeChatType(e, 0 /* Say */);
                }
            }
            else if (/^\/(w|whisper) .+$/i.test(this.message) && !e.shiftKey) {
                const name = this.message.substr(/^\/w /i.test(this.message) ? 3 : 9);
                const entity = handlers_1.findBestEntityByName(this.game, name);
                if (entity) {
                    this.game.whisperTo = entity;
                    this.changeChatType(e, 9 /* Whisper */);
                }
            }
        }
    }
    say(message, chatType, entityId) {
        this.game.lastChatMessageType = chatType;
        return !!this.game.send(server => server.say(entityId, message, chatType));
    }
    changeChatType(e, chatType) {
        this.chatType = chatType;
        this.message = '';
        this.updateChatType();
        e.preventDefault();
    }
    chat(event) {
        if (this.isOpen) {
            this.send(event);
        }
        else {
            this.open();
        }
    }
    command() {
        if (!this.isOpen) {
            this.chat(undefined);
            this.message = '/';
            this.input.selectionStart = this.input.selectionEnd = 10000;
        }
    }
    open() {
        if (!this.isOpen) {
            this.isOpen = true;
            this.chatBox.nativeElement.hidden = false;
        }
        this.chatType = isValidChatType(this.chatType, this.game) ? this.chatType : 0 /* Say */;
        this.updateChatType();
        this.input.focus();
    }
    close() {
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
        }
        else {
            this.open();
        }
    }
    toggleChatType() {
        const chatTypes = getChatTypes(this.game);
        this.chatType = chatTypes[(chatTypes.indexOf(this.chatType) + 1) % chatTypes.length];
        this.updateChatType();
        this.input.focus();
    }
    setChatType(type) {
        if (type === 'say') {
            this.chatType = 0 /* Say */;
            this.open();
        }
        else if (type === 'party' && partyUtils_1.isInParty(this.game)) {
            this.chatType = 1 /* Party */;
            this.open();
        }
        else if (type === 'whisper') {
            this.chatType = 9 /* Whisper */;
            this.open();
        }
    }
    updateChatType() {
        let typeName;
        let typePrefix;
        let changed = false;
        const typeClass = chatTypeClass(this.chatType, this.game.model.supporter);
        if (this.currentTypeClass !== typeClass) {
            this.currentTypeClass = typeClass;
            this.chatBoxInput.nativeElement.className = typeClass;
        }
        if (this.chatType === 9 /* Whisper */) {
            typePrefix = 'To ';
            typeName = this.game.whisperTo && this.game.whisperTo.name || 'unknown';
        }
        else {
            typePrefix = '';
            typeName = chatTypeNames[this.chatType];
        }
        if (this.currentTypePrefix !== typePrefix) {
            changed = true;
            this.currentTypePrefix = typePrefix;
            this.typePrefix.nativeElement.textContent = typePrefix;
        }
        if (this.currentTypeName !== typeName) {
            changed = true;
            this.currentTypeName = typeName;
            htmlUtils_1.replaceNodes(this.typeName.nativeElement, typeName);
        }
        if (changed) {
            const { width } = this.typeBox.nativeElement.getBoundingClientRect();
            const padding = 35 + 13 + Math.ceil(width);
            this.inputElement.nativeElement.style.paddingLeft = `${padding}px`;
        }
    }
};
tslib_1.__decorate([
    core_1.ViewChild('inputElement', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatBox.prototype, "inputElement", void 0);
tslib_1.__decorate([
    core_1.ViewChild('typeBox', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatBox.prototype, "typeBox", void 0);
tslib_1.__decorate([
    core_1.ViewChild('typePrefix', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatBox.prototype, "typePrefix", void 0);
tslib_1.__decorate([
    core_1.ViewChild('typeName', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatBox.prototype, "typeName", void 0);
tslib_1.__decorate([
    core_1.ViewChild('chatBox', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatBox.prototype, "chatBox", void 0);
tslib_1.__decorate([
    core_1.ViewChild('chatBoxInput', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ChatBox.prototype, "chatBoxInput", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], ChatBox.prototype, "disabled", null);
ChatBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'chat-box',
        templateUrl: 'chat-box.pug',
        styleUrls: ['chat-box.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [game_1.PonyTownGame, core_1.NgZone])
], ChatBox);
exports.ChatBox = ChatBox;
function chatTypeClass(chatType, supporter) {
    if (chatType === 4 /* Supporter */) {
        switch (supporter) {
            case 1: return 'chat-sup chat-sup1';
            case 2: return 'chat-sup chat-sup2';
            case 3: return 'chat-sup chat-sup3';
        }
    }
    return chatTypeClasses[chatType];
}
function isValidChatType(type, game) {
    const supporter = game.model.supporter;
    switch (type) {
        case 0 /* Say */:
        case 2 /* Think */:
        case 9 /* Whisper */:
            return true;
        case 1 /* Party */:
        case 3 /* PartyThink */:
            return partyUtils_1.isInParty(game);
        case 4 /* Supporter */:
            return supporter > 0;
        case 5 /* Supporter1 */:
            return supporter >= 1;
        case 6 /* Supporter2 */:
            return supporter >= 2;
        case 7 /* Supporter3 */:
            return supporter >= 3;
        case 8 /* Dismiss */:
            return false;
        default:
            return utils_1.invalidEnumReturn(type, false);
    }
}
function getChatTypes(game) {
    const chatTypes = [0 /* Say */];
    const supporter = game.model.supporter;
    if (partyUtils_1.isInParty(game)) {
        chatTypes.push(1 /* Party */);
    }
    if (supporter) {
        chatTypes.push(4 /* Supporter */);
    }
    return chatTypes;
}
//# sourceMappingURL=chat-box.js.map