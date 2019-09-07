"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./bootstrap-common");
const platform_browser_dynamic_1 = require("@angular/platform-browser-dynamic");
const tools_module_1 = require("./components/tools/tools.module");
platform_browser_dynamic_1.platformBrowserDynamic().bootstrapModule(tools_module_1.ToolsAppModule, { preserveWhitespaces: true });
//# sourceMappingURL=bootstrap-tools.js.map