"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./bootstrap-common");
const platform_browser_dynamic_1 = require("@angular/platform-browser-dynamic");
const app_module_1 = require("./components/app/app.module");
const data_1 = require("./client/data");
if (DEVELOPMENT || data_1.local || data_1.host === `${location.protocol}//${location.host}/`) {
    if (window.opener && window.opener.postMessage && window.URL) {
        const path = location.href.replace(data_1.host, '');
        window.opener.postMessage({ type: 'loaded-page', path }, '*');
    }
    platform_browser_dynamic_1.platformBrowserDynamic().bootstrapModule(app_module_1.AppModule, { preserveWhitespaces: true });
}
//# sourceMappingURL=bootstrap.js.map