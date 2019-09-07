import * as fs from 'fs';
import * as moment from 'moment';
import {
	AdminState, eventFields, BaseValues, UpdateOrigin, UserCountStats, AccountDetails, SupporterInvite,
	InternalGameServerState, InternalLoginServerState, OtherStats, Settings, GameServerSettings
} from '../../common/adminInterfaces';
import { execAsync } from '../serverUtils';
import {
	IAccount, Account, Origin, Event, iterate, ISession, Session, SupporterInvite as DBSupporterInvite,
	findAccount, ISupporterInvite, ID
} from '../db';
import { servers, serverStatus, loginServers } from '../internal';
import { encodeEvent, BaseTimes, getBaseDate, getBaseTimes } from '../adminEncoders';
import { createLiveEndPoint, LiveEndPoint } from '../liveEndPoint';
import * as paths from '../paths';
import { logger } from '../logger';
import { AdminService } from '../services/adminService';
import { loadSettings, saveSettings } from '../settings';
import { flatten } from '../../common/utils';

function encodeItems<T>(items: T[], base: BaseValues, encode: (items: T, base: BaseTimes) => any[]): any[][] {
	const baseValues = getBaseTimes(base);
	return items.map(i => encode(i, baseValues));
}

const events = createLiveEndPoint({
	model: Event,
	fields: eventFields,
	encode(items, base) {
		base.createdAt = getBaseDate(items, i => i.createdAt!);
		base.updatedAt = getBaseDate(items, i => i.updatedAt);
		return encodeItems(items, base, encodeEvent);
	},
});

export interface EndPoints {
	events: LiveEndPoint;
}

export function createEndPoints(): EndPoints {
	return { events };
}

export function getAdminState(): AdminState {
	return {
		status: serverStatus,
		loginServers: loginServers.map(s => s.state),
		gameServers: servers.map(s => s.state),
	};
}

async function forAllLoginServers(
	action: (server: InternalLoginServerState) => any, filter = (_: InternalLoginServerState) => true
) {
	await Promise.all(loginServers.filter(filter).map(action));
}

export async function forAllGameServers(
	action: (server: InternalGameServerState) => any, filter = (_: InternalGameServerState) => true
) {
	const liveServers = servers.filter(s => !s.state.dead);
	await Promise.all(liveServers.filter(filter).map(action));
}

export function actionForAllServers(action: string, accountId: string) {
	return forAllGameServers(s => s.api.action(action, accountId));
}

export function kickFromAllServers(accountId: string) {
	return forAllGameServers(s => s.api.kick(accountId, undefined));
}

export function kickFromAllServersByCharacter(characterId: string) {
	return forAllGameServers(s => s.api.kick(undefined, characterId));
}

function createFilter(id: string) {
	return (server: { id: string; }) => id === '*' || server.id === id;
}

export async function notifyUpdate(server: string) {
	await Promise.all([
		forAllLoginServers(s => s.api.updateLiveSettings({ updating: true }), createFilter(server)),
		forAllGameServers(s => s.api.notifyUpdate(), createFilter(server)),
	]);
}

export function shutdownServers(server: string, value: boolean) {
	return forAllGameServers(s => s.api.shutdownServer(value), createFilter(server));
}

export async function resetUpdating(server: string) {
	await Promise.all([
		forAllLoginServers(s => s.api.updateLiveSettings({ updating: false }), createFilter(server)),
		forAllGameServers(s => s.api.cancelUpdate(), createFilter(server)),
		shutdownServers(server, false),
	]);
}

export async function reloadSettingsOnAllServers() {
	await Promise.all([
		forAllLoginServers(s => s.api.reloadSettings()),
		forAllGameServers(s => s.api.reloadSettings()),
	]);
}

export async function getChat(search: string, date: string, caseInsensitive: boolean) {
	const query = search
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\./g, '\\.')
		.replace(/\*/g, '\\*')
		.replace(/\$/g, '\\*')
		.replace(/\^/g, '\\*');
	const flags = caseInsensitive ? '-i -E ' : '-E ';
	const options = { maxBuffer: 1 * 1024 * 1024 }; // 1MB

	async function fetchChatlog(lines: number) {
		const logFile = paths.pathTo('logs', `info.${moment(date).format('YYYYMMDD')}.log`);
		const { stdout } = await execAsync(`grep ${flags}"${query}" "${logFile}" | tail -n ${lines}`, options);
		return stdout;
	}

	try {
		if (!search) {
			return '';
		} else if (date === 'all') {
			const { stdout } = await execAsync(`for f in ${paths.pathTo('logs')}/*.log; do `
				+ `echo "$f" | grep -o '[0-9]*';`
				+ `cat "$f" | grep ${flags}"${query}";`
				+ `done`, options);
			return stdout;
		} else {
			let lines = 8192;
			let more = '';

			do {
				try {
					const log = await fetchChatlog(lines);
					return more + log;
				} catch (e) {
					if (e.message !== 'stdout maxBuffer exceeded') {
						throw e;
					}
				}

				lines /= 2;
				more = '... more lines ...\n';
			} while (lines > 1);

			return '<error size exceeded>';
		}
	} catch (e) {
		console.error('Failed to fetch chatlog: ', e);
		return '<error>';
	}
}

