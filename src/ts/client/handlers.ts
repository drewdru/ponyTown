import { compact, escapeRegExp, repeat } from 'lodash';
import { createBinaryReader, readUint8, readUint32, readUint16 } from 'ag-sockets/dist/browser';
import { decodeString } from 'ag-sockets/dist/utf8';
import {
	Entity, Region, Pony, EntityState, PonyOptions, MessageType, isNonIgnorableMessage, EntityPlayerState,
	EntityOrPonyOptions, isPublicMessage, FakeEntity, Action, WorldMap, DoAction, UpdateType, DecodedUpdate,
	PonyData, WorldStateFlags, FriendStatusData, FriendStatusFlags, isWhisper, isWhisperTo,
} from '../common/interfaces';
import { bitmask, setFlag, findById, distance, hasFlag, distanceXY, invalidEnum, removeItem } from '../common/utils';
import { isChatVisible } from '../common/camera';
import { createRegion, worldToRegionX, worldToRegionY } from '../common/region';
import { createAnEntity, poof, poof2 } from '../common/entities';
import { getPonyState, setPonyState, isPonyFlying, addChatBubble, isHidden } from '../common/entityUtils';
import {
	isPony, createPony, setPonyExpression, updatePonyInfo, updatePonyHold, doPonyAction, hasHeadAnimation,
	setHeadAnimation,
	doBoopPonyAction
} from '../common/pony';
import { PonyTownGame } from './game';
import { setupPlayer, savePlayerPosition } from './sec';
import { PONY_INFO_KEY, FLY_DELAY, isChatlogRangeUnlimited, SECOND, PONY_TYPE } from '../common/constants';
import { getSaysTime, containsCyrillic } from './clientUtils';
import { dismissSays } from '../graphics/graphicsUtils';
import { decodeUpdate, readOneUpdate } from '../common/encoders/updateDecoder';
import { updateEntityVelocity } from '../common/entityUtils';
import { decodePonyInfo } from '../common/compressPony';
import { mockPaletteManager } from '../common/ponyInfo';
import { yawn, laugh, sneeze } from './ponyAnimations';
import {
	findEntityById, getRegionGlobal, setTile, removeEntity, addEntity, removeEntityDirectly, setRegion,
	addEntityToMapRegion, switchEntityRegion, getRegionUnsafe, addOrRemoveFromEntityList,
} from '../common/worldMap';
import { isSelected } from './gameUtils';
import { compareFriends } from '../components/services/model';
import { canCollideWith } from '../common/collision';
import { hasDrawLight, hasLightSprite } from './draw';

function log(message: string) {
	if (DEVELOPMENT && !TESTS) {
		console.error(message);
	}
}

function handleAddEntity(game: PonyTownGame, region: Region, update: DecodedUpdate, initial: boolean) {
	const {
		id, type = 0, x = 0, y = 0, vx = 0, vy = 0, state = 0, playerState = 0, options = {},
		name, filterName, info, crc = 0, action // , expression
	} = update;

	const filteredName = filterEntityName(game, name, filterName);
	const entity = createEntityOrPony(game, type, id, x, y, options, crc, filteredName, info, state);

	entity.id = id;
	entity.x = x;
	entity.y = y;
	entity.vx = vx;
	entity.vy = vy;
	entity.playerState = playerState || EntityPlayerState.None;

	addEntityToMapRegion(game.map, region, entity);

	if (isPony(entity)) {
		if (id === game.playerId) {
			game.apply(() => setupPlayer(game, entity));
		}

		if (isSelected(game, id)) {
			game.select(entity);
		}

		if (game.whisperTo && game.whisperTo.id === id) {
			game.whisperTo = entity;
		}

		if (!initial) {
			game.onPonyAddOrUpdate.next(entity);
		}
	}

	if (action !== undefined) {
		handleAction(game, id, action);
	}
}

