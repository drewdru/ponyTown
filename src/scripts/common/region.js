"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const worldMap_1 = require("./worldMap");
const positionUtils_1 = require("./positionUtils");
const mixins_1 = require("./mixins");
const compress_1 = require("./compress");
const { min, max, floor } = Math;
function createRegion(x, y, tileData) {
    const size = constants_1.REGION_SIZE;
    const tiles = tileData ? compress_1.decompressTiles(tileData) : new Uint8Array(size * size);
    const tileIndices = new Int16Array(size * size);
    const randoms = new Uint8Array(size * size);
    // const elevation = new Uint8Array(size * size);
    const collider = new Uint8Array(size * size * constants_1.tileWidth * constants_1.tileHeight);
    if (!tileData) {
        tiles.fill(1 /* Dirt */);
    }
    tileIndices.fill(-1);
    for (let i = 0; i < randoms.length; i++) {
        randoms[i] = (Math.random() * 256) | 0;
    }
    return {
        x, y, tiles, tileIndices,
        randoms,
        // elevation,
        entities: [],
        colliders: [],
        collider,
        colliderDirty: true,
        tilesDirty: true,
    };
}
exports.createRegion = createRegion;
function getRegionTile(region, x, y) {
    return region.tiles[x | (y << 3)];
}
exports.getRegionTile = getRegionTile;
function setRegionTile(region, x, y, type) {
    region.tiles[x | (y << 3)] = type;
}
exports.setRegionTile = setRegionTile;
function getRegionTileIndex(region, x, y) {
    return region.tileIndices[x | (y << 3)];
}
exports.getRegionTileIndex = getRegionTileIndex;
function setRegionTileDirty(region, x, y) {
    region.tileIndices[x | (y << 3)] = -1;
    region.tilesDirty = true;
}
exports.setRegionTileDirty = setRegionTileDirty;
function getRegionElevation(_region, _x, _y) {
    return 0; // region.elevation[x | (y << 3)];
}
exports.getRegionElevation = getRegionElevation;
function setRegionElevation(_region, _x, _y, _value) {
    // region.elevation[x | (y << 3)] = value;
}
exports.setRegionElevation = setRegionElevation;
function worldToRegionX(x, map) {
    return utils_1.clamp(floor(x / constants_1.REGION_SIZE), 0, map.regionsX - 1);
}
exports.worldToRegionX = worldToRegionX;
function worldToRegionY(y, map) {
    return utils_1.clamp(floor(y / constants_1.REGION_SIZE), 0, map.regionsY - 1);
}
exports.worldToRegionY = worldToRegionY;
function invalidateRegionsCollider(region, map) {
    const minY = max(0, region.y - 1);
    const maxY = min(map.regionsY - 1, region.y + 1);
    const minX = max(0, region.x - 1);
    const maxX = min(map.regionsX - 1, region.x + 1);
    for (let ry = minY; ry <= maxY; ry++) {
        for (let rx = minX; rx <= maxX; rx++) {
            const r = worldMap_1.getRegion(map, rx, ry);
            if (r) {
                r.colliderDirty = true;
            }
        }
    }
}
exports.invalidateRegionsCollider = invalidateRegionsCollider;
function generateRegionCollider(region, map) {
    const regionCollider = region.collider;
    const tileTypes = region.tiles;
    region.colliderDirty = false;
    regionCollider.fill(0);
    for (let ty = 0, i = 0; ty < constants_1.REGION_SIZE; ty++) {
        for (let tx = 0; tx < constants_1.REGION_SIZE; tx++, i++) {
            const type = tileTypes[i];
            if (type === 0 /* None */) {
                const x0 = (tx * constants_1.tileWidth) | 0;
                const y0 = (ty * constants_1.tileHeight) | 0;
                const x1 = (x0 + constants_1.tileWidth) | 0;
                const y1 = (y0 + constants_1.tileHeight) | 0;
                for (let y = y0; y < y1; y++) {
                    for (let x = x0; x < x1; x++) {
                        regionCollider[(x + ((y * constants_1.REGION_WIDTH) | 0)) | 0] = 3;
                    }
                }
            }
        }
    }
    const minY = max(0, region.y - 1);
    const maxY = min(map.regionsY - 1, region.y + 1);
    const minX = max(0, region.x - 1);
    const maxX = min(map.regionsX - 1, region.x + 1);
    const pBounds = mixins_1.ponyCollidersBounds;
    const pbX0 = pBounds.x | 0;
    const pbY0 = pBounds.y | 0;
    const pbX1 = (pbX0 + pBounds.w) | 0;
    const pbY1 = (pbY0 + pBounds.h) | 0;
    const baseX = region.x * constants_1.REGION_SIZE;
    const baseY = region.y * constants_1.REGION_SIZE;
    for (let ry = minY; ry <= maxY; ry++) {
        for (let rx = minX; rx <= maxX; rx++) {
            const r = worldMap_1.getRegion(map, rx, ry);
            if (r === undefined)
                continue;
            for (const entity of r.colliders) {
                const entityX = positionUtils_1.toScreenX(entity.x - baseX) | 0;
                const entityY = positionUtils_1.toScreenY(entity.y - baseY) | 0;
                const cBounds = entity.collidersBounds;
                const ecbX = entityX + cBounds.x;
                const ecbY = entityY + cBounds.y;
                if ((ecbX + pbX0) > constants_1.REGION_WIDTH || (ecbY + pbY0) > constants_1.REGION_HEIGHT ||
                    (ecbX + cBounds.w + pbX1) < 0 || (ecbY + cBounds.h + pbY1) < 0) {
                    continue;
                }
                for (const c of entity.colliders) {
                    const value = (c.tall ? 3 : 1) | 0;
                    const baseX0 = (entityX + c.x) | 0;
                    const baseY0 = (entityY + c.y) | 0;
                    const baseX1 = (baseX0 + c.w) | 0;
                    const baseY1 = (baseY0 + c.h) | 0;
                    if (c.exact) {
                        const x0 = (baseX0 < 0 ? 0 : baseX0) | 0;
                        const y0 = (baseY0 < 0 ? 0 : baseY0) | 0;
                        const x1 = (baseX1 > constants_1.REGION_WIDTH ? constants_1.REGION_WIDTH : baseX1) | 0;
                        const y1 = (baseY1 > constants_1.REGION_HEIGHT ? constants_1.REGION_HEIGHT : baseY1) | 0;
                        if (x1 > x0 && y1 > y0) {
                            for (let y = y0 | 0; y < y1; y = (y + 1) | 0) {
                                const oy = (y * constants_1.REGION_WIDTH) | 0;
                                for (let x = x0 | 0; x < x1; x = (x + 1) | 0) {
                                    regionCollider[(x + oy) | 0] |= value;
                                }
                            }
                        }
                    }
                    else {
                        for (const pc of mixins_1.ponyColliders) {
                            const tx0 = (baseX0 + pc.x) | 0;
                            const ty0 = (baseY0 + pc.y) | 0;
                            const tx1 = (baseX1 + ((pc.x + pc.w) | 0)) | 0;
                            const ty1 = (baseY1 + ((pc.y + pc.h) | 0)) | 0;
                            const x0 = (tx0 < 0 ? 0 : tx0) | 0;
                            const y0 = (ty0 < 0 ? 0 : ty0) | 0;
                            const x1 = (tx1 > constants_1.REGION_WIDTH ? constants_1.REGION_WIDTH : tx1) | 0;
                            const y1 = (ty1 > constants_1.REGION_HEIGHT ? constants_1.REGION_HEIGHT : ty1) | 0;
                            if (x1 > x0 && y1 > y0) {
                                for (let y = y0 | 0; y < y1; y = (y + 1) | 0) {
                                    const oy = (y * constants_1.REGION_WIDTH) | 0;
                                    for (let x = x0 | 0; x < x1; x = (x + 1) | 0) {
                                        regionCollider[(x + oy) | 0] |= value;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
exports.generateRegionCollider = generateRegionCollider;
//# sourceMappingURL=region.js.map