"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const lodash_1 = require("lodash");
const entities = require("../../common/entities");
const paths_1 = require("../paths");
const world_1 = require("../world");
const mapUtils_1 = require("../mapUtils");
const serverMap_1 = require("../serverMap");
const rect_1 = require("../../common/rect");
const controllerUtils_1 = require("../controllerUtils");
const entityUtils_1 = require("../entityUtils");
const playerUtils_1 = require("../playerUtils");
const constants_1 = require("../../common/constants");
const controllers_1 = require("../controllers");
const serverRegion_1 = require("../serverRegion");
const utils_1 = require("../../common/utils");
const islandMapData = JSON.parse(fs.readFileSync(paths_1.pathTo('src', 'maps', 'island.json'), 'utf8'));
let islandMapTemplate;
function createIslandMap(world, instanced, template = false) {
    if (!template && !islandMapTemplate) {
        islandMapTemplate = createIslandMap(mapUtils_1.worldForTemplates, false, true);
    }
    const map = (instanced && islandMapTemplate) ?
        serverMap_1.serverMapInstanceFromTemplate(islandMapTemplate) :
        serverMap_1.createServerMap('island', 1 /* Island */, 7, 7, 3 /* Water */, instanced ? 1 /* Party */ : 0 /* Public */);
    map.usage = instanced ? 1 /* Party */ : 0 /* Public */;
    map.spawnArea = rect_1.rect(43.4, 20, 3.3, 2.5);
    map.spawns.set('house', rect_1.rect(27, 24, 2, 2));
    if (islandMapTemplate) {
        serverMap_1.copyMapTiles(map, islandMapTemplate);
    }
    else {
        serverMap_1.deserializeMap(map, islandMapData);
    }
    const goto = instanced ? 'house' : 'public-house';
    const add = (entity) => world.addEntity(entity, map);
    const addEntities = (entities) => entities.map(add);
    add(entities.house(28, 23)).interact = (_, client) => world_1.goToMap(world, client, goto);
    add(entities.triggerHouseDoor(27.40, 22.87)).trigger = (_, client) => world_1.goToMap(world, client, goto);
    add(controllerUtils_1.createBoxOfLanterns(25.5, 25.5));
    const boxOfFruits = add(entities.boxFruits(20.72, 20.88));
    entityUtils_1.setEntityName(boxOfFruits, 'Box of fruits');
    const giftPile = add(entities.giftPileInteractive(37.66, 18.21));
    giftPile.interact = (_, client) => entityUtils_1.updateEntityOptions(client.pony, playerUtils_1.getNextToyOrExtra(client));
    entityUtils_1.setEntityName(giftPile, 'Toy stash');
    const types = entities.stashEntities.map(e => e.type);
    const itemSign = add(entities.signQuest(24.41, 25.00));
    itemSign.interact = (_, client) => {
        const index = types.indexOf(client.pony.options.hold || 0);
        playerUtils_1.holdItem(client.pony, types[(index + 1) % types.length]);
    };
    entityUtils_1.setEntityName(itemSign, 'Item stash');
    const addTorch = controllerUtils_1.createAddLight(world, map, entities.torch);
    addTorch(25.00, 24.00);
    addTorch(39.69, 18.38);
    addTorch(39.66, 21.67);
    addTorch(23.34, 38.46);
    addTorch(28.16, 31.79);
    addTorch(29.13, 38.17);
    addTorch(30.84, 29.42);
    addTorch(29.69, 25.00);
    addTorch(20.00, 27.88);
    addTorch(22.63, 30.54);
    addTorch(19.22, 32.08);
    addTorch(25.50, 26.79);
    addTorch(15.94, 26.42);
    addTorch(15.88, 29.75);
    // pier
    const px = 1 / constants_1.tileWidth;
    const plankWidth = 78 / constants_1.tileWidth;
    const plankHeight = 12 / constants_1.tileHeight;
    const plankOffsets = [0, -1, 0, -2, -1, -1, 0, -2, -1, 0].map(x => x / constants_1.tileWidth);
    addEntities(entities.fullBoat(45.06, 24));
    add(entities.pierLeg(41.31, 20.54));
    add(entities.pierLeg(43.00, 22.58));
    add(entities.pierLeg(44.84, 22.58));
    add(entities.pierLeg(46.65, 22.58));
    add(entities.barrel(46.83, 23.35));
    add(entities.lanternOn(46.19, 23.38));
    add(entities.lanternOn(42.63, 21.42));
    add(entities.lanternOn(47.00, 18.96));
    add(entities.triggerBoat(45.5, 24.8)).interact = (_, client) => world_1.goToMap(world, client, '', 'harbor');
    add(controllerUtils_1.createSignWithText(43, 23.5, 'Return to land', `Hop on the boat to return to the mainland`));
    for (let y = 0; y < 10; y++) {
        const minX = y < 5 ? 0 : 1;
        const maxX = (y % 2) ? 4 : 3;
        const baseX = 40 + ((y % 2) ? 0 : (plankWidth / 2)) + plankOffsets[y];
        const baseY = 19 - (9 / constants_1.tileHeight);
        for (let x = minX; x < maxX; x++) {
            if ((x === minX && (y % 2)) || (x === (maxX - 1) && (y % 2))) {
                const ox = x === minX ? (18 / constants_1.tileWidth) : (-18 / constants_1.tileWidth);
                const plank = lodash_1.sample(entities.planksShort);
                add(plank(baseX + ox + x * plankWidth, baseY + y * plankHeight));
            }
            else {
                const plank = lodash_1.sample(entities.planks);
                add(plank(baseX + x * plankWidth, baseY + y * plankHeight));
            }
        }
    }
    add(entities.plankShadow(41.31, 20.58));
    add(entities.plankShadowShort(43.03, 21.08));
    add(entities.plankShadowShort(43, 21.08 + plankHeight * 2));
    const baseY = 18.58;
    const baseX = 46.71;
    add(entities.plankShadowShort(baseX, baseY));
    add(entities.plankShadowShort(baseX + 2 * px, baseY + plankHeight));
    add(entities.plankShadowShort(baseX, baseY + plankHeight * 2));
    add(entities.plankShadowShort(baseX + 1 * px, baseY + plankHeight * 3));
    add(entities.plankShadowShort(baseX - 1 * px, baseY + plankHeight * 4));
    add(entities.plankShadowShort(baseX + 2 * px, baseY + plankHeight * 5));
    add(entities.plankShadowShort(baseX, baseY + plankHeight * 6));
    add(entities.plankShadowShort(baseX + 1 * px, baseY + plankHeight * 7));
    add(entities.plankShadowShort(baseX - 1 * px, baseY + plankHeight * 8));
    add(entities.plankShadowShort(baseX + 3 * px, baseY + plankHeight * 9));
    add(entities.collider3x1(40, 18));
    add(entities.collider3x1(43, 18));
    add(entities.collider2x1(46, 18));
    add(entities.collider1x3(47, 19));
    add(entities.collider1x3(47, 22));
    add(entities.collider3x1(40, 21));
    add(entities.collider1x3(42, 22));
    add(entities.collider1x1(43, 24));
    add(entities.collider3x1(42, 25));
    add(entities.collider3x1(45, 25));
    add(entities.collider1x3(47.6, 23));
    add(entities.collider1x3(41.5, 22));
    // lone boat
    addEntities(entities.fullBoat(27.12, 42, false));
    add(entities.plankShort3(27.43, 39.67));
    add(entities.plankShort3(27.46, 40.21));
    add(entities.plankShort3(27.43, 40.75));
    add(entities.plankShort3(27.46, 41.21));
    add(entities.pierLeg(27.96, 40.88));
    add(entities.pierLeg(27.02, 40.79));
    add(entities.plankShadowShort(27.5, 39.67));
    add(entities.plankShadowShort(27.5 + 1 * px, 39.67 + plankHeight));
    add(entities.plankShadowShort(27.5, 39.67 + plankHeight * 2));
    add(entities.plankShadowShort(27.5 + 1 * px, 39.67 + plankHeight * 3));
    add(entities.lanternOn(28.77, 42.27));
    add(entities.collider3x1(24, 41));
    add(entities.collider2x1(24, 42));
    add(entities.collider1x2(26, 40));
    add(entities.collider1x2(28, 40));
    add(entities.collider2x1(28, 41));
    add(entities.collider3x1(24, 43));
    add(entities.collider3x1(27, 43));
    add(entities.collider1x1(29, 42));
    add(entities.collider1x3(29.7, 41));
    add(entities.collider1x3(23.5, 41));
    const addWoodenFence = controllerUtils_1.createWoodenFenceMaker(world, map);
    addWoodenFence(20, 20, 4);
    addWoodenFence(20, 20, 4, false, true);
    addWoodenFence(24, 20, 4, false, true);
    addWoodenFence(20, 24, 1, true, true);
    addWoodenFence(23, 24, 1, true, false, true);
    addEntities(entities.tree(22.41, 18.21, 0));
    addEntities(entities.tree(30.44, 23.46, 1 + 4));
    addEntities(entities.tree5(34.53, 27.04, 0));
    addEntities(entities.tree5(19.28, 21.75, 1));
    add(entities.pumpkin(23.22, 20.58));
    add(entities.pumpkin(20.53, 22.29));
    add(entities.pumpkin(20.91, 23.08));
    add(entities.largeLeafedBush2(35.03, 26.71));
    add(entities.largeLeafedBush4(34.13, 27.54));
    add(entities.largeLeafedBush2(20.34, 24.42));
    add(entities.largeLeafedBush3(19.72, 24.04));
    add(entities.largeLeafedBush3(23.03, 38.67));
    add(entities.largeLeafedBush4(23.72, 38.04));
    add(entities.barrel(39.53, 18.96));
    add(entities.barrel(38.78, 18.38));
    add(entities.barrel(38.47, 19.21));
    add(entities.barrel(24.63, 23.50));
    add(entities.treeStump1(20.25, 36.46));
    add(entities.lanternOn(20.75, 37.00));
    add(entities.lanternOn(36.06, 34.25));
    add(entities.lanternOn(37.63, 36.83));
    add(entities.lanternOn(37.84, 26.94));
    add(entities.waterRock1(22.63, 41.83));
    add(entities.waterRock1(28.56, 13.75));
    add(entities.waterRock1(16.25, 20.88));
    add(entities.waterRock1(40.62, 29.62));
    add(entities.waterRock1(40.63, 17.96));
    add(entities.waterRock2(40.22, 17.50));
    add(entities.waterRock2(20.34, 15.75));
    add(entities.waterRock2(15.41, 34.13));
    add(entities.waterRock2(36.50, 40.63));
    add(entities.waterRock3(36.13, 40.96));
    add(entities.waterRock3(41.63, 34.38));
    add(entities.waterRock3(15.16, 34.67));
    add(entities.waterRock3(20.88, 15.50));
    add(entities.waterRock4(36.56, 41.13));
    add(entities.waterRock4(40.72, 17.29));
    add(entities.waterRock4(28.22, 13.25));
    add(entities.waterRock5(28.66, 13.17));
    add(entities.waterRock5(16.84, 20.42));
    add(entities.waterRock5(14.44, 30.50));
    add(entities.waterRock5(23.13, 41.88));
    add(entities.waterRock5(30.44, 39.71));
    add(entities.waterRock5(41.84, 34.83));
    add(entities.waterRock5(36.63, 14.75));
    add(entities.waterRock6(36.25, 14.54));
    add(entities.waterRock6(14.84, 34.29));
    add(entities.waterRock6(40.44, 38.71));
    add(entities.waterRock7(42.13, 34.42));
    add(entities.waterRock7(20.34, 15.25));
    add(entities.waterRock7(28.78, 40.79));
    add(entities.waterRock7(22.66, 42.08));
    add(entities.waterRock8(22.25, 41.92));
    add(entities.waterRock8(14.13, 30.79));
    add(entities.waterRock8(16.28, 20.21));
    add(entities.waterRock8(42.19, 34.79));
    add(entities.waterRock9(36.78, 14.29));
    add(entities.waterRock9(13.97, 30.33));
    add(entities.waterRock10(14.50, 25.83));
    add(entities.waterRock10(18.88, 40.75));
    add(entities.waterRock11(25.37, 13.75));
    add(entities.waterRock11(18.44, 40.58));
    add(entities.waterRock11(15.41, 24.33));
    add(entities.waterRock4(15.13, 23.96));
    add(entities.waterRock11(35.38, 31.08));
    add(entities.waterRock8(35.09, 30.71));
    add(entities.waterRock3(34.03, 29.79));
    add(entities.waterRock4(34.31, 29.67));
    add(entities.waterRock4(24.50, 35.92));
    add(entities.waterRock3(33.44, 38.21));
    add(entities.waterRock4(33.16, 37.92));
    add(entities.waterRock1(25.50, 17.79));
    add(entities.waterRock9(25.66, 18.13));
    add(entities.waterRock4(25.97, 17.79));
    add(entities.flower3Pickable(30.25, 24.92)).interact = (_, { pony }) => playerUtils_1.holdItem(pony, entities.flowerPick.type);
    add(entities.bench1(37.78, 24.96));
    add(entities.benchSeat(37.75, 28.29));
    add(entities.benchBack(37.75, 29.17));
    // small island bit
    addEntities(entities.tree(9.16, 16.50, 2 + 8));
    add(entities.waterRock1(5.34, 23.71));
    add(entities.waterRock1(13.28, 14.33));
    add(entities.waterRock1(11.19, 24.83));
    add(entities.waterRock3(10.94, 25.21));
    add(entities.waterRock3(6.31, 18.92));
    add(entities.waterRock3(13.59, 14.71));
    add(entities.waterRock5(13.84, 14.17));
    add(entities.waterRock4(11.38, 25.13));
    add(entities.waterRock6(6.41, 15.92));
    add(entities.waterRock8(5.16, 23.13));
    add(entities.waterRock10(6.06, 16.33));
    add(entities.waterRock11(14.66, 20.75));
    add(entities.torch(9.31, 17.83));
    add(entities.torch(9.44, 21.67));
    add(entities.torch(12.75, 18.29));
    if (world.season === 1 /* Summer */ || world.season === 8 /* Spring */) {
        add(entities.flowerPatch1(21.16, 26.04));
        add(entities.flowerPatch3(35.81, 34.75));
        add(entities.flowerPatch3(23.09, 32.29));
        add(entities.flowerPatch5(19.63, 33.04));
        add(entities.flowerPatch5(37.38, 26.42));
        add(entities.flowerPatch5(18.75, 26.38));
        add(entities.flowerPatch5(35.38, 33.88));
        add(entities.flowerPatch6(25.78, 31.04));
        add(entities.flowerPatch6(33.00, 33.79));
        add(entities.flowerPatch6(38.72, 26.00));
        add(entities.flowerPatch3(11.34, 19.33));
        add(entities.flowerPatch6(11.09, 17.79));
        add(entities.flowerPatch7(8.63, 21.67));
    }
    if (world.season === 2 /* Autumn */) {
        add(entities.leafpileStickRed(31.00, 22.75));
        add(entities.leaves5(18.41, 21.46));
        add(entities.leaves2(21.59, 18.17));
        add(entities.leaves2(23.56, 18.00));
        add(entities.leaves1(22.00, 17.21));
        add(entities.leaves1(22.47, 20.00));
        add(entities.leaves2(33.69, 25.42));
        add(entities.leaves1(33.47, 26.75));
        add(entities.leaves1(35.66, 27.08));
        add(entities.leaves3(30.31, 24.04));
        add(entities.leaves1(31.56, 23.00));
        add(entities.leaves1(29.47, 23.21));
        add(entities.leaves3(8.84, 17.04));
        add(entities.leaves2(8.91, 15.25));
        add(entities.leaves1(10.44, 16.46));
    }
    addEntities(mapUtils_1.createBunny([
        utils_1.point(22.19, 27.25),
        utils_1.point(19.75, 26.13),
        utils_1.point(18.44, 29.04),
        utils_1.point(20.41, 31.42),
        utils_1.point(19.94, 33.04),
        utils_1.point(22.88, 33.67),
        utils_1.point(24.91, 31.25),
        utils_1.point(26.09, 32.50),
        utils_1.point(26.34, 34.83),
        utils_1.point(32.50, 35.46),
        utils_1.point(34.03, 34.67),
        utils_1.point(36.06, 36.50),
        utils_1.point(36.47, 35.33),
        utils_1.point(36.22, 34.63),
        utils_1.point(33.63, 34.83),
        utils_1.point(31.88, 33.25),
        utils_1.point(32.00, 28.46),
        utils_1.point(33.22, 25.75),
        utils_1.point(35.09, 24.75),
        utils_1.point(36.13, 25.67),
        utils_1.point(36.72, 27.38),
        utils_1.point(38.31, 27.42),
        utils_1.point(38.63, 26.54),
        utils_1.point(37.31, 26.63),
        utils_1.point(36.06, 26.42),
        utils_1.point(35.34, 24.29),
        utils_1.point(33.13, 25.83),
        utils_1.point(30.06, 25.13),
        utils_1.point(26.50, 26.38),
        utils_1.point(24.66, 28.25),
        utils_1.point(22.25, 28.50),
        utils_1.point(20.97, 27.00),
        utils_1.point(19.13, 27.13),
        utils_1.point(20.69, 29.25),
        utils_1.point(22.34, 29.42),
        utils_1.point(21.53, 31.46),
        utils_1.point(23.50, 31.54),
        utils_1.point(23.81, 29.71),
    ]));
    map.controllers.push(new controllers_1.TorchController(world, map));
    map.controllers.push(new controllers_1.UpdateController(map));
    if (DEVELOPMENT) {
        mapUtils_1.addSpawnPointIndicators(world, map);
    }
    if (!islandMapTemplate) {
        mapUtils_1.generateTileIndicesAndColliders(map);
    }
    return map;
}
exports.createIslandMap = createIslandMap;
function resetIslandMap(map) {
    serverMap_1.copyMapTiles(map, islandMapTemplate);
    for (const region of map.regions) {
        region.clients = [];
        mapUtils_1.removePonies(region.entities);
        mapUtils_1.removePonies(region.movables);
        serverRegion_1.resetRegionUpdates(region);
    }
}
exports.resetIslandMap = resetIslandMap;
//# sourceMappingURL=islandMap.js.map