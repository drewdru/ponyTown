import * as Bluebird from 'bluebird';
import { escapeRegExp } from 'lodash';
import { FindPonyQuery } from '../../common/adminInterfaces';
import { updateCharacterCount, getCharacterLimit } from '../accountUtils';
import { Character, findAccountSafe, ICharacter } from '../db';
import { RemovedDocument } from '../internal';
import { MINUTE } from '../../common/constants';
import { cached } from '../serverUtils';
import { logRemovedCharacter } from '../characterUtils';
import { kickFromAllServersByCharacter } from './admin';
import { AdminService } from '../services/adminService';

const ITEMS_PER_PAGE = 20;
const ITEMS_LIMIT = 1000;
const CACHE_TIMEOUT = 10 * MINUTE;

function createQuery({ search }: FindPonyQuery) {
	const and: any[] = [];

	if (search) {
		if (search === 'orphan') {
			and.push({ account: { $exists: false } });
		} else if (/^exact:/.test(search)) {
			and.push({ name: new RegExp(`^${escapeRegExp(search.substr(6))}$`, 'i') });
		} else {
			and.push({ name: new RegExp(escapeRegExp(search), 'i') });
		}
	}

	return and.length === 0 ? {} : (and.length === 1 ? and[0] : { $and: and });
}

async function getPonyIds(query: FindPonyQuery) {
	const items: ICharacter[] = await Character
		.find(createQuery(query), '_id')
		.sort(query.orderBy || 'createdAt')
		.limit(ITEMS_LIMIT)
		.lean()
		.exec();

	return items.map(i => i._id.toString());
}

const cachedGetPonyIds = cached(getPonyIds, CACHE_TIMEOUT);

export async function findPonies(query: FindPonyQuery, page: number) {
	const from = page * ITEMS_PER_PAGE;
	const ids = await cachedGetPonyIds(query);
	const idsOnPage = ids.slice(from, from + ITEMS_PER_PAGE);

	return {
		items: idsOnPage,
		totalCount: ids.length
	};
}

export async function assignCharacter(characterId: string, accountId: string) {
	const character = await Character.findById(characterId).exec();

	if (!character)
		return;

	await kickFromAllServersByCharacter(characterId);
	await Character.updateOne({ _id: characterId }, { account: accountId }).exec();
	await Promise.all([
		updateCharacterCount(character.account),
		updateCharacterCount(accountId),
	]);
}

export async function removeCharacter(service: AdminService, characterId: string) {
	const character = await Character.findById(characterId).exec();

	if (!character)
		return;

	await kickFromAllServersByCharacter(characterId);
	await character.remove();
	await updateCharacterCount(character.account);
	logRemovedCharacter(character);
	service.ponies.removed(characterId);
}

async function removeCharacters(character: ICharacter[], accountId: string, removedDocument: RemovedDocument) {
	await Bluebird.map(character, async c => {
		await c.remove();
		await removedDocument('ponies', c._id.toString());
		logRemovedCharacter(c);
	}, { concurrency: 4 });

	await updateCharacterCount(accountId);
}

export async function removeCharactersAboveLimit(removedDocument: RemovedDocument, accountId: string) {
	const [account, items] = await Promise.all([
		findAccountSafe(accountId),
		Character.find({ account: accountId }).sort({ lastUsed: -1 }).exec(),
	]);

	const limited = items.slice(getCharacterLimit(account));
	await removeCharacters(limited, accountId, removedDocument);
}

export async function removeAllCharacters(removedDocument: RemovedDocument, accountId: string) {
	const items = await Character.find({ account: accountId }).sort({ lastUsed: -1 }).exec();
	await removeCharacters(items, accountId, removedDocument);
}

export async function createCharacter(account: string, name: string, info: string) {
	await Character.create({ account, name, info });
	await updateCharacterCount(account);
}
