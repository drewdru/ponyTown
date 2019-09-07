"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const serverMap_1 = require("../../server/serverMap");
const mocks_1 = require("../mocks");
const serverRegion_1 = require("../../server/serverRegion");
const worldMap_1 = require("../../common/worldMap");
describe('mapUtils', () => {
    let map;
    function addEntities(region, ...entities) {
        entities.forEach(e => serverRegion_1.addEntityToRegion(region, e, map));
    }
    beforeEach(() => {
        map = serverMap_1.createServerMap('', 0, 10, 10);
    });
    describe('findEntities()', () => {
        it('returns all entities matching given predicate (1)', () => {
            const entity = mocks_1.serverEntity(3);
            addEntities(worldMap_1.getRegion(map, 3, 4), mocks_1.serverEntity(1), mocks_1.serverEntity(2), entity);
            chai_1.expect(serverMap_1.findEntities(map, e => e.id === 3)).eql([entity]);
        });
        it('returns all entities matching given predicate (2)', () => {
            const entity3 = mocks_1.serverEntity(3);
            const entity2 = mocks_1.serverEntity(3);
            addEntities(worldMap_1.getRegion(map, 3, 4), mocks_1.serverEntity(1), entity2, entity3);
            chai_1.expect(serverMap_1.findEntities(map, e => e.id > 1)).eql([entity2, entity3]);
        });
        it('returns empty array if not found', () => {
            chai_1.expect(serverMap_1.findEntities(map, e => e.id === 3)).eql([]);
        });
    });
    describe('findClosestEntity()', () => {
        it('returns undefined for empty map', () => {
            const map = serverMap_1.createServerMap('', 0, 1, 1);
            const result = serverMap_1.findClosestEntity(map, 0, 0, () => true);
            chai_1.expect(result).undefined;
        });
        it('returns first matching entity (first)', () => {
            const map = serverMap_1.createServerMap('', 0, 1, 1);
            const entity = mocks_1.serverEntity(1);
            map.regions[0].entities.push(entity);
            const result = serverMap_1.findClosestEntity(map, 0, 0, () => true);
            chai_1.expect(result).equal(entity);
        });
        it('returns first matching entity (second)', () => {
            const map = serverMap_1.createServerMap('', 0, 1, 1);
            const entity1 = mocks_1.serverEntity(1);
            const entity2 = mocks_1.serverEntity(2);
            map.regions[0].entities.push(entity1, entity2);
            const result = serverMap_1.findClosestEntity(map, 0, 0, e => e.id === 2);
            chai_1.expect(result).equal(entity2);
        });
        it('returns first matching entity (in 2nd region)', () => {
            const map = serverMap_1.createServerMap('', 0, 2, 2);
            const entity1 = mocks_1.serverEntity(1);
            const entity2 = mocks_1.serverEntity(2);
            map.regions[0].entities.push(entity1);
            map.regions[1].entities.push(entity2);
            const result = serverMap_1.findClosestEntity(map, 0, 0, e => e.id === 2);
            chai_1.expect(result).equal(entity2);
        });
        it('returns closest matching entity (2nd is closest)', () => {
            const map = serverMap_1.createServerMap('', 0, 1, 1);
            const entity1 = mocks_1.serverEntity(1, 0, 0);
            const entity2 = mocks_1.serverEntity(2, 1, 1);
            map.regions[0].entities.push(entity1, entity2);
            const result = serverMap_1.findClosestEntity(map, 1, 1, () => true);
            chai_1.expect(result).equal(entity2);
        });
        it('stops searching if found in first region', () => {
            const map = serverMap_1.createServerMap('', 0, 2, 2);
            const entity1 = mocks_1.serverEntity(1, 0, 0);
            const entity2 = mocks_1.serverEntity(2, 11, 11);
            map.regions[0].entities.push(entity1);
            map.regions[1].entities.push(entity2);
            let checks = 0;
            const result = serverMap_1.findClosestEntity(map, 1, 1, () => (checks++, true));
            chai_1.expect(checks).equal(1);
            chai_1.expect(result).equal(entity1);
        });
        it('searches for entity in ring pattern', () => {
            const map = serverMap_1.createServerMap('', 0, 5, 5);
            for (let y = 0; y < 5; y++) {
                for (let x = 0; x < 5; x++) {
                    worldMap_1.getRegion(map, x, y).entities.push(mocks_1.serverEntity(0, x * 8 + 1, y * 8 + 1, 1, { name: `${x},${y}` }));
                }
            }
            let checks = [];
            const result = serverMap_1.findClosestEntity(map, map.width / 2, map.height / 2, e => (checks.push(e.name), false));
            chai_1.expect(checks).eql([
                '2,2',
                '1,1', '2,1', '3,1',
                '1,2', /*  */ '3,2',
                '1,3', '2,3', '3,3',
                '0,0', '1,0', '2,0', '3,0', '4,0',
                '0,1', /*                */ '4,1',
                '0,2', /*                */ '4,2',
                '0,3', /*                */ '4,3',
                '0,4', '1,4', '2,4', '3,4', '4,4',
            ]);
            chai_1.expect(result).undefined;
        });
    });
});
//# sourceMappingURL=mapUtils.spec.js.map