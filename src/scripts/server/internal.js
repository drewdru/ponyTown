"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request-promise");
const lodash_1 = require("lodash");
const accountUtils_1 = require("../common/accountUtils");
const utils_1 = require("../common/utils");
const config_1 = require("./config");
const logger_1 = require("./logger");
const db_1 = require("./db");
const internal_1 = require("./api/internal");
const userError_1 = require("./userError");
// import { taskQueue } from './utils/taskQueue';
exports.serverStatus = {
    diskSpace: '',
    memoryUsage: '',
    certificateExpiration: '',
    lastPatreonUpdate: '',
};
exports.loginServers = [
    {
        id: 'login',
        state: {
            updating: false,
            dead: true,
        },
        api: createApi(config_1.config.local, 'api-internal-login', config_1.config.token),
    },
];
exports.adminServer = config_1.config.adminLocal && !config_1.args.admin ? {
    id: 'admin',
    api: createApi(config_1.config.adminLocal, 'api-internal-admin', config_1.config.token),
} : undefined;
exports.servers = [];
if (config_1.args.login || config_1.args.admin) {
    exports.servers.push(...config_1.gameServers.map(s => ({
        id: s.id,
        state: Object.assign({}, s, { offline: true, dead: true, maps: 0, online: 0, onMain: 0, queued: 0, shutdown: false, filter: false, settings: {} }),
        api: createApi(s.local, 'api-internal', config_1.config.token),
    })));
}
function findServer(id) {
    return utils_1.findById(exports.servers, id);
}
exports.findServer = findServer;
function getLoginServer(_id) {
    return exports.loginServers[0];
}
exports.getLoginServer = getLoginServer;
function getServer(id) {
    const server = findServer(id);
    if (!server) {
        throw new Error(`Invalid server ID (${id})`);
    }
    return server;
}
exports.getServer = getServer;
function createApi(host, url, apiToken) {
    return new Proxy({}, {
        get: (_, key) => (...args) => Promise.resolve(request(`http://${host}/${url}/api`, {
            json: true,
            headers: { 'api-token': apiToken },
            method: 'post',
            body: { method: key, args },
        })),
    });
}
exports.createApi = createApi;
function mapGameServers(action) {
    return Promise.all(exports.servers.filter(s => !s.state.dead).map(action));
}
function createJoin() {
    return join;
}
exports.createJoin = createJoin;
async function join(joinServer, account, character) {
    try {
        const kicked = await mapGameServers(s => {
            if (accountUtils_1.isMod(account) && s !== joinServer) {
                return false;
            }
            else {
                return s.api.kick(account._id.toString(), undefined).catch(e => (logger_1.logger.error(e), false));
            }
        });
        if (kicked.some(x => x)) {
            await utils_1.delay(2000);
        }
        return await joinServer.api.join(account._id.toString(), character._id.toString());
    }
    catch (error) {
        if (error.error && error.error.userError) {
            throw new userError_1.UserError(error.error.error);
        }
        else {
            logger_1.logger.error(error);
            throw new Error('Internal error');
        }
    }
}
let accountChangedHandler = (_accountId) => Promise.resolve();
function init(world, tokens) {
    accountChangedHandler = internal_1.createAccountChanged(world, tokens, db_1.findAccountSafe);
}
exports.init = init;
async function accountChanged(accountId) {
    if (config_1.args.login || config_1.args.admin) {
        await mapGameServers(s => {
            s.api.accountChanged(accountId).catch(lodash_1.noop);
        });
    }
    else {
        await accountChangedHandler(accountId);
    }
}
exports.accountChanged = accountChanged;
async function accountMerged(accountId, mergedId) {
    await mapGameServers(s => { s.api.accountMerged(accountId, mergedId).catch(lodash_1.noop); });
}
exports.accountMerged = accountMerged;
async function accountStatus(accountId) {
    const statuses = await mapGameServers(s => s.api.accountStatus(accountId).catch(() => ({ online: false })));
    return statuses.filter(s => !!s.online);
}
exports.accountStatus = accountStatus;
async function accountAround(accountId) {
    const users = await mapGameServers(s => s.api.accountAround(accountId).catch(() => []));
    return utils_1.flatten(users).sort((a, b) => a.distance - b.distance).slice(0, 10);
}
exports.accountAround = accountAround;
async function accountHidden(accountId) {
    const [users, permaHidden, permaHiddenBy] = await Promise.all([
        mapGameServers(s => s.api.accountHidden(accountId).catch(() => ({ account: '', hidden: [], hiddenBy: [] }))),
        db_1.findHideIds(accountId),
        db_1.findHideIdsRev(accountId),
    ]);
    return {
        account: accountId,
        hidden: lodash_1.uniq(lodash_1.flatMap(users, u => u.hidden)),
        hiddenBy: lodash_1.uniq(lodash_1.flatMap(users, u => u.hiddenBy)),
        permaHidden,
        permaHiddenBy,
    };
}
exports.accountHidden = accountHidden;
exports.createRemovedDocument = (endPoints, adminService) => (model, id) => {
    endPoints && model in endPoints && endPoints[model].removedItem(id);
    adminService && adminService.removedItem(model, id);
    return exports.adminServer ? exports.adminServer.api.removedDocument(model, id).catch(lodash_1.noop) : Promise.resolve();
};
//# sourceMappingURL=internal.js.map