export function handleUpdateEntity(game: PonyTownGame, update: DecodedUpdate) {
	const {
		id, x, y, vx, vy, state, playerState, expression, options, switchRegion,
		name, filterName, info, crc = 0, action
	} = update;

	const filteredName = filterEntityName(game, name, filterName);
	const entity = findEntityByIdInGame(game, id);

	if (entity) {
		const isPlayer = id === game.playerId;

		if (x !== undefined && y !== undefined) {
			if (switchRegion) {
				if (DEVELOPMENT && isPlayer && !getRegionGlobal(game.map, x, y)) {
					console.error(`Switching player to unsubscribed region`);
				}

				switchEntityRegion(game.map, entity, x, y);
			}

			if (!isPlayer) {
				// if (DEVELOPMENT && isPony(entity)) {
				// 	const dx = entity.x - x;
				// 	const dy = entity.y - y;
				// 	console.log(`adjust x: [${num(dx)}] (${ms(dx)}) y: [${num(dy)}] (${ms(dy)})`);
				// }

				entity.x = x;
				entity.y = y;
				updateEntityVelocity(game.map, entity, vx, vy);

				if (canCollideWith(entity)) {
					const rx = worldToRegionX(entity.x, game.map);
					const ry = worldToRegionY(entity.y, game.map);

					for (let y = -1; y <= 1; y++) {
						for (let x = -1; x <= 1; x++) {
							const region = getRegionUnsafe(game.map, rx + x, ry + y);

							if (region) {
								region.colliderDirty = true;
							}
						}
					}
				}
			} else if (distanceXY(entity.x, entity.y, x, y) > 8) {
				log(`Fixing player position (${entity.x}, ${entity.y}) => (${x}, ${y})`);
				entity.x = x;
				entity.y = y;
				savePlayerPosition();
			}
		}

		if (state !== undefined) {
			updateEntityStateInternal(game, entity, state);
		}

		if (playerState !== undefined) {
			updateEntityPlayerStateInternal(game, entity, playerState);
		}

		if (expression !== undefined && isPony(entity)) {
			setPonyExpression(entity, expression);
		}

		if (options != null) {
			updateEntityOptionsInternal(entity, options, game);
		}

		if (filteredName !== undefined && !isPlayer) {
			entity.name = filteredName;
		}

		if (info !== undefined && !isPlayer) {
			const ponyInfo = bitmask(info, PONY_INFO_KEY);

			if (entity.fake) {
				(entity as Pony).palettePonyInfo = decodePonyInfo(ponyInfo, mockPaletteManager);
			} else {
				updatePonyInfoWithPoof(game, entity, ponyInfo, crc);
			}
		}

		if (action !== undefined) {
			handleAction(game, id, action);
		}

		applyIfSelected(game, id);
	} else {
		log(`handleUpdateEntity: missing entity: ${id}`);
	}
}

export function handleUpdatePonies(game: PonyTownGame, ponies: PonyData[]) {
	for (const [id, options = {}, name, info, playerState, nameBad] of ponies) {
		const decodedName = name && decodeString(name) || undefined;
		const filteredName = filterEntityName(game, decodedName, nameBad);
		const decodedInfo = info ? bitmask(info, PONY_INFO_KEY) : '';
		const pony = createPonyEntity(game, id, options, filteredName, decodedInfo, EntityState.None);
		pony.playerState = playerState;
		game.fallbackPonies.set(pony.id, pony);
	}

	const missing = game.party && game.party.members.filter(p => !p.pony);

	if (missing && missing.length) {
		game.apply(() => missing.forEach(p => p.pony = game.fallbackPonies.get(p.id)));
	}
}

function createPonyEntity(
	game: PonyTownGame, id: number, options: PonyOptions, name: string | undefined, info: string | Uint8Array,
	state: EntityState
) {
	if (!game.webgl) {
		throw new Error('WebGL not initialized');
	}

	const pony = createPony(id, state, info, game.webgl.palettes.defaultPalette, game.paletteManager);

	if (name) {
		pony.name = name;
	}

	updateEntityOptionsInternal(pony, options, game);

	// bypass name/info filtering for player pony
	if (id === game.playerId) {
		if (game.playerName) {
			pony.name = game.playerName;
		}

		if (game.playerInfo) {
			pony.crc = game.playerCRC;
			updatePonyInfo(pony, game.playerInfo, game.applyChanges);
		}
	}

	return pony;
}

