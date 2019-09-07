"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const lodash_1 = require("lodash");
const constants_1 = require("../common/constants");
const admin_accounts_1 = require("./api/admin-accounts");
const serverActions_1 = require("./serverActions");
const reporting_1 = require("./reporting");
const spamChecker_1 = require("./spamChecker");
const notification_1 = require("./services/notification");
const counter_1 = require("./services/counter");
const hiding_1 = require("./services/hiding");
const party_1 = require("./services/party");
const world_1 = require("./world");
const logger_1 = require("./logger");
const chat_1 = require("./chat");
const commands_1 = require("./commands");
const playerUtils_1 = require("./playerUtils");
const account_1 = require("./api/account");
const db_1 = require("./db");
const supporterInvites_1 = require("./services/supporterInvites");
const move_1 = require("./move");
const liveSettings_1 = require("./liveSettings");
const security_1 = require("../common/security");
const characterUtils_1 = require("./characterUtils");
const friends_1 = require("./services/friends");
async function refreshSettings(account) {
    const a = await db_1.Account.findOne({ _id: account._id }, 'settings').exec();
    if (a) {
        account.settings = a.settings;
    }
}
function createServerActionsFactory(server, settings, getSettings, socketStats) {
    const reportInviteLimitFunc = reporting_1.reportInviteLimit(admin_accounts_1.reportInviteLimitAccount, `Party invite limit`);
    const reportFriendLimitFunc = reporting_1.reportInviteLimit(admin_accounts_1.reportFriendLimitAccount, `Friend request limit`);
    const notifications = new notification_1.NotificationService();
    const party = new party_1.PartyService(notifications, reportInviteLimitFunc);
    const supporterInvites = new supporterInvites_1.SupporterInvitesService(db_1.SupporterInvite, notifications, logger_1.log);
    const friends = new friends_1.FriendsService(notifications, reportFriendLimitFunc);
    let world;
    const hiding = new hiding_1.HidingService(constants_1.UNHIDE_TIMEOUT, notifications, accountId => world_1.findClientByAccountId(world, accountId), logger_1.log);
    world = new world_1.World(server, party, friends, hiding, notifications, getSettings, liveSettings_1.liveSettings, socketStats);
    const spamCounter = new counter_1.CounterService(2 * constants_1.HOUR);
    const rapidCounter = new counter_1.CounterService(1 * constants_1.MINUTE);
    const swearsCounter = new counter_1.CounterService(2 * constants_1.HOUR);
    const forbiddenCounter = new counter_1.CounterService(4 * constants_1.HOUR);
    const suspiciousCounter = new counter_1.CounterService(4 * constants_1.HOUR);
    const teleportCounter = new counter_1.CounterService(1 * constants_1.HOUR);
    const statesCounter = new counter_1.CounterService(10 * constants_1.SECOND);
    const logChatMessage = (client, text, type, ignored, target) => logger_1.chat(server, client, text, type, ignored, target);
    world.season = constants_1.SEASON;
    world.holiday = constants_1.HOLIDAY;
    try {
        const hidingData = fs.readFileSync(hiding_1.hidingDataPath(server.id), 'utf8');
        if (hidingData) {
            hiding.deserialize(hidingData);
        }
    }
    catch (_a) { }
    hiding_1.pollHidingDataSave(hiding, server.id);
    hiding.changes.subscribe(({ by, who }) => world.notifyHidden(by, who));
    hiding.unhidesAll.subscribe(by => world.kickByAccount(by));
    hiding.start();
    spamCounter.start();
    swearsCounter.start();
    forbiddenCounter.start();
    suspiciousCounter.start();
    const commands = commands_1.createCommands(world);
    const spamCommands = commands_1.getSpamCommandNames(commands);
    const runCommand = commands_1.createRunCommand({ world, notifications, random: lodash_1.random, liveSettings: liveSettings_1.liveSettings, party }, commands);
    const updateSettings = account_1.createUpdateSettings(db_1.findAccountSafe);
    const accountService = {
        update: admin_accounts_1.updateAccountSafe,
        updateSettings: (account, settings) => updateSettings(account, settings).then(lodash_1.noop),
        refreshSettings,
        updateAccount: db_1.updateAccount,
        updateCharacterState: (characterId, state) => characterUtils_1.updateCharacterState(characterId, server.id, state),
    };
    const reportSwears = reporting_1.createReportSwears(swearsCounter, admin_accounts_1.reportSwearingAccount, admin_accounts_1.timeoutAccount);
    const reportForbidden = reporting_1.createReportForbidden(forbiddenCounter, admin_accounts_1.timeoutAccount);
    const reportSuspicious = reporting_1.createReportSuspicious(suspiciousCounter);
    const checkSpam = spamChecker_1.createSpamChecker(spamCounter, rapidCounter, admin_accounts_1.reportSpammingAccount, admin_accounts_1.timeoutAccount);
    const isSuspiciousMessage = security_1.createIsSuspiciousMessage(settings);
    const say = chat_1.createSay(world, runCommand, logChatMessage, checkSpam, reportSwears, reportForbidden, reportSuspicious, spamCommands, Math.random, isSuspiciousMessage);
    const move = move_1.createMove(teleportCounter);
    const ignorePlayer = playerUtils_1.createIgnorePlayer(db_1.updateAccount);
    async function createServerActions(client) {
        const { account } = client.tokenData;
        const [friendIds, hideIds] = await Promise.all([db_1.findFriendIds(account._id), db_1.findHideIds(account._id)]);
        playerUtils_1.createClientAndPony(client, friendIds, hideIds, server, world, statesCounter);
        return new serverActions_1.ServerActions(client, world, notifications, party, supporterInvites, getSettings, server, say, move, hiding, statesCounter, accountService, ignorePlayer, playerUtils_1.findClientByEntityId, friends);
    }
    return { world, hiding, createServerActions };
}
exports.createServerActionsFactory = createServerActionsFactory;
//# sourceMappingURL=serverActionsManager.js.map