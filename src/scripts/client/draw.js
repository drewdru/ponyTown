"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("../common/interfaces");
const camera_1 = require("../common/camera");
const graphicsUtils_1 = require("../graphics/graphicsUtils");
const colors_1 = require("../common/colors");
const positionUtils_1 = require("../common/positionUtils");
const constants_1 = require("../common/constants");
const worldMap_1 = require("../common/worldMap");
const pony_1 = require("../common/pony");
const entityUtils_1 = require("../common/entityUtils");
const tileUtils_1 = require("./tileUtils");
const color_1 = require("../common/color");
const timing_1 = require("./timing");
const SELECTED_ENTITY_BOUNDS = color_1.withAlphaFloat(colors_1.ORANGE, 0.5);
function drawEntities(batch, entities, camera, options) {
    const drawHidden = options.drawHidden;
    let entitiesDrawn = 0;
    for (const entity of entities) {
        if ((!entityUtils_1.isHidden(entity) || drawHidden) && camera_1.isBoundsVisible(camera, entity.bounds, entity.x, entity.y)) {
            if (entity.type === constants_1.PONY_TYPE) {
                pony_1.drawPonyEntity(batch, entity, options);
                entitiesDrawn++;
            }
            else if (entity.draw !== undefined) {
                entity.draw(batch, options);
                entitiesDrawn++;
            }
        }
        else {
            if (entity.type === constants_1.PONY_TYPE) {
                const pony = entity;
                if (pony.batch !== undefined) {
                    batch.releaseBatch(pony.batch);
                    pony.batch = undefined;
                }
            }
        }
    }
    return entitiesDrawn;
}
function drawEntityLights(batch, entities, camera, options) {
    const drawHidden = options.drawHidden;
    for (const entity of entities) {
        if (DEVELOPMENT && (entity.type !== constants_1.PONY_TYPE && !entity.drawLight)) {
            console.error('Cannot draw entity light', entity);
        }
        if ((!entityUtils_1.isHidden(entity) || drawHidden) && camera_1.isBoundsVisible(camera, entity.lightBounds, entity.x, entity.y)) {
            if (entity.type === constants_1.PONY_TYPE) {
                pony_1.drawPonyEntityLight(batch, entity, options);
            }
            else {
                entity.drawLight(batch, options);
            }
        }
    }
}
exports.drawEntityLights = drawEntityLights;
function drawEntityLightSprites(batch, entities, camera, options) {
    const drawHidden = options.drawHidden;
    for (const entity of entities) {
        if (DEVELOPMENT && (entity.type !== constants_1.PONY_TYPE && !entity.drawLightSprite)) {
            console.error('Cannot draw entity light sprite', entity);
        }
        if ((!entityUtils_1.isHidden(entity) || drawHidden) && camera_1.isBoundsVisible(camera, entity.lightSpriteBounds, entity.x, entity.y)) {
            if (entity.type === constants_1.PONY_TYPE) {
                pony_1.drawPonyEntityLightSprite(batch, entity, options);
            }
            else {
                entity.drawLightSprite(batch, options);
            }
        }
    }
}
exports.drawEntityLightSprites = drawEntityLightSprites;
function hasDrawLight(entity) {
    if (entity.type === constants_1.PONY_TYPE) {
        const pony = entity;
        return (pony.ponyState.holding !== undefined && pony.ponyState.holding.drawLight !== undefined) ||
            ((pony.state & 8 /* Magic */) !== 0);
    }
    else {
        return entity.drawLight !== undefined;
    }
}
exports.hasDrawLight = hasDrawLight;
function hasLightSprite(entity) {
    if (entity.type === constants_1.PONY_TYPE) {
        const pony = entity;
        return (pony.ponyState.holding !== undefined && pony.ponyState.holding.drawLightSprite !== undefined);
    }
    else {
        return entity.drawLightSprite !== undefined;
    }
}
exports.hasLightSprite = hasLightSprite;
function drawMap(batch, map, camera, player, options, tileSets, selectedEntities) {
    TIMING && timing_1.timeStart('forEachRegion');
    if (BETA && options.engine === interfaces_1.Engine.Whiteness) {
        batch.drawRect(colors_1.WHITE, 0, 0, positionUtils_1.toScreenX(map.width), positionUtils_1.toScreenY(map.height));
    }
    else if (BETA && options.engine === interfaces_1.Engine.LayeredTiles) {
        worldMap_1.forEachRegion(map, region => tileUtils_1.drawTilesNew(batch, region, camera, map, tileSets, options));
    }
    else {
        worldMap_1.forEachRegion(map, region => tileUtils_1.drawTiles(batch, region, camera, map, tileSets, options));
    }
    TIMING && timing_1.timeEnd();
    TIMING && timing_1.timeStart('sortEntities');
    entityUtils_1.sortEntities(map.entitiesDrawable);
    TIMING && timing_1.timeEnd();
    TIMING && timing_1.timeStart('drawEntities');
    const entitiesDrawn = drawEntities(batch, map.entitiesDrawable, camera, options);
    TIMING && timing_1.timeEnd();
    if (BETA || TOOLS) {
        worldMap_1.forEachRegion(map, region => tileUtils_1.drawTilesDebugInfo(batch, region, camera, options));
    }
    if (BETA && options.debug.showHelpers) {
        drawDebugHelpers(batch, map.entities, options);
    }
    if (BETA) {
        for (const entity of selectedEntities) {
            const bounds = worldMap_1.getAnyBounds(entity);
            graphicsUtils_1.drawBoundsOutline(batch, entity, bounds, SELECTED_ENTITY_BOUNDS, 2);
        }
    }
    if (BETA && options.debug.showHelpers) {
        graphicsUtils_1.drawOutlineRect(batch, colors_1.PURPLE, entityUtils_1.getInteractBounds(player));
        graphicsUtils_1.drawOutlineRect(batch, 0xff000066, entityUtils_1.getSitOnBounds(player));
    }
    if (BETA && options.showColliderMap) {
        drawDebugCollider(batch, map, camera);
        batch.drawRect(colors_1.PURPLE, positionUtils_1.toScreenX(player.x) - 1, positionUtils_1.toScreenY(player.y), 3, 1);
        batch.drawRect(colors_1.PURPLE, positionUtils_1.toScreenX(player.x), positionUtils_1.toScreenY(player.y) - 1, 1, 3);
    }
    if (BETA && options.showHeightmap) {
        drawDebugInWater(batch, map, camera);
    }
    return entitiesDrawn;
}
exports.drawMap = drawMap;
// debug
function drawDebugHelpers(batch, entities, options) {
    const textColor = 0x000000b2;
    const show = options.debug;
    for (const e of entities) {
        batch.globalAlpha = 0.3;
        show.bounds && graphicsUtils_1.drawBounds(batch, e, e.bounds, colors_1.ORANGE);
        show.cover && graphicsUtils_1.drawBounds(batch, e, e.coverBounds, colors_1.BLUE);
        show.interact && graphicsUtils_1.drawBounds(batch, e, e.interactBounds, colors_1.PURPLE);
        show.trigger && graphicsUtils_1.drawWorldBounds(batch, e, e.triggerBounds, colors_1.CYAN);
        if (show.collider) {
            batch.globalAlpha = 0.5;
            const x = Math.floor(e.x * constants_1.tileWidth);
            const y = Math.floor(e.y * constants_1.tileHeight);
            if (e.colliders !== undefined) {
                for (const collider of e.colliders) {
                    const x1 = x + collider.x;
                    const x2 = x + collider.x + collider.w;
                    const y1 = y + collider.y;
                    const y2 = y + collider.y + collider.h;
                    batch.drawRect(collider.tall ? colors_1.RED : colors_1.HOTPINK, x1, y1, x2 - x1, y2 - y1);
                }
            }
        }
        batch.globalAlpha = 1;
        batch.drawRect(colors_1.BLACK, positionUtils_1.toScreenX(e.x), positionUtils_1.toScreenY(e.y), 1, 1); // anchor
        if (show.id) {
            graphicsUtils_1.drawPixelText(batch, positionUtils_1.toScreenX(e.x) + 2, positionUtils_1.toScreenY(e.y) + 2, textColor, e.id.toFixed());
        }
    }
}
function drawDebugInWater(batch, map, camera) {
    const color = color_1.withAlphaFloat(colors_1.ORANGE, 0.4);
    worldMap_1.forEachRegion(map, region => {
        const sx = positionUtils_1.toScreenX(region.x * constants_1.REGION_SIZE);
        const sy = positionUtils_1.toScreenY(region.y * constants_1.REGION_SIZE);
        const w = constants_1.REGION_WIDTH;
        const h = constants_1.REGION_HEIGHT;
        const cameraLeft = camera.x;
        const cameraRight = camera.x + camera.w;
        const cameraTop = camera.actualY;
        const cameraBottom = camera.actualY + camera.h;
        if (sx > cameraRight || sy > cameraBottom || (sx + w) < cameraLeft || (sy + h) < cameraTop)
            return;
        for (let y = 0; y < h; y++) {
            if ((sy + y + 1) < cameraTop || (sy + y) > cameraBottom)
                continue;
            for (let x = 0; x < w; x++) {
                if ((sx + x + 1) < cameraLeft || (sx + x) > cameraRight)
                    continue;
                const tx = x;
                while (worldMap_1.isInWaterAt(map, positionUtils_1.toWorldX(sx + x + 0.5), positionUtils_1.toWorldY(sy + y + 0.5)) && x < w) {
                    x++;
                }
                if (x > tx) {
                    batch.drawRect(color, sx + tx, sy + y, x - tx, 1);
                }
            }
        }
    });
}
function drawDebugCollider(batch, map, camera) {
    const color = color_1.withAlphaFloat(colors_1.PURPLE, 0.4);
    worldMap_1.forEachRegion(map, ({ x, y, collider }) => {
        const sx = positionUtils_1.toScreenX(x * constants_1.REGION_SIZE);
        const sy = positionUtils_1.toScreenY(y * constants_1.REGION_SIZE);
        const w = constants_1.REGION_WIDTH;
        const h = constants_1.REGION_HEIGHT;
        const cameraLeft = camera.x;
        const cameraRight = camera.x + camera.w;
        const cameraTop = camera.actualY;
        const cameraBottom = camera.actualY + camera.h;
        if (sx > cameraRight || sy > cameraBottom || (sx + w) < cameraLeft || (sy + h) < cameraTop)
            return;
        for (let y = 0; y < h; y++) {
            if ((sy + y + 1) < cameraTop || (sy + y) > cameraBottom)
                continue;
            for (let x = 0; x < w; x++) {
                if ((sx + x + 1) < cameraLeft || (sx + x) > cameraRight)
                    continue;
                const tx = x;
                while (collider[x + y * w] !== 0 && x < w) {
                    x++;
                }
                if (x > tx) {
                    batch.drawRect(color, sx + tx, sy + y, x - tx, 1);
                }
            }
        }
    });
}
function drawDebugRegions(batch, map, player, { w, h }) {
    const rw = 10;
    const rh = 8;
    const width = rw * map.regionsX;
    const height = rh * map.regionsY;
    const x = w - width - 10;
    const y = h - height - 30;
    for (let i = 0; i < map.regionsY; i++) {
        for (let j = 0; j < map.regionsX; j++) {
            if (worldMap_1.getRegion(map, j, i)) {
                const inside = j === Math.floor(player.x / constants_1.REGION_SIZE) && i === Math.floor(player.y / constants_1.REGION_SIZE);
                batch.drawRect(inside ? colors_1.ORANGE : colors_1.RED, x + rw * j, y + rh * i, rw, rh);
            }
        }
    }
    for (let i = 0; i <= map.regionsY; i++) {
        batch.drawRect(colors_1.GRAY, x, y + rh * i, width + 1, 1);
    }
    for (let i = 0; i <= map.regionsX; i++) {
        batch.drawRect(colors_1.GRAY, x + rw * i, y, 1, height);
    }
}
exports.drawDebugRegions = drawDebugRegions;
//# sourceMappingURL=draw.js.map