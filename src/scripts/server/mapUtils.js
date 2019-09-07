"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const positionUtils_1 = require("../common/positionUtils");
const worldMap_1 = require("../common/worldMap");
const serverRegion_1 = require("./serverRegion");
const entities = require("../common/entities");
const tileUtils_1 = require("../client/tileUtils");
const region_1 = require("../common/region");
const constants_1 = require("../common/constants");
const chat_1 = require("./chat");
const entityUtils_1 = require("./entityUtils");
const accountUtils_1 = require("./accountUtils");
const utils_1 = require("../common/utils");
const playerUtils_1 = require("./playerUtils");
const lodash_1 = require("lodash");
const serverMap_1 = require("./serverMap");
const collectableController_1 = require("./controllers/collectableController");
exports.worldForTemplates = {
    featureFlags: {},
    addEntity(entity, map) {
        positionUtils_1.roundPosition(entity);
        const region = worldMap_1.getRegionGlobal(map, entity.x, entity.y);
        entity.region = region;
        serverRegion_1.addEntityToRegion(region, entity, map);
        return entity;
    },
    removeEntity(entity, map) {
        let removed = false;
        if (entity.region) {
            removed = serverRegion_1.removeEntityFromRegion(entity.region, entity, map);
        }
        return removed;
    },
};
function addSpawnPointIndicators(world, map) {
    const addSpawn = ({ x, y, w, h }) => {
        world.addEntity(entities.spawnPole(x, y), map);
        if (w && h) {
            world.addEntity(entities.spawnPole(x + w, y), map);
            world.addEntity(entities.spawnPole(x, y + h), map);
            world.addEntity(entities.spawnPole(x + w, y + h), map);
        }
    };
    addSpawn(map.spawnArea);
    for (const spawn of Array.from(map.spawns.values())) {
        addSpawn(spawn);
    }
}
exports.addSpawnPointIndicators = addSpawnPointIndicators;
function generateTileIndicesAndColliders(map) {
    for (const region of map.regions) {
        serverRegion_1.getRegionTiles(region); // initialize encodedTiles
        if (region.tilesDirty) {
            tileUtils_1.updateTileIndices(region, map);
        }
    }
    for (const region of map.regions) {
        if (region.colliderDirty) {
            region_1.generateRegionCollider(region, map);
        }
    }
}
exports.generateTileIndicesAndColliders = generateTileIndicesAndColliders;
function removePonies(entities) {
    for (let i = entities.length - 1; i >= 0; i--) {
        if (entities[i].type === constants_1.PONY_TYPE) {
            entities.splice(i, 1);
        }
    }
}
exports.removePonies = removePonies;
function createDirectionSign(x, y, config) {
    const result = [];
    const options = { sign: {} };
    const lines = [];
    const { w = [], e = [], s = [], n = [] } = config;
    const max = lodash_1.clamp(Math.max(w.length, e.length, s.length, n.length), 3, 5);
    const skip = 5 - max;
    function parse(entries, arrow, plates, ox) {
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            if (e) {
                lines.push(`${arrow} ${e.name}`);
                const nameplate = plates[i](x + ox / constants_1.tileWidth, y);
                entityUtils_1.setEntityName(nameplate, e.name);
                result.push(nameplate);
            }
        }
    }
    if (config.r) {
        options.sign.r = config.r;
    }
    const ups = config.r ? entities.directionSignUpsRight : entities.directionSignUpsLeft;
    const downs = config.r ? entities.directionSignDownsLeft : entities.directionSignDownsRight;
    if (config.n) {
        options.sign.n = config.n.map(x => x ? x.icon : -1);
        parse(config.n, '↑', ups.slice(skip), 0);
    }
    if (config.w) {
        options.sign.w = config.w.map(x => x ? x.icon : -1);
        parse(config.w, '←', entities.directionSignLefts.slice(skip), -10);
    }
    if (config.e) {
        options.sign.e = config.e.map(x => x ? x.icon : -1);
        parse(config.e, '→', entities.directionSignRights.slice(skip), 10);
    }
    if (config.s) {
        options.sign.s = config.s.map(x => x ? x.icon : -1);
        parse(config.s, '↓', downs.slice(skip), 0);
    }
    const text = lines.join('\n');
    const entity = entities.directionSign(x, y, options);
    entity.interact = (entity, client) => chat_1.sayTo(client, entity, text, 1 /* System */);
    result.push(entity);
    return result;
}
exports.createDirectionSign = createDirectionSign;
const patchTypes = [
    entities.cloverPatch3, entities.cloverPatch4, entities.cloverPatch5, entities.cloverPatch6, entities.cloverPatch7
].map(x => x.type);
const eggBasketTypes = entities.eggBaskets.map(b => b.type);
function pickCandy(client) {
    let count = 0;
    accountUtils_1.updateAccountState(client.account, state => state.candies = count = utils_1.toInt(state.candies) + 1);
    chat_1.saySystem(client, `${count} 🍬`);
}
exports.pickCandy = pickCandy;
function pickGift(client) {
    let count = 0;
    accountUtils_1.updateAccountState(client.account, state => state.gifts = count = utils_1.toInt(state.gifts) + 1);
    chat_1.saySystem(client, `${count} 🎁`);
    playerUtils_1.holdItem(client.pony, entities.gift2.type);
}
exports.pickGift = pickGift;
function pickClover(client) {
    let count = 0;
    accountUtils_1.updateAccountState(client.account, state => state.clovers = count = utils_1.toInt(state.clovers) + 1);
    chat_1.saySystem(client, `${count} 🍀`);
    playerUtils_1.holdItem(client.pony, entities.cloverPick.type);
}
exports.pickClover = pickClover;
function pickEgg(client) {
    let count = 0;
    accountUtils_1.updateAccountState(client.account, state => state.eggs = count = utils_1.toInt(state.eggs) + 1);
    chat_1.saySystem(client, `${count} 🥚`);
    if (Math.random() < 0.05) {
        const options = client.pony.options;
        const basketIndex = eggBasketTypes.indexOf(options.hold || 0);
        if (basketIndex >= 0 && basketIndex < (eggBasketTypes.length - 1)) {
            playerUtils_1.holdItem(client.pony, eggBasketTypes[basketIndex + 1]);
        }
    }
}
exports.pickEgg = pickEgg;
function pickEntity(client, entity) {
    playerUtils_1.holdItem(client.pony, entity.type);
}
exports.pickEntity = pickEntity;
function checkLantern(client) {
    const options = client.pony.options;
    const canPick = options.hold === entities.jackoLanternOn.type || options.hold === entities.jackoLanternOff.type;
    if (!canPick) {
        chat_1.saySystem(client, 'Get a lantern to collect candies');
    }
    return canPick;
}
exports.checkLantern = checkLantern;
function checkBasket(client) {
    const options = client.pony.options;
    const canPick = utils_1.includes(eggBasketTypes, options.hold);
    if (!canPick) {
        chat_1.saySystem(client, 'Get a basket to collect eggs');
    }
    return canPick;
}
exports.checkBasket = checkBasket;
function checkNotCollecting(client) {
    const options = client.pony.options;
    const canPick = utils_1.includes(eggBasketTypes, options.hold) ||
        options.hold === entities.jackoLanternOn.type ||
        options.hold === entities.jackoLanternOff.type;
    return !canPick;
}
exports.checkNotCollecting = checkNotCollecting;
function positionClover(map) {
    const patch = lodash_1.sample(serverMap_1.findEntities(map, e => utils_1.includes(patchTypes, e.type)));
    if (patch && patch.bounds) {
        const bounds = patch.bounds;
        const position = {
            x: patch.x + bounds.x / constants_1.tileWidth + lodash_1.random(0, bounds.w / constants_1.tileWidth, true),
            y: patch.y + bounds.y / constants_1.tileHeight + lodash_1.random(0, bounds.h / constants_1.tileHeight, true),
        };
        return position;
    }
    else {
        return collectableController_1.randomPosition(map);
    }
}
exports.positionClover = positionClover;
function createBunny(waypoints) {
    const { x, y } = waypoints[0];
    const entity = entities.bunny(x, y);
    const bunnySpeed = 2;
    let waypoint = 0;
    let sleepUntil = 0;
    entity.serverUpdate = (_delta, now) => {
        if (sleepUntil > now)
            return;
        const { x, y } = waypoints[waypoint];
        const reachedX = Math.abs(entity.x - x) < 0.2;
        const reachedY = Math.abs(entity.y - y) < 0.2;
        if (reachedX && reachedY) {
            const rand = Math.random();
            entityUtils_1.updateEntityVelocity(entity, 0, 0, now);
            if (rand < 0.1) {
                entityUtils_1.setEntityAnimation(entity, 3 /* Clean */);
                sleepUntil = now + 2;
            }
            else if (rand < 0.2) {
                entityUtils_1.setEntityAnimation(entity, 4 /* Look */);
                sleepUntil = now + 2;
            }
            else if (rand < 0.3) {
                entityUtils_1.setEntityAnimation(entity, 2 /* Blink */);
                sleepUntil = now + 2;
            }
            else if (rand < 0.6) {
                entityUtils_1.setEntityAnimation(entity, 0 /* Sit */);
                sleepUntil = now + 2;
            }
            else {
                waypoint = (waypoint + 1) % waypoints.length;
                entityUtils_1.setEntityAnimation(entity, 0 /* Sit */);
                sleepUntil = now + lodash_1.random(0.2, 2, true);
            }
        }
        else {
            const vx = reachedX ? 0 : (x < entity.x ? -bunnySpeed : bunnySpeed);
            const vy = reachedY ? 0 : (y < entity.y ? -bunnySpeed : bunnySpeed);
            if (entity.vx !== vx || entity.vy !== vy) {
                entityUtils_1.updateEntityVelocity(entity, vx, vy, now);
                entityUtils_1.setEntityAnimation(entity, 1 /* Walk */, vx === 0 ? undefined : vx > 0);
            }
        }
    };
    if (DEVELOPMENT && false) {
        return [entity, ...waypoints.map(({ x, y }) => entities.routePole(x, y))];
    }
    else {
        return [entity];
    }
}
exports.createBunny = createBunny;
//# sourceMappingURL=mapUtils.js.map