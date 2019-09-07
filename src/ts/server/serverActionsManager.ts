import { SocketClient, ClientExtensions } from 'ag-sockets';
import * as fs from 'fs';
import { noop, random } from 'lodash';
import { HOUR, SECOND, SEASON, HOLIDAY, UNHIDE_TIMEOUT, MINUTE } from '../common/constants';
import { CharacterState, ServerConfig, Settings } from '../common/adminInterfaces';
import { ClientActions } from '../client/clientActions';
import {
	updateAccountSafe, timeoutAccount, reportInviteLimitAccount, reportSwearingAccount, reportSpammingAccount,
	reportFriendLimitAccount
} from './api/admin-accounts';
import { ServerActions } from './serverActions';
import { IClient, AccountService, GetSettings, SocketStats, TokenData } from './serverInterfaces';
import { createReportSwears, createReportForbidden, reportInviteLimit, createReportSuspicious } from './reporting';
import { createSpamChecker } from './spamChecker';
import { NotificationService } from './services/notification';
import { CounterService } from './services/counter';
import { HidingService, pollHidingDataSave, hidingDataPath } from './services/hiding';
import { PartyService } from './services/party';
import { World, findClientByAccountId } from './world';
import { log, chat } from './logger';
import { createSay, LogChat } from './chat';
import { createRunCommand, createCommands, getSpamCommandNames } from './commands';
import { createIgnorePlayer, findClientByEntityId, createClientAndPony } from './playerUtils';
import { createUpdateSettings } from './api/account';
import { findAccountSafe, updateAccount, SupporterInvite, Account, IAccount, findFriendIds, findHideIds } from './db';
import { SupporterInvitesService } from './services/supporterInvites';
import { createMove } from './move';
import { liveSettings } from './liveSettings';
import { createIsSuspiciousMessage } from '../common/security';
import { updateCharacterState } from './characterUtils';
import { FriendsService } from './services/friends';

async function refreshSettings(account: IAccount) {
	const a = await Account.findOne({ _id: account._id }, 'settings').exec();

	if (a) {
		account.settings = a.settings;
	}
}

export function createServerActionsFactory(
	server: ServerConfig, settings: Settings, getSettings: GetSettings, socketStats: SocketStats
) {
	const reportInviteLimitFunc = reportInviteLimit(reportInviteLimitAccount, `Party invite limit`);
	const reportFriendLimitFunc = reportInviteLimit(reportFriendLimitAccount, `Friend request limit`);
	const notifications = new NotificationService();
	const party = new PartyService(notifications, reportInviteLimitFunc);
	const supporterInvites = new SupporterInvitesService(SupporterInvite, notifications, log);
	const friends = new FriendsService(notifications, reportFriendLimitFunc);
	let world: World;
	const hiding = new HidingService(UNHIDE_TIMEOUT, notifications, accountId => findClientByAccountId(world, accountId), log);
	world = new World(server, party, friends, hiding, notifications, getSettings, liveSettings, socketStats);
	const spamCounter = new CounterService<string>(2 * HOUR);
	const rapidCounter = new CounterService<number>(1 * MINUTE);
	const swearsCounter = new CounterService<string>(2 * HOUR);
	const forbiddenCounter = new CounterService<string>(4 * HOUR);
	const suspiciousCounter = new CounterService<string>(4 * HOUR);
	const teleportCounter = new CounterService<void>(1 * HOUR);
	const statesCounter = new CounterService<CharacterState>(10 * SECOND);
	const logChatMessage: LogChat = (client, text, type, ignored, target) => chat(server, client, text, type, ignored, target);

	world.season = SEASON;
	world.holiday = HOLIDAY;

	try {
		const hidingData = fs.readFileSync(hidingDataPath(server.id), 'utf8');

		if (hidingData) {
			hiding.deserialize(hidingData);
		}
	} catch { }

	pollHidingDataSave(hiding, server.id);

	hiding.changes.subscribe(({ by, who }) => world.notifyHidden(by, who));
	hiding.unhidesAll.subscribe(by => world.kickByAccount(by));

	hiding.start();
	spamCounter.start();
	swearsCounter.start();
	forbiddenCounter.start();
	suspiciousCounter.start();

	const commands = createCommands(world);
	const spamCommands = getSpamCommandNames(commands);
	const runCommand = createRunCommand({ world, notifications, random, liveSettings, party }, commands);
	const updateSettings = createUpdateSettings(findAccountSafe);
	const accountService: AccountService = {
		update: updateAccountSafe,
		updateSettings: (account, settings) => updateSettings(account, settings).then(noop),
		refreshSettings,
		updateAccount,
		updateCharacterState: (characterId, state) => updateCharacterState(characterId, server.id, state),
	};
	const reportSwears = createReportSwears(swearsCounter, reportSwearingAccount, timeoutAccount);
	const reportForbidden = createReportForbidden(forbiddenCounter, timeoutAccount);
	const reportSuspicious = createReportSuspicious(suspiciousCounter);
	const checkSpam = createSpamChecker(spamCounter, rapidCounter, reportSpammingAccount, timeoutAccount);
	const isSuspiciousMessage = createIsSuspiciousMessage(settings);
	const say = createSay(
		world, runCommand, logChatMessage, checkSpam, reportSwears, reportForbidden, reportSuspicious, spamCommands,
		Math.random, isSuspiciousMessage);
	const move = createMove(teleportCounter);
	const ignorePlayer = createIgnorePlayer(updateAccount);

	async function createServerActions(client: ClientActions & SocketClient & ClientExtensions & IClient) {
		const { account } = client.tokenData as TokenData;
		const [friendIds, hideIds] = await Promise.all([findFriendIds(account._id), findHideIds(account._id)]);
		createClientAndPony(client, friendIds, hideIds, server, world, statesCounter);

		return new ServerActions(
			client, world, notifications, party, supporterInvites, getSettings, server, say, move, hiding, statesCounter,
			accountService, ignorePlayer, findClientByEntityId, friends
		);
	}

	return { world, hiding, createServerActions };
}
