import { repeat } from 'lodash';
import { toByteArray } from 'base64-js';
import { encodeString } from 'ag-sockets/dist/utf8';
import { PonyOptions, EntityState, UpdateFlags } from '../common/interfaces';
import { ICharacter, IAccount, Character, MongoQuery, queryCharacter } from './db';
import { isForbiddenName } from '../common/security';
import { supporterLevel } from '../common/adminUtils';
import { CharacterFlags, CharacterState, ServerConfig, CharacterStateFlags } from '../common/adminInterfaces';
import { hasFlag, randomPoint, bitmask, last, computeCRC } from '../common/utils';
import { log, systemMessage, logger } from './logger';
import { World } from './world';
import { ServerEntity, ServerMap, IClient } from './serverInterfaces';
import { pony as ponyEntity, getEntityType } from '../common/entities';
import { PONY_INFO_KEY, SWAP_TIMEOUT } from '../common/constants';
import { decompressPony, compressPony } from '../common/compressPony';
import { canFly, canMagic } from '../client/ponyUtils';
import { canUseTag } from '../common/tags';
import { CounterService } from './services/counter';
import { replaceEmojis } from '../client/emoji';
import { setEntityName, pushUpdateEntity } from './entityUtils';
import { saySystem } from './chat';
import { isPonyFlying } from '../common/entityUtils';
import { createCharacterState, updateClientCharacter } from './playerUtils';
import { encodeExpression } from '../common/encoders/expressionEncoder';

export const defaultCharacterState: CharacterState = { x: 0, y: 0 };

export function encryptInfo(info: string) {
	return bitmask(toByteArray(info), PONY_INFO_KEY);
}

export function createPony(account: IAccount, character: ICharacter, state: CharacterState) {
	const pony = ponyEntity(state.x, state.y) as ServerEntity;
	pony.state = hasFlag(state.flags, CharacterStateFlags.Right) ? EntityState.FacingRight : 0;
	updatePony(pony, account, character);
	updatePonyFromState(pony, state);
	cleanupPonyOptions(pony);
	return pony;
}

function createDefaultCharacterState(map: ServerMap): CharacterState {
	return {
		...defaultCharacterState,
		...randomPoint(map.spawnArea),
		map: map.id,
	};
}

export function getCharacterState(character: ICharacter, serverId: string, map: ServerMap): CharacterState {
	return character.state && character.state[serverId] || createDefaultCharacterState(map);
}

export async function updateCharacterState(characterId: string, serverId: string, state: CharacterState) {
	await Character.updateOne({ _id: characterId }, { [`state.${serverId}`]: state }).exec();
}

export function getAndFixCharacterState(
	server: ServerConfig, character: ICharacter, world: World, states: CounterService<CharacterState>
): CharacterState {
	const map = world.getMainMap();
	const savedState = last(states.get(character._id.toString()).items) || getCharacterState(character, server.id, map);
	const state = { ...defaultCharacterState, ...savedState };

	if (hasFlag(character.flags, CharacterFlags.RespawnAtSpawn)) {
		Object.assign(state, { map: map.id, ...randomPoint(map.spawnArea) });
	}

	return state;
}

export function updatePonyFromState(pony: ServerEntity, state: CharacterState) {
	if (!pony.options) {
		pony.options = {};
	}

	if (state.hold) {
		const type = getEntityType(state.hold);

		if (type) {
			pony.options.hold = type;
		}
	} else if (pony.options.hold) {
		pony.options.hold = 0;
	}

	if (state.toy) {
		pony.options.toy = state.toy;
	} else if (pony.options.toy) {
		pony.options.toy = 0;
	}

	pony.options.extra = hasFlag(state.flags, CharacterStateFlags.Extra);
}

export function cleanupPonyOptions({ options }: ServerEntity) {
	if (options) {
		if (!options.hold) {
			delete options.hold;
		}

		if (!options.extra) {
			delete options.extra;
		}
	}
}

export function filterForbidden(name: string) {
	const isForbidden = isForbiddenName(name);
	return isForbidden ? repeat('?', name.length) : name;
}

