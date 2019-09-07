"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timsort_1 = require("timsort");
const utils_1 = require("./utils");
const ponyAnimations_1 = require("../client/ponyAnimations");
const pony_1 = require("./pony");
const positionUtils_1 = require("./positionUtils");
const paletteManager_1 = require("../graphics/paletteManager");
const rect_1 = require("./rect");
const worldMap_1 = require("./worldMap");
const constants_1 = require("./constants");
const collision_1 = require("./collision");
function releaseEntity(entity) {
    if (pony_1.isPony(entity)) {
        pony_1.releasePony(entity);
    }
    if (entity.palettes !== undefined) {
        for (const palette of entity.palettes) {
            paletteManager_1.releasePalette(palette);
        }
    }
}
exports.releaseEntity = releaseEntity;
function addChatBubble(map, entity, says) {
    entity.says = says;
    utils_1.pushUniq(map.entitiesWithChat, entity);
}
exports.addChatBubble = addChatBubble;
function updateEntityVelocity(map, entity, vx, vy) {
    const wasMoving = isMoving(entity);
    entity.vx = vx;
    entity.vy = vy;
    const isMovingNow = isMoving(entity);
    worldMap_1.addOrRemoveFromEntityList(map.entitiesMoving, entity, wasMoving, isMovingNow);
}
exports.updateEntityVelocity = updateEntityVelocity;
function compareEntities(a, b) {
    return (positionUtils_1.toScreenY(a.y) - positionUtils_1.toScreenY(b.y))
        || (a.order - b.order)
        || (b.id - a.id)
        || (positionUtils_1.toScreenX(a.x) - positionUtils_1.toScreenX(b.x))
        || (positionUtils_1.toScreenY(a.z) - positionUtils_1.toScreenY(b.z));
}
exports.compareEntities = compareEntities;
function sortEntities(entities) {
    timsort_1.sort(entities, compareEntities);
}
exports.sortEntities = sortEntities;
function closestEntity(point, entities) {
    return entities.reduce((best, entity) => utils_1.distance(point, entity) < utils_1.distance(point, best) ? entity : best, entities[0]);
}
exports.closestEntity = closestEntity;
function getBoopRect(entity) {
    const right = utils_1.hasFlag(entity.state, 2 /* FacingRight */);
    const sitting = isPonySitting(entity);
    return rect_1.rect(entity.x + (right ? 0.6 : -0.9) * (sitting ? 0.6 : 1), entity.y - 0.2, 0.3, 0.4);
}
exports.getBoopRect = getBoopRect;
function isMoving(entity) {
    return entity.vx !== 0 || entity.vy !== 0;
}
exports.isMoving = isMoving;
function isDrawable(entity) {
    return entity.type === constants_1.PONY_TYPE || entity.draw !== undefined;
}
exports.isDrawable = isDrawable;
function canLand(entity, map) {
    return !collision_1.isStaticCollision(entity, map, true);
}
exports.canLand = canLand;
function canStand(entity, map) {
    return !isPonyStanding(entity) && isPonyLandedOrCanLand(entity, map);
}
exports.canStand = canStand;
function canSit(entity, map) {
    return !isPonySitting(entity) && isPonyLandedOrCanLand(entity, map) && !isMoving(entity);
}
exports.canSit = canSit;
function canLie(entity, map) {
    return !isPonyLying(entity) && isPonyLandedOrCanLand(entity, map) && !isMoving(entity);
}
exports.canLie = canLie;
function entityInRange(entity, player) {
    return (!entity.interactRange || utils_1.distance(player, entity) < entity.interactRange);
}
exports.entityInRange = entityInRange;
function getInteractBounds(pony) {
    const boundsWidth = 1;
    const boundsHeight = 1;
    const boundsOffset = 0.5 + (isPonySitting(pony) ? -0.3 : (isPonyLying(pony) ? -0.2 : 0));
    return rect_1.rect(positionUtils_1.toScreenX(isFacingRight(pony) ? (pony.x + boundsOffset) : (pony.x - boundsOffset - boundsWidth)), positionUtils_1.toScreenY(pony.y - boundsHeight / 2), positionUtils_1.toScreenX(boundsWidth), positionUtils_1.toScreenY(boundsHeight));
}
exports.getInteractBounds = getInteractBounds;
exports.SIT_ON_BOUNDS_WIDTH = 1.2;
exports.SIT_ON_BOUNDS_HEIGHT = 0.5;
exports.SIT_ON_BOUNDS_OFFSET = 0.4;
function getSitOnBounds(pony) {
    const width = exports.SIT_ON_BOUNDS_WIDTH;
    const height = exports.SIT_ON_BOUNDS_HEIGHT;
    const offset = isFacingRight(pony) ? -exports.SIT_ON_BOUNDS_OFFSET : (exports.SIT_ON_BOUNDS_OFFSET - exports.SIT_ON_BOUNDS_WIDTH);
    return rect_1.rect(positionUtils_1.toScreenX(pony.x + offset), positionUtils_1.toScreenY(pony.y - exports.SIT_ON_BOUNDS_HEIGHT / 2), positionUtils_1.toScreenX(width), positionUtils_1.toScreenY(height));
}
exports.getSitOnBounds = getSitOnBounds;
// pony state
function isIdleAnimation(animation) {
    return animation === ponyAnimations_1.stand || animation === ponyAnimations_1.sit || animation === ponyAnimations_1.lie || animation === ponyAnimations_1.fly ||
        animation === ponyAnimations_1.flyBug || animation === ponyAnimations_1.swim;
}
exports.isIdleAnimation = isIdleAnimation;
function isIdle(pony) {
    return !isMoving(pony) && isIdleAnimation(pony.ponyState.animation);
}
exports.isIdle = isIdle;
function canBoop(pony) {
    return isIdle(pony);
}
exports.canBoop = canBoop;
function canBoop2(entity) {
    return !isMoving(entity) && (isPonyStanding(entity) || isPonySitting(entity) || isPonyLying(entity) || isPonyFlying(entity));
}
exports.canBoop2 = canBoop2;
// entity player state
function isHidden(entity) {
    return (entity.playerState & 2 /* Hidden */) !== 0;
}
exports.isHidden = isHidden;
function isIgnored(entity) {
    return (entity.playerState & 1 /* Ignored */) !== 0;
}
exports.isIgnored = isIgnored;
function isFriend(entity) {
    return (entity.playerState & 4 /* Friend */) !== 0;
}
exports.isFriend = isFriend;
function isInTheAir(entity) {
    return isFlying(entity) && (entity.inTheAirDelay === undefined || entity.inTheAirDelay <= 0);
}
exports.isInTheAir = isInTheAir;
// entity state
function isFlying(entity) {
    return (entity.state & 1 /* Flying */) !== 0;
}
exports.isFlying = isFlying;
function isFacingRight(entity) {
    return (entity.state & 2 /* FacingRight */) !== 0;
}
exports.isFacingRight = isFacingRight;
function hasHeadTurned(entity) {
    return (entity.state & 4 /* HeadTurned */) !== 0;
}
exports.hasHeadTurned = hasHeadTurned;
function isHeadFacingRight(entity) {
    const headTurned = hasHeadTurned(entity);
    const facingRight = isFacingRight(entity);
    return facingRight ? !headTurned : headTurned;
}
exports.isHeadFacingRight = isHeadFacingRight;
function getPonyState(state) {
    return state & 240 /* PonyStateMask */;
}
exports.getPonyState = getPonyState;
function setPonyState(state, set) {
    state = (state & ~240 /* PonyStateMask */) | set;
    state = utils_1.setFlag(state, 1 /* Flying */, set === 80 /* PonyFlying */);
    return state;
}
exports.setPonyState = setPonyState;
function isSittingState(state) {
    return getPonyState(state) === 48 /* PonySitting */;
}
exports.isSittingState = isSittingState;
function isLyingState(state) {
    return getPonyState(state) === 64 /* PonyLying */;
}
exports.isLyingState = isLyingState;
function isPonyWalking(entity) {
    return getPonyState(entity.state) === 16 /* PonyWalking */;
}
exports.isPonyWalking = isPonyWalking;
function isPonyTrotting(entity) {
    return getPonyState(entity.state) === 32 /* PonyTrotting */;
}
exports.isPonyTrotting = isPonyTrotting;
function isPonySitting(entity) {
    return getPonyState(entity.state) === 48 /* PonySitting */;
}
exports.isPonySitting = isPonySitting;
function isPonyStanding(entity) {
    return getPonyState(entity.state) === 0 /* PonyStanding */;
}
exports.isPonyStanding = isPonyStanding;
function isPonyLying(entity) {
    return getPonyState(entity.state) === 64 /* PonyLying */;
}
exports.isPonyLying = isPonyLying;
function isPonyFlying(entity) {
    return getPonyState(entity.state) === 80 /* PonyFlying */;
}
exports.isPonyFlying = isPonyFlying;
function isPonyLandedOrCanLand(entity, map) {
    return !isPonyFlying(entity) || canLand(entity, map);
}
exports.isPonyLandedOrCanLand = isPonyLandedOrCanLand;
// entity flags
function isDecal(entity) {
    return (entity.flags & 2 /* Decal */) !== 0;
}
exports.isDecal = isDecal;
function isCritter(entity) {
    return (entity.flags & 4 /* Critter */) !== 0;
}
exports.isCritter = isCritter;
//# sourceMappingURL=entityUtils.js.map