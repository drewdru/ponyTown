"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timeUtils_1 = require("../../common/timeUtils");
const timing_1 = require("../timing");
const controllerUtils_1 = require("../controllerUtils");
const utils_1 = require("../../common/utils");
class TorchController {
    constructor(world, map) {
        this.world = world;
        this.map = map;
        this.lights = [];
    }
    initialize() {
        this.lights = [];
        for (const region of this.map.regions) {
            for (const entity of region.entities) {
                if (utils_1.hasFlag(entity.flags, 1024 /* OnOff */)) {
                    this.lights.push(entity);
                }
            }
        }
    }
    update() {
        timing_1.timingStart('TorchController.update()');
        timing_1.timingEnd();
    }
    sparseUpdate() {
        timing_1.timingStart('TorchController.sparseUpdate()');
        controllerUtils_1.updateLights(this.lights, timeUtils_1.isNight(this.world.time));
        timing_1.timingEnd();
    }
}
exports.TorchController = TorchController;
//# sourceMappingURL=torchController.js.map