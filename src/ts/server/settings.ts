import { readFileAsync, writeFileAsync } from 'fs';
import { Settings } from '../common/adminInterfaces';
import { cloneDeep } from '../common/utils';
import * as paths from './paths';

const defaultSettings: Settings = {
	canCreateAccounts: true,
	servers: {},
};

export const settings: Settings = cloneDeep(defaultSettings);

const settingsPath = paths.pathTo('settings', `settings.json`);

/* istanbul ignore next */
export async function loadSettings() {
	try {
		const json = await readFileAsync(settingsPath, 'utf8');
		return JSON.parse(json) as Settings;
	} catch {
		return {} as Settings;
	}
}

/* istanbul ignore next */
export async function saveSettings(settings: Settings) {
	const json = JSON.stringify(settings, undefined, 2);
	await writeFileAsync(settingsPath, json, 'utf8');
}

/* istanbul ignore next */
export async function updateSettings(update: Partial<Settings>) {
	let settings = { ...defaultSettings };

	try {
		settings = await loadSettings();
	} catch { }

	Object.assign(settings, update);
	await saveSettings(settings);
}

/* istanbul ignore next */
export async function reloadSettings() {
	try {
		const current = await loadSettings();
		Object.assign(settings, current);
	} catch { }
}