function updateEntityStateInternal(game: PonyTownGame, entity: Entity, state: EntityState) {
	if (entity === game.player) {
		const right = game.rightOverride;
		const headTurned = game.headTurnedOverride;
		const stateOverride = game.stateOverride;

		if (right !== undefined) {
			state = setFlag(state, EntityState.FacingRight, right);
			game.rightOverride = undefined;
		}

		if (headTurned !== undefined) {
			state = setFlag(state, EntityState.HeadTurned, headTurned);
			game.headTurnedOverride = undefined;
		}

		if (stateOverride !== undefined) {
			if (stateOverride !== getPonyState(state)) {
				state = setPonyState(state, stateOverride);
			}

			game.stateOverride = undefined;
		}

		game.onActionsUpdate.next();
	}

	const wasPonyFlying = isPonyFlying(entity);
	const hadLight = hasDrawLight(entity);
	const hadLightSprite = hasLightSprite(entity);

	entity.state = state;

	if (!wasPonyFlying && isPonyFlying(entity) && isPony(entity)) {
		entity.inTheAirDelay = FLY_DELAY;
	}

	const hasLight = hasDrawLight(entity);
	const hasLightSprite1 = hasLightSprite(entity);

	addOrRemoveFromEntityList(game.map.entitiesLight, entity, hadLight, hasLight);
	addOrRemoveFromEntityList(game.map.entitiesLightSprite, entity, hadLightSprite, hasLightSprite1);
}

function updateEntityPlayerStateInternal(game: PonyTownGame, entity: Entity, playerState: EntityPlayerState) {
	if (!entity.fake && !isHidden(entity) && hasFlag(playerState, EntityPlayerState.Hidden)) {
		playEffect(game, entity, poof.type);

		if (isSelected(game, entity.id)) {
			game.select(undefined);
		}
	}

	entity.playerState = playerState;
}

function findEntityByIdInGame(game: PonyTownGame, id: number) {
	let entity = findEntityById(game.map, id);

	if (!entity && isSelected(game, id)) {
		entity = game.selected;
	}

	return entity;
}

function applyIfSelected(game: PonyTownGame, id: number) {
	if (isSelected(game, id)) {
		game.applyChanges();
	}
}

export function handleUpdates(game: PonyTownGame, updates: Uint8Array) {
	const reader = createBinaryReader(updates);

	while (reader.offset < reader.view.byteLength) {
		const type = readUint8(reader) as UpdateType;

		switch (type) {
			case UpdateType.None:
				log(`handleUpdates (none)`);
				break;
			case UpdateType.AddEntity: {
				const update = readOneUpdate(reader)!;
				const { x = 0, y = 0 } = update;
				const region = getRegionGlobal(game.map, x, y);

				if (region) {
					handleAddEntity(game, region, update, false);
				} else {
					log(`handleUpdates (add): missing region at ${x} ${y}`);
				}
				break;
			}
			case UpdateType.UpdateEntity: {
				const update = readOneUpdate(reader)!;
				handleUpdateEntity(game, update);
				break;
			}
			case UpdateType.RemoveEntity: {
				const id = readUint32(reader);
				handleRemoveEntity(game, id);
				break;
			}
			case UpdateType.UpdateTile: {
				const x = readUint16(reader);
				const y = readUint16(reader);
				const type = readUint8(reader);
				setTile(game.map, x, y, type);
				break;
			}
			default:
				invalidEnum(type);
		}
	}
}

export function updatePonyInfoWithPoof(game: PonyTownGame, entity: Entity, info: string | Uint8Array, crc: number) {
	const update = (pony: Pony) => {
		pony.crc = crc;
		updatePonyInfo(pony, info, game.applyChanges);
		game.onPonyAddOrUpdate.next(pony);
	};

	if (entity && isPony(entity)) {
		if (isHidden(entity)) {
			update(entity);
		} else {
			playEffect(game, entity, poof2.type);
			setTimeout(() => update(entity), 100);
		}
	}
}

export function handleRemoveEntity(game: PonyTownGame, id: number) {
	const entity = findEntityById(game.map, id);

	if (entity) {
		removeEntity(game.map, entity);
	} else {
		log(`handleRemoveEntity: Missing entity: ${id}`);
	}

	if (id === game.playerId) {
		log(`handleRemoveEntity: Removing player`);
	}

	if (entity && entity.type === PONY_TYPE) {
		playEffect(game, entity, poof.type);
	}

	if (isSelected(game, id)) {
		setTimeout(() => {
			if (isSelected(game, id)) {
				game.select(undefined);
			}
		}, 15 * SECOND);
	}
}