export async function getChatForAccounts(accountIds: string[], date: string) {
	const accounts: Partial<IAccount>[] = await Account.find({ _id: { $in: accountIds } }, '_id merges').lean().exec();
	const map = new Map<string, string>();
	const ids = flatten(accounts.map(a => [a._id.toString(), ...(a.merges || []).map(a => a.id)]));

	for (const a of accounts) {
		const index = accountIds.indexOf(a._id.toString());
		map.set(a._id.toString(), index ? `[${index}]` : ``);

		(a.merges || []).forEach(({ id }) => {
			map.set(id, index ? `[${index}:merged]` : `[merged]`);
		});
	}

	const chat = await getChat(ids.join('|'), date, false);
	const fixed = chat.replace(/^([0-9:]+) \[([a-f0-9]{24})\]/gmu, (_, date, id) =>
		`${date} ${map.has(id) ? map.get(id) : `[${id}]`}`);

	return fixed;
}

export async function clearSessions(accountId: string) {
	const clearIds: string[] = [];

	await iterate<ISession>(Session.find({ session: { $exists: true } }).lean() as any, session => {
		try {
			if (session.session) {
				const data = JSON.parse(session.session);
				const user = data && data.passport && data.passport.user;

				if (user === accountId) {
					clearIds.push(session._id);
				}
			}
		} catch (e) {
			logger.error('Error when claring session', e, session._id, session.session);
		}
	});

	await Session.deleteOne({ _id: { $in: clearIds } }).exec();
}

export async function updateOrigin(update: UpdateOrigin) {
	await Origin.updateOne({ ip: update.ip }, update, { upsert: true }).exec();
}

export async function getUserCounts(): Promise<UserCountStats[]> {
	const statsFile = paths.pathTo('settings', `user-counts.log`);

	try {
		const content = await fs.readFileAsync(statsFile, 'utf8');
		const lines = content.trim().split(/\n/);
		return lines.map(line => JSON.parse(line));
	} catch {
		return [];
	}
}

function convertInvite(invite: ISupporterInvite): SupporterInvite {
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

export async function getAccountDetails(accountId: ID): Promise<AccountDetails> {
	const [account, invitesReceived, invitesSent] = await Promise.all([
		findAccount(accountId, 'merges supporterLog banLog state'),
		DBSupporterInvite.find({ target: accountId }).exec(),
		DBSupporterInvite.find({ source: accountId }).exec(),
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

export async function getOtherStats(service: AdminService): Promise<OtherStats> {
	let totalIgnores = 0;
	let authsWithEmptyAccount = 0;
	let authsWithMissingAccount = 0;

	for (const account of service.accounts.items) {
		totalIgnores += account.ignoresCount!;
	}

	for (const auth of service.auths.items) {
		if (!auth.account) {
			authsWithEmptyAccount++;
		} else if (!service.accounts.get(auth.account)) {
			authsWithMissingAccount++;
		}
	}

	return {
		totalIgnores,
		authsWithEmptyAccount,
		authsWithMissingAccount,
	};
}

export async function updateServerSettings(currentSettings: Settings, update: Partial<Settings>) {
	const settings = await Promise.resolve(loadSettings());
	Object.assign(currentSettings, settings, update);

	await saveSettings(currentSettings);
	await reloadSettingsOnAllServers();
}

export async function updateGameServerSettings(
	currentSettings: Settings, serverId: string, update: Partial<GameServerSettings>
) {
	const settings = await Promise.resolve(loadSettings());
	Object.assign(currentSettings, settings);

	const serverSettings = currentSettings.servers[serverId] = currentSettings.servers[serverId] || {};
	Object.assign(serverSettings, update);

	await saveSettings(currentSettings);
	await reloadSettingsOnAllServers();
}

