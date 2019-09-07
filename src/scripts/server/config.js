"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = require("yargs");
exports.args = yargs_1.argv;
_a = require('../../../package.json'), exports.version = _a.version, exports.description = _a.description;
exports.config = require('../../../config.json');
const loginServer = { id: 'login', filter: false, port: exports.config.port };
const adminServer = { id: 'admin', filter: false, port: exports.config.adminPort || exports.config.port };
exports.gameServers = exports.config.servers.filter(s => !s.hidden);
const allServers = [...exports.gameServers, loginServer, adminServer];
allServers.forEach(s => s.flags = s.flags || {});
const serverId = exports.args.game || (exports.args.login ? 'login' : (exports.args.admin ? 'admin' : allServers[0].id));
exports.server = allServers.find(s => s.id === serverId) || allServers[0];
exports.port = (exports.args.port && parseInt(exports.args.port, 10)) || exports.server.port || exports.config.port;
//# sourceMappingURL=config.js.map