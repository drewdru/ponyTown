"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
let EmailList = class EmailList {
    constructor() {
        this.limit = 3;
    }
    get hasMore() {
        return this.emails && this.emails.length > this.limit;
    }
    showMore() {
        this.limit = 9999;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], EmailList.prototype, "emails", void 0);
EmailList = tslib_1.__decorate([
    core_1.Component({
        selector: 'email-list',
        templateUrl: 'email-list.pug',
    })
], EmailList);
exports.EmailList = EmailList;
//# sourceMappingURL=email-list.js.map