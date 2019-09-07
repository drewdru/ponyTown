"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const entities_1 = require("../../common/entities");
const db_1 = require("../db");
const constants_1 = require("../../common/constants");
const entityUtils_1 = require("../entityUtils");
const characterUtils_1 = require("../characterUtils");
const camera_1 = require("../../common/camera");
const movementUtils_1 = require("../../common/movementUtils");
const timing_1 = require("../timing");
const chat_1 = require("../chat");
class PerfController {
    constructor(world, options) {
        this.world = world;
        this.options = options;
        this.entities = [];
        this.limitLeft = 11;
        this.limitWidth = 30;
        this.limitTop = 9;
        this.limitHeight = 25;
        this.initialized = false;
        if (options.spread) {
            this.limitWidth = 60;
            this.limitHeight = 60;
        }
        if (options.x !== undefined) {
            this.limitLeft = options.x;
        }
        if (options.y !== undefined) {
            this.limitTop = options.y;
        }
    }
    initialize() {
        if (this.initialized)
            return;
        const world = this.world;
        const map = world.getMainMap();
        const names = [
            'performance',
            'performance 2',
        ];
        const query = this.options.unique ?
            Promise.resolve(db_1.Character.find({ account: '57ae2336a67f4dc52e123ed1' }).limit(this.options.count).exec()) :
            Promise.all(names.map(name => db_1.Character.findOne({ name }).exec())).then(lodash_1.compact);
        query
            .then(characters => {
            if (characters.length) {
                this.entities = lodash_1.range(this.options.count).map(i => {
                    const character = characters[i % characters.length];
                    const name = character._id.toString();
                    const x = this.limitLeft + this.limitWidth * Math.random();
                    const y = this.limitTop + this.limitHeight * Math.random();
                    const p = entities_1.pony(x, y);
                    entityUtils_1.setEntityName(p, name);
                    p.flags |= 64 /* CanCollide */;
                    p.encryptedInfoSafe = characterUtils_1.encryptInfo(character.info || '');
                    p.client = {
                        pony: p,
                        accountId: 'foobar',
                        characterId: character._id.toString(),
                        ignores: new Set(),
                        hides: new Set(),
                        permaHides: new Set(),
                        account: {},
                        regions: [],
                        camera: camera_1.createCamera(),
                        updateRegion() { },
                        addEntity() { },
                        mapTest() { },
                    };
                    p.client.camera.x = -10000;
                    p.vx = this.options.moving ? randomVelocity() : 0;
                    p.vy = this.options.moving ? randomVelocity() : 0;
                    p.state = movementUtils_1.shouldBeFacingRight(p) ? 2 /* FacingRight */ : 0 /* None */;
                    return world.addEntity(p, map);
                });
            }
        });
        this.initialized = true;
    }
    update(_, now) {
        timing_1.timingStart('PerfController.update()');
        const limitBottom = this.limitTop + this.limitHeight;
        const limitRight = this.limitTop + this.limitHeight;
        if (this.options.moving) {
            for (const entity of this.entities) {
                if ((entity.vy > 0 && entity.y > limitBottom) || (entity.vy < 0 && entity.y < this.limitTop)) {
                    entityUtils_1.updateEntityVelocity(entity, entity.vx, -entity.vy, now);
                }
                else if ((entity.vx > 0 && entity.x > limitRight) || (entity.vx < 0 && entity.x < this.limitLeft)) {
                    entityUtils_1.updateEntityVelocity(entity, -entity.vx, entity.vy, now);
                }
                else if (Math.random() < 0.1) {
                    entityUtils_1.updateEntityVelocity(entity, randomVelocity(), randomVelocity(), now);
                }
                if (this.options.saying && Math.random() < 0.01) {
                    chat_1.sayToAll(entity, 'Hello World', 'Hello World', 0 /* Chat */, {});
                }
            }
        }
        timing_1.timingEnd();
    }
}
exports.PerfController = PerfController;
function randomVelocity() {
    const rand = Math.random();
    return rand < 0.333 ? 0 : (rand < 0.666 ? -constants_1.PONY_SPEED_TROT : +constants_1.PONY_SPEED_TROT);
}
//# sourceMappingURL=perfController.js.map