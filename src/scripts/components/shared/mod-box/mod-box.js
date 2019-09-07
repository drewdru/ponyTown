"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const constants_1 = require("../../../common/constants");
const model_1 = require("../../services/model");
const game_1 = require("../../../client/game");
const icons_1 = require("../../../client/icons");
const ageLabels = ['', 'M', 'A', '', '', '[M]', '[A]'];
const ageTitles = ['Not set', 'Minor', 'Adult', '', '', 'Minor (locked)', 'Adult (locked)'];
let ModBox = class ModBox {
    constructor(model, game) {
        this.model = model;
        this.game = game;
        this.flagIcon = icons_1.faFlag;
        this.noteIcon = icons_1.faStickyNote;
        this.muteIcon = icons_1.faMicrophoneSlash;
        this.hideIcon = icons_1.faEyeSlash;
        this.moreIcon = icons_1.faUserCog;
        this.dangerIcon = icons_1.faExclamationCircle;
        this.timeouts = constants_1.TIMEOUTS;
        this.isNoteOpen = false;
    }
    get ageLabel() {
        return ageLabels[this.modInfo && this.modInfo.age || 0];
    }
    get ageTitle() {
        return ageTitles[this.modInfo && this.modInfo.age || 0];
    }
    get modInfo() {
        return this.pony.modInfo;
    }
    get account() {
        return this.modInfo && this.modInfo.account;
    }
    get country() {
        return this.modInfo && this.modInfo.country;
    }
    get mute() {
        return this.modInfo && this.modInfo.mute;
    }
    get muteTooltip() {
        return this.mute ? (this.mute === 'perma' ? 'Permanently Muted' : `Muted for ${this.mute}`) : 'Mute';
    }
    get shadow() {
        return this.modInfo && this.modInfo.shadow;
    }
    get shadowTooltip() {
        return this.shadow ? (this.shadow === 'perma' ? 'Permanently Shadowed' : `Shadowed for ${this.shadow}`) : 'Shadow';
    }
    get counters() {
        return this.modInfo && this.modInfo.counters;
    }
    get hasCounters() {
        const counters = this.counters;
        return counters && (counters.spam || counters.swears || counters.timeouts);
    }
    get check() {
        return this.model.modCheck;
    }
    get note() {
        return this.modInfo && this.modInfo.note;
    }
    set note(value) {
        if (this.modInfo) {
            this.modInfo.note = value;
        }
    }
    ngOnDestroy() {
        if (this.isNoteOpen) {
            this.blur();
        }
    }
    className(value) {
        return value ? (value === 'perma' ? 'btn-danger' : 'btn-warning') : 'btn-default';
    }
    report() {
        this.modAction(1 /* Report */);
    }
    setMute(value) {
        this.modAction(2 /* Mute */, value);
    }
    setShadow(value) {
        this.modAction(3 /* Shadow */, value);
    }
    blur() {
        this.game.send(server => server.setNote(this.pony.id, this.modInfo && this.modInfo.note || ''));
        this.isNoteOpen = false;
    }
    modAction(type, param = 0) {
        return this.game.send(server => server.otherAction(this.pony.id, type, param));
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], ModBox.prototype, "pony", void 0);
ModBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'mod-box',
        templateUrl: 'mod-box.pug',
        styleUrls: ['mod-box.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model, game_1.PonyTownGame])
], ModBox);
exports.ModBox = ModBox;
//# sourceMappingURL=mod-box.js.map