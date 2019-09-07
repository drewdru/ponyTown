import { resizeWriter, writeUint8, BinaryWriter, writeUint32, writeUint16 } from 'ag-sockets';
import { encodeString } from 'ag-sockets/dist/utf8';
import {
	Entity, Rect, EntityState, UpdateFlags, Action, EntityOrPonyOptions, UpdateType, TileType, canWalk, setAnimationToEntityState
} from '../common/interfaces';
import { normalize, containsPoint, boundsIntersect, clamp, pointInXYWH, hasFlag, setFlag } from '../common/utils';
import { ServerEntity, ServerEntityWithClient, ServerMap, EntityUpdateBase, IClient } from './serverInterfaces';
import {
	isCritter, isDecal, entityInRange, SIT_ON_BOUNDS_WIDTH, SIT_ON_BOUNDS_HEIGHT, SIT_ON_BOUNDS_OFFSET
} from '../common/entityUtils';
import { pushUpdateEntityToRegion } from './serverRegion';
import { getRegion, getRegionGlobal, getTile } from '../common/worldMap';
import { filterName } from '../common/swears';
import { shouldBeFacingRight } from '../common/movementUtils';
import { writeOneEntity, writeOneUpdate } from '../common/encoders/updateEncoder';
import { PONY_TYPE } from '../common/constants';
import { grapesPurple, grapesGreen } from '../common/entities';

export function isEntityShadowed(entity: ServerEntity): entity is ServerEntityWithClient {
	return entity.client !== undefined && entity.client.shadowed;
}

export function setEntityName(entity: ServerEntity, name: string) {
	entity.name = name;
	entity.nameBad = name !== filterName(name);
	entity.encodedName = encodeString(name)!;
}

export function getEntityName(entity: ServerEntity, client: IClient) {
	if (entity.name && entity.nameBad && client.accountSettings.filterSwearWords) {
		return filterName(entity.name);
	} else {
		return entity.name;
	}
}

const grapeTypes = [...grapesPurple.map(x => x.type), ...grapesGreen.map(x => x.type)];

export function isHoldingGrapes(e: ServerEntity) {
	const hold = e.options!.hold || 0;
	return hold !== 0 && grapeTypes.indexOf(hold) !== -1;
}

export function canBoopEntity(e: ServerEntity, boopRect: Rect) {
	if (e.type === PONY_TYPE) {
		return isHoldingGrapes(e);
	} else {
		return e.boop !== undefined && containsPoint(0, 0, boopRect, e.x + (e.boopX || 0), e.y + (e.boopY || 0));
	}
}

function distSq(ax: number, ay: number, bx: number, by: number) {
	const dx = ax - bx;
	const dy = ay - by;
	return dx * dx + dy * dy;
}

