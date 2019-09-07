import { sample } from 'lodash';
import { createBinaryWriter, resetWriter } from 'ag-sockets';
import { IClient, ServerEntity, Reporter, TokenData, ServerMap } from './serverInterfaces';
import { IAccount, ICharacter, UpdateAccount, IOriginInfo, findFriendIds } from './db';
import * as entities from '../common/entities';
import { isShadowed, isMuted, supporterLevel } from '../common/adminUtils';
import { handlePromiseDefault } from './serverUtils';
import {
	removeItem, hasFlag, distance, toInt, includes, array, flatten, containsPointWitBorder, distanceXY, setFlag, invalidEnum
} from '../common/utils';
import { CharacterState, ServerConfig, AccountState, CharacterStateFlags, GameServerSettings } from '../common/adminInterfaces';
import {
	EntityState, Expression, PonyOptions, Action, ExpressionExtra, Eye, Muzzle, CLOSED_MUZZLES,
	isExpressionAction, EntityPlayerState, UpdateFlags, InteractAction
} from '../common/interfaces';
import { encodeExpression, EMPTY_EXPRESSION, decodeExpression } from '../common/encoders/expressionEncoder';
import { EXPRESSION_TIMEOUT, DAY, FLY_DELAY, SECOND, PONY_TYPE } from '../common/constants';
import { World } from './world';
import { centerCameraOn, createCamera } from '../common/camera';
import { findEntitiesInBounds } from './serverMap';
import { CounterService } from './services/counter';
import { create } from './reporter';
import { updateAccountState } from './accountUtils';
import { isMod } from '../common/accountUtils';
import { getOriginFromHTTP } from './originUtils';
import { createPony, getAndFixCharacterState, updateCharacterState } from './characterUtils';
import {
	updateEntityOptions, canBoopEntity, findPlayersThetCanBeSitOn, updateEntityState, updateEntityExpression,
	sendAction, pushUpdateEntityToClient, fixPosition, isHoldingGrapes
} from './entityUtils';
import { replaceEmojis } from '../client/emoji';
import { expression, parseExpression } from '../common/expressionUtils';
import {
	canBoop2, isPonySitting, isPonyStanding, getBoopRect, canStand, isPonyFlying, setPonyState, canSit, canLie
} from '../common/entityUtils';
import { withBorder } from '../common/rect';
import { isOnlineFriend } from './services/friends';
import { grapePurple, grapeGreen, tools } from '../common/entities';
import { saySystem } from './chat';

export function isMutedOrShadowed(client: IClient) {
	return client.shadowed || isMuted(client.account);
}

export function isIgnored(ignoring: IClient, target: IClient): boolean {
	return target.ignores.has(ignoring.accountId);
}

export function kickClient(client: IClient, reason = 'kicked') {
	client.leaveReason = reason;
	client.disconnect(true, true);
}

export function getCounter(client: IClient, key: keyof AccountState) {
	return toInt(client.account.state && client.account.state[key]);
}

export function createClientAndPony(
	client: IClient, friends: string[], hides: string[], server: ServerConfig, world: World, states: CounterService<CharacterState>
) {
	const { account, character } = client.tokenData as TokenData;
	const origin = client.originalRequest && getOriginFromHTTP(client.originalRequest);
	const reporter = create(server, account._id, character._id, origin);
	const state = getAndFixCharacterState(server, character, world, states);

	client.characterState = state;
	const pony = createPony(account, character, state);
	pony.client = createClient(client, account, friends, hides, character, pony, world.getMainMap(), reporter, origin);
	centerCameraOn(client.camera, pony);
}

export function updateClientCharacter(client: IClient, character: ICharacter) {
	client.character = character;
	client.characterId = client.character._id.toString();
	client.characterName = replaceEmojis(client.character.name);
}

