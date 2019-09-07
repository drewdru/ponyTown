import * as fs from 'fs';
import { sample } from 'lodash';
import * as entities from '../../common/entities';
import { pathTo } from '../paths';
import { ServerMap, MapUsage, ServerEntity } from '../serverInterfaces';
import { World, goToMap } from '../world';
import {
	addSpawnPointIndicators, generateTileIndicesAndColliders, removePonies, worldForTemplates, createBunny
} from '../mapUtils';
import { serverMapInstanceFromTemplate, createServerMap, copyMapTiles, deserializeMap } from '../serverMap';
import { TileType, MapType, Season } from '../../common/interfaces';
import { rect } from '../../common/rect';
import { createAddLight, createSignWithText, createWoodenFenceMaker, createBoxOfLanterns } from '../controllerUtils';
import { setEntityName, updateEntityOptions } from '../entityUtils';
import { getNextToyOrExtra, holdItem } from '../playerUtils';
import { tileWidth, tileHeight } from '../../common/constants';
import { TorchController, UpdateController } from '../controllers';
import { resetRegionUpdates } from '../serverRegion';
import { point } from '../../common/utils';

const islandMapData = JSON.parse(fs.readFileSync(pathTo('src', 'maps', 'island.json'), 'utf8'));

let islandMapTemplate: ServerMap | undefined;