export function findClosest(x: number, y: number, entities: Entity[]) {
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

export function moveRandomly(
	map: ServerMap, e: ServerEntity, speed: number, randomness: number, timestamp: number
) {
	if (Math.random() < randomness) {
		let vx = 0;
		let vy = 0;

		if (e.x < 0) {
			vx = 1;
		} else if (e.x > map.width) {
			vx = -1;
		} else if (e.y < 0) {
			vy = 1;
		} else if (e.y > map.height) {
			vy = -1;
		} else {
			vx = Math.random() - 0.5;
			vy = Math.random() - 0.5;
		}

		updateEntityVelocity(e, vx * speed, vy * speed, timestamp);
	}
}

export function moveTowards(e: ServerEntity, x: number, y: number, speed: number, timestamp: number) {
	const v = normalize(x - e.x, y - e.y);
	updateEntityVelocity(e, v.x * speed, v.y * speed, timestamp);
}

// update entity functions

export function setEntityAnimation(entity: ServerEntity, animation: number, faceRight?: boolean) {
	let state = entity.state;

	if (faceRight !== undefined) {
		state = setFlag(state, EntityState.FacingRight, faceRight);
	}

	state = setAnimationToEntityState(state, animation);
	updateEntityState(entity, state);
}

export function updateEntityVelocity(entity: ServerEntity, vx: number, vy: number, timestamp: number) {
	if (vx !== entity.vx || vy !== entity.vy) {
		entity.vx = vx;
		entity.vy = vy;
		entity.timestamp = timestamp;
		entity.state = setFlag(entity.state, EntityState.FacingRight, shouldBeFacingRight(entity));
		updateEntity(entity, false);
	}
}

export function updateEntity(entity: ServerEntity, switchRegion: boolean) {
	const flags = UpdateFlags.Position | UpdateFlags.State | (switchRegion ? UpdateFlags.SwitchRegion : 0);
	const { x, y, vx, vy } = entity;
	pushUpdateEntity({ entity, flags, x, y, vx, vy });
}

export function updateEntityState(entity: ServerEntity, state: EntityState) {
	entity.state = state;
	pushUpdateEntity({ entity, flags: UpdateFlags.State });
}

export function updateEntityOptions(entity: ServerEntity, options: Partial<EntityOrPonyOptions>) {
	entity.options = Object.assign(entity.options || {}, options) as any;
	pushUpdateEntity({ entity, flags: UpdateFlags.Options, options });
}

export function updateEntityNameInfo(entity: ServerEntity) {
	pushUpdateEntity({ entity, flags: UpdateFlags.Name | UpdateFlags.Info });
}

export function updateEntityExpression(entity: ServerEntity) {
	pushUpdateEntity({ entity, flags: UpdateFlags.Expression });
}

export function sendAction(entity: ServerEntity, action: Action) {
	pushUpdateEntity({ entity, flags: UpdateFlags.Action, action });
}

export function pushUpdateEntity(update: EntityUpdateBase) {
	const entity = update.entity;

	if (isEntityShadowed(entity)) {
		pushUpdateEntityToClient(entity.client, update);
	} else if (entity.region) {
		pushUpdateEntityToRegion(entity.region, update);
	}
}

export function isOverflowError(e: Error) {
	return e instanceof RangeError || /DataView/.test(e.message);
}

function resizePreserveWriter(error: Error, writer: BinaryWriter, offset: number) {
	if (isOverflowError(error)) {
		const bytes = writer.bytes;
		resizeWriter(writer);
		writer.bytes.set(bytes);
		writer.offset = offset;
		// DEVELOPMENT && logger.debug(`resize writer to ${writer.bytes.byteLength} (${error.message})`);
	} else {
		throw error;
	}
}

export function pushAddEntityToClient(client: IClient, entity: ServerEntity) {
	const writer = client.updateQueue;
	const offset = writer.offset;

	while (true) {
		try {
			writeUint8(writer, UpdateType.AddEntity);
			writeOneEntity(writer, entity, client);
			break;
		} catch (e) {
			resizePreserveWriter(e, writer, offset);
		}
	}
}

export function pushUpdateEntityToClient(client: IClient, update: EntityUpdateBase) {
	const writer = client.updateQueue;
	const offset = writer.offset;
	const { entity, flags, x = 0, y = 0, vx = 0, vy = 0, options, action = 0, playerState = 0 } = update;

	while (true) {
		try {
			writeUint8(writer, UpdateType.UpdateEntity);
			writeOneUpdate(writer, entity, flags, x, y, vx, vy, options, action, playerState);
			break;
		} catch (e) {
			resizePreserveWriter(e, writer, offset);
		}
	}
}

export function pushRemoveEntityToClient(client: IClient, entity: ServerEntity) {
	const writer = client.updateQueue;
	const offset = writer.offset;

	while (true) {
		try {
			writeUint8(writer, UpdateType.RemoveEntity);
			writeUint32(writer, entity.id);
			break;
		} catch (e) {
			resizePreserveWriter(e, writer, offset);
		}
	}
}

export function pushUpdateTileToClient(client: IClient, x: number, y: number, type: TileType) {
	const writer = client.updateQueue;
	const offset = writer.offset;

	while (true) {
		try {
			writeUint8(writer, UpdateType.UpdateTile);
			writeUint16(writer, x);
			writeUint16(writer, y);
			writeUint8(writer, type);
			break;
		} catch (e) {
			resizePreserveWriter(e, writer, offset);
		}
	}
}

// other helpers

export function findIntersectingEntityByBounds(map: ServerMap, entity: ServerEntity) {
	const { x, y } = getRegionGlobal(map, entity.x, entity.y);
	const minX = Math.max(x - 1, 0);
	const minY = Math.max(y - 1, 0);
	const maxX = Math.min(x + 1, map.regionsX - 1);
	const maxY = Math.min(y + 1, map.regionsY - 1);

	for (let iy = minY; iy <= maxY; iy++) {
		for (let ix = minX; ix <= maxX; ix++) {
			const region = getRegion(map, ix, iy);

			for (const e of region.entities) {
				if (e !== entity && !isDecal(e) && !isCritter(e) && boundsIntersect(entity.x, entity.y, entity.bounds, e.x, e.y, e.bounds)) {
					return e;
				}
			}
		}
	}

	return undefined;
}

export function findPlayerThatCanPickEntity(map: ServerMap, entity: ServerEntity) {
	const { x, y } = getRegionGlobal(map, entity.x, entity.y);
	const minX = Math.max(x - 1, 0);
	const minY = Math.max(y - 1, 0);
	const maxX = Math.min(x + 1, map.regionsX - 1);
	const maxY = Math.min(y + 1, map.regionsY - 1);

	for (let iy = minY; iy <= maxY; iy++) {
		for (let ix = minX; ix <= maxX; ix++) {
			const region = getRegion(map, ix, iy);

			for (const e of region.entities) {
				if (e.client !== undefined && entityInRange(entity, e)) {
					return e;
				}
			}
		}
	}

	return undefined;
}

export function findPlayersThetCanBeSitOn(map: ServerMap, entity: ServerEntity) {
	const { x, y } = getRegionGlobal(map, entity.x, entity.y);
	const minX = Math.max(x - 1, 0);
	const minY = Math.max(y - 1, 0);
	const maxX = Math.min(x + 1, map.regionsX - 1);
	const maxY = Math.min(y + 1, map.regionsY - 1);

	for (let iy = minY; iy <= maxY; iy++) {
		for (let ix = minX; ix <= maxX; ix++) {
			const region = getRegion(map, ix, iy);

			for (const e of region.entities) {
				if (e !== entity && e.client !== undefined && canBeSitOn(e, entity)) {
					return e;
				}
			}
		}
	}

	return undefined;
}

function canBeSitOn(entity: ServerEntity, by: ServerEntity) {
	const right = hasFlag(by.state, EntityState.FacingRight);
	const entityRight = hasFlag(entity.state, EntityState.FacingRight);

	if (right !== entityRight) {
		return false;
	}

	const x = by.x + (right ? -SIT_ON_BOUNDS_OFFSET : (SIT_ON_BOUNDS_OFFSET - SIT_ON_BOUNDS_WIDTH));
	const y = by.y - SIT_ON_BOUNDS_HEIGHT / 2;
	const w = SIT_ON_BOUNDS_WIDTH;
	const h = SIT_ON_BOUNDS_HEIGHT;
	return pointInXYWH(entity.x, entity.y, x, y, w, h);
}

export function canPlaceItem(map: ServerMap, entity: ServerEntity) {
	const tile = getTile(map, entity.x, entity.y);
	return canWalk(tile) && tile !== TileType.Water && tile !== TileType.Boat &&
		!findIntersectingEntityByBounds(map, entity);
}

export function canBePickedByPlayer(map: ServerMap, entity: ServerEntity) {
	return !!findPlayerThatCanPickEntity(map, entity);
}

export function fixPosition(entity: ServerEntity, map: ServerMap, x: number, y: number, safe: boolean) {
	entity.x = clamp(x, 0, map.width);
	entity.y = clamp(y, 0, map.height);
	updateEntity(entity, false);

	if (entity.client) {
		entity.client.fixPosition(entity.x, entity.y, safe);
		entity.client.fixingPosition = true;
	}
}
