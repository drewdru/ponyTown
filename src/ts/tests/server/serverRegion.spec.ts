import '../lib';
import { expect } from 'chai';
import {
	resetRegionUpdates, setRegionTile, pushUpdateEntityToRegion, pushRemoveEntityToRegion, createServerRegion
} from '../../server/serverRegion';
import { serverEntity } from '../mocks';
import { TileType, UpdateFlags } from '../../common/interfaces';
import { getRegionTile } from '../../common/region';
import { ServerRegion, EntityUpdate } from '../../server/serverInterfaces';

describe('serverRegion', () => {
	let region: ServerRegion;

	beforeEach(() => {
		region = createServerRegion(1, 2);
	});

	it('has correct bounds', () => {
		expect(region.bounds).eql({ x: 8, y: 16, w: 8, h: 8 });
	});

	it('has correct boundsWithBorder', () => {
		expect(region.boundsWithBorder).eql({ x: 7, y: 15, w: 10, h: 10 });
	});

	it('sets and gets tile at given position', () => {
		setRegionTile({} as any, region, 1, 2, TileType.Grass);

		expect(getRegionTile(region, 1, 2)).equal(TileType.Grass);
	});

	describe('addUpdate()', () => {
		it('adds entity update to update list', () => {
			const entity = serverEntity(1, 5, 4);

			pushUpdateEntityToRegion(region, { entity, flags: UpdateFlags.Position, x: 5, y: 4, vx: 0, vy: 0 });

			expect(region.entityUpdates).eql(<EntityUpdate[]>[
				{
					entity,
					flags: UpdateFlags.Position,
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
			const entity = serverEntity(1, 5, 4);
			pushUpdateEntityToRegion(region, { entity, flags: UpdateFlags.None });

			pushUpdateEntityToRegion(region, { entity, flags: UpdateFlags.Position | UpdateFlags.Expression, x: 10, y: 11, vx: 5, vy: 3 });

			expect(region.entityUpdates).eql(<EntityUpdate[]>[
				{
					entity,
					flags: UpdateFlags.Position | UpdateFlags.Expression,
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
			const entity = serverEntity(1, 5, 4);
			pushUpdateEntityToRegion(region, { entity, flags: UpdateFlags.Position, x: 5, y: 4, vx: 0, vy: 0 });
			entity.x = 10;
			entity.y = 11;
			entity.vx = 5;
			entity.vy = 3;

			pushUpdateEntityToRegion(region, { entity, flags: UpdateFlags.Expression });

			expect(region.entityUpdates).eql(<EntityUpdate[]>[
				{
					entity,
					flags: UpdateFlags.Position | UpdateFlags.Expression,
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
			pushRemoveEntityToRegion(region, serverEntity(123));

			expect(region.entityRemoves).eql([123]);
		});
	});

	describe('resetRegionUpdates()', () => {
		it('resets all update lists to empty lists', () => {
			region.entityUpdates = [{}, {}] as any;
			region.entityRemoves = [{}, {}] as any;
			region.tileUpdates = [{}, {}] as any;

			resetRegionUpdates(region);

			expect(region.entityUpdates).eql([]);
			expect(region.entityRemoves).eql([]);
			expect(region.tileUpdates).eql([]);
		});
	});
});
