"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ag_sockets_1 = require("ag-sockets");
const utils_1 = require("../common/utils");
const serverRegion_1 = require("./serverRegion");
const entityUtils_1 = require("./entityUtils");
const updateEncoder_1 = require("../common/encoders/updateEncoder");
const positionUtils_1 = require("../common/positionUtils");
const camera_1 = require("../common/camera");
const timing_1 = require("./timing");
const worldMap_1 = require("../common/worldMap");
const logger_1 = require("./logger");
const constants_1 = require("../common/constants");
let updatesBuffer = new ArrayBuffer(4096);
let updatesBufferOffset = 0;
function resetEncodeUpdate() {
    updatesBufferOffset = 0;
}
exports.resetEncodeUpdate = resetEncodeUpdate;
function resizeUpdatesBuffer(e) {
    if (entityUtils_1.isOverflowError(e)) {
        updatesBuffer = new ArrayBuffer(updatesBuffer.byteLength * 2);
        updatesBufferOffset = 0;
        DEVELOPMENT && logger_1.logger.debug(`resize buffer to ${updatesBuffer.byteLength} (${e.message})`);
    }
    else {
        throw e;
    }
}
function createUpdatesWriter() {
    const buffer = new Uint8Array(updatesBuffer, updatesBufferOffset, updatesBuffer.byteLength - updatesBufferOffset);
    return ag_sockets_1.createBinaryWriter(buffer);
}
function commitUpdatesWriter(writer) {
    const result = ag_sockets_1.getWriterBuffer(writer);
    updatesBufferOffset += result.byteLength;
    return result;
}
function encodeUpdate(region) {
    timing_1.timingStart('encodeUpdate()');
    let result;
    while (true) {
        try {
            const writer = createUpdatesWriter();
            updateEncoder_1.writeUpdate(writer, region);
            result = commitUpdatesWriter(writer);
            break;
        }
        catch (e) {
            resizeUpdatesBuffer(e);
        }
    }
    timing_1.timingEnd();
    return result;
}
function encodeRegion(region, client) {
    timing_1.timingStart('encodeRegion()');
    let result;
    while (true) {
        try {
            const writer = createUpdatesWriter();
            updateEncoder_1.writeRegion(writer, region, client);
            result = commitUpdatesWriter(writer);
            break;
        }
        catch (e) {
            resizeUpdatesBuffer(e);
        }
    }
    timing_1.timingEnd();
    return result;
}
function subscribeToRegionsInRange(client) {
    timing_1.timingStart('subscribeToRegionsInRange()');
    const { map, camera } = client;
    const maxX = utils_1.clamp(Math.floor(positionUtils_1.toWorldX(camera.x + camera.w) / constants_1.REGION_SIZE) + 1, 0, map.regionsX - 1);
    const maxY = utils_1.clamp(Math.floor(positionUtils_1.toWorldY(camera.y + camera.h) / constants_1.REGION_SIZE) + 1, 0, map.regionsY - 1);
    const minX = utils_1.clamp(Math.floor(positionUtils_1.toWorldX(camera.x) / constants_1.REGION_SIZE) - 1, 0, maxX);
    const minY = utils_1.clamp(Math.floor(positionUtils_1.toWorldY(camera.y) / constants_1.REGION_SIZE) - 1, 0, maxY);
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const region = worldMap_1.getRegion(map, x, y);
            if (camera_1.isRectVisible(camera, region.subscribeBounds)) {
                if (!isSubscribedToRegion(client, region)) {
                    timing_1.timingStart('subscribeToRegion()');
                    region.clients.push(client);
                    client.regions.push(region);
                    client.subscribes.push(encodeRegion(region, client));
                    timing_1.timingEnd();
                }
            }
        }
    }
    timing_1.timingEnd();
}
exports.subscribeToRegionsInRange = subscribeToRegionsInRange;
function unsubscribeFromOutOfRangeRegions(client) {
    timing_1.timingStart('unsubscribeFromOutOfRangeRegions()');
    const regions = client.regions;
    for (let i = regions.length - 1; i >= 0; i--) {
        const region = regions[i];
        if (!camera_1.isRectVisible(client.camera, region.unsubscribeBounds)) {
            if (utils_1.includes(region.entities, client.pony)) {
                DEVELOPMENT && logger_1.logger.warn(`Trying to unsubscribe client from region they are in`);
            }
            else {
                utils_1.removeItem(region.clients, client);
                regions.splice(i, 1);
                client.unsubscribes.push(region.x, region.y);
            }
        }
    }
    timing_1.timingEnd();
}
exports.unsubscribeFromOutOfRangeRegions = unsubscribeFromOutOfRangeRegions;
function unsubscribeFromAllRegions(client, silent) {
    for (const region of client.regions) {
        utils_1.removeItem(region.clients, client);
        if (!silent) {
            client.unsubscribes.push(region.x, region.y);
        }
    }
    client.regions = [];
}
exports.unsubscribeFromAllRegions = unsubscribeFromAllRegions;
function getExpectedRegion({ x, y, flags, region }, map) {
    if (region !== undefined && (flags & 1 /* Movable */) !== 0 && utils_1.pointInRect(x, y, region.boundsWithBorder)) {
        return region;
    }
    else {
        const rx = utils_1.clamp(Math.floor(x / constants_1.REGION_SIZE), 0, map.regionsX - 1) | 0;
        const ry = utils_1.clamp(Math.floor(y / constants_1.REGION_SIZE), 0, map.regionsY - 1) | 0;
        return map.regions[(rx + ((ry * map.regionsX) | 0)) | 0];
    }
}
exports.getExpectedRegion = getExpectedRegion;
function updateRegion(entity, map) {
    const expectedRegion = getExpectedRegion(entity, map);
    if (expectedRegion !== entity.region) {
        transferToRegion(entity, expectedRegion, map);
    }
}
exports.updateRegion = updateRegion;
const moves = [];
function updateRegions(maps) {
    timing_1.timingStart('updateRegions()');
    moves.length = 0;
    // TODO: only update changed entities
    timing_1.timingStart('getExpectedRegion');
    for (const map of maps) {
        for (const region of map.regions) {
            for (const entity of region.movables) {
                const expectedRegion = getExpectedRegion(entity, map);
                if (expectedRegion !== entity.region) {
                    moves.push({ entity, region: expectedRegion, map });
                }
            }
        }
    }
    timing_1.timingEnd();
    timing_1.timingStart('transferToRegion');
    for (const { entity, region, map } of moves) {
        transferToRegion(entity, region, map);
    }
    timing_1.timingEnd();
    moves.length = 0;
    timing_1.timingEnd();
}
exports.updateRegions = updateRegions;
function commitRegionUpdates(regions) {
    timing_1.timingStart('commitRegionUpdates()');
    for (const region of regions) {
        if (region.entityUpdates.length || region.entityRemoves.length || region.tileUpdates.length) {
            if (region.clients.length) {
                const data = encodeUpdate(region);
                for (const client of region.clients) {
                    client.regionUpdates.push(data);
                }
            }
            serverRegion_1.resetRegionUpdates(region);
        }
    }
    timing_1.timingEnd();
}
exports.commitRegionUpdates = commitRegionUpdates;
function transferToRegion(entity, region, map) {
    const oldRegion = entity.region;
    if (oldRegion) {
        serverRegion_1.removeEntityFromRegion(oldRegion, entity, map);
        entityUtils_1.updateEntity(entity, true);
    }
    entity.region = region;
    serverRegion_1.addEntityToRegion(region, entity, map);
    if (!entityUtils_1.isEntityShadowed(entity)) {
        for (const client of region.clients) {
            if (!oldRegion || !isSubscribedToRegion(client, oldRegion)) {
                entityUtils_1.pushAddEntityToClient(client, entity);
            }
        }
    }
}
exports.transferToRegion = transferToRegion;
function addToRegion(entity, region, map) {
    entity.region = region;
    serverRegion_1.addEntityToRegion(region, entity, map);
    if (entityUtils_1.isEntityShadowed(entity)) {
        entityUtils_1.pushAddEntityToClient(entity.client, entity);
    }
    else {
        for (const client of region.clients) {
            entityUtils_1.pushAddEntityToClient(client, entity);
        }
    }
}
exports.addToRegion = addToRegion;
function removeFromRegion(entity, region, map) {
    const removed = serverRegion_1.removeEntityFromRegion(region, entity, map);
    serverRegion_1.pushRemoveEntityToRegion(region, entity);
    return removed;
}
exports.removeFromRegion = removeFromRegion;
function isSubscribedToRegion(client, region) {
    return utils_1.includes(client.regions, region);
}
exports.isSubscribedToRegion = isSubscribedToRegion;
function sparseRegionUpdate(map, region, options) {
    if (options.restoreTerrain) {
        serverRegion_1.tickTilesRestoration(map, region);
    }
}
exports.sparseRegionUpdate = sparseRegionUpdate;
// timing helpers
function writingTiming() {
    timing_1.timingStart('write');
}
function sendingTiming() {
    timing_1.timingEnd();
    timing_1.timingStart('send');
}
function doneTiming() {
    timing_1.timingEnd();
}
function noop() {
}
function setupTiming(client) {
    if (client.__internalHooks) {
        client.__internalHooks.writing = writingTiming;
        client.__internalHooks.sending = sendingTiming;
        client.__internalHooks.done = doneTiming;
    }
}
exports.setupTiming = setupTiming;
function clearTiming(client) {
    if (client.__internalHooks) {
        client.__internalHooks.writing = noop;
        client.__internalHooks.sending = noop;
        client.__internalHooks.done = noop;
    }
}
exports.clearTiming = clearTiming;
//# sourceMappingURL=regionUtils.js.map