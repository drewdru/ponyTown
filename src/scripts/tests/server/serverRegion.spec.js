"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const serverRegion_1 = require("../../server/serverRegion");
const mocks_1 = require("../mocks");
const region_1 = require("../../common/region");
describe('serverRegion', () => {
    let region;
    beforeEach(() => {
        region = serverRegion_1.createServerRegion(1, 2);
    });
    it('has correct bounds', () => {
        chai_1.expect(region.bounds).eql({ x: 8, y: 16, w: 8, h: 8 });
    });
    it('has correct boundsWithBorder', () => {
        chai_1.expect(region.boundsWithBorder).eql({ x: 7, y: 15, w: 10, h: 10 });
    });
    it('sets and gets tile at given position', () => {
        serverRegion_1.setRegionTile({}, region, 1, 2, 2 /* Grass */);
        chai_1.expect(region_1.getRegionTile(region, 1, 2)).equal(2 /* Grass */);
    });
    describe('addUpdate()', () => {
        it('adds entity update to update list', () => {
            const entity = mocks_1.serverEntity(1, 5, 4);
            serverRegion_1.pushUpdateEntityToRegion(region, { entity, flags: 1 /* Position */, x: 5, y: 4, vx: 0, vy: 0 });
            chai_1.expect(region.entityUpdates).eql([
                {
                    entity,
                    flags: 1 /* Position */,
                    x: 5,
                    y: 4,
                    vx: 0,
                    vy: 0,
                    action: 0,
                    playerState: 0,
                    options: undefined,
                },
            ]);
        });
        it('updates existing entity update', () => {
            const entity = mocks_1.serverEntity(1, 5, 4);
            serverRegion_1.pushUpdateEntityToRegion(region, { entity, flags: 0 /* None */ });
            serverRegion_1.pushUpdateEntityToRegion(region, { entity, flags: 1 /* Position */ | 8 /* Expression */, x: 10, y: 11, vx: 5, vy: 3 });
            chai_1.expect(region.entityUpdates).eql([
                {
                    entity,
                    flags: 1 /* Position */ | 8 /* Expression */,
                    x: 10,
                    y: 11,
                    vx: 5,
                    vy: 3,
                    action: 0,
                    playerState: 0,
                    options: undefined,
                },
            ]);
        });
        it('does not update position of existing entry if position flag is false', () => {
            const entity = mocks_1.serverEntity(1, 5, 4);
            serverRegion_1.pushUpdateEntityToRegion(region, { entity, flags: 1 /* Position */, x: 5, y: 4, vx: 0, vy: 0 });
            entity.x = 10;
            entity.y = 11;
            entity.vx = 5;
            entity.vy = 3;
            serverRegion_1.pushUpdateEntityToRegion(region, { entity, flags: 8 /* Expression */ });
            chai_1.expect(region.entityUpdates).eql([
                {
                    entity,
                    flags: 1 /* Position */ | 8 /* Expression */,
                    x: 5,
                    y: 4,
                    vx: 0,
                    vy: 0,
                    action: 0,
                    playerState: 0,
                    options: undefined,
                },
            ]);
        });
    });
    describe('addRemove()', () => {
        it('adds entity remove to remove list', () => {
            serverRegion_1.pushRemoveEntityToRegion(region, mocks_1.serverEntity(123));
            chai_1.expect(region.entityRemoves).eql([123]);
        });
    });
    describe('resetRegionUpdates()', () => {
        it('resets all update lists to empty lists', () => {
            region.entityUpdates = [{}, {}];
            region.entityRemoves = [{}, {}];
            region.tileUpdates = [{}, {}];
            serverRegion_1.resetRegionUpdates(region);
            chai_1.expect(region.entityUpdates).eql([]);
            chai_1.expect(region.entityRemoves).eql([]);
            chai_1.expect(region.tileUpdates).eql([]);
        });
    });
});
//# sourceMappingURL=serverRegion.spec.js.map