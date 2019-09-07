"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const adminModel_1 = require("../../services/adminModel");
let AdminOriginDetails = class AdminOriginDetails {
    constructor(route, model) {
        this.route = route;
        this.model = model;
        this.accounts = [];
    }
    get whoisHref() {
        return `http://whois.urih.com/record/${this.ip}/`;
    }
    ngOnInit() {
        this.route.params.forEach(p => {
            this.ip = p['ip'];
            this.update();
        });
    }
    update() {
        this.accounts = [];
        if (this.model.connected && this.ip) {
            this.model.getAccountsByOrigin(this.ip)
                .then(accounts => this.accounts = accounts || []);
            this.events = this.model.events
                .filter(e => e.origin && e.origin.ip === this.ip)
                .slice(0, 20);
        }
    }
};
AdminOriginDetails = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-origin-details',
        templateUrl: 'admin-origin-details.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [router_1.ActivatedRoute, adminModel_1.AdminModel])
], AdminOriginDetails);
exports.AdminOriginDetails = AdminOriginDetails;
//# sourceMappingURL=admin-origin-details.js.map