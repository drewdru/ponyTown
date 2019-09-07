import {
	Entity, Point, TileType, Rect, MapInfo, Camera, Region, IMap, MapState, defaultMapState, Pony,
	MapType, EntityFlags, WorldMap, Weather, EntityState, canWalk, MapFlags,
} from './interfaces';
import { contains, removeItem, boundsIntersect, array, pushUniq, containsPoint, removeItemFast } from './utils';
import { isBoundsVisible, } from './camera';
import {
	getRegionTile, setRegionTile, setRegionTileDirty, getRegionElevation, setRegionElevation,
	getRegionTileIndex, worldToRegionX, worldToRegionY, generateRegionCollider, invalidateRegionsCollider
} from './region';
import { weatherRain, splash } from './entities';
import { releaseEntity, isMoving, isHidden, isDrawable, isPonyFlying } from './entityUtils';
import { updatePonyEntity, invalidatePalettesForPony, ensurePonyInfoDecoded, isPony, isPonyOnTheGround } from './pony';
import { getTileHeight, updateTileIndices, isInWater } from '../client/tileUtils';
import { toScreenX, toScreenY, toScreenYWithZ, rectToScreen, toWorldZ } from './positionUtils';
import { hasDrawLight, hasLightSprite } from '../client/draw';
import { PonyTownGame } from '../client/game';
import { WATER_FPS, PONY_TYPE, REGION_SIZE } from './constants';
import { updatePosition, canCollideWith } from './collision';
import { PaletteManager } from '../graphics/paletteManager';
import { timeEnd, timeStart } from '../client/timing';
import { playEffect } from '../client/handlers';
import { isFlyingDown } from '../client/ponyStates';

const defaultMapInfo: MapInfo = {
	type: MapType.None,
	flags: MapFlags.None,
	regionsX: 0,
	regionsY: 0,
	defaultTile: TileType.None,
};

