import '../lib';
import { getWriterBuffer } from 'ag-sockets';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import { findClosest, updateEntityOptions, updateEntityState, fixPosition } from '../../server/entityUtils';
import { mockClient, serverEntity } from '../mocks';
import { createServerRegion } from '../../server/serverRegion';
import { UpdateFlags } from '../../common/interfaces';
import { IClient } from '../../server/serverInterfaces';
import { createServerMap } from '../../server/serverMap';

describe('entityUtils [server]', () => {
	describe('findClosest()', () => {
		it('returns undefined for empty list', () => {
			expect(findClosest(0, 0, []));
		});

		it('returns closest entity', () => {
			const entities: any[] = [
				{ x: 1, y: 0 },
				{ x: 0, y: 0 },
				{ x: 0, y: 1 },
			];

			expect(findClosest(0, 0, entities)).equal(entities[1]);
		});
	});

	describe('updateEntityOptions()', () => {
		it('updates entity options field', () => {
			const entity = serverEntity(2, 0, 0, 0, { options: { tag: 'bar' } });

			updateEntityOptions(entity, { expr: 5 });

			expect(entity.options).eql({ tag: 'bar', expr: 5 });
		});

		it('handles undefined options field', () => {
			const entity = serverEntity(2);
			entity.options = undefined;

			updateEntityOptions(entity, { expr: 5 });

			expect(entity.options).eql({ expr: 5 });
		});

		it('adds update to region', () => {
			const entity = serverEntity(2, 0, 0, 0, { options: { tag: 'bar' } });
			entity.region = createServerRegion(0, 0);
			entity.region.clients.push(mockClient(), mockClient());

			updateEntityOptions(entity, { expr: 5 });

			expect(entity.region.entityUpdates).eql([
				{ entity, flags: UpdateFlags.Options, x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: { expr: 5 } },
			]);
		});
	});

	describe('updateEntityState()', () => {
		it('sets flags on entity', () => {
			const entity = serverEntity(0);

			updateEntityState(entity, 123);

			expect(entity.state).equal(123);
		});

		it('adds flag update to region updates', () => {
			const entity = serverEntity(0);
			const region = createServerRegion(0, 0);
			entity.client = mockClient({});
			entity.region = region;

			updateEntityState(entity, 123);

			expect(region.entityUpdates).eql([
				{ entity, flags: UpdateFlags.State, x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: undefined },
			]);
		});

		it('sends flag update to client if shadowed', () => {
			const entity = serverEntity(12);
			entity.region = createServerRegion(0, 0);
			entity.client = mockClient({ shadowed: true });

			updateEntityState(entity, 123);

			expect(getWriterBuffer(entity.client.updateQueue)).eql(new Uint8Array([2, 0, 4, 0, 0, 0, 12, 123]));
		});
	});

	describe('fixPosition()', () => {
		let client: IClient;

		beforeEach(() => {
			client = mockClient();
			client.map = createServerMap('', 0, 1, 1);
		});

		it('updates entity position to given position', () => {
			const entity = serverEntity(1);
			entity.x = 10;
			entity.y = 5;

			fixPosition(entity, client.map, 1, 2, false);

			expect(entity.x).equal(1);
			expect(entity.y).equal(2);
		});

		it('submits entity update to region', () => {
			const region = createServerRegion(0, 0);
			const entity = serverEntity(1);
			entity.region = region;

			fixPosition(entity, client.map, 1, 2, false);

			expect(region.entityUpdates).eql([
				{
					entity, flags: UpdateFlags.Position | UpdateFlags.State, x: 1, y: 2, vx: 0, vy: 0,
					action: 0, playerState: 0, options: undefined
				},
			]);
		});

		it('sends fix position message to client', () => {
			const fixPositionStub = stub(client, 'fixPosition');

			fixPosition(client.pony, client.map, 1, 2, false);

			assert.calledWith(fixPositionStub, 1, 2, false);
		});

		it('sets fixing flag on client', () => {
			fixPosition(client.pony, client.map, 1, 2, false);

			expect(client.fixingPosition).true;
		});
	});
});
