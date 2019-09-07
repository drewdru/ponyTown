"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sprites = require("../generated/sprites");
const region_1 = require("../common/region");
const worldMap_1 = require("../common/worldMap");
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const camera_1 = require("../common/camera");
const colors_1 = require("../common/colors");
const paletteManager_1 = require("../graphics/paletteManager");
const graphicsUtils_1 = require("../graphics/graphicsUtils");
const positionUtils_1 = require("../common/positionUtils");
const TILE_COUNTS = [[0, 4], [2, 3], [4, 3], [6, 3], [8, 3], [13, 3], [14, 3], [47, 4]];
exports.TILE_COUNT_MAP = [];
exports.TILE_MAP_MAP = [];
TILE_COUNTS.forEach(([tile, count]) => {
    while (exports.TILE_COUNT_MAP.length < (tile + 1)) {
        exports.TILE_COUNT_MAP.push(1);
    }
    exports.TILE_COUNT_MAP[tile] = count;
});
let tileIndex = 0;
for (let i = 0; i <= 47; i++) {
    exports.TILE_MAP_MAP.push(tileIndex);
    tileIndex += exports.TILE_COUNT_MAP[i];
}
//   1 |  2 |   4
// ----+----+----
//   8 |    |  16
// ----+----+----
//  32 | 64 | 128
exports.TILE_MAP = [
    46, 46, 22, 22, 46, 46, 22, 22, 21, 21,
    17, 11, 21, 21, 17, 11, 19, 19, 18, 18,
    19, 19, 12, 12, 14, 14, 24, 28, 14, 14,
    30, 6, 46, 46, 22, 22, 46, 46, 22, 22,
    21, 21, 17, 11, 21, 21, 17, 11, 19, 19,
    18, 18, 19, 19, 12, 12, 14, 14, 24, 28,
    14, 14, 30, 6, 20, 20, 13, 13, 20, 20,
    13, 13, 16, 16, 23, 32, 16, 16, 23, 32,
    15, 15, 25, 25, 15, 15, 34, 34, 26, 26,
    45, 41, 26, 26, 42, 36, 20, 20, 13, 13,
    20, 20, 13, 13, 10, 10, 31, 4, 10, 10,
    31, 4, 15, 15, 25, 25, 15, 15, 34, 34,
    27, 27, 43, 37, 27, 27, 35, 5, 46, 46,
    22, 22, 46, 46, 22, 22, 21, 21, 17, 11,
    21, 21, 17, 11, 19, 19, 18, 18, 19, 19,
    12, 12, 14, 14, 24, 28, 14, 14, 30, 6,
    46, 46, 22, 22, 46, 46, 22, 22, 21, 21,
    17, 11, 21, 21, 17, 11, 19, 19, 18, 18,
    19, 19, 12, 12, 14, 14, 24, 28, 14, 14,
    30, 6, 20, 20, 13, 13, 20, 20, 13, 13,
    16, 16, 23, 32, 16, 16, 23, 32, 9, 9,
    33, 33, 9, 9, 8, 8, 29, 29, 44, 39,
    29, 29, 38, 7, 20, 20, 13, 13, 20, 20,
    13, 13, 10, 10, 31, 4, 10, 10, 31, 4,
    9, 9, 33, 33, 9, 9, 8, 8, 2, 2,
    40, 3, 2, 2, 1, 0 // 250-255
];
var TileTypeNumber;
(function (TileTypeNumber) {
    TileTypeNumber[TileTypeNumber["None"] = 0] = "None";
    TileTypeNumber[TileTypeNumber["Grass"] = 1] = "Grass";
    TileTypeNumber[TileTypeNumber["Water"] = 2] = "Water";
    TileTypeNumber[TileTypeNumber["Wood"] = 3] = "Wood";
    TileTypeNumber[TileTypeNumber["GrassNew"] = 4] = "GrassNew";
    TileTypeNumber[TileTypeNumber["Water2"] = 5] = "Water2";
    TileTypeNumber[TileTypeNumber["Water3"] = 6] = "Water3";
    TileTypeNumber[TileTypeNumber["Water4"] = 7] = "Water4";
    TileTypeNumber[TileTypeNumber["Ice"] = 8] = "Ice";
    TileTypeNumber[TileTypeNumber["SnowOnIce"] = 9] = "SnowOnIce";
    TileTypeNumber[TileTypeNumber["Stone"] = 10] = "Stone";
    TileTypeNumber[TileTypeNumber["Stone2"] = 11] = "Stone2";
    TileTypeNumber[TileTypeNumber["Boat"] = 12] = "Boat";
})(TileTypeNumber || (TileTypeNumber = {}));
const waterFrames = [
    2 /* Water */, 5 /* Water2 */, 6 /* Water3 */, 7 /* Water4 */
];
function updateTileSets(paletteManager, tileSets, season, mapType) {
    if (tileSets) {
        tileSets.forEach(t => paletteManager_1.releasePalette(t.palette));
    }
    return createTileSets(paletteManager, season, mapType);
}
exports.updateTileSets = updateTileSets;
function createTileSets(paletteManager, season, mapType) {
    const isWinter = season === 4 /* Winter */;
    const isAutumn = season === 2 /* Autumn */;
    const isCave = mapType === 3 /* Cave */;
    const grassTiles = isCave ? sprites.caveTiles : (isWinter ? sprites.snowTiles : sprites.grassTiles);
    const grassPalette = grassTiles.palettes[isCave ? 0 : (isAutumn ? 1 : 0)];
    const icePaletteIndex = isWinter ? 2 : (isAutumn ? 1 : 0);
    const waterPaletteIndex = isCave ? 3 : (isWinter ? 2 : (isAutumn ? 1 : 0));
    const waterPalette = sprites.waterTiles1.palettes[waterPaletteIndex];
    // indexes equal to TileTypeNumber values
    return [
        {
            sprites: [sprites.tile_none.color],
            palette: paletteManager.addArray(sprites.tile_none.palettes[0]),
        },
        {
            sprites: grassTiles.sprites,
            palette: paletteManager.addArray(grassPalette),
        },
        {
            sprites: sprites.waterTiles1.sprites,
            palette: paletteManager.addArray(waterPalette),
        },
        {
            sprites: sprites.woodTiles.sprites,
            palette: paletteManager.addArray(sprites.woodTiles.palettes[0]),
        },
        {
            sprites: sprites.grassTilesNew.sprites,
            palette: paletteManager.addArray(sprites.grassTilesNew.palettes[0]),
        },
        // water frames
        {
            sprites: sprites.waterTiles2.sprites,
            palette: paletteManager.addArray(waterPalette),
        },
        {
            sprites: sprites.waterTiles3.sprites,
            palette: paletteManager.addArray(waterPalette),
        },
        {
            sprites: sprites.waterTiles4.sprites,
            palette: paletteManager.addArray(waterPalette),
        },
        // ice
        {
            sprites: sprites.iceTiles.sprites,
            palette: paletteManager.addArray(sprites.iceTiles.palettes[icePaletteIndex]),
        },
        // snow on ice
        {
            sprites: sprites.snowOnIceTiles.sprites,
            palette: paletteManager.addArray(sprites.snowOnIceTiles.palettes[0]),
        },
        // stone
        {
            sprites: sprites.stoneTiles.sprites,
            palette: paletteManager.addArray(sprites.stoneTiles.palettes[0]),
        },
        // stone 2
        {
            sprites: sprites.stone2Tiles.sprites,
            palette: paletteManager.addArray(sprites.stone2Tiles.palettes[0]),
        },
    ];
}
exports.createTileSets = createTileSets;
function drawTiles(batch, region, camera, map, tileSets, options) {
    const { tileIndices } = region;
    const { tileTime } = map;
    const regionX = region.x * constants_1.REGION_SIZE;
    const regionY = region.y * constants_1.REGION_SIZE;
    if (camera_1.isAreaVisible(camera, regionX * constants_1.tileWidth, regionY * constants_1.tileHeight, constants_1.REGION_SIZE * constants_1.tileWidth, constants_1.REGION_SIZE * constants_1.tileHeight)) {
        const minX = utils_1.clamp(Math.floor(camera.x / constants_1.tileWidth - regionX), 0, constants_1.REGION_SIZE);
        const minY = utils_1.clamp(Math.floor(camera.actualY / constants_1.tileHeight - regionY), 0, constants_1.REGION_SIZE);
        const maxX = utils_1.clamp(Math.ceil((camera.x + camera.w) / constants_1.tileWidth - regionX), 0, constants_1.REGION_SIZE);
        const maxY = utils_1.clamp(Math.ceil((camera.actualY + camera.h) / constants_1.tileHeight - regionY), 0, constants_1.REGION_SIZE);
        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const tileIndex = tileIndices[x | (y << 3)];
                if (tileIndex === -1) {
                    options.error(`Uninitialized tile index at (${x}, ${y}) ` +
                        `region: (${region.x}, ${region.y}, ${region.tilesDirty}, ${region.lastTileUpdate}) ` +
                        `now: ${performance.now()}`);
                    region.tilesDirty = true;
                    continue;
                }
                const tileTypeNumber = tileIndex >>> 8;
                const isWater = tileTypeNumber === 2 /* Water */ || tileTypeNumber === 12 /* Boat */;
                const tileSpriteIndex = tileIndex & 0xff;
                const tileSetIndex = isWater ? utils_1.at(waterFrames, utils_1.toInt(tileTime) % waterFrames.length) : tileTypeNumber;
                const tileSet = tileSets[tileSetIndex];
                if (!tileSet) {
                    options.error(`Missing tileset: position: (${x}, ${y}) tile: (${region_1.getRegionTile(region, x, y)}) ` +
                        `info: (${tileIndex}, ${tileSetIndex}, ${tileTime}, ${tileSpriteIndex}, ${JSON.stringify(waterFrames)})`);
                    tileIndices[x | (y << 3)] = -1;
                    region.tilesDirty = true;
                    continue;
                }
                const rx = (x + regionX) * constants_1.tileWidth;
                const ry = (y + regionY) * constants_1.tileHeight;
                if (DEVELOPMENT && !tileSet.sprites[tileSpriteIndex]) {
                    console.error('Missing sprite', tileSetIndex, tileSpriteIndex);
                }
                batch.drawSprite(tileSet.sprites[tileSpriteIndex], colors_1.WHITE, tileSet.palette, rx, ry);
            }
        }
    }
}
exports.drawTiles = drawTiles;
function drawTilesDebugInfo(batch, region, camera, options) {
    const { tileIndices } = region;
    const regionX = region.x * constants_1.REGION_SIZE;
    const regionY = region.y * constants_1.REGION_SIZE;
    if (camera_1.isAreaVisible(camera, regionX * constants_1.tileWidth, regionY * constants_1.tileHeight, constants_1.REGION_SIZE * constants_1.tileWidth, constants_1.REGION_SIZE * constants_1.tileHeight)) {
        const minX = utils_1.clamp(Math.floor(camera.x / constants_1.tileWidth - regionX), 0, constants_1.REGION_SIZE);
        const minY = utils_1.clamp(Math.floor(camera.actualY / constants_1.tileHeight - regionY), 0, constants_1.REGION_SIZE);
        const maxX = utils_1.clamp(Math.ceil((camera.x + camera.w) / constants_1.tileWidth - regionX), 0, constants_1.REGION_SIZE);
        const maxY = utils_1.clamp(Math.ceil((camera.actualY + camera.h) / constants_1.tileHeight - regionY), 0, constants_1.REGION_SIZE);
        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const tileIndex = tileIndices[x | (y << 3)];
                if (tileIndex === -1) {
                    continue;
                }
                const tileTypeNumber = tileIndex >>> 8;
                const tileSpriteIndex = tileIndex & 0xff;
                const rx = (x + regionX) * constants_1.tileWidth;
                const ry = (y + regionY) * constants_1.tileHeight;
                if (options.tileIndices) {
                    graphicsUtils_1.drawPixelText(batch, rx + 2, ry + 2, 0x000000ff, `${tileTypeNumber}:${tileSpriteIndex}`);
                    graphicsUtils_1.drawPixelText(batch, rx + 2, ry + 2 + 7, 0x555555ff, `${region.tiles[x + constants_1.REGION_SIZE * y]}`);
                }
                if (options.tileGrid) {
                    batch.drawRect(y !== 0 ? 0x00000011 : 0x00000022, rx, ry, constants_1.tileWidth, 1);
                    batch.drawRect(x !== 0 ? 0x00000011 : 0x00000022, rx, ry + 1, 1, constants_1.tileHeight - 1);
                }
            }
        }
    }
}
exports.drawTilesDebugInfo = drawTilesDebugInfo;
function drawTilesNew(batch, region, camera, map, tileSets, options) {
    const regionX = region.x * constants_1.REGION_SIZE;
    const regionY = region.y * constants_1.REGION_SIZE;
    const TILE_COLOR = 0x666666ff;
    const TILE_FRONT_COLOR = 0x5e5e5eff;
    const OUTLINE_2_COLOR = 0xffffff22;
    const OUTLINE_COLOR = 0x00000022;
    if (camera_1.isAreaVisible(camera, regionX * constants_1.tileWidth, regionY * constants_1.tileHeight, constants_1.REGION_SIZE * constants_1.tileWidth, constants_1.REGION_SIZE * constants_1.tileHeight)) {
        const minX = utils_1.clamp(Math.floor(camera.x / constants_1.tileWidth - regionX), 0, constants_1.REGION_SIZE);
        const minY = utils_1.clamp(Math.floor(camera.y / constants_1.tileHeight - regionY), 0, constants_1.REGION_SIZE);
        const maxX = utils_1.clamp(Math.ceil((camera.x + camera.w) / constants_1.tileWidth - regionX), 0, constants_1.REGION_SIZE);
        const maxY = utils_1.clamp(Math.ceil((camera.y + camera.h) / constants_1.tileHeight - regionY), 0, constants_1.REGION_SIZE);
        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const elevation = region_1.getRegionElevation(region, x, y);
                const cliffTop = region_1.getRegionElevation(region, x, y - 1) < elevation;
                const cliffLeft = region_1.getRegionElevation(region, x - 1, y) < elevation;
                const cliffRight = region_1.getRegionElevation(region, x + 1, y) < elevation;
                const cliffBottom = region_1.getRegionElevation(region, x, y + 1) < elevation;
                const elevDiff = Math.max(0, elevation - region_1.getRegionElevation(region, x, y + 1));
                const tx = (x + regionX) * constants_1.tileWidth;
                const ty = (y + regionY) * constants_1.tileHeight - elevation * constants_1.tileElevation;
                batch.drawRect(TILE_COLOR, tx, ty, constants_1.tileWidth, constants_1.tileHeight);
                if (elevation) {
                    batch.drawRect(TILE_FRONT_COLOR, tx, ty + constants_1.tileHeight, constants_1.tileWidth, elevDiff * constants_1.tileElevation);
                    if (cliffLeft) {
                        batch.drawRect(OUTLINE_COLOR, tx, ty + constants_1.tileHeight, 1, elevation * constants_1.tileElevation);
                    }
                    if (cliffRight) {
                        batch.drawRect(OUTLINE_COLOR, tx + constants_1.tileWidth - 1, ty + constants_1.tileHeight, 1, elevation * constants_1.tileElevation);
                    }
                    if (cliffBottom) {
                        batch.drawRect(OUTLINE_2_COLOR, tx, ty + constants_1.tileHeight - 1, constants_1.tileWidth, 1);
                        batch.drawRect(OUTLINE_2_COLOR, tx, (ty + constants_1.tileHeight + elevDiff * constants_1.tileElevation) - 1, constants_1.tileWidth, 1);
                    }
                }
                if (cliffTop) {
                    batch.drawRect(OUTLINE_2_COLOR, tx, ty, constants_1.tileWidth, 1);
                }
                if (cliffLeft) {
                    batch.drawRect(OUTLINE_2_COLOR, tx, ty, 1, constants_1.tileHeight);
                }
                if (cliffRight) {
                    batch.drawRect(OUTLINE_COLOR, tx + constants_1.tileWidth - 1, ty, 1, constants_1.tileHeight);
                }
                if (cliffBottom) {
                    batch.drawRect(OUTLINE_COLOR, tx, ty + constants_1.tileHeight - 1, constants_1.tileWidth, 1);
                }
                if (options.gridLines) {
                    batch.drawRect(OUTLINE_COLOR, tx + constants_1.tileWidth - 1, ty, 1, constants_1.tileHeight);
                    batch.drawRect(OUTLINE_COLOR, tx, ty + constants_1.tileHeight - 1, constants_1.tileWidth - 1, 1);
                    // drawPixelText(batch, tx + 1, ty + 1, OUTLINE_COLOR, elevation.toString(10));
                }
                const rx = x + regionX;
                const ry = y + regionY;
                const tileIndex = region.tileIndices[x | (y << 3)];
                // const tileTypeNumber = tileIndex >> 8;
                const tileOffset = tileIndex & 0xff;
                const grass = tileSets[3];
                const baseX = (region.x * constants_1.REGION_SIZE) | 0;
                const baseY = (region.y * constants_1.REGION_SIZE) | 0;
                if (getTileNormal(region.tiles, baseX, baseY, x, y, map, 0 /* None */) === 2 /* Grass */) {
                    batch.drawSprite(grass.sprites[tileOffset], colors_1.WHITE, grass.palette, rx * constants_1.tileWidth, ry * constants_1.tileHeight);
                }
            }
        }
    }
}
exports.drawTilesNew = drawTilesNew;
function updateTileIndices(region, map) {
    for (let y = 0, i = 0; y < constants_1.REGION_SIZE; y++) {
        for (let x = 0; x < constants_1.REGION_SIZE; x++, i++) {
            if (region.tileIndices[i] === -1) {
                region.tileIndices[i] = getTileIndex(region, i, x, y, map);
            }
        }
    }
    region.tilesDirty = false;
    region.lastTileUpdate = performance.now();
}
exports.updateTileIndices = updateTileIndices;
function tileTypeNumber(type) {
    switch (type) {
        case 3 /* Water */:
        case 7 /* WalkableWater */:
            return 2 /* Water */;
        case 4 /* Wood */:
            return 3 /* Wood */;
        case 5 /* Ice */:
        case 9 /* WalkableIce */:
            return 8 /* Ice */;
        case 6 /* SnowOnIce */:
            return 9 /* SnowOnIce */;
        case 10 /* Stone */:
            return 10 /* Stone */;
        case 11 /* Stone2 */:
            return 11 /* Stone2 */;
        case 8 /* Boat */:
            return 12 /* Boat */;
        case 2 /* Grass */:
        case 1 /* Dirt */:
        case 12 /* ElevatedDirt */:
            return 1 /* Grass */;
        case 0 /* None */:
        case 100 /* WallH */:
        case 101 /* WallV */:
            return 0 /* None */;
        default:
            return utils_1.invalidEnumReturn(type, 0 /* None */);
    }
}
function normalizeTile(type, base) {
    switch (type) {
        case 6 /* SnowOnIce */:
            return base === 6 /* SnowOnIce */ ? type : 5 /* Ice */;
        case 9 /* WalkableIce */:
            return 5 /* Ice */;
        case 7 /* WalkableWater */:
        case 8 /* Boat */:
            return 3 /* Water */;
        case 12 /* ElevatedDirt */:
            return 1 /* Dirt */;
        default:
            return type;
    }
}
function normalizeTileBase(type) {
    switch (type) {
        case 9 /* WalkableIce */:
            return 5 /* Ice */;
        case 7 /* WalkableWater */:
        case 8 /* Boat */:
            return 3 /* Water */;
        case 12 /* ElevatedDirt */:
            return 1 /* Dirt */;
        default:
            return type;
    }
}
function getTileNormal(tiles, baseX, baseY, x, y, map, base) {
    if (x >= 0 && y >= 0 && x < constants_1.REGION_SIZE && y < constants_1.REGION_SIZE) {
        return normalizeTile(tiles[x | (y << 3)], base);
    }
    else {
        const mapX = utils_1.clamp(x + baseX, 0, map.width - 1);
        const mapY = utils_1.clamp(y + baseY, 0, map.height - 1);
        const region = worldMap_1.getRegionGlobal(map, mapX, mapY);
        if (region !== undefined) {
            const regionX = mapX - region.x * constants_1.REGION_SIZE;
            const regionY = mapY - region.y * constants_1.REGION_SIZE;
            return normalizeTile(region.tiles[regionX | (regionY << 3)], base);
        }
        else {
            return 0 /* None */;
        }
    }
}
function getTileIndex(region, index, x, y, map) {
    const tiles = region.tiles;
    const type = tiles[x | (y << 3)];
    const tileType = tileTypeNumber(type);
    let baseTileIndex = 0;
    if (type === 1 /* Dirt */ || type === 12 /* ElevatedDirt */) {
        baseTileIndex = 47;
    }
    else if (type !== 0 /* None */) {
        let topLeft = 0, top = 0, topRight = 0, left = 0, right = 0, bottomLeft = 0, bottom = 0, bottomRight = 0;
        if (x > 1 && y > 1 && x < (constants_1.REGION_SIZE - 1) && y < (constants_1.REGION_SIZE - 1)) {
            topLeft = normalizeTile(tiles[(x - 1) | (y - 1) << 3], type);
            top = normalizeTile(tiles[(x) | (y - 1) << 3], type);
            topRight = normalizeTile(tiles[(x + 1) | (y - 1) << 3], type);
            left = normalizeTile(tiles[(x - 1) | (y) << 3], type);
            right = normalizeTile(tiles[(x + 1) | (y) << 3], type);
            bottomLeft = normalizeTile(tiles[(x - 1) | (y + 1) << 3], type);
            bottom = normalizeTile(tiles[(x) | (y + 1) << 3], type);
            bottomRight = normalizeTile(tiles[(x + 1) | (y + 1) << 3], type);
        }
        else {
            const baseX = (region.x * constants_1.REGION_SIZE) | 0;
            const baseY = (region.y * constants_1.REGION_SIZE) | 0;
            topLeft = getTileNormal(tiles, baseX, baseY, x - 1, y - 1, map, type);
            top = getTileNormal(tiles, baseX, baseY, x, y - 1, map, type);
            topRight = getTileNormal(tiles, baseX, baseY, x + 1, y - 1, map, type);
            left = getTileNormal(tiles, baseX, baseY, x - 1, y, map, type);
            right = getTileNormal(tiles, baseX, baseY, x + 1, y, map, type);
            bottomLeft = getTileNormal(tiles, baseX, baseY, x - 1, y + 1, map, type);
            bottom = getTileNormal(tiles, baseX, baseY, x, y + 1, map, type);
            bottomRight = getTileNormal(tiles, baseX, baseY, x + 1, y + 1, map, type);
        }
        const normalized = normalizeTileBase(type);
        const index = 0
            | ((topLeft === normalized) ? 1 : 0)
            | ((top === normalized) ? 2 : 0)
            | ((topRight === normalized) ? 4 : 0)
            | ((left === normalized) ? 8 : 0)
            | ((right === normalized) ? 16 : 0)
            | ((bottomLeft === normalized) ? 32 : 0)
            | ((bottom === normalized) ? 64 : 0)
            | ((bottomRight === normalized) ? 128 : 0);
        baseTileIndex = exports.TILE_MAP[index];
    }
    const tileCount = type !== 0 /* None */ ? exports.TILE_COUNT_MAP[baseTileIndex] : 1;
    const tileIndex = exports.TILE_MAP_MAP[baseTileIndex] + (tileCount > 1 ? region.randoms[index] % tileCount : 0);
    return (tileType << 8) | tileIndex;
}
const tileIndices = [
    47, 47, 0, 0, 13, 19, 21, 20, 15, 16,
    47, 47, 0, 0, 13, 13, 45, 22, 18, 17,
    9, 2, 2, 2, 10, 14, 14, 14, 35, 36,
    8, 5, null, 7, 4, 27, 26, 29, 37, 38,
    8, null, 46, null, 4, 28, 24, 30, 39, 40,
    8, 3, null, 1, 4, 23, 31, 32, 41, 42,
    12, 6, 6, 6, 11, 25, 33, 34, 43, 44,
];
let tileHeightMaps = new Map();
let tileHeightMapsInitialized = false;
function valueToHeight(value, bottom, top) {
    return bottom + ((value / 255) * (top - bottom));
}
function initializeTileHeightmaps() {
    if (tileHeightMapsInitialized)
        return;
    function createTileHeightMaps(sprite, tileType, bottom, top) {
        const sheetData = sprites.normalSpriteSheet.data;
        const tiles = [];
        for (let ty = 0; ty < 7; ty++) {
            for (let tx = 0; tx < 10; tx++) {
                const tile = [];
                const baseX = tx * constants_1.tileWidth + sprite.x;
                const baseY = ty * constants_1.tileHeight + sprite.y;
                for (let y = 0, i = 0; y < constants_1.tileHeight; y++) {
                    for (let x = 0; x < constants_1.tileWidth; x++, i++) {
                        const sx = baseX + x;
                        const sy = baseY + y;
                        const value = sheetData.data[(sx + sy * sheetData.width) * 4];
                        tile.push(valueToHeight(value, bottom, top));
                    }
                }
                tiles.push(tile);
            }
        }
        tileHeightMapsInitialized = true;
        const counts = new Uint8Array(100);
        for (let i = 0; i < tileIndices.length; i++) {
            const index = tileIndices[i];
            if (index !== null) {
                const key = (tileType << 8) | (exports.TILE_MAP_MAP[index] + counts[index]);
                tileHeightMaps.set(key, tiles[i]);
                counts[index]++;
            }
        }
    }
    createTileHeightMaps(sprites.dirt_water_heightmap, 2 /* Water */, -0.25, 0);
    createTileHeightMaps(sprites.dirt_ice_heightmap, 8 /* Ice */, -0.2, 0);
    createTileHeightMaps(sprites.dirt_stone_cave_height_map, 1 /* Grass */, 0.2, 0);
}
exports.initializeTileHeightmaps = initializeTileHeightmaps;
const waterHeight = constants_1.WATER_HEIGHT.map(positionUtils_1.toWorldZ);
function isInWater(tileIndex, x, y) {
    const tileType = (tileIndex & 0xff00) >> 8;
    if (tileType === 2 /* Water */) {
        const heightMaps = tileHeightMaps.get(tileIndex);
        if (heightMaps !== undefined) {
            const tx = utils_1.clamp(positionUtils_1.toScreenX(x - Math.floor(x)), 0, constants_1.tileWidth - 1) | 0;
            const ty = utils_1.clamp(positionUtils_1.toScreenY(y - Math.floor(y)), 0, constants_1.tileHeight - 1) | 0;
            return heightMaps[tx + ty * constants_1.tileWidth] === -0.25;
        }
    }
    return false;
}
exports.isInWater = isInWater;
function getTileHeight(tileType, tileIndex, x, y, gameTime, mapType) {
    const typeNumber = (tileIndex & 0xff00) >> 8;
    if (typeNumber === 8 /* Ice */ ||
        typeNumber === 2 /* Water */ ||
        (mapType === 3 /* Cave */ && tileType === 2 /* Grass */)) {
        if (tileType !== 7 /* WalkableWater */ && tileType !== 9 /* WalkableIce */) {
            const heightMaps = tileHeightMaps.get(tileIndex);
            if (heightMaps !== undefined) {
                const tx = utils_1.clamp(positionUtils_1.toScreenX(x - Math.floor(x)), 0, constants_1.tileWidth - 1) | 0;
                const ty = utils_1.clamp(positionUtils_1.toScreenY(y - Math.floor(y)), 0, constants_1.tileHeight - 1) | 0;
                return heightMaps[tx + ty * constants_1.tileWidth];
            }
        }
    }
    else if (typeNumber === 9 /* SnowOnIce */) {
        return -0.2;
    }
    else if (tileType === 12 /* ElevatedDirt */) {
        return 0.5;
    }
    else if (typeNumber === 12 /* Boat */) {
        const frame = ((gameTime / 1000) * constants_1.WATER_FPS) | 0;
        return waterHeight[frame % waterHeight.length];
    }
    return 0;
}
exports.getTileHeight = getTileHeight;
//# sourceMappingURL=tileUtils.js.map