export function createWorldMap(info = defaultMapInfo, state: MapState = { ...defaultMapState }): WorldMap {
	const { type, flags, regionsX, regionsY, defaultTile, editableArea } = info;
	const map: WorldMap = {
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
		entitiesById: new Map<number, Entity>(),
		poniesToDecode: [],
		regionsX,
		regionsY,
		regions: array(regionsX * regionsY, undefined),
		defaultTile,
		width: regionsX * REGION_SIZE,
		height: regionsY * REGION_SIZE,
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

function pickAny(entity: Entity, point: Point): boolean {
	const bounds = entity.interactBounds || entity.bounds;
	return !!bounds && contains(entity.x, entity.y, bounds, point);
}

export function getAnyBounds(entity: Entity) {
	return [
		entity.interactBounds,
		entity.bounds,
		entity.lightBounds,
		entity.lightSpriteBounds,
		entity.collidersBounds,
		entity.triggerBounds && rectToScreen(entity.triggerBounds),
	].filter(x => x && x.w > 0 && x.h > 0)[0];
}

function pickAnyEvenLights(entity: Entity, point: Point): boolean {
	const bounds = getAnyBounds(entity);
	return !!bounds && contains(entity.x, entity.y, bounds, point);
}

function pick(entity: Entity, point: Point, pickHidden: boolean, pickEditable: boolean): boolean {
	const editableOrInteractive = pickEditable ?
		(entity.type !== PONY_TYPE && ((entity.state & EntityState.Editable) !== 0)) :
		((entity.flags & EntityFlags.Interactive) !== 0);

	return editableOrInteractive && (!isHidden(entity) || pickHidden) && pickAny(entity, point);
}

function pickEntity(
	entity: Entity, point: Point, ignorePonies: boolean, pickHidden: boolean, pickEditable: boolean
): boolean {
	return (!ignorePonies || entity.type !== PONY_TYPE) && pick(entity, point, pickHidden, pickEditable);
}

function pickByBounds(entity: Entity, rect: Rect, pickHidden: boolean): boolean {
	if ((entity.flags & EntityFlags.Interactive) === 0 || (isHidden(entity) && !pickHidden)) {
		return false;
	} else {
		const bounds = entity.interactBounds || entity.bounds;
		return !!bounds && boundsIntersect(entity.x, entity.y, bounds, 0, 0, rect);
	}
}

function pickEntityByBounds(entity: Entity, rect: Rect, ignorePonies: boolean, pickHidden: boolean): boolean {
	return (!ignorePonies || entity.type !== PONY_TYPE) && pickByBounds(entity, rect, pickHidden);
}

export function pickAnyEntities(map: WorldMap, point: Point) {
	return map.entities.filter(e => pickAnyEvenLights(e, point)).reverse();
}

export function pickEntities(map: WorldMap, point: Point, ignorePonies: boolean, pickHidden: boolean, pickEditable = false) {
	return map.entities.filter(e => pickEntity(e, point, ignorePonies, pickHidden, pickEditable)).reverse();
}

export function pickEntitiesByRect(map: WorldMap, rect: Rect, ignorePonies: boolean, pickHidden: boolean) {
	return map.entities.filter(e => pickEntityByBounds(e, rect, ignorePonies, pickHidden)).reverse();
}

export function removeRegions(map: WorldMap, coords: number[]) {
	if (coords.length === 0)
		return;

	const entitiesToRemove = new Set<Entity>();

	for (let i = 0; i < coords.length; i += 2) {
		const x = coords[i];
		const y = coords[i + 1];
		const index = x + y * map.regionsX;
		const region = map.regions[index];

		if (region) {
			for (const entity of region.entities) {
				entitiesToRemove.add(entity);
				releaseEntity(entity);
				map.entitiesById.delete(entity.id);
			}
		}

		map.regions[index] = undefined;
		setTilesDirty(map, x * REGION_SIZE - 1, y * REGION_SIZE - 1, REGION_SIZE + 2, REGION_SIZE + 2);
	}

	removeEntitiesFromEntities(map, entitiesToRemove);
	updateMinMaxRegion(map);
}

export function setRegion(map: WorldMap, x: number, y: number, region: Region) {
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
		setTilesDirty(map, x * REGION_SIZE - 1, y * REGION_SIZE - 1, REGION_SIZE + 2, REGION_SIZE + 2);
		map.regions[index] = region;
		updateMinMaxRegion(map);
	} else {
		DEVELOPMENT && !TESTS && console.error(`Invalid region coords (${x}, ${y})`);
	}
}

export function findEntityById(map: WorldMap, id: number) {
	return map.entitiesById.get(id);
}

export function addEntity(map: WorldMap, entity: Entity) {
	const region = getRegionGlobal(map, entity.x, entity.y);

	if (!region) {
		throw new Error(`Missing region at ${entity.x} ${entity.y}`);
	} else {
		addEntityToMapRegion(map, region, entity);
	}
}

export function removeEntity(map: WorldMap, entity: Entity) {
	removeEntityFromMapRegion(map, entity);
	releaseAndRemoveEntityFromMap(map, entity);
}

function releaseAndRemoveEntityFromMap(map: WorldMap, entity: Entity) {
	releaseEntity(entity);
	removeEntityFromEntities(map, entity);
}

export function removeEntityDirectly(map: WorldMap, entity: Entity) {
	forEachRegion(map, region => {
		const removed = removeEntityFromRegion(region, entity, map);

		if (removed) {
			releaseEntity(entity);
			removeEntityFromEntities(map, entity);
			return false;
		} else {
			return true;
		}
	});
}

export function setTile(map: WorldMap, worldX: number, worldY: number, type: TileType) {
	const region = getRegionGlobal(map, worldX, worldY);

	if (!region)
		return;

	const x = Math.floor(worldX - region.x * REGION_SIZE);
	const y = Math.floor(worldY - region.y * REGION_SIZE);

	const old = getRegionTile(region, x, y);
	setRegionTile(region, x, y, type);

	setTilesDirty(map, worldX - 1, worldY - 1, 3, 3);

	if (canWalk(old) !== canWalk(type)) {
		setColliderDirty(map, region, x, y);
	}
}

export function setColliderDirty(map: IMap<Region | undefined>, region: Region, x: number, y: number) {
	region.colliderDirty = true;

	if (x === 0) {
		const r = getRegionUnsafe(map, region.x - 1, region.y);
		r && (r.colliderDirty = true);
	} else if (x === (REGION_SIZE - 1)) {
		const r = getRegionUnsafe(map, region.x + 1, region.y);
		r && (r.colliderDirty = true);
	}

	if (y === 0) {
		const r = getRegionUnsafe(map, region.x, region.y - 1);
		r && (r.colliderDirty = true);
	} else if (y === (REGION_SIZE - 1)) {
		const r = getRegionUnsafe(map, region.x, region.y + 1);
		r && (r.colliderDirty = true);
	}
}

export function setTileAtRegion(map: WorldMap, regionX: number, regionY: number, x: number, y: number, type: TileType) {
	setTile(map, regionX * REGION_SIZE + x, regionY * REGION_SIZE + y, type);
}

export function setTilesDirty(map: IMap<Region | undefined>, ox: number, oy: number, w: number, h: number) {
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			doRelativeToRegion(map, x + ox, y + oy, (region, x, y) => setRegionTileDirty(region, x, y));
		}
	}
}

