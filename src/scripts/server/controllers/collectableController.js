"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const timing_1 = require("../timing");
const entityUtils_1 = require("../entityUtils");
function randomPosition(map) {
    const x = Math.random() * map.width;
    const y = Math.random() * map.height;
    return { x, y };
}
exports.randomPosition = randomPosition;
class CollectableController {
    constructor(world, map, ctors, limit, pick, check = () => true, tries = 1, position = randomPosition, active = () => true) {
        this.world = world;
        this.map = map;
        this.ctors = ctors;
        this.limit = limit;
        this.pick = pick;
        this.check = check;
        this.tries = tries;
        this.position = position;
        this.active = active;
        this.items = [];
        this.interact = (entity, client) => {
            if (this.check(client)) {
                if (client.shadowed) {
                    entityUtils_1.pushRemoveEntityToClient(client, entity);
                }
                else {
                    lodash_1.remove(this.items, e => e === entity);
                    this.world.removeEntity(entity, this.map);
                    this.generateItem();
                    this.pick(client, entity);
                }
            }
        };
    }
    initialize() {
    }
    update() {
        timing_1.timingStart('CollectableController.update()');
        if (this.active()) {
            for (let i = 0; i < this.tries; i++) {
                if (this.items.length < this.limit) {
                    this.generateItem();
                }
            }
        }
        timing_1.timingEnd();
    }
    generateItem() {
        const { world, map } = this;
        const { x, y } = this.position(map);
        const ctor = lodash_1.sample(this.ctors);
        const entity = ctor(x, y);
        if (!entity.interactRange) {
            entity.interactRange = 1.5;
        }
        if (x > 0 && y > 0 && x < map.width && y < map.height && entityUtils_1.canPlaceItem(map, entity) && !entityUtils_1.canBePickedByPlayer(map, entity)) {
            entity.interact = this.interact;
            this.items.push(world.addEntity(entity, map));
        }
    }
}
exports.CollectableController = CollectableController;
//# sourceMappingURL=collectableController.js.map