export function updatePony(pony: ServerEntity, account: IAccount, character: ICharacter) {
	const info = character.info || '';
	const ponyInfo = decompressPony(info);
	const originalName = replaceEmojis(character.name);
	const allowedName = filterForbidden(originalName);
	const options: PonyOptions = {};
	const level = supporterLevel(account);

	if (character.tag && canUseTag(account, character.tag)) {
		options.tag = character.tag;
	} else if (level && !hasFlag(character.flags, CharacterFlags.HideSupport)) {
		options.tag = `sup${level}`;
	}

	pony.options = options;
	pony.extraOptions = createExtraOptions(character);
	pony.canFly = canFly(ponyInfo);
	pony.canMagic = canMagic(ponyInfo);

	// name
	setEntityName(pony, allowedName);

	// info
	pony.info = info;

	if (hasFlag(character.flags, CharacterFlags.BadCM) && ponyInfo.cm) {
		ponyInfo.cm = undefined;
		pony.infoSafe = compressPony(ponyInfo);
		pony.encryptedInfoSafe = encryptInfo(pony.infoSafe);
	} else {
		pony.infoSafe = pony.info;
		pony.encryptedInfoSafe = encryptInfo(info);
	}

	// crc
	pony.crc = createCharacterCRC(account._id.toString(), originalName);
}

function createCharacterCRC(accountId: string, characterName: string) {
	const characterNameBuffer = encodeString(characterName)!;
	const accountIdBuffer = encodeString(accountId)!;
	const buffer = new Uint32Array(Math.ceil((characterNameBuffer.byteLength + accountIdBuffer.byteLength) / 4));
	const bufferUint8 = new Uint8Array(buffer.buffer);
	bufferUint8.set(characterNameBuffer);
	bufferUint8.set(accountIdBuffer, characterNameBuffer.byteLength);
	return computeCRC(buffer) & 0xffff;
}

export function createExtraOptions(character: ICharacter) {
	const options: any = {
		ex: true,
	};

	if (character.auth && !isForbiddenName(character.auth.name)) {
		options.site = {
			provider: character.auth.provider,
			name: character.auth.name,
			url: character.auth.url,
		};
	}

	return options;
}

export function logRemovedCharacter({ _id, account, name, info }: ICharacter) {
	log(systemMessage(`${account}`, `removed pony [${_id}] "${name}" ${info}`));
}

export async function swapCharacter(client: IClient, { server }: World, query: MongoQuery<ICharacter>) {
	if (client.isSwitchingMap)
		return;

	if ((Date.now() - client.lastSwap) < SWAP_TIMEOUT) {
		return;
	}

	const character = await queryCharacter(query);

	if (!character) {
		return saySystem(client, `Can't find character`);
	}

	if (isPonyFlying(client.pony) && !canFly(decompressPony(character.info || ''))) {
		return saySystem(client, `Can't swap to that character in-flight`);
	}

	const state = createCharacterState(client.pony, client.map);
	updateCharacterState(client.characterId, server.id, state)
		.catch(logger.error);

	Character.updateOne({ _id: character._id }, { lastUsed: new Date() }).exec()
		.catch(logger.error);

	updateClientCharacter(client, character);
	updatePony(client.pony, client.account, client.character);
	updatePonyFromState(client.pony, getCharacterState(character, server.id, client.map));
	const options = client.pony.options as PonyOptions;
	options.expr = encodeExpression(undefined);
	client.pony.state &= ~EntityState.Magic;
	pushUpdateEntity({
		entity: client.pony, options: { hold: 0, toy: 0, ...options },
		flags: UpdateFlags.Info | UpdateFlags.Name | UpdateFlags.Options | UpdateFlags.State,
	});

	cleanupPonyOptions(client.pony);
	client.myEntity(client.pony.id, client.characterName, client.character.info!, client.characterId, client.pony.crc || 0);
	client.reporter.systemLog(`Swapped to "${client.characterName}"`);
	client.lastSwap = Date.now();
}
