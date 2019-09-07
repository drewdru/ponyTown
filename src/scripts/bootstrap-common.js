"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("focus-visible");
require("core-js/es");
require("core-js/stable/promise/finally");
require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");
require("zone.js/dist/long-stack-trace-zone");
require("canvas-toBlob");
require("./client/polyfils");
const core_1 = require("@angular/core");
if (document.body.getAttribute('data-debug') !== 'true' || localStorage.production) {
    core_1.enableProdMode();
}
if (typeof module !== 'undefined' && module.hot) {
    module.hot.accept();
}
//# sourceMappingURL=bootstrap-common.js.map