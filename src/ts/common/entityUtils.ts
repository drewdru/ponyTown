import { sort } from 'timsort';
import {
	Entity, EntityState, BodyAnimation, Point, EntityFlags, IMap, Pony, Says, EntityPlayerState, WorldMap
} from './interfaces';
import { hasFlag, distance, pushUniq, setFlag } from './utils';
import { stand, sit, lie, fly, flyBug, swim } from '../client/ponyAnimations';
import { releasePony, isPony } from './pony';
import { toScreenX, toScreenY } from './positionUtils';
import { releasePalette } from '../graphics/paletteManager';
import { rect } from './rect';
import { addOrRemoveFromEntityList } from './worldMap';
import { PONY_TYPE } from './constants';
import { isStaticCollision } from './collision';

export function releaseEntity(entity: Entity) {
	if (isPony(entity)) {
		releasePony(entity);
	}

	if (entity.palettes !== undefined) {
		for (const palette of entity.palettes) {
			releasePalette(palette);
		}
	}
}

export function addChatBubble(map: WorldMap, entity: Entity, says: Says) {
	entity.says = says;
	pushUniq(map.entitiesWithChat, entity);
}

export function updateEntityVelocity(map: WorldMap, entity: Entity, vx: number, vy: number) {
	const wasMoving = isMoving(entity);
	entity.vx = vx;
	entity.vy = vy;
	const isMovingNow = isMoving(entity);
	addOrRemoveFromEntityList(map.entitiesMoving, entity, wasMoving, isMovingNow);
}

export function compareEntities(a: Entity, b: Entity) {
	return (toScreenY(a.y) - toScreenY(b.y))
		|| (a.order - b.order)
		|| (b.id - a.id)
		|| (toScreenX(a.x) - toScreenX(b.x))
		|| (toScreenY(a.z) - toScreenY(b.z)
		);
}

export function sortEntities(entities: Entity[]) {
	sort(entities, compareEntities);
}

export function closestEntity(point: Point, entities: Entity[]): Entity | undefined {
	return entities.reduce((best, entity) => distance(point, entity) < distance(point, best) ? entity : best, entities[0]);
}

export function getBoopRect(entity: Entity) {
	const right = hasFlag(entity.state, EntityState.FacingRight);
	const sitting = isPonySitting(entity);
	return rect(entity.x + (right ? 0.6 : -0.9) * (sitting ? 0.6 : 1), entity.y - 0.2, 0.3, 0.4);
}

export function isMoving(entity: Entity) {
	return entity.vx !== 0 || entity.vy !== 0;
}

export function isDrawable(entity: Entity) {
	return entity.type === PONY_TYPE || entity.draw !== undefined;
}

export function canLand<T>(entity: Entity, map: IMap<T>) {
	return !isStaticCollision(entity, map, true);
}

export function canStand<T>(entity: Entity, map: IMap<T>) {
	return !isPonyStanding(entity) && isPonyLandedOrCanLand(entity, map);
}

export function canSit<T>(entity: Entity, map: IMap<T>) {
	return !isPonySitting(entity) && isPonyLandedOrCanLand(entity, map) && !isMoving(entity);
}

export function canLie<T>(entity: Entity, map: IMap<T>) {
	return !isPonyLying(entity) && isPonyLandedOrCanLand(entity, map) && !isMoving(entity);
}

export function entityInRange(entity: Entity, player: Entity) {
	return (!entity.interactRange || distance(player, entity) < entity.interactRange);
}

export function getInteractBounds(pony: Pony) {
	const boundsWidth = 1;
	const boundsHeight = 1;
	const boundsOffset = 0.5 + (isPonySitting(pony) ? -0.3 : (isPonyLying(pony) ? -0.2 : 0));

	return rect(
		toScreenX(isFacingRight(pony) ? (pony.x + boundsOffset) : (pony.x - boundsOffset - boundsWidth)),
		toScreenY(pony.y - boundsHeight / 2),
		toScreenX(boundsWidth),
		toScreenY(boundsHeight));
}

