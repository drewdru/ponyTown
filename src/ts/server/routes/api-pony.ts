import { Router } from 'express';
import { offline as createOffline, validAccount as createValidAccount, hash, wrap } from '../requestUtils';
import { createFromRequest } from '../reporter';
import { createSavePony, createRemovePony } from '../api/pony';
import { findAuth, findCharacter, characterCount, createCharacter, removeCharacter, IAccount } from '../db';
import { updateCharacterCount } from '../accountUtils';
import { system } from '../logger';
import { kickFromAllServersByCharacter } from '../api/admin';
import { createIsSuspiciousName, createIsSuspiciousPony } from '../../common/security';
import { Settings, ServerConfig } from '../../common/adminInterfaces';
import { RemovedDocument } from '../internal';
import { logRemovedCharacter } from '../characterUtils';

export default function (server: ServerConfig, settings: Settings, removedDocument: RemovedDocument) {
	const offline = createOffline(settings);
	const validAccount = createValidAccount(server);
	const app = Router();

	const isSuspiciousName = createIsSuspiciousName(settings);
	const isSuspiciousPony = createIsSuspiciousPony(settings);

	const savePonyHandler = createSavePony(
		findCharacter, findAuth, characterCount, updateCharacterCount, createCharacter, system,
		isSuspiciousName, isSuspiciousPony);

	const removePonyHandler = createRemovePony(
		kickFromAllServersByCharacter, removeCharacter, updateCharacterCount,
		id => removedDocument('ponies', id), logRemovedCharacter);

	app.post('/pony/save', offline, hash, validAccount, wrap(server, req =>
		savePonyHandler(req.user as IAccount, req.body.pony, createFromRequest(server, req))));

	app.post('/pony/remove', offline, hash, validAccount, wrap(server, req =>
		removePonyHandler(req.body.id, (req.user as IAccount).id)));

	return app;
}
