"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ag_sockets_1 = require("ag-sockets");
const lodash_1 = require("lodash");
const utils_1 = require("../common/utils");
const timeUtils_1 = require("../common/timeUtils");
const constants_1 = require("../common/constants");
const serverMap_1 = require("./serverMap");
const accountUtils_1 = require("./accountUtils");
const entityUtils_1 = require("./entityUtils");
const adminUtils_1 = require("../common/adminUtils");
const playerUtils_1 = require("./playerUtils");
const regionUtils_1 = require("./regionUtils");
const positionUtils_1 = require("../common/positionUtils");
const logger_1 = require("./logger");
const camera_1 = require("../common/camera");
const timing_1 = require("./timing");
const worldMap_1 = require("../common/worldMap");
const entities_1 = require("../common/entities");
const friends_1 = require("./services/friends");
// import { Pool, createPool } from './pool';
const collision_1 = require("../common/collision");
const region_1 = require("../common/region");
const tileUtils_1 = require("../client/tileUtils");
const serverRegion_1 = require("./serverRegion");
const islandMap_1 = require("./maps/islandMap");
const houseMap_1 = require("./maps/houseMap");
const mainMap_1 = require("./maps/mainMap");
const MAP_SOFT_LIMIT = 10000;
class World {
    constructor(server, partyService, friendsService, hidingService, notifications, getSettings, liveSettings, socketStats) {
        // this.mapPools.set('island', createPool(10, () => createIslandMap(this, true), resetIslandMap));
        // this.mapPools.set('house', createPool(10, () => createHouseMap(this, true), resetHouseMap));
        this.server = server;
        this.partyService = partyService;
        this.friendsService = friendsService;
        this.hidingService = hidingService;
        this.notifications = notifications;
        this.getSettings = getSettings;
        this.liveSettings = liveSettings;
        this.socketStats = socketStats;
        this.season = 1 /* Summer */;
        this.holiday = 0 /* None */;
        this.maps = [];
        this.controllers = [];
        this.options = {
            restoreTerrain: !DEVELOPMENT,
        };
        this.clients = [];
        this.clientsByAccount = new Map();
        this.joinQueue = [];
        this.mapSwitchQueue = [];
        this.now = 0;
        this.start = 0;
        // mapPools = new Map<string, Pool<ServerMap>>();
        this.maxId = 0 >>> 0;
        this.offlineClients = [];
        this.baseTime = 0;
        this.entityById = new Map();
        this.reservedIds = new Map();
        this.reservedIdsByKey = new Map();
        // clients
        this.lastCleanup = 0;
        partyService.partyChanged.subscribe(client => {
            if (client.isConnected && client.map.usage === 1 /* Party */) {
                if (client.party && client.party.leader === client && client.map.instance === client.accountId &&
                    !this.maps.some(m => m.id === client.map.id && m.instance === client.party.id)) {
                    client.map.instance = client.party.id;
                }
                else {
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
    setTime(hour) {
        let newBaseTime = hour * timeUtils_1.HOUR_LENGTH - (Date.now() % timeUtils_1.DAY_LENGTH);
        while (newBaseTime < 0) {
            newBaseTime += timeUtils_1.DAY_LENGTH;
        }
        this.baseTime = newBaseTime;
        this.updateWorldState();
    }
    setTile(map, x, y, type) {
        if (!BETA && map.tilesLocked)
            return;
        if (x >= 0 && y >= 0 && x < map.width && y < map.height && !serverMap_1.isTileLocked(map, x, y) && type !== worldMap_1.getTile(map, x, y)) {
            serverMap_1.setTile(map, x, y, type);
        }
    }
    toggleWall(map, x, y, type) {
        for (const controller of map.controllers) {
            if (controller.toggleWall) {
                controller.toggleWall(x, y, type);
            }
        }
    }
    getState() {
        return {
            time: this.time,
            season: this.season,
            holiday: this.holiday,
            flags: this.getSettings().filterSwears ? 1 /* Safe */ : 0 /* None */,
            featureFlags: this.featureFlags,
        };
    }
    setSeason(season, holiday) {
        this.season = season;
        this.holiday = holiday;
        this.updateWorldState();
        mainMap_1.updateMainMapSeason(this, this.getMainMap(), season, holiday);
    }
    updateWorldState() {
        const state = this.getState();
        for (const client of this.clients) {
            client.worldState(state, false);
        }
    }
    getEntityById(id) {
        return this.entityById.get(id);
    }
    getNewEntityId() {
        do {
            this.maxId = (this.maxId + 1) >>> 0;
        } while (this.maxId === 0 || this.entityById.has(this.maxId) || this.reservedIds.has(this.maxId));
        return this.maxId;
    }
    addEntity(entity, map) {
        if (DEVELOPMENT) {
            if (entity.update) {
                console.error('Entity update() method is only for client-side use');
            }
            if (entity.id && this.entityById.has(entity.id)) {
                console.error(`Entity already added to the world ${entities_1.getEntityTypeName(entity.type)} [${entity.id}]`);
            }
        }
        entity.id = entity.id || this.getNewEntityId();
        entity.timestamp = this.now / 1000;
        this.entityById.set(entity.id, entity);
        positionUtils_1.roundPosition(entity);
        const region = worldMap_1.getRegionGlobal(map, entity.x, entity.y);
        regionUtils_1.addToRegion(entity, region, map);
        return entity;
    }
    removeEntity(entity, map) {
        let removed = false;
        if (entity.region) {
            removed = regionUtils_1.removeFromRegion(entity, entity.region, map);
        }
        this.entityById.delete(entity.id);
        return removed;
    }
    removeEntityFromSomeMap(entity) {
        const map = this.maps.find(m => m.regions.some(r => utils_1.includes(r.entities, entity)));
        if (map) {
            this.removeEntity(entity, map);
        }
        else {
            DEVELOPMENT && logger_1.logger.error(`Missing map for entity`);
        }
    }
    // map
    getMainMap() {
        return this.maps[0];
    }
    switchToMap(client, map, x, y) {
        if (client.map === map) {
            DEVELOPMENT && logger_1.logger.error(`Switching to the same map`);
            return;
        }
        if (this.mapSwitchQueue.some(x => x.client === client)) {
            DEVELOPMENT && logger_1.logger.error(`Already in map switch queue`);
            return;
        }
        this.mapSwitchQueue.push({ client, map, x, y });
        client.isSwitchingMap = true;
        client.pony.vx = 0;
        client.pony.vy = 0;
        entityUtils_1.updateEntity(client.pony, false);
        client.mapSwitching();
    }
    actualSwitchToMap(client, map, x, y) {
        regionUtils_1.unsubscribeFromAllRegions(client, false);
        if (client.pony.region) {
            regionUtils_1.removeFromRegion(client.pony, client.pony.region, client.map);
        }
        x = utils_1.clamp(x, 0, map.width);
        y = utils_1.clamp(y, 0, map.height);
        playerUtils_1.resetClientUpdates(client);
        client.mapState(serverMap_1.getMapInfo(map), map.state);
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
        regionUtils_1.addToRegion(client.pony, worldMap_1.getRegionGlobal(map, x, y), map);
        entityUtils_1.fixPosition(client.pony, map, x, y, true);
        client.reporter.systemLog(`Switched map to [${client.map.id || 'main'}]`);
    }
    // main
    initialize(now) {
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
    update(delta, now) {
        const started = Date.now();
        timing_1.timingStart('world.update()');
        regionUtils_1.resetEncodeUpdate();
        this.now = now;
        const nowSeconds = now / 1000;
        const deltaSeconds = delta / 1000;
        timing_1.timingStart('update tiles');
        for (const map of this.maps) {
            if (!map.dontUpdateTilesAndColliders) {
                for (const region of map.regions) {
                    if (region.tilesDirty) {
                        tileUtils_1.updateTileIndices(region, map);
                    }
                }
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('update colliders');
        for (const map of this.maps) {
            if (!map.dontUpdateTilesAndColliders) {
                for (const region of map.regions) {
                    if (region.colliderDirty) {
                        region_1.generateRegionCollider(region, map);
                    }
                }
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('update positions');
        for (const map of this.maps) {
            for (const region of map.regions) {
                // TODO: update only moving entities, separate list of movingEntities
                for (const entity of region.movables) {
                    // TODO: make sure timestamp is initialized if entity is moving
                    const delta = nowSeconds - entity.timestamp;
                    if (delta > 0) {
                        if (entity.vx !== 0 || entity.vy !== 0) {
                            timing_1.timingStart('updatePosition()');
                            collision_1.updatePosition(entity, delta, map);
                            timing_1.timingEnd();
                        }
                        entity.timestamp = nowSeconds;
                    }
                }
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('updateCamera + updateSubscriptions');
        for (const client of this.clients) {
            if (updateClientCamera(client)) {
                regionUtils_1.unsubscribeFromOutOfRangeRegions(client);
                regionUtils_1.subscribeToRegionsInRange(client);
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('update controllers');
        for (const controller of this.controllers) {
            controller.update(deltaSeconds, nowSeconds);
        }
        for (const map of this.maps) {
            for (const controller of map.controllers) {
                controller.update(deltaSeconds, nowSeconds);
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('actualSwitchToMap');
        for (let i = 0; i < constants_1.MAP_SWITCHES_PER_UPDATE && this.mapSwitchQueue.length; i++) {
            const { client, map, x, y } = this.mapSwitchQueue.shift();
            this.actualSwitchToMap(client, map, x, y);
        }
        timing_1.timingEnd();
        timing_1.timingStart('updateRegions');
        regionUtils_1.updateRegions(this.maps); // NOTE: creates transfers
        timing_1.timingEnd();
        timing_1.timingStart('timeoutEntityExpression + inTheAirDelay');
        for (const { pony } of this.clients) {
            // timeout expressions
            if (pony.exprTimeout && pony.exprTimeout < now) {
                playerUtils_1.setEntityExpression(pony, undefined); // NOTE: creates updates
            }
            // count down in-the-air delay
            if (pony.inTheAirDelay !== undefined && pony.inTheAirDelay > 0) {
                pony.inTheAirDelay -= deltaSeconds;
            }
        }
        timing_1.timingEnd();
        // const { totalUpdates, reusedUpdates } = this.updatesStats();
        timing_1.timingStart(`commitRegionUpdates`); // [${totalUpdates} / ${reusedUpdates}]`);
        for (const map of this.maps) {
            regionUtils_1.commitRegionUpdates(map.regions);
        }
        timing_1.timingEnd();
        let clientsWithAdds = 0;
        let clientsWithUpdates = 0;
        let clientsWithSays = 0;
        let totalSays = 0;
        timing_1.timingStart(`send updates`);
        for (const client of this.clients) {
            const { updateQueue, regionUpdates, saysQueue, unsubscribes, subscribes } = client;
            const updateBuffer = updateQueue.offset ? ag_sockets_1.getWriterBuffer(updateQueue) : null;
            const total = updateQueue.offset + regionUpdates.length + saysQueue.length + unsubscribes.length + subscribes.length;
            if (total !== 0) {
                if (updateQueue.offset > 0)
                    clientsWithAdds++;
                if (regionUpdates.length > 0)
                    clientsWithUpdates++;
                if (saysQueue.length > 0)
                    clientsWithSays++;
                totalSays += saysQueue.length;
                regionUtils_1.setupTiming(client);
                timing_1.timingStart('client.update()');
                client.update(unsubscribes, subscribes, updateBuffer, regionUpdates, saysQueue);
                timing_1.timingEnd();
                regionUtils_1.clearTiming(client);
                playerUtils_1.resetClientUpdates(client);
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('joinQueuedClients');
        if (Date.now() < (started + (1000 / constants_1.SERVER_FPS))) {
            for (let i = 0; i < constants_1.JOINS_PER_UPDATE && this.joinQueue.length > 0; i++) {
                this.joinClientToWorld(this.joinQueue.shift()); // NOTE: creates adds
            }
        }
        timing_1.timingEnd();
        const { isCollidingCount, isCollidingObjectCount } = collision_1.getCollisionStats();
        timing_1.timingStart(`adds [${clientsWithAdds}]\n` +
            `updates [${clientsWithUpdates}]\n` +
            `says [${totalSays} / ${clientsWithSays}]\n` +
            `sockets [${this.socketStatsText()}]\n` +
            `collisions [${isCollidingObjectCount} / ${isCollidingCount}]`);
        this.cleanupOfflineClients();
        timing_1.timingEnd();
        timing_1.timingEnd();
    }
    sparseUpdate(now) {
        timing_1.timingStart('world.sparseUpdate()');
        timing_1.timingStart('sparse update controllers');
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
        timing_1.timingEnd();
        timing_1.timingStart('sparseRegionUpdate');
        for (const map of this.maps) {
            for (const region of map.regions) {
                regionUtils_1.sparseRegionUpdate(map, region, this.options);
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('kick afk clients');
        for (const client of this.clients) {
            if ((now - client.lastPacket) > constants_1.AFK_TIMEOUT) {
                this.kick(client, 'afk');
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('send queue status (join)');
        for (let i = 0; i < this.joinQueue.length; i++) {
            this.joinQueue[i].queue(i + 1);
        }
        timing_1.timingEnd();
        timing_1.timingStart('send queue status (map)');
        for (let i = 0; i < this.mapSwitchQueue.length; i++) {
            this.mapSwitchQueue[i].client.queue(i + 1);
        }
        timing_1.timingEnd();
        timing_1.timingStart('cleanup unused maps');
        const discardTimeout = this.maps.length > MAP_SOFT_LIMIT ? 5 * constants_1.MINUTE : constants_1.MAP_DISCARD_TIMEOUT;
        const mapDiscardThreshold = now - discardTimeout;
        for (const map of this.maps) {
            if (map.instance && (serverMap_1.hasAnyClients(map) || this.mapSwitchQueue.some(q => q.map === map))) {
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
        timing_1.timingEnd();
        timing_1.timingStart('cleanup reserved ids');
        const threshold = Date.now() - 5 * constants_1.MINUTE;
        for (const key of Array.from(this.reservedIdsByKey.keys())) { // TODO: avoid doing this to save gc
            const { id, time } = this.reservedIdsByKey.get(key);
            if (time < threshold) {
                this.reservedIdsByKey.delete(key);
                this.reservedIds.delete(id);
            }
        }
        timing_1.timingEnd();
        timing_1.timingStart('cleanup parties');
        this.partyService.cleanupParties();
        timing_1.timingEnd();
        timing_1.timingEnd();
    }
    socketStatsText() {
        const { sent, received, sentPackets, receivedPackets } = this.socketStats.stats();
        return `sent: ${(sent / 1024).toFixed(2)} kb (${sentPackets}), ` +
            `recv: ${(received / 1024).toFixed(2)} kb (${receivedPackets})`;
    }
    updatesStats() {
        timing_1.timingStart('updatesStats()');
        let totalUpdates = 0, reusedUpdates = 0;
        for (const map of this.maps) {
            for (const region of map.regions) {
                totalUpdates += region.entityUpdates.length;
                reusedUpdates += region.reusedUpdates;
            }
        }
        timing_1.timingEnd();
        return { totalUpdates, reusedUpdates };
    }
    cleanupOfflineClients() {
        const now = Date.now();
        if ((now - this.lastCleanup) > constants_1.REMOVE_INTERVAL) {
            this.lastCleanup = now;
            const removeFrom = now - constants_1.REMOVE_TIMEOUT;
            lodash_1.remove(this.offlineClients, c => c.offline && !c.party && c.offlineAt && c.offlineAt.getTime() < removeFrom);
        }
    }
    joinClientToQueue(client) {
        if (this.liveSettings.shutdown) {
            client.leaveReason = 'shutdown';
            client.disconnect(false, true);
            return;
        }
        const { tokenId } = client;
        function findClientsToKick(clients) {
            return clients.filter(c => c.tokenId === tokenId);
        }
        const clientsToKick = [
            ...findClientsToKick(this.clients),
            ...findClientsToKick(this.joinQueue),
        ];
        for (const client of clientsToKick) {
            const reason = client.tokenId === tokenId ? 'kicked [joining again]' : 'kicked [alone on ip]';
            this.kick(client, reason, 0 /* None */, true);
        }
        // TODO: wait for all clients to be kicked before adding to the queue
        //       another queue before joinQueue
        this.joinQueue.push(client);
    }
    joinClientToWorld(client) {
        timing_1.timingStart('joinClientToWorld()');
        const key = `${client.accountId}:${client.characterId}`;
        const reserved = this.reservedIdsByKey.get(key);
        if (reserved) {
            client.pony.id = reserved.id;
            this.reservedIdsByKey.delete(client.accountId);
            this.reservedIds.delete(reserved.id);
        }
        else {
            client.pony.id = this.getNewEntityId();
        }
        client.myEntity(client.pony.id, client.characterName, client.character.info, client.characterId, client.pony.crc || 0);
        this.clients.push(client);
        this.clientsByAccount.set(client.accountId, client);
        this.partyService.clientConnected(client);
        this.hidingService.connected(client);
        let map = findOrCreateMapForClient(this, client.characterState.map || '', client);
        if (!map) {
            map = this.getMainMap();
            const { x, y } = utils_1.randomPoint(map.spawnArea);
            client.pony.x = x;
            client.pony.y = y;
        }
        if (collision_1.isStaticCollision(client.pony, map)) {
            if (!collision_1.fixCollision(client.pony, map)) {
                const { x, y } = utils_1.randomPoint(map.spawnArea);
                client.pony.x = x;
                client.pony.y = y;
            }
        }
        client.pony.x = positionUtils_1.roundPositionXMidPixel(client.pony.x);
        client.pony.y = positionUtils_1.roundPositionYMidPixel(client.pony.y);
        client.map = map;
        camera_1.centerCameraOn(client.camera, client.pony);
        client.worldState(this.getState(), true);
        client.mapState(serverMap_1.getMapInfo(client.map), client.map.state);
        if (BETA) {
            timing_1.timingStart('minimap');
            client.mapTest(client.map.width, client.map.height, serverMap_1.createMinimap(this, client.map));
            timing_1.timingEnd();
        }
        camera_1.updateCamera(client.camera, client.pony, map);
        this.addEntity(client.pony, client.map);
        const visibleOnlineFriends = [];
        for (const c of this.clients) {
            if (c.selected && c.selected.client && c.selected.client.accountId === client.accountId) {
                c.updateSelection(c.selected.id, client.pony.id);
            }
            if (client.friends.has(c.accountId)) {
                if (!c.accountSettings.hidden && !c.shadowed) {
                    visibleOnlineFriends.push(c);
                }
                if (!client.accountSettings.hidden) {
                    c.updateFriends([friends_1.toFriendOnline(client)], false);
                }
                if (!c.friends.has(client.accountId)) {
                    playerUtils_1.reloadFriends(c).catch(e => logger_1.logger.error(e));
                }
            }
            else if (c.friends.has(client.accountId)) {
                playerUtils_1.reloadFriends(c).catch(e => logger_1.logger.error(e));
            }
        }
        if (visibleOnlineFriends.length) {
            client.updateFriends(visibleOnlineFriends.map(friends_1.toFriendOnline), false);
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
        timing_1.timingEnd();
    }
    getClientByEntityId(entityId) {
        if (entityId === 0) {
            return undefined;
        }
        else {
            const byPonyId = (c) => c.pony.id === entityId;
            return this.clients.find(byPonyId) || this.offlineClients.find(byPonyId);
        }
    }
    removeEntityFromAnyMap(entity) {
        for (const map of this.maps) {
            for (const region of map.regions) {
                const index = region.entities.indexOf(entity);
                if (index !== -1) {
                    serverRegion_1.removeEntityFromRegion(region, entity, map);
                    return map;
                }
            }
        }
        return undefined;
    }
    leaveClient(client) {
        const friends = findAllOnlineFriends(this, client);
        if (!client.accountSettings.hidden) {
            for (const friend of friends) {
                friend.updateFriends([friends_1.toFriendOffline(client)], false);
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
        regionUtils_1.unsubscribeFromAllRegions(client, true);
        utils_1.removeItem(this.joinQueue, client);
        utils_1.removeItem(this.clients, client);
        this.clientsByAccount.delete(client.accountId);
        this.offlineClients.push(client);
        const index = this.mapSwitchQueue.findIndex(x => x.client === client);
        if (index !== -1) {
            this.mapSwitchQueue.splice(index, 1);
        }
    }
    notifyHidden(by, who) {
        const byClient = findClientByAccountId(this, by);
        const whoClient = findClientByAccountId(this, who);
        if (byClient && whoClient) {
            playerUtils_1.updateEntityPlayerState(byClient, whoClient.pony);
            playerUtils_1.updateEntityPlayerState(whoClient, byClient.pony);
        }
    }
    resetToSpawn(client) {
        Object.assign(client.pony, utils_1.randomPoint(client.map.spawnArea));
    }
    kick(client, leaveReason = 'kicked', reason = 0 /* None */, force = false) {
        if (client) {
            utils_1.removeItem(this.joinQueue, client);
            this.notifications.rejectAll(client);
            this.leaveClient(client);
            client.leaveReason = leaveReason;
            client.left(reason);
            if (force) {
                client.disconnect(true);
            }
            else {
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
    kickByAccount(accountId) {
        return this.kick(findClientByAccountId(this, accountId), 'kickByAccount');
    }
    kickByCharacter(characterId) {
        return this.kick(findClientByCharacterId(this, characterId), 'kickByCharacter');
    }
    accountUpdated(account) {
        const accountId = account._id.toString();
        const client = findClientByAccountId(this, accountId);
        if (client) {
            this.updateClientAccount(client, account);
            for (const c of this.clients) {
                if (c.isMod && c.selected === client.pony) {
                    entityUtils_1.pushUpdateEntityToClient(c, { entity: client.pony, flags: 32 /* Options */, options: { modInfo: accountUtils_1.getModInfo(client) } });
                }
            }
        }
    }
    updateClientAccount(client, newAccount) {
        const oldAccount = client.account;
        client.account = newAccount;
        if (oldAccount.ban !== newAccount.ban && adminUtils_1.isBanned(newAccount)) {
            sendAcl(client);
            this.kick(client, 'kick (ban)');
            return;
        }
        if (oldAccount.shadow !== newAccount.shadow) {
            if (adminUtils_1.isShadowed(newAccount)) {
                this.shadow(client);
            }
            else if (adminUtils_1.isShadowed(oldAccount)) {
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
    shadow(client) {
        client.shadowed = true;
        this.partyService.clientDisconnected(client);
        this.friendsService.clientDisconnected(client);
        this.notifications.dismissAll(client);
        if (client.pony.region) {
            for (const c of client.pony.region.clients) {
                if (c !== client) {
                    entityUtils_1.pushRemoveEntityToClient(c, client.pony);
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
            playerUtils_1.createAndUpdateCharacterState(client, this.server);
        }
    }
}
exports.World = World;
// account creation lock
function sendAcl(client) {
    const acl = playerUtils_1.isMutedOrShadowed(client) ? utils_1.fromNow(12 * constants_1.HOUR) : new Date(0);
    client.actionParam(client.pony.id, 25 /* ACL */, acl.toISOString());
}
function updateNotification() {
    return {
        id: 0,
        name: '',
        message: 'Server will restart shortly for updates and maintenance',
        flags: 1 /* Ok */,
    };
}
function refreshMap(world, client) {
    const map = findOrCreateMapForClient(world, client.map.id, client);
    if (map) {
        world.switchToMap(client, map, client.pony.x, client.pony.y);
    }
    else {
        logger_1.logger.warn(`Missing map: ${client.map.id}`);
    }
}
exports.refreshMap = refreshMap;
function goToMap(world, client, id, spawn) {
    const map = findOrCreateMapForClient(world, id, client);
    if (map) {
        const area = spawn && map.spawns.get(spawn) || map.spawnArea;
        const { x, y } = utils_1.randomPoint(area);
        world.switchToMap(client, map, x, y);
    }
    else {
        logger_1.logger.warn(`Missing map: ${id}`);
    }
}
exports.goToMap = goToMap;
function findOrCreateMapInstance(world, id, instance) {
    let map = world.maps.find(m => m.id === id && m.instance === instance);
    if (!map) {
        // const pool = world.mapPools.get(id);
        // if (!pool) {
        // 	throw new Error(`Invalid map id: ${id}`);
        // }
        switch (id) {
            case 'house':
                map = houseMap_1.createHouseMap(world, true);
                break;
            case 'island':
                map = islandMap_1.createIslandMap(world, true);
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
function findOrCreateMapForClient(world, id, client) {
    const map = world.maps.find(m => !m.instance && m.id === id);
    if (map) {
        return map;
    }
    else {
        if (client.party) {
            return findOrCreateMapInstance(world, id, client.party.id);
        }
        else {
            return findOrCreateMapInstance(world, id, client.accountId);
        }
    }
}
function updateClientCamera(client) {
    const camera = client.camera;
    camera_1.updateCamera(camera, client.pony, client.map);
    if (client.lastCameraX !== camera.x || client.lastCameraY !== camera.y ||
        client.lastCameraW !== camera.w || client.lastCameraH !== camera.h) {
        client.lastCameraX = camera.x;
        client.lastCameraY = camera.y;
        client.lastCameraW = camera.w;
        client.lastCameraH = camera.h;
        return true;
    }
    else {
        return false;
    }
}
function findAllOnlineFriends(world, client) {
    return lodash_1.compact(Array.from(client.friends.keys())
        .map(account => findClientByAccountId(world, account)));
}
exports.findAllOnlineFriends = findAllOnlineFriends;
function findClientByAccountId(world, accountId) {
    return world.clientsByAccount.get(accountId);
}
exports.findClientByAccountId = findClientByAccountId;
function findClientByCharacterId(world, characterId) {
    return world.clients.find(c => c.characterId === characterId);
}
exports.findClientByCharacterId = findClientByCharacterId;
function findClientsAroundAccountId(world, accountId) {
    const client = findClientByAccountId(world, accountId);
    return client ? world.clients
        .filter(c => c !== client && c.map === client.map)
        .map(c => ({
        account: c.accountId,
        distance: utils_1.distance(client.pony, c.pony),
        party: !!(c.party && c.party === client.party),
    }))
        .filter(x => x.distance < 5 || x.party)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 12) : [];
}
exports.findClientsAroundAccountId = findClientsAroundAccountId;
//# sourceMappingURL=world.js.map