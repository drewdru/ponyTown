"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timing_1 = require("../timing");
class UpdateController {
    constructor(map) {
        this.map = map;
        this.updatables = [];
    }
    initialize() {
        this.updatables = [];
        for (const region of this.map.regions) {
            for (const entity of region.entities) {
                if (entity.serverUpdate) {
                    this.updatables.push(entity);
                }
            }
        }
    }
    update(delta, now) {
        timing_1.timingStart('TorchController.update()');
        for (const entity of this.updatables) {
            entity.serverUpdate(delta, now);
        }
        timing_1.timingEnd();
    }
}
exports.UpdateController = UpdateController;
//# sourceMappingURL=updateController.js.map