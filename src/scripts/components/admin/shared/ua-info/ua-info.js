"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const ua_parser_js_1 = require("ua-parser-js");
const icons_1 = require("../../../../client/icons");
function icon(value, defaultValue) {
    return value && icons_1.uaIcons[value] || defaultValue;
}
const extensions = {
    browser: [
        [/(Amigo|YaBrowser)\/([\w\.]+)/i], [ua_parser_js_1.UAParser.BROWSER.NAME, ua_parser_js_1.UAParser.BROWSER.VERSION]
    ],
};
let UAInfo = class UAInfo {
    set userAgent(value) {
        if (this._userAgent !== value) {
            this._userAgent = value;
            const parser = new ua_parser_js_1.UAParser(value, extensions);
            const { os, browser, device } = parser.getResult();
            this.osVersion = os.version;
            this.browserVersion = (browser.version || '').replace(/\..*$/, '');
            this.osClass = icon(os.name, icons_1.faQuestionCircle);
            this.browserClass = icon(browser.name, icons_1.faGlobe);
            this.deviceClass = icon(device.type, icons_1.faDesktop);
        }
    }
    get userAgent() {
        return this._userAgent;
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], UAInfo.prototype, "userAgent", null);
UAInfo = tslib_1.__decorate([
    core_1.Component({
        selector: 'ua-info',
        templateUrl: 'ua-info.pug',
        styles: [`:host { display: inline-block; }`],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    })
], UAInfo);
exports.UAInfo = UAInfo;
//# sourceMappingURL=ua-info.js.map