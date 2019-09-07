"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Bluebird = require("bluebird");
const utils_1 = require("../common/utils");
const logger_1 = require("./logger");
const db_1 = require("./db");
const serverUtils_1 = require("./serverUtils");
const constants_1 = require("../common/constants");
const patreon_1 = require("./patreon");
const reporter_1 = require("./reporter");
const internal_1 = require("./internal");
const paths = require("./paths");
const supporterInvites_1 = require("./services/supporterInvites");
const origins_1 = require("./api/origins");
const config_1 = require("./config");
let updatingPatreonPromise;
async function updatePatreonDataInternal(server, accessToken) {
    try {
        const removeOldSupporters = patreon_1.createRemoveOldSupporters(db_1.updateAccounts, logger_1.system);
        const updateSupporters = patreon_1.createUpdateSupporters(db_1.updateAccount, logger_1.system);
        const addTotalPledged = patreon_1.createAddTotalPledged(db_1.updateAuth);
        const updatePatreonInfo = patreon_1.createUpdatePatreonInfo(db_1.queryAuths, db_1.queryAccounts, removeOldSupporters, updateSupporters, addTotalPledged);
        const client = patreon_1.createPatreonClient(accessToken);
        const data = await patreon_1.fetchPatreonData(client, logger_1.logPatreon);
        await updatePatreonInfo(data, new Date());
        internal_1.serverStatus.lastPatreonUpdate = (new Date()).toISOString();
    }
    catch (e) {
        const message = e.error ? (e.error.message || e.error.statusText || `${e}`) : e.message;
        const stack = (e.error ? e.error.stack : e.stack) || '';
        reporter_1.create(server).danger('Patreon update failed', `${message}\n${stack}`.trim());
        logger_1.logger.error(e);
    }
    finally {
        updatingPatreonPromise = undefined;
    }
}
async function updatePatreonData(server, { patreonToken }) {
    if (patreonToken && config_1.config.supporterLink) {
        return updatingPatreonPromise = updatingPatreonPromise || updatePatreonDataInternal(server, patreonToken);
    }
}
exports.updatePatreonData = updatePatreonData;
async function clearOldIgnores() {
    const start = Date.now();
    await db_1.updateAccounts({
        ignores: { $exists: true, $not: { $size: 0 } },
        lastVisit: { $lt: utils_1.fromNow(-constants_1.YEAR) },
    }, { ignores: [] });
    logger_1.logPerformance(`[async] clearOldIgnores (${Date.now() - start}ms)`);
}
async function cleanupBanField(field) {
    const start = Date.now();
    await db_1.updateAccounts({ [field]: { $exists: true, $gt: 0, $lt: Date.now() } }, { $unset: { [field]: 1 } });
    logger_1.logPerformance(`[async] cleanupBanField (${field}) (${Date.now() - start}ms)`);
}
async function cleanupBans() {
    const start = Date.now();
    await cleanupBanField('ban');
    await cleanupBanField('shadow');
    await cleanupBanField('mute');
    logger_1.logPerformance(`[async] cleanupBans (${Date.now() - start}ms)`);
}
async function cleanupMerges() {
    const start = Date.now();
    const date = utils_1.fromNow(-30 * constants_1.DAY);
    await db_1.updateAccounts({ merges: { $exists: true, $not: { $size: 0 } } }, { $pull: { merges: { date: { $lt: date } } } });
    await db_1.updateAccounts({ merges: { $exists: true, $size: 0 } }, { $unset: { merges: 1 } });
    logger_1.logPerformance(`[async] cleanupMerges (${Date.now() - start}ms)`);
}
async function cleanupAccountAlerts() {
    const start = Date.now();
    await db_1.updateAccounts({ alert: { $exists: true }, 'alert.expires': { $lt: new Date() } }, { $unset: { alert: 1 } });
    logger_1.logPerformance(`[async] cleanupAccountAlerts (${Date.now() - start}ms)`);
}
async function updatePastSupporters() {
    const start = Date.now();
    const auths = await db_1.Auth.find({
        pledged: { $exists: true, $gt: 0 },
        disabled: { $ne: true },
        banned: { $ne: true }
    }, 'account').exec();
    const accounts = await db_1.Account.find({
        supporter: { $exists: true, $bitsAllSet: 256 /* PastSupporter */ }
    }, '_id').exec();
    const shouldBeFlagged = new Set();
    const areFlagged = new Set();
    for (const auth of auths) {
        if (auth.account) {
            shouldBeFlagged.add(auth.account.toString());
        }
    }
    for (const account of accounts) {
        areFlagged.add(account._id.toString());
    }
    for (const auth of auths) {
        if (auth.account) {
            if (!areFlagged.has(auth.account.toString())) {
                await db_1.Account.updateOne({ _id: auth.account }, { $bit: { supporter: { or: 256 /* PastSupporter */ } } }).exec();
            }
        }
    }
    for (const account of accounts) {
        if (!shouldBeFlagged.has(account._id.toString())) {
            await db_1.Account.updateOne({ _id: account._id }, { $bit: { supporter: { and: ~256 /* PastSupporter */ } } }).exec();
        }
    }
    logger_1.logPerformance(`[async] cleanupAccountAlerts (${Date.now() - start}ms)`);
}
exports.updatePastSupporters = updatePastSupporters;
const cleanupStrayAuths = (removedDocument) => async () => {
    const start = Date.now();
    const date = utils_1.fromNow(-1 * constants_1.DAY);
    const query = { account: { $exists: false }, updatedAt: { $lt: date }, createdAt: { $lt: date } };
    const items = await db_1.queryAuths(query, '_id');
    await db_1.Auth.deleteMany(query).exec();
    await Bluebird.map(items, item => removedDocument('auths', item._id.toString()), { concurrency: 4 });
    logger_1.logPerformance(`[async] cleanupAccountAlerts (${Date.now() - start}ms)`);
};
async function updateServerState(server) {
    try {
        const state = await server.api.state();
        Object.assign(server.state, state);
    }
    catch (_a) {
        server.state.dead = true;
    }
}
let lastVisitedTodayCheck = (new Date()).getDate();
async function countUsersVisitedToday() {
    const start = Date.now();
    const day = (new Date()).getDate();
    if (lastVisitedTodayCheck !== day) {
        lastVisitedTodayCheck = day;
        const statsFile = paths.pathTo('settings', `user-counts.log`);
        const count = await db_1.Account.countDocuments({ lastVisit: { $gt: utils_1.fromNow(-1 * constants_1.DAY) } }).exec();
        const json = JSON.stringify({ count, date: (new Date()).toISOString() });
        await fs.appendFileAsync(statsFile, `${json}\n`, 'utf8');
        logger_1.logPerformance(`[async] countUsersVisitedToday (${Date.now() - start}ms)`);
    }
}
async function mergePotentialDuplicates(service) {
    if (internal_1.loginServers[0].state.autoMergeDuplicates) {
        await service.mergePotentialDuplicates();
    }
}
async function poll(action, delayTime) {
    try {
        await utils_1.delay(delayTime);
        await action();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        poll(action, delayTime);
    }
}
exports.poll = poll;
async function pollImmediate(action, delayTime) {
    try {
        await action();
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await utils_1.delay(delayTime);
        poll(action, delayTime);
    }
}
exports.pollImmediate = pollImmediate;
function pollServers() {
    return poll(() => Promise.all([...internal_1.loginServers, ...internal_1.servers].map(updateServerState)), 1 * constants_1.SECOND);
}
exports.pollServers = pollServers;
function pollPatreon(server, settings) {
    return poll(() => updatePatreonData(server, settings), 10 * constants_1.MINUTE);
}
exports.pollPatreon = pollPatreon;
exports.pollDiskSpace = () => pollImmediate(() => serverUtils_1.getDiskSpace().then(value => internal_1.serverStatus.diskSpace = value), constants_1.HOUR);
exports.pollMemoryUsage = () => pollImmediate(() => serverUtils_1.getMemoryUsage().then(value => internal_1.serverStatus.memoryUsage = value), 10 * constants_1.MINUTE);
exports.pollCertificateExpirationDate = () => pollImmediate(() => serverUtils_1.getCertificateExpirationDate().then(value => internal_1.serverStatus.certificateExpiration = value), constants_1.HOUR);
exports.startBansCleanup = () => poll(cleanupBans, constants_1.DAY + 10 * constants_1.MINUTE);
exports.startMergesCleanup = () => poll(cleanupMerges, constants_1.DAY + 15 * constants_1.MINUTE);
exports.startStrayAuthsCleanup = (removedDocument) => poll(cleanupStrayAuths(removedDocument), constants_1.DAY + 35 * constants_1.MINUTE);
exports.startClearOldIgnores = () => poll(clearOldIgnores, constants_1.DAY + 20 * constants_1.MINUTE);
exports.startCollectingUsersVisitedCount = () => poll(countUsersVisitedToday, 10 * constants_1.MINUTE);
exports.startSupporterInvitesCleanup = () => poll(() => supporterInvites_1.updateSupporterInvites(db_1.SupporterInvite), constants_1.HOUR);
exports.startPotentialDuplicatesCleanup = (service) => poll(() => mergePotentialDuplicates(service), 10 * constants_1.MINUTE);
exports.startAccountAlertsCleanup = () => poll(cleanupAccountAlerts, constants_1.DAY + 25 * constants_1.MINUTE);
exports.startUpdatePastSupporters = () => poll(updatePastSupporters, constants_1.DAY + 30 * constants_1.MINUTE);
function startClearTo10Origns(adminService) {
    return poll(async () => {
        if (adminService.loaded) {
            const start = Date.now();
            await origins_1.clearOrigins(adminService, 10, true, { old: false, singles: true, trim: true });
            logger_1.logPerformance(`[async] startClearTo10Origns (${Date.now() - start}ms)`);
        }
    }, constants_1.DAY + 35 * constants_1.MINUTE);
}
exports.startClearTo10Origns = startClearTo10Origns;
function startClearVeryOldOrigns(adminService) {
    return poll(async () => {
        if (adminService.loaded) {
            const start = Date.now();
            await origins_1.clearOrigins(adminService, 1, true, { old: true, singles: false, trim: false });
            logger_1.logPerformance(`[async] startClearVeryOldOrigns (${Date.now() - start}ms)`);
        }
    }, constants_1.DAY + 50 * constants_1.MINUTE);
}
exports.startClearVeryOldOrigns = startClearVeryOldOrigns;
//# sourceMappingURL=polling.js.map