"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const entities = require("../../common/entities");
const rect_1 = require("../../common/rect");
const serverMap_1 = require("../serverMap");
const world_1 = require("../world");
const controllerUtils_1 = require("../controllerUtils");
const paths_1 = require("../paths");
// load tile data
// To customize the map use in-game editor tools to change tiles, then use `/savemap custom` command,
// your map will be saved to `/store/custom.json` file, move the file to `/src/maps/custom.json`
// and restart the server.
const mapData = JSON.parse(fs.readFileSync(paths_1.pathTo('src', 'maps', 'custom.json'), 'utf8'));
function createCustomMap(world) {
    // size: 4 by 4 regions -> 32 by 32 tiles
    // default tiles: grass
    const map = serverMap_1.createServerMap('custom', 0 /* None */, 4, 4, 2 /* Grass */);
    // initialize tiles
    serverMap_1.deserializeMap(map, mapData);
    // place default spawn point at the center of the map
    map.spawnArea = rect_1.rect(map.width / 2, map.height / 2, 0, 0);
    // shorthand for adding entities
    function add(entity) {
        world.addEntity(entity, map);
    }
    // place return sign 2 tiles north of center of the map
    add(controllerUtils_1.createSign(map.width / 2, map.height / 2 - 2, 'Go back', (_, client) => world_1.goToMap(world, client, '', 'center')));
    // place barrel at 5, 5 location
    add(entities.barrel(5, 5));
    // place more entities here ...
    return map;
}
exports.createCustomMap = createCustomMap;
//# sourceMappingURL=customMap.js.map