function getTileIndex(map: IMap<Region | undefined>, x: number, y: number) {
	const region = getRegionGlobal(map, x, y);
	return region ? getRegionTileIndex(region, x - region.x * REGION_SIZE, y - region.y * REGION_SIZE) : 0;
}

export function getElevation(map: WorldMap, x: number, y: number) {
	const region = getRegionGlobal(map, x, y);
	return region ? getRegionElevation(region, x - region.x * REGION_SIZE, y - region.y * REGION_SIZE) : 0;
}

export function setElevation(map: WorldMap, x: number, y: number, value: number) {
	doRelativeToRegion(map, x, y, (region, x, y) => setRegionElevation(region, x, y, value));
}

export function forEachRegion(map: WorldMap, callback: (region: Region) => boolean | void) {
	for (let y = map.minRegionY; y <= map.maxRegionY; y++) {
		for (let x = map.minRegionX; x <= map.maxRegionX; x++) {
			const region = getRegion(map, x, y);

			if (region && callback(region) === false) {
				return;
			}
		}
	}
}

function updateMinMaxRegion(map: WorldMap) {
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

function doRelativeToRegion(
	map: IMap<Region | undefined>, x: number, y: number, action: (region: Region, x: number, y: number) => void
) {
	const region = getRegionGlobal(map, x, y);

	if (region) {
		const regionX = Math.floor(x - region.x * REGION_SIZE);
		const regionY = Math.floor(y - region.y * REGION_SIZE);
		action(region, regionX, regionY);
	}
}

function addEntityToRegion(region: Region, entity: Entity, map: WorldMap) {
	region.entities.push(entity);

	if (canCollideWith(entity)) {
		region.colliders.push(entity);
		invalidateRegionsCollider(region, map);
	}
}

function removeEntityFromRegion(region: Region, entity: Entity, map: WorldMap) {
	const removed = removeItemFast(region.entities, entity);

	if (removed && canCollideWith(entity)) {
		removeItemFast(region.colliders, entity);
		invalidateRegionsCollider(region, map);
	}

	return removed;
}

export function addEntityToMapRegion(map: WorldMap, region: Region, entity: Entity) {
	if (entity.id !== 0) {
		const existing = map.entitiesById.get(entity.id);

		if (existing) {
			DEVELOPMENT && !TESTS && console.error(`Adding duplicate entity ${entity.id} (` +
				`${worldToRegionX(existing.x, map)}, ${worldToRegionY(existing.y, map)} => ` +
				`${worldToRegionX(entity.x, map)}, ${worldToRegionY(entity.y, map)})`);

			removeEntity(map, existing);
		}

		map.entitiesById.set(entity.id, entity);
	}

	if (isPony(entity) && entity.palettePonyInfo === undefined) {
		map.poniesToDecode.push(entity);
	}

	addEntityToRegion(region, entity, map);

	map.entities.push(entity);

	if (isDrawable(entity)) {
		map.entitiesDrawable.push(entity);
	}

	if (isMoving(entity)) {
		map.entitiesMoving.push(entity);
	}

	if (hasDrawLight(entity)) {
		pushUniq(map.entitiesLight, entity);
	}

	if (hasLightSprite(entity)) {
		pushUniq(map.entitiesLightSprite, entity);
	}

	if (entity.triggerBounds !== undefined) {
		pushUniq(map.entitiesTriggers, entity);
	}
}

function removeEntityFromEntities(map: WorldMap, entity: Entity) {
	map.entitiesById.delete(entity.id);
	removeItemFast(map.entities, entity);
	removeItem(map.entitiesWithChat, entity);
	removeItem(map.entitiesWithNames, entity);

	if (isDrawable(entity)) {
		removeItem(map.entitiesDrawable, entity);
	}

	if (isMoving(entity)) {
		removeItemFast(map.entitiesMoving, entity);
	}

	if (isPony(entity)) {
		removeItemFast(map.poniesToDecode, entity);
	}

	if (hasDrawLight(entity)) {
		removeItemFast(map.entitiesLight, entity);
	}

	if (hasLightSprite(entity)) {
		removeItemFast(map.entitiesLightSprite, entity);
	}

	if (entity.triggerBounds !== undefined) {
		removeItemFast(map.entitiesTriggers, entity);
	}
}

function removeEntitiesFromEntities(map: WorldMap, set: Set<Entity>) {
	if (set.size > 0) {
		const filter = (entity: Entity) => !set.has(entity);
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

function removeEntityFromMapRegion(map: WorldMap, entity: Entity) {
	forEachRegion(map, region => !removeEntityFromRegion(region, entity, map));
}

export function getTile<T>(map: IMap<T>, x: number, y: number): TileType {
	const region = getRegionGlobal(map, x, y) as any as Region;

	if (region) {
		const regionX = Math.floor(x - region.x * REGION_SIZE);
		const regionY = Math.floor(y - region.y * REGION_SIZE);
		return getRegionTile(region, regionX, regionY);
	} else {
		return TileType.None;
	}
}

export function getRegionGlobal<T>(map: IMap<T>, x: number, y: number): T {
	const rx = worldToRegionX(x, map);
	const ry = worldToRegionY(y, map);
	return getRegion(map, rx, ry);
}

export function getRegion<T>(map: IMap<T>, x: number, y: number): T {
	if (x < 0 || y < 0 || x >= map.regionsX || y >= map.regionsY) {
		throw new Error(`Invalid region coords (${x}, ${y})`);
	} else {
		return map.regions[((x | 0) + (y | 0) * map.regionsX) | 0];
	}
}

export function getRegionUnsafe<T>(map: IMap<T>, x: number, y: number): T | undefined {
	if (x < 0 || y < 0 || x >= map.regionsX || y >= map.regionsY) {
		return undefined;
	} else {
		return map.regions[((x | 0) + (y | 0) * map.regionsX) | 0];
	}
}

export function addOrRemoveFromEntityList(list: Entity[], entity: Entity, had: boolean, has: boolean) {
	if (had !== has) {
		if (has) {
			pushUniq(list, entity);
		} else {
			removeItemFast(list, entity);
		}
	}
}

export function updateEntitiesWithNames(map: WorldMap, hover: Point, player: Entity) {
	for (let i = map.entitiesWithNames.length - 1; i >= 0; i--) {
		const entity = map.entitiesWithNames[i];

		if (!pickAny(entity, hover)) {
			map.entitiesWithNames.splice(i, 1);
		}
	}

	const regionX = worldToRegionX(hover.x, map);
	const regionY = worldToRegionY(hover.y, map);

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
						pushUniq(map.entitiesWithNames, e);
					}
				}
			}
		}
	}
}

