"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entities = require("../../common/entities");
const rect_1 = require("../../common/rect");
const serverMap_1 = require("../serverMap");
const world_1 = require("../world");
const account_1 = require("../api/account");
const controllerUtils_1 = require("../controllerUtils");
const entityUtils_1 = require("../entityUtils");
function createPaletteMap(world) {
    const map = serverMap_1.createServerMap('palette', 0 /* None */, 10, 10, 2 /* Grass */);
    map.spawnArea = rect_1.rect(map.width / 2, map.height / 2, 0, 0);
    function add(entity) {
        world.addEntity(entity, map);
    }
    add(controllerUtils_1.createSign(map.width / 2, map.height / 2, 'Go back', (_, client) => world_1.goToMap(world, client, '', 'center')));
    const pad = 5;
    let x = pad;
    let y = pad;
    for (const name of account_1.allEntities) {
        const entityOrEntities = entities[name](x, y);
        const ents = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
        for (const entity of ents) {
            add(entity);
            entityUtils_1.setEntityName(entity, name);
        }
        x += 3;
        if (x > (map.width - pad)) {
            x = pad;
            y += 3;
        }
    }
    return map;
}
exports.createPaletteMap = createPaletteMap;
//# sourceMappingURL=paletteMap.js.map