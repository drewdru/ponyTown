import { random } from 'lodash';
import { ServerEntity, ServerRegion, EntityUpdateBase, ServerMap } from './serverInterfaces';
import { TileType, EntityFlags, UpdateFlags, canWalk } from '../common/interfaces';
import { compressTiles } from '../common/compress';
import { rect, withBorder, withPadding } from '../common/rect';
import {
	REGION_BORDER, tileHeight, tileWidth, REGION_SIZE, TILES_RESTORE_MIN_SEC, TILES_RESTORE_MAX_SEC
} from '../common/constants';
import { rectToScreen } from '../common/positionUtils';
import { removeItem, hasFlag } from '../common/utils';
import { canCollideWith } from '../common/collision';
import { invalidateRegionsCollider, getRegionTile } from '../common/region';
import { setColliderDirty, setTilesDirty } from '../common/worldMap';

const subscribeBoundsBottomPad = 3;

const randoms = new Uint8Array(REGION_SIZE * REGION_SIZE);

export function createServerRegion(x: number, y: number, defaultTile = TileType.Dirt): ServerRegion {
	const bounds = rect(x * REGION_SIZE, y * REGION_SIZE, REGION_SIZE, REGION_SIZE);
	const tiles = new Uint8Array(REGION_SIZE * REGION_SIZE);
	const tileIndices = new Int16Array(REGION_SIZE * REGION_SIZE);
	const collider = new Uint8Array(REGION_SIZE * REGION_SIZE * tileWidth * tileHeight);

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
		boundsWithBorder: withBorder(bounds, REGION_BORDER),
		subscribeBounds: rectToScreen(withPadding(
			bounds, REGION_SIZE, REGION_SIZE, REGION_SIZE + subscribeBoundsBottomPad, REGION_SIZE)),
		unsubscribeBounds: rectToScreen(withPadding(
			bounds, REGION_SIZE + 1, REGION_SIZE + 1, REGION_SIZE + subscribeBoundsBottomPad + 1, REGION_SIZE + 1)),
	};
}

export function cloneServerRegion(region: ServerRegion): ServerRegion {
	const tiles = new Uint8Array(REGION_SIZE * REGION_SIZE);
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

export function getSizeOfRegion(region: ServerRegion) {
	let size = region.tiles.byteLength;
	size += region.tileIndices.byteLength;
	size += region.tilesSnapshot ? region.tilesSnapshot.byteLength : 0;
	size += region.tilesTimeouts ? region.tilesTimeouts.byteLength : 0;
	size += region.encodedTiles ? region.encodedTiles.byteLength : 0;
	size += region.collider ? region.collider.byteLength : 0;
	return size;
}

export function addEntityToRegion(region: ServerRegion, entity: ServerEntity, map: ServerMap) {
	region.entities.push(entity);

	if (canCollideWith(entity)) {
		region.colliders.push(entity);
		invalidateRegionsCollider(region, map);
	}

	if (hasFlag(entity.flags, EntityFlags.Movable)) {
		region.movables.push(entity);
	}
}

export function removeEntityFromRegion(region: ServerRegion, entity: ServerEntity, map: ServerMap) {
	const removed = removeItem(region.entities, entity);

	if (canCollideWith(entity)) {
		removeItem(region.colliders, entity);
		invalidateRegionsCollider(region, map);
	}

	removeItem(region.movables, entity);
	return removed;
}

export function pushUpdateEntityToRegion(region: ServerRegion, update: EntityUpdateBase) {
	const index = findUpdate(region, update.entity);

	if (index === -1) {
		region.entityUpdates.push({ x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: undefined, ...update });
	} else {
		region.reusedUpdates++;
		const existing = region.entityUpdates[index];
		existing.flags |= update.flags;

		if (hasFlag(update.flags, UpdateFlags.Position)) {
			const { x = 0, y = 0, vx = 0, vy = 0 } = update;
			existing.x = x;
			existing.y = y;
			existing.vx = vx;
			existing.vy = vy;
		}

		if (hasFlag(update.flags, UpdateFlags.Options)) {
			existing.options = { ...existing.options, ...update.options };
		}

		if (hasFlag(update.flags, UpdateFlags.PlayerState)) {
			existing.playerState = update.playerState!;
		}

		if (hasFlag(update.flags, UpdateFlags.Action)) {
			existing.action = update.action!;
		}
	}
}

export function pushRemoveEntityToRegion(region: ServerRegion, entity: ServerEntity) {
	region.entityRemoves.push(entity.id);
}

export function setRegionTile(map: ServerMap, region: ServerRegion, x: number, y: number, type: TileType, skipRestore = false) {
	const old = getRegionTile(region, x, y);

	if (type === old)
		return;

	const index = x | (y << 3);
	region.tiles[index] = type;
	region.tileUpdates.push({ x, y, type: type });
	region.encodedTiles = undefined;

	if (region.tilesTimeouts && !skipRestore) {
		region.tilesTimeouts[index] = random(TILES_RESTORE_MIN_SEC, TILES_RESTORE_MAX_SEC);
	}

	if (canWalk(old) !== canWalk(type)) {
		setTilesDirty(map, region.x * REGION_SIZE + x - 1, region.y * REGION_SIZE + y - 1, 3, 3);
		setColliderDirty(map, region, x, y);
	}
}

export function resetRegionUpdates(region: ServerRegion) {
	region.entityUpdates.length = 0;
	region.entityRemoves.length = 0;
	region.tileUpdates.length = 0;
	region.reusedUpdates = 0;
}

export function snapshotRegionTiles(region: ServerRegion) {
	region.tilesSnapshot = region.tiles.slice();
	region.tilesTimeouts = new Uint8Array(region.tiles.length);
}

export function getRegionTiles(region: ServerRegion) {
	if (region.encodedTiles === undefined) {
		region.encodedTiles = compressTiles(region.tiles);
	}

	return region.encodedTiles;
}

export function resetTiles(map: ServerMap, region: ServerRegion) {
	if (region.tilesSnapshot && region.tilesTimeouts) {
		for (let i = 0; i < region.tilesTimeouts.length; i++) {
			region.tilesTimeouts[i] = 0;

			if (region.tiles[i] !== region.tilesSnapshot[i]) {
				const x = i % REGION_SIZE;
				const y = Math.floor(i / REGION_SIZE);
				setRegionTile(map, region, x, y, region.tilesSnapshot[i], true);
			}
		}
	}
}

export function tickTilesRestoration(map: ServerMap, region: ServerRegion) {
	if (region.tilesSnapshot && region.tilesTimeouts) {
		for (let i = 0; i < region.tilesTimeouts.length; i++) {
			if (region.tilesTimeouts[i] > 0) {
				region.tilesTimeouts[i]--;

				if (region.tilesTimeouts[i] === 0 && region.tiles[i] !== region.tilesSnapshot[i]) {
					const x = i % REGION_SIZE;
					const y = Math.floor(i / REGION_SIZE);
					setRegionTile(map, region, x, y, region.tilesSnapshot[i], true);
				}
			}
		}
	}
}

function findUpdate({ entityUpdates }: ServerRegion, entity: ServerEntity) {
	for (let i = 0; i < entityUpdates.length; i++) {
		if (entityUpdates[i].entity === entity) {
			return i;
		}
	}

	return -1;
}