export function updateEntitiesCoverLifted(map: WorldMap, player: Entity, hideObjects: boolean, delta: number) {
	const playerX = toScreenX(player.x);
	const playerY = toScreenYWithZ(player.y, player.z);

	for (const e of map.entitiesDrawable) {
		if (e.coverBounds !== undefined) {
			e.coverLifted = hideObjects || containsPoint(toScreenX(e.x), toScreenY(e.y), e.coverBounds, playerX, playerY);

			const lifting = e.coverLifting || 0;

			if (e.coverLifted && lifting < 1) {
				e.coverLifting = Math.min(lifting + delta * 2, 1);
			} else if (!e.coverLifted && lifting > 0) {
				e.coverLifting = Math.max(lifting - delta * 2, 0);
			}
		}
	}
}

export function updateEntitiesTriggers(map: WorldMap, player: Pony, game: PonyTownGame) {
	for (const e of map.entitiesTriggers) {
		const on = (e.triggerTall || isPonyOnTheGround(player)) &&
			containsPoint(e.x, e.y, e.triggerBounds!, player.x, player.y);

		if (e.triggerOn !== on) {
			if (on) {
				game.send(server => server.interact(e.id));
			}

			e.triggerOn = on;
		}
	}
}

export function updateMap(map: WorldMap, delta: number) {
	map.tileTime += delta * WATER_FPS;

	forEachRegion(map, region => {
		if (region.tilesDirty) {
			updateTileIndices(region, map);
		}

		if (region.colliderDirty) {
			generateRegionCollider(region, map);
		}
	});
}

export function getMapHeightAt(map: WorldMap, x: number, y: number, gameTime: number) {
	return getTileHeight(getTile(map, x, y), getTileIndex(map, x, y), x, y, gameTime, map.type);
}

export function isInWaterAt(map: IMap<Region | undefined>, x: number, y: number) {
	return getTile(map, x, y) === TileType.Water && isInWater(getTileIndex(map, x, y), x, y);
}

