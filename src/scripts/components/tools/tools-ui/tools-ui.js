"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const modal_1 = require("ngx-bootstrap/modal");
const lodash_1 = require("lodash");
const constants_1 = require("../../../common/constants");
const ponyInfo_1 = require("../../../common/ponyInfo");
const sprites = require("../../../generated/sprites");
const game_1 = require("../../../client/game");
const utils_1 = require("../../../common/utils");
const stringUtils_1 = require("../../../common/stringUtils");
const spriteUtils_1 = require("../../../client/spriteUtils");
const settingsService_1 = require("../../services/settingsService");
const icons_1 = require("../../../client/icons");
const compressPony_1 = require("../../../common/compressPony");
const tags_1 = require("../../../common/tags");
const model_1 = require("../../services/model");
const partyUtils_1 = require("../../../client/partyUtils");
const pony_1 = require("../../../common/pony");
const buttonActions_1 = require("../../../client/buttonActions");
const ponyDraw_1 = require("../../../client/ponyDraw");
const colors_1 = require("../../../common/colors");
const color_1 = require("../../../common/color");
const entityUtils_1 = require("../../../common/entityUtils");
const clientUtils_1 = require("../../../client/clientUtils");
const offlinePonyInfo = compressPony_1.decompressPonyString(constants_1.OFFLINE_PONY, true);
const offlinePonyPal = ponyInfo_1.toPalette(offlinePonyInfo);
const defaultPalette = ponyInfo_1.mockPaletteManager.addArray(sprites.defaultPalette);
const offlinePony = pony_1.createPony(1, 0, constants_1.OFFLINE_PONY, defaultPalette, ponyInfo_1.mockPaletteManager);
offlinePony.name = 'Offline pony';
const supporterPony = pony_1.createPony(2, 0, constants_1.SUPPORTER_PONY, defaultPalette, ponyInfo_1.mockPaletteManager);
supporterPony.name = 'Supporter pony';
const pendingPony = pony_1.createPony(3, 0, constants_1.SUPPORTER_PONY, defaultPalette, ponyInfo_1.mockPaletteManager);
pendingPony.name = 'Pending pony';
const tails = sprites.tails[0].slice();
const labels = ['none', 'Long tail', 'Short tail', 'Short smooth tail', 'Long puffy tail', 'Long wavy tail'];
tails.forEach((t, i) => t ? t[0].label = labels[i] : undefined);
const colors = Object.values(color_1.colorNames);
let ToolsUI = class ToolsUI {
    constructor(game, zone, settings, modalService, model) {
        this.game = game;
        this.zone = zone;
        this.settings = settings;
        this.modalService = modalService;
        this.model = model;
        this.homeIcon = icons_1.faHome;
        this.starIcon = icons_1.faStar;
        this.heartIcon = icons_1.faHeart;
        this.lockIcon = icons_1.faLock;
        this.isHidden = entityUtils_1.isHidden;
        this.isIgnored = entityUtils_1.isIgnored;
        this.focusTrap = true;
        this.tails = tails;
        this.cmSize = constants_1.CM_SIZE;
        this.pony = offlinePonyInfo;
        this.customOutlines = false;
        this.pal = offlinePonyPal;
        this.color = 'cornflowerblue';
        this.checked = true;
        this.radio = 'a';
        this.slider = 50;
        this.sprite = sprites.tails[0][1][0];
        this.fills = ['ff0000', '00ff00'];
        this.outlines = ['990000', '009900'];
        this.spriteActive = false;
        this.selected = offlinePony;
        this.timeout = utils_1.fromNow(1000 * 3600 * 10).toISOString();
        this.autoCloseDropdown = true;
        this.initialized = false;
        this.customChecked = false;
        this.actionBarEditable = true;
        this.tags = ['', ...tags_1.getAllTags().map(t => t.id)];
        this.virtualItems = utils_1.times(1000, i => ({ value: i, name: `This is item ${i}`, color: colors[i % colors.length] }));
        this.virtualItems2 = [{ name: 'An item 0' }];
        this.angle = 45;
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
        };
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
        game.send = (action) => action({
            action() { },
            select() { },
            say() { },
            expression() { },
            getInvites: () => Promise.resolve([
                { id: 'a', info: constants_1.OFFLINE_PONY, name: 'Offline Pony', active: true },
                { id: 'b', info: constants_1.OFFLINE_PONY, name: 'Fuzzy', active: true },
                { id: 'c', info: constants_1.OFFLINE_PONY, name: 'Meno', active: true },
                { id: 'd', info: constants_1.OFFLINE_PONY, name: 'Offline Pony', active: true },
                { id: 'e', info: constants_1.OFFLINE_PONY, name: 'Fuzzy', active: true },
                { id: 'f', info: constants_1.OFFLINE_PONY, name: 'Meno', active: false },
                { id: 'g', info: constants_1.OFFLINE_PONY, name: 'Offline Pony', active: false },
                { id: 'h', info: constants_1.OFFLINE_PONY, name: 'Fuzzy', active: false },
                { id: 'i', info: constants_1.OFFLINE_PONY, name: 'Meno', active: false },
                { id: 'j', info: constants_1.OFFLINE_PONY, name: 'Meno', active: false },
            ]),
        });
    }
    ngOnInit() {
        clientUtils_1.initFeatureFlags({});
        return spriteUtils_1.loadAndInitSpriteSheets()
            .then(() => {
            ponyDraw_1.initializeToys(ponyInfo_1.mockPaletteManager);
            this.initialized = true;
            this.model.loading = true;
            this.zone.runOutsideAngular(() => this.update());
        });
    }
    ngOnDestroy() {
        cancelAnimationFrame(this.animationFrame);
    }
    get baseHairColor() {
        return ponyInfo_1.getBaseFill(this.pony.mane);
    }
    get isFriend() {
        return entityUtils_1.isFriend(this.selected);
    }
    set isFriend(value) {
        this.selected.playerState = utils_1.setFlag(this.selected.playerState, 4 /* Friend */, value);
    }
    update() {
        this.animationFrame = requestAnimationFrame(() => this.update());
        game_1.redrawActionButtons(this.game.actionsChanged);
        this.game.actionsChanged = false;
        this.game.onFrame.next();
    }
    changed() {
        ponyInfo_1.syncLockedPonyInfo(this.pony);
    }
    toggleIgnored(entity) {
        entity.playerState = utils_1.setFlag(entity.playerState, 1 /* Ignored */, !entityUtils_1.isIgnored(entity));
    }
    toggleHidden(entity) {
        entity.playerState = utils_1.setFlag(entity.playerState, 2 /* Hidden */, !entityUtils_1.isHidden(entity));
    }
    spamChat(chatlog) {
        if (this.spamChatInterval) {
            clearInterval(this.spamChatInterval);
            this.spamChatInterval = 0;
        }
        else {
            this.spamChatInterval = 1;
            this.zone.runOutsideAngular(() => this.spamChatInterval = setInterval(() => {
                chatlog.addMessage({
                    id: 0,
                    crc: undefined,
                    name: stringUtils_1.randomString(lodash_1.random(1, 20)),
                    message: stringUtils_1.randomString(lodash_1.random(1, 40)),
                    type: 0 /* Chat */
                });
            }, 50));
        }
    }
    get isPartyLeader() {
        return partyUtils_1.isPartyLeader(this.game);
    }
    set isPartyLeader(value) {
        if (value) {
            this.game.party.leaderId = this.game.player.id;
        }
        else {
            this.game.party.leaderId = 1;
        }
    }
    get chatlogOpacity() {
        return this.settings.account.chatlogOpacity || constants_1.DEFAULT_CHATLOG_OPACITY;
    }
    set chatlogOpacity(value) {
        this.settings.account.chatlogOpacity = value;
    }
    addMessage(chatlog, message) {
        chatlog.addMessage({ name: 'test name', id: 123, crc: undefined, message, type: 0 /* Chat */ });
    }
    addWhisper(chatlog, message) {
        chatlog.addMessage({ name: 'test name', id: 123, crc: undefined, message, type: 13 /* Whisper */ });
    }
    get angleInRad() {
        return (this.angle / 180) * Math.PI;
    }
    get horizontalTileHeight() {
        return 32 * Math.sin(this.angleInRad);
    }
    get verticalTileHeight() {
        return 32 * Math.cos(this.angleInRad);
    }
    showModal(template) {
        this.modalRef = this.modalService.show(template, {});
    }
    saveActions() {
        if (DEVELOPMENT) {
            const serialized = buttonActions_1.serializeActions(this.game.actions);
            this.game.actions = buttonActions_1.deserializeActions(serialized);
            console.log(serialized);
        }
    }
    // actions
    get expressionActionsColor() {
        return colors_1.ACTION_EXPRESSION_BG;
    }
    set expressionActionsColor(value) {
        colors_1.updateActionColor(color_1.colorToCSS(color_1.parseColor(value)));
        this.game.actionsChanged = true;
    }
};
ToolsUI = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-ui',
        templateUrl: 'tools-ui.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [game_1.PonyTownGame,
        core_1.NgZone,
        settingsService_1.SettingsService,
        modal_1.BsModalService,
        model_1.Model])
], ToolsUI);
exports.ToolsUI = ToolsUI;
//# sourceMappingURL=tools-ui.js.map