export function createClient(
	client: IClient, account: IAccount, friends: string[], hides: string[], character: ICharacter, pony: ServerEntity,
	defaultMap: ServerMap, reporter: Reporter, origin: IOriginInfo | undefined
): IClient {
	updateClientCharacter(client, character);

	client.ip = origin && origin.ip || '';
	client.country = origin && origin.country || '??';
	client.userAgent = client.originalRequest && client.originalRequest.headers['user-agent'];

	client.accountId = account._id.toString();
	client.accountName = account.name;
	client.ignores = new Set(account.ignores);
	client.hides = new Set();
	client.permaHides = new Set(hides);
	client.friends = new Set(friends);
	client.friendsCRC = undefined;
	client.accountSettings = { ...account.settings };
	client.supporterLevel = supporterLevel(account);
	client.isMod = isMod(account);

	client.reporter = reporter;
	client.account = account;
	client.character = character;
	client.pony = pony;
	client.map = defaultMap;
	client.isSwitchingMap = false;

	client.notifications = [];
	client.regions = [];

	client.shadowed = isShadowed(account);
	client.country = origin && origin.country || '??';

	client.camera = createCamera();
	client.camera.w = 800;
	client.camera.h = 600;

	client.safeX = pony.x;
	client.safeY = pony.y;

	client.lastPacket = Date.now();
	client.lastAction = 0;
	client.lastBoopAction = 0;
	client.lastExpressionAction = 0;
	client.lastSays = [];
	client.lastX = pony.x;
	client.lastY = pony.y;
	client.lastTime = 0;
	client.lastVX = 0;
	client.lastVY = 0;
	client.lastMapSwitch = 0;

	client.lastSitX = 0;
	client.lastSitY = 0;
	client.lastSitTime = 0;
	client.sitCount = 0;

	client.lastSwap = 0;
	client.lastMapLoadOrSave = 0;

	client.lastCameraX = 0;
	client.lastCameraY = 0;
	client.lastCameraW = 0;
	client.lastCameraH = 0;

	client.updateQueue = createBinaryWriter(128);
	client.regionUpdates = [];
	client.saysQueue = [];
	client.unsubscribes = [];
	client.subscribes = [];

	client.positions = [];

	return client;
}

export function resetClientUpdates(client: IClient) {
	resetWriter(client.updateQueue);
	client.regionUpdates.length = 0;
	client.saysQueue.length = 0;
	client.unsubscribes.length = 0;
	client.subscribes.length = 0;
}

export function createCharacterState(entity: ServerEntity, map: ServerMap): CharacterState {
	const options = entity.options as PonyOptions;
	const flags: CharacterStateFlags =
		(hasFlag(entity.state, EntityState.FacingRight) ? CharacterStateFlags.Right : 0) |
		(options.extra ? CharacterStateFlags.Extra : 0);
	const state: CharacterState = { x: entity.x, y: entity.y };

	if (flags) {
		state.flags = flags;
	}

	if (map.id) {
		state.map = map.id;
	}

	if (options.hold) {
		state.hold = entities.getEntityTypeName(options.hold);
	}

	if (options.toy) {
		state.toy = options.toy;
	}

	return state;
}

export async function createAndUpdateCharacterState(client: IClient, server: ServerConfig) {
	const state = createCharacterState(client.pony, client.map);
	await updateCharacterState(client.characterId, server.id, state);
}

// utils

export function addIgnore(target: IClient, accountId: string) {
	target.account.ignores = target.account.ignores || [];
	target.account.ignores.push(accountId);
	target.ignores.add(accountId);
}

export function removeIgnore(target: IClient, accountId: string) {
	if (target.account.ignores) {
		removeItem(target.account.ignores, accountId);
	}

	target.ignores.delete(accountId);
}

export const createIgnorePlayer =
	(updateAccount: UpdateAccount, handlePromise = handlePromiseDefault) =>
		(client: IClient, target: IClient, ignored: boolean) => {
			if (target.accountId === client.accountId)
				return;

			const id = client.accountId;
			const is = isIgnored(client, target);

			if (ignored === is)
				return;

			if (ignored) {
				addIgnore(target, id);
			} else {
				removeIgnore(target, id);
			}

			handlePromise(updateAccount(target.accountId, { [ignored ? '$push' : '$pull']: { ignores: id } })
				.then(() => updateEntityPlayerState(client, target.pony))
				.then(() => {
					const { accountId, account, character } = target;
					const message = `${ignored ? 'ignored' : 'unignored'} ${character.name} (${account.name}) [${accountId}]`;
					client.reporter.systemLog(message);
				}), client.reporter.error);
		};

export function findClientByEntityId(self: IClient, entityId: number): IClient | undefined {
	const selected = self.selected;

	if (selected && selected.id === entityId && selected.client) {
		return selected.client;
	}

	if (self.party) { // TODO: remove ?
		const client = self.party.clients.find(c => c.pony.id === entityId);

		if (client) {
			//this.logger.log('client from party');
			return client;
		}

		const pending = self.party.pending.find(c => c.client.pony.id === entityId);

		if (pending) {
			//this.logger.log('pending from party');
			return pending.client;
		}
	}

	const notification = self.notifications.find(c => c.entityId === entityId);

	if (notification) {
		//this.logger.log('sender from notification');
		return notification.sender;
	}

	return undefined;
}

