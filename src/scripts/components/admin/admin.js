"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const tooltip_1 = require("ngx-bootstrap/tooltip");
const popover_1 = require("ngx-bootstrap/popover");
const accountUtils_1 = require("../../common/accountUtils");
const adminModel_1 = require("../services/adminModel");
const icons_1 = require("../../client/icons");
function tooltipConfig() {
    return Object.assign(new tooltip_1.TooltipConfig(), { container: 'body' });
}
exports.tooltipConfig = tooltipConfig;
function popoverConfig() {
    return Object.assign(new popover_1.PopoverConfig(), { container: 'body' });
}
exports.popoverConfig = popoverConfig;
let AdminApp = class AdminApp {
    constructor(model, router) {
        this.model = model;
        this.router = router;
        this.spinnerIcon = icons_1.faSpinner;
        this.stateIcon = icons_1.faSlidersH;
        this.eventsIcon = icons_1.faExclamationCircle;
        this.accountsIcon = icons_1.faUsers;
        this.poniesIcon = icons_1.faHorseHead;
        this.originsIcon = icons_1.faMapMarkerAlt;
        this.reportsIcon = icons_1.faChartPie;
        this.otherIcon = icons_1.faCog;
    }
    get loading() {
        if (!this.model.initialized) {
            return 'Initializing';
        }
        else if (!this.model.connected) {
            return 'Connecting';
        }
        else if (!this.model.loaded) {
            return 'Loading';
        }
        else {
            return '';
        }
    }
    get clients() {
        return this.model.state.gameServers.reduce((sum, s) => sum + s.online, 0);
    }
    get events() {
        return this.model.events.length;
    }
    get accounts() {
        return this.model.counts.accounts;
    }
    get ponies() {
        return this.model.counts.characters;
    }
    get origins() {
        return this.model.counts.origins;
    }
    get isSuperadmin() {
        return accountUtils_1.hasRole(this.model.account, 'superadmin');
    }
    goToAccount({ detail }) {
        this.router.navigate(['/accounts', detail]);
    }
    signOut() {
        window.location.href = '/';
    }
};
tslib_1.__decorate([
    core_1.HostListener('window:go-to-account', ['$event']),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [CustomEvent]),
    tslib_1.__metadata("design:returntype", void 0)
], AdminApp.prototype, "goToAccount", null);
AdminApp = tslib_1.__decorate([
    core_1.Component({
        selector: 'pony-town-app',
        templateUrl: 'admin.pug',
        styleUrls: ['admin.scss'],
        providers: [
            { provide: tooltip_1.TooltipConfig, useFactory: tooltipConfig },
            { provide: popover_1.PopoverConfig, useFactory: popoverConfig },
        ]
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel, router_1.Router])
], AdminApp);
exports.AdminApp = AdminApp;
//# sourceMappingURL=admin.js.map