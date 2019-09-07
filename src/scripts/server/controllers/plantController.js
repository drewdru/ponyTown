"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const timing_1 = require("../timing");
const utils_1 = require("../../common/utils");
const worldMap_1 = require("../../common/worldMap");
class PlantController {
    constructor(world, map, config) {
        this.world = world;
        this.map = map;
        this.config = config;
        this.plants = [];
        this.interact = (entity, client) => {
            this.world.removeEntity(entity, this.map);
            utils_1.removeItem(this.plants, entity);
            this.config.onPick && this.config.onPick(entity, client);
        };
        this.nextSpawn = 0;
    }
    initialize() {
    }
    update() {
    }
    sparseUpdate() {
        timing_1.timingStart('PlantController.sparseUpdate()');
        const now = Date.now();
        const maxStage = this.config.stages.length - 1;
        if (this.nextSpawn < now &&
            (this.config.isActive === undefined || this.config.isActive()) &&
            this.plants.length < this.config.count) {
            const { x, y } = utils_1.randomPoint(this.config.area);
            if (this.config.growOnlyOn === undefined || worldMap_1.getTile(this.map, x, y) === this.config.growOnlyOn) {
                this.addPlant(x, y, 0);
                this.nextSpawn = now + lodash_1.random(10000, 20000);
            }
        }
        const plantsToRemove = [];
        for (const plant of this.plants) {
            if (plant.plantStage < maxStage && plant.plantStageNext < now) {
                plantsToRemove.push(plant);
                this.addPlant(plant.x, plant.y, plant.plantStage + 1);
            }
        }
        for (const plant of plantsToRemove) {
            this.removePlant(plant);
        }
        timing_1.timingEnd();
    }
    removePlant(plant) {
        utils_1.removeItem(this.plants, plant);
        this.world.removeEntity(plant, this.map);
    }
    addPlant(x, y, stage) {
        const create = lodash_1.sample(this.config.stages[stage]);
        const plant = create(x, y);
        plant.plantStage = stage;
        plant.plantStageNext = Date.now() + lodash_1.random(15000, 40000);
        plant.serverFlags = 2 /* DoNotSave */;
        if (stage === (this.config.stages.length - 1)) {
            plant.interact = this.interact;
        }
        this.plants.push(plant);
        this.world.addEntity(plant, this.map);
    }
}
exports.PlantController = PlantController;
//# sourceMappingURL=plantController.js.map