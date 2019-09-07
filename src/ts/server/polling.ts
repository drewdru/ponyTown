import * as fs from 'fs';
import * as Bluebird from 'bluebird';
import {
	InternalGameServerState, BannedMuted, Settings, ServerConfig, InternalLoginServerState, SupporterFlags
} from '../common/adminInterfaces';
import { fromNow, delay } from '../common/utils';
import { logger, logPatreon, system, logPerformance } from './logger';
import { Auth, updateAccounts, updateAccount, queryAuths, queryAccounts, updateAuth, Account, SupporterInvite } from './db';
import { getDiskSpace, getCertificateExpirationDate, getMemoryUsage } from './serverUtils';
import { HOUR, MINUTE, DAY, SECOND, YEAR } from '../common/constants';
import {
	fetchPatreonData, createPatreonClient, createUpdatePatreonInfo, createRemoveOldSupporters,
	createUpdateSupporters, createAddTotalPledged
} from './patreon';
import { create } from './reporter';
import { servers, serverStatus, loginServers, RemovedDocument } from './internal';
import * as paths from './paths';
import { updateSupporterInvites } from './services/supporterInvites';
import { AdminService } from './services/adminService';
import { clearOrigins } from './api/origins';
import { config } from './config';

let updatingPatreonPromise: Promise<void> | undefined;

async function updatePatreonDataInternal(server: ServerConfig, accessToken: string) {
	try {
		const removeOldSupporters = createRemoveOldSupporters(updateAccounts, system);
		const updateSupporters = createUpdateSupporters(updateAccount, system);
		const addTotalPledged = createAddTotalPledged(updateAuth);
		const updatePatreonInfo = createUpdatePatreonInfo(
			queryAuths, queryAccounts, removeOldSupporters, updateSupporters, addTotalPledged);

		const client = createPatreonClient(accessToken);
		const data = await fetchPatreonData(client, logPatreon);
		await updatePatreonInfo(data, new Date());

		serverStatus.lastPatreonUpdate = (new Date()).toISOString();
	} catch (e) {
		const message = e.error ? (e.error.message || e.error.statusText || `${e}`) : e.message;
		const stack = (e.error ? e.error.stack : e.stack) || '';
		create(server).danger('Patreon update failed', `${message}\n${stack}`.trim());
		logger.error(e);
	} finally {
		updatingPatreonPromise = undefined;
	}
}

export async function updatePatreonData(server: ServerConfig, { patreonToken }: Settings) {
	if (patreonToken && config.supporterLink) {
		return updatingPatreonPromise = updatingPatreonPromise || updatePatreonDataInternal(server, patreonToken);
	}
}

async function clearOldIgnores() {
	const start = Date.now();
	await updateAccounts({
		ignores: { $exists: true, $not: { $size: 0 } },
		lastVisit: { $lt: fromNow(-YEAR) },
	}, { ignores: [] });
	logPerformance(`[async] clearOldIgnores (${Date.now() - start}ms)`);
}

async function cleanupBanField(field: keyof BannedMuted) {
	const start = Date.now();
	await updateAccounts({ [field]: { $exists: true, $gt: 0, $lt: Date.now() } }, { $unset: { [field]: 1 } });
	logPerformance(`[async] cleanupBanField (${field}) (${Date.now() - start}ms)`);
}

async function cleanupBans() {
	const start = Date.now();
	await cleanupBanField('ban');
	await cleanupBanField('shadow');
	await cleanupBanField('mute');
	logPerformance(`[async] cleanupBans (${Date.now() - start}ms)`);
}

async function cleanupMerges() {
	const start = Date.now();
	const date = fromNow(-30 * DAY);
	await updateAccounts({ merges: { $exists: true, $not: { $size: 0 } } }, { $pull: { merges: { date: { $lt: date } } } });
	await updateAccounts({ merges: { $exists: true, $size: 0 } }, { $unset: { merges: 1 } });
	logPerformance(`[async] cleanupMerges (${Date.now() - start}ms)`);
}

async function cleanupAccountAlerts() {
	const start = Date.now();
	await updateAccounts(
		{ alert: { $exists: true }, 'alert.expires': { $lt: new Date() } } as any,
		{ $unset: { alert: 1 } });
	logPerformance(`[async] cleanupAccountAlerts (${Date.now() - start}ms)`);
}

export async function updatePastSupporters() {
	const start = Date.now();
	const auths = await Auth.find({
		pledged: { $exists: true, $gt: 0 },
		disabled: { $ne: true },
		banned: { $ne: true }
	}, 'account').exec();

	const accounts = await Account.find({
		supporter: { $exists: true, $bitsAllSet: SupporterFlags.PastSupporter }
	}, '_id').exec();

	const shouldBeFlagged = new Set<string>();
	const areFlagged = new Set<string>();

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
				await Account.updateOne({ _id: auth.account }, { $bit: { supporter: { or: SupporterFlags.PastSupporter } } }).exec();
			}
		}
	}

	for (const account of accounts) {
		if (!shouldBeFlagged.has(account._id.toString())) {
			await Account.updateOne({ _id: account._id }, { $bit: { supporter: { and: ~SupporterFlags.PastSupporter } } }).exec();
		}
	}

	logPerformance(`[async] cleanupAccountAlerts (${Date.now() - start}ms)`);
}