function findPonyById(map: WorldMap, id: number) {
	const entity = findEntityById(map, id);
	return entity && isPony(entity) ? entity : undefined;
}

export function handleAction(game: PonyTownGame, id: number, action: Action) {
	const pony = findPonyById(game.map, id);

	if (pony) {
		switch (action) {
			case Action.Boop:
				doBoopPonyAction(game, pony);
				break;
			case Action.HoldPoof:
				doPonyAction(pony, DoAction.HoldPoof);
				break;
			case Action.Yawn:
				if (!hasHeadAnimation(pony)) {
					setHeadAnimation(pony, yawn);
				}
				break;
			case Action.Laugh:
				if (!hasHeadAnimation(pony)) {
					setHeadAnimation(pony, laugh);
				}
				break;
			case Action.Sneeze:
				if (!hasHeadAnimation(pony)) {
					setHeadAnimation(pony, sneeze);
				}
				break;
			default:
				log(`handleAction: Invalid action: ${action}`);
		}
	} else {
		log(`handleAction: Missing entity: ${id}`);
	}
}

export function playEffect(game: PonyTownGame, target: Entity, type: number) {
	if (isHidden(target))
		return;

	try {
		const entity = createAnEntity(type, 0, target.x, target.y, {}, game.paletteManager, game);
		addEntity(game.map, entity);
		setTimeout(() => removeEntityDirectly(game.map, entity), 1000);
	} catch (e) {
		DEVELOPMENT && console.error(e);
	}
}

export function findEntityOrMockByAnyMeans(game: PonyTownGame, id: number) {
	if (!id) {
		return undefined;
	}

	let entity: Entity | FakeEntity | undefined = findEntityById(game.map, id);

	if (!entity && game.party) {
		const member = findById(game.party.members, id);
		entity = member && member.pony;
	}

	if (!entity) {
		const friend = game.model.friends && game.model.friends.find(f => f.entityId === id);

		if (friend) {
			entity = { fake: true, type: PONY_TYPE, id: friend.entityId, name: friend.actualName, crc: friend.crc };
		}
	}

	if (!entity) {
		entity = game.findEntityFromChatLog(id);
	}

	return entity;
}

export function findBestEntityByName(game: PonyTownGame, name: string): Entity | FakeEntity | undefined {
	const regex = new RegExp(`^${escapeRegExp(name)}$`, 'i');

	if (game.model.friends) {
		for (const friend of game.model.friends) {
			if (friend.online && friend.entityId && regex.test(friend.actualName)) {
				return { fake: true, type: PONY_TYPE, id: friend.entityId, name: friend.actualName, crc: friend.crc };
			}
		}
	}

	let result: Entity | FakeEntity | undefined = undefined;

	if (game.player) {
		for (const entity of game.map.entities) {
			if (entity.type === PONY_TYPE && entity.id !== game.playerId && !isHidden(entity) && entity.name && regex.test(entity.name)) {
				if (!result || (distance(game.player, entity) < distance(game.player, result))) {
					result = entity;
				}
			}
		}
	}

	if (!result) {
		result = game.findEntityFromChatLogByName(name);
	}

	return result;
}

export function findMatchingEntityNames(game: PonyTownGame, match: string): string[] {
	const result: string[] = [];
	const ids = new Set<number>();
	const regex = new RegExp(`^${escapeRegExp(match)}`, 'i');

	if (game.model.friends) {
		for (const friend of game.model.friends) {
			if (friend.online && friend.entityId && friend.actualName && regex.test(friend.actualName)) {
				ids.add(friend.entityId);
				result.push(friend.actualName);
			}
		}
	}

	for (const entity of game.map.entities) {
		if (
			entity.type === PONY_TYPE &&
			entity.id !== game.playerId &&
			entity.name &&
			!isHidden(entity) &&
			regex.test(entity.name) &&
			!ids.has(entity.id)
		) {
			result.push(entity.name);
		}
	}

	return result;
}

