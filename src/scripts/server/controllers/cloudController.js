"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../common/constants");
const utils_1 = require("../../common/utils");
const entities_1 = require("../../common/entities");
const sprites = require("../../generated/sprites");
const entityUtils_1 = require("../entityUtils");
const timing_1 = require("../timing");
const spriteWidth = sprites.cloud.shadow.w / constants_1.tileWidth;
const cloudVX = -0.5;
class CloudController {
    constructor(world, map, cloudCount) {
        this.world = world;
        this.map = map;
        this.cloudCount = cloudCount;
        this.clouds = [];
        this.initialized = false;
    }
    initialize() {
        if (this.initialized)
            return;
        for (let i = 0; i < this.cloudCount; i++) {
            this.addCloud(false, this.world.now / 1000);
        }
        this.initialized = true;
    }
    update(_, now) {
        timing_1.timingStart('CloudController.update()');
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const cloud = this.clouds[i];
            if (cloud.x < -spriteWidth) {
                this.clouds.splice(i, 1);
                this.world.removeEntity(cloud, this.map);
            }
        }
        if (this.clouds.length < this.cloudCount) {
            this.addCloud(true, now);
        }
        timing_1.timingEnd();
    }
    addCloud(end, timestamp) {
        const x = end ? this.map.width + spriteWidth : this.map.width * Math.random();
        const y = this.map.height * Math.random();
        const entity = entities_1.cloud(x, y);
        if (!this.clouds.some(c => utils_1.entitiesIntersect(c, entity))) {
            this.clouds.push(this.world.addEntity(entity, this.map));
            entityUtils_1.updateEntityVelocity(entity, cloudVX, 0, timestamp);
        }
    }
}
exports.CloudController = CloudController;
//# sourceMappingURL=cloudController.js.map