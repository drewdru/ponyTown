import { PonyObject, PonyInfoNumber } from '../../common/interfaces';
import { CharacterFlags } from '../../common/adminInterfaces';
import { cleanName, validatePonyName } from '../../client/clientUtils';
import { Reporter, LogAccountMessage } from '../serverInterfaces';
import { toPonyObject } from '../serverUtils';
import { isForbiddenName } from '../../common/security';
import { colorToHexRGB } from '../../common/color';
import { IAccount, FindCharacter, FindAuth, CharacterCount, ID, CreateCharacter, ICharacter } from '../db';
import { isBadCM } from '../cmUtils';
import { UserError } from '../userError';
import { CHARACTER_SAVING_ERROR, CHARACTER_LIMIT_ERROR } from '../../common/errors';
import { decompressPony, compressPony } from '../../common/compressPony';
import { getCharacterLimit } from '../accountUtils';
import { PLAYER_DESC_MAX_LENGTH } from '../../common/constants';

function colorToText(c: number): string {
	return c ? colorToHexRGB(c) : '';
}

export type UpdateCharacterCount = (accountId: ID) => Promise<void>;
export type RemoveCharacter = (ponyId: string, accountId: string) => Promise<ICharacter | undefined>;
export type SavePony = ReturnType<typeof createSavePony>;
export type RemovePony = ReturnType<typeof createRemovePony>;

export const createSavePony =
	(
		findCharacter: FindCharacter, findAuth: FindAuth, characterCount: CharacterCount,
		updateCharacterCount: UpdateCharacterCount, createCharacter: CreateCharacter, log: LogAccountMessage,
		isSuspiciousName: (name: string) => boolean, isSuspiciousPony: (info: PonyInfoNumber) => boolean,
	) =>
		async (account: IAccount, data: Partial<PonyObject> | undefined, reporter: Reporter): Promise<PonyObject | null> => {
			if (!data || !data.info || typeof data.name !== 'string') {
				throw new UserError('Invalid data', { data });
			}

			const originalName = data.name;
			data.name = cleanName(data.name);

			if (!validatePonyName(data.name)) {
				throw new UserError('Invalid name', { desc: JSON.stringify(originalName), data });
			}

			let [character, auth] = await Promise.all([
				data.id ? findCharacter(data.id, account._id) : undefined,
				data.site ? findAuth(data.site, account._id, '_id') : undefined,
			]).catch(error => {
				throw new UserError('Invalid data', { error, data });
			});

			let suspicious: string[] = [];
			let created = false;
			let nameChanged = false;
			let oldName: string | undefined;

			try {
				if (!character) {
					character = createCharacter(account);
					created = true;
				}

				const deco = decompressPony(data.info);
				const info = compressPony(deco);

				// if (data.info !== info) {
				// 	reporter.danger(`Pony info does not match after re-compression`, `original: ${data.info}\nre-compressed: ${info}`);
				// }

				const badCM = isBadCM(deco.cm && deco.cm.map(colorToText) || [], colorToHexRGB(deco.coatFill!));
				const forbiddenName = isForbiddenName(data.name);
				const flags =
					(badCM ? CharacterFlags.BadCM : 0) |
					(data.hideSupport ? CharacterFlags.HideSupport : 0) |
					(data.respawnAtSpawn ? CharacterFlags.RespawnAtSpawn : 0) |
					(forbiddenName ? CharacterFlags.ForbiddenName : 0);

				nameChanged = character.name !== data.name;
				oldName = character.name;

				if (nameChanged && isSuspiciousName(data.name)) {
					suspicious.push('name');
				}

				if (character.info !== data.info && isSuspiciousPony(deco)) {
					suspicious.push('look');
				}

				character.desc = typeof data.desc === 'string' ? data.desc.substr(0, PLAYER_DESC_MAX_LENGTH) : '';
				character.name = data.name;
				character.tag = data.tag;
				character.site = auth ? auth._id : null;
				character.info = info;
				character.flags = flags;
				character.lastUsed = new Date();
			} catch (error) {
				const message = DEVELOPMENT ? `${CHARACTER_SAVING_ERROR} (${error})` : CHARACTER_SAVING_ERROR;
				throw new UserError(message, { error, data: { pony: data }, desc: `info: "${data.info}"` });
			}

			const count = created ? await characterCount(account._id) : 0;

			if (count >= getCharacterLimit(account)) {
				throw new UserError(CHARACTER_LIMIT_ERROR);
			}

			await character.save();

			if (created) {
				await updateCharacterCount(account._id);
			}

			if (suspicious.length) {
				reporter.setPony(character._id.toString());
				reporter.warn('Suspicious pony created', `"${character.name}" (${suspicious.join(', ')})`);
			}

			if (created) {
				log(account._id, `created pony "${character.name}"`);
			} else if (nameChanged) {
				log(account._id, `renamed pony "${oldName}" => "${character.name}"`);
			}

			return toPonyObject(character);
		};

export const createRemovePony =
	(
		kickFromAllServersByCharacter: (ponyId: string) => void,
		removeCharacter: RemoveCharacter,
		updateCharacterCount: UpdateCharacterCount,
		removedCharacter: (ponyId: string) => void,
		logRemovedCharacter: (character: ICharacter) => void,
	) =>
		async (ponyId: unknown, accountId: string) => {
			if (!ponyId || typeof ponyId !== 'string') {
				throw new Error(`Invalid ponyId (${ponyId})`);
			}

			await kickFromAllServersByCharacter(ponyId);
			const character = await removeCharacter(ponyId, accountId);
			await updateCharacterCount(accountId);

			if (character) {
				logRemovedCharacter(character);
				removedCharacter(ponyId);
			}

			return {};
		};
