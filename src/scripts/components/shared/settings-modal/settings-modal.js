"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const settingsService_1 = require("../../services/settingsService");
const constants_1 = require("../../../common/constants");
const storageService_1 = require("../../services/storageService");
const utils_1 = require("../../../common/utils");
const game_1 = require("../../../client/game");
const clientUtils_1 = require("../../../client/clientUtils");
const icons_1 = require("../../../client/icons");
let SettingsModal = class SettingsModal {
    constructor(settingsService, storage, game) {
        this.settingsService = settingsService;
        this.storage = storage;
        this.game = game;
        this.maxChatlogRange = constants_1.MAX_CHATLOG_RANGE;
        this.minChatlogRange = constants_1.MIN_CHATLOG_RANGE;
        this.gameIcon = icons_1.faSlidersH;
        this.chatIcon = icons_1.faCommentSlash;
        this.filtersIcon = icons_1.faCommentSlash;
        this.controlsIcon = icons_1.faGamepad;
        this.graphicsIcon = icons_1.faImage;
        this.exportIcon = icons_1.faDownload;
        this.importIcon = icons_1.faUpload;
        this.close = new core_1.EventEmitter();
        this.account = {};
        this.browser = {};
        this.accountBackup = {};
        this.browserBackup = {};
        this.done = false;
    }
    get pane() {
        return this.storage.getItem('settings-modal-pane') || 'game';
    }
    set pane(value) {
        this.storage.setItem('settings-modal-pane', value);
    }
    get lockLowGraphicsMode() {
        return this.game.failedFBO;
    }
    get chatlogRangeText() {
        const range = this.account.chatlogRange;
        return constants_1.isChatlogRangeUnlimited(range) ? 'entire screen' : `${range} tiles`;
    }
    ngOnInit() {
        this.accountBackup = utils_1.cloneDeep(this.settingsService.account);
        this.browserBackup = utils_1.cloneDeep(this.settingsService.browser);
        this.account = this.settingsService.account;
        this.browser = this.settingsService.browser;
        this.setupDefaults();
        this.subscription = this.game.onLeft.subscribe(() => this.cancel());
    }
    ngOnDestroy() {
        this.finishChatlogRange();
        if (!this.done) {
            this.cancel();
        }
        this.subscription && this.subscription.unsubscribe();
    }
    reset() {
        this.account = this.settingsService.account = {};
        this.browser = this.settingsService.browser = {};
        this.setupDefaults();
    }
    cancel() {
        this.done = true;
        this.settingsService.account = this.accountBackup;
        this.settingsService.browser = this.browserBackup;
        this.close.emit();
    }
    ok() {
        if (this.account.filterWords) {
            let filter = this.account.filterWords;
            while (filter.length > constants_1.MAX_FILTER_WORDS_LENGTH && /\s/.test(filter)) {
                filter = filter.trim().replace(/\s+\S+$/, '');
            }
            if (filter.length > constants_1.MAX_FILTER_WORDS_LENGTH) {
                this.account.filterWords = '';
            }
            else {
                this.account.filterWords = filter;
            }
        }
        this.done = true;
        this.settingsService.saveAccountSettings(this.account);
        this.settingsService.saveBrowserSettings(this.browser);
        this.close.emit();
    }
    updateChatlogRange(range) {
        document.body.classList.add('translucent-modals');
        clientUtils_1.updateRangeIndicator(range, this.game);
    }
    finishChatlogRange() {
        document.body.classList.remove('translucent-modals');
        clientUtils_1.updateRangeIndicator(undefined, this.game);
    }
    setupDefaults() {
        if (this.account.chatlogOpacity === undefined) {
            this.account.chatlogOpacity = constants_1.DEFAULT_CHATLOG_OPACITY;
        }
        if (this.account.chatlogRange === undefined) {
            this.account.chatlogRange = constants_1.MAX_CHATLOG_RANGE;
        }
        if (this.account.filterWords === undefined) {
            this.account.filterWords = '';
        }
    }
    export() {
        const account = Object.assign({}, this.account, { actions: undefined });
        const browser = this.browser;
        const data = JSON.stringify({ account, browser });
        saveAs(new Blob([data], { type: 'text/plain;charset=utf-8' }), `pony-town-settings.json`);
    }
    async import(file) {
        if (file) {
            const text = await clientUtils_1.readFileAsText(file);
            const { account, browser } = JSON.parse(text);
            const actions = this.account.actions;
            Object.assign(this.account, Object.assign({}, account, { actions }));
            Object.assign(this.browser, browser);
        }
    }
};
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], SettingsModal.prototype, "close", void 0);
SettingsModal = tslib_1.__decorate([
    core_1.Component({
        selector: 'settings-modal',
        templateUrl: 'settings-modal.pug',
        styleUrls: ['settings-modal.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [settingsService_1.SettingsService,
        storageService_1.StorageService,
        game_1.PonyTownGame])
], SettingsModal);
exports.SettingsModal = SettingsModal;
//# sourceMappingURL=settings-modal.js.map