export function cancelEntityExpression(entity: ServerEntity) {
	if (entity.exprCancellable) {
		setEntityExpression(entity, undefined);
	}
}

export function setEntityExpression(
	entity: ServerEntity, expression: Expression | undefined, timeout = EXPRESSION_TIMEOUT, cancellable = false
) {
	expression = expression || entity.exprPermanent;
	const expr = encodeExpression(expression);

	(entity.options as PonyOptions).expr = expr;

	if (expression && timeout) {
		entity.exprTimeout = Date.now() + timeout;
	} else {
		entity.exprTimeout = undefined;
	}

	const sleeping = expression !== undefined && hasFlag(expression.extra, ExpressionExtra.Zzz);
	entity.exprCancellable = cancellable || sleeping;

	updateEntityExpression(entity);
}

export function playerBlush(pony: ServerEntity, args = '') {
	const expr = parseOrCurrentExpression(pony, args) || expression(Eye.Neutral, Eye.Neutral, Muzzle.Neutral);
	expr.extra |= ExpressionExtra.Blush;
	setEntityExpression(pony, expr, DAY, !!pony.exprCancellable);
}

export function parseOrCurrentExpression(pony: ServerEntity, message: string) {
	return parseExpression(message)
		|| decodeExpression((!pony.options || pony.options.expr == null) ? EMPTY_EXPRESSION : pony.options.expr);
}

export function playerSleep(pony: ServerEntity, args = '') {
	if (pony.vx === 0 && pony.vy === 0) {
		const base = parseOrCurrentExpression(pony, args) || expression(Eye.Closed, Eye.Closed, Muzzle.Neutral);
		const muzzle = CLOSED_MUZZLES.indexOf(base.muzzle) !== -1 ? base.muzzle : Muzzle.Neutral;
		const expr = { ...base, muzzle, left: Eye.Closed, right: Eye.Closed, extra: ExpressionExtra.Zzz };
		setEntityExpression(pony, expr, 0, true);
	}
}

export function playerLove(pony: ServerEntity, args = '') {
	const expr = parseOrCurrentExpression(pony, args) || expression(Eye.Neutral, Eye.Neutral, Muzzle.Smile);
	expr.extra |= ExpressionExtra.Hearts;
	setEntityExpression(pony, expr, DAY, !!pony.exprCancellable);
}

export function playerCry(pony: ServerEntity, args = '') {
	const expr = parseExpression(args) || expression(Eye.Sad, Eye.Sad, Muzzle.Frown);
	expr.extra = expr.extra | ExpressionExtra.Cry;
	setEntityExpression(pony, expr, 0);
}

const fruitTypes = entities.fruits.map(f => f.type);

export function interactWith(client: IClient, target: ServerEntity | undefined) {
	if (target) {
		const pony = client.pony;

		if (target.interact && (!target.interactRange || distance(pony, target) < target.interactRange)) {
			target.interact(target, client);
		} else if (target.triggerBounds && target.trigger) {
			if (containsPointWitBorder(target.x, target.y, target.triggerBounds, pony.x, pony.y, 3)) {
				target.trigger(target, client);
			} else {
				DEVELOPMENT && console.warn(`outside trigger bounds ` +
					`(bounds: ${target.x} ${target.y} ${JSON.stringify(target.triggerBounds)} point: ${pony.x} ${pony.y})`);
			}
		} else if (target.interactAction) {
			switch (target.interactAction) {
				case InteractAction.Toolbox: {
					switchTool(client, false);
					break;
				}
				case InteractAction.GiveLantern: {
					if (client.pony.options!.hold === entities.lanternOn.type) {
						unholdItem(pony);
					} else {
						holdItem(pony, entities.lanternOn.type);
					}
					break;
				}
				case InteractAction.GiveFruits: {
					const index = fruitTypes.indexOf(client.pony.options!.hold || 0) + 1;
					holdItem(client.pony, fruitTypes[index % fruitTypes.length]);
					break;
				}
				case InteractAction.GiveCookie1: {
					const hold = client.pony.options!.hold;
					let cookie = hold;

					while (hold === cookie) {
						cookie = sample(entities.candies1Types)!;
					}

					holdItem(client.pony, cookie!);
					break;
				}
				case InteractAction.GiveCookie2: {
					const hold = client.pony.options!.hold;
					let cookie = hold;

					while (hold === cookie) {
						cookie = sample(entities.candies2Types)!;
					}

					holdItem(client.pony, cookie!);
					break;
				}
				default:
					invalidEnum(target.interactAction);
			}
		}
	}
}

