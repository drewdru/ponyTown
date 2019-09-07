import { writeFileAsync, readFileAsync, writeFileSync } from 'fs';
import { fromByteArray } from 'base64-js';
import {
	TileType, MapInfo, MapState, defaultMapState, Rect, MapType, ServerFlags, EntityFlags, MapFlags, EntityState
} from '../common/interfaces';
import { getRegionGlobal, getTile, getRegion } from '../common/worldMap';
import { distanceSquaredXY, containsPoint, hasFlag } from '../common/utils';
import { POSITION_MAX } from '../common/movementUtils';
import { getEntityTypeName, getEntityType, createAnEntity } from '../common/entities';
import { deserializeTiles } from '../common/compress';
import { rect } from '../common/rect';
import { snapshotRegionTiles, setRegionTile, createServerRegion, getSizeOfRegion, cloneServerRegion } from './serverRegion';
import { ServerEntity, ServerRegion, ServerMap, MapUsage } from './serverInterfaces';
import { getTileColor } from '../common/colors';
import { World } from './world';
import { REGION_SIZE, REGION_HEIGHT, REGION_WIDTH, tileWidth, tileHeight } from '../common/constants';
import { pathTo } from './paths';
import { createCanvas } from './canvasUtilsNode';
import { mockPaletteManager } from '../common/ponyInfo';
import { setEntityName } from './entityUtils';
import { WallController } from './controllers/wallController';

export interface EntityData {
	type: string;
	x: number;
	y: number;
	options?: any;
	name?: string;
}

export interface MapData {
	width: number;
	height: number;
	tiles?: string;
	entities?: EntityData[];
	walls?: string;
}

export interface MapLoadOptions {
	offsetX?: number;
	offsetY?: number;
	loadOnlyTiles?: boolean;
	loadEntities?: boolean;
	loadEntitiesAsEditable?: boolean;
	loadWalls?: boolean;
}

export interface MapSaveOptions {
	saveTiles?: boolean;
	saveEntities?: boolean;
	saveOnlyEditableEntities?: boolean;
	saveWalls?: boolean;
}

export function createServerMap(
	id: string, type: MapType, regionsX: number, regionsY: number, defaultTile = TileType.None, usage = MapUsage.Public,
	initRegions = true
): ServerMap {
	const width = regionsX * REGION_SIZE;
	const height = regionsY * REGION_SIZE;
	const regions: ServerRegion[] = [];
	const state: MapState = { ...defaultMapState };
	const spawnArea = rect(0, 0, 1, 1);
	const lockedTiles = new Set<number>();

	if (regionsX <= 0 || regionsY <= 0 || width > POSITION_MAX || height > POSITION_MAX) {
		throw new Error('Invalid map parameters');
	}

	if (initRegions) {
		for (let ry = 0; ry < regionsY; ry++) {
			for (let rx = 0; rx < regionsX; rx++) {
				regions.push(createServerRegion(rx, ry, defaultTile));
			}
		}
	}

	return {
		id, usage, type, flags: MapFlags.None, width, height, state, regions, regionsX, regionsY, defaultTile, spawnArea,
		lockedTiles, spawns: new Map(), instance: undefined, lastUsed: Date.now(), controllers: [],
		dontUpdateTilesAndColliders: false, tilesLocked: false, editableEntityLimit: 0, editingLocked: false,
	};
}

export function serverMapInstanceFromTemplate(map: ServerMap): ServerMap {
	const {
		id, usage, type, flags, width, height, state, regionsX, regionsY, defaultTile, spawnArea, lockedTiles,
		editableEntityLimit
	} = map;

	return {
		id, usage, type, flags, width, height, state: { ...state },
		regions: map.regions.map(cloneServerRegion),
		regionsX, regionsY, defaultTile, spawnArea,
		lockedTiles, spawns: new Map(), instance: undefined, lastUsed: Date.now(), controllers: [],
		dontUpdateTilesAndColliders: true, tilesLocked: map.tilesLocked,
		editableEntityLimit, editingLocked: false,
	};
}

