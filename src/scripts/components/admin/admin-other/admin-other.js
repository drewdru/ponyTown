"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const adminModel_1 = require("../../services/adminModel");
const htmlUtils_1 = require("../../../client/htmlUtils");
let AdminOther = class AdminOther {
    constructor(model) {
        this.model = model;
        this.fields = [
            { key: 'suspiciousNames', title: 'Suspicious pony names & emails to report', value: undefined },
            { key: 'suspiciousAuths', title: 'Suspicious auths to report', value: undefined },
            { key: 'suspiciousMessages', title: 'Suspicious messages to report (instant)', value: undefined },
            { key: 'suspiciousSafeMessages', title: 'Suspicious messages to report (safe only) (5+)', value: undefined },
            { key: 'suspiciousSafeWholeMessages', title: 'Suspicious messages to report (safe only) (5+) (whole words)', value: undefined },
            { key: 'suspiciousSafeInstantMessages', title: 'Suspicious messages to report (safe only) (instant)', value: undefined },
            {
                key: 'suspiciousSafeInstantWholeMessages',
                title: 'Suspicious messages to report (safe only) (whole words) (instant)',
                value: undefined
            },
        ];
        this.max = 100;
        this.value = 0;
        this.succeeded = false;
    }
    ngOnInit() {
        this.model.accountPromise.then(() => {
            this.resetFields();
            this.resetSuspiciousPonies();
        });
    }
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
    }
    saveFields() {
        let settings = {};
        this.fields.forEach(field => settings[field.key] = field.value);
        this.model.updateSettings(settings);
    }
    resetFields() {
        this.fields.map(field => {
            field.value = this.model.state.loginServers[0][field.key];
        });
    }
    saveSuspiciousPonies() {
        this.suspiciousPoniesError = undefined;
        try {
            lodash_1.compact(this.suspiciousPonies.split(/\n/g).map(x => x.trim())).map(x => JSON.parse(x));
            this.model.updateSettings({ suspiciousPonies: this.suspiciousPonies });
        }
        catch (e) {
            this.suspiciousPoniesError = e.message;
        }
    }
    resetSuspiciousPonies() {
        this.suspiciousPonies = this.model.state.loginServers[0].suspiciousPonies;
    }
    updatePatreon() {
        this.model.server.updatePatreon();
    }
    updatePatreonToken(patreonToken) {
        this.model.updateSettings({ patreonToken });
    }
    getLastPatreonData() {
        this.model.getLastPatreonData()
            .then(data => {
            htmlUtils_1.showTextInNewTab(JSON.stringify(data, null, 2));
        });
    }
    updatePastSupporters() {
        this.model.updatePastSupporters();
    }
};
AdminOther = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-other',
        templateUrl: 'admin-other.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AdminOther);
exports.AdminOther = AdminOther;
//# sourceMappingURL=admin-other.js.map