export function useHeldItem(client: IClient) {
	const hold = client.pony.options!.hold || 0;

	if (isGift(hold)) {
		openGift(client);
	}
}

export function canPerformAction(client: IClient) {
	return client.lastAction < Date.now();
}

export function updateEntityPlayerState(client: IClient, entity: ServerEntity) {
	const playerState = getPlayerState(client, entity);
	pushUpdateEntityToClient(client, { entity, flags: UpdateFlags.PlayerState, playerState });
}

// actions

export function turnHead(client: IClient) {
	if (canPerformAction(client)) {
		updateEntityState(client.pony, client.pony.state ^ EntityState.HeadTurned);
	}
}

const purpleGrapeTypes = entities.grapesPurple.map(x => x.type);
const greenGrapeTypes = entities.grapesGreen.map(x => x.type);

export function boop(client: IClient, now: number) {
	if (canPerformAction(client) && canBoop2(client.pony) && client.lastBoopAction < now) {
		cancelEntityExpression(client.pony);
		sendAction(client.pony, Action.Boop);

		if (!client.shadowed && (isPonySitting(client.pony) || isPonyStanding(client.pony))) {
			const boopRect = getBoopRect(client.pony);
			const boopBounds = withBorder(boopRect, 1);
			const entities = findEntitiesInBounds(client.map, boopBounds);
			const entity = entities.find(e => canBoopEntity(e, boopRect));

			if (entity) {
				if (entity.boop) {
					entity.boop(client);
				} else if (entity.type === PONY_TYPE) {
					const clientHold = client.pony.options!.hold || 0;

					if (isHoldingGrapes(entity) && clientHold !== grapeGreen.type && clientHold !== grapePurple.type) {
						let index = purpleGrapeTypes.indexOf(entity.options!.hold || 0);

						if (index !== -1) {
							holdItem(client.pony, grapePurple.type);

							if (index === (purpleGrapeTypes.length - 1)) {
								unholdItem(entity);
							} else {
								holdItem(entity, purpleGrapeTypes[index + 1]);
							}
						} else {
							let index = greenGrapeTypes.indexOf(entity.options!.hold || 0);

							if (index !== -1) {
								holdItem(client.pony, grapeGreen.type);

								if (index === (greenGrapeTypes.length - 1)) {
									unholdItem(entity);
								} else {
									holdItem(entity, greenGrapeTypes[index + 1]);
								}
							}
						}
					}
				}
			}
		}

		client.lastBoopAction = now + 500;
	}
}

export function stand(client: IClient) {
	if (canPerformAction(client) && canStand(client.pony, client.map)) {
		if (!isPonyFlying(client.pony)) {
			cancelEntityExpression(client.pony);
		}

		updateEntityState(client.pony, setPonyState(client.pony.state, EntityState.PonyStanding));
	}
}

const SIT_MAX_TIME = 2 * SECOND;
const SIT_MAX_DIST = 1;
const SIT_MAX_COUNT = 5;

function checkSuspiciousSitting(client: IClient) {
	const now = Date.now();
	const { x, y } = client.pony;
	const dist = distanceXY(x, y, client.lastSitX, client.lastSitY);

	if ((now - client.lastSitTime) < SIT_MAX_TIME && dist < SIT_MAX_DIST && findPlayersThetCanBeSitOn(client.map, client.pony)) {
		client.sitCount++;

		if (client.sitCount > SIT_MAX_COUNT) {
			client.reporter.warn(`Suspicious sitting`);
			client.sitCount = 0;
		}
	} else {
		client.sitCount = 1;
	}

	client.lastSitX = x;
	client.lastSitY = y;
	client.lastSitTime = now;
}

export function sit(client: IClient, settings: GameServerSettings) {
	if (canPerformAction(client) && canSit(client.pony, client.map)) {
		updateEntityState(client.pony, setPonyState(client.pony.state, EntityState.PonySitting));

		if (settings.reportSitting) {
			checkSuspiciousSitting(client);
		}
	}
}

export function lie(client: IClient) {
	if (canPerformAction(client) && canLie(client.pony, client.map)) {
		updateEntityState(client.pony, setPonyState(client.pony.state, EntityState.PonyLying));
	}
}

