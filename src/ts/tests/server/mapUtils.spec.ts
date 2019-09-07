import '../lib';
import { expect } from 'chai';
import { createServerMap, findEntities, findClosestEntity } from '../../server/serverMap';
import { serverEntity } from '../mocks';
import { ServerEntity, ServerMap, ServerRegion } from '../../server/serverInterfaces';
import { addEntityToRegion } from '../../server/serverRegion';
import { getRegion } from '../../common/worldMap';

describe('mapUtils', () => {
	let map: ServerMap;

	function addEntities(region: ServerRegion, ...entities: ServerEntity[]) {
		entities.forEach(e => addEntityToRegion(region, e, map));
	}

	beforeEach(() => {
		map = createServerMap('', 0, 10, 10);
	});

	describe('findEntities()', () => {
		it('returns all entities matching given predicate (1)', () => {
			const entity = serverEntity(3);
			addEntities(getRegion(map, 3, 4), serverEntity(1), serverEntity(2), entity);

			expect(findEntities(map, e => e.id === 3)).eql([entity]);
		});

		it('returns all entities matching given predicate (2)', () => {
			const entity3 = serverEntity(3);
			const entity2 = serverEntity(3);
			addEntities(getRegion(map, 3, 4), serverEntity(1), entity2, entity3);

			expect(findEntities(map, e => e.id > 1)).eql([entity2, entity3]);
		});

		it('returns empty array if not found', () => {
			expect(findEntities(map, e => e.id === 3)).eql([]);
		});
	});

	describe('findClosestEntity()', () => {
		it('returns undefined for empty map', () => {
			const map = createServerMap('', 0, 1, 1);

			const result = findClosestEntity(map, 0, 0, () => true);

			expect(result).undefined;
		});

		it('returns first matching entity (first)', () => {
			const map = createServerMap('', 0, 1, 1);
			const entity = serverEntity(1);
			map.regions[0].entities.push(entity);

			const result = findClosestEntity(map, 0, 0, () => true);

			expect(result).equal(entity);
		});

		it('returns first matching entity (second)', () => {
			const map = createServerMap('', 0, 1, 1);
			const entity1 = serverEntity(1);
			const entity2 = serverEntity(2);
			map.regions[0].entities.push(entity1, entity2);

			const result = findClosestEntity(map, 0, 0, e => e.id === 2);

			expect(result).equal(entity2);
		});

		it('returns first matching entity (in 2nd region)', () => {
			const map = createServerMap('', 0, 2, 2);
			const entity1 = serverEntity(1);
			const entity2 = serverEntity(2);
			map.regions[0].entities.push(entity1);
			map.regions[1].entities.push(entity2);

			const result = findClosestEntity(map, 0, 0, e => e.id === 2);

			expect(result).equal(entity2);
		});

		it('returns closest matching entity (2nd is closest)', () => {
			const map = createServerMap('', 0, 1, 1);
			const entity1 = serverEntity(1, 0, 0);
			const entity2 = serverEntity(2, 1, 1);
			map.regions[0].entities.push(entity1, entity2);

			const result = findClosestEntity(map, 1, 1, () => true);

			expect(result).equal(entity2);
		});

		it('stops searching if found in first region', () => {
			const map = createServerMap('', 0, 2, 2);
			const entity1 = serverEntity(1, 0, 0);
			const entity2 = serverEntity(2, 11, 11);
			map.regions[0].entities.push(entity1);
			map.regions[1].entities.push(entity2);
			let checks = 0;

			const result = findClosestEntity(map, 1, 1, () => (checks++ , true));

			expect(checks).equal(1);
			expect(result).equal(entity1);
		});

		it('searches for entity in ring pattern', () => {
			const map = createServerMap('', 0, 5, 5);

			for (let y = 0; y < 5; y++) {
				for (let x = 0; x < 5; x++) {
					getRegion(map, x, y).entities.push(serverEntity(0, x * 8 + 1, y * 8 + 1, 1, { name: `${x},${y}` }));
				}
			}

			let checks: string[] = [];

			const result = findClosestEntity(map, map.width / 2, map.height / 2, e => (checks.push(e.name!), false));

			expect(checks).eql([
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
			expect(result).undefined;
		});
	});
});
