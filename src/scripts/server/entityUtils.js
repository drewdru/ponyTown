"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ag_sockets_1 = require("ag-sockets");
const utf8_1 = require("ag-sockets/dist/utf8");
const interfaces_1 = require("../common/interfaces");
const utils_1 = require("../common/utils");
const entityUtils_1 = require("../common/entityUtils");
const serverRegion_1 = require("./serverRegion");
const worldMap_1 = require("../common/worldMap");
const swears_1 = require("../common/swears");
const movementUtils_1 = require("../common/movementUtils");
const updateEncoder_1 = require("../common/encoders/updateEncoder");
const constants_1 = require("../common/constants");
const entities_1 = require("../common/entities");
function isEntityShadowed(entity) {
    return entity.client !== undefined && entity.client.shadowed;
}
exports.isEntityShadowed = isEntityShadowed;
function setEntityName(entity, name) {
    entity.name = name;
    entity.nameBad = name !== swears_1.filterName(name);
    entity.encodedName = utf8_1.encodeString(name);
}
exports.setEntityName = setEntityName;
function getEntityName(entity, client) {
    if (entity.name && entity.nameBad && client.accountSettings.filterSwearWords) {
        return swears_1.filterName(entity.name);
    }
    else {
        return entity.name;
    }
}
exports.getEntityName = getEntityName;
const grapeTypes = [...entities_1.grapesPurple.map(x => x.type), ...entities_1.grapesGreen.map(x => x.type)];
function isHoldingGrapes(e) {
    const hold = e.options.hold || 0;
    return hold !== 0 && grapeTypes.indexOf(hold) !== -1;
}
exports.isHoldingGrapes = isHoldingGrapes;
function canBoopEntity(e, boopRect) {
    if (e.type === constants_1.PONY_TYPE) {
        return isHoldingGrapes(e);
    }
    else {
        return e.boop !== undefined && utils_1.containsPoint(0, 0, boopRect, e.x + (e.boopX || 0), e.y + (e.boopY || 0));
    }
}
exports.canBoopEntity = canBoopEntity;
function distSq(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}
function findClosest(x, y, entities) {
    let closest = entities[0];
    let distance = closest ? distSq(x, y, closest.x, closest.y) : 0;
    for (let i = 1; i < entities.length; i++) {
        const entity = entities[i];
        const dist = distSq(x, y, entity.x, entity.y);
        if (dist < distance) {
            closest = entity;
            distance = dist;
        }
    }
    return closest;
}
exports.findClosest = findClosest;
function moveRandomly(map, e, speed, randomness, timestamp) {
    if (Math.random() < randomness) {
        let vx = 0;
        let vy = 0;
        if (e.x < 0) {
            vx = 1;
        }
        else if (e.x > map.width) {
            vx = -1;
        }
        else if (e.y < 0) {
            vy = 1;
        }
        else if (e.y > map.height) {
            vy = -1;
        }
        else {
            vx = Math.random() - 0.5;
            vy = Math.random() - 0.5;
        }
        updateEntityVelocity(e, vx * speed, vy * speed, timestamp);
    }
}
exports.moveRandomly = moveRandomly;
function moveTowards(e, x, y, speed, timestamp) {
    const v = utils_1.normalize(x - e.x, y - e.y);
    updateEntityVelocity(e, v.x * speed, v.y * speed, timestamp);
}
exports.moveTowards = moveTowards;
// update entity functions
function setEntityAnimation(entity, animation, faceRight) {
    let state = entity.state;
    if (faceRight !== undefined) {
        state = utils_1.setFlag(state, 2 /* FacingRight */, faceRight);
    }
    state = interfaces_1.setAnimationToEntityState(state, animation);
    updateEntityState(entity, state);
}
exports.setEntityAnimation = setEntityAnimation;
function updateEntityVelocity(entity, vx, vy, timestamp) {
    if (vx !== entity.vx || vy !== entity.vy) {
        entity.vx = vx;
        entity.vy = vy;
        entity.timestamp = timestamp;
        entity.state = utils_1.setFlag(entity.state, 2 /* FacingRight */, movementUtils_1.shouldBeFacingRight(entity));
        updateEntity(entity, false);
    }
}
exports.updateEntityVelocity = updateEntityVelocity;
function updateEntity(entity, switchRegion) {
    const flags = 1 /* Position */ | 4 /* State */ | (switchRegion ? 2048 /* SwitchRegion */ : 0);
    const { x, y, vx, vy } = entity;
    pushUpdateEntity({ entity, flags, x, y, vx, vy });
}
exports.updateEntity = updateEntity;
function updateEntityState(entity, state) {
    entity.state = state;
    pushUpdateEntity({ entity, flags: 4 /* State */ });
}
exports.updateEntityState = updateEntityState;
function updateEntityOptions(entity, options) {
    entity.options = Object.assign(entity.options || {}, options);
    pushUpdateEntity({ entity, flags: 32 /* Options */, options });
}
exports.updateEntityOptions = updateEntityOptions;
function updateEntityNameInfo(entity) {
    pushUpdateEntity({ entity, flags: 256 /* Name */ | 64 /* Info */ });
}
exports.updateEntityNameInfo = updateEntityNameInfo;
function updateEntityExpression(entity) {
    pushUpdateEntity({ entity, flags: 8 /* Expression */ });
}
exports.updateEntityExpression = updateEntityExpression;
function sendAction(entity, action) {
    pushUpdateEntity({ entity, flags: 128 /* Action */, action });
}
exports.sendAction = sendAction;
function pushUpdateEntity(update) {
    const entity = update.entity;
    if (isEntityShadowed(entity)) {
        pushUpdateEntityToClient(entity.client, update);
    }
    else if (entity.region) {
        serverRegion_1.pushUpdateEntityToRegion(entity.region, update);
    }
}
exports.pushUpdateEntity = pushUpdateEntity;
function isOverflowError(e) {
    return e instanceof RangeError || /DataView/.test(e.message);
}
exports.isOverflowError = isOverflowError;
function resizePreserveWriter(error, writer, offset) {
    if (isOverflowError(error)) {
        const bytes = writer.bytes;
        ag_sockets_1.resizeWriter(writer);
        writer.bytes.set(bytes);
        writer.offset = offset;
        // DEVELOPMENT && logger.debug(`resize writer to ${writer.bytes.byteLength} (${error.message})`);
    }
    else {
        throw error;
    }
}
function pushAddEntityToClient(client, entity) {
    const writer = client.updateQueue;
    const offset = writer.offset;
    while (true) {
        try {
            ag_sockets_1.writeUint8(writer, 1 /* AddEntity */);
            updateEncoder_1.writeOneEntity(writer, entity, client);
            break;
        }
        catch (e) {
            resizePreserveWriter(e, writer, offset);
        }
    }
}
exports.pushAddEntityToClient = pushAddEntityToClient;
function pushUpdateEntityToClient(client, update) {
    const writer = client.updateQueue;
    const offset = writer.offset;
    const { entity, flags, x = 0, y = 0, vx = 0, vy = 0, options, action = 0, playerState = 0 } = update;
    while (true) {
        try {
            ag_sockets_1.writeUint8(writer, 2 /* UpdateEntity */);
            updateEncoder_1.writeOneUpdate(writer, entity, flags, x, y, vx, vy, options, action, playerState);
            break;
        }
        catch (e) {
            resizePreserveWriter(e, writer, offset);
        }
    }
}
exports.pushUpdateEntityToClient = pushUpdateEntityToClient;
function pushRemoveEntityToClient(client, entity) {
    const writer = client.updateQueue;
    const offset = writer.offset;
    while (true) {
        try {
            ag_sockets_1.writeUint8(writer, 3 /* RemoveEntity */);
            ag_sockets_1.writeUint32(writer, entity.id);
            break;
        }
        catch (e) {
            resizePreserveWriter(e, writer, offset);
        }
    }
}
exports.pushRemoveEntityToClient = pushRemoveEntityToClient;
function pushUpdateTileToClient(client, x, y, type) {
    const writer = client.updateQueue;
    const offset = writer.offset;
    while (true) {
        try {
            ag_sockets_1.writeUint8(writer, 4 /* UpdateTile */);
            ag_sockets_1.writeUint16(writer, x);
            ag_sockets_1.writeUint16(writer, y);
            ag_sockets_1.writeUint8(writer, type);
            break;
        }
        catch (e) {
            resizePreserveWriter(e, writer, offset);
        }
    }
}
exports.pushUpdateTileToClient = pushUpdateTileToClient;
// other helpers
function findIntersectingEntityByBounds(map, entity) {
    const { x, y } = worldMap_1.getRegionGlobal(map, entity.x, entity.y);
    const minX = Math.max(x - 1, 0);
    const minY = Math.max(y - 1, 0);
    const maxX = Math.min(x + 1, map.regionsX - 1);
    const maxY = Math.min(y + 1, map.regionsY - 1);
    for (let iy = minY; iy <= maxY; iy++) {
        for (let ix = minX; ix <= maxX; ix++) {
            const region = worldMap_1.getRegion(map, ix, iy);
            for (const e of region.entities) {
                if (e !== entity && !entityUtils_1.isDecal(e) && !entityUtils_1.isCritter(e) && utils_1.boundsIntersect(entity.x, entity.y, entity.bounds, e.x, e.y, e.bounds)) {
                    return e;
                }
            }
        }
    }
    return undefined;
}
exports.findIntersectingEntityByBounds = findIntersectingEntityByBounds;
function findPlayerThatCanPickEntity(map, entity) {
    const { x, y } = worldMap_1.getRegionGlobal(map, entity.x, entity.y);
    const minX = Math.max(x - 1, 0);
    const minY = Math.max(y - 1, 0);
    const maxX = Math.min(x + 1, map.regionsX - 1);
    const maxY = Math.min(y + 1, map.regionsY - 1);
    for (let iy = minY; iy <= maxY; iy++) {
        for (let ix = minX; ix <= maxX; ix++) {
            const region = worldMap_1.getRegion(map, ix, iy);
            for (const e of region.entities) {
                if (e.client !== undefined && entityUtils_1.entityInRange(entity, e)) {
                    return e;
                }
            }
        }
    }
    return undefined;
}
exports.findPlayerThatCanPickEntity = findPlayerThatCanPickEntity;
function findPlayersThetCanBeSitOn(map, entity) {
    const { x, y } = worldMap_1.getRegionGlobal(map, entity.x, entity.y);
    const minX = Math.max(x - 1, 0);
    const minY = Math.max(y - 1, 0);
    const maxX = Math.min(x + 1, map.regionsX - 1);
    const maxY = Math.min(y + 1, map.regionsY - 1);
    for (let iy = minY; iy <= maxY; iy++) {
        for (let ix = minX; ix <= maxX; ix++) {
            const region = worldMap_1.getRegion(map, ix, iy);
            for (const e of region.entities) {
                if (e !== entity && e.client !== undefined && canBeSitOn(e, entity)) {
                    return e;
                }
            }
        }
    }
    return undefined;
}
exports.findPlayersThetCanBeSitOn = findPlayersThetCanBeSitOn;
function canBeSitOn(entity, by) {
    const right = utils_1.hasFlag(by.state, 2 /* FacingRight */);
    const entityRight = utils_1.hasFlag(entity.state, 2 /* FacingRight */);
    if (right !== entityRight) {
        return false;
    }
    const x = by.x + (right ? -entityUtils_1.SIT_ON_BOUNDS_OFFSET : (entityUtils_1.SIT_ON_BOUNDS_OFFSET - entityUtils_1.SIT_ON_BOUNDS_WIDTH));
    const y = by.y - entityUtils_1.SIT_ON_BOUNDS_HEIGHT / 2;
    const w = entityUtils_1.SIT_ON_BOUNDS_WIDTH;
    const h = entityUtils_1.SIT_ON_BOUNDS_HEIGHT;
    return utils_1.pointInXYWH(entity.x, entity.y, x, y, w, h);
}
function canPlaceItem(map, entity) {
    const tile = worldMap_1.getTile(map, entity.x, entity.y);
    return interfaces_1.canWalk(tile) && tile !== 3 /* Water */ && tile !== 8 /* Boat */ &&
        !findIntersectingEntityByBounds(map, entity);
}
exports.canPlaceItem = canPlaceItem;
function canBePickedByPlayer(map, entity) {
    return !!findPlayerThatCanPickEntity(map, entity);
}
exports.canBePickedByPlayer = canBePickedByPlayer;
function fixPosition(entity, map, x, y, safe) {
    entity.x = utils_1.clamp(x, 0, map.width);
    entity.y = utils_1.clamp(y, 0, map.height);
    updateEntity(entity, false);
    if (entity.client) {
        entity.client.fixPosition(entity.x, entity.y, safe);
        entity.client.fixingPosition = true;
    }
}
exports.fixPosition = fixPosition;
//# sourceMappingURL=entityUtils.js.map