export function fly(client: IClient) {
	if (canPerformAction(client) && client.pony.canFly && !isPonyFlying(client.pony)) {
		cancelEntityExpression(client.pony);
		updateEntityState(client.pony, setPonyState(client.pony.state, EntityState.PonyFlying));
		client.pony.inTheAirDelay = FLY_DELAY;
	}
}

export function expressionAction(client: IClient, action: Action) {
	if (canPerformAction(client) && isExpressionAction(action) && client.lastExpressionAction < Date.now()) {
		cancelEntityExpression(client.pony);
		sendAction(client.pony, action);
		client.lastExpressionAction = Date.now() + 500;
	}
}

// hold

export function holdItem(entity: ServerEntity, hold: number) {
	if (entity.options && entity.options.hold !== hold) {
		updateEntityOptions(entity, { hold });
	}
}

export function unholdItem(entity: ServerEntity) {
	if (entity.options && entity.options.hold) {
		updateEntityOptions(entity, { hold: 0 });
		delete entity.options.hold;
	}
}

// toy

export function holdToy(entity: ServerEntity, toy: number) {
	if (entity.options && entity.options.toy !== toy) {
		updateEntityOptions(entity, { toy });
	}
}

export function unholdToy(entity: ServerEntity) {
	if (entity.options && entity.options.toy) {
		updateEntityOptions(entity, { toy: 0 });
		delete entity.options.toy;
	}
}

// gifts and toys

const giftTypes = [entities.gift2.type];

const toys = [
	// hat
	{ type: 0, multiplier: 20 },
	{ type: 0, multiplier: 10 },
	{ type: 0, multiplier: 5 },
	{ type: 0, multiplier: 1 }, // pink
	// snowpony
	{ type: 0, multiplier: 20 },
	{ type: 0, multiplier: 10 }, // clothes
	{ type: 0, multiplier: 1 }, // evil
	// gift
	{ type: 0, multiplier: 20 },
	{ type: 0, multiplier: 10 },
	{ type: 0, multiplier: 10 },
	{ type: 0, multiplier: 5 },
	{ type: 0, multiplier: 1 },
	// hanging thing
	{ type: 0, multiplier: 20 }, // bell
	{ type: 0, multiplier: 10 }, // mistletoe
	{ type: 0, multiplier: 5 }, // cookie
	{ type: 0, multiplier: 1 }, // spider
	// teddy
	{ type: 0, multiplier: 20 }, // brown
	{ type: 0, multiplier: 10 }, // brown angel
	{ type: 0, multiplier: 20 }, // black
	{ type: 0, multiplier: 10 }, // black angel
	{ type: 0, multiplier: 5 }, // brown clothes
	{ type: 0, multiplier: 5 }, // black clothes
	{ type: 0, multiplier: 1 }, // white santa
	// xmas tree
	{ type: 0, multiplier: 10 },
	{ type: 0, multiplier: 5 },
	// deer
	{ type: 0, multiplier: 5 },
	{ type: 0, multiplier: 1 }, // with clothes
	// candy horns
	{ type: 0, multiplier: 10 }, // one
	{ type: 0, multiplier: 2 }, // two
	{ type: 0, multiplier: 1 }, // two (alt)
	// star
	{ type: 0, multiplier: 5 },
	// halo
	{ type: 0, multiplier: 5 },
];

toys.forEach((toy, i) => toy.type = i + 1);

const toyTypes = flatten(toys.map(x => array(x.multiplier, x.type)));

function hasToyUnlocked(type: number, collectedToys: number) {
	const index = toys.findIndex(t => t.type === type);
	return hasFlag(collectedToys, 1 << index);
}

function unlockToy(type: number, collectedToys: number) {
	const index = toys.findIndex(t => t.type === type);
	return collectedToys | (1 << index);
}

export function getCollectedToysCount(client: IClient) {
	const stateToys = toInt((client.account.state || {}).toys);
	const total = toys.length;
	let collected = 0;

	for (let i = 0, bit = 1; i < total; i++ , bit <<= 1) {
		if (stateToys & bit) {
			collected++;
		}
	}

	return { collected, total };
}

export function getNextToyOrExtra(client: IClient) {
	const collectedToys = toInt((client.account.state || {}).toys);
	const options = client.pony.options || {};
	const extra = !!options.extra;
	const toy = toInt(options.toy);

	if (extra) {
		return { extra: false, toy: 0 };
	} else {
		for (let i = toys.findIndex(t => t.type === toy) + 1; i < toys.length; i++) {
			const type = toys[i].type;

			if (hasToyUnlocked(type, collectedToys)) {
				return { extra: false, toy: type };
			}
		}

		return { extra: true, toy: 0 };
	}
}

