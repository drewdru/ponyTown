import { Socket, Method, SocketServer, Bin, getMethods } from 'ag-sockets';
import {
	PlayerAction, ModAction, ChatType, PonyData, IServerActions, TileType, Action, EditorAction, Entity,
	EntityOrPonyOptions, LeaveReason, SupporterInvite, InfoFlags, AccountSettings, FriendStatusFlags,
	SelectFlags, UpdateFlags, isValidModTile, isValidTile, MapFlags, EntityState, houseTiles
} from '../common/interfaces';
import { CharacterState, ServerConfig } from '../common/adminInterfaces';
import { PARTY_LIMIT, OFFLINE_PONY, TILE_CHANGE_RANGE, MIN_HIDE_TIME, MAX_HIDE_TIME, PONY_TYPE } from '../common/constants';
import { toInt, formatDuration, includes, clamp, hasFlag, distanceXY, computeFriendsCRC } from '../common/utils';
import { banMessage } from '../common/adminUtils';
import * as entities from '../common/entities';
import { IClient, IgnorePlayer, FindClientByEntityId, AccountService, GetSettings } from './serverInterfaces';
import { getModInfo } from './accountUtils';
import { NotificationService } from './services/notification';
import { PartyService } from './services/party';
import { World, findClientByAccountId, findAllOnlineFriends } from './world';
import { HidingService } from './services/hiding';
import {
	createCharacterState, interactWith, useHeldItem, setEntityExpression, getPlayerState, execAction,
	updateEntityPlayerState
} from './playerUtils';
import { allEntities } from './api/account';
import { CounterService } from './services/counter';
import { decodeExpression, isCancellableExpression } from '../common/encoders/expressionEncoder';
import { updateEntity, pushUpdateEntityToClient, pushUpdateTileToClient } from './entityUtils';
import { SupporterInvitesService } from './services/supporterInvites';
import { Move } from './move';
import { logger } from './logger';
import { findFriends } from './db';
import { Say, saySystem } from './chat';
import { getTile } from '../common/worldMap';
import { updateRegion, getExpectedRegion } from './regionUtils';
import { findEntities } from './serverMap';
import { FriendsService, toFriendOnline } from './services/friends';
import { setupCamera } from '../common/camera';
import { swapCharacter } from './characterUtils';
import { isOutsideMap } from '../common/collision';
import { createAnEntity } from '../common/entities';
import { mockPaletteManager } from '../common/ponyInfo';

interface AddedEntity {
	name: string;
	entities: Entity[];
}

const modActionNames = ['None', 'Report', 'Mute', 'Shadow', 'Kick', 'Ban'];
const playerActionNames = [
	'None',
	'Ignore',
	'Unignore',
	'InviteToParty',
	'RemoveFromParty',
	'PromotePartyLeader',
	'HidePlayer',
	'InviteToSupporterServers',
	'AddFriend',
	'RemoveFriend',
];

const editorAdded = new Map<string, AddedEntity[]>();
const debugRate = DEVELOPMENT ? '1000/s' : '';

