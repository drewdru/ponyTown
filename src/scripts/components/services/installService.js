"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const storageService_1 = require("./storageService");
let InstallService = class InstallService {
    constructor(storage) {
        this.storage = storage;
        if (!this.storage.getBoolean('install-dismissed')) {
            window.addEventListener('beforeinstallprompt', event => {
                event.preventDefault();
                this.installEvent = event;
            });
        }
    }
    get canInstall() {
        return !!this.installEvent || (DEVELOPMENT && localStorage.getItem('install'));
    }
    install() {
        if (!this.installEvent) {
            return Promise.reject(new Error('Cannot install'));
        }
        this.installEvent.prompt();
        return this.installEvent.userChoice
            .finally(() => {
            this.installEvent = undefined;
        });
    }
    dismiss() {
        this.installEvent = undefined;
        this.storage.setBoolean('install-dismissed', true);
    }
};
InstallService = tslib_1.__decorate([
    core_1.Injectable({
        providedIn: 'root',
    }),
    tslib_1.__metadata("design:paramtypes", [storageService_1.StorageService])
], InstallService);
exports.InstallService = InstallService;
//# sourceMappingURL=installService.js.map