import { getWriterBuffer } from 'ag-sockets';
import { remove, compact } from 'lodash';
import {
	TileType, WorldState, Season, Holiday, WorldStateFlags, LeaveReason, NotificationFlags, UpdateFlags, Action,
} from '../common/interfaces';
import { removeItem, distance, clamp, randomPoint, includes, fromNow } from '../common/utils';
import { HOUR_LENGTH, DAY_LENGTH } from '../common/timeUtils';
import {
	AFK_TIMEOUT, MAP_DISCARD_TIMEOUT, JOINS_PER_UPDATE, REMOVE_INTERVAL, REMOVE_TIMEOUT,
	MAP_SWITCHES_PER_UPDATE, MINUTE, SERVER_FPS, HOUR
} from '../common/constants';
import {
	IClient, ServerEntity, Controller, GetSettings, ServerNotification, SocketStats, ServerMap, MapUsage
} from './serverInterfaces';
import { isTileLocked, getMapInfo, setTile, hasAnyClients, createMinimap } from './serverMap';
import { getModInfo } from './accountUtils';
import { IAccount } from './db';
import { PartyService } from './services/party';
import { NotificationService } from './services/notification';
import { AroundEntry, ServerLiveSettings, ServerConfig } from '../common/adminInterfaces';
import { fixPosition, updateEntity, pushRemoveEntityToClient, pushUpdateEntityToClient } from './entityUtils';
import { isBanned, isShadowed } from '../common/adminUtils';
import {
	createAndUpdateCharacterState, setEntityExpression, reloadFriends, updateEntityPlayerState, resetClientUpdates, isMutedOrShadowed
} from './playerUtils';
import {
	sparseRegionUpdate, addToRegion, removeFromRegion, unsubscribeFromOutOfRangeRegions,
	subscribeToRegionsInRange, unsubscribeFromAllRegions, commitRegionUpdates, updateRegions, setupTiming,
	clearTiming, resetEncodeUpdate
} from './regionUtils';
import { roundPosition, roundPositionXMidPixel, roundPositionYMidPixel } from '../common/positionUtils';
import { logger } from './logger';
import { updateCamera, centerCameraOn } from '../common/camera';
import { timingStart, timingEnd } from './timing';
import { getRegionGlobal, getTile } from '../common/worldMap';
import { getEntityTypeName } from '../common/entities';
import { toFriendOnline, toFriendOffline, FriendsService } from './services/friends';
// import { Pool, createPool } from './pool';
import { isStaticCollision, getCollisionStats, fixCollision, updatePosition } from '../common/collision';
import { HidingService } from './services/hiding';
import { generateRegionCollider } from '../common/region';
import { updateTileIndices } from '../client/tileUtils';
import { removeEntityFromRegion } from './serverRegion';
import { createIslandMap } from './maps/islandMap';
import { createHouseMap } from './maps/houseMap';
import { updateMainMapSeason } from './maps/mainMap';

interface MapSwitch {
	map: ServerMap;
	x: number;
	y: number;
	client: IClient;
}

interface ReservedID {
	id: number;
	time: number;
}

const MAP_SOFT_LIMIT = 10000;

