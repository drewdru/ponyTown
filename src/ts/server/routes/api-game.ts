import { Router } from 'express';
import { limit, offline as createOffline, wrap, validAccount as createValidAccount, hash } from '../requestUtils';
import { createJoinGame, Config } from '../api/game';
import { findServer } from '../internal';
import { findCharacter, hasActiveSupporterInvites, IAccount } from '../db';
import { createJoin } from '../internal';
import { Settings, ServerConfig } from '../../common/adminInterfaces';
import { getOrigin, addOrigin } from '../originUtils';

export default function (server: ServerConfig, settings: Settings, config: Config) {
	const offline = createOffline(settings);
	const validAccount = createValidAccount(server);
	const join = createJoin();
	const app = Router();

	let inQueue = 0;

	const joinGame = createJoinGame(findServer, config, findCharacter, join, addOrigin, hasActiveSupporterInvites);

	app.post('/game/join', offline, limit(60, 5 * 60), hash, validAccount, wrap(server, async req => {
		if (inQueue > 100) {
			return {};
		} else {
			try {
				inQueue++;
				const { ponyId, serverId, version, url, alert } = req.body;
				return await joinGame(req.user as IAccount, ponyId, serverId, version, url, alert, getOrigin(req));
			} finally {
				inQueue--;
			}
		}
	}));

	return app;
}
