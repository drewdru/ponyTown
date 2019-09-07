"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminInterfaces_1 = require("../../../common/adminInterfaces");
const accountUtils_1 = require("../../../common/accountUtils");
const adminModel_1 = require("../../services/adminModel");
const icons_1 = require("../../../client/icons");
let AdminState = class AdminState {
    constructor(model) {
        this.model = model;
        this.cogIcon = icons_1.faCog;
        this.optionsIcon = icons_1.faSlidersH;
        this.loginOptions = adminInterfaces_1.LOGIN_SERVER_SETTINGS;
        this.options = adminInterfaces_1.SERVER_SETTINGS;
        this.stats = new Map();
        this.statsTables = new Map();
        this.showSettings = {};
    }
    get state() {
        return this.model.state;
    }
    get loginServers() {
        return this.model.state.loginServers;
    }
    get servers() {
        return this.model.state.gameServers;
    }
    get isSuperadmin() {
        return accountUtils_1.hasRole(this.model.account, 'superadmin');
    }
    kickAll(server) {
        return this.model.kickAll(server.id);
    }
    updateLoginSetting(key, value) {
        return this.model.updateSettings({ [key]: value });
    }
    updateLoginSettings(state) {
        return this.model.updateSettings(state);
    }
    updateServerSetting(server, key, value) {
        return this.model.updateGameServerSettings(server.id, { [key]: value });
    }
    updateServerSettings(server, state) {
        return this.model.updateGameServerSettings(server.id, state);
    }
    // request stats
    fetchRequestStats() {
        this.model.getRequestStats()
            .then(stats => {
            this.requestStats = stats && stats.requests;
            this.userCounts = stats && stats.userCounts;
        });
    }
    resetRequestStats() {
        this.requestStats = undefined;
        this.userCounts = undefined;
    }
    // socket stats
    fetchStats(server) {
        return this.model.fetchServerStats(server.id)
            .then(stats => stats && this.stats.set(server.id, stats));
    }
    resetStats(server) {
        this.stats.delete(server.id);
    }
    getStats(server) {
        return this.stats.get(server.id);
    }
    // stats tables
    fetchCountryStats(server) {
        return this.fetchStatsTable(server, 0 /* Country */);
    }
    fetchSupportStats(server) {
        return this.fetchStatsTable(server, 1 /* Support */);
    }
    fetchMapStats(server) {
        return this.fetchStatsTable(server, 2 /* Maps */);
    }
    resetStatsTable(server) {
        this.statsTables.delete(server.id);
    }
    getStatsTable(server) {
        return this.statsTables.get(server.id);
    }
    fetchStatsTable(server, stats) {
        return this.model.fetchServerStatsTable(server.id, stats)
            .then(stats => stats && this.statsTables.set(server.id, stats));
    }
    // updates
    notifyOfUpdate(server = '*') {
        if (confirm('Are you sure?')) {
            this.model.notifyUpdate(server);
        }
    }
    shutdownServers(server = '*') {
        if (confirm('Are you sure?')) {
            this.model.shutdownServers(server);
        }
    }
    resetUpdating(server = '*') {
        this.model.resetUpdating(server);
    }
};
AdminState = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-state',
        templateUrl: 'admin-state.pug',
        styleUrls: ['admin-state.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AdminState);
exports.AdminState = AdminState;
//# sourceMappingURL=admin-state.js.map