export class World {
	season = Season.Summer;
	holiday = Holiday.None;
	maps: ServerMap[] = [];
	controllers: Controller[] = [];
	options = {
		restoreTerrain: !DEVELOPMENT,
	};
	clients: IClient[] = [];
	clientsByAccount = new Map<string, IClient>();
	joinQueue: IClient[] = [];
	mapSwitchQueue: MapSwitch[] = [];
	now = 0;
	start = 0;
	// mapPools = new Map<string, Pool<ServerMap>>();
	private maxId = 0 >>> 0;
	private offlineClients: IClient[] = [];
	private baseTime = 0;
	private entityById = new Map<number, ServerEntity>();
	private reservedIds = new Map<number, string>();
	private reservedIdsByKey = new Map<string, ReservedID>();
	constructor(
		public readonly server: ServerConfig,
		private readonly partyService: PartyService,
		private readonly friendsService: FriendsService,
		public readonly hidingService: HidingService,
		private readonly notifications: NotificationService,
		private readonly getSettings: GetSettings,
		private readonly liveSettings: ServerLiveSettings,
		private readonly socketStats: SocketStats,
	) {
		// this.mapPools.set('island', createPool(10, () => createIslandMap(this, true), resetIslandMap));
		// this.mapPools.set('house', createPool(10, () => createHouseMap(this, true), resetHouseMap));

		partyService.partyChanged.subscribe(client => {
			if (client.isConnected && client.map.usage === MapUsage.Party) {
				if (
					client.party && client.party.leader === client && client.map.instance === client.accountId &&
					!this.maps.some(m => m.id === client.map.id && m.instance === client.party!.id)
				) {
					client.map.instance = client.party.id;
				} else {
					refreshMap(this, client);
				}
			}
		});
	}
	get featureFlags() {
		return this.server.flags;
	}
	// entities
	get time() {
		return this.baseTime + Date.now();
	}
	setTime(hour: number) {
		let newBaseTime = hour * HOUR_LENGTH - (Date.now() % DAY_LENGTH);

		while (newBaseTime < 0) {
			newBaseTime += DAY_LENGTH;
		}

		this.baseTime = newBaseTime;
		this.updateWorldState();
	}
	setTile(map: ServerMap, x: number, y: number, type: TileType) {
		if (!BETA && map.tilesLocked)
			return;

		if (x >= 0 && y >= 0 && x < map.width && y < map.height && !isTileLocked(map, x, y) && type !== getTile(map, x, y)) {
			setTile(map, x, y, type);
		}
	}
	toggleWall(map: ServerMap, x: number, y: number, type: TileType) {
		for (const controller of map.controllers) {
			if (controller.toggleWall) {
				controller.toggleWall(x, y, type);
			}
		}
	}
	getState(): WorldState {
		return {
			time: this.time,
			season: this.season,
			holiday: this.holiday,
			flags: this.getSettings().filterSwears ? WorldStateFlags.Safe : WorldStateFlags.None,
			featureFlags: this.featureFlags,
		};
	}
	setSeason(season: Season, holiday: Holiday) {
		this.season = season;
		this.holiday = holiday;
		this.updateWorldState();
		updateMainMapSeason(this, this.getMainMap(), season, holiday);
	}
	private updateWorldState() {
		const state = this.getState();

		for (const client of this.clients) {
			client.worldState(state, false);
		}
	}
	getEntityById(id: number) {
		return this.entityById.get(id);
	}
	getNewEntityId() {
		do {
			this.maxId = (this.maxId + 1) >>> 0;
		} while (this.maxId === 0 || this.entityById.has(this.maxId) || this.reservedIds.has(this.maxId));

		return this.maxId;
	}
	addEntity(entity: ServerEntity, map: ServerMap) {
		if (DEVELOPMENT) {
			if (entity.update) {
				console.error('Entity update() method is only for client-side use');
			}

			if (entity.id && this.entityById.has(entity.id)) {
				console.error(`Entity already added to the world ${getEntityTypeName(entity.type)} [${entity.id}]`);
			}
		}

		entity.id = entity.id || this.getNewEntityId();
		entity.timestamp = this.now / 1000;
		this.entityById.set(entity.id, entity);
		roundPosition(entity);
		const region = getRegionGlobal(map, entity.x, entity.y);
		addToRegion(entity, region, map);
		return entity;
	}
	removeEntity(entity: ServerEntity, map: ServerMap) {
		let removed = false;

		if (entity.region) {
			removed = removeFromRegion(entity, entity.region, map);
		}

		this.entityById.delete(entity.id);
		return removed;
	}
	removeEntityFromSomeMap(entity: ServerEntity) {
		const map = this.maps.find(m => m.regions.some(r => includes(r.entities, entity)));

		if (map) {
			this.removeEntity(entity, map);
		} else {
			DEVELOPMENT && logger.error(`Missing map for entity`);
		}
	}
	// map
	getMainMap() {
		return this.maps[0];
	}
	switchToMap(client: IClient, map: ServerMap, x: number, y: number) {
		if (client.map === map) {
			DEVELOPMENT && logger.error(`Switching to the same map`);
			return;
		}

		if (this.mapSwitchQueue.some(x => x.client === client)) {
			DEVELOPMENT && logger.error(`Already in map switch queue`);
			return;
		}

		this.mapSwitchQueue.push({ client, map, x, y });

		client.isSwitchingMap = true;
		client.pony.vx = 0;
		client.pony.vy = 0;
		updateEntity(client.pony, false);
		client.mapSwitching();
	}
	actualSwitchToMap(client: IClient, map: ServerMap, x: number, y: number) {
		unsubscribeFromAllRegions(client, false);

		if (client.pony.region) {
			removeFromRegion(client.pony, client.pony.region, client.map);
		}

		x = clamp(x, 0, map.width);
		y = clamp(y, 0, map.height);

		resetClientUpdates(client);

		client.mapState(getMapInfo(map), map.state);
		client.map = map;
		client.pony.x = x;
		client.pony.y = y;
		client.safeX = x;
		client.safeY = y;
		client.lastTime = 0;
		client.lastMapSwitch = Date.now();
		client.loading = true;
		client.lastCameraX = 0;
		client.lastCameraY = 0;
		client.lastCameraW = 0;
		client.lastCameraH = 0;
		client.isSwitchingMap = false;

		addToRegion(client.pony, getRegionGlobal(map, x, y), map);
		fixPosition(client.pony, map, x, y, true);

		client.reporter.systemLog(`Switched map to [${client.map.id || 'main'}]`);
	}
	// main
	initialize(now: number) {
		this.start = now;
		this.now = now;
		const nowSeconds = now / 1000;

		for (const controller of this.controllers) {
			controller.initialize(nowSeconds);
		}

		for (const map of this.maps) {
			for (const controller of map.controllers) {
				controller.initialize(nowSeconds);
			}
		}
	}
	update(delta: number, now: number) {
		const started = Date.now();

		timingStart('world.update()');

		resetEncodeUpdate();

		this.now = now;

		const nowSeconds = now / 1000;
		const deltaSeconds = delta / 1000;

		timingStart('update tiles');
		for (const map of this.maps) {
			if (!map.dontUpdateTilesAndColliders) {
				for (const region of map.regions) {
					if (region.tilesDirty) {
						updateTileIndices(region, map);
					}
				}
			}
		}
		timingEnd();

		timingStart('update colliders');
		for (const map of this.maps) {
			if (!map.dontUpdateTilesAndColliders) {
				for (const region of map.regions) {
					if (region.colliderDirty) {
						generateRegionCollider(region, map);
					}
				}
			}
		}
		timingEnd();

		timingStart('update positions');
		for (const map of this.maps) {
			for (const region of map.regions) {
				// TODO: update only moving entities, separate list of movingEntities
				for (const entity of region.movables) {
					// TODO: make sure timestamp is initialized if entity is moving
					const delta = nowSeconds - entity.timestamp;

					if (delta > 0) {
						if (entity.vx !== 0 || entity.vy !== 0) {
							timingStart('updatePosition()');
							updatePosition(entity, delta, map);
							timingEnd();
						}

						entity.timestamp = nowSeconds;
					}
				}
			}
		}
		timingEnd();

		timingStart('updateCamera + updateSubscriptions');
		for (const client of this.clients) {
			if (updateClientCamera(client)) {
				unsubscribeFromOutOfRangeRegions(client);
				subscribeToRegionsInRange(client);
			}
		}
		timingEnd();

		timingStart('update controllers');
		for (const controller of this.controllers) {
			controller.update(deltaSeconds, nowSeconds);
		}

		for (const map of this.maps) {
			for (const controller of map.controllers) {
				controller.update(deltaSeconds, nowSeconds);
			}
		}
		timingEnd();

		timingStart('actualSwitchToMap');
		for (let i = 0; i < MAP_SWITCHES_PER_UPDATE && this.mapSwitchQueue.length; i++) {
			const { client, map, x, y } = this.mapSwitchQueue.shift()!;
			this.actualSwitchToMap(client, map, x, y);
		}
		timingEnd();

		timingStart('updateRegions');
		updateRegions(this.maps); // NOTE: creates transfers
		timingEnd();

		timingStart('timeoutEntityExpression + inTheAirDelay');
		for (const { pony } of this.clients) {
			// timeout expressions
			if (pony.exprTimeout && pony.exprTimeout < now) {
				setEntityExpression(pony, undefined); // NOTE: creates updates
			}

			// count down in-the-air delay
			if (pony.inTheAirDelay !== undefined && pony.inTheAirDelay > 0) {
				pony.inTheAirDelay -= deltaSeconds;
			}
		}
		timingEnd();

		// const { totalUpdates, reusedUpdates } = this.updatesStats();

		timingStart(`commitRegionUpdates`); // [${totalUpdates} / ${reusedUpdates}]`);
		for (const map of this.maps) {
			commitRegionUpdates(map.regions);
		}
		timingEnd();

		let clientsWithAdds = 0;
		let clientsWithUpdates = 0;
		let clientsWithSays = 0;
		let totalSays = 0;

		timingStart(`send updates`);
		for (const client of this.clients) {
			const { updateQueue, regionUpdates, saysQueue, unsubscribes, subscribes } = client;
			const updateBuffer = updateQueue.offset ? getWriterBuffer(updateQueue) : null;
			const total = updateQueue.offset + regionUpdates.length + saysQueue.length + unsubscribes.length + subscribes.length;

			if (total !== 0) {
				if (updateQueue.offset > 0)
					clientsWithAdds++;
				if (regionUpdates.length > 0)
					clientsWithUpdates++;
				if (saysQueue.length > 0)
					clientsWithSays++;
				totalSays += saysQueue.length;

				setupTiming(client);
				timingStart('client.update()');
				client.update(unsubscribes, subscribes, updateBuffer, regionUpdates, saysQueue);
				timingEnd();
				clearTiming(client);

				resetClientUpdates(client);
			}
		}
		timingEnd();

		timingStart('joinQueuedClients');
		if (Date.now() < (started + (1000 / SERVER_FPS))) {
			for (let i = 0; i < JOINS_PER_UPDATE && this.joinQueue.length > 0; i++) {
				this.joinClientToWorld(this.joinQueue.shift()!); // NOTE: creates adds
			}
		}
		timingEnd();

		const { isCollidingCount, isCollidingObjectCount } = getCollisionStats();

		timingStart(`adds [${clientsWithAdds}]\n` +
			`updates [${clientsWithUpdates}]\n` +
			`says [${totalSays} / ${clientsWithSays}]\n` +
			`sockets [${this.socketStatsText()}]\n` +
			`collisions [${isCollidingObjectCount} / ${isCollidingCount}]`);
		this.cleanupOfflineClients();
		timingEnd();

		timingEnd();
	}
	sparseUpdate(now: number) {
		timingStart('world.sparseUpdate()');

		timingStart('sparse update controllers');
		for (const controller of this.controllers) {
			if (controller.sparseUpdate !== undefined) {
				controller.sparseUpdate();
			}
		}

		for (const map of this.maps) {
			for (const controller of map.controllers) {
				if (controller.sparseUpdate !== undefined) {
					controller.sparseUpdate();
				}
			}
		}
		timingEnd();

		timingStart('sparseRegionUpdate');
		for (const map of this.maps) {
			for (const region of map.regions) {
				sparseRegionUpdate(map, region, this.options);
			}
		}
		timingEnd();

		timingStart('kick afk clients');
		for (const client of this.clients) {
			if ((now - client.lastPacket) > AFK_TIMEOUT) {
				this.kick(client, 'afk');
			}
		}
		timingEnd();

		timingStart('send queue status (join)');
		for (let i = 0; i < this.joinQueue.length; i++) {
			this.joinQueue[i].queue(i + 1);
		}
		timingEnd();

		timingStart('send queue status (map)');
		for (let i = 0; i < this.mapSwitchQueue.length; i++) {
			this.mapSwitchQueue[i].client.queue(i + 1);
		}
		timingEnd();

		timingStart('cleanup unused maps');
		const discardTimeout = this.maps.length > MAP_SOFT_LIMIT ? 5 * MINUTE : MAP_DISCARD_TIMEOUT;
		const mapDiscardThreshold = now - discardTimeout;

		for (const map of this.maps) {
			if (map.instance && (hasAnyClients(map) || this.mapSwitchQueue.some(q => q.map === map))) {
				map.lastUsed = now;
			}
		}

		for (let i = this.maps.length - 1; i > 0; i--) {
			const map = this.maps[i];

			if (map.instance && map.lastUsed < mapDiscardThreshold) {
				this.maps.splice(i, 1);
				// const pool = this.mapPools.get(map.id);

				// if (pool && pool.dispose(map)) {
				// 	for (const region of map.regions) {
				// 		resetRegionUpdates(region);
				// 	}
				// } else {
				for (const region of map.regions) {
					for (const entity of region.entities) {
						this.entityById.delete(entity.id);
					}
				}
				// }
			}
		}
		timingEnd();

		timingStart('cleanup reserved ids');
		const threshold = Date.now() - 5 * MINUTE;

		for (const key of Array.from(this.reservedIdsByKey.keys())) { // TODO: avoid doing this to save gc
			const { id, time } = this.reservedIdsByKey.get(key)!;

			if (time < threshold) {
				this.reservedIdsByKey.delete(key);
				this.reservedIds.delete(id);
			}
		}
		timingEnd();

		timingStart('cleanup parties');
		this.partyService.cleanupParties();
		timingEnd();

		timingEnd();
	}
	private socketStatsText() {
		const { sent, received, sentPackets, receivedPackets } = this.socketStats.stats();
		return `sent: ${(sent / 1024).toFixed(2)} kb (${sentPackets}), ` +
			`recv: ${(received / 1024).toFixed(2)} kb (${receivedPackets})`;
	}
	updatesStats() {
		timingStart('updatesStats()');

		let totalUpdates = 0, reusedUpdates = 0;

		for (const map of this.maps) {
			for (const region of map.regions) {
				totalUpdates += region.entityUpdates.length;
				reusedUpdates += region.reusedUpdates;
			}
		}

		timingEnd();

		return { totalUpdates, reusedUpdates };
	}
	// clients
	private lastCleanup = 0;
	private cleanupOfflineClients() {
		const now = Date.now();

		if ((now - this.lastCleanup) > REMOVE_INTERVAL) {
			this.lastCleanup = now;
			const removeFrom = now - REMOVE_TIMEOUT;

			remove(this.offlineClients, c => c.offline && !c.party && c.offlineAt && c.offlineAt.getTime() < removeFrom);
		}
	}
	joinClientToQueue(client: IClient) {
		if (this.liveSettings.shutdown) {
			client.leaveReason = 'shutdown';
			client.disconnect(false, true);
			return;
		}

		const { tokenId } = client;

		function findClientsToKick(clients: IClient[]) {
			return clients.filter(c => c.tokenId === tokenId);
		}

		const clientsToKick = [
			...findClientsToKick(this.clients),
			...findClientsToKick(this.joinQueue),
		];

		for (const client of clientsToKick) {
			const reason = client.tokenId === tokenId ? 'kicked [joining again]' : 'kicked [alone on ip]';
			this.kick(client, reason, LeaveReason.None, true);
		}

		// TODO: wait for all clients to be kicked before adding to the queue
		//       another queue before joinQueue

		this.joinQueue.push(client);
	}
	joinClientToWorld(client: IClient) {
		timingStart('joinClientToWorld()');

		const key = `${client.accountId}:${client.characterId}`;
		const reserved = this.reservedIdsByKey.get(key);

		if (reserved) {
			client.pony.id = reserved.id;
			this.reservedIdsByKey.delete(client.accountId);
			this.reservedIds.delete(reserved.id);
		} else {
			client.pony.id = this.getNewEntityId();
		}

		client.myEntity(client.pony.id, client.characterName, client.character.info!, client.characterId, client.pony.crc || 0);

		this.clients.push(client);
		this.clientsByAccount.set(client.accountId, client);
		this.partyService.clientConnected(client);
		this.hidingService.connected(client);

		let map = findOrCreateMapForClient(this, client.characterState.map || '', client);

		if (!map) {
			map = this.getMainMap();
			const { x, y } = randomPoint(map.spawnArea);
			client.pony.x = x;
			client.pony.y = y;
		}

		if (isStaticCollision(client.pony, map)) {
			if (!fixCollision(client.pony, map)) {
				const { x, y } = randomPoint(map.spawnArea);
				client.pony.x = x;
				client.pony.y = y;
			}
		}

		client.pony.x = roundPositionXMidPixel(client.pony.x);
		client.pony.y = roundPositionYMidPixel(client.pony.y);
		client.map = map;

		centerCameraOn(client.camera, client.pony);

		client.worldState(this.getState(), true);
		client.mapState(getMapInfo(client.map), client.map.state);

		if (BETA) {
			timingStart('minimap');
			client.mapTest(client.map.width, client.map.height, createMinimap(this, client.map));
			timingEnd();
		}

		updateCamera(client.camera, client.pony, map);

		this.addEntity(client.pony, client.map);

		const visibleOnlineFriends: IClient[] = [];

		for (const c of this.clients) {
			if (c.selected && c.selected.client && c.selected.client.accountId === client.accountId) {
				c.updateSelection(c.selected.id, client.pony.id);
			}

			if (client.friends.has(c.accountId)) {
				if (!c.accountSettings.hidden && !c.shadowed) {
					visibleOnlineFriends.push(c);
				}

				if (!client.accountSettings.hidden) {
					c.updateFriends([toFriendOnline(client)], false);
				}

				if (!c.friends.has(client.accountId)) {
					reloadFriends(c).catch(e => logger.error(e));
				}
			} else if (c.friends.has(client.accountId)) {
				reloadFriends(c).catch(e => logger.error(e));
			}
		}

		if (visibleOnlineFriends.length) {
			client.updateFriends(visibleOnlineFriends.map(toFriendOnline), false);
		}

		if (this.liveSettings.updating) {
			this.notifications.addNotification(client, updateNotification());
		}

		// TEMP: duplicate pony bug
		if (client.map.instance) {
			for (const region of client.map.regions) {
				for (const entity of region.entities) {
					if (entity.client !== undefined && entity !== client.pony && entity.client.accountId === client.accountId) {
						const sameClients = this.clients.filter(c => c.accountId === client.accountId).length;

						client.reporter.systemLog(`Client pony already on map ` +
							`(old: ${entity.id}, new: ${client.pony.id}, sameClients: ${sameClients})`);
					}
				}
			}
		}

		timingEnd();
	}
	getClientByEntityId(entityId: number) {
		if (entityId === 0) {
			return undefined;
		} else {
			const byPonyId = (c: IClient) => c.pony.id === entityId;
			return this.clients.find(byPonyId) || this.offlineClients.find(byPonyId);
		}
	}
	private removeEntityFromAnyMap(entity: ServerEntity) {
		for (const map of this.maps) {
			for (const region of map.regions) {
				const index = region.entities.indexOf(entity);

				if (index !== - 1) {
					removeEntityFromRegion(region, entity, map);
					return map;
				}
			}
		}

		return undefined;
	}
	leaveClient(client: IClient) {
		const friends = findAllOnlineFriends(this, client);

		if (!client.accountSettings.hidden) {
			for (const friend of friends) {
				friend.updateFriends([toFriendOffline(client)], false);
			}
		}

		this.reservedIds.set(client.pony.id, client.accountId);
		this.reservedIdsByKey.set(`${client.accountId}:${client.characterId}`, { id: client.pony.id, time: Date.now() });

		if (!this.removeEntity(client.pony, client.map)) {
			const map = this.removeEntityFromAnyMap(client.pony);
			client.reporter.systemLog(`Removing from any map (` +
				`expected: ${client.map && client.map.id} [${client.map && client.map.instance}], ` +
				`actual: ${map && map.id} [${map && map.instance}])`);
		}

		unsubscribeFromAllRegions(client, true);
		removeItem(this.joinQueue, client);
		removeItem(this.clients, client);
		this.clientsByAccount.delete(client.accountId);
		this.offlineClients.push(client);

		const index = this.mapSwitchQueue.findIndex(x => x.client === client);

		if (index !== -1) {
			this.mapSwitchQueue.splice(index, 1);
		}
	}
	notifyHidden(by: string, who: string) {
		const byClient = findClientByAccountId(this, by);
		const whoClient = findClientByAccountId(this, who);

		if (byClient && whoClient) {
			updateEntityPlayerState(byClient, whoClient.pony);
			updateEntityPlayerState(whoClient, byClient.pony);
		}
	}
	resetToSpawn(client: IClient) {
		Object.assign(client.pony, randomPoint(client.map.spawnArea));
	}
	kick(client: IClient | undefined, leaveReason = 'kicked', reason = LeaveReason.None, force = false) {
		if (client) {
			removeItem(this.joinQueue, client);
			this.notifications.rejectAll(client);
			this.leaveClient(client);
			client.leaveReason = leaveReason;
			client.left(reason);

			if (force) {
				client.disconnect(true);
			} else {
				setTimeout(() => {
					if (client.isConnected) {
						client.disconnect(true);
					}
				}, 200);
			}
		}

		return !!client;
	}
	kickAll() {
		this.clients.slice().forEach(c => this.kick(c, 'kickAll'));
		this.joinQueue.slice().forEach(c => c.disconnect());
		this.joinQueue = [];
	}
	kickByAccount(accountId: string) {
		return this.kick(findClientByAccountId(this, accountId), 'kickByAccount');
	}
	kickByCharacter(characterId: string) {
		return this.kick(findClientByCharacterId(this, characterId), 'kickByCharacter');
	}
	accountUpdated(account: IAccount) {
		const accountId = account._id.toString();
		const client = findClientByAccountId(this, accountId);

		if (client) {
			this.updateClientAccount(client, account);

			for (const c of this.clients) {
				if (c.isMod && c.selected === client.pony) {
					pushUpdateEntityToClient(c, { entity: client.pony, flags: UpdateFlags.Options, options: { modInfo: getModInfo(client) } });
				}
			}
		}
	}
	private updateClientAccount(client: IClient, newAccount: IAccount) {
		const oldAccount = client.account;
		client.account = newAccount;

		if (oldAccount.ban !== newAccount.ban && isBanned(newAccount)) {
			sendAcl(client);
			this.kick(client, 'kick (ban)');
			return;
		}

		if (oldAccount.shadow !== newAccount.shadow) {
			if (isShadowed(newAccount)) {
				this.shadow(client);
			} else if (isShadowed(oldAccount)) {
				sendAcl(client);
				this.kick(client, 'kick (unshadow)');
				return;
			}
		}

		const shouldSendAcl = oldAccount.mute !== newAccount.mute
			|| oldAccount.ban !== newAccount.ban
			|| oldAccount.shadow !== newAccount.shadow;

		if (shouldSendAcl) {
			sendAcl(client);
		}
	}
	private shadow(client: IClient) {
		client.shadowed = true;
		this.partyService.clientDisconnected(client);
		this.friendsService.clientDisconnected(client);
		this.notifications.dismissAll(client);

		if (client.pony.region) {
			for (const c of client.pony.region.clients) {
				if (c !== client) {
					pushRemoveEntityToClient(c, client.pony);
				}
			}
		}
	}
	// update notification
	notifyUpdate() {
		for (const client of this.clients) {
			this.notifications.addNotification(client, updateNotification());
		}
	}
	saveClientStates() {
		for (const client of this.clients) {
			createAndUpdateCharacterState(client, this.server);
		}
	}
}