export function copyMapTiles(target: ServerMap, source: ServerMap) {
	for (let i = 0; i < target.regions.length; i++) {
		const srcRegion = source.regions[i];
		const tgtRegion = target.regions[i];
		tgtRegion.tiles.set(srcRegion.tiles);
		tgtRegion.tileIndices.set(srcRegion.tileIndices);
		tgtRegion.encodedTiles = srcRegion.encodedTiles;
		tgtRegion.colliderDirty = true;
	}
}

export function getMapInfo(map: ServerMap): MapInfo {
	return {
		type: map.type,
		flags: map.flags,
		regionsX: map.regionsX,
		regionsY: map.regionsY,
		defaultTile: map.defaultTile,
		editableArea: map.editableArea,
	};
}

export function getSizeOfMap(map: ServerMap) {
	const memory = map.regions.reduce((sum, r) => sum + getSizeOfRegion(r), 0);
	const entities = map.regions.reduce((sum, r) => sum + r.entities.length, 0);
	return { memory, entities };
}

export function setTile(map: ServerMap, x: number, y: number, type: TileType) {
	const region = getRegionGlobal(map, x, y);

	if (region) {
		const regionX = Math.floor(x) - region.x * REGION_SIZE;
		const regionY = Math.floor(y) - region.y * REGION_SIZE;
		setRegionTile(map, region, regionX, regionY, type);
	}
}

export function snapshotTiles(map: ServerMap) {
	for (const region of map.regions) {
		snapshotRegionTiles(region);
	}
}

export function lockTile(map: ServerMap, x: number, y: number) {
	const index = ((x | 0) + (y | 0) * map.width) | 0;
	map.lockedTiles.add(index);
}

export function lockTiles(map: ServerMap, x: number, y: number, w: number, h: number) {
	for (let iy = 0; iy < h; iy++) {
		for (let ix = 0; ix < w; ix++) {
			lockTile(map, x + ix, y + iy);
		}
	}
}

export function isTileLocked(map: ServerMap, x: number, y: number) {
	const index = ((x | 0) + (y | 0) * map.width) | 0;
	return map.lockedTiles.has(index);
}

export function serializeTiles(map: ServerMap) {
	const tilesData: number[] = [];
	const data: number[] = [];
	const { width, height } = map;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			tilesData.push(getTile(map, x, y));
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

export function serializeMap(map: ServerMap): MapData {
	const { width, height } = map;
	const tiles = fromByteArray(serializeTiles(map));
	return { width, height, tiles };
}

export function deserializeMap(map: ServerMap, { tiles, width }: MapData, { offsetX = 0, offsetY = 0 }: MapLoadOptions = {}) {
	const decodedTiles = deserializeTiles(tiles!);

	for (let i = 0; i < decodedTiles.length; i++) {
		const x = i % width;
		const y = Math.floor(i / width);
		setTile(map, x + offsetX, y + offsetY, decodedTiles[i]);
	}
}

export function saveMap(map: ServerMap, saveOptions: MapSaveOptions): MapData {
	const data: MapData = { width: map.width, height: map.height };

	if (saveOptions.saveTiles) {
		data.tiles = serializeMap(map).tiles;
	}

	if (saveOptions.saveEntities) {
		data.entities = [];

		for (const region of map.regions) {
			for (const entity of region.entities) {
				if (!hasFlag(entity.serverFlags, ServerFlags.DoNotSave) && !hasFlag(entity.flags, EntityFlags.Debug)) {
					if (saveOptions.saveOnlyEditableEntities && !hasFlag(entity.state, EntityState.Editable))
						continue;

					const options = entity.options && Object.keys(entity.options).length > 0 ? entity.options : undefined;
					const name = entity.name;
					data.entities.push({ type: getEntityTypeName(entity.type), x: entity.x, y: entity.y, options, name });
				}
			}
		}
	}

	if (saveOptions.saveWalls) {
		const controller = map.controllers.find(c => c.toggleWall) as WallController | undefined;

		if (controller) {
			data.walls = controller.serialize();
		}
	}

	return data;
}

export async function saveMapToFile(map: ServerMap, fileName: string, options: MapSaveOptions) {
	const data = saveMap(map, options);
	const json = JSON.stringify(data, null, 2);
	await writeFileAsync(fileName, json, 'utf8');
}

export async function saveMapToFileBinary(map: ServerMap, fileName: string) {
	const tiles = serializeTiles(map);
	const buffer = new Uint8Array(4 + 4 + tiles.byteLength);
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	view.setInt32(0, map.width, true);
	view.setInt32(4, map.height, true);
	buffer.set(tiles, 8);
	await writeFileAsync(fileName, Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength));
}

