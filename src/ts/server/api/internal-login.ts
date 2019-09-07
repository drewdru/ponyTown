import { Settings, LoginServerStatus, InternalLoginApi, ServerLiveSettings } from '../../common/adminInterfaces';
import { StatsTracker } from '../stats';
import { RemovedDocument } from '../internal';
import { createReloadSettings } from './internal-common';
import { mergeAccounts } from './merge';

export function createLoginServerStatus(settings: Settings, live: ServerLiveSettings): LoginServerStatus {
	return {
		canCreateAccounts: !!settings.canCreateAccounts,
		isPageOffline: !!settings.isPageOffline,
		blockWebView: !!settings.blockWebView,
		reportPotentialDuplicates: !!settings.reportPotentialDuplicates,
		autoMergeDuplicates: !!settings.autoMergeDuplicates,

		suspiciousNames: settings.suspiciousNames || '',
		suspiciousAuths: settings.suspiciousAuths || '',
		suspiciousPonies: settings.suspiciousPonies || '',
		suspiciousMessages: settings.suspiciousMessages || '',
		suspiciousSafeMessages: settings.suspiciousSafeMessages || '',
		suspiciousSafeWholeMessages: settings.suspiciousSafeWholeMessages || '',
		suspiciousSafeInstantMessages: settings.suspiciousSafeInstantMessages || '',
		suspiciousSafeInstantWholeMessages: settings.suspiciousSafeInstantWholeMessages || '',

		updating: live.updating,
		dead: false,
	};
}

export const createLoginServerState =
	(settings: Settings, live: ServerLiveSettings) =>
		async () =>
			createLoginServerStatus(settings, live);

export const createLoginServerStats =
	(statsTracker: StatsTracker) =>
		async () =>
			statsTracker.getStats();

export const createUpdateLiveSettings =
	(liveSettings: ServerLiveSettings) =>
		async (update: Partial<ServerLiveSettings>) => {
			Object.assign(liveSettings, update);
		};

export const createInternalLoginApi =
	(
		settings: Settings, live: ServerLiveSettings, statsTracker: StatsTracker,
		reloadSettings: () => Promise<void>, removedDocument: RemovedDocument,
	): InternalLoginApi =>
		({
			reloadSettings: createReloadSettings(reloadSettings),
			state: createLoginServerState(settings, live),
			loginServerStats: createLoginServerStats(statsTracker),
			updateLiveSettings: createUpdateLiveSettings(live),
			mergeAccounts: async (id, withId, reason, allowAdmin, creatingDuplicates) => {
				if (live.shutdown) {
					throw new Error(`Cannot merge while server is shutdown`);
				}

				await mergeAccounts(id, withId, reason, removedDocument, allowAdmin, creatingDuplicates);
			},
		});