// account creation lock
function sendAcl(client: IClient) {
	const acl = isMutedOrShadowed(client) ? fromNow(12 * HOUR) : new Date(0);
	client.actionParam(client.pony.id, Action.ACL, acl.toISOString());
}

function updateNotification(): ServerNotification {
	return {
		id: 0,
		name: '',
		message: 'Server will restart shortly for updates and maintenance',
		flags: NotificationFlags.Ok,
	};
}

export function refreshMap(world: World, client: IClient) {
	const map = findOrCreateMapForClient(world, client.map.id, client);

	if (map) {
		world.switchToMap(client, map, client.pony.x, client.pony.y);
	} else {
		logger.warn(`Missing map: ${client.map.id}`);
	}
}

export function goToMap(world: World, client: IClient, id: string, spawn?: string) {
	const map = findOrCreateMapForClient(world, id, client);

	if (map) {
		const area = spawn && map.spawns.get(spawn) || map.spawnArea;
		const { x, y } = randomPoint(area);
		world.switchToMap(client, map, x, y);
	} else {
		logger.warn(`Missing map: ${id}`);
	}
}

function findOrCreateMapInstance(world: World, id: string, instance: string) {
	let map = world.maps.find(m => m.id === id && m.instance === instance);

	if (!map) {
		// const pool = world.mapPools.get(id);

		// if (!pool) {
		// 	throw new Error(`Invalid map id: ${id}`);
		// }

		switch (id) {
			case 'house':
				map = createHouseMap(world, true);
				break;
			case 'island':
				map = createIslandMap(world, true);
				break;
			default:
				throw new Error(`Invalid map id: ${id}`);
		}

		// map = pool.create();
		map.instance = instance;
		map.lastUsed = Date.now();
		map.controllers.forEach(c => c.initialize(world.now / 1000));
		world.maps.push(map);
	}

	return map;
}

