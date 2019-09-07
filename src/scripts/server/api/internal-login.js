"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const internal_common_1 = require("./internal-common");
const merge_1 = require("./merge");
function createLoginServerStatus(settings, live) {
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
exports.createLoginServerStatus = createLoginServerStatus;
exports.createLoginServerState = (settings, live) => async () => createLoginServerStatus(settings, live);
exports.createLoginServerStats = (statsTracker) => async () => statsTracker.getStats();
exports.createUpdateLiveSettings = (liveSettings) => async (update) => {
    Object.assign(liveSettings, update);
};
exports.createInternalLoginApi = (settings, live, statsTracker, reloadSettings, removedDocument) => ({
    reloadSettings: internal_common_1.createReloadSettings(reloadSettings),
    state: exports.createLoginServerState(settings, live),
    loginServerStats: exports.createLoginServerStats(statsTracker),
    updateLiveSettings: exports.createUpdateLiveSettings(live),
    mergeAccounts: async (id, withId, reason, allowAdmin, creatingDuplicates) => {
        if (live.shutdown) {
            throw new Error(`Cannot merge while server is shutdown`);
        }
        await merge_1.mergeAccounts(id, withId, reason, removedDocument, allowAdmin, creatingDuplicates);
    },
});
//# sourceMappingURL=internal-login.js.map