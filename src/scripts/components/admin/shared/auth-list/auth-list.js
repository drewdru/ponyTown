"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let AuthList = class AuthList {
    constructor() {
        this.limit = 6;
        this.extended = false;
    }
    get fixedAuths() {
        return this.auths || [];
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AuthList.prototype, "limit", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AuthList.prototype, "extended", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], AuthList.prototype, "auths", void 0);
AuthList = tslib_1.__decorate([
    core_1.Component({
        selector: 'auth-list',
        templateUrl: 'auth-list.pug',
        styleUrls: ['auth-list.scss'],
        host: {
            '[class.extended]': 'extended',
        },
    })
], AuthList);
exports.AuthList = AuthList;
//# sourceMappingURL=auth-list.js.map