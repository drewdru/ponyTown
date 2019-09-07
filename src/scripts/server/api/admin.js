"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const moment = require("moment");
const adminInterfaces_1 = require("../../common/adminInterfaces");
const serverUtils_1 = require("../serverUtils");
const db_1 = require("../db");
const internal_1 = require("../internal");
const adminEncoders_1 = require("../adminEncoders");
const liveEndPoint_1 = require("../liveEndPoint");
const paths = require("../paths");
const logger_1 = require("../logger");
const settings_1 = require("../settings");
const utils_1 = require("../../common/utils");
function encodeItems(items, base, encode) {
    const baseValues = adminEncoders_1.getBaseTimes(base);
    return items.map(i => encode(i, baseValues));
}
const events = liveEndPoint_1.createLiveEndPoint({
    model: db_1.Event,
    fields: adminInterfaces_1.eventFields,
    encode(items, base) {
        base.createdAt = adminEncoders_1.getBaseDate(items, i => i.createdAt);
        base.updatedAt = adminEncoders_1.getBaseDate(items, i => i.updatedAt);
        return encodeItems(items, base, adminEncoders_1.encodeEvent);
    },
});
function createEndPoints() {
    return { events };
}
exports.createEndPoints = createEndPoints;
function getAdminState() {
    return {
        status: internal_1.serverStatus,
        loginServers: internal_1.loginServers.map(s => s.state),
        gameServers: internal_1.servers.map(s => s.state),
    };
}
exports.getAdminState = getAdminState;
async function forAllLoginServers(action, filter = (_) => true) {
    await Promise.all(internal_1.loginServers.filter(filter).map(action));
}
async function forAllGameServers(action, filter = (_) => true) {
    const liveServers = internal_1.servers.filter(s => !s.state.dead);
    await Promise.all(liveServers.filter(filter).map(action));
}
exports.forAllGameServers = forAllGameServers;
function actionForAllServers(action, accountId) {
    return forAllGameServers(s => s.api.action(action, accountId));
}
exports.actionForAllServers = actionForAllServers;
function kickFromAllServers(accountId) {
    return forAllGameServers(s => s.api.kick(accountId, undefined));
}
exports.kickFromAllServers = kickFromAllServers;
function kickFromAllServersByCharacter(characterId) {
    return forAllGameServers(s => s.api.kick(undefined, characterId));
}
exports.kickFromAllServersByCharacter = kickFromAllServersByCharacter;
function createFilter(id) {
    return (server) => id === '*' || server.id === id;
}
async function notifyUpdate(server) {
    await Promise.all([
        forAllLoginServers(s => s.api.updateLiveSettings({ updating: true }), createFilter(server)),
        forAllGameServers(s => s.api.notifyUpdate(), createFilter(server)),
    ]);
}
exports.notifyUpdate = notifyUpdate;
function shutdownServers(server, value) {
    return forAllGameServers(s => s.api.shutdownServer(value), createFilter(server));
}
exports.shutdownServers = shutdownServers;
async function resetUpdating(server) {
    await Promise.all([
        forAllLoginServers(s => s.api.updateLiveSettings({ updating: false }), createFilter(server)),
        forAllGameServers(s => s.api.cancelUpdate(), createFilter(server)),
        shutdownServers(server, false),
    ]);
}
exports.resetUpdating = resetUpdating;
async function reloadSettingsOnAllServers() {
    await Promise.all([
        forAllLoginServers(s => s.api.reloadSettings()),
        forAllGameServers(s => s.api.reloadSettings()),
    ]);
}
exports.reloadSettingsOnAllServers = reloadSettingsOnAllServers;
async function getChat(search, date, caseInsensitive) {
    const query = search
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\./g, '\\.')
        .replace(/\*/g, '\\*')
        .replace(/\$/g, '\\*')
        .replace(/\^/g, '\\*');
    const flags = caseInsensitive ? '-i -E ' : '-E ';
    const options = { maxBuffer: 1 * 1024 * 1024 }; // 1MB
    async function fetchChatlog(lines) {
        const logFile = paths.pathTo('logs', `info.${moment(date).format('YYYYMMDD')}.log`);
        const { stdout } = await serverUtils_1.execAsync(`grep ${flags}"${query}" "${logFile}" | tail -n ${lines}`, options);
        return stdout;
    }
    try {
        if (!search) {
            return '';
        }
        else if (date === 'all') {
            const { stdout } = await serverUtils_1.execAsync(`for f in ${paths.pathTo('logs')}/*.log; do `
                + `echo "$f" | grep -o '[0-9]*';`
                + `cat "$f" | grep ${flags}"${query}";`
                + `done`, options);
            return stdout;
        }
        else {
            let lines = 8192;
            let more = '';
            do {
                try {
                    const log = await fetchChatlog(lines);
                    return more + log;
                }
                catch (e) {
                    if (e.message !== 'stdout maxBuffer exceeded') {
                        throw e;
                    }
                }
                lines /= 2;
                more = '... more lines ...\n';
            } while (lines > 1);
            return '<error size exceeded>';
        }
    }
    catch (e) {
        console.error('Failed to fetch chatlog: ', e);
        return '<error>';
    }
}
exports.getChat = getChat;
async function getChatForAccounts(accountIds, date) {
    const accounts = await db_1.Account.find({ _id: { $in: accountIds } }, '_id merges').lean().exec();
    const map = new Map();
    const ids = utils_1.flatten(accounts.map(a => [a._id.toString(), ...(a.merges || []).map(a => a.id)]));
    for (const a of accounts) {
        const index = accountIds.indexOf(a._id.toString());
        map.set(a._id.toString(), index ? `[${index}]` : ``);
        (a.merges || []).forEach(({ id }) => {
            map.set(id, index ? `[${index}:merged]` : `[merged]`);
        });
    }
    const chat = await getChat(ids.join('|'), date, false);
    const fixed = chat.replace(/^([0-9:]+) \[([a-f0-9]{24})\]/gmu, (_, date, id) => `${date} ${map.has(id) ? map.get(id) : `[${id}]`}`);
    return fixed;
}
exports.getChatForAccounts = getChatForAccounts;
async function clearSessions(accountId) {
    const clearIds = [];
    await db_1.iterate(db_1.Session.find({ session: { $exists: true } }).lean(), session => {
        try {
            if (session.session) {
                const data = JSON.parse(session.session);
                const user = data && data.passport && data.passport.user;
                if (user === accountId) {
                    clearIds.push(session._id);
                }
            }
        }
        catch (e) {
            logger_1.logger.error('Error when claring session', e, session._id, session.session);
        }
    });
    await db_1.Session.deleteOne({ _id: { $in: clearIds } }).exec();
}
exports.clearSessions = clearSessions;
async function updateOrigin(update) {
    await db_1.Origin.updateOne({ ip: update.ip }, update, { upsert: true }).exec();
}
exports.updateOrigin = updateOrigin;
async function getUserCounts() {
    const statsFile = paths.pathTo('settings', `user-counts.log`);
    try {
        const content = await fs.readFileAsync(statsFile, 'utf8');
        const lines = content.trim().split(/\n/);
        return lines.map(line => JSON.parse(line));
    }
    catch (_a) {
        return [];
    }
}
exports.getUserCounts = getUserCounts;
function convertInvite(invite) {
    return {
        _id: invite._id.toString(),
        name: invite.name,
        info: invite.info,
        source: invite.source.toHexString(),
        target: invite.target.toHexString(),
        active: invite.active,
        updatedAt: invite.updatedAt,
        createdAt: invite.createdAt,
    };
}
async function getAccountDetails(accountId) {
    const [account, invitesReceived, invitesSent] = await Promise.all([
        db_1.findAccount(accountId, 'merges supporterLog banLog state'),
        db_1.SupporterInvite.find({ target: accountId }).exec(),
        db_1.SupporterInvite.find({ source: accountId }).exec(),
    ]);
    return account ? {
        merges: account.merges || [],
        banLog: account.banLog || [],
        supporterLog: account.supporterLog || [],
        invitesReceived: invitesReceived.map(convertInvite),
        invitesSent: invitesSent.map(convertInvite),
        state: account.state || {},
    } : {
        merges: [],
        banLog: [],
        supporterLog: [],
        invitesReceived: [],
        invitesSent: [],
        state: {},
    };
}
exports.getAccountDetails = getAccountDetails;
async function getOtherStats(service) {
    let totalIgnores = 0;
    let authsWithEmptyAccount = 0;
    let authsWithMissingAccount = 0;
    for (const account of service.accounts.items) {
        totalIgnores += account.ignoresCount;
    }
    for (const auth of service.auths.items) {
        if (!auth.account) {
            authsWithEmptyAccount++;
        }
        else if (!service.accounts.get(auth.account)) {
            authsWithMissingAccount++;
        }
    }
    return {
        totalIgnores,
        authsWithEmptyAccount,
        authsWithMissingAccount,
    };
}
exports.getOtherStats = getOtherStats;
async function updateServerSettings(currentSettings, update) {
    const settings = await Promise.resolve(settings_1.loadSettings());
    Object.assign(currentSettings, settings, update);
    await settings_1.saveSettings(currentSettings);
    await reloadSettingsOnAllServers();
}
exports.updateServerSettings = updateServerSettings;
async function updateGameServerSettings(currentSettings, serverId, update) {
    const settings = await Promise.resolve(settings_1.loadSettings());
    Object.assign(currentSettings, settings);
    const serverSettings = currentSettings.servers[serverId] = currentSettings.servers[serverId] || {};
    Object.assign(serverSettings, update);
    await settings_1.saveSettings(currentSettings);
    await reloadSettingsOnAllServers();
}
exports.updateGameServerSettings = updateGameServerSettings;
//# sourceMappingURL=admin.js.map