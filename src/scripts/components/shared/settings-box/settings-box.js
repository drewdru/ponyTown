"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const modal_1 = require("ngx-bootstrap/modal");
const operators_1 = require("rxjs/operators");
const gameService_1 = require("../../services/gameService");
const model_1 = require("../../services/model");
const game_1 = require("../../../client/game");
const dropdown_1 = require("../directives/dropdown");
const icons_1 = require("../../../client/icons");
const settingsService_1 = require("../../services/settingsService");
const audio_1 = require("../../services/audio");
let SettingsBox = class SettingsBox {
    constructor(model, modalService, settingsService, gameService, game, audio, zone) {
        this.model = model;
        this.modalService = modalService;
        this.settingsService = settingsService;
        this.gameService = gameService;
        this.game = game;
        this.audio = audio;
        this.zone = zone;
        this.cogIcon = icons_1.faCog;
        this.searchIcon = icons_1.faSearch;
        this.signOutIcon = icons_1.faSignOutAlt;
        this.forwardIcon = icons_1.faStepForward;
        this.emptyIcon = icons_1.emptyIcon;
        this.plusIcon = icons_1.faPlus;
        this.minusIcon = icons_1.faMinus;
    }
    get scale() {
        return this.game.scale;
    }
    get volume() {
        return this.game.volume;
    }
    set volume(value) {
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
        return this.volume === 0 ? icons_1.faVolumeOff : (this.volume < 50 ? icons_1.faVolumeDown : icons_1.faVolumeUp);
    }
    get isMod() {
        return this.model.isMod;
    }
    get hasInvites() {
        return this.isMod; // TEMP
    }
    ngOnInit() {
        this.game.onClock
            .pipe(operators_1.distinctUntilChanged())
            .subscribe(text => {
            if (this.dropdown.isOpen) {
                this.zone.run(() => this.time = text);
            }
            else {
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
        this.game.send(server => server.action(9 /* UnhideAllHiddenPlayers */));
        this.dropdown.close();
    }
    openModal(template) {
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
};
tslib_1.__decorate([
    core_1.ViewChild('dropdown', { static: true }),
    tslib_1.__metadata("design:type", dropdown_1.Dropdown)
], SettingsBox.prototype, "dropdown", void 0);
tslib_1.__decorate([
    core_1.ViewChild('actionsModal', { static: true }),
    tslib_1.__metadata("design:type", core_1.TemplateRef)
], SettingsBox.prototype, "actionsModal", void 0);
tslib_1.__decorate([
    core_1.ViewChild('settingsModal', { static: true }),
    tslib_1.__metadata("design:type", core_1.TemplateRef)
], SettingsBox.prototype, "settingsModal", void 0);
tslib_1.__decorate([
    core_1.ViewChild('invitesModal', { static: true }),
    tslib_1.__metadata("design:type", core_1.TemplateRef)
], SettingsBox.prototype, "invitesModal", void 0);
SettingsBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'settings-box',
        templateUrl: 'settings-box.pug',
        styleUrls: ['settings-box.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model,
        modal_1.BsModalService,
        settingsService_1.SettingsService,
        gameService_1.GameService,
        game_1.PonyTownGame,
        audio_1.Audio,
        core_1.NgZone])
], SettingsBox);
exports.SettingsBox = SettingsBox;
//# sourceMappingURL=settings-box.js.map