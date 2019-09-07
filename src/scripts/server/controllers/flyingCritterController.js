"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const serverMap_1 = require("../serverMap");
const timing_1 = require("../timing");
const utils_1 = require("../../common/utils");
const entityUtils_1 = require("../entityUtils");
const collectableController_1 = require("./collectableController");
class FlyingCritterController {
    constructor(world, map, critter, speed, limit, isActive, spawnOnStart = false) {
        this.world = world;
        this.map = map;
        this.critter = critter;
        this.speed = speed;
        this.limit = limit;
        this.isActive = isActive;
        this.spawnOnStart = spawnOnStart;
        this.entities = [];
    }
    initialize() {
        if (this.spawnOnStart) {
            for (let i = 0; i < this.limit; i++) {
                const { x, y } = collectableController_1.randomPosition(this.map);
                this.entities.push(this.world.addEntity(this.critter(x, y), this.map));
            }
        }
    }
    update(_, now) {
        timing_1.timingStart('FlyingCritterController.update()');
        updateTreehidingEntities(this.entities, this.world, this.map, this.limit, this.speed, now, this.critter, this.isActive);
        timing_1.timingEnd();
    }
}
exports.FlyingCritterController = FlyingCritterController;
function isTreeCrown(entity) {
    return utils_1.hasFlag(entity.serverFlags || 0, 1 /* TreeCrown */);
}
function findClosestTree(map, x, y) {
    return serverMap_1.findClosestEntity(map, x, y, isTreeCrown);
}
exports.findClosestTree = findClosestTree;
function findTrees(map) {
    return serverMap_1.findEntities(map, isTreeCrown);
}
exports.findTrees = findTrees;
function updateTreehidingEntities(entities, world, map, limit, speed, timestamp, create, isActive) {
    const offsetY = -2;
    if (isActive()) {
        // release new critter
        if (entities.length < limit && Math.random() < 0.1) {
            const trees = findTrees(map);
            const tree = lodash_1.sample(trees);
            if (tree) {
                const entity = create(tree.x, tree.y + offsetY);
                entities.push(world.addEntity(entity, map));
                entityUtils_1.moveRandomly(map, entity, speed, 1, timestamp);
            }
        }
        for (const entity of entities) {
            entityUtils_1.moveRandomly(map, entity, speed, 0.02, timestamp);
        }
    }
    else if (entities.length) {
        // head to tree and disappear
        const trees = findTrees(map);
        for (let i = entities.length - 1; i >= 0; i--) {
            const e = entities[i];
            e.targetTree = e.targetTree || entityUtils_1.findClosest(e.x, e.y, trees);
            if (utils_1.distanceXY(e.x, e.y, e.targetTree.x, e.targetTree.y + offsetY) < 0.1) {
                entities.splice(i, 1);
                world.removeEntity(e, map);
            }
            else {
                entityUtils_1.moveTowards(e, e.targetTree.x, e.targetTree.y + offsetY, speed, timestamp);
            }
        }
    }
}
exports.updateTreehidingEntities = updateTreehidingEntities;
//# sourceMappingURL=flyingCritterController.js.map