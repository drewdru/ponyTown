"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const interfaces_1 = require("../common/interfaces");
const compress_1 = require("../common/compress");
const rect_1 = require("../common/rect");
const constants_1 = require("../common/constants");
const positionUtils_1 = require("../common/positionUtils");
const utils_1 = require("../common/utils");
const collision_1 = require("../common/collision");
const region_1 = require("../common/region");
const worldMap_1 = require("../common/worldMap");
const subscribeBoundsBottomPad = 3;
const randoms = new Uint8Array(constants_1.REGION_SIZE * constants_1.REGION_SIZE);
function createServerRegion(x, y, defaultTile = 1 /* Dirt */) {
    const bounds = rect_1.rect(x * constants_1.REGION_SIZE, y * constants_1.REGION_SIZE, constants_1.REGION_SIZE, constants_1.REGION_SIZE);
    const tiles = new Uint8Array(constants_1.REGION_SIZE * constants_1.REGION_SIZE);
    const tileIndices = new Int16Array(constants_1.REGION_SIZE * constants_1.REGION_SIZE);
    const collider = new Uint8Array(constants_1.REGION_SIZE * constants_1.REGION_SIZE * constants_1.tileWidth * constants_1.tileHeight);
    tileIndices.fill(-1);
    if (defaultTile !== 0) {
        for (let i = 0; i < tiles.length; i++) {
            tiles[i] = defaultTile;
        }
    }
    return {
        x, y,
        entityUpdates: [],
        entityRemoves: [],
        tileUpdates: [],
        clients: [],
        entities: [],
        movables: [],
        colliders: [],
        collider,
        colliderDirty: true,
        randoms,
        tiles,
        tileIndices,
        tilesDirty: true,
        tilesSnapshot: undefined,
        tilesTimeouts: undefined,
        encodedTiles: undefined,
        reusedUpdates: 0,
        bounds,
        boundsWithBorder: rect_1.withBorder(bounds, constants_1.REGION_BORDER),
        subscribeBounds: positionUtils_1.rectToScreen(rect_1.withPadding(bounds, constants_1.REGION_SIZE, constants_1.REGION_SIZE, constants_1.REGION_SIZE + subscribeBoundsBottomPad, constants_1.REGION_SIZE)),
        unsubscribeBounds: positionUtils_1.rectToScreen(rect_1.withPadding(bounds, constants_1.REGION_SIZE + 1, constants_1.REGION_SIZE + 1, constants_1.REGION_SIZE + subscribeBoundsBottomPad + 1, constants_1.REGION_SIZE + 1)),
    };
}
exports.createServerRegion = createServerRegion;
function cloneServerRegion(region) {
    const tiles = new Uint8Array(constants_1.REGION_SIZE * constants_1.REGION_SIZE);
    tiles.set(region.tiles);
    return {
        x: region.x,
        y: region.y,
        entityUpdates: [],
        entityRemoves: [],
        tileUpdates: [],
        clients: [],
        entities: [],
        movables: [],
        colliders: [],
        collider: region.collider,
        colliderDirty: false,
        randoms,
        tiles,
        tileIndices: region.tileIndices,
        tilesDirty: false,
        tilesSnapshot: undefined,
        tilesTimeouts: undefined,
        encodedTiles: region.encodedTiles,
        reusedUpdates: 0,
        bounds: region.bounds,
        boundsWithBorder: region.boundsWithBorder,
        subscribeBounds: region.subscribeBounds,
        unsubscribeBounds: region.unsubscribeBounds,
    };
}
exports.cloneServerRegion = cloneServerRegion;
function getSizeOfRegion(region) {
    let size = region.tiles.byteLength;
    size += region.tileIndices.byteLength;
    size += region.tilesSnapshot ? region.tilesSnapshot.byteLength : 0;
    size += region.tilesTimeouts ? region.tilesTimeouts.byteLength : 0;
    size += region.encodedTiles ? region.encodedTiles.byteLength : 0;
    size += region.collider ? region.collider.byteLength : 0;
    return size;
}
exports.getSizeOfRegion = getSizeOfRegion;
function addEntityToRegion(region, entity, map) {
    region.entities.push(entity);
    if (collision_1.canCollideWith(entity)) {
        region.colliders.push(entity);
        region_1.invalidateRegionsCollider(region, map);
    }
    if (utils_1.hasFlag(entity.flags, 1 /* Movable */)) {
        region.movables.push(entity);
    }
}
exports.addEntityToRegion = addEntityToRegion;
function removeEntityFromRegion(region, entity, map) {
    const removed = utils_1.removeItem(region.entities, entity);
    if (collision_1.canCollideWith(entity)) {
        utils_1.removeItem(region.colliders, entity);
        region_1.invalidateRegionsCollider(region, map);
    }
    utils_1.removeItem(region.movables, entity);
    return removed;
}
exports.removeEntityFromRegion = removeEntityFromRegion;
function pushUpdateEntityToRegion(region, update) {
    const index = findUpdate(region, update.entity);
    if (index === -1) {
        region.entityUpdates.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: undefined }, update));
    }
    else {
        region.reusedUpdates++;
        const existing = region.entityUpdates[index];
        existing.flags |= update.flags;
        if (utils_1.hasFlag(update.flags, 1 /* Position */)) {
            const { x = 0, y = 0, vx = 0, vy = 0 } = update;
            existing.x = x;
            existing.y = y;
            existing.vx = vx;
            existing.vy = vy;
        }
        if (utils_1.hasFlag(update.flags, 32 /* Options */)) {
            existing.options = Object.assign({}, existing.options, update.options);
        }
        if (utils_1.hasFlag(update.flags, 1024 /* PlayerState */)) {
            existing.playerState = update.playerState;
        }
        if (utils_1.hasFlag(update.flags, 128 /* Action */)) {
            existing.action = update.action;
        }
    }
}
exports.pushUpdateEntityToRegion = pushUpdateEntityToRegion;
function pushRemoveEntityToRegion(region, entity) {
    region.entityRemoves.push(entity.id);
}
exports.pushRemoveEntityToRegion = pushRemoveEntityToRegion;
function setRegionTile(map, region, x, y, type, skipRestore = false) {
    const old = region_1.getRegionTile(region, x, y);
    if (type === old)
        return;
    const index = x | (y << 3);
    region.tiles[index] = type;
    region.tileUpdates.push({ x, y, type: type });
    region.encodedTiles = undefined;
    if (region.tilesTimeouts && !skipRestore) {
        region.tilesTimeouts[index] = lodash_1.random(constants_1.TILES_RESTORE_MIN_SEC, constants_1.TILES_RESTORE_MAX_SEC);
    }
    if (interfaces_1.canWalk(old) !== interfaces_1.canWalk(type)) {
        worldMap_1.setTilesDirty(map, region.x * constants_1.REGION_SIZE + x - 1, region.y * constants_1.REGION_SIZE + y - 1, 3, 3);
        worldMap_1.setColliderDirty(map, region, x, y);
    }
}
exports.setRegionTile = setRegionTile;
function resetRegionUpdates(region) {
    region.entityUpdates.length = 0;
    region.entityRemoves.length = 0;
    region.tileUpdates.length = 0;
    region.reusedUpdates = 0;
}
exports.resetRegionUpdates = resetRegionUpdates;
function snapshotRegionTiles(region) {
    region.tilesSnapshot = region.tiles.slice();
    region.tilesTimeouts = new Uint8Array(region.tiles.length);
}
exports.snapshotRegionTiles = snapshotRegionTiles;
function getRegionTiles(region) {
    if (region.encodedTiles === undefined) {
        region.encodedTiles = compress_1.compressTiles(region.tiles);
    }
    return region.encodedTiles;
}
exports.getRegionTiles = getRegionTiles;
function resetTiles(map, region) {
    if (region.tilesSnapshot && region.tilesTimeouts) {
        for (let i = 0; i < region.tilesTimeouts.length; i++) {
            region.tilesTimeouts[i] = 0;
            if (region.tiles[i] !== region.tilesSnapshot[i]) {
                const x = i % constants_1.REGION_SIZE;
                const y = Math.floor(i / constants_1.REGION_SIZE);
                setRegionTile(map, region, x, y, region.tilesSnapshot[i], true);
            }
        }
    }
}
exports.resetTiles = resetTiles;
function tickTilesRestoration(map, region) {
    if (region.tilesSnapshot && region.tilesTimeouts) {
        for (let i = 0; i < region.tilesTimeouts.length; i++) {
            if (region.tilesTimeouts[i] > 0) {
                region.tilesTimeouts[i]--;
                if (region.tilesTimeouts[i] === 0 && region.tiles[i] !== region.tilesSnapshot[i]) {
                    const x = i % constants_1.REGION_SIZE;
                    const y = Math.floor(i / constants_1.REGION_SIZE);
                    setRegionTile(map, region, x, y, region.tilesSnapshot[i], true);
                }
            }
        }
    }
}
exports.tickTilesRestoration = tickTilesRestoration;
function findUpdate({ entityUpdates }, entity) {
    for (let i = 0; i < entityUpdates.length; i++) {
        if (entityUpdates[i].entity === entity) {
            return i;
        }
    }
    return -1;
}
//# sourceMappingURL=serverRegion.js.map