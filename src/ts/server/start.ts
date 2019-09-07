import { readFileSync } from 'fs';
import * as ctrl from './controllers';
import { World, goToMap } from './world';
import { create } from './reporter';
import { logger } from './logger';
import { SERVER_FPS } from '../common/constants';
import { ServerConfig } from '../common/adminInterfaces';
import { timingReset, timingStart, timingEnd } from './timing';
import { initializeTileHeightmaps } from '../client/tileUtils';
import { normalSpriteSheet } from '../generated/sprites';
import { pathTo } from './paths';
import { createMainMap } from './maps/mainMap';
import { createIslandMap } from './maps/islandMap';
import { createHouseMap } from './maps/houseMap';
import { createPaletteMap } from './maps/paletteMap';
import { createCaveMap } from './maps/caveMap';
import { createCustomMap } from './maps/customMap';
import { createSign } from './controllerUtils';
import { signQuestion } from '../common/entities';

export function start(world: World, server: ServerConfig) {
	const data = readFileSync(pathTo('src', 'ts', 'generated', 'pony.bin'));

	normalSpriteSheet.data = {
		width: 512,
		height: 512,
		data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
	};

	initializeTileHeightmaps();

	world.maps.push(createMainMap(world));
	world.maps.push(createCaveMap(world));

	// custom map
	if (DEVELOPMENT) { // remove `if` when you're ready to publish your map
		// place sign that will teleport the player to your custom map
		world.addEntity(createSign(
			75, 69, 'Go to custom map', (_, client) => goToMap(world, client, 'custom'), signQuestion), world.getMainMap());

		// add map to the world, go to `/src/ts/server/maps/customMap.ts` to customize your map
		world.maps.push(createCustomMap(world));
	}

	if (world.featureFlags.test) {
		const island = createIslandMap(world, false);
		island.id = 'public-island';
		world.maps.push(island);

		const house = createHouseMap(world, false);
		house.id = 'public-house';
		world.maps.push(house);
	}

	if (BETA) {
		world.maps.push(createPaletteMap(world));
	}

	if (DEVELOPMENT) {
		world.controllers.push(new ctrl.TestController(world, world.getMainMap()));

		// world.controllers.push(new ctrl.PerfController(world, {
		// 	count: 2000, moving: 1000, unique: true, spread: false, saying: false, x: 20, y: 20
		// }));

		// world.controllers.push(new ctrl.FakeClientsController(world, server, {
		// 	count: 1000,
		// }));

		world.setTime(12);
	}

	let last = Date.now();
	let frames = 0;

	world.initialize(last);

	if (!DEVELOPMENT) {
		create(server).info(`Server started`);
	}

	setInterval(() => {
		timingReset();
		timingStart('frame');

		try {
			const now = Date.now();
			world.update(now - last, now);
			last = now;
			frames++;

			if (frames >= SERVER_FPS) {
				frames = 0;
				world.sparseUpdate(now);
			}
		} catch (e) {
			create(server).danger(e.message);
			logger.error(e);
		}

		timingEnd();
	}, 1000 / SERVER_FPS);

	return world;
}