@Socket({
	id: 'game',
	debug: false,
	connectionTokens: true,
	pingInterval: 3000,
	connectionTimeout: 10000,
	reconnectTimeout: 500,
	transferLimit: 4000,
	perMessageDeflate: false,
	keepOriginalRequest: true,
})
export class ServerActions implements IServerActions, SocketServer {
	constructor(
		private readonly client: IClient,
		private readonly world: World,
		private readonly notificationService: NotificationService,
		private readonly partyService: PartyService,
		private readonly supporterInvites: SupporterInvitesService,
		private readonly getSettings: GetSettings,
		private readonly server: ServerConfig,
		private readonly chatSay: Say,
		private readonly moveFunc: Move,
		private readonly hiding: HidingService,
		private readonly states: CounterService<CharacterState>,
		private readonly accountService: AccountService,
		private readonly ignorePlayer: IgnorePlayer,
		private readonly findClientByEntityId: FindClientByEntityId,
		private readonly friends: FriendsService,
	) {
	}
	private get account() {
		return this.client.account;
	}
	private get pony() {
		return this.client.pony;
	}
	private get map() {
		return this.client.map;
	}
	connected() {
		this.client.connectedTime = Date.now();
		this.client.lastPacket = Date.now();
		this.client.loading = true;
		this.client.reporter.systemLog(`joined [${this.server.id}] as "${this.client.characterName}" [${this.client.ip}]`);

		if (DEVELOPMENT && /slow/.test(this.client.characterName)) {
			setTimeout(() => this.world.joinClientToQueue(this.client), 5000);
		} else {
			this.world.joinClientToQueue(this.client);
		}
	}
	async disconnected() {
		const state = createCharacterState(this.pony, this.client.map);
		const duration = Date.now() - this.client.connectedTime;
		const leaveReason = this.client.leaveReason || 'disconnected';

		if (this.client.logDisconnect) {
			logger.warn(`disconnected (${leaveReason}) account: ${this.client.account.name} [${this.client.accountId}]`);
		}

		this.client.offline = true;
		this.client.offlineAt = new Date();
		this.client.reporter.systemLog(`left [${this.server.id}] (${leaveReason}) (${formatDuration(duration)})`);
		this.world.leaveClient(this.client);
		this.partyService.clientDisconnected(this.client);
		this.friends.clientDisconnected(this.client);
		this.states.add(this.client.characterId, state);

		await Promise.all([
			this.accountService.updateAccount(this.client.accountId, { lastVisit: new Date(), state: this.account.state }),
			this.accountService.updateCharacterState(this.client.characterId, state),
		]);
	}
	@Method({ rateLimit: '2/s', binary: [Bin.U32, Bin.Str, Bin.U8] })
	say(entityId: number, text: string, chatType: ChatType) {
		validateNumber(entityId, 'entityId');
		validateString(text, 'text');
		validateNumber(chatType, 'chatType');
		this.updateLastAction();

		if (this.client.isSwitchingMap)
			return;

		const target = entityId ? this.world.getEntityById(entityId) : undefined;
		this.chatSay(this.client, text, chatType, target && target.client, this.getSettings());
	}
	@Method({ rateLimit: '3/s', binary: [Bin.U32, Bin.U8] })
	select(entityId: number, flags: SelectFlags) {
		validateNumber(entityId, 'entityId');
		this.updateLastAction();

		if (this.client.isSwitchingMap)
			return;

		const entity = entityId === 0 ? undefined : (this.world.getEntityById(entityId) || this.getEntityFromClients(entityId));
		const mod = this.client.isMod;
		this.client.selected = entity;

		if (entity && entity.client && entity !== this.client.pony) {
			if (flags) {
				const baseOptions: Partial<EntityOrPonyOptions> = mod ? { modInfo: getModInfo(entity.client) } : {};
				const options = { ...baseOptions, ...entity.extraOptions };

				if (hasFlag(flags, SelectFlags.FetchInfo)) {
					const playerState = getPlayerState(this.client, entity);
					const flags = UpdateFlags.Options | UpdateFlags.Name | UpdateFlags.Info | UpdateFlags.PlayerState;
					pushUpdateEntityToClient(this.client, { entity, flags, options, playerState });
				} else if (hasFlag(flags, SelectFlags.FetchEx) || mod) {
					pushUpdateEntityToClient(this.client, { entity, flags: UpdateFlags.Options, options });
				}
			}
		} else if (entityId) {
			this.client.updateSelection(entityId, 0);
		}
	}
	@Method({ rateLimit: '2/s', serverRateLimit: '4/s', binary: [Bin.U32] })
	interact(entityId: number) {
		validateNumber(entityId, 'entityId');
		this.updateLastAction();

		if (this.client.isSwitchingMap)
			return;

		interactWith(this.client, this.world.getEntityById(entityId));
	}
	@Method({ rateLimit: '2/s', binary: [] })
	use() {
		this.updateLastAction();

		if (this.client.isSwitchingMap)
			return;

		useHeldItem(this.client);
	}
	@Method({ rateLimit: '3/s', serverRateLimit: '8/s', binary: [Bin.U8] })
	action(action: Action) {
		validateNumber(action, 'action');
		this.updateLastAction();

		switch (action) {
			case Action.KeepAlive:
				break;
			case Action.UnhideAllHiddenPlayers:
				this.hiding.requestUnhideAll(this.client);
				break;
			default:
				if (this.client.isSwitchingMap)
					return;

				execAction(this.client, action, this.getSettings());
				break;
		}
	}
	@Method({ rateLimit: '2/s', serverRateLimit: '4/s', binary: [Bin.U8, Bin.Obj] })
	actionParam(action: Action, param: any) {
		validateNumber(action, 'action');

		switch (action) {
			case Action.CancelSupporterInvite:
				validateString(param, 'param');
				// TODO: ...
				break;
			case Action.SwapCharacter: {
				validateString(param, 'param');
				this.updateLastAction();

				if (param !== this.client.characterId) {
					swapCharacter(this.client, this.world, { account: this.client.account._id, _id: param })
						.catch(e => this.client.reporter.error(e));
				}

				break;
			}
			case Action.RemoveFriend: {
				validateString(param, 'param');
				this.updateLastAction();
				const target = findClientByAccountId(this.world, param);

				if (target) {
					this.friends.remove(this.client, target);
				} else {
					this.friends.removeByAccountId(this.client, param);
				}

				break;
			}
			case Action.FriendsCRC: {
				validateNumber(param, 'param');
				const crc = param >>> 0;

				if (this.client.friendsCRC === undefined) {
					this.client.friendsCRC = computeFriendsCRC(Array.from(this.client.friends.values()));
				}

				if (this.client.friendsCRC !== crc) {
					findFriends(this.client.accountId, true)
						.then(friends => {
							this.client.updateFriends(friends.map(f => {
								const client = findClientByAccountId(this.world, f.accountId);

								return {
									accountId: f.accountId,
									accountName: f.accountName,
									entityId: client && client.pony.id,
									status: client ? FriendStatusFlags.Online : FriendStatusFlags.None,
									name: f.name,
									nameBad: f.nameBad,
									info: f.pony,
								};
							}), true);
						})
						.catch(e => logger.error(e));
				}

				break;
			}
			case Action.RemoveEntity: {
				validateNumber(param, 'param');
				this.updateLastAction();
				const entity = this.world.getEntityById(param | 0);

				if (
					entity && hasFlag(entity.state, EntityState.Editable) && this.pony.options!.hold === entities.broom.type &&
					this.map.regions.some(r => includes(r.entities, entity))
				) {
					if (this.isHouseLocked()) {
						saySystem(this.client, `House is locked`);
					} else {
						this.world.removeEntity(entity, this.map);
					}
				}

				break;
			}
			case Action.PlaceEntity: {
				if (
					!param || typeof param !== 'object' || typeof param.x !== 'number' || typeof param.y !== 'number' ||
					typeof param.type !== 'number'
				) {
					return;
				}

				this.updateLastAction();

				const { x, y, type } = param as { x: number; y: number; type: number; };

				if (
					isOutsideMap(x, y, this.map) ||
					!entities.placeableEntities.some(x => x.type === type) ||
					!hasFlag(this.map.flags, MapFlags.EditableEntities)
				) {
					return saySystem(this.client, `Cannot place object`);
				}

				if (this.isHouseLocked()) {
					return saySystem(this.client, `House is locked`);
				}

				let totalEditableEntities = 0;

				for (const region of this.map.regions) {
					for (const entity of region.entities) {
						if (hasFlag(entity.state, EntityState.Editable)) {
							totalEditableEntities++;
						}
					}
				}

				if (totalEditableEntities >= this.map.editableEntityLimit) {
					return saySystem(this.client, `Object limit reached`);
				}

				const entity = createAnEntity(type, 0, x, y, {}, mockPaletteManager, this.world);
				entity.state |= EntityState.Editable;
				this.world.addEntity(entity, this.map);
				break;
			}
			default:
				throw new Error(`Invalid Action (${action})`);
		}
	}
	@Method({ rateLimit: '10/s', serverRateLimit: '20/s', binary: [Bin.U8, Bin.Obj] })
	actionParam2(action: Action, param: any) {
		validateNumber(action, 'action');

		switch (action) {
			case Action.Info:
				validateNumber(param, 'param');
				this.client.incognito = hasFlag(param, InfoFlags.Incognito);
				this.client.supportsWasm = hasFlag(param, InfoFlags.SupportsWASM);
				this.client.supportsLetAndConst = hasFlag(param, InfoFlags.SupportsLetAndConst);
				break;
			case Action.RequestEntityInfo: {
				validateNumber(param, 'param');

				const entity = this.world.getEntityById(param | 0);

				if (entity && entity.client) {
					this.client.entityInfo(entity.id, entity.name || '', entity.crc || 0, !!entity.nameBad);
				}

				break;
			}
			default:
				throw new Error(`Invalid Action (${action})`);
		}
	}
	@Method({ promise: true, rateLimit: '1/s', binary: [] })
	async getInvites(): Promise<SupporterInvite[]> {
		return [
			{ id: 'a', info: OFFLINE_PONY, name: 'Offline Pony', active: true },
			{ id: 'b', info: OFFLINE_PONY, name: 'Fuzzy', active: true },
			{ id: 'c', info: OFFLINE_PONY, name: 'Molly', active: false },
		];
	}
	@Method({ rateLimit: '2/s', serverRateLimit: '4/s', binary: [Bin.U32] })
	expression(expression: number) {
		validateNumber(expression, 'expression');
		this.updateLastAction();

		const expr = decodeExpression(expression);
		const cancellable = !!expr && isCancellableExpression(expr);

		if (cancellable) {
			setEntityExpression(this.pony, expr, 0, true);
		} else {
			this.pony.exprPermanent = expr;
			setEntityExpression(this.pony, undefined, 0);
		}
	}
	@Method({ rateLimit: '3/s', binary: [Bin.U32, Bin.U8, Bin.Obj] })
	playerAction(entityId: number, action: PlayerAction, param: unknown) {
		validateNumber(entityId, 'entityId');
		validateNumber(action, 'action');
		this.updateLastAction();

		const target = this.getClientByEntityId(entityId);

		if (!target) {
			this.client.reporter.warnLog(`No client for: ${playerActionNames[action]} [${action}], id: ${entityId}`);
			return;
		}

		switch (action) {
			case PlayerAction.Ignore:
			case PlayerAction.Unignore:
				this.ignorePlayer(this.client, target, action === PlayerAction.Ignore);
				break;
			case PlayerAction.InviteToParty:
				this.partyService.invite(this.client, target);
				break;
			case PlayerAction.RemoveFromParty:
				this.partyService.remove(this.client, target);
				break;
			case PlayerAction.PromotePartyLeader:
				this.partyService.promoteLeader(this.client, target);
				break;
			case PlayerAction.HidePlayer:
				const hideFor = toInt(param);
				if (hideFor === 0) {
					this.hiding.requestHide(this.client, target, 0);
				} else {
					this.hiding.requestHide(this.client, target, clamp(hideFor, MIN_HIDE_TIME, MAX_HIDE_TIME));
				}
				break;
			case PlayerAction.InviteToSupporterServers:
				this.supporterInvites.requestInvite(this.client, target);
				break;
			case PlayerAction.AddFriend:
				this.friends.add(this.client, target);
				break;
			case PlayerAction.RemoveFriend:
				this.friends.remove(this.client, target);
				break;
			default:
				throw new Error(`Invalid player action (${playerActionNames[action]}) [${action}]`);
		}
	}
	@Method({ rateLimit: '1/s', binary: [] })
	leaveParty() {
		this.updateLastAction();

		if (this.client.isSwitchingMap)
			return;

		if (this.client.party) {
			this.partyService.remove(this.client.party.leader, this.client);
		}
	}
	@Method({ promise: true, rateLimit: '10/s', binary: [Bin.U32, Bin.U8, Bin.I32] })
	async otherAction(entityId: number, action: ModAction, param: number) {
		validateNumber(entityId, 'entityId');
		validateNumber(action, 'action');
		validateNumber(param, 'param');
		this.updateLastAction();

		const target = this.getClientForModAction(entityId, modActionNames[action]);

		switch (action) {
			case ModAction.Report:
				await this.logModAction(target, 'Reported');
				break;
			case ModAction.Mute:
				await this.setBan(target, 'mute', param);
				break;
			case ModAction.Shadow:
				await this.setBan(target, 'shadow', param);
				break;
			case ModAction.Ban:
				await this.setBan(target, 'ban', -1);
				break;
			case ModAction.Kick:
				await this.world.kick(target, 'mod kick');
				break;
			default:
				throw new Error(`Invalid mod action (${action})`);
		}
	}
	private setBan(target: IClient, field: 'mute' | 'shadow' | 'ban', value: number) {
		const timeout = value > 0 ? Date.now() + value : value;
		this.logModAction(target, banMessage(field, timeout));
		return this.accountService.update(target.accountId, { [field]: timeout });
	}
	@Method({ promise: true, binary: [Bin.U32, Bin.Str] })
	async setNote(entityId: number, text: string) {
		validateNumber(entityId, 'entityId');
		validateString(text, 'text', true);
		this.updateLastAction();

		const client = this.getClientForModAction(entityId, 'setNote');
		await this.accountService.update(client.accountId, { note: text });
	}
	@Method({ rateLimit: '5/s', binary: [Bin.Obj] })
	async saveSettings(settings: AccountSettings) {
		this.updateLastAction();

		const wasHidden = !!this.client.accountSettings.hidden;
		await this.accountService.updateSettings(this.account, settings);
		this.client.accountSettings = { ...this.account.settings };
		this.client.reporter.systemLog(`Saved settings`);
		const isHidden = !!this.client.accountSettings.hidden;

		if (wasHidden !== isHidden) {
			for (const friend of findAllOnlineFriends(this.world, this.client)) {
				if (isHidden) {
					friend.updateFriends([{ accountId: this.client.accountId, status: FriendStatusFlags.None }], false);
				} else {
					friend.updateFriends([toFriendOnline(this.client)], false);
				}

				updateEntityPlayerState(friend, this.client.pony);
			}
		}
	}
	@Method({ binary: [Bin.U16] })
	acceptNotification(id: number) {
		validateNumber(id, 'id');
		this.updateLastAction();
		this.notificationService.acceptNotification(this.client, id);
	}
	@Method({ binary: [Bin.U16] })
	rejectNotification(id: number) {
		validateNumber(id, 'id');
		this.updateLastAction();
		this.notificationService.rejectNotification(this.client, id);
	}
	@Method({ binary: [[Bin.U32]] })
	getPonies(ids: number[]) {
		const party = this.client.party;

		const createPonyData = ({ pony }: IClient): PonyData => {
			return [
				pony.id,
				pony.options,
				pony.encodedName,
				pony.encryptedInfoSafe,
				getPlayerState(this.client, pony),
				!!pony.nameBad,
			];
		};

		if (party && ids && ids.length && ids.length <= PARTY_LIMIT) {
			const ponies = party.clients
				.filter(c => includes(ids, c.pony.id))
				.map(createPonyData);
			this.client.updatePonies(ponies);
		}
	}
	@Method({ binary: [] })
	loaded() {
		this.client.loading = false;
	}
	@Method({ binary: [] })
	fixedPosition() {
		this.client.fixingPosition = false;
	}
	@Method({ binary: [Bin.U32, Bin.U32, Bin.U16, Bin.U16] })
	updateCamera(x: number, y: number, width: number, height: number) {
		validateNumber(x, 'x');
		validateNumber(y, 'y');
		validateNumber(width, 'width');
		validateNumber(height, 'height');
		this.updateLastAction();

		setupCamera(this.client.camera, x, y, width, height, this.client.map);
	}
	@Method({ binary: [Bin.U32, Bin.U32, Bin.U32, Bin.U32, Bin.U16] })
	move(a: number, b: number, c: number, d: number, e: number) {
		validateNumber(a, 'a');
		validateNumber(b, 'b');
		validateNumber(c, 'c');
		validateNumber(d, 'd');
		validateNumber(e, 'e');
		this.updateLastAction();

		this.moveFunc(this.client, Date.now(), a, b, c, d, e, this.getSettings());
	}
	private isHouseLocked() {
		return this.map.editingLocked && this.client.party && this.client.party.leader !== this.client;
	}
	@Method({ rateLimit: debugRate || '3/s', serverRateLimit: debugRate || '7/s', binary: [Bin.U16, Bin.U16, Bin.U8] })
	changeTile(x: number, y: number, type: TileType) {
		validateNumber(x, 'x');
		validateNumber(y, 'y');
		validateNumber(type, 'type');
		this.updateLastAction();

		if (this.client.isSwitchingMap)
			return;

		const wallTile = type === TileType.WallH || type === TileType.WallV;

		if (hasFlag(this.map.flags, MapFlags.EditableWalls) && wallTile) {
			if (this.isHouseLocked()) {
				saySystem(this.client, `House is locked`);
			} else {
				this.world.toggleWall(this.map, x, y, type);
			}
		} else if (BETA && this.client.isMod && wallTile) {
			this.world.toggleWall(this.map, x, y, type);
		} else if (hasFlag(this.map.flags, MapFlags.EditableTiles) && this.pony.options!.hold === entities.shovel.type) {
			if (!houseTiles.some(t => t.type === type))
				return;

			if (this.isHouseLocked())
				return saySystem(this.client, `House is locked`);

			this.world.setTile(this.map, x, y, type);
		} else if (BETA && this.client.isMod && isValidModTile(type)) {
			this.world.setTile(this.map, x, y, type);
		} else if (isValidTile(type)) {
			if ((BETA || distanceXY(x, y, this.pony.x, this.pony.y) < TILE_CHANGE_RANGE)) {
				const tile = getTile(this.map, x, y);

				if (tile === TileType.Dirt || tile === TileType.Grass) {
					if (this.client.shadowed) {
						pushUpdateTileToClient(this.client, x, y, type);
					} else {
						this.world.setTile(this.map, x, y, type);
					}
				}
			}
		}
	}
	@Method({ rateLimit: '1/s', binary: [] })
	leave() {
		this.client.leaveReason = 'leave';
		this.client.left(LeaveReason.None);
	}
	@Method({ binary: [Bin.Obj] })
	editorAction(action: EditorAction) {
		if (this.server.flags.editor && this.client.isMod) {
			const added = editorAdded.get(this.client.accountId) || [];
			editorAdded.set(this.client.accountId, added);

			switch (action.type) {
				case 'place':
					if (includes(allEntities, action.entity)) {
						const name = action.entity;
						const entity = (entities as any)[name](action.x, action.y);
						const toAdd = Array.isArray(entity) ? entity : [entity];
						toAdd.forEach(e => this.world.addEntity(e, this.map));
						added.push({ name, entities: toAdd });
					} else {
						saySystem(this.client, 'Invalid entity');
					}
					break;
				case 'move':
					for (const { id, x, y } of action.entities) {
						const entity = this.world.getEntityById(id);

						if (entity && entity.type !== PONY_TYPE) {
							entity.x = x;
							entity.y = y;
							updateEntity(entity, false);
							updateRegion(entity, this.client.map);
							getExpectedRegion(entity, this.client.map).colliderDirty = true;
						}
					}
					break;
				case 'undo':
					const remove = added.pop();
					remove && remove.entities.forEach(e => this.world.removeEntityFromSomeMap(e));
					break;
				case 'clear':
					added.forEach(x => x.entities.forEach(e => this.world.removeEntityFromSomeMap(e)));
					added.length = 0;
					break;
				case 'list':
					const existingEntities = added
						.filter(({ entities }) => entities.some(e => !!this.world.getEntityById(e.id)))
						.map(({ name, entities: [{ x, y }] }) => ({ name, x, y }));
					this.client.entityList(existingEntities);
					break;
				case 'remove':
					for (const id of action.entities) {
						const entity = this.world.getEntityById(id);

						if (entity && entity.type !== PONY_TYPE) {
							this.world.removeEntityFromSomeMap(entity);
						}
					}
					break;
				case 'tile': {
					const { x, y, tile, size } = action;

					if (isValidModTile(tile)) {
						for (let iy = 0; iy < size; iy++) {
							for (let ix = 0; ix < size; ix++) {
								this.world.setTile(this.map, x + ix, y + iy, tile);
							}
						}
					}

					break;
				}
				case 'party': {
					const entities = findEntities(this.map, e => !!e.client && /^debug/.test(e.name || ''));

					for (const e of entities.slice(0, PARTY_LIMIT - 1)) {
						this.partyService.invite(this.client, e.client!);
					}

					break;
				}
				default:
					throw new Error(`Invalid editor action (${action})`);
			}
		}
	}
	private logModAction(client: IClient, title: string) {
		client.reporter.system(`${title} by ${this.account.name}`);
	}
	private getClientForModAction(entityId: number, action: string) {
		if (!this.client.isMod) {
			this.client.disconnect(true, true);
			throw new Error(`Action not allowed (${action})`);
		}

		const client = this.world.getClientByEntityId(entityId);

		if (!client) {
			throw new Error(`Client does not exist (${action})`);
		}

		if (client.accountId === this.client.accountId) {
			throw new Error(`Cannot perform action on self (${action})`);
		}

		return client;
	}
	private getEntityFromClients(entityId: number) {
		const client = this.getClientByEntityId(entityId);
		return client && client.pony;
	}
	private getClientByEntityId(entityId: number) {
		return this.world.getClientByEntityId(entityId) || this.findClientByEntityId(this.client, entityId);
	}
	private updateLastAction() {
		this.client.lastPacket = Date.now();
	}
}

function validateNumber(value: number, fieldName: string) {
	if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
		throw new Error(`Not a number (${fieldName})`);
	}
}

function validateString(value: string, fieldName: string, allowNull = false) {
	if (typeof value !== 'string' && !(allowNull && value === null)) {
		throw new Error(`Not a string (${fieldName})`);
	}
}

if (DEVELOPMENT) {
	/* istanbul ignore next */
	getMethods(ServerActions)
		.forEach(m => m.options.binary || console.error(`Missing binary encoding for ServerActions.${m.name}()`));
}