let cachedFilter: string | undefined = undefined;
let cachedRegex: RegExp | undefined = undefined;

export function containsFilteredWords(message: string, filter: string | undefined) {
	if (cachedFilter !== filter) {
		if (filter) {
			const words = compact(filter.replace(/[,]/g, ' ').split(/[\r\n\t ]+/g).map(x => x.trim()));
			cachedRegex = new RegExp(`(^| )(${words.map(escapeRegExp).join('|')})($| )`, 'i');
		} else {
			cachedRegex = undefined;
		}

		cachedFilter = filter;
	}

	return cachedRegex && cachedRegex.test(message);
}

export function handleSays(game: PonyTownGame, id: number, message: string, type: MessageType) {
	const entity = findEntityOrMockByAnyMeans(game, id);

	if (entity) {
		handleSay(game, entity, message, type);
	} else {
		DEVELOPMENT && console.warn('incomplete say');
		game.incompleteSays.push({ id, message, type, time: Date.now() });
		game.send(server => server.actionParam2(Action.RequestEntityInfo, id));
	}
}

function isFriendEntityId(game: PonyTownGame, id: number) {
	if (game.model.friends) {
		for (const friend of game.model.friends) {
			if (friend.entityId === id) {
				return true;
			}
		}
	}

	return false;
}

function shouldShowChatMessage(game: PonyTownGame, entity: Entity | FakeEntity, message: string, type: MessageType): boolean {
	if (entity === game.player)
		return true;

	if (isWhisperTo(type))
		return true;

	if (isWhisper(type) && isFriendEntityId(game, entity.id))
		return true;

	if (isPublicMessage(type) && !entity.fake && !isChatVisible(game.camera, entity))
		return false;

	if (isNonIgnorableMessage(type))
		return true;

	if (game.settings.account.filterCyrillic && containsCyrillic(message))
		return false;

	if (game.settings.account.ignorePublicChat && isPublicMessage(type))
		return false;

	if (isWhisper(type) && game.settings.account.ignoreNonFriendWhispers)
		return false;

	if (containsFilteredWords(message, game.settings.account.filterWords))
		return false;

	return true;
}

function isChatInRange(entity: Entity, player: Entity | undefined, range: number | undefined) {
	return player === undefined || isChatlogRangeUnlimited(range) || distance(entity, player) < range!;
}

function shouldShowChatMessageInChatlog(game: PonyTownGame, entity: Entity | FakeEntity, type: MessageType) {
	if (entity.type !== PONY_TYPE)
		return false;

	if (entity.fake)
		return true;

	if (!isPublicMessage(type))
		return true;

	if (!isChatInRange(entity, game.player, game.settings.account.chatlogRange))
		return false;

	return true;
}

export function handleSay(game: PonyTownGame, entity: Entity | FakeEntity, message: string, type: MessageType) {
	if (!shouldShowChatMessage(game, entity, message, type))
		return;

	if (type === MessageType.Dismiss || message === '.') {
		if (!entity.fake && entity.says) {
			dismissSays(entity.says);
		}
	} else {
		const bubbleEntity = isWhisperTo(type) ? game.player : entity;

		if (bubbleEntity && !bubbleEntity.fake && game.map.entitiesById.has(bubbleEntity.id)) {
			const total = getSaysTime(message);
			addChatBubble(game.map, bubbleEntity, { message, type, total, timer: total, created: Date.now() });
		}

		if (isWhisper(type)) {
			const friend = game.model.friends && game.model.friends.find(f => f.entityId === entity.id);
			game.lastWhisperFrom = { entityId: entity.id, accountId: friend && friend.accountId };
		}

		if (shouldShowChatMessageInChatlog(game, entity, type)) {
			const { id, name = '', crc } = entity;
			game.messageQueue.push({ id, crc, name, message, type });
		}
	}
}

export function handleEntityInfo(game: PonyTownGame, id: number, name: string, crc: number, nameBad: boolean) {
	name = filterEntityName(game, name, nameBad)!;

	for (let i = 0; i < game.incompleteSays.length;) {
		const say = game.incompleteSays[i];

		if (say.id === id) {
			game.incompleteSays.splice(i, 1);
			const entity: FakeEntity = { fake: true, type: PONY_TYPE, id, name, crc };
			handleSay(game, entity, say.message, say.type);
		} else {
			i++;
		}
	}
}

