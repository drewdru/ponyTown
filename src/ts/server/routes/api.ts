import { Router } from 'express';
import { auth } from '../requestUtils';
import { Settings, ServerConfig } from '../../common/adminInterfaces';
import { RemovedDocument } from '../internal';
import { Config } from '../api/game';
import apiAccount from './api-account';
import apiPony from './api-pony';
import apiGame from './api-game';

export default function (server: ServerConfig, settings: Settings, config: Config, removedDocument: RemovedDocument) {
	const app = Router();

	app.use(auth);

	app.use(apiAccount(server, settings));
	app.use(apiPony(server, settings, removedDocument));
	app.use(apiGame(server, settings, config));

	return app;
}
