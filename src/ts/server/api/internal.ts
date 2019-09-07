import {
	GameServerState, AccountStatus, ServerConfig, InternalApi, ServerLiveSettings, Stats, StatsTable
} from '../../common/adminInterfaces';
import { isBanned, supporterLevel } from '../../common/adminUtils';
import { IClient, TokenService, GetSettings } from '../serverInterfaces';
import {
	ICharacter, IAccount, FindAccountSafe, FindAuth, FindCharacterSafe, findAccountSafe, findCharacterSafe,
	findAuth, HasActiveSupporterInvites, hasActiveSupporterInvites
} from '../db';
import { World, findClientsAroundAccountId, findClientByAccountId } from '../world';
import { HidingService, saveHidingData } from '../services/hiding';
import { meetsRequirement } from '../../common/accountUtils';
import { StatsTracker } from '../stats';
import { createReloadSettings } from './internal-common';
import { UserError } from '../userError';
import { liveSettings } from '../liveSettings';
import { formatDuration, invalidEnum } from '../../common/utils';
import { timingEntries } from '../timing';
import { toPairs, groupBy } from 'lodash';
import { getSizeOfMap } from '../serverMap';
import { teleportTo } from '../playerUtils';

export const createAccountChanged =
	(world: World, tokens: TokenService, findAccount: FindAccountSafe) =>
		async (accountId: string) => {
			const account = await findAccount(accountId);
			world.accountUpdated(account);

			if (isBanned(account)) {
				tokens.clearTokensForAccount(accountId);
			}
		};

export const createAccountMerged =
	(hiding: HidingService) =>
		async (accountId: string, mergedId: string) =>
			await hiding.merged(accountId, mergedId);

function toAccountStatus(client: IClient | undefined, server: ServerConfig): AccountStatus {
	return client ? {
		online: true,
		character: client.characterName,
		server: server.id,
		map: client.map.id || '-',
		x: Math.round(client.pony.x),
		y: Math.round(client.pony.y),
		userAgent: client.userAgent,
		incognito: client.incognito,
		duration: formatDuration(Date.now() - client.connectedTime),
	} : { online: false };
}

export const createAccountStatus =
	(world: World, server: ServerConfig) =>
		async (accountId: string) =>
			toAccountStatus(findClientByAccountId(world, accountId), server);

export const createAccountAround =
	(world: World) =>
		async (accountId: string) =>
			findClientsAroundAccountId(world, accountId);

export const createHiddenStats =
	(hiding: HidingService) =>
		async (accountId: string) =>
			hiding.getStatsFor(accountId);

export const createTeleportTo =
	(world: World) =>
		async (adminAccountId: string, targetAccountId: string) => {
			const admin = findClientByAccountId(world, adminAccountId);
			const target = findClientByAccountId(world, targetAccountId);

			if (admin && target && admin.map === target.map) {
				teleportTo(admin, target.pony.x, target.pony.y);
			}
		};

async function setupPonyAuth(character: ICharacter, account: IAccount, findAuth: FindAuth) {
	if (character.site) {
		const auth = await findAuth(character.site, account._id);

		if (auth && !auth.disabled && !auth.banned) {
			character.auth = auth;
		}
	}
}

