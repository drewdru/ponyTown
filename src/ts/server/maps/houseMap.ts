import * as entities from '../../common/entities';
import { rect } from '../../common/rect';
import { ServerMap, MapUsage, ServerEntity } from '../serverInterfaces';
import { World, goToMap } from '../world';
import { addSpawnPointIndicators } from '../mapUtils';
import { TileType, MapType, MapFlags, EntityState } from '../../common/interfaces';
import { createServerMap, setTile, MapData, saveMap } from '../serverMap';
import { WallController } from '../controllers';
import { resetRegionUpdates } from '../serverRegion';
import { getTile } from '../../common/worldMap';
import { tileHeight, HOUSE_ENTITY_LIMIT } from '../../common/constants';

export let defaultHouseSave: MapData | undefined = undefined;

const toolboxX = 2.125;
const toolboxY = 15.41;

export function createHouseMap(world: World, instanced: boolean, _template = false): ServerMap {
	const map = createServerMap('house', MapType.House, 2, 2, TileType.Wood, instanced ? MapUsage.Party : MapUsage.Public);

	if (getTile(map, 0, 0) !== TileType.None) {
		for (let x = 0; x < map.width; x++) {
			setTile(map, x, 0, TileType.None);
			setTile(map, x, 1, TileType.None);
			setTile(map, x, 2, TileType.None);
		}
	}

	setTile(map, 4, map.height - 1, TileType.Stone);
	setTile(map, 5, map.height - 1, TileType.Stone);

	map.usage = instanced ? MapUsage.Party : MapUsage.Public;
	map.spawnArea = rect(4, 8 + 6, 2, 1);
	map.defaultTile = TileType.None;
	map.flags |= MapFlags.EditableWalls | MapFlags.EditableEntities | MapFlags.EditableTiles;
	map.editableEntityLimit = HOUSE_ENTITY_LIMIT;
	map.editableArea = rect(0, 76 / tileHeight, map.width, map.height);

	const topWall = 3;
	const windowY = 76 / tileHeight;

	const add = (entity: ServerEntity) => world.addEntity(entity, map);
	const addEditable = (entity: ServerEntity) => (entity.state |= EntityState.Editable, add(entity));

	add(entities.triggerDoor(5, map.height))
		.trigger = (_, client) => goToMap(world, client, instanced ? 'island' : 'public-island', 'house');

	addEditable(entities.window1(2, windowY));
	addEditable(entities.window1(5, windowY));
	addEditable(entities.window1(8, windowY));
	addEditable(entities.window1(12, windowY));
	addEditable(entities.window1(14, windowY));

	addEditable(entities.picture1(3.53, windowY));
	addEditable(entities.picture2(10.09, windowY));

	addEditable(entities.table1(13.50, 13.20));
	addEditable(entities.table1(2.69, 5.63));
	addEditable(entities.table2(8.69, 11.60));

	addEditable(entities.lanternOn(3.53, 15.13));
	addEditable(entities.lanternOn(6.56, 15.13));
	addEditable(entities.lanternOn(1.43, 14.04));
	addEditable(entities.lanternOn(9.97, 6.67));
	addEditable(entities.lanternOn(13.50, 6.54));
	addEditable(entities.lanternOn(10.09, 15.13));
	addEditable(entities.lanternOn(14.09, 15.04));
	addEditable(entities.lanternOn(9.44, 4.67));
	addEditable(entities.lanternOn(14.43, 8.54));

	addEditable(entities.lanternOnWall(8.375, 12.70));
	addEditable(entities.lanternOnWall(9.09, 12.08));
	addEditable(entities.lanternOnWall(13.50, 13.33));
	addEditable(entities.lanternOnWall(2.69, 5.71));

	addEditable(entities.cushion1(3.94, 4.83));
	addEditable(entities.cushion1(1.56, 4.63));
	addEditable(entities.cushion1(6.91, 10.54));
	addEditable(entities.cushion1(10.38, 11.96));
	addEditable(entities.cushion1(10.56, 10.54));
	addEditable(entities.cushion1(6.91, 12.17));
	addEditable(entities.cushion1(8.88, 13.08));
	addEditable(entities.cushion1(8.84, 9.67));
	addEditable(entities.cushion1(13.25, 4.75));
	addEditable(entities.cushion1(14.50, 3.67));
	addEditable(entities.cushion1(15.38, 5.00));
	addEditable(entities.cushion1(14.13, 6.17));
	addEditable(entities.cushion1(14.69, 12.25));
	addEditable(entities.cushion1(12.31, 12.29));
	addEditable(entities.cushion1(9.94, 5.00));
	addEditable(entities.cushion1(8.03, 5.00));

	addEditable(entities.boxLanterns(0.72, 15.58));
	addEditable(entities.toolboxFull(toolboxX, toolboxY));

	const wallController = new WallController(world, map, entities.woodenWalls);
	map.controllers.push(wallController);
	wallController.top = 3;

	if (wallController.toggleWall) {
		for (let x = 0; x < map.width; x++) {
			wallController.toggleWall(x, topWall, TileType.WallH);

			if (x !== 4 && x !== 5) {
				wallController.toggleWall(x, map.height, TileType.WallH);
			}

			if (x !== 5 && x !== 8 && x !== 12) {
				wallController.toggleWall(x, 8, TileType.WallH);
			}
		}

		for (let x = 0; x < 3; x++) {
			wallController.toggleWall(x, 13, TileType.WallH);
		}

		for (let y = topWall; y < 8; y++) {
			wallController.toggleWall(7, y, TileType.WallV);
			wallController.toggleWall(11, y, TileType.WallV);
		}

		for (let y = 8; y < map.height; y++) {
			if (y !== 11 && y !== 14) {
				wallController.toggleWall(3, y, TileType.WallV);
			}
		}

		for (let y = topWall; y < map.height; y++) {
			wallController.toggleWall(0, y, TileType.WallV);
			wallController.toggleWall(map.width, y, TileType.WallV);
		}
	}

	wallController.lockOuterWalls = true;

	if (DEVELOPMENT) {
		addSpawnPointIndicators(world, map);
	}

	for (const region of map.regions) {
		resetRegionUpdates(region);
	}

	if (!defaultHouseSave) {
		defaultHouseSave = saveMap(map, {
			saveTiles: true, saveEntities: true, saveOnlyEditableEntities: true, saveWalls: true
		});
	}

	return map;
}

export function resetHouseMap(map: ServerMap) {
	for (const { tiles } of map.regions) {
		for (let i = 0; i < tiles.length; i++) {
			tiles[i] = TileType.Wood;
		}
	}
}

function findEntityByType(map: ServerMap, type: number) {
	for (const region of map.regions) {
		for (const entity of region.entities) {
			if (entity.type === type) {
				return entity;
			}
		}
	}

	return undefined;
}

export function removeToolbox(world: World, map: ServerMap) {
	const toolbox = findEntityByType(map, entities.toolboxFull.type);

	if (toolbox) {
		world.removeEntity(toolbox, map);
	}
}

export function restoreToolbox(world: World, map: ServerMap) {
	const toolbox = findEntityByType(map, entities.toolboxFull.type);

	if (!toolbox) {
		const entity = entities.toolboxFull(toolboxX, toolboxY);
		entity.state |= EntityState.Editable;
		world.addEntity(entity, map);
	}
}
