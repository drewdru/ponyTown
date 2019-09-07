import '../lib';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import {
	addToRegion, removeFromRegion, commitRegionUpdates, transferToRegion, isSubscribedToRegion,
	getExpectedRegion, unsubscribeFromOutOfRangeRegions, subscribeToRegionsInRange, unsubscribeFromAllRegions,
	updateRegions
} from '../../server/regionUtils';
import { IClient, ServerRegion } from '../../server/serverInterfaces';
import { addEntityToRegion, createServerRegion } from '../../server/serverRegion';
import { createServerMap } from '../../server/serverMap';
import { mockClient, serverEntity } from '../mocks';
import { getRegion } from '../../common/worldMap';
import { EntityFlags } from '../../common/interfaces';

describe('regionUtils', () => {
	let client: IClient;
	let region: ServerRegion;

	beforeEach(() => {
		client = mockClient();
		region = createServerRegion(2, 3);
	});

	describe('getExpectedRegion()', () => {
		it('returns only available region on the map', () => {
			const map = createServerMap('', 0, 1, 1);
			const entity = serverEntity(1);

			expect(getExpectedRegion(entity, map)).equal(map.regions[0]);
		});

		it('returns region at location if entity region is undefined', () => {
			const map = createServerMap('', 0, 10, 10);
			const entity = serverEntity(1, 8 * 5, 8 * 5);

			expect(getExpectedRegion(entity, map)).equal(getRegion(map, 5, 5));
		});

		it('returns current region if entity is inside current region', () => {
			const map = createServerMap('', 0, 10, 10);
			const entity = serverEntity(1, 8 * 5, 8 * 5);
			entity.region = getRegion(map, 5, 5);

			expect(getExpectedRegion(entity, map)).equal(getRegion(map, 5, 5));
		});

		it('returns edge region if entity is outside the map', () => {
			const map = createServerMap('', 0, 10, 10);
			const entity = serverEntity(1, 10000, 8 * 5);

			expect(getExpectedRegion(entity, map)).equal(getRegion(map, 9, 5));
		});

		it('returns the same region if entity is outside region but inside region border', () => {
			const map = createServerMap('', 0, 10, 10);
			const entity = serverEntity(1, 8 * 5 + 0.1, 8 * 5, 1, { flags: EntityFlags.Movable });
			entity.region = getRegion(map, 5, 5);

			expect(getExpectedRegion(entity, map)).equal(getRegion(map, 5, 5));
		});
	});

	describe('subscribeToRegions()', () => {
		it('subscribes to regions that are in camera view', () => {
			const map = createServerMap('', 0, 2, 1);
			Object.assign(client.camera, { x: -10, y: 0, w: 5, h: 5 });
			client.map = map;

			subscribeToRegionsInRange(client);

			expect(client.subscribes).eql([
				new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0]),
			]);
		});
	});

	describe('unsubscribeFromRegions()', () => {
		it('adds unsubscribes to client for regions that are not in camera view', () => {
			const region1 = createServerRegion(1, 1);
			const region2 = createServerRegion(1, 2);
			client.regions = [region1, region2];
			Object.assign(client.camera, { x: -10, y: 0, w: 5, h: 5 });

			unsubscribeFromOutOfRangeRegions(client);

			expect(client.unsubscribes).eql([1, 2]);
		});
	});

	describe('updateRegions()', () => {
		it('does nothing for empty map', () => {
			const map = createServerMap('', 0, 1, 1);

			updateRegions([map]);
		});

		it('does nothing if no regions are changed', () => {
			const map = createServerMap('', 0, 3, 3);
			const entity = serverEntity(1, 5, 5);
			addEntityToRegion(getRegion(map, 0, 0), entity, map);
			const region = getRegion(map, 0, 0);
			entity.region = region;

			updateRegions([map]);

			expect(entity.region).equal(region);
		});

		it('transfers entity to another region', () => {
			const map = createServerMap('', 0, 3, 3);
			const entity = serverEntity(1, 15, 15);
			entity.flags |= EntityFlags.Movable;
			addEntityToRegion(getRegion(map, 0, 0), entity, map);
			entity.region = getRegion(map, 0, 0);

			updateRegions([map]);

			expect(entity.region).equal(getRegion(map, 1, 1));
		});
	});

	describe('commitRegionUpdates()', () => {
		it('creates update packets', () => {
			const client1 = mockClient();
			const client2 = mockClient();
			region.clients.push(client1, client2);
			const entityUpdates = [] as any;
			const entityRemoves = [{} as any];
			const tileUpdates = [[] as any];
			region.x = 5;
			region.y = 6;
			region.entityUpdates = entityUpdates;
			region.entityRemoves = entityRemoves;
			region.tileUpdates = tileUpdates;

			commitRegionUpdates([region]);

			expect(client1.regionUpdates.length).equal(1);
			expect(client2.regionUpdates.length).equal(1);
		});

		it('does not send any updates if all lists are empty', () => {
			region.clients.push(mockClient(), mockClient());
			const updateEntities1 = stub(region.clients[0], 'update');
			const updateEntities2 = stub(region.clients[1], 'update');

			commitRegionUpdates([region]);

			assert.notCalled(updateEntities1);
			assert.notCalled(updateEntities2);
		});

		it('resets region updates', () => {
			region.tileUpdates.push({ x: 1, y: 2, type: 3 });
			region.entityUpdates = [{}, {}] as any;

			commitRegionUpdates([region]);

			expect(region.entityUpdates).eql([]);
		});
	});

	describe('transferToRegion()', () => {
		const map = createServerMap('', 0, 1, 1);

		it('removes entity from current region', () => {
			const entity = serverEntity(1);
			const oldRegion = entity.region = createServerRegion(0, 0);
			addEntityToRegion(entity.region, entity, map);

			transferToRegion(entity, region, map);

			expect(oldRegion.entities).not.contain(entity);
		});

		it('adds entity to new region', () => {
			const entity = serverEntity(1);

			transferToRegion(entity, region, map);

			expect(region.entities).contain(entity);
		});

		it('updates entity region', () => {
			const entity = serverEntity(1);

			transferToRegion(entity, region, map);

			expect(entity.region).equal(region);
		});

		it('adds entity update to current region', () => {
			const entity = serverEntity(1);
			entity.region = createServerRegion(0, 0);

			transferToRegion(entity, region, map);

			expect(region.entityUpdates).eql([
				// ...
			]);
		});

		// it('sends addEntity message to clients subscribed to destination region', () => {
		// 	const entity = serverEntity(1);
		// 	const otherClient = mockClient();
		// 	const addEntity = stub(otherClient, 'addEntity');
		// 	region.clients.push(otherClient);
		// 	otherClient.regions.push(region);

		// 	transferToRegion(entity, region, {}, {} as any);

		// 	assert.calledWith(addEntity as any, entity.id);
		// });

		// it('does not sent addEntity message to clients subscribed to destination region if entity is shadowed', () => {
		// 	const entity = serverEntity(1);
		// 	entity.client = mockClient({ shadowed: true });
		// 	const otherClient = mockClient();
		// 	const addEntity = stub(otherClient, 'addEntity');
		// 	region.clients.push(otherClient);
		// 	otherClient.regions.push(region);

		// 	transferToRegion(entity, region, {}, {} as any);

		// 	assert.notCalled(addEntity);
		// });

		// it('does not send addEntity message to clients subscribed to destination and source regions', () => {
		// 	const entity = serverEntity(1);
		// 	entity.region = createServerRegion(0, 0, 0);
		// 	const otherClient = mockClient();
		// 	const addEntity = stub(otherClient, 'addEntity');
		// 	region.clients.push(otherClient);
		// 	entity.region.clients.push(otherClient);
		// 	otherClient.regions.push(entity.region, region);

		// 	transferToRegion(entity, region, {}, {} as any);

		// 	assert.notCalled(addEntity);
		// });
	});

	describe('addToRegion()', () => {
		const map = createServerMap('', 0, 1, 1);

		it('adds entity to region', () => {
			const entity = serverEntity(1);

			addToRegion(entity, region, map);

			expect(region.entities).contain(entity);
		});

		it('sets entity region', () => {
			const entity = serverEntity(1);

			addToRegion(entity, region, map);

			expect(entity.region).equal(region);
		});

		// it('sends addEntity message to all clients', () => {
		// 	region.clients.push(mockClient(), mockClient());
		// 	const addEntity1 = stub(region.clients[0], 'addEntity');
		// 	const addEntity2 = stub(region.clients[1], 'addEntity');

		// 	addToRegion(serverEntity(1), region, {}, hiding);

		// 	assert.calledOnce(addEntity1);
		// 	assert.calledOnce(addEntity2);
		// });

		// it('only sents addEntity message to entity client if shadowed', () => {
		// 	region.clients.push(mockClient());
		// 	const addEntity1 = stub(region.clients[0], 'addEntity');
		// 	const entity = serverEntity(1);
		// 	entity.client = mockClient({ shadowed: true });
		// 	const addEntity2 = stub(entity.client, 'addEntity');

		// 	addToRegion(entity, region, {}, hiding);

		// 	assert.notCalled(addEntity1);
		// 	assert.calledOnce(addEntity2);
		// });

		it('adds entity to region even if shadowed', () => {
			const entity = serverEntity(1);
			entity.client = mockClient({ shadowed: true });

			addToRegion(entity, region, map);

			expect(region.entities).contain(entity);
		});

		it('sets entity region even if shadowed', () => {
			const entity = serverEntity(1);
			entity.client = mockClient({ shadowed: true });

			addToRegion(entity, region, map);

			expect(entity.region).equal(region);
		});
	});

	describe('removeFromRegion()', () => {
		const map = createServerMap('', 0, 1, 1);

		it('removes entity from region', () => {
			const entity = serverEntity(1);
			addEntityToRegion(region, entity, map);

			removeFromRegion(entity, region, map);

			expect(region.entities).not.contain(entity);
		});

		it('unsets entity region', () => {
			const entity = serverEntity(1);
			addEntityToRegion(region, entity, map);

			removeFromRegion(entity, region, map);

			expect(entity.region).undefined;
		});

		it('adds entity to removed entities list', () => {
			const entity = serverEntity(123);

			removeFromRegion(entity, region, map);

			expect(region.entityRemoves).eql([123]);
		});
	});

	describe('isSubscribedToRegion()', () => {
		it('returns true if subscribed to region', () => {
			client.regions.push(region);
			region.clients.push(client);

			expect(isSubscribedToRegion(client, region)).true;
		});

		it('returns false if not subscribed to region', () => {
			expect(isSubscribedToRegion(client, region)).false;
		});
	});

	describe('unsubscribeFromAllRegions()', () => {
		it('removes client from region', () => {
			region.clients.push(client);
			client.regions.push(region);

			unsubscribeFromAllRegions(client, false);

			expect(region.clients).not.contain(client);
		});

		it('removes region from client', () => {
			client.regions.push(region);

			unsubscribeFromAllRegions(client, false);

			expect(client.regions).not.contain(region);
		});

		it('adds unsubscribes to client with region coordinates', () => {
			client.regions.push(createServerRegion(2, 3));

			unsubscribeFromAllRegions(client, false);

			expect(client.unsubscribes).eql([2, 3]);
		});

		it('adds unsubscribes to client with all regions coordinates', () => {
			client.regions.push(createServerRegion(2, 3), createServerRegion(5, 6));

			unsubscribeFromAllRegions(client, false);

			expect(client.unsubscribes).eql([2, 3, 5, 6]);
		});

		it('does not add unsibscribes to client if silent flag is set', () => {
			unsubscribeFromAllRegions(client, true);

			expect(client.unsubscribes).eql([]);
		});
	});
});