export const SIT_ON_BOUNDS_WIDTH = 1.2;
export const SIT_ON_BOUNDS_HEIGHT = 0.5;
export const SIT_ON_BOUNDS_OFFSET = 0.4;

export function getSitOnBounds(pony: Pony) {
	const width = SIT_ON_BOUNDS_WIDTH;
	const height = SIT_ON_BOUNDS_HEIGHT;
	const offset = isFacingRight(pony) ? -SIT_ON_BOUNDS_OFFSET : (SIT_ON_BOUNDS_OFFSET - SIT_ON_BOUNDS_WIDTH);
	return rect(toScreenX(pony.x + offset), toScreenY(pony.y - SIT_ON_BOUNDS_HEIGHT / 2), toScreenX(width), toScreenY(height));
}

// pony state

export function isIdleAnimation(animation: BodyAnimation) {
	return animation === stand || animation === sit || animation === lie || animation === fly ||
		animation === flyBug || animation === swim;
}

export function isIdle(pony: Pony) {
	return !isMoving(pony) && isIdleAnimation(pony.ponyState.animation);
}

export function canBoop(pony: Pony) {
	return isIdle(pony);
}

export function canBoop2(entity: Entity) {
	return !isMoving(entity) && (isPonyStanding(entity) || isPonySitting(entity) || isPonyLying(entity) || isPonyFlying(entity));
}

// entity player state

export function isHidden(entity: Entity) {
	return (entity.playerState & EntityPlayerState.Hidden) !== 0;
}

export function isIgnored(entity: Entity) {
	return (entity.playerState & EntityPlayerState.Ignored) !== 0;
}

export function isFriend(entity: Entity) {
	return (entity.playerState & EntityPlayerState.Friend) !== 0;
}

export function isInTheAir(entity: Entity) {
	return isFlying(entity) && (entity.inTheAirDelay === undefined || entity.inTheAirDelay <= 0);
}

// entity state

export function isFlying(entity: Entity) {
	return (entity.state & EntityState.Flying) !== 0;
}

export function isFacingRight(entity: Entity) {
	return (entity.state & EntityState.FacingRight) !== 0;
}

export function hasHeadTurned(entity: Entity) {
	return (entity.state & EntityState.HeadTurned) !== 0;
}

export function isHeadFacingRight(entity: Entity) {
	const headTurned = hasHeadTurned(entity);
	const facingRight = isFacingRight(entity);
	return facingRight ? !headTurned : headTurned;
}

export function getPonyState(state: EntityState): EntityState {
	return state & EntityState.PonyStateMask;
}

export function setPonyState(state: EntityState, set: EntityState) {
	state = (state & ~EntityState.PonyStateMask) | set;
	state = setFlag(state, EntityState.Flying, set === EntityState.PonyFlying);
	return state;
}

export function isSittingState(state: EntityState) {
	return getPonyState(state) === EntityState.PonySitting;
}

export function isLyingState(state: EntityState) {
	return getPonyState(state) === EntityState.PonyLying;
}

export function isPonyWalking(entity: Entity) {
	return getPonyState(entity.state) === EntityState.PonyWalking;
}

export function isPonyTrotting(entity: Entity) {
	return getPonyState(entity.state) === EntityState.PonyTrotting;
}

export function isPonySitting(entity: Entity) {
	return getPonyState(entity.state) === EntityState.PonySitting;
}

export function isPonyStanding(entity: Entity) {
	return getPonyState(entity.state) === EntityState.PonyStanding;
}

export function isPonyLying(entity: Entity) {
	return getPonyState(entity.state) === EntityState.PonyLying;
}

export function isPonyFlying(entity: Entity) {
	return getPonyState(entity.state) === EntityState.PonyFlying;
}

export function isPonyLandedOrCanLand<T>(entity: Entity, map: IMap<T>) {
	return !isPonyFlying(entity) || canLand(entity, map);
}

// entity flags

export function isDecal(entity: Entity) {
	return (entity.flags & EntityFlags.Decal) !== 0;
}

export function isCritter(entity: Entity) {
	return (entity.flags & EntityFlags.Critter) !== 0;
}
