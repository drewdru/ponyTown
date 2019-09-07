"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const icons_1 = require("../../../client/icons");
const installService_1 = require("../../services/installService");
const data_1 = require("../../../client/data");
let InstallButton = class InstallButton {
    constructor(installService) {
        this.installService = installService;
        this.closeIcon = icons_1.faTimes;
    }
    get canInstall() {
        return this.installService.canInstall;
    }
    get isMobile() {
        return data_1.isMobile;
    }
    install() {
        this.installService.install();
    }
    dismiss() {
        this.installService.dismiss();
    }
};
InstallButton = tslib_1.__decorate([
    core_1.Component({
        selector: 'install-button',
        templateUrl: 'install-button.pug',
        styleUrls: ['install-button.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [installService_1.InstallService])
], InstallButton);
exports.InstallButton = InstallButton;
//# sourceMappingURL=install-button.js.map