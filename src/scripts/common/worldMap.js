"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
const utils_1 = require("./utils");
const camera_1 = require("./camera");
const region_1 = require("./region");
const entities_1 = require("./entities");
const entityUtils_1 = require("./entityUtils");
const pony_1 = require("./pony");
const tileUtils_1 = require("../client/tileUtils");
const positionUtils_1 = require("./positionUtils");
const draw_1 = require("../client/draw");
const constants_1 = require("./constants");
const collision_1 = require("./collision");
const timing_1 = require("../client/timing");
const handlers_1 = require("../client/handlers");
const ponyStates_1 = require("../client/ponyStates");
const defaultMapInfo = {
    type: 0 /* None */,
    flags: 0 /* None */,
    regionsX: 0,
    regionsY: 0,
    defaultTile: 0 /* None */,
};
function createWorldMap(info = defaultMapInfo, state = Object.assign({}, interfaces_1.defaultMapState)) {
    const { type, flags, regionsX, regionsY, defaultTile, editableArea } = info;
    const map = {
        type,
        flags,
        tileTime: 0,
        entities: [],
        entitiesDrawable: [],
        entitiesWithNames: [],
        entitiesWithChat: [],
        entitiesMoving: [],
        entitiesTriggers: [],
        entitiesLight: [],
        entitiesLightSprite: [],
        entitiesById: new Map(),
        poniesToDecode: [],
        regionsX,
        regionsY,
        regions: utils_1.array(regionsX * regionsY, undefined),
        defaultTile,
        width: regionsX * constants_1.REGION_SIZE,
        height: regionsY * constants_1.REGION_SIZE,
        minRegionX: 0,
        minRegionY: 0,
        maxRegionX: 0,
        maxRegionY: 0,
        state,
        editableArea,
    };
    updateMinMaxRegion(map);
    return map;
}
exports.createWorldMap = createWorldMap;
function pickAny(entity, point) {
    const bounds = entity.interactBounds || entity.bounds;
    return !!bounds && utils_1.contains(entity.x, entity.y, bounds, point);
}
function getAnyBounds(entity) {
    return [
        entity.interactBounds,
        entity.bounds,
        entity.lightBounds,
        entity.lightSpriteBounds,
        entity.collidersBounds,
        entity.triggerBounds && positionUtils_1.rectToScreen(entity.triggerBounds),
    ].filter(x => x && x.w > 0 && x.h > 0)[0];
}
exports.getAnyBounds = getAnyBounds;
function pickAnyEvenLights(entity, point) {
    const bounds = getAnyBounds(entity);
    return !!bounds && utils_1.contains(entity.x, entity.y, bounds, point);
}
function pick(entity, point, pickHidden, pickEditable) {
    const editableOrInteractive = pickEditable ?
        (entity.type !== constants_1.PONY_TYPE && ((entity.state & 8 /* Editable */) !== 0)) :
        ((entity.flags & 256 /* Interactive */) !== 0);
    return editableOrInteractive && (!entityUtils_1.isHidden(entity) || pickHidden) && pickAny(entity, point);
}
function pickEntity(entity, point, ignorePonies, pickHidden, pickEditable) {
    return (!ignorePonies || entity.type !== constants_1.PONY_TYPE) && pick(entity, point, pickHidden, pickEditable);
}
function pickByBounds(entity, rect, pickHidden) {
    if ((entity.flags & 256 /* Interactive */) === 0 || (entityUtils_1.isHidden(entity) && !pickHidden)) {
        return false;
    }
    else {
        const bounds = entity.interactBounds || entity.bounds;
        return !!bounds && utils_1.boundsIntersect(entity.x, entity.y, bounds, 0, 0, rect);
    }
}
function pickEntityByBounds(entity, rect, ignorePonies, pickHidden) {
    return (!ignorePonies || entity.type !== constants_1.PONY_TYPE) && pickByBounds(entity, rect, pickHidden);
}
function pickAnyEntities(map, point) {
    return map.entities.filter(e => pickAnyEvenLights(e, point)).reverse();
}
exports.pickAnyEntities = pickAnyEntities;
function pickEntities(map, point, ignorePonies, pickHidden, pickEditable = false) {
    return map.entities.filter(e => pickEntity(e, point, ignorePonies, pickHidden, pickEditable)).reverse();
}
exports.pickEntities = pickEntities;
function pickEntitiesByRect(map, rect, ignorePonies, pickHidden) {
    return map.entities.filter(e => pickEntityByBounds(e, rect, ignorePonies, pickHidden)).reverse();
}
exports.pickEntitiesByRect = pickEntitiesByRect;
function removeRegions(map, coords) {
    if (coords.length === 0)
        return;
    const entitiesToRemove = new Set();
    for (let i = 0; i < coords.length; i += 2) {
        const x = coords[i];
        const y = coords[i + 1];
        const index = x + y * map.regionsX;
        const region = map.regions[index];
        if (region) {
            for (const entity of region.entities) {
                entitiesToRemove.add(entity);
                entityUtils_1.releaseEntity(entity);
                map.entitiesById.delete(entity.id);
            }
        }
        map.regions[index] = undefined;
        setTilesDirty(map, x * constants_1.REGION_SIZE - 1, y * constants_1.REGION_SIZE - 1, constants_1.REGION_SIZE + 2, constants_1.REGION_SIZE + 2);
    }
    removeEntitiesFromEntities(map, entitiesToRemove);
    updateMinMaxRegion(map);
}
exports.removeRegions = removeRegions;
function setRegion(map, x, y, region) {
    if (x >= 0 && y >= 0 && x < map.regionsX && y < map.regionsY) {
        const index = x + y * map.regionsX;
        const oldRegion = map.regions[index];
        if (oldRegion) {
            DEVELOPMENT && !TESTS && console.error(`Region already set (${x}, ${y})`);
            for (const e of oldRegion.entities.slice()) {
                releaseAndRemoveEntityFromMap(map, e);
            }
        }
        map.regions[index] = undefined;
        setTilesDirty(map, x * constants_1.REGION_SIZE - 1, y * constants_1.REGION_SIZE - 1, constants_1.REGION_SIZE + 2, constants_1.REGION_SIZE + 2);
        map.regions[index] = region;
        updateMinMaxRegion(map);
    }
    else {
        DEVELOPMENT && !TESTS && console.error(`Invalid region coords (${x}, ${y})`);
    }
}
exports.setRegion = setRegion;
function findEntityById(map, id) {
    return map.entitiesById.get(id);
}
exports.findEntityById = findEntityById;
function addEntity(map, entity) {
    const region = getRegionGlobal(map, entity.x, entity.y);
    if (!region) {
        throw new Error(`Missing region at ${entity.x} ${entity.y}`);
    }
    else {
        addEntityToMapRegion(map, region, entity);
    }
}
exports.addEntity = addEntity;
function removeEntity(map, entity) {
    removeEntityFromMapRegion(map, entity);
    releaseAndRemoveEntityFromMap(map, entity);
}
exports.removeEntity = removeEntity;
function releaseAndRemoveEntityFromMap(map, entity) {
    entityUtils_1.releaseEntity(entity);
    removeEntityFromEntities(map, entity);
}
function removeEntityDirectly(map, entity) {
    forEachRegion(map, region => {
        const removed = removeEntityFromRegion(region, entity, map);
        if (removed) {
            entityUtils_1.releaseEntity(entity);
            removeEntityFromEntities(map, entity);
            return false;
        }
        else {
            return true;
        }
    });
}
exports.removeEntityDirectly = removeEntityDirectly;
function setTile(map, worldX, worldY, type) {
    const region = getRegionGlobal(map, worldX, worldY);
    if (!region)
        return;
    const x = Math.floor(worldX - region.x * constants_1.REGION_SIZE);
    const y = Math.floor(worldY - region.y * constants_1.REGION_SIZE);
    const old = region_1.getRegionTile(region, x, y);
    region_1.setRegionTile(region, x, y, type);
    setTilesDirty(map, worldX - 1, worldY - 1, 3, 3);
    if (interfaces_1.canWalk(old) !== interfaces_1.canWalk(type)) {
        setColliderDirty(map, region, x, y);
    }
}
exports.setTile = setTile;
function setColliderDirty(map, region, x, y) {
    region.colliderDirty = true;
    if (x === 0) {
        const r = getRegionUnsafe(map, region.x - 1, region.y);
        r && (r.colliderDirty = true);
    }
    else if (x === (constants_1.REGION_SIZE - 1)) {
        const r = getRegionUnsafe(map, region.x + 1, region.y);
        r && (r.colliderDirty = true);
    }
    if (y === 0) {
        const r = getRegionUnsafe(map, region.x, region.y - 1);
        r && (r.colliderDirty = true);
    }
    else if (y === (constants_1.REGION_SIZE - 1)) {
        const r = getRegionUnsafe(map, region.x, region.y + 1);
        r && (r.colliderDirty = true);
    }
}
exports.setColliderDirty = setColliderDirty;
function setTileAtRegion(map, regionX, regionY, x, y, type) {
    setTile(map, regionX * constants_1.REGION_SIZE + x, regionY * constants_1.REGION_SIZE + y, type);
}
exports.setTileAtRegion = setTileAtRegion;
function setTilesDirty(map, ox, oy, w, h) {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            doRelativeToRegion(map, x + ox, y + oy, (region, x, y) => region_1.setRegionTileDirty(region, x, y));
        }
    }
}
exports.setTilesDirty = setTilesDirty;
function getTileIndex(map, x, y) {
    const region = getRegionGlobal(map, x, y);
    return region ? region_1.getRegionTileIndex(region, x - region.x * constants_1.REGION_SIZE, y - region.y * constants_1.REGION_SIZE) : 0;
}
function getElevation(map, x, y) {
    const region = getRegionGlobal(map, x, y);
    return region ? region_1.getRegionElevation(region, x - region.x * constants_1.REGION_SIZE, y - region.y * constants_1.REGION_SIZE) : 0;
}
exports.getElevation = getElevation;
function setElevation(map, x, y, value) {
    doRelativeToRegion(map, x, y, (region, x, y) => region_1.setRegionElevation(region, x, y, value));
}
exports.setElevation = setElevation;
function forEachRegion(map, callback) {
    for (let y = map.minRegionY; y <= map.maxRegionY; y++) {
        for (let x = map.minRegionX; x <= map.maxRegionX; x++) {
            const region = getRegion(map, x, y);
            if (region && callback(region) === false) {
                return;
            }
        }
    }
}
exports.forEachRegion = forEachRegion;
function updateMinMaxRegion(map) {
    map.minRegionX = map.regionsX;
    map.minRegionY = map.regionsY;
    map.maxRegionX = 0;
    map.maxRegionY = 0;
    for (let y = 0; y < map.regionsY; y++) {
        for (let x = 0; x < map.regionsX; x++) {
            if (getRegion(map, x, y)) {
                map.minRegionX = Math.min(x, map.minRegionX);
                map.minRegionY = Math.min(y, map.minRegionY);
                map.maxRegionX = Math.max(x, map.maxRegionX);
                map.maxRegionY = Math.max(y, map.maxRegionY);
            }
        }
    }
    map.maxRegionX = Math.min(map.maxRegionX, map.regionsX - 1);
    map.maxRegionY = Math.min(map.maxRegionY, map.regionsY - 1);
}
function doRelativeToRegion(map, x, y, action) {
    const region = getRegionGlobal(map, x, y);
    if (region) {
        const regionX = Math.floor(x - region.x * constants_1.REGION_SIZE);
        const regionY = Math.floor(y - region.y * constants_1.REGION_SIZE);
        action(region, regionX, regionY);
    }
}
function addEntityToRegion(region, entity, map) {
    region.entities.push(entity);
    if (collision_1.canCollideWith(entity)) {
        region.colliders.push(entity);
        region_1.invalidateRegionsCollider(region, map);
    }
}
function removeEntityFromRegion(region, entity, map) {
    const removed = utils_1.removeItemFast(region.entities, entity);
    if (removed && collision_1.canCollideWith(entity)) {
        utils_1.removeItemFast(region.colliders, entity);
        region_1.invalidateRegionsCollider(region, map);
    }
    return removed;
}
function addEntityToMapRegion(map, region, entity) {
    if (entity.id !== 0) {
        const existing = map.entitiesById.get(entity.id);
        if (existing) {
            DEVELOPMENT && !TESTS && console.error(`Adding duplicate entity ${entity.id} (` +
                `${region_1.worldToRegionX(existing.x, map)}, ${region_1.worldToRegionY(existing.y, map)} => ` +
                `${region_1.worldToRegionX(entity.x, map)}, ${region_1.worldToRegionY(entity.y, map)})`);
            removeEntity(map, existing);
        }
        map.entitiesById.set(entity.id, entity);
    }
    if (pony_1.isPony(entity) && entity.palettePonyInfo === undefined) {
        map.poniesToDecode.push(entity);
    }
    addEntityToRegion(region, entity, map);
    map.entities.push(entity);
    if (entityUtils_1.isDrawable(entity)) {
        map.entitiesDrawable.push(entity);
    }
    if (entityUtils_1.isMoving(entity)) {
        map.entitiesMoving.push(entity);
    }
    if (draw_1.hasDrawLight(entity)) {
        utils_1.pushUniq(map.entitiesLight, entity);
    }
    if (draw_1.hasLightSprite(entity)) {
        utils_1.pushUniq(map.entitiesLightSprite, entity);
    }
    if (entity.triggerBounds !== undefined) {
        utils_1.pushUniq(map.entitiesTriggers, entity);
    }
}
exports.addEntityToMapRegion = addEntityToMapRegion;
function removeEntityFromEntities(map, entity) {
    map.entitiesById.delete(entity.id);
    utils_1.removeItemFast(map.entities, entity);
    utils_1.removeItem(map.entitiesWithChat, entity);
    utils_1.removeItem(map.entitiesWithNames, entity);
    if (entityUtils_1.isDrawable(entity)) {
        utils_1.removeItem(map.entitiesDrawable, entity);
    }
    if (entityUtils_1.isMoving(entity)) {
        utils_1.removeItemFast(map.entitiesMoving, entity);
    }
    if (pony_1.isPony(entity)) {
        utils_1.removeItemFast(map.poniesToDecode, entity);
    }
    if (draw_1.hasDrawLight(entity)) {
        utils_1.removeItemFast(map.entitiesLight, entity);
    }
    if (draw_1.hasLightSprite(entity)) {
        utils_1.removeItemFast(map.entitiesLightSprite, entity);
    }
    if (entity.triggerBounds !== undefined) {
        utils_1.removeItemFast(map.entitiesTriggers, entity);
    }
}
function removeEntitiesFromEntities(map, set) {
    if (set.size > 0) {
        const filter = (entity) => !set.has(entity);
        map.entities = map.entities.filter(filter);
        map.entitiesDrawable = map.entitiesDrawable.filter(filter);
        map.entitiesWithChat = map.entitiesWithChat.filter(filter);
        map.entitiesWithNames = map.entitiesWithNames.filter(filter);
        map.entitiesMoving = map.entitiesMoving.filter(filter);
        map.poniesToDecode = map.poniesToDecode.filter(filter);
        map.entitiesLight = map.entitiesLight.filter(filter);
        map.entitiesLightSprite = map.entitiesLightSprite.filter(filter);
        map.entitiesTriggers = map.entitiesTriggers.filter(filter);
    }
}
function removeEntityFromMapRegion(map, entity) {
    forEachRegion(map, region => !removeEntityFromRegion(region, entity, map));
}
function getTile(map, x, y) {
    const region = getRegionGlobal(map, x, y);
    if (region) {
        const regionX = Math.floor(x - region.x * constants_1.REGION_SIZE);
        const regionY = Math.floor(y - region.y * constants_1.REGION_SIZE);
        return region_1.getRegionTile(region, regionX, regionY);
    }
    else {
        return 0 /* None */;
    }
}
exports.getTile = getTile;
function getRegionGlobal(map, x, y) {
    const rx = region_1.worldToRegionX(x, map);
    const ry = region_1.worldToRegionY(y, map);
    return getRegion(map, rx, ry);
}
exports.getRegionGlobal = getRegionGlobal;
function getRegion(map, x, y) {
    if (x < 0 || y < 0 || x >= map.regionsX || y >= map.regionsY) {
        throw new Error(`Invalid region coords (${x}, ${y})`);
    }
    else {
        return map.regions[((x | 0) + (y | 0) * map.regionsX) | 0];
    }
}
exports.getRegion = getRegion;
function getRegionUnsafe(map, x, y) {
    if (x < 0 || y < 0 || x >= map.regionsX || y >= map.regionsY) {
        return undefined;
    }
    else {
        return map.regions[((x | 0) + (y | 0) * map.regionsX) | 0];
    }
}
exports.getRegionUnsafe = getRegionUnsafe;
function addOrRemoveFromEntityList(list, entity, had, has) {
    if (had !== has) {
        if (has) {
            utils_1.pushUniq(list, entity);
        }
        else {
            utils_1.removeItemFast(list, entity);
        }
    }
}
exports.addOrRemoveFromEntityList = addOrRemoveFromEntityList;
function updateEntitiesWithNames(map, hover, player) {
    for (let i = map.entitiesWithNames.length - 1; i >= 0; i--) {
        const entity = map.entitiesWithNames[i];
        if (!pickAny(entity, hover)) {
            map.entitiesWithNames.splice(i, 1);
        }
    }
    const regionX = region_1.worldToRegionX(hover.x, map);
    const regionY = region_1.worldToRegionY(hover.y, map);
    const minX = Math.max(0, regionX - 1) | 0;
    const minY = Math.max(0, regionY - 1) | 0;
    const maxX = Math.min(regionX + 1, map.regionsX - 1) | 0;
    const maxY = Math.min(regionY + 1, map.regionsY - 1) | 0;
    for (let ry = minY; ry <= maxY; ry++) {
        for (let rx = minX; rx <= maxX; rx++) {
            const region = getRegion(map, rx, ry);
            if (region !== undefined) {
                for (const e of region.entities) {
                    if (e.name !== undefined && e !== player && pickAny(e, hover)) {
                        utils_1.pushUniq(map.entitiesWithNames, e);
                    }
                }
            }
        }
    }
}
exports.updateEntitiesWithNames = updateEntitiesWithNames;
function updateEntitiesCoverLifted(map, player, hideObjects, delta) {
    const playerX = positionUtils_1.toScreenX(player.x);
    const playerY = positionUtils_1.toScreenYWithZ(player.y, player.z);
    for (const e of map.entitiesDrawable) {
        if (e.coverBounds !== undefined) {
            e.coverLifted = hideObjects || utils_1.containsPoint(positionUtils_1.toScreenX(e.x), positionUtils_1.toScreenY(e.y), e.coverBounds, playerX, playerY);
            const lifting = e.coverLifting || 0;
            if (e.coverLifted && lifting < 1) {
                e.coverLifting = Math.min(lifting + delta * 2, 1);
            }
            else if (!e.coverLifted && lifting > 0) {
                e.coverLifting = Math.max(lifting - delta * 2, 0);
            }
        }
    }
}
exports.updateEntitiesCoverLifted = updateEntitiesCoverLifted;
function updateEntitiesTriggers(map, player, game) {
    for (const e of map.entitiesTriggers) {
        const on = (e.triggerTall || pony_1.isPonyOnTheGround(player)) &&
            utils_1.containsPoint(e.x, e.y, e.triggerBounds, player.x, player.y);
        if (e.triggerOn !== on) {
            if (on) {
                game.send(server => server.interact(e.id));
            }
            e.triggerOn = on;
        }
    }
}
exports.updateEntitiesTriggers = updateEntitiesTriggers;
function updateMap(map, delta) {
    map.tileTime += delta * constants_1.WATER_FPS;
    forEachRegion(map, region => {
        if (region.tilesDirty) {
            tileUtils_1.updateTileIndices(region, map);
        }
        if (region.colliderDirty) {
            region_1.generateRegionCollider(region, map);
        }
    });
}
exports.updateMap = updateMap;
function getMapHeightAt(map, x, y, gameTime) {
    return tileUtils_1.getTileHeight(getTile(map, x, y), getTileIndex(map, x, y), x, y, gameTime, map.type);
}
exports.getMapHeightAt = getMapHeightAt;
function isInWaterAt(map, x, y) {
    return getTile(map, x, y) === 3 /* Water */ && tileUtils_1.isInWater(getTileIndex(map, x, y), x, y);
}
exports.isInWaterAt = isInWaterAt;
function updateEntities(game, gameTime, delta, safe) {
    TIMING && timing_1.timeStart('updateEntities');
    const map = game.map;
    for (const entity of map.entitiesMoving) {
        collision_1.updatePosition(entity, delta, map);
    }
    for (const entity of map.entities) {
        const flags = entity.flags;
        if ((flags & 2048 /* Bobbing */) !== 0) {
            const bobs = entity.bobs;
            const frame = (((gameTime / 1000) * entity.bobsFps) | 0) % bobs.length;
            entity.z = positionUtils_1.toWorldZ(bobs[frame]);
        }
        else if ((flags & 32 /* StaticY */) === 0) {
            entity.z = getMapHeightAt(map, entity.x, entity.y, gameTime);
        }
        if (entity.type === constants_1.PONY_TYPE) {
            const pony = entity;
            pony_1.updatePonyEntity(pony, delta, gameTime, safe);
            const wasSwimming = pony.swimming;
            pony.swimming = !entityUtils_1.isPonyFlying(pony) && isInWaterAt(map, pony.x, pony.y);
            if (wasSwimming !== pony.swimming) {
                if (ponyStates_1.isFlyingDown(pony.animator.state)) {
                    setTimeout(() => handlers_1.playEffect(game, pony, entities_1.splash.type), 400);
                }
                else {
                    handlers_1.playEffect(game, pony, entities_1.splash.type);
                }
            }
        }
        else if (entity.update !== undefined) {
            entity.update(delta, gameTime);
        }
        if ((flags & 1024 /* OnOff */) !== 0) {
            const on = (entity.state & 4 /* On */) !== 0;
            if (entity.lightOn !== undefined) {
                entity.lightOn = on;
            }
            if (entity.lightSpriteOn !== undefined) {
                entity.lightSpriteOn = on;
            }
        }
        if ((flags & 512 /* Light */) !== 0) {
            if (entity.lightOn) {
                const move = delta * 0.2;
                if (Math.abs(entity.lightScale - entity.lightTarget) < move) {
                    entity.lightScale = entity.lightTarget;
                    entity.lightTarget = 1 - Math.random() * 0.15;
                }
                else {
                    entity.lightScale += entity.lightScale < entity.lightTarget ? move : -move;
                }
            }
        }
    }
    for (let i = map.entitiesWithChat.length - 1; i >= 0; i--) {
        const entity = map.entitiesWithChat[i];
        const says = entity.says;
        if (says.timer) {
            says.timer -= delta;
            if (says.timer < 0) {
                says.timer = 0;
                entity.says = undefined;
                map.entitiesWithChat.splice(i, 1);
            }
        }
    }
    TIMING && timing_1.timeEnd();
}
exports.updateEntities = updateEntities;
function invalidatePalettes(entities) {
    for (const entity of entities) {
        if (pony_1.isPony(entity)) {
            pony_1.invalidatePalettesForPony(entity);
        }
    }
}
exports.invalidatePalettes = invalidatePalettes;
function ensureAllVisiblePoniesAreDecoded(map, camera, paletteManager) {
    const poniesToDecode = map.poniesToDecode;
    if (!poniesToDecode.length)
        return;
    const decode = new Set();
    for (let i = 0; i < poniesToDecode.length; i++) {
        const pony = poniesToDecode[i];
        if (camera_1.isBoundsVisible(camera, pony.bounds, pony.x, pony.y)) {
            decode.add(i);
        }
    }
    if (!decode.size)
        return;
    if (decode.size > 100) {
        paletteManager.deduplicate = false;
    }
    map.poniesToDecode = poniesToDecode.filter((pony, i) => {
        if (pony.palettePonyInfo !== undefined) {
            return false;
        }
        else if (decode.has(i)) {
            pony_1.ensurePonyInfoDecoded(pony);
            return false;
        }
        else {
            return true;
        }
    });
    if (decode.size > 100) {
        paletteManager.deduplicate = true;
    }
}
exports.ensureAllVisiblePoniesAreDecoded = ensureAllVisiblePoniesAreDecoded;
function switchEntityRegion(map, entity, x, y) {
    removeEntityFromMapRegion(map, entity);
    const region = getRegionGlobal(map, x, y);
    if (region) {
        addEntityToRegion(region, entity, map);
    }
    else {
        releaseAndRemoveEntityFromMap(map, entity);
    }
}
exports.switchEntityRegion = switchEntityRegion;
function updateMapState(map, prevState, newState) {
    if (prevState.weather !== newState.weather) {
        switch (newState.weather) {
            case 0 /* None */:
                removeWeatherEffects(map);
                break;
            case 1 /* Rain */:
                addRainEffects(map);
                break;
        }
    }
}
exports.updateMapState = updateMapState;
function removeWeatherEffects(map) {
    const effects = map.entities.filter(e => e.id === 0 && e.type === entities_1.weatherRain.type);
    for (const entity of effects) {
        removeEntityDirectly(map, entity);
    }
}
function addRainEffects(map) {
    forEachRegion(map, region => {
        if (region.x === 3 && region.y === 4) { // TEMP: testing
            const entity = entities_1.weatherRain((region.x + 0.5) * constants_1.REGION_SIZE, (region.y + 0.5) * constants_1.REGION_SIZE);
            addEntity(map, entity);
        }
    });
}
//# sourceMappingURL=worldMap.js.map