export async function saveMapToFileBinaryAlt(map: ServerMap, fileName: string) {
	const buffer = Buffer.alloc(4 + 4 + map.width * map.height);
	buffer.writeUInt32LE(map.width, 0);
	buffer.writeUInt32LE(map.height, 4);

	for (let y = 0, i = 8; y < map.height; y++) {
		for (let x = 0; x < map.width; x++ , i++) {
			buffer.writeUInt8(getTile(map, x, y), i);
		}
	}

	await writeFileAsync(fileName, buffer);
}

export async function saveEntitiesToFile(map: ServerMap, fileName: string) {
	const lines: string[] = [];

	for (const region of map.regions) {
		for (const entity of region.entities) {
			lines.push(`${getEntityTypeName(entity.type)} ${entity.x} ${entity.y}`);
		}
	}

	await writeFileAsync(fileName, lines.join('\n'), 'utf8');
}

export function loadMap(world: World, map: ServerMap, data: MapData, loadOptions: MapLoadOptions) {
	if (data.tiles) {
		deserializeMap(map, data, loadOptions);
	}

	if (loadOptions.loadOnlyTiles)
		return;

	if (loadOptions.loadEntitiesAsEditable) {
		const entitiesToRemove: ServerEntity[] = [];

		for (const region of map.regions) {
			for (const entity of region.entities) {
				if (hasFlag(entity.state, EntityState.Editable)) {
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
			const typeNumber = getEntityType(type);
			const entity = createAnEntity(typeNumber, 0, x, y, options, mockPaletteManager, world);

			if (name) {
				setEntityName(entity, name);
			}

			if (loadOptions.loadEntitiesAsEditable) {
				entity.state |= EntityState.Editable;
			}

			world.addEntity(entity, map);
		}
	}

	if (loadOptions.loadWalls && data.walls) {
		const controller = map.controllers.find(c => c.toggleWall) as WallController | undefined;

		if (controller) {
			controller.deserialize(data.width, data.height, data.walls);
		}
	}
}

export async function loadMapFromFile(world: World, map: ServerMap, fileName: string, options: MapLoadOptions) {
	const json = await readFileAsync(fileName, 'utf8');
	const data = JSON.parse(json);
	loadMap(world, map, data, options);
}

export function saveRegionCollider(region: ServerRegion) {
	const canvas = createCanvas(REGION_WIDTH, REGION_HEIGHT);
	const context = canvas.getContext('2d')!;
	context.fillStyle = 'white';
	context.fillRect(0, 0, canvas.width, canvas.height);

	context.fillStyle = '#eee';

	for (let y = 0, i = 0; y < REGION_SIZE; y++ , i++) {
		for (let x = 0; x < REGION_SIZE; x++ , i++) {
			if ((i % 2) === 0) {
				context.fillRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
			}
		}
	}

	context.globalAlpha = 0.8;
	context.fillStyle = 'red';

	for (let y = 0; y < REGION_HEIGHT; y++) {
		for (let x = 0; x < REGION_WIDTH; x++) {
			if (region.collider[x + y * REGION_WIDTH]) {
				context.fillRect(x, y, 1, 1);
			}
		}
	}

	writeFileSync(pathTo('store', 'collider.png'), canvas.toBuffer());
}

function distanceSquaredToRegion(x: number, y: number, region: ServerRegion) {
	const left = region.x * REGION_SIZE;
	const top = region.y * REGION_SIZE;
	const right = left + REGION_SIZE;
	const bottom = top + REGION_SIZE;
	const dx = x < left ? (left - x) : (x > right ? (x - right) : 0);
	const dy = y < left ? (top - y) : (y > bottom ? (y - bottom) : 0);
	return dx * dx + dy * dy;
}

export function findClosestEntity(
	map: ServerMap, originX: number, originY: number, predicate: (entity: ServerEntity) => boolean
): ServerEntity | undefined {
	let minX = Math.floor(originX / REGION_SIZE);
	let minY = Math.floor(originY / REGION_SIZE);
	let maxX = minX;
	let maxY = minY;

	let closest: ServerEntity | undefined = undefined;
	let closestDist = Number.MAX_VALUE;

	while (minX >= 0 || minY >= 0 || maxX < map.regionsX || maxY < map.regionsY) {
		let regionsChecked = 0;

		for (let y = minY; y <= maxY; y++) {
			for (let x = minX; x <= maxX; x = (x === maxX || y === minY || y === maxY) ? x + 1 : maxX) {
				if (x >= 0 && y >= 0 && x < map.regionsX && y < map.regionsY) {
					const region = getRegion(map, x, y);

					if (distanceSquaredToRegion(originX, originY, region) < closestDist) {
						regionsChecked++;

						for (const entity of region.entities) {
							if (predicate(entity)) {
								const dist = distanceSquaredXY(originX, originY, entity.x, entity.y);

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

export function findEntities(map: ServerMap, predicate: (entity: ServerEntity) => boolean): ServerEntity[] {
	const entities: ServerEntity[] = [];

	for (const region of map.regions) {
		for (const entity of region.entities) {
			if (predicate(entity)) {
				entities.push(entity);
			}
		}
	}

	return entities;
}

// TODO: maybe only regions in bounds, instead of adding 1 region border ?
function forEachRegionInBounds(map: ServerMap, bounds: Rect, callback: (region: ServerRegion) => void) {
	const minX = Math.max(0, Math.floor(bounds.x / REGION_SIZE) - 1) | 0;
	const minY = Math.max(0, Math.floor(bounds.y / REGION_SIZE) - 1) | 0;
	const maxX = Math.min(Math.floor((bounds.x + bounds.w) / REGION_SIZE) + 1, map.regionsX - 1) | 0;
	const maxY = Math.min(Math.floor((bounds.y + bounds.h) / REGION_SIZE) + 1, map.regionsY - 1) | 0;

	for (let ry = minY; ry <= maxY; ry++) {
		for (let rx = minX; rx <= maxX; rx++) {
			const region = getRegion(map, rx, ry);
			callback(region);
		}
	}
}

export function findEntitiesInBounds(map: ServerMap, bounds: Rect) {
	const result: ServerEntity[] = [];

	forEachRegionInBounds(map, bounds, region => {
		for (const entity of region.entities) {
			if (containsPoint(0, 0, bounds, entity.x, entity.y)) {
				result.push(entity);
			}
		}
	});

	return result;
}

export function updateMapState(map: ServerMap, update: Partial<MapState>) {
	Object.assign(map.state, update);

	for (const region of map.regions) {
		for (const client of region.clients) {
			client.mapUpdate(map.state);
		}
	}
}

export function hasAnyClients(map: ServerMap) {
	for (const region of map.regions) {
		if (region.clients.length > 0) {
			return true;
		}
	}

	return false;
}

export function createMinimap(world: World, map: ServerMap) {
	const { width, height } = map;
	const buffer = new Uint32Array(width * height);

	for (let y = 0; y < map.height; y++) {
		for (let x = 0; x < map.width; x++) {
			const tile = getTile(map, x, y);
			buffer[x + y * width] = getTileColor(tile, world.season);
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
