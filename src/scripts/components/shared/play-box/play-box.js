"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const utils_1 = require("../../../common/utils");
const errors_1 = require("../../../common/errors");
const data_1 = require("../../../client/data");
const gameService_1 = require("../../services/gameService");
const model_1 = require("../../services/model");
const icons_1 = require("../../../client/icons");
const clientUtils_1 = require("../../../client/clientUtils");
const spriteUtils_1 = require("../../../client/spriteUtils");
const storageService_1 = require("../../services/storageService");
const errorReporter_1 = require("../../services/errorReporter");
const constants_1 = require("../../../common/constants");
const ignoredErrors = [
    errors_1.WEBGL_CREATION_ERROR,
    errors_1.BROWSER_NOT_SUPPORTED_ERROR,
    errors_1.NAME_ERROR,
    errors_1.OFFLINE_ERROR,
    errors_1.VERSION_ERROR,
    errors_1.ACCESS_ERROR,
    errors_1.PROTECTION_ERROR,
    errors_1.NOT_AUTHENTICATED_ERROR,
    errors_1.CHARACTER_LIMIT_ERROR,
    'Saving in progress',
];
let PlayBox = class PlayBox {
    constructor(gameService, model, storage, errorReporter) {
        this.gameService = gameService;
        this.model = model;
        this.storage = storage;
        this.errorReporter = errorReporter;
        this.spinnerIcon = icons_1.faSpinner;
        this.warningIcon = icons_1.faExclamationCircle;
        this.infoIcon = icons_1.faInfoCircle;
        this.requestBirthdate = constants_1.REQUEST_DATE_OF_BIRTH;
        this.errorChange = new core_1.EventEmitter();
        this.joining = false;
        this.failedToLoadImages = false;
        this.birthdate = '';
        this.birthdateSet = false;
        this.locked = false;
    }
    get error() {
        return this.gameService.error;
    }
    set error(value) {
        if (this.gameService) {
            this.gameService.error = value;
            this.errorChange.emit(value);
        }
    }
    get server() {
        return this.gameService.server;
    }
    set server(value) {
        this.gameService.server = value;
    }
    get servers() {
        return this.gameService.servers;
    }
    get offline() {
        return this.gameService.offline;
    }
    get updateWarning() {
        return this.gameService.updateWarning;
    }
    get invalidVersion() {
        return !!(this.gameService.versionError || this.error === errors_1.VERSION_ERROR
            || (this.gameService.version && this.gameService.version !== data_1.version));
    }
    get protectionError() {
        return this.gameService.protectionError || this.error === errors_1.PROTECTION_ERROR;
    }
    get canPlay() {
        return !!this.server && this.gameService.canPlay && !this.locked && !this.invalidVersion && !this.failedToLoadImages;
    }
    get isAccessError() {
        return this.error === errors_1.ACCESS_ERROR || this.error === errors_1.ACCOUNT_ERROR;
    }
    get isWebGLError() {
        return this.error === errors_1.WEBGL_CREATION_ERROR;
    }
    get isBrowserError() {
        return this.error === errors_1.BROWSER_NOT_SUPPORTED_ERROR;
    }
    get isOtherError() {
        return !!this.error && !this.invalidVersion && !this.isAccessError && !this.isWebGLError && !this.isBrowserError;
    }
    get ponyLimit() {
        return this.model.characterLimit;
    }
    get hasTooManyPonies() {
        return this.model.ponies.length > this.ponyLimit;
    }
    get isMarkedForMultiples() {
        const account = this.model.account;
        return !!account && utils_1.hasFlag(account.flags, 1 /* Duplicates */);
    }
    get isAndroidBrowser() {
        return clientUtils_1.isAndroidBrowser;
    }
    get isBrowserOutdated() {
        return !clientUtils_1.isAndroidBrowser && clientUtils_1.isBrowserOutdated && !this.storage.getBoolean('dismiss-outdated-browser');
    }
    get leftMessage() {
        return this.gameService.leftMessage;
    }
    get accountAlert() {
        return this.model.accountAlert;
    }
    ngOnInit() {
        spriteUtils_1.loadAndInitSpriteSheets()
            .then(loaded => this.failedToLoadImages = !loaded);
    }
    play() {
        if (this.canPlay) {
            this.joining = true;
            this.locked = true;
            this.error = undefined;
            const delayTime = (!DEVELOPMENT && this.gameService.wasPlaying) ? 1500 : 10;
            utils_1.delay(delayTime) // delay joing if user reloaded the game instead of leaving cleanly
                .then(() => this.model.savePony(this.model.pony))
                .then(pony => this.joining ? this.gameService.join(pony.id) : Promise.resolve())
                .catch((e) => {
                if (!/^Cancelled/.test(e.message)) {
                    this.error = e.message;
                    if (!utils_1.includes(ignoredErrors, e.message) && !/shader/.test(e.message)) {
                        this.errorReporter.reportError(e, { status: e.status, text: e.text });
                    }
                    DEVELOPMENT && console.error(e);
                }
            })
                .finally(() => this.joining = false)
                .then(() => utils_1.delay(1500))
                .finally(() => this.locked = false);
        }
    }
    cancel() {
        this.gameService.leave('Cancelled joining');
    }
    reload() {
        location.reload(true);
    }
    hardReload() {
        clientUtils_1.hardReload();
    }
    hasFlag(server) {
        return server.countryFlags && server.countryFlags.length;
    }
    getIcon(server) {
        switch (server.flag) {
            case 'star': return icons_1.faStar;
            case 'test': return icons_1.faWrench;
            default: return icons_1.faGlobe;
        }
    }
    dismissOutdatedBrowser() {
        this.storage.setBoolean('dismiss-outdated-browser', true);
    }
    saveBirthdate() {
        if (this.birthdate) {
            this.model.updateAccount({ birthdate: this.birthdate });
            this.birthdateSet = true;
        }
    }
};
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], PlayBox.prototype, "errorChange", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], PlayBox.prototype, "label", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], PlayBox.prototype, "error", null);
PlayBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'play-box',
        templateUrl: 'play-box.pug',
        styleUrls: ['play-box.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [gameService_1.GameService,
        model_1.Model,
        storageService_1.StorageService,
        errorReporter_1.ErrorReporter])
], PlayBox);
exports.PlayBox = PlayBox;
//# sourceMappingURL=play-box.js.map