const cleanupStrayAuths = (removedDocument: RemovedDocument) =>
	async () => {
		const start = Date.now();
		const date = fromNow(-1 * DAY);
		const query = { account: { $exists: false }, updatedAt: { $lt: date }, createdAt: { $lt: date } };
		const items = await queryAuths(query, '_id');
		await Auth.deleteMany(query).exec();
		await Bluebird.map(items, item => removedDocument('auths', item._id.toString()), { concurrency: 4 });
		logPerformance(`[async] cleanupAccountAlerts (${Date.now() - start}ms)`);
	};

async function updateServerState(server: InternalGameServerState | InternalLoginServerState) {
	try {
		const state = await server.api.state();
		Object.assign(server.state, state);
	} catch {
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
		const count = await Account.countDocuments({ lastVisit: { $gt: fromNow(-1 * DAY) } }).exec();
		const json = JSON.stringify({ count, date: (new Date()).toISOString() });
		await fs.appendFileAsync(statsFile, `${json}\n`, 'utf8');
		logPerformance(`[async] countUsersVisitedToday (${Date.now() - start}ms)`);
	}
}

async function mergePotentialDuplicates(service: AdminService) {
	if (loginServers[0].state.autoMergeDuplicates) {
		await service.mergePotentialDuplicates();
	}
}

export async function poll(action: () => any, delayTime: number) {
	try {
		await delay(delayTime);
		await action();
	} catch (e) {
		console.error(e);
	} finally {
		poll(action, delayTime);
	}
}

export async function pollImmediate(action: () => any, delayTime: number) {
	try {
		await action();
	} catch (e) {
		console.error(e);
	} finally {
		await delay(delayTime);
		poll(action, delayTime);
	}
}

export function pollServers() {
	return poll(() => Promise.all([...loginServers, ...servers].map(updateServerState)), 1 * SECOND);
}

export function pollPatreon(server: ServerConfig, settings: Settings) {
	return poll(() => updatePatreonData(server, settings), 10 * MINUTE);
}

export const pollDiskSpace = () => pollImmediate(() =>
	getDiskSpace().then(value => serverStatus.diskSpace = value), HOUR);
export const pollMemoryUsage = () => pollImmediate(() =>
	getMemoryUsage().then(value => serverStatus.memoryUsage = value), 10 * MINUTE);
export const pollCertificateExpirationDate = () => pollImmediate(() =>
	getCertificateExpirationDate().then(value => serverStatus.certificateExpiration = value), HOUR);

export const startBansCleanup = () => poll(cleanupBans, DAY + 10 * MINUTE);
export const startMergesCleanup = () => poll(cleanupMerges, DAY + 15 * MINUTE);
export const startStrayAuthsCleanup = (removedDocument: RemovedDocument) =>
	poll(cleanupStrayAuths(removedDocument), DAY + 35 * MINUTE);
export const startClearOldIgnores = () => poll(clearOldIgnores, DAY + 20 * MINUTE);
export const startCollectingUsersVisitedCount = () => poll(countUsersVisitedToday, 10 * MINUTE);
export const startSupporterInvitesCleanup = () => poll(() => updateSupporterInvites(SupporterInvite), HOUR);
export const startPotentialDuplicatesCleanup = (service: AdminService) =>
	poll(() => mergePotentialDuplicates(service), 10 * MINUTE);
export const startAccountAlertsCleanup = () => poll(cleanupAccountAlerts, DAY + 25 * MINUTE);
export const startUpdatePastSupporters = () => poll(updatePastSupporters, DAY + 30 * MINUTE);

export function startClearTo10Origns(adminService: AdminService) {
	return poll(async () => {
		if (adminService.loaded) {
			const start = Date.now();
			await clearOrigins(adminService, 10, true, { old: false, singles: true, trim: true });
			logPerformance(`[async] startClearTo10Origns (${Date.now() - start}ms)`);
		}
	}, DAY + 35 * MINUTE);
}

export function startClearVeryOldOrigns(adminService: AdminService) {
	return poll(async () => {
		if (adminService.loaded) {
			const start = Date.now();
			await clearOrigins(adminService, 1, true, { old: true, singles: false, trim: false });
			logPerformance(`[async] startClearVeryOldOrigns (${Date.now() - start}ms)`);
		}
	}, DAY + 50 * MINUTE);
}
