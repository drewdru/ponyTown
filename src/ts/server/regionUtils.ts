import { createBinaryWriter, getWriterBuffer, BinaryWriter } from 'ag-sockets';
import { removeItem, pointInRect, clamp, includes } from '../common/utils';
import { ServerEntity, IClient, ServerRegion, ServerMap } from './serverInterfaces';
import {
	tickTilesRestoration, resetRegionUpdates, pushRemoveEntityToRegion, removeEntityFromRegion, addEntityToRegion
} from './serverRegion';
import { updateEntity, isEntityShadowed, isOverflowError, pushAddEntityToClient } from './entityUtils';
import { writeRegion, writeUpdate } from '../common/encoders/updateEncoder';
import { toWorldX, toWorldY } from '../common/positionUtils';
import { isRectVisible } from '../common/camera';
import { timingStart, timingEnd } from './timing';
import { getRegion } from '../common/worldMap';
import { logger } from './logger';
import { EntityFlags } from '../common/interfaces';
import { REGION_SIZE } from '../common/constants';

let updatesBuffer = new ArrayBuffer(4096);
let updatesBufferOffset = 0;

export function resetEncodeUpdate() {
	updatesBufferOffset = 0;
}

function resizeUpdatesBuffer(e: Error) {
	if (isOverflowError(e)) {
		updatesBuffer = new ArrayBuffer(updatesBuffer.byteLength * 2);
		updatesBufferOffset = 0;
		DEVELOPMENT && logger.debug(`resize buffer to ${updatesBuffer.byteLength} (${e.message})`);
	} else {
		throw e;
	}
}

function createUpdatesWriter() {
	const buffer = new Uint8Array(updatesBuffer, updatesBufferOffset, updatesBuffer.byteLength - updatesBufferOffset);
	return createBinaryWriter(buffer);
}

function commitUpdatesWriter(writer: BinaryWriter) {
	const result = getWriterBuffer(writer);
	updatesBufferOffset += result.byteLength;
	return result;
}

function encodeUpdate(region: ServerRegion): Uint8Array {
	timingStart('encodeUpdate()');

	let result: Uint8Array;

	while (true) {
		try {
			const writer = createUpdatesWriter();
			writeUpdate(writer, region);
			result = commitUpdatesWriter(writer);
			break;
		} catch (e) {
			resizeUpdatesBuffer(e);
		}
	}

	timingEnd();

	return result;
}

function encodeRegion(region: ServerRegion, client: IClient): Uint8Array {
	timingStart('encodeRegion()');

	let result: Uint8Array;

	while (true) {
		try {
			const writer = createUpdatesWriter();
			writeRegion(writer, region, client);
			result = commitUpdatesWriter(writer);
			break;
		} catch (e) {
			resizeUpdatesBuffer(e);
		}
	}

	timingEnd();

	return result;
}

export function subscribeToRegionsInRange(client: IClient) {
	timingStart('subscribeToRegionsInRange()');

	const { map, camera } = client;
	const maxX = clamp(Math.floor(toWorldX(camera.x + camera.w) / REGION_SIZE) + 1, 0, map.regionsX - 1);
	const maxY = clamp(Math.floor(toWorldY(camera.y + camera.h) / REGION_SIZE) + 1, 0, map.regionsY - 1);
	const minX = clamp(Math.floor(toWorldX(camera.x) / REGION_SIZE) - 1, 0, maxX);
	const minY = clamp(Math.floor(toWorldY(camera.y) / REGION_SIZE) - 1, 0, maxY);

	for (let y = minY; y <= maxY; y++) {
		for (let x = minX; x <= maxX; x++) {
			const region = getRegion(map, x, y);

			if (isRectVisible(camera, region.subscribeBounds)) {
				if (!isSubscribedToRegion(client, region)) {
					timingStart('subscribeToRegion()');
					region.clients.push(client);
					client.regions.push(region);
					client.subscribes.push(encodeRegion(region, client));
					timingEnd();
				}
			}
		}
	}

	timingEnd();
}

export function unsubscribeFromOutOfRangeRegions(client: IClient) {
	timingStart('unsubscribeFromOutOfRangeRegions()');

	const regions = client.regions;

	for (let i = regions.length - 1; i >= 0; i--) {
		const region = regions[i];

		if (!isRectVisible(client.camera, region.unsubscribeBounds)) {
			if (includes(region.entities, client.pony)) {
				DEVELOPMENT && logger.warn(`Trying to unsubscribe client from region they are in`);
			} else {
				removeItem(region.clients, client);
				regions.splice(i, 1);
				client.unsubscribes.push(region.x, region.y);
			}
		}
	}

	timingEnd();
}