function findOrCreateMapForClient(world: World, id: string, client: IClient) {
	const map = world.maps.find(m => !m.instance && m.id === id);

	if (map) {
		return map;
	} else {
		if (client.party) {
			return findOrCreateMapInstance(world, id, client.party.id);
		} else {
			return findOrCreateMapInstance(world, id, client.accountId);
		}
	}
}

function updateClientCamera(client: IClient) {
	const camera = client.camera;

	updateCamera(camera, client.pony, client.map);

	if (
		client.lastCameraX !== camera.x || client.lastCameraY !== camera.y ||
		client.lastCameraW !== camera.w || client.lastCameraH !== camera.h
	) {
		client.lastCameraX = camera.x;
		client.lastCameraY = camera.y;
		client.lastCameraW = camera.w;
		client.lastCameraH = camera.h;
		return true;
	} else {
		return false;
	}
}

export function findAllOnlineFriends(world: World, client: IClient) {
	return compact(Array.from(client.friends.keys())
		.map(account => findClientByAccountId(world, account)));
}

export function findClientByAccountId(world: World, accountId: string) {
	return world.clientsByAccount.get(accountId);
}

export function findClientByCharacterId(world: World, characterId: string) {
	return world.clients.find(c => c.characterId === characterId);
}

export function findClientsAroundAccountId(world: World, accountId: string): AroundEntry[] {
	const client = findClientByAccountId(world, accountId);

	return client ? world.clients
		.filter(c => c !== client && c.map === client.map)
		.map(c => ({
			account: c.accountId,
			distance: distance(client.pony, c.pony),
			party: !!(c.party && c.party === client.party),
		}))
		.filter(x => x.distance < 5 || x.party)
		.sort((a, b) => a.distance - b.distance)
		.slice(0, 12) : [];
}
