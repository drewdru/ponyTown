"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const base64_js_1 = require("base64-js");
const interfaces_1 = require("../common/interfaces");
const worldMap_1 = require("../common/worldMap");
const utils_1 = require("../common/utils");
const movementUtils_1 = require("../common/movementUtils");
const entities_1 = require("../common/entities");
const compress_1 = require("../common/compress");
const rect_1 = require("../common/rect");
const serverRegion_1 = require("./serverRegion");
const colors_1 = require("../common/colors");
const constants_1 = require("../common/constants");
const paths_1 = require("./paths");
const canvasUtilsNode_1 = require("./canvasUtilsNode");
const ponyInfo_1 = require("../common/ponyInfo");
const entityUtils_1 = require("./entityUtils");
function createServerMap(id, type, regionsX, regionsY, defaultTile = 0 /* None */, usage = 0 /* Public */, initRegions = true) {
    const width = regionsX * constants_1.REGION_SIZE;
    const height = regionsY * constants_1.REGION_SIZE;
    const regions = [];
    const state = Object.assign({}, interfaces_1.defaultMapState);
    const spawnArea = rect_1.rect(0, 0, 1, 1);
    const lockedTiles = new Set();
    if (regionsX <= 0 || regionsY <= 0 || width > movementUtils_1.POSITION_MAX || height > movementUtils_1.POSITION_MAX) {
        throw new Error('Invalid map parameters');
    }
    if (initRegions) {
        for (let ry = 0; ry < regionsY; ry++) {
            for (let rx = 0; rx < regionsX; rx++) {
                regions.push(serverRegion_1.createServerRegion(rx, ry, defaultTile));
            }
        }
    }
    return {
        id, usage, type, flags: 0 /* None */, width, height, state, regions, regionsX, regionsY, defaultTile, spawnArea,
        lockedTiles, spawns: new Map(), instance: undefined, lastUsed: Date.now(), controllers: [],
        dontUpdateTilesAndColliders: false, tilesLocked: false, editableEntityLimit: 0, editingLocked: false,
    };
}
exports.createServerMap = createServerMap;
function serverMapInstanceFromTemplate(map) {
    const { id, usage, type, flags, width, height, state, regionsX, regionsY, defaultTile, spawnArea, lockedTiles, editableEntityLimit } = map;
    return {
        id, usage, type, flags, width, height, state: Object.assign({}, state),
        regions: map.regions.map(serverRegion_1.cloneServerRegion),
        regionsX, regionsY, defaultTile, spawnArea,
        lockedTiles, spawns: new Map(), instance: undefined, lastUsed: Date.now(), controllers: [],
        dontUpdateTilesAndColliders: true, tilesLocked: map.tilesLocked,
        editableEntityLimit, editingLocked: false,
    };
}
exports.serverMapInstanceFromTemplate = serverMapInstanceFromTemplate;
function copyMapTiles(target, source) {
    for (let i = 0; i < target.regions.length; i++) {
        const srcRegion = source.regions[i];
        const tgtRegion = target.regions[i];
        tgtRegion.tiles.set(srcRegion.tiles);
        tgtRegion.tileIndices.set(srcRegion.tileIndices);
        tgtRegion.encodedTiles = srcRegion.encodedTiles;
        tgtRegion.colliderDirty = true;
    }
}
exports.copyMapTiles = copyMapTiles;
function getMapInfo(map) {
    return {
        type: map.type,
        flags: map.flags,
        regionsX: map.regionsX,
        regionsY: map.regionsY,
        defaultTile: map.defaultTile,
        editableArea: map.editableArea,
    };
}
exports.getMapInfo = getMapInfo;
function getSizeOfMap(map) {
    const memory = map.regions.reduce((sum, r) => sum + serverRegion_1.getSizeOfRegion(r), 0);
    const entities = map.regions.reduce((sum, r) => sum + r.entities.length, 0);
    return { memory, entities };
}
exports.getSizeOfMap = getSizeOfMap;
function setTile(map, x, y, type) {
    const region = worldMap_1.getRegionGlobal(map, x, y);
    if (region) {
        const regionX = Math.floor(x) - region.x * constants_1.REGION_SIZE;
        const regionY = Math.floor(y) - region.y * constants_1.REGION_SIZE;
        serverRegion_1.setRegionTile(map, region, regionX, regionY, type);
    }
}
exports.setTile = setTile;
function snapshotTiles(map) {
    for (const region of map.regions) {
        serverRegion_1.snapshotRegionTiles(region);
    }
}
exports.snapshotTiles = snapshotTiles;
function lockTile(map, x, y) {
    const index = ((x | 0) + (y | 0) * map.width) | 0;
    map.lockedTiles.add(index);
}
exports.lockTile = lockTile;
function lockTiles(map, x, y, w, h) {
    for (let iy = 0; iy < h; iy++) {
        for (let ix = 0; ix < w; ix++) {
            lockTile(map, x + ix, y + iy);
        }
    }
}
exports.lockTiles = lockTiles;
function isTileLocked(map, x, y) {
    const index = ((x | 0) + (y | 0) * map.width) | 0;
    return map.lockedTiles.has(index);
}
exports.isTileLocked = isTileLocked;
function serializeTiles(map) {
    const tilesData = [];
    const data = [];
    const { width, height } = map;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            tilesData.push(worldMap_1.getTile(map, x, y));
        }
    }
    for (let i = 0; i < tilesData.length; i++) {
        const tile = tilesData[i];
        let count = 1;
        while (tilesData.length > (i + 1) && tilesData[i + 1] === tile && count < 255) {
            count++;
            i++;
        }
        data.push(count, tile);
    }
    return new Uint8Array(data);
}
exports.serializeTiles = serializeTiles;
function serializeMap(map) {
    const { width, height } = map;
    const tiles = base64_js_1.fromByteArray(serializeTiles(map));
    return { width, height, tiles };
}
exports.serializeMap = serializeMap;
function deserializeMap(map, { tiles, width }, { offsetX = 0, offsetY = 0 } = {}) {
    const decodedTiles = compress_1.deserializeTiles(tiles);
    for (let i = 0; i < decodedTiles.length; i++) {
        const x = i % width;
        const y = Math.floor(i / width);
        setTile(map, x + offsetX, y + offsetY, decodedTiles[i]);
    }
}
exports.deserializeMap = deserializeMap;
function saveMap(map, saveOptions) {
    const data = { width: map.width, height: map.height };
    if (saveOptions.saveTiles) {
        data.tiles = serializeMap(map).tiles;
    }
    if (saveOptions.saveEntities) {
        data.entities = [];
        for (const region of map.regions) {
            for (const entity of region.entities) {
                if (!utils_1.hasFlag(entity.serverFlags, 2 /* DoNotSave */) && !utils_1.hasFlag(entity.flags, 16 /* Debug */)) {
                    if (saveOptions.saveOnlyEditableEntities && !utils_1.hasFlag(entity.state, 8 /* Editable */))
                        continue;
                    const options = entity.options && Object.keys(entity.options).length > 0 ? entity.options : undefined;
                    const name = entity.name;
                    data.entities.push({ type: entities_1.getEntityTypeName(entity.type), x: entity.x, y: entity.y, options, name });
                }
            }
        }
    }
    if (saveOptions.saveWalls) {
        const controller = map.controllers.find(c => c.toggleWall);
        if (controller) {
            data.walls = controller.serialize();
        }
    }
    return data;
}
exports.saveMap = saveMap;
async function saveMapToFile(map, fileName, options) {
    const data = saveMap(map, options);
    const json = JSON.stringify(data, null, 2);
    await fs_1.writeFileAsync(fileName, json, 'utf8');
}
exports.saveMapToFile = saveMapToFile;
async function saveMapToFileBinary(map, fileName) {
    const tiles = serializeTiles(map);
    const buffer = new Uint8Array(4 + 4 + tiles.byteLength);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    view.setInt32(0, map.width, true);
    view.setInt32(4, map.height, true);
    buffer.set(tiles, 8);
    await fs_1.writeFileAsync(fileName, Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength));
}
exports.saveMapToFileBinary = saveMapToFileBinary;
async function saveMapToFileBinaryAlt(map, fileName) {
    const buffer = Buffer.alloc(4 + 4 + map.width * map.height);
    buffer.writeUInt32LE(map.width, 0);
    buffer.writeUInt32LE(map.height, 4);
    for (let y = 0, i = 8; y < map.height; y++) {
        for (let x = 0; x < map.width; x++, i++) {
            buffer.writeUInt8(worldMap_1.getTile(map, x, y), i);
        }
    }
    await fs_1.writeFileAsync(fileName, buffer);
}
exports.saveMapToFileBinaryAlt = saveMapToFileBinaryAlt;
async function saveEntitiesToFile(map, fileName) {
    const lines = [];
    for (const region of map.regions) {
        for (const entity of region.entities) {
            lines.push(`${entities_1.getEntityTypeName(entity.type)} ${entity.x} ${entity.y}`);
        }
    }
    await fs_1.writeFileAsync(fileName, lines.join('\n'), 'utf8');
}
exports.saveEntitiesToFile = saveEntitiesToFile;
function loadMap(world, map, data, loadOptions) {
    if (data.tiles) {
        deserializeMap(map, data, loadOptions);
    }
    if (loadOptions.loadOnlyTiles)
        return;
    if (loadOptions.loadEntitiesAsEditable) {
        const entitiesToRemove = [];
        for (const region of map.regions) {
            for (const entity of region.entities) {
                if (utils_1.hasFlag(entity.state, 8 /* Editable */)) {
                    entitiesToRemove.push(entity);
                }
            }
        }
        for (const entity of entitiesToRemove) {
            world.removeEntity(entity, map);
        }
    }
    if (loadOptions.loadEntities && data.entities) {
        for (const { x, y, type, name, options } of data.entities) {
            const typeNumber = entities_1.getEntityType(type);
            const entity = entities_1.createAnEntity(typeNumber, 0, x, y, options, ponyInfo_1.mockPaletteManager, world);
            if (name) {
                entityUtils_1.setEntityName(entity, name);
            }
            if (loadOptions.loadEntitiesAsEditable) {
                entity.state |= 8 /* Editable */;
            }
            world.addEntity(entity, map);
        }
    }
    if (loadOptions.loadWalls && data.walls) {
        const controller = map.controllers.find(c => c.toggleWall);
        if (controller) {
            controller.deserialize(data.width, data.height, data.walls);
        }
    }
}
exports.loadMap = loadMap;
async function loadMapFromFile(world, map, fileName, options) {
    const json = await fs_1.readFileAsync(fileName, 'utf8');
    const data = JSON.parse(json);
    loadMap(world, map, data, options);
}
exports.loadMapFromFile = loadMapFromFile;
function saveRegionCollider(region) {
    const canvas = canvasUtilsNode_1.createCanvas(constants_1.REGION_WIDTH, constants_1.REGION_HEIGHT);
    const context = canvas.getContext('2d');
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#eee';
    for (let y = 0, i = 0; y < constants_1.REGION_SIZE; y++, i++) {
        for (let x = 0; x < constants_1.REGION_SIZE; x++, i++) {
            if ((i % 2) === 0) {
                context.fillRect(x * constants_1.tileWidth, y * constants_1.tileHeight, constants_1.tileWidth, constants_1.tileHeight);
            }
        }
    }
    context.globalAlpha = 0.8;
    context.fillStyle = 'red';
    for (let y = 0; y < constants_1.REGION_HEIGHT; y++) {
        for (let x = 0; x < constants_1.REGION_WIDTH; x++) {
            if (region.collider[x + y * constants_1.REGION_WIDTH]) {
                context.fillRect(x, y, 1, 1);
            }
        }
    }
    fs_1.writeFileSync(paths_1.pathTo('store', 'collider.png'), canvas.toBuffer());
}
exports.saveRegionCollider = saveRegionCollider;
function distanceSquaredToRegion(x, y, region) {
    const left = region.x * constants_1.REGION_SIZE;
    const top = region.y * constants_1.REGION_SIZE;
    const right = left + constants_1.REGION_SIZE;
    const bottom = top + constants_1.REGION_SIZE;
    const dx = x < left ? (left - x) : (x > right ? (x - right) : 0);
    const dy = y < left ? (top - y) : (y > bottom ? (y - bottom) : 0);
    return dx * dx + dy * dy;
}
function findClosestEntity(map, originX, originY, predicate) {
    let minX = Math.floor(originX / constants_1.REGION_SIZE);
    let minY = Math.floor(originY / constants_1.REGION_SIZE);
    let maxX = minX;
    let maxY = minY;
    let closest = undefined;
    let closestDist = Number.MAX_VALUE;
    while (minX >= 0 || minY >= 0 || maxX < map.regionsX || maxY < map.regionsY) {
        let regionsChecked = 0;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x = (x === maxX || y === minY || y === maxY) ? x + 1 : maxX) {
                if (x >= 0 && y >= 0 && x < map.regionsX && y < map.regionsY) {
                    const region = worldMap_1.getRegion(map, x, y);
                    if (distanceSquaredToRegion(originX, originY, region) < closestDist) {
                        regionsChecked++;
                        for (const entity of region.entities) {
                            if (predicate(entity)) {
                                const dist = utils_1.distanceSquaredXY(originX, originY, entity.x, entity.y);
                                if (dist < closestDist) {
                                    closest = entity;
                                    closestDist = dist;
                                }
                            }
                        }
                    }
                }
            }
        }
        if (!regionsChecked) {
            break;
        }
        minX -= 1;
        minY -= 1;
        maxX += 1;
        maxY += 1;
    }
    return closest;
}
exports.findClosestEntity = findClosestEntity;
function findEntities(map, predicate) {
    const entities = [];
    for (const region of map.regions) {
        for (const entity of region.entities) {
            if (predicate(entity)) {
                entities.push(entity);
            }
        }
    }
    return entities;
}
exports.findEntities = findEntities;
// TODO: maybe only regions in bounds, instead of adding 1 region border ?
function forEachRegionInBounds(map, bounds, callback) {
    const minX = Math.max(0, Math.floor(bounds.x / constants_1.REGION_SIZE) - 1) | 0;
    const minY = Math.max(0, Math.floor(bounds.y / constants_1.REGION_SIZE) - 1) | 0;
    const maxX = Math.min(Math.floor((bounds.x + bounds.w) / constants_1.REGION_SIZE) + 1, map.regionsX - 1) | 0;
    const maxY = Math.min(Math.floor((bounds.y + bounds.h) / constants_1.REGION_SIZE) + 1, map.regionsY - 1) | 0;
    for (let ry = minY; ry <= maxY; ry++) {
        for (let rx = minX; rx <= maxX; rx++) {
            const region = worldMap_1.getRegion(map, rx, ry);
            callback(region);
        }
    }
}
function findEntitiesInBounds(map, bounds) {
    const result = [];
    forEachRegionInBounds(map, bounds, region => {
        for (const entity of region.entities) {
            if (utils_1.containsPoint(0, 0, bounds, entity.x, entity.y)) {
                result.push(entity);
            }
        }
    });
    return result;
}
exports.findEntitiesInBounds = findEntitiesInBounds;
function updateMapState(map, update) {
    Object.assign(map.state, update);
    for (const region of map.regions) {
        for (const client of region.clients) {
            client.mapUpdate(map.state);
        }
    }
}
exports.updateMapState = updateMapState;
function hasAnyClients(map) {
    for (const region of map.regions) {
        if (region.clients.length > 0) {
            return true;
        }
    }
    return false;
}
exports.hasAnyClients = hasAnyClients;
function createMinimap(world, map) {
    const { width, height } = map;
    const buffer = new Uint32Array(width * height);
    for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
            const tile = worldMap_1.getTile(map, x, y);
            buffer[x + y * width] = colors_1.getTileColor(tile, world.season);
        }
    }
    // map.entities = info.entities
    // 	.map(({ type, id, x, y }) => createAnEntity(type, id, x, y, {}, mockPaletteManager));
    // for (let i = 1; i <= 2; i++) {
    // 	for (const e of map.entities) {
    // 		if (e.minimap && e.minimap.order === i) {
    // 			const { color, rect } = e.minimap;
    // 			mapContext.fillStyle = colorToCSS(color);
    // 			mapContext.fillRect(Math.round(e.x + rect.x), Math.round(e.y + rect.y), rect.w, rect.h);
    // 		}
    // 	}
    // }
    // canvas.width = mapCanvas.width * scale;
    // canvas.height = mapCanvas.height * scale;
    // const context = canvas.getContext('2d')!;
    // context.save();
    // if (scale >= 1) {
    // 	disableImageSmoothing(context);
    // }
    // context.scale(scale, scale);
    // context.drawImage(mapCanvas, 0, 0);
    // context.restore();
    return new Uint8Array(buffer.buffer);
}
exports.createMinimap = createMinimap;
//# sourceMappingURL=serverMap.js.map