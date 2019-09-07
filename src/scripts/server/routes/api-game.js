"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requestUtils_1 = require("../requestUtils");
const game_1 = require("../api/game");
const internal_1 = require("../internal");
const db_1 = require("../db");
const internal_2 = require("../internal");
const originUtils_1 = require("../originUtils");
function default_1(server, settings, config) {
    const offline = requestUtils_1.offline(settings);
    const validAccount = requestUtils_1.validAccount(server);
    const join = internal_2.createJoin();
    const app = express_1.Router();
    let inQueue = 0;
    const joinGame = game_1.createJoinGame(internal_1.findServer, config, db_1.findCharacter, join, originUtils_1.addOrigin, db_1.hasActiveSupporterInvites);
    app.post('/game/join', offline, requestUtils_1.limit(60, 5 * 60), requestUtils_1.hash, validAccount, requestUtils_1.wrap(server, async (req) => {
        if (inQueue > 100) {
            return {};
        }
        else {
            try {
                inQueue++;
                const { ponyId, serverId, version, url, alert } = req.body;
                return await joinGame(req.user, ponyId, serverId, version, url, alert, originUtils_1.getOrigin(req));
            }
            finally {
                inQueue--;
            }
        }
    }));
    return app;
}
exports.default = default_1;
//# sourceMappingURL=api-game.js.map