export function subscribeRegion(game: PonyTownGame, data: Uint8Array) {
	const { x, y, updates, tileData } = decodeUpdate(data);
	const region = createRegion(x, y, tileData!);
	const initial = !game.loaded;
	setRegion(game.map, x, y, region);

	for (const update of updates) {
		handleAddEntity(game, region, update, initial);
	}
}

export function filterEntityName({ settings, worldFlags }: PonyTownGame, name: string | undefined, nameBad: boolean) {
	if (name && nameBad && (settings.account.filterSwearWords || hasFlag(worldFlags, WorldStateFlags.Safe))) {
		return repeat('*', name.length);
	} else if (name && containsFilteredWords(name, settings.account.filterWords)) {
		return repeat('?', name.length);
	} else {
		return name;
	}
}

function createEntityOrPony(
	game: PonyTownGame, type: number, id: number, x: number, y: number, options: EntityOrPonyOptions,
	crc: number, name: string | undefined, info: Uint8Array | undefined, state: EntityState
): Entity {
	if (type === PONY_TYPE) {
		const entity = createPonyEntity(game, id, options, name, info ? bitmask(info, PONY_INFO_KEY) : '', state);
		const member = game.party && game.party.members.find(p => p.id === id);
		entity.crc = crc;

		if (member) {
			game.apply(() => member.pony = entity);
		}

		if (isSelected(game, id)) {
			game.select(entity);
		}

		return entity;
	} else {
		const entity = createAnEntity(type, id, x, y, options, game.paletteManager, game);

		entity.state = state;

		if (name) {
			entity.name = name;
		}

		return entity;
	}
}

function updateEntityOptionsInternal(entity: Entity, options: Partial<EntityOrPonyOptions>, game: PonyTownGame) {
	Object.assign(entity, options);

	if (isPony(entity) && 'hold' in options) {
		updatePonyHold(entity, game);
	}
}

export function handleUpdateFriends(game: PonyTownGame, friends: FriendStatusData[], removeMissing: boolean) {
	if (!game.model.friends)
		return;

	for (const { accountId, accountName, status, entityId, name, info, crc, nameBad = false } of friends) {
		let friend = game.model.friends.find(f => f.accountId === accountId);

		if (hasFlag(status, FriendStatusFlags.Remove)) {
			if (friend) {
				removeItem(game.model.friends, friend);
			}
		} else {
			if (!friend) {
				friend = {
					accountId,
					accountName: '',
					online: false,
					name: undefined,
					nameBad: false,
					pony: undefined,
					entityId: 0,
					crc: 0,
					ponyInfo: undefined,
					actualName: '',
				};

				game.model.friends.push(friend);
			}

			friend.online = hasFlag(status, FriendStatusFlags.Online);

			if (accountName !== undefined) {
				friend.accountName = accountName;
			}

			if (entityId !== undefined) {
				if (game.lastWhisperFrom && game.lastWhisperFrom.accountId === friend.accountId) {
					game.lastWhisperFrom.entityId = entityId;
				}

				game.onEntityIdUpdate.next({ old: friend.entityId, new: entityId });

				friend.entityId = entityId;
			}

			if (name !== undefined) {
				friend.name = name;
				friend.nameBad = nameBad;
				friend.actualName = filterEntityName(game, name, nameBad) || '';
			}

			if (crc !== undefined) {
				friend.crc = crc;
			}

			if (info !== undefined) {
				friend.pony = info;
				friend.ponyInfo = decodePonyInfo(info, mockPaletteManager);
			}

			if (friend.entityId && game.whisperTo && game.whisperTo.id === friend.entityId) {
				game.whisperTo.name = friend.actualName;
				game.whisperTo.crc = friend.crc;
			}
		}
	}

	if (removeMissing) {
		for (let i = game.model.friends.length - 1; i >= 0; i--) {
			if (!friends.find(f => f.accountId === game.model.friends![i].accountId)) {
				game.model.friends.splice(i, 1);
			}
		}

		DEVELOPMENT && console.log('Refreshing friend list');
	}

	game.model.friends.sort(compareFriends);
	game.apply(() => { });
}