export const createJoin =
	(
		world: World, getSettings: GetSettings, server: ServerConfig,
		{ clearTokensForAccount, createToken }: TokenService, findAccount: FindAccountSafe,
		findCharacter: FindCharacterSafe, findAuth: FindAuth, live: ServerLiveSettings,
		hasInvite: HasActiveSupporterInvites
	) =>
		async (accountId: string, characterId: string) => {
			if (getSettings().isServerOffline || live.shutdown) {
				throw new UserError('Server is offline');
			}

			const [account, character, supporterInvited] = await Promise.all([
				findAccount(accountId),
				findCharacter(characterId, accountId),
				hasInvite(accountId),
			]);

			if (!meetsRequirement({ roles: account.roles, supporter: supporterLevel(account), supporterInvited }, server.require)) {
				throw new UserError('Server is restricted');
			}

			await setupPonyAuth(character, account, findAuth);

			character.lastUsed = new Date();
			account.settings = { ...account.settings, defaultServer: server.id };
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

function getClientCountOnMainMap(world: World) {
	let count = 0;
	const map = world.getMainMap();

	for (const client of world.clients) {
		if (client.map === map) {
			count++;
		}
	}

	return count;
}

export const createGetServerState =
	(server: ServerConfig, getSettings: GetSettings, world: World, live: ServerLiveSettings) =>
		async (): Promise<GameServerState> =>
			({
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

export const createGetServerStats =
	(statsTracker: StatsTracker) =>
		async () =>
			statsTracker.getSocketStats();

export const createGetStatsTable =
	(world: World) =>
		async (stats: Stats) => {
			switch (stats) {
				case Stats.Country:
					return getCountryStats(world);
				case Stats.Support:
					return getSupportStats(world);
				case Stats.Maps:
					return getMapStats(world);
				default:
					invalidEnum(stats);
					return [];
			}
		};

export const createAction =
	(world: World) =>
		async (action: string, accountId: string) => {
			switch (action) {
				case 'unstuck':
					const client = findClientByAccountId(world, accountId);

					if (client) {
						world.resetToSpawn(client);
						world.kick(client, 'unstuck');
					}
					break;
				default:
					throw new Error(`Invalid action (${action})`);
			}
		};

export const createKick =
	(world: World, { clearTokensForAccount }: TokenService) =>
		async (accountId: string | undefined, characterId: string | undefined) => {
			if (accountId) {
				clearTokensForAccount(accountId);
				return world.kickByAccount(accountId);
			} else if (characterId) {
				return world.kickByCharacter(characterId);
			} else {
				return false;
			}
		};

export const createKickAll =
	(world: World, { clearTokensAll }: TokenService) =>
		async () => {
			world.kickAll();
			clearTokensAll();
		};

export const createNotifyUpdate =
	(world: World, live: ServerLiveSettings) =>
		async () => {
			live.updating = true;
			world.notifyUpdate();
			world.saveClientStates();
		};

export const createCancelUpdate =
	(live: ServerLiveSettings) =>
		async () => {
			live.updating = false;
		};

export const createShutdownServer =
	(world: World, live: ServerLiveSettings) =>
		async (value: boolean) => {
			live.shutdown = value;

			if (live.shutdown) {
				world.kickAll();
				saveHidingData(world.hidingService, world.server.id);
			}
		};

/* istanbul ignore next */
export function createInternalApi(
	world: World, server: ServerConfig, reloadSettings: () => Promise<void>, getSettings: GetSettings,
	tokens: TokenService, hiding: HidingService, statsTracker: StatsTracker, live: ServerLiveSettings,
): InternalApi {
	return {
		reloadSettings: createReloadSettings(reloadSettings),
		state: createGetServerState(server, getSettings, world, live),
		stats: createGetServerStats(statsTracker),
		statsTable: createGetStatsTable(world),
		action: createAction(world),
		join: createJoin(
			world, getSettings, server, tokens, findAccountSafe, findCharacterSafe, findAuth, live, hasActiveSupporterInvites),
		kick: createKick(world, tokens),
		kickAll: createKickAll(world, tokens),
		accountChanged: createAccountChanged(world, tokens, findAccountSafe),
		accountMerged: createAccountMerged(hiding),
		accountStatus: createAccountStatus(world, server),
		accountAround: createAccountAround(world),
		notifyUpdate: createNotifyUpdate(world, liveSettings),
		cancelUpdate: createCancelUpdate(liveSettings),
		shutdownServer: createShutdownServer(world, live),
		accountHidden: createHiddenStats(hiding),
		getTimings: async () => timingEntries(),
		teleportTo: createTeleportTo(world),
	};
}


function getCountryStats(world: World): StatsTable {
	return [
		['country', 'users'],
		...toPairs(groupBy(world.clients, c => c.country))
			.map(([key, value]) => ({ key, count: value.length }))
			.sort((a, b) => b.count - a.count)
			.map(({ key, count }) => [key, count.toString()]),
	];
}

function getSupportStats(world: World): StatsTable {
	let wasmYes = 0;
	let wasmNo = 0;
	let letAndConstYes = 0;
	let letAndConstNo = 0;

	for (const client of world.clients) {
		if (client.supportsWasm) {
			wasmYes++;
		} else {
			wasmNo++;
		}

		if (client.supportsLetAndConst) {
			letAndConstYes++;
		} else {
			letAndConstNo++;
		}
	}

	function percent(yes: number, no: number) {
		return (yes * 100 / ((yes + no) || 1)).toFixed(0) + '%';
	}

	return [
		['supports', 'yes', 'no', ''],
		['wasm', wasmYes.toString(), wasmNo.toString(), percent(wasmYes, wasmNo)],
		['let & const', letAndConstYes.toString(), letAndConstNo.toString(), percent(letAndConstYes, letAndConstNo)],
	];
}

function getMapStats(world: World): StatsTable {
	return [
		['id', 'instance', 'entities', 'players', 'memory'],
		...world.maps.map(map => {
			const { entities, memory } = getSizeOfMap(map);

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
