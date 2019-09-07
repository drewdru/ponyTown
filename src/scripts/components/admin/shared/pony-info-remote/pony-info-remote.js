"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminModel_1 = require("../../../services/adminModel");
let PonyInfoRemote = class PonyInfoRemote {
    constructor(model) {
        this.model = model;
        this.highlight = false;
        this.showName = false;
    }
    get ponyId() {
        return this._ponyId;
    }
    set ponyId(value) {
        if (this.ponyId !== value) {
            this._ponyId = value;
            this.pony = undefined;
            this.subscription && this.subscription.unsubscribe();
            this.subscription = value ? this.model.ponies.subscribe(value, pony => this.pony = pony) : undefined;
        }
    }
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PonyInfoRemote.prototype, "highlight", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PonyInfoRemote.prototype, "showName", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], PonyInfoRemote.prototype, "ponyId", null);
PonyInfoRemote = tslib_1.__decorate([
    core_1.Component({
        selector: 'pony-info-remote',
        templateUrl: 'pony-info-remote.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], PonyInfoRemote);
exports.PonyInfoRemote = PonyInfoRemote;
//# sourceMappingURL=pony-info-remote.js.map