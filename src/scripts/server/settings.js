"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const utils_1 = require("../common/utils");
const paths = require("./paths");
const defaultSettings = {
    canCreateAccounts: true,
    servers: {},
};
exports.settings = utils_1.cloneDeep(defaultSettings);
const settingsPath = paths.pathTo('settings', `settings.json`);
/* istanbul ignore next */
async function loadSettings() {
    try {
        const json = await fs_1.readFileAsync(settingsPath, 'utf8');
        return JSON.parse(json);
    }
    catch (_a) {
        return {};
    }
}
exports.loadSettings = loadSettings;
/* istanbul ignore next */
async function saveSettings(settings) {
    const json = JSON.stringify(settings, undefined, 2);
    await fs_1.writeFileAsync(settingsPath, json, 'utf8');
}
exports.saveSettings = saveSettings;
/* istanbul ignore next */
async function updateSettings(update) {
    let settings = Object.assign({}, defaultSettings);
    try {
        settings = await loadSettings();
    }
    catch (_a) { }
    Object.assign(settings, update);
    await saveSettings(settings);
}
exports.updateSettings = updateSettings;
/* istanbul ignore next */
async function reloadSettings() {
    try {
        const current = await loadSettings();
        Object.assign(exports.settings, current);
    }
    catch (_a) { }
}
exports.reloadSettings = reloadSettings;
//# sourceMappingURL=settings.js.map