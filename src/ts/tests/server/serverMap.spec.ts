import '../lib';
import { expect } from 'chai';
import { createServerMap } from '../../server/serverMap';
import { getRegion, getRegionGlobal } from '../../common/worldMap';
import { ServerMap } from '../../server/serverInterfaces';

describe('serverMap', () => {
	let map: ServerMap;

	beforeEach(() => {
		map = createServerMap('', 0, 10, 10);
	});

	it('throws when provided zero size for any of the parameters', () => {
		expect(() => createServerMap('', 0, 0, 1)).throw('Invalid map parameters');
		expect(() => createServerMap('', 0, 1, 0)).throw('Invalid map parameters');
	});

	it('gets total width of map', () => {
		expect(map.width).equal(80);
	});

	it('gets total height of map', () => {
		expect(map.height).equal(80);
	});

	describe('getRegion()', () => {
		it('returns region', () => {
			expect(getRegion(map, 0, 0)).equal(map.regions[0]);
		});

		it('throws if out of range', () => {
			expect(() => getRegion(map, -1, 0)).throw('Invalid region coords (-1, 0)');
			expect(() => getRegion(map, 0, -1)).throw('Invalid region coords (0, -1)');
			expect(() => getRegion(map, 99, 0)).throw('Invalid region coords (99, 0)');
			expect(() => getRegion(map, 0, 99)).throw('Invalid region coords (0, 99)');
		});
	});

	describe('getRegionGlobal()', () => {
		it('returns region at given position', () => {
			expect(getRegionGlobal(map, 0.5, 8.5)).equal(getRegion(map, 0, 1));
		});

		it('clamps position outside of the map (1)', () => {
			expect(getRegionGlobal(map, -0.5, -10)).equal(getRegion(map, 0, 0));
		});

		it('clamps position outside of the map (2)', () => {
			expect(getRegionGlobal(map, 1000, 2000)).equal(getRegion(map, 9, 9));
		});
	});
});
