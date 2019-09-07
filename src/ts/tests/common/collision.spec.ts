import '../lib';
import { expect } from 'chai';
import { createServerMap } from '../../server/serverMap';
import { TileType, IMap, EntityFlags, Entity, Collider } from '../../common/interfaces';
import { entity, setupCollider } from '../mocks';
import { updatePosition } from '../../common/collision';
import { ServerRegion } from '../../server/serverInterfaces';
import { PONY_TYPE, tileWidth, tileHeight } from '../../common/constants';
import { generateRegionCollider } from '../../common/region';
import { ponyColliders } from '../../common/mixins';
import { updateTileIndices } from '../../client/tileUtils';

export function colliders(x: number, y: number, w: number, h: number, tall = true, exact = false): Collider[] {
	return [{ x, y, w, h, tall, exact }];
}

export function updateColliders(map: IMap<ServerRegion>) {
	for (const region of map.regions) {
		updateTileIndices(region, map);
	}

	for (const region of map.regions) {
		generateRegionCollider(region, map);
	}
}

describe('collision', () => {
	describe('updatePosition()', () => {
		let map: IMap<ServerRegion>;
		let ent: Entity;

		beforeEach(() => {
			map = createServerMap('', 0, 10, 10, TileType.Dirt);
			ent = entity(1, 0, 0, PONY_TYPE);
			ent.colliders = colliders(0, 0, tileWidth, tileHeight);
		});

		it('does not update position if not moving', () => {
			updatePosition(ent, 1, map);

			expect(ent.x).equal(0);
			expect(ent.y).equal(0);
		});

		it('updates position if moving', () => {
			ent.vx = 2;
			ent.vy = 1;

			updatePosition(ent, 1, map);

			expect(ent.x).equal(2);
			expect(ent.y).equal(1);
		});

		it('updates position if moving and not colliding', () => {
			ent.vx = 2;
			ent.vy = 1;
			ent.flags |= EntityFlags.CanCollide;

			updatePosition(ent, 1, map);

			expect(ent.x).equal(2);
			expect(ent.y).equal(1);
		});

		it('clips move if colliding', () => {
			setupCollider(map, 9, 1);
			ent.x = 8;
			ent.y = 1;
			ent.vx = 1;
			ent.flags |= EntityFlags.CanCollide;
			ent.colliders = colliders(-12, -9, 24, 18);
			updateColliders(map);

			updatePosition(ent, 1, map);

			expect(ent.x).equal(8.124969482421875);
		});

		it('clips move Y if colliding in Y direction', () => {
			setupCollider(map, 2, 9);
			setupCollider(map, 1, 9);
			ent.x = 1;
			ent.y = 8;
			ent.vx = 1;
			ent.vy = 1;
			ent.flags |= EntityFlags.CanCollide;
			ent.colliders = ponyColliders;
			updateColliders(map);

			updatePosition(ent, 1, map);

			expect(ent.x).equal(2, 'x');
			expect(ent.y).equal(8.333292643229166, 'y');
		});

		it('clips move X if colliding in X direction', () => {
			setupCollider(map, 10, 1);
			ent.x = 9;
			ent.y = 1;
			ent.vx = 1;
			ent.vy = 1;
			ent.flags |= EntityFlags.CanCollide;
			ent.colliders = ponyColliders;
			updateColliders(map);

			updatePosition(ent, 1, map);

			expect(ent.x).equal(9.624969482421875, 'x');
			expect(ent.y).equal(2.0833333333333335, 'y');
		});

		it('updates position if moving and colliding but already in colliding position', () => {
			setupCollider(map, 8, 8);
			setupCollider(map, 9, 9);
			setupCollider(map, 8, 9);
			setupCollider(map, 9, 8);
			ent.x = 8;
			ent.y = 8;
			ent.vx = 1;
			ent.vy = 1;
			ent.flags |= EntityFlags.CanCollide;
			ent.colliders = colliders(-16, -12, 32, 24);
			updateColliders(map);

			updatePosition(ent, 1, map);

			expect(ent.x).equal(9);
			expect(ent.y).equal(9);
		});

		it('does not update position if moving, colliding, already in colliding position but going outside the map', () => {
			setupCollider(map, 11, 11);
			ent.x = 110;
			ent.y = 110;
			ent.vx = 1;
			ent.vy = 1;
			ent.flags |= EntityFlags.CanCollide;
			ent.colliders = colliders(-16, -12, 32, 24);
			updateColliders(map);

			updatePosition(ent, 1, map);

			expect(ent.x).equal(110);
			expect(ent.y).equal(110);
		});
	});
});
