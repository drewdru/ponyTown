"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./bootstrap-common");
const platform_browser_dynamic_1 = require("@angular/platform-browser-dynamic");
const admin_module_1 = require("./components/admin/admin.module");
platform_browser_dynamic_1.platformBrowserDynamic().bootstrapModule(admin_module_1.AdminAppModule, { preserveWhitespaces: true });
//# sourceMappingURL=bootstrap-admin.js.map