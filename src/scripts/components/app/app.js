"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const tooltip_1 = require("ngx-bootstrap/tooltip");
const popover_1 = require("ngx-bootstrap/popover");
const modal_1 = require("ngx-bootstrap/modal");
const gameService_1 = require("../services/gameService");
const model_1 = require("../services/model");
const data_1 = require("../../client/data");
const game_1 = require("../../client/game");
const icons_1 = require("../../client/icons");
const installService_1 = require("../services/installService");
const clientUtils_1 = require("../../client/clientUtils");
const errorReporter_1 = require("../services/errorReporter");
const constants_1 = require("../../common/constants");
const pony_1 = require("../../common/pony");
const worldMap_1 = require("../../common/worldMap");
const gameUtils_1 = require("../../client/gameUtils");
function tooltipConfig() {
    return Object.assign(new tooltip_1.TooltipConfig(), { container: 'body' });
}
exports.tooltipConfig = tooltipConfig;
function popoverConfig() {
    return Object.assign(new popover_1.PopoverConfig(), { container: 'body' });
}
exports.popoverConfig = popoverConfig;
let App = class App {
    constructor(modalService, gameService, model, game, router, activatedRoute, installService, errorReporter) {
        this.modalService = modalService;
        this.gameService = gameService;
        this.model = model;
        this.game = game;
        this.router = router;
        this.activatedRoute = activatedRoute;
        this.installService = installService;
        this.errorReporter = errorReporter;
        this.version = data_1.version;
        this.date = new Date();
        this.emailIcon = icons_1.faEnvelope;
        this.twitterIcon = icons_1.faTwitter;
        this.patreonIcon = icons_1.faPatreon;
        this.cogIcon = icons_1.faCog;
        this.homeIcon = icons_1.faHome;
        this.helpIcon = icons_1.faGamepad;
        this.aboutIcon = icons_1.faInfoCircle;
        this.charactersIcon = icons_1.faHorseHead;
        this.contactEmail = data_1.contactEmail;
        this.patreonLink = data_1.supporterLink;
        this.twitterLink = data_1.twitterLink;
        this.copyright = data_1.copyrightName;
        this.url = location.pathname;
        this.subscriptions = [];
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
                if (event instanceof router_1.NavigationEnd && this.url !== event.url) {
                    ga('set', 'page', this.url = event.url);
                    ga('send', 'pageview');
                }
            }));
        }
        if (clientUtils_1.isBrowserOutdated) {
            this.errorReporter.disable();
        }
        if (!DEVELOPMENT) {
            clientUtils_1.registerServiceWorker(`${data_1.host}sw.js`, () => {
                this.model.updating = true;
                setTimeout(() => {
                    this.model.updatingTakesLongTime = true;
                }, 20 * constants_1.SECOND);
            });
        }
        if (DEVELOPMENT) {
            this.subscriptions.push(this.game.announcements.subscribe(message => {
                this.announcer.nativeElement.style.display = 'flex';
                const announcerText = this.announcerText.nativeElement;
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
    focus() {
        this.model.verifyAccount();
    }
    signIn(provider) {
        this.model.signIn(provider);
    }
    signOut() {
        this.model.signOut();
    }
    openReloadModal() {
        if (!this.reloadModalRef) {
            this.reloadModalRef = this.modalService.show(this.reloadModal, { class: 'modal-lg', ignoreBackdropClick: true, keyboard: false });
            this.reloadInterval = setInterval(() => {
                if (clientUtils_1.checkIframeKey('reload-frame', 'gep84r9jshge4g')) {
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
    chatLogNameClick(chatBox, message) {
        if (!message.entityId) {
            return;
        }
        let entity = worldMap_1.findEntityById(this.game.map, message.entityId);
        if (entity && (!pony_1.isPony(entity) || entity === this.game.player)) {
            return;
        }
        if (!entity) {
            entity = { fake: true, type: constants_1.PONY_TYPE, id: message.entityId, name: message.name };
        }
        if (gameUtils_1.isSelected(this.game, message.entityId)) {
            this.game.whisperTo = entity;
            chatBox.setChatType('whisper');
        }
        else {
            this.game.select(entity);
        }
    }
    messageToFriend(chatBox, friend) {
        if (friend.entityId) {
            const entity = { id: friend.entityId, name: friend.actualName || 'unknown' };
            this.messageToPony(chatBox, entity);
        }
    }
    messageToPony(chatBox, pony) {
        setTimeout(() => {
            this.game.whisperTo = pony;
            chatBox.setChatType('whisper');
        });
    }
};
tslib_1.__decorate([
    core_1.ViewChild('announcer', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], App.prototype, "announcer", void 0);
tslib_1.__decorate([
    core_1.ViewChild('announcerText', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], App.prototype, "announcerText", void 0);
tslib_1.__decorate([
    core_1.ViewChild('reloadModal', { static: true }),
    tslib_1.__metadata("design:type", core_1.TemplateRef)
], App.prototype, "reloadModal", void 0);
tslib_1.__decorate([
    core_1.ViewChild('signInModal', { static: true }),
    tslib_1.__metadata("design:type", core_1.TemplateRef)
], App.prototype, "signInModal", void 0);
tslib_1.__decorate([
    core_1.HostListener('window:focus'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], App.prototype, "focus", null);
App = tslib_1.__decorate([
    core_1.Component({
        selector: 'pony-town-app',
        templateUrl: 'app.pug',
        styleUrls: ['app.scss'],
        providers: [
            { provide: tooltip_1.TooltipConfig, useFactory: tooltipConfig },
            { provide: popover_1.PopoverConfig, useFactory: popoverConfig },
        ]
    }),
    tslib_1.__metadata("design:paramtypes", [modal_1.BsModalService,
        gameService_1.GameService,
        model_1.Model,
        game_1.PonyTownGame,
        router_1.Router,
        router_1.ActivatedRoute,
        installService_1.InstallService,
        errorReporter_1.ErrorReporter])
], App);
exports.App = App;
//# sourceMappingURL=app.js.map