export function unsubscribeFromAllRegions(client: IClient, silent: boolean) {
	for (const region of client.regions) {
		removeItem(region.clients, client);

		if (!silent) {
			client.unsubscribes.push(region.x, region.y);
		}
	}

	client.regions = [];
}

export function getExpectedRegion({ x, y, flags, region }: ServerEntity, map: ServerMap) {
	if (region !== undefined && (flags & EntityFlags.Movable) !== 0 && pointInRect(x, y, region.boundsWithBorder)) {
		return region;
	} else {
		const rx = clamp(Math.floor(x / REGION_SIZE), 0, map.regionsX - 1) | 0;
		const ry = clamp(Math.floor(y / REGION_SIZE), 0, map.regionsY - 1) | 0;
		return map.regions[(rx + ((ry * map.regionsX) | 0)) | 0];
	}
}

export function updateRegion(entity: ServerEntity, map: ServerMap) {
	const expectedRegion = getExpectedRegion(entity, map);

	if (expectedRegion !== entity.region) {
		transferToRegion(entity, expectedRegion, map);
	}
}

const moves: { entity: ServerEntity, region: ServerRegion; map: ServerMap; }[] = [];

export function updateRegions(maps: ServerMap[]) {
	timingStart('updateRegions()');

	moves.length = 0;

	// TODO: only update changed entities
	timingStart('getExpectedRegion');
	for (const map of maps) {
		for (const region of map.regions) {
			for (const entity of region.movables) {
				const expectedRegion = getExpectedRegion(entity, map);

				if (expectedRegion !== entity.region) {
					moves.push({ entity, region: expectedRegion, map });
				}
			}
		}
	}
	timingEnd();

	timingStart('transferToRegion');
	for (const { entity, region, map } of moves) {
		transferToRegion(entity, region, map);
	}
	timingEnd();

	moves.length = 0;

	timingEnd();
}

export function commitRegionUpdates(regions: ServerRegion[]) {
	timingStart('commitRegionUpdates()');

	for (const region of regions) {
		if (region.entityUpdates.length || region.entityRemoves.length || region.tileUpdates.length) {
			if (region.clients.length) {
				const data = encodeUpdate(region);

				for (const client of region.clients) {
					client.regionUpdates.push(data);
				}
			}

			resetRegionUpdates(region);
		}
	}

	timingEnd();
}

export function transferToRegion(entity: ServerEntity, region: ServerRegion, map: ServerMap) {
	const oldRegion = entity.region;

	if (oldRegion) {
		removeEntityFromRegion(oldRegion, entity, map);
		updateEntity(entity, true);
	}

	entity.region = region;
	addEntityToRegion(region, entity, map);

	if (!isEntityShadowed(entity)) {
		for (const client of region.clients) {
			if (!oldRegion || !isSubscribedToRegion(client, oldRegion)) {
				pushAddEntityToClient(client, entity);
			}
		}
	}
}

export function addToRegion(entity: ServerEntity, region: ServerRegion, map: ServerMap) {
	entity.region = region;
	addEntityToRegion(region, entity, map);

	if (isEntityShadowed(entity)) {
		pushAddEntityToClient(entity.client, entity);
	} else {
		for (const client of region.clients) {
			pushAddEntityToClient(client, entity);
		}
	}
}

export function removeFromRegion(entity: ServerEntity, region: ServerRegion, map: ServerMap) {
	const removed = removeEntityFromRegion(region, entity, map);
	pushRemoveEntityToRegion(region, entity);
	return removed;
}

export function isSubscribedToRegion(client: IClient, region: ServerRegion) {
	return includes(client.regions, region);
}

export function sparseRegionUpdate(map: ServerMap, region: ServerRegion, options: { restoreTerrain: boolean; }) {
	if (options.restoreTerrain) {
		tickTilesRestoration(map, region);
	}
}

// timing helpers

function writingTiming() {
	timingStart('write');
}

function sendingTiming() {
	timingEnd();
	timingStart('send');
}

function doneTiming() {
	timingEnd();
}

function noop() {
}

export function setupTiming(client: any) {
	if (client.__internalHooks) {
		client.__internalHooks.writing = writingTiming;
		client.__internalHooks.sending = sendingTiming;
		client.__internalHooks.done = doneTiming;
	}
}

export function clearTiming(client: any) {
	if (client.__internalHooks) {
		client.__internalHooks.writing = noop;
		client.__internalHooks.sending = noop;
		client.__internalHooks.done = noop;
	}
}
