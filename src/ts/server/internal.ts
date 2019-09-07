import * as request from 'request-promise';
import { noop, flatMap, uniq } from 'lodash';
import {
	InternalGameServerState, ServerStatus, InternalLoginApi, InternalLoginServerState, InternalApi, HidingStats
} from '../common/adminInterfaces';
import { isMod } from '../common/accountUtils';
import { findById, flatten, delay } from '../common/utils';
import { config, args, gameServers } from './config';
import { logger } from './logger';
import { IAccount, ICharacter, findAccountSafe, findHideIds, findHideIdsRev } from './db';
import { createAccountChanged } from './api/internal';
import { TokenService } from './serverInterfaces';
import { World } from './world';
import { InternalAdminApi } from './api/internal-admin';
import { EndPoints } from './api/admin';
import { UserError } from './userError';
import { AdminService } from './services/adminService';
// import { taskQueue } from './utils/taskQueue';

export const serverStatus: ServerStatus = {
	diskSpace: '',
	memoryUsage: '',
	certificateExpiration: '',
	lastPatreonUpdate: '',
};

export const loginServers: InternalLoginServerState[] = [
	{
		id: 'login',
		state: {
			updating: false,
			dead: true,
		},
		api: createApi<InternalLoginApi>(config.local, 'api-internal-login', config.token),
	},
];

export const adminServer = config.adminLocal && !args.admin ? {
	id: 'admin',
	api: createApi<InternalAdminApi>(config.adminLocal, 'api-internal-admin', config.token),
} : undefined;

export const servers: InternalGameServerState[] = [];

if (args.login || args.admin) {
	servers.push(...gameServers.map(s => ({
		id: s.id,
		state: {
			...s,
			offline: true,
			dead: true,
			maps: 0,
			online: 0,
			onMain: 0,
			queued: 0,
			shutdown: false,
			filter: false,
			settings: {},
		},
		api: createApi<InternalApi>(s.local, 'api-internal', config.token),
	})));
}

export function findServer(id: string) {
	return findById(servers, id);
}

export function getLoginServer(_id: string) {
	return loginServers[0];
}

export function getServer(id: string) {
	const server = findServer(id);

	if (!server) {
		throw new Error(`Invalid server ID (${id})`);
	}

	return server;
}

export function createApi<T extends {}>(host: string, url: string, apiToken: string): T {
	return new Proxy<T>({} as any, {
		get: (_, key) =>
			(...args: any[]) =>
				Promise.resolve<T>(request(`http://${host}/${url}/api`, {
					json: true,
					headers: { 'api-token': apiToken },
					method: 'post',
					body: { method: key, args },
				})),
	});
}

function mapGameServers<T>(action: (server: InternalGameServerState) => Promise<T> | T) {
	return Promise.all(servers.filter(s => !s.state.dead).map(action));
}

export function createJoin(): typeof join {
	return join;
}

async function join(joinServer: InternalGameServerState, account: IAccount, character: ICharacter): Promise<string> {
	try {
		const kicked = await mapGameServers(s => {
			if (isMod(account) && s !== joinServer) {
				return false;
			} else {
				return s.api.kick(account._id.toString(), undefined).catch(e => (logger.error(e), false));
			}
		});

		if (kicked.some(x => x)) {
			await delay(2000);
		}

		return await joinServer.api.join(account._id.toString(), character._id.toString());
	} catch (error) {
		if (error.error && error.error.userError) {
			throw new UserError(error.error.error);
		} else {
			logger.error(error);
			throw new Error('Internal error');
		}
	}
}

let accountChangedHandler = (_accountId: string) => Promise.resolve();

export function init(world: World, tokens: TokenService) {
	accountChangedHandler = createAccountChanged(world, tokens, findAccountSafe);
}

export async function accountChanged(accountId: string) {
	if (args.login || args.admin) {
		await mapGameServers(s => {
			s.api.accountChanged(accountId).catch(noop);
		});
	} else {
		await accountChangedHandler(accountId);
	}
}

export async function accountMerged(accountId: string, mergedId: string) {
	await mapGameServers(s => { s.api.accountMerged(accountId, mergedId).catch(noop); });
}

export async function accountStatus(accountId: string) {
	const statuses = await mapGameServers(s => s.api.accountStatus(accountId).catch(() => ({ online: false })));
	return statuses.filter(s => !!s.online);
}

export async function accountAround(accountId: string) {
	const users = await mapGameServers(s => s.api.accountAround(accountId).catch(() => []));
	return flatten(users).sort((a, b) => a.distance - b.distance).slice(0, 10);
}

export async function accountHidden(accountId: string): Promise<HidingStats> {
	const [users, permaHidden, permaHiddenBy] = await Promise.all([
		mapGameServers(s => s.api.accountHidden(accountId).catch(() => ({ account: '', hidden: [], hiddenBy: [] }))),
		findHideIds(accountId),
		findHideIdsRev(accountId),
	]);

	return {
		account: accountId,
		hidden: uniq(flatMap(users, u => u.hidden)),
		hiddenBy: uniq(flatMap(users, u => u.hiddenBy)),
		permaHidden,
		permaHiddenBy,
	};
}

export type RemovedDocument = ReturnType<typeof createRemovedDocument>;

export const createRemovedDocument =
	(endPoints: EndPoints | undefined, adminService: AdminService | undefined) =>
		(model: 'events' | 'ponies' | 'accounts' | 'auths' | 'origins', id: string) => {
			endPoints && model in endPoints && (endPoints as any)[model].removedItem(id);
			adminService && adminService.removedItem(model, id);
			return adminServer ? adminServer.api.removedDocument(model, id).catch(noop) : Promise.resolve();
		};