export function openGift(client: IClient) {
	const options = client.pony.options || {};

	if (isGift(options.hold)) {
		let toyType = 0;

		do {
			toyType = sample(toyTypes)!;
		} while (toyType === options.toy);

		sendAction(client.pony, Action.HoldPoof);
		unholdItem(client.pony);
		setTimeout(() => holdToy(client.pony, toyType), 200);

		const state = client.account.state || {};

		if (!hasToyUnlocked(toyType, toInt(state.toys))) {
			updateAccountState(client.account, state => {
				state.toys = unlockToy(toyType, toInt(state.toys));
			});
		}
	}
}

export function isGift(type: number | undefined) {
	return type !== undefined && includes(giftTypes, type);
}

export function isHiddenBy(a: IClient, b: IClient) {
	return a.hides.has(b.accountId) || b.hides.has(a.accountId) ||
		a.permaHides.has(b.accountId) || b.permaHides.has(a.accountId);
}

export function getPlayerState(client: IClient, entity: ServerEntity): EntityPlayerState {
	let state = EntityPlayerState.None;

	if (entity.client !== undefined) {
		if (isIgnored(client, entity.client)) {
			state |= EntityPlayerState.Ignored;
		}

		if (isHiddenBy(client, entity.client)) {
			state |= EntityPlayerState.Hidden;
		}

		if (isOnlineFriend(client, entity.client)) {
			state |= EntityPlayerState.Friend;
		}
	}

	return state;
}

export async function reloadFriends(client: IClient) {
	const friends = await findFriendIds(client.accountId);
	client.friends = new Set(friends);
	client.friendsCRC = undefined;
	client.actionParam(0, Action.FriendsCRC, undefined);
}

export function execAction(client: IClient, action: Action, settings: GameServerSettings) {
	switch (action) {
		case Action.Boop:
			boop(client, Date.now());
			break;
		case Action.TurnHead:
			turnHead(client);
			break;
		case Action.Stand:
			stand(client);
			break;
		case Action.Sit:
			sit(client, settings);
			break;
		case Action.Lie:
			lie(client);
			break;
		case Action.Fly:
			fly(client);
			break;
		case Action.Drop:
			unholdItem(client.pony);
			break;
		case Action.Sleep:
			playerSleep(client.pony);
			break;
		case Action.Blush:
			playerBlush(client.pony);
			break;
		case Action.Cry:
			playerCry(client.pony);
			break;
		case Action.Love:
			playerLove(client.pony);
			break;
		case Action.DropToy:
			unholdToy(client.pony);
			updateEntityOptions(client.pony, { extra: false });
			break;
		case Action.Magic:
			if (client.pony.canMagic) {
				const has = hasFlag(client.pony.state, EntityState.Magic);
				updateEntityState(client.pony, setFlag(client.pony.state, EntityState.Magic, !has));
			}
			break;
		case Action.SwitchTool:
			switchTool(client, false);
			break;
		case Action.SwitchToolRev:
			switchTool(client, true);
			break;
		case Action.SwitchToPlaceTool:
			holdItem(client.pony, entities.hammer.type);
			break;
		case Action.SwitchToTileTool:
			holdItem(client.pony, entities.shovel.type);
			break;
		default:
			if (isExpressionAction(action)) {
				expressionAction(client, action);
			} else {
				throw new Error(`Invalid action (${action})`);
			}
			break;
	}
}

export function switchTool(client: IClient, reverse: boolean) {
	const hold = client.pony.options!.hold || 0;
	const index = tools.findIndex(t => t.type === hold);
	const unholdIndex = reverse ? 0 : tools.length - 1;

	if (index === unholdIndex) {
		unholdItem(client.pony);
	} else {
		const newIndex = reverse ? (index === -1 ? tools.length - 1 : index - 1) : ((index + 1) % tools.length);
		const tool = tools[newIndex];
		holdItem(client.pony, tool.type);
		saySystem(client, tool.text);
	}
}

export function teleportTo(client: IClient, x: number, y: number) {
	fixPosition(client.pony, client.map, x, y, true);
	client.safeX = client.pony.x;
	client.safeY = client.pony.y;
	client.lastTime = 0;
}
