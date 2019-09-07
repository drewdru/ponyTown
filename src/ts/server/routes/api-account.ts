import { Router } from 'express';
import { offline as createOffline, validAccount as createValidAccount, hash, wrap, limit } from '../requestUtils';
import {
	createUpdateAccount, createRemoveSite, createUpdateSettings, createGetAccountCharacters, removeHide, getHides, getFriends
} from '../api/account';
import { findAccountSafe, findAuth, findAllCharacters, countAllVisibleAuths, IAccount } from '../db';
import { system } from '../logger';
import { Settings, ServerConfig } from '../../common/adminInterfaces';

export default function (server: ServerConfig, settings: Settings) {
	const validAccount = createValidAccount(server);
	const offline = createOffline(settings);
	const app = Router();

	const getAccountCharacters = createGetAccountCharacters(findAllCharacters);
	const updateAccount = createUpdateAccount(findAccountSafe, system);
	const updateSettings = createUpdateSettings(findAccountSafe);
	const removeSite = createRemoveSite(findAuth, countAllVisibleAuths, system);

	app.post('/account-characters', offline, hash, validAccount, limit(60, 60), wrap(server, req =>
		getAccountCharacters(req.user as IAccount)));
	app.post('/account-update', offline, hash, validAccount, limit(60, 60), wrap(server, req =>
		updateAccount(req.user as IAccount, req.body.account)));
	app.post('/account-settings', offline, hash, validAccount, limit(60, 60), wrap(server, req =>
		updateSettings(req.user as IAccount, req.body.settings)));
	app.post('/remove-site', offline, hash, validAccount, limit(60, 60), wrap(server, req =>
		removeSite(req.user as IAccount, req.body.siteId)));
	app.post('/remove-hide', offline, hash, validAccount, limit(60, 60), wrap(server, req =>
		removeHide(req.user as IAccount, req.body.hideId)));
	app.post('/get-hides', offline, hash, validAccount, limit(60, 60), wrap(server, req =>
		getHides(req.user as IAccount, req.body.page || 0)));
	app.post('/get-friends', offline, hash, validAccount, limit(120, 60), wrap(server, req =>
		getFriends(req.user as IAccount)));

	return app;
}
