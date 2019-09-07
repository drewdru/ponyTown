"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const storageService_1 = require("./storageService");
const model_1 = require("./model");
let SettingsService = class SettingsService {
    constructor(storage, model) {
        this.storage = storage;
        this.model = model;
        this.save = () => false;
        this.browser = this.storage.getJSON('browser-settings', {});
    }
    get account() {
        return this.model.account ? this.model.account.settings : {};
    }
    set account(value) {
        if (this.model.account) {
            this.model.account.settings = value;
        }
    }
    saving(save) {
        this.save = save;
    }
    saveAccountSettings(settings) {
        if (this.model.account) {
            this.model.account.settings = settings;
        }
        if (settings.filterWords) {
            settings.filterWords = settings.filterWords.trim();
        }
        if (this.save(settings)) {
            return Promise.resolve();
        }
        else {
            return this.model.saveSettings(settings);
        }
    }
    saveBrowserSettings(settings) {
        this.browser = settings || this.browser;
        this.storage.setJSON('browser-settings', this.browser);
    }
};
SettingsService = tslib_1.__decorate([
    core_1.Injectable({ providedIn: 'root' }),
    tslib_1.__metadata("design:paramtypes", [storageService_1.StorageService, model_1.Model])
], SettingsService);
exports.SettingsService = SettingsService;
//# sourceMappingURL=settingsService.js.map