export function updateEntities(game: PonyTownGame, gameTime: number, delta: number, safe: boolean) {
	TIMING && timeStart('updateEntities');

	const map = game.map;

	for (const entity of map.entitiesMoving) {
		updatePosition(entity, delta, map);
	}

	for (const entity of map.entities) {
		const flags = entity.flags;

		if ((flags & EntityFlags.Bobbing) !== 0) {
			const bobs = entity.bobs!;
			const frame = (((gameTime / 1000) * entity.bobsFps!) | 0) % bobs.length;
			entity.z = toWorldZ(bobs[frame]);
		} else if ((flags & EntityFlags.StaticY) === 0) {
			entity.z = getMapHeightAt(map, entity.x, entity.y, gameTime);
		}

		if (entity.type === PONY_TYPE) {
			const pony = entity as Pony;
			updatePonyEntity(pony, delta, gameTime, safe);

			const wasSwimming = pony.swimming;
			pony.swimming = !isPonyFlying(pony) && isInWaterAt(map, pony.x, pony.y);

			if (wasSwimming !== pony.swimming) {
				if (isFlyingDown(pony.animator.state)) {
					setTimeout(() => playEffect(game, pony, splash.type), 400);
				} else {
					playEffect(game, pony, splash.type);
				}
			}
		} else if (entity.update !== undefined) {
			entity.update(delta, gameTime);
		}

		if ((flags & EntityFlags.OnOff) !== 0) {
			const on = (entity.state & EntityState.On) !== 0;

			if (entity.lightOn !== undefined) {
				entity.lightOn = on;
			}

			if (entity.lightSpriteOn !== undefined) {
				entity.lightSpriteOn = on;
			}
		}

		if ((flags & EntityFlags.Light) !== 0) {
			if (entity.lightOn) {
				const move = delta * 0.2;

				if (Math.abs(entity.lightScale! - entity.lightTarget!) < move) {
					entity.lightScale = entity.lightTarget;
					entity.lightTarget = 1 - Math.random() * 0.15;
				} else {
					entity.lightScale! += entity.lightScale! < entity.lightTarget! ? move : -move;
				}
			}
		}
	}

	for (let i = map.entitiesWithChat.length - 1; i >= 0; i--) {
		const entity = map.entitiesWithChat[i];
		const says = entity.says!;

		if (says.timer) {
			says.timer -= delta;

			if (says.timer < 0) {
				says.timer = 0;
				entity.says = undefined;
				map.entitiesWithChat.splice(i, 1);
			}
		}
	}

	TIMING && timeEnd();
}

export function invalidatePalettes(entities: Entity[]) {
	for (const entity of entities) {
		if (isPony(entity)) {
			invalidatePalettesForPony(entity);
		}
	}
}

export function ensureAllVisiblePoniesAreDecoded(map: WorldMap, camera: Camera, paletteManager: PaletteManager) {
	const poniesToDecode = map.poniesToDecode;

	if (!poniesToDecode.length)
		return;

	const decode = new Set<number>();

	for (let i = 0; i < poniesToDecode.length; i++) {
		const pony = poniesToDecode[i];

		if (isBoundsVisible(camera, pony.bounds, pony.x, pony.y)) {
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
		} else if (decode.has(i)) {
			ensurePonyInfoDecoded(pony);
			return false;
		} else {
			return true;
		}
	});

	if (decode.size > 100) {
		paletteManager.deduplicate = true;
	}
}

export function switchEntityRegion(map: WorldMap, entity: Entity, x: number, y: number) {
	removeEntityFromMapRegion(map, entity);

	const region = getRegionGlobal(map, x, y);

	if (region) {
		addEntityToRegion(region, entity, map);
	} else {
		releaseAndRemoveEntityFromMap(map, entity);
	}
}

export function updateMapState(map: WorldMap, prevState: MapState, newState: MapState) {
	if (prevState.weather !== newState.weather) {
		switch (newState.weather) {
			case Weather.None:
				removeWeatherEffects(map);
				break;
			case Weather.Rain:
				addRainEffects(map);
				break;
		}
	}
}

function removeWeatherEffects(map: WorldMap) {
	const effects = map.entities.filter(e => e.id === 0 && e.type === weatherRain.type);

	for (const entity of effects) {
		removeEntityDirectly(map, entity);
	}
}

function addRainEffects(map: WorldMap) {
	forEachRegion(map, region => {
		if (region.x === 3 && region.y === 4) { // TEMP: testing
			const entity = weatherRain((region.x + 0.5) * REGION_SIZE, (region.y + 0.5) * REGION_SIZE);
			addEntity(map, entity);
		}
	});
}
