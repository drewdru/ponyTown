"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requestUtils_1 = require("../requestUtils");
const api_account_1 = require("./api-account");
const api_pony_1 = require("./api-pony");
const api_game_1 = require("./api-game");
function default_1(server, settings, config, removedDocument) {
    const app = express_1.Router();
    app.use(requestUtils_1.auth);
    app.use(api_account_1.default(server, settings));
    app.use(api_pony_1.default(server, settings, removedDocument));
    app.use(api_game_1.default(server, settings, config));
    return app;
}
exports.default = default_1;
//# sourceMappingURL=api.js.map