"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
const icons_1 = require("../../../../client/icons");
let PonyListRemote = class PonyListRemote {
    constructor(model) {
        this.model = model;
        this.trashIcon = icons_1.faTrash;
        this.assignIcon = icons_1.faArrowRight;
        this.limit = 10;
        this.expanded = false;
        this.deletable = false;
        this.highlight = () => false;
        this.full = false;
        this.ponies = [];
        this.loading = false;
        this.ponyInfos = [];
    }
    get limitTo() {
        return this.full ? 999999 : this.limit;
    }
    get accountId() {
        return this._accountId;
    }
    set accountId(value) {
        if (this.accountId !== value) {
            this._accountId = value;
            this.ponies = [];
            this.ponyInfos = [];
            this.loading = true;
            this.subscription && this.subscription.unsubscribe();
            this.subscription = value ? this.model.accountPonies.subscribe(value, (x = []) => {
                this.ponyInfos = x;
                this.updatePonies();
                this.loading = false;
            }) : undefined;
        }
    }
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
    }
    remove(characterId) {
        if (confirm('Are you sure?')) {
            this.model.removePony(characterId);
        }
    }
    toggleFull() {
        this.full = !this.full;
        this.updatePonies();
    }
    assignTo(pony, account) {
        this.model.assignPony(pony, account);
    }
    updatePonies() {
        const compare = this.full ? compareNames : compareDates;
        this.ponies = this.ponyInfos.sort(compare).map(p => p.id);
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PonyListRemote.prototype, "limit", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PonyListRemote.prototype, "expanded", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PonyListRemote.prototype, "deletable", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Function)
], PonyListRemote.prototype, "highlight", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], PonyListRemote.prototype, "duplicates", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], PonyListRemote.prototype, "accountId", null);
PonyListRemote = tslib_1.__decorate([
    core_1.Component({
        selector: 'pony-list-remote',
        templateUrl: 'pony-list-remote.pug',
        styleUrls: ['pony-list-remote.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], PonyListRemote);
exports.PonyListRemote = PonyListRemote;
function compareNames(a, b) {
    return a.name.localeCompare(b.name);
}
exports.compareNames = compareNames;
function compareDates(a, b) {
    return b.date - a.date;
}
exports.compareDates = compareDates;
//# sourceMappingURL=pony-list-remote.js.map