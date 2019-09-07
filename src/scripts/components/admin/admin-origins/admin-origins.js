"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const icons_1 = require("../../../client/icons");
const adminModel_1 = require("../../services/adminModel");
let AdminOrigins = class AdminOrigins {
    constructor(model) {
        this.model = model;
        this.syncIcon = icons_1.faSync;
        this.eraserIcon = icons_1.faEraser;
        this.clockIcon = icons_1.faClock;
        this.userIcon = icons_1.faUser;
        this.chevronDownIcon = icons_1.faChevronDown;
        this.spinnerIcon = icons_1.faSpinner;
        this.requestStats = [];
        this.pending = false;
    }
    ngOnInit() {
        if (this.model.connected) {
            this.update();
        }
    }
    update() {
        this.model.getOriginStats().then(stats => this.stats = stats);
        this.model.getOtherStats().then(stats => this.other = stats);
    }
    clear(count, andHigher = false) {
        this.clearAll(count, andHigher, true, true, false);
    }
    clearOld(count) {
        this.clearAll(count, true, true, false, false);
    }
    clearSingles(count) {
        this.clearAll(count, true, false, true, false);
    }
    clearTo10(count) {
        this.clearAll(count, true, false, true, true);
    }
    clearAll(count, andHigher, old, singles, trim) {
        this.pending = true;
        return this.model.clearOrigins(count, andHigher, { old, singles, trim })
            .finally(() => {
            this.pending = false;
            this.update();
        });
    }
};
AdminOrigins = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-origins',
        templateUrl: 'admin-origins.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AdminOrigins);
exports.AdminOrigins = AdminOrigins;
//# sourceMappingURL=admin-origins.js.map