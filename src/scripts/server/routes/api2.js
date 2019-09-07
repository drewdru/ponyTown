"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requestUtils_1 = require("../requestUtils");
const internal_1 = require("../internal");
const config_1 = require("../config");
const serverUtils_1 = require("../serverUtils");
const constants_1 = require("../../common/constants");
function isServerSafe(server) {
    return server.state.alert !== '18+';
}
function toServerState(server) {
    const { name, path, desc, flag, alert, online, settings, require, host } = server.state;
    return {
        id: server.id,
        name,
        path,
        desc,
        host,
        flag,
        alert,
        dead: false,
        online,
        offline: serverUtils_1.isServerOffline(server),
        filter: !!settings.filterSwears,
        require,
    };
}
function toServerStateShort(server) {
    return {
        id: server.id,
        online: server.state.online,
        offline: serverUtils_1.isServerOffline(server),
    };
}
function getGameStatus(servers, live, short, age) {
    const adult = age >= constants_1.MIN_ADULT_AGE;
    return {
        version: config_1.version,
        update: live.updating ? true : undefined,
        servers: servers
            .filter(s => isServerSafe(s) || adult)
            .map(short ? toServerStateShort : toServerState),
    };
}
function default_1(settings, live, statsTracker) {
    const app = express_1.Router();
    app.get('/game/status', requestUtils_1.offline(settings), (req, res) => {
        const status = getGameStatus(internal_1.servers, live, req.query.short === 'true', req.query.d | 0);
        res.json(status);
        statsTracker.logRequest(req, status);
    });
    app.post('/csp', requestUtils_1.offline(settings), (_, res) => {
        //logger.warn('CSP report', getIPFromRequest(req), req.body['csp-report']);
        res.sendStatus(200);
    });
    return app;
}
exports.default = default_1;
//# sourceMappingURL=api2.js.map