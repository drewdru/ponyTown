import * as fs from 'fs';
import * as entities from '../../common/entities';
import { rect } from '../../common/rect';
import { TileType, MapType } from '../../common/interfaces';
import { createServerMap, deserializeMap } from '../serverMap';
import { World, goToMap } from '../world';
import { createSign } from '../controllerUtils';
import { ServerEntity } from '../serverInterfaces';
import { pathTo } from '../paths';

// load tile data
// To customize the map use in-game editor tools to change tiles, then use `/savemap custom` command,
// your map will be saved to `/store/custom.json` file, move the file to `/src/maps/custom.json`
// and restart the server.
const mapData = JSON.parse(fs.readFileSync(pathTo('src', 'maps', 'custom.json'), 'utf8'));

export function createCustomMap(world: World) {
	// size: 4 by 4 regions -> 32 by 32 tiles
	// default tiles: grass
	const map = createServerMap('custom', MapType.None, 4, 4, TileType.Grass);

	// initialize tiles
	deserializeMap(map, mapData);

	// place default spawn point at the center of the map
	map.spawnArea = rect(map.width / 2, map.height / 2, 0, 0);

	// shorthand for adding entities
	function add(entity: ServerEntity) {
		world.addEntity(entity, map);
	}

	// place return sign 2 tiles north of center of the map
	add(createSign(map.width / 2, map.height / 2 - 2, 'Go back', (_, client) => goToMap(world, client, '', 'center')));

	// place barrel at 5, 5 location
	add(entities.barrel(5, 5));

	// place more entities here ...

	return map;
}