export function createIslandMap(world: World, instanced: boolean, template = false): ServerMap {
	if (!template && !islandMapTemplate) {
		islandMapTemplate = createIslandMap(worldForTemplates, false, true);
	}

	const map = (instanced && islandMapTemplate) ?
		serverMapInstanceFromTemplate(islandMapTemplate) :
		createServerMap('island', MapType.Island, 7, 7, TileType.Water, instanced ? MapUsage.Party : MapUsage.Public);

	map.usage = instanced ? MapUsage.Party : MapUsage.Public;
	map.spawnArea = rect(43.4, 20, 3.3, 2.5);
	map.spawns.set('house', rect(27, 24, 2, 2));

	if (islandMapTemplate) {
		copyMapTiles(map, islandMapTemplate);
	} else {
		deserializeMap(map, islandMapData);
	}

	const goto = instanced ? 'house' : 'public-house';
	const add = (entity: ServerEntity) => world.addEntity(entity, map);
	const addEntities = (entities: ServerEntity[]) => entities.map(add);

	add(entities.house(28, 23)).interact = (_, client) => goToMap(world, client, goto);
	add(entities.triggerHouseDoor(27.40, 22.87)).trigger = (_, client) => goToMap(world, client, goto);

	add(createBoxOfLanterns(25.5, 25.5));

	const boxOfFruits = add(entities.boxFruits(20.72, 20.88));
	setEntityName(boxOfFruits, 'Box of fruits');

	const giftPile = add(entities.giftPileInteractive(37.66, 18.21));
	giftPile.interact = (_, client) => updateEntityOptions(client.pony, getNextToyOrExtra(client));
	setEntityName(giftPile, 'Toy stash');

	const types = entities.stashEntities.map(e => e.type);

	const itemSign = add(entities.signQuest(24.41, 25.00));
	itemSign.interact = (_, client) => {
		const index = types.indexOf(client.pony.options!.hold || 0);
		holdItem(client.pony, types[(index + 1) % types.length]);
	};
	setEntityName(itemSign, 'Item stash');

	const addTorch = createAddLight(world, map, entities.torch);

	addTorch(25.00, 24.00);
	addTorch(39.69, 18.38);
	addTorch(39.66, 21.67);
	addTorch(23.34, 38.46);
	addTorch(28.16, 31.79);
	addTorch(29.13, 38.17);
	addTorch(30.84, 29.42);
	addTorch(29.69, 25.00);
	addTorch(20.00, 27.88);
	addTorch(22.63, 30.54);
	addTorch(19.22, 32.08);
	addTorch(25.50, 26.79);
	addTorch(15.94, 26.42);
	addTorch(15.88, 29.75);

	// pier

	const px = 1 / tileWidth;
	const plankWidth = 78 / tileWidth;
	const plankHeight = 12 / tileHeight;
	const plankOffsets = [0, -1, 0, -2, -1, -1, 0, -2, -1, 0].map(x => x / tileWidth);

	addEntities(entities.fullBoat(45.06, 24));
	add(entities.pierLeg(41.31, 20.54));
	add(entities.pierLeg(43.00, 22.58));
	add(entities.pierLeg(44.84, 22.58));
	add(entities.pierLeg(46.65, 22.58));
	add(entities.barrel(46.83, 23.35));
	add(entities.lanternOn(46.19, 23.38));
	add(entities.lanternOn(42.63, 21.42));
	add(entities.lanternOn(47.00, 18.96));
	add(entities.triggerBoat(45.5, 24.8)).interact = (_, client) => goToMap(world, client, '', 'harbor');
	add(createSignWithText(43, 23.5, 'Return to land', `Hop on the boat to return to the mainland`));

	for (let y = 0; y < 10; y++) {
		const minX = y < 5 ? 0 : 1;
		const maxX = (y % 2) ? 4 : 3;
		const baseX = 40 + ((y % 2) ? 0 : (plankWidth / 2)) + plankOffsets[y];
		const baseY = 19 - (9 / tileHeight);

		for (let x = minX; x < maxX; x++) {
			if ((x === minX && (y % 2)) || (x === (maxX - 1) && (y % 2))) {
				const ox = x === minX ? (18 / tileWidth) : (-18 / tileWidth);
				const plank = sample(entities.planksShort)!;
				add(plank(baseX + ox + x * plankWidth, baseY + y * plankHeight));
			} else {
				const plank = sample(entities.planks)!;
				add(plank(baseX + x * plankWidth, baseY + y * plankHeight));
			}
		}
	}

	add(entities.plankShadow(41.31, 20.58));
	add(entities.plankShadowShort(43.03, 21.08));
	add(entities.plankShadowShort(43, 21.08 + plankHeight * 2));

	const baseY = 18.58;
	const baseX = 46.71;
	add(entities.plankShadowShort(baseX, baseY));
	add(entities.plankShadowShort(baseX + 2 * px, baseY + plankHeight));
	add(entities.plankShadowShort(baseX, baseY + plankHeight * 2));
	add(entities.plankShadowShort(baseX + 1 * px, baseY + plankHeight * 3));
	add(entities.plankShadowShort(baseX - 1 * px, baseY + plankHeight * 4));
	add(entities.plankShadowShort(baseX + 2 * px, baseY + plankHeight * 5));
	add(entities.plankShadowShort(baseX, baseY + plankHeight * 6));
	add(entities.plankShadowShort(baseX + 1 * px, baseY + plankHeight * 7));
	add(entities.plankShadowShort(baseX - 1 * px, baseY + plankHeight * 8));
	add(entities.plankShadowShort(baseX + 3 * px, baseY + plankHeight * 9));

	add(entities.collider3x1(40, 18));
	add(entities.collider3x1(43, 18));
	add(entities.collider2x1(46, 18));
	add(entities.collider1x3(47, 19));
	add(entities.collider1x3(47, 22));

	add(entities.collider3x1(40, 21));
	add(entities.collider1x3(42, 22));
	add(entities.collider1x1(43, 24));
	add(entities.collider3x1(42, 25));
	add(entities.collider3x1(45, 25));
	add(entities.collider1x3(47.6, 23));
	add(entities.collider1x3(41.5, 22));

	// lone boat

	addEntities(entities.fullBoat(27.12, 42, false));
	add(entities.plankShort3(27.43, 39.67));
	add(entities.plankShort3(27.46, 40.21));
	add(entities.plankShort3(27.43, 40.75));
	add(entities.plankShort3(27.46, 41.21));
	add(entities.pierLeg(27.96, 40.88));
	add(entities.pierLeg(27.02, 40.79));
	add(entities.plankShadowShort(27.5, 39.67));
	add(entities.plankShadowShort(27.5 + 1 * px, 39.67 + plankHeight));
	add(entities.plankShadowShort(27.5, 39.67 + plankHeight * 2));
	add(entities.plankShadowShort(27.5 + 1 * px, 39.67 + plankHeight * 3));
	add(entities.lanternOn(28.77, 42.27));

	add(entities.collider3x1(24, 41));
	add(entities.collider2x1(24, 42));
	add(entities.collider1x2(26, 40));
	add(entities.collider1x2(28, 40));
	add(entities.collider2x1(28, 41));
	add(entities.collider3x1(24, 43));
	add(entities.collider3x1(27, 43));
	add(entities.collider1x1(29, 42));
	add(entities.collider1x3(29.7, 41));
	add(entities.collider1x3(23.5, 41));

	const addWoodenFence = createWoodenFenceMaker(world, map);

	addWoodenFence(20, 20, 4);
	addWoodenFence(20, 20, 4, false, true);
	addWoodenFence(24, 20, 4, false, true);
	addWoodenFence(20, 24, 1, true, true);
	addWoodenFence(23, 24, 1, true, false, true);

	addEntities(entities.tree(22.41, 18.21, 0));
	addEntities(entities.tree(30.44, 23.46, 1 + 4));
	addEntities(entities.tree5(34.53, 27.04, 0));
	addEntities(entities.tree5(19.28, 21.75, 1));
	add(entities.pumpkin(23.22, 20.58));
	add(entities.pumpkin(20.53, 22.29));
	add(entities.pumpkin(20.91, 23.08));
	add(entities.largeLeafedBush2(35.03, 26.71));
	add(entities.largeLeafedBush4(34.13, 27.54));
	add(entities.largeLeafedBush2(20.34, 24.42));
	add(entities.largeLeafedBush3(19.72, 24.04));
	add(entities.largeLeafedBush3(23.03, 38.67));
	add(entities.largeLeafedBush4(23.72, 38.04));
	add(entities.barrel(39.53, 18.96));
	add(entities.barrel(38.78, 18.38));
	add(entities.barrel(38.47, 19.21));
	add(entities.barrel(24.63, 23.50));
	add(entities.treeStump1(20.25, 36.46));
	add(entities.lanternOn(20.75, 37.00));
	add(entities.lanternOn(36.06, 34.25));
	add(entities.lanternOn(37.63, 36.83));
	add(entities.lanternOn(37.84, 26.94));

	add(entities.waterRock1(22.63, 41.83));
	add(entities.waterRock1(28.56, 13.75));
	add(entities.waterRock1(16.25, 20.88));
	add(entities.waterRock1(40.62, 29.62));
	add(entities.waterRock1(40.63, 17.96));
	add(entities.waterRock2(40.22, 17.50));
	add(entities.waterRock2(20.34, 15.75));
	add(entities.waterRock2(15.41, 34.13));
	add(entities.waterRock2(36.50, 40.63));
	add(entities.waterRock3(36.13, 40.96));
	add(entities.waterRock3(41.63, 34.38));
	add(entities.waterRock3(15.16, 34.67));
	add(entities.waterRock3(20.88, 15.50));
	add(entities.waterRock4(36.56, 41.13));
	add(entities.waterRock4(40.72, 17.29));
	add(entities.waterRock4(28.22, 13.25));
	add(entities.waterRock5(28.66, 13.17));
	add(entities.waterRock5(16.84, 20.42));
	add(entities.waterRock5(14.44, 30.50));
	add(entities.waterRock5(23.13, 41.88));
	add(entities.waterRock5(30.44, 39.71));
	add(entities.waterRock5(41.84, 34.83));
	add(entities.waterRock5(36.63, 14.75));
	add(entities.waterRock6(36.25, 14.54));
	add(entities.waterRock6(14.84, 34.29));
	add(entities.waterRock6(40.44, 38.71));
	add(entities.waterRock7(42.13, 34.42));
	add(entities.waterRock7(20.34, 15.25));
	add(entities.waterRock7(28.78, 40.79));
	add(entities.waterRock7(22.66, 42.08));
	add(entities.waterRock8(22.25, 41.92));
	add(entities.waterRock8(14.13, 30.79));
	add(entities.waterRock8(16.28, 20.21));
	add(entities.waterRock8(42.19, 34.79));
	add(entities.waterRock9(36.78, 14.29));
	add(entities.waterRock9(13.97, 30.33));
	add(entities.waterRock10(14.50, 25.83));
	add(entities.waterRock10(18.88, 40.75));
	add(entities.waterRock11(25.37, 13.75));
	add(entities.waterRock11(18.44, 40.58));
	add(entities.waterRock11(15.41, 24.33));
	add(entities.waterRock4(15.13, 23.96));
	add(entities.waterRock11(35.38, 31.08));
	add(entities.waterRock8(35.09, 30.71));
	add(entities.waterRock3(34.03, 29.79));
	add(entities.waterRock4(34.31, 29.67));
	add(entities.waterRock4(24.50, 35.92));
	add(entities.waterRock3(33.44, 38.21));
	add(entities.waterRock4(33.16, 37.92));
	add(entities.waterRock1(25.50, 17.79));
	add(entities.waterRock9(25.66, 18.13));
	add(entities.waterRock4(25.97, 17.79));

	add(entities.flower3Pickable(30.25, 24.92)).interact = (_, { pony }) => holdItem(pony, entities.flowerPick.type);

	add(entities.bench1(37.78, 24.96));
	add(entities.benchSeat(37.75, 28.29));
	add(entities.benchBack(37.75, 29.17));

	// small island bit
	addEntities(entities.tree(9.16, 16.50, 2 + 8));
	add(entities.waterRock1(5.34, 23.71));
	add(entities.waterRock1(13.28, 14.33));
	add(entities.waterRock1(11.19, 24.83));
	add(entities.waterRock3(10.94, 25.21));
	add(entities.waterRock3(6.31, 18.92));
	add(entities.waterRock3(13.59, 14.71));
	add(entities.waterRock5(13.84, 14.17));
	add(entities.waterRock4(11.38, 25.13));
	add(entities.waterRock6(6.41, 15.92));
	add(entities.waterRock8(5.16, 23.13));
	add(entities.waterRock10(6.06, 16.33));
	add(entities.waterRock11(14.66, 20.75));
	add(entities.torch(9.31, 17.83));
	add(entities.torch(9.44, 21.67));
	add(entities.torch(12.75, 18.29));

	if (world.season === Season.Summer || world.season === Season.Spring) {
		add(entities.flowerPatch1(21.16, 26.04));
		add(entities.flowerPatch3(35.81, 34.75));
		add(entities.flowerPatch3(23.09, 32.29));
		add(entities.flowerPatch5(19.63, 33.04));
		add(entities.flowerPatch5(37.38, 26.42));
		add(entities.flowerPatch5(18.75, 26.38));
		add(entities.flowerPatch5(35.38, 33.88));
		add(entities.flowerPatch6(25.78, 31.04));
		add(entities.flowerPatch6(33.00, 33.79));
		add(entities.flowerPatch6(38.72, 26.00));
		add(entities.flowerPatch3(11.34, 19.33));
		add(entities.flowerPatch6(11.09, 17.79));
		add(entities.flowerPatch7(8.63, 21.67));
	}

	if (world.season === Season.Autumn) {
		add(entities.leafpileStickRed(31.00, 22.75));
		add(entities.leaves5(18.41, 21.46));
		add(entities.leaves2(21.59, 18.17));
		add(entities.leaves2(23.56, 18.00));
		add(entities.leaves1(22.00, 17.21));
		add(entities.leaves1(22.47, 20.00));
		add(entities.leaves2(33.69, 25.42));
		add(entities.leaves1(33.47, 26.75));
		add(entities.leaves1(35.66, 27.08));
		add(entities.leaves3(30.31, 24.04));
		add(entities.leaves1(31.56, 23.00));
		add(entities.leaves1(29.47, 23.21));
		add(entities.leaves3(8.84, 17.04));
		add(entities.leaves2(8.91, 15.25));
		add(entities.leaves1(10.44, 16.46));
	}

	addEntities(createBunny([
		point(22.19, 27.25),
		point(19.75, 26.13),
		point(18.44, 29.04),
		point(20.41, 31.42),
		point(19.94, 33.04),
		point(22.88, 33.67),
		point(24.91, 31.25),
		point(26.09, 32.50),
		point(26.34, 34.83),
		point(32.50, 35.46),
		point(34.03, 34.67),
		point(36.06, 36.50),
		point(36.47, 35.33),
		point(36.22, 34.63),
		point(33.63, 34.83),
		point(31.88, 33.25),
		point(32.00, 28.46),
		point(33.22, 25.75),
		point(35.09, 24.75),
		point(36.13, 25.67),
		point(36.72, 27.38),
		point(38.31, 27.42),
		point(38.63, 26.54),
		point(37.31, 26.63),
		point(36.06, 26.42),
		point(35.34, 24.29),
		point(33.13, 25.83),
		point(30.06, 25.13),
		point(26.50, 26.38),
		point(24.66, 28.25),
		point(22.25, 28.50),
		point(20.97, 27.00),
		point(19.13, 27.13),
		point(20.69, 29.25),
		point(22.34, 29.42),
		point(21.53, 31.46),
		point(23.50, 31.54),
		point(23.81, 29.71),
	]));

	map.controllers.push(new TorchController(world, map));
	map.controllers.push(new UpdateController(map));

	if (DEVELOPMENT) {
		addSpawnPointIndicators(world, map);
	}

	if (!islandMapTemplate) {
		generateTileIndicesAndColliders(map);
	}

	return map;
}

export function resetIslandMap(map: ServerMap) {
	copyMapTiles(map, islandMapTemplate!);

	for (const region of map.regions) {
		region.clients = [];
		removePonies(region.entities);
		removePonies(region.movables);
		resetRegionUpdates(region);
	}
}
