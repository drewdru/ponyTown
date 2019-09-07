"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const adminUtils_1 = require("../../common/adminUtils");
const db_1 = require("../db");
const world_1 = require("../world");
const hiding_1 = require("../services/hiding");
const accountUtils_1 = require("../../common/accountUtils");
const internal_common_1 = require("./internal-common");
const userError_1 = require("../userError");
const liveSettings_1 = require("../liveSettings");
const utils_1 = require("../../common/utils");
const timing_1 = require("../timing");
const lodash_1 = require("lodash");
const serverMap_1 = require("../serverMap");
const playerUtils_1 = require("../playerUtils");
exports.createAccountChanged = (world, tokens, findAccount) => async (accountId) => {
    const account = await findAccount(accountId);
    world.accountUpdated(account);
    if (adminUtils_1.isBanned(account)) {
        tokens.clearTokensForAccount(accountId);
    }
};
exports.createAccountMerged = (hiding) => async (accountId, mergedId) => await hiding.merged(accountId, mergedId);
function toAccountStatus(client, server) {
    return client ? {
        online: true,
        character: client.characterName,
        server: server.id,
        map: client.map.id || '-',
        x: Math.round(client.pony.x),
        y: Math.round(client.pony.y),
        userAgent: client.userAgent,
        incognito: client.incognito,
        duration: utils_1.formatDuration(Date.now() - client.connectedTime),
    } : { online: false };
}
exports.createAccountStatus = (world, server) => async (accountId) => toAccountStatus(world_1.findClientByAccountId(world, accountId), server);
exports.createAccountAround = (world) => async (accountId) => world_1.findClientsAroundAccountId(world, accountId);
exports.createHiddenStats = (hiding) => async (accountId) => hiding.getStatsFor(accountId);
exports.createTeleportTo = (world) => async (adminAccountId, targetAccountId) => {
    const admin = world_1.findClientByAccountId(world, adminAccountId);
    const target = world_1.findClientByAccountId(world, targetAccountId);
    if (admin && target && admin.map === target.map) {
        playerUtils_1.teleportTo(admin, target.pony.x, target.pony.y);
    }
};
async function setupPonyAuth(character, account, findAuth) {
    if (character.site) {
        const auth = await findAuth(character.site, account._id);
        if (auth && !auth.disabled && !auth.banned) {
            character.auth = auth;
        }
    }
}
exports.createJoin = (world, getSettings, server, { clearTokensForAccount, createToken }, findAccount, findCharacter, findAuth, live, hasInvite) => async (accountId, characterId) => {
    if (getSettings().isServerOffline || live.shutdown) {
        throw new userError_1.UserError('Server is offline');
    }
    const [account, character, supporterInvited] = await Promise.all([
        findAccount(accountId),
        findCharacter(characterId, accountId),
        hasInvite(accountId),
    ]);
    if (!accountUtils_1.meetsRequirement({ roles: account.roles, supporter: adminUtils_1.supporterLevel(account), supporterInvited }, server.require)) {
        throw new userError_1.UserError('Server is restricted');
    }
    await setupPonyAuth(character, account, findAuth);
    character.lastUsed = new Date();
    account.settings = Object.assign({}, account.settings, { defaultServer: server.id });
    account.lastVisit = new Date();
    if (!account.settings.hidden) {
        account.lastOnline = new Date();
        account.lastCharacter = character._id;
    }
    await Promise.all([character.save(), account.save()]);
    world.kickByAccount(accountId);
    clearTokensForAccount(accountId);
    return createToken({ accountId, account, character });
};
function getClientCountOnMainMap(world) {
    let count = 0;
    const map = world.getMainMap();
    for (const client of world.clients) {
        if (client.map === map) {
            count++;
        }
    }
    return count;
}
exports.createGetServerState = (server, getSettings, world, live) => async () => ({
    id: server.id,
    name: server.name,
    path: server.path,
    desc: server.desc,
    flag: server.flag,
    host: server.host,
    alert: server.alert,
    flags: server.flags,
    require: server.require,
    dead: false,
    shutdown: live.shutdown,
    maps: world.maps.length,
    online: world.clients.length,
    onMain: getClientCountOnMainMap(world),
    queued: world.joinQueue.length,
    settings: getSettings(),
});
exports.createGetServerStats = (statsTracker) => async () => statsTracker.getSocketStats();
exports.createGetStatsTable = (world) => async (stats) => {
    switch (stats) {
        case 0 /* Country */:
            return getCountryStats(world);
        case 1 /* Support */:
            return getSupportStats(world);
        case 2 /* Maps */:
            return getMapStats(world);
        default:
            utils_1.invalidEnum(stats);
            return [];
    }
};
exports.createAction = (world) => async (action, accountId) => {
    switch (action) {
        case 'unstuck':
            const client = world_1.findClientByAccountId(world, accountId);
            if (client) {
                world.resetToSpawn(client);
                world.kick(client, 'unstuck');
            }
            break;
        default:
            throw new Error(`Invalid action (${action})`);
    }
};
exports.createKick = (world, { clearTokensForAccount }) => async (accountId, characterId) => {
    if (accountId) {
        clearTokensForAccount(accountId);
        return world.kickByAccount(accountId);
    }
    else if (characterId) {
        return world.kickByCharacter(characterId);
    }
    else {
        return false;
    }
};
exports.createKickAll = (world, { clearTokensAll }) => async () => {
    world.kickAll();
    clearTokensAll();
};
exports.createNotifyUpdate = (world, live) => async () => {
    live.updating = true;
    world.notifyUpdate();
    world.saveClientStates();
};
exports.createCancelUpdate = (live) => async () => {
    live.updating = false;
};
exports.createShutdownServer = (world, live) => async (value) => {
    live.shutdown = value;
    if (live.shutdown) {
        world.kickAll();
        hiding_1.saveHidingData(world.hidingService, world.server.id);
    }
};
/* istanbul ignore next */
function createInternalApi(world, server, reloadSettings, getSettings, tokens, hiding, statsTracker, live) {
    return {
        reloadSettings: internal_common_1.createReloadSettings(reloadSettings),
        state: exports.createGetServerState(server, getSettings, world, live),
        stats: exports.createGetServerStats(statsTracker),
        statsTable: exports.createGetStatsTable(world),
        action: exports.createAction(world),
        join: exports.createJoin(world, getSettings, server, tokens, db_1.findAccountSafe, db_1.findCharacterSafe, db_1.findAuth, live, db_1.hasActiveSupporterInvites),
        kick: exports.createKick(world, tokens),
        kickAll: exports.createKickAll(world, tokens),
        accountChanged: exports.createAccountChanged(world, tokens, db_1.findAccountSafe),
        accountMerged: exports.createAccountMerged(hiding),
        accountStatus: exports.createAccountStatus(world, server),
        accountAround: exports.createAccountAround(world),
        notifyUpdate: exports.createNotifyUpdate(world, liveSettings_1.liveSettings),
        cancelUpdate: exports.createCancelUpdate(liveSettings_1.liveSettings),
        shutdownServer: exports.createShutdownServer(world, live),
        accountHidden: exports.createHiddenStats(hiding),
        getTimings: async () => timing_1.timingEntries(),
        teleportTo: exports.createTeleportTo(world),
    };
}
exports.createInternalApi = createInternalApi;
function getCountryStats(world) {
    return [
        ['country', 'users'],
        ...lodash_1.toPairs(lodash_1.groupBy(world.clients, c => c.country))
            .map(([key, value]) => ({ key, count: value.length }))
            .sort((a, b) => b.count - a.count)
            .map(({ key, count }) => [key, count.toString()]),
    ];
}
function getSupportStats(world) {
    let wasmYes = 0;
    let wasmNo = 0;
    let letAndConstYes = 0;
    let letAndConstNo = 0;
    for (const client of world.clients) {
        if (client.supportsWasm) {
            wasmYes++;
        }
        else {
            wasmNo++;
        }
        if (client.supportsLetAndConst) {
            letAndConstYes++;
        }
        else {
            letAndConstNo++;
        }
    }
    function percent(yes, no) {
        return (yes * 100 / ((yes + no) || 1)).toFixed(0) + '%';
    }
    return [
        ['supports', 'yes', 'no', ''],
        ['wasm', wasmYes.toString(), wasmNo.toString(), percent(wasmYes, wasmNo)],
        ['let & const', letAndConstYes.toString(), letAndConstNo.toString(), percent(letAndConstYes, letAndConstNo)],
    ];
}
function getMapStats(world) {
    return [
        ['id', 'instance', 'entities', 'players', 'memory'],
        ...world.maps.map(map => {
            const { entities, memory } = serverMap_1.getSizeOfMap(map);
            return [
                map.id || 'main',
                map.instance || '',
                entities.toString(),
                world.clients.reduce((sum, c) => sum + (c.map === map ? 1 : 0), 0).toString(),
                `${(memory / 1024).toFixed()} kb`,
            ];
        }),
    ];
}
//# sourceMappingURL=internal.js.map