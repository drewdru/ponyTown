"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const constants_1 = require("../../../common/constants");
const errors_1 = require("../../../common/errors");
const gameService_1 = require("../../services/gameService");
const model_1 = require("../../services/model");
const dropdown_1 = require("../directives/dropdown");
const icons_1 = require("../../../client/icons");
const htmlUtils_1 = require("../../../client/htmlUtils");
const utils_1 = require("../../../common/utils");
const data_1 = require("../../../client/data");
let CharacterSelect = class CharacterSelect {
    constructor(element, router, model, gameService) {
        this.element = element;
        this.router = router;
        this.model = model;
        this.gameService = gameService;
        this.maxNameLength = constants_1.PLAYER_NAME_MAX_LENGTH;
        this.spinnerIcon = icons_1.faSpinner;
        this.deleteIcon = icons_1.faTrash;
        this.removeIcon = icons_1.faTimes;
        this.confirmIcon = icons_1.faCheck;
        this.newButton = false;
        this.editButton = false;
        this.removeButton = false;
        this.errorChange = new core_1.EventEmitter();
        this.change = new core_1.EventEmitter();
        this.preview = new core_1.EventEmitter();
        this.removing = false;
        this.locked = false; // TEMP: move to model
    }
    get joining() {
        return this.gameService.joining;
    }
    get pony() {
        return this.model.pony;
    }
    get canNew() {
        return !this.joining && this.model.account && this.model.account.characterCount < this.model.characterLimit;
    }
    get canEdit() {
        return !this.joining;
    }
    get canRemove() {
        return !this.joining && !this.locked && !this.model.pending && !!this.pony
            && !!this.pony.id && this.error !== errors_1.VERSION_ERROR;
    }
    get hasPonies() {
        return !!this.model.ponies.length;
    }
    select(pony) {
        if (pony) {
            this.removing = false;
            this.model.selectPony(pony);
            this.change.emit(pony);
            this.preview.emit(undefined);
        }
        this.dropdown.close();
        this.focusName();
    }
    createNew() {
        if (this.canNew) {
            this.removing = false;
            this.model.selectPony(model_1.createDefaultPonyObject());
            this.change.emit(this.pony);
            this.router.navigate(['/character']);
            this.focusName();
        }
    }
    edit() {
        if (this.canEdit) {
            this.removing = false;
            this.router.navigate(['/character']);
        }
    }
    remove() {
        if (this.canRemove) {
            this.removing = true;
            htmlUtils_1.focusElementAfterTimeout(this.element.nativeElement, '.cancel-remove-button');
        }
    }
    cancelRemove() {
        this.removing = false;
        htmlUtils_1.focusElementAfterTimeout(this.element.nativeElement, '.remove-button');
    }
    confirmRemove() {
        if (this.canRemove) {
            this.setError(undefined);
            this.removing = false;
            this.locked = true;
            this.model.removePony(this.pony)
                .then(() => this.change.emit(this.pony))
                .catch((e) => this.setError(e.message))
                .then(() => this.ariaAnnounce.nativeElement.textContent = 'Character removed')
                .then(() => utils_1.delay(2000))
                .then(() => this.locked = false)
                .then(() => this.focusName());
        }
    }
    onToggle(show) {
        if (!show) {
            this.preview.emit(undefined);
        }
    }
    focusName() {
        if (!data_1.isMobile) {
            this.nameInput.nativeElement.focus();
        }
    }
    setError(error) {
        this.error = error;
        this.errorChange.emit(error);
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterSelect.prototype, "newButton", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterSelect.prototype, "editButton", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], CharacterSelect.prototype, "removeButton", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], CharacterSelect.prototype, "error", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], CharacterSelect.prototype, "errorChange", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], CharacterSelect.prototype, "change", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], CharacterSelect.prototype, "preview", void 0);
tslib_1.__decorate([
    core_1.ViewChild('nameInput', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], CharacterSelect.prototype, "nameInput", void 0);
tslib_1.__decorate([
    core_1.ViewChild('ariaAnnounce', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], CharacterSelect.prototype, "ariaAnnounce", void 0);
tslib_1.__decorate([
    core_1.ViewChild('dropdown', { static: true }),
    tslib_1.__metadata("design:type", dropdown_1.Dropdown)
], CharacterSelect.prototype, "dropdown", void 0);
CharacterSelect = tslib_1.__decorate([
    core_1.Component({
        selector: 'character-select',
        templateUrl: 'character-select.pug',
        styleUrls: ['character-select.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.ElementRef,
        router_1.Router,
        model_1.Model,
        gameService_1.GameService])
], CharacterSelect);
exports.CharacterSelect = CharacterSelect;
//# sourceMappingURL=character-select.js.map