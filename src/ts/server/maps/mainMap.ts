import * as fs from 'fs';
import { sample, random } from 'lodash';
import { pathTo } from '../paths';
import { World, goToMap } from '../world';
import { createServerMap, deserializeMap, snapshotTiles, setTile, lockTile, lockTiles } from '../serverMap';
import { TileType, Season, MapType, Holiday, MessageType, ServerFlags, MapFlags } from '../../common/interfaces';
import { rect } from '../../common/rect';
import * as entities from '../../common/entities';
import {
	addSpawnPointIndicators, createDirectionSign, pickEntity, checkNotCollecting, pickGift, checkLantern,
	pickCandy, checkBasket, pickEgg, pickClover, positionClover, createBunny
} from '../mapUtils';
import {
	give, createWoodenFenceMaker, createStoneWallFenceMaker, createSign, createSignWithText, createAddLight,
	boopLight, createBoxOfLanterns
} from '../controllerUtils';
import { ServerEntity, IClient, ServerMap } from '../serverInterfaces';
import { logger } from '../logger';
import { getEntityTypeName, GhostAnimation, CatAnimation, SignIcon } from '../../common/entities';
import { holdItem, isGift, unholdItem, getNextToyOrExtra } from '../playerUtils';
import { toInt, hasFlag, point } from '../../common/utils';
import { updateAccountState } from '../accountUtils';
import { saySystem, sayToAll } from '../chat';
import { tileHeight, tileWidth } from '../../common/constants';
import { updateEntityOptions, setEntityAnimation } from '../entityUtils';
import { toWorldX } from '../../common/positionUtils';
import { deserializeTiles } from '../../common/compress';
import * as ctrl from '../controllers';
import { isNightTime, isDayTime } from '../../common/timeUtils';

const mainMapData = JSON.parse(fs.readFileSync(pathTo('src', 'maps', 'main.json'), 'utf8'));
const mainMapTiles = deserializeTiles(mainMapData.tiles);

function createCookieTable(x: number, y: number) {
	return entities.cookieTable(x, y + 0.5) as ServerEntity;
}

function createCookieTable2(x: number, y: number) {
	return entities.cookieTable2(x, y + 0.5) as ServerEntity;
}

function createToyStash(x: number, y: number) {
	return [
		entities.giftPileSign(x, y - 0.1),
		createSign(x, y, 'Toy Stash', (_, client) => updateEntityOptions(client.pony, getNextToyOrExtra(client)), entities.sign),
	];
}

function donateGift(_: any, client: IClient) {
	if (client.account.state && client.account.state.gifts) {
		let count = 0;
		updateAccountState(client.account, state => state.gifts = count = Math.max(0, toInt(state.gifts) - 1));
		saySystem(client, `${count} 🎁`);
	}

	if (isGift(client.pony.options && client.pony.options.hold)) {
		unholdItem(client.pony);
	}
}

function donateCandy(_: any, client: IClient) {
	if (client.account.state && client.account.state.candies) {
		let count = 0;
		updateAccountState(client.account, state => state.candies = count = Math.max(0, toInt(state.candies) - 1));
		saySystem(client, `${count} 🍬`);
	}
}

function donateEgg(_: any, client: IClient) {
	if (client.account.state && client.account.state.eggs) {
		let count = 0;
		updateAccountState(client.account, state => state.eggs = count = Math.max(0, toInt(state.eggs) - 1));
		saySystem(client, `${count} 🥚`);
	}
}

function removeSeasonalObjects(world: World, map: ServerMap) {
	const remove: ServerEntity[] = [];

	for (const region of map.regions) {
		for (const entity of region.entities) {
			if (hasFlag(entity.serverFlags, ServerFlags.Seasonal)) {
				remove.push(entity);
			}
		}
	}

	for (const entity of remove) {
		world.removeEntity(entity, map);
	}
}

function addSeasonalObjects(world: World, map: ServerMap, season: Season, holiday: Holiday) {
	const isWinter = season === Season.Winter;
	const isAutumn = season === Season.Autumn;
	const isSpring = season === Season.Spring;
	const isSummer = season === Season.Summer;
	const isHalloween = holiday === Holiday.Halloween;
	const isChristmas = holiday === Holiday.Christmas;
	const isEaster = holiday === Holiday.Easter;

	function add(entity: ServerEntity) {
		entity.serverFlags! |= ServerFlags.Seasonal;
		return world.addEntity(entity, map);
	}

	function addEntities(entities: ServerEntity[]) {
		return entities.map(add);
	}

	function addHolly(x: number, y: number) {
		add(entities.holly(x, y + (1 / tileHeight)));
	}

	function addHollyDecoration(x: number, y: number, a = true, b = true, c = true, d = true) {
		if (isChristmas) {
			a && addHolly(x - 2.8, y);
			b && addHolly(x - 1, y);
			c && addHolly(x + 1, y);
			d && addHolly(x + 2.8, y);
		}
	}

	addHollyDecoration(65.00, 71.00, true, false, true, false);
	addHollyDecoration(64.00, 76.00);
	addHollyDecoration(55.00, 76.50, true, false);

	if (isSpring || isSummer) {
		add(entities.flowerPatch1(70.00, 55.00));
		add(entities.flowerPatch2(46.50, 78.00));
		add(entities.flowerPatch2(80.00, 49.50));
		add(entities.flowerPatch2(100.60, 75.50));
		add(entities.flowerPatch2(78.00, 92.00));
		add(entities.flowerPatch3(69.50, 69.00));
		add(entities.flowerPatch3(48.80, 82.00));
		add(entities.flowerPatch3(86.50, 53.50));
		add(entities.flowerPatch4(66.00, 61.00));
		add(entities.flowerPatch4(87.50, 63.50));
		add(entities.flowerPatch4(56.00, 89.70));
		add(entities.flowerPatch5(53.50, 68.00));
		add(entities.flowerPatch5(77.70, 96.00));
		add(entities.flowerPatch5(77.00, 71.30));
		add(entities.flowerPatch5(87.50, 69.00));
		add(entities.flowerPatch7(93.40, 65.70));
		add(entities.flowerPatch1(112.09, 64.63));
		add(entities.flowerPatch2(107.70, 53.77));
		add(entities.flowerPatch2(69.16, 107.00));
		add(entities.flowerPatch3(106.73, 94.79));
		add(entities.flowerPatch3(113.59, 61.96));
		add(entities.flowerPatch3(70.50, 104.90));
		add(entities.flowerPatch4(58.03, 112.92));
		add(entities.flowerPatch4(53.31, 99.88));
		add(entities.flowerPatch6(106.72, 93.46));
		add(entities.flowerPatch5(116.31, 50.94));

		add(entities.flowerPatch1(125.31, 148.25));
		add(entities.flowerPatch1(153.06, 133.58));
		add(entities.flowerPatch1(143.68, 87.20));
		add(entities.flowerPatch1(85.25, 150.75));
		add(entities.flowerPatch1(66.71, 139.75));

		add(entities.flowerPatch2(79.13, 148.92));
		add(entities.flowerPatch2(65.56, 126.83));
		add(entities.flowerPatch2(149.75, 147.42));
		add(entities.flowerPatch2(131.78, 87.12));

		add(entities.flowerPatch3(143.13, 151.50));
		add(entities.flowerPatch3(148.19, 131.58));
		add(entities.flowerPatch3(152.81, 95.42));
		add(entities.flowerPatch3(123.94, 83.00));
		add(entities.flowerPatch3(92.38, 156.08));
		add(entities.flowerPatch3(114.88, 134.08));
		add(entities.flowerPatch3(119.13, 154.67));
		add(entities.flowerPatch3(69.41, 133.00));
		add(entities.flowerPatch3(75.69, 154.33));

		add(entities.flowerPatch4(62.44, 131.25));
		add(entities.flowerPatch4(86.63, 146.58));
		add(entities.flowerPatch4(58.69, 150.83));
		add(entities.flowerPatch4(123.78, 155.08));
		add(entities.flowerPatch4(146.72, 153.25));
		add(entities.flowerPatch4(143.81, 95.75));
		add(entities.flowerPatch4(126.75, 85.92));

		add(entities.flowerPatch5(144.03, 148.25));
		add(entities.flowerPatch5(150.09, 134.08));
		add(entities.flowerPatch5(133.28, 91.08));
		add(entities.flowerPatch5(151.09, 97.83));
		add(entities.flowerPatch5(124.47, 85.33));
		add(entities.flowerPatch5(85.41, 157.08));
		add(entities.flowerPatch5(100.66, 147.75));
		add(entities.flowerPatch5(114.91, 132.50));
		add(entities.flowerPatch5(90.47, 132.08));
		add(entities.flowerPatch5(84.16, 148.67));
		add(entities.flowerPatch5(66.50, 133.25));
		add(entities.flowerPatch5(67.94, 138.67));
		add(entities.flowerPatch5(59.44, 153.25));
		add(entities.flowerPatch5(74.44, 156.33));

		add(entities.flowerPatch2(41.28, 96.54));
		add(entities.flowerPatch3(25.19, 88.21));
		add(entities.flowerPatch3(21.66, 109.17));
		add(entities.flowerPatch4(8.53, 102.63));
		add(entities.flowerPatch5(23.28, 112.21));
		add(entities.flowerPatch1(36.00, 126.46));
		add(entities.flowerPatch3(38.50, 123.92));
		add(entities.flowerPatch4(31.50, 126.58));
		add(entities.flowerPatch4(27.81, 122.46));
		add(entities.flowerPatch3(14.91, 140.08));
		add(entities.flowerPatch5(14.75, 137.88));
		add(entities.flowerPatch3(11.66, 152.75));
		add(entities.flowerPatch4(9.69, 150.92));
		add(entities.flowerPatch4(2.66, 117.96));
		add(entities.flowerPatch2(4.44, 113.21));
		add(entities.flowerPatch2(37.97, 64.63));
		add(entities.flowerPatch4(38.94, 62.25));
		add(entities.flowerPatch2(24.28, 61.46));
		add(entities.flowerPatch5(24.53, 60.42));
		add(entities.flowerPatch6(25.84, 66.04));
		add(entities.flowerPatch4(26.25, 45.54));
		add(entities.flowerPatch6(26.56, 43.75));
		add(entities.flowerPatch2(22.63, 24.88));
		add(entities.flowerPatch4(23.47, 21.96));
		add(entities.flowerPatch4(30.69, 14.63));
		add(entities.flowerPatch3(32.81, 16.42));
		add(entities.flowerPatch3(46.13, 4.79));
		add(entities.flowerPatch3(98.97, 10.46));
		add(entities.flowerPatch4(100.94, 44.96));
		add(entities.flowerPatch4(124.34, 43.25));
		add(entities.flowerPatch3(134.41, 45.88));
		add(entities.flowerPatch4(135.47, 27.33));
		add(entities.flowerPatch6(136.63, 29.92));
		add(entities.flowerPatch1(131.78, 4.50));
		add(entities.flowerPatch4(127.97, 4.67));
		add(entities.flowerPatch4(122.09, 28.42));
		add(entities.flowerPatch6(121.53, 30.96));
		add(entities.flowerPatch6(122.31, 41.63));
		add(entities.flowerPatch6(101.91, 47.17));
		add(entities.flowerPatch3(50.66, 39.42));
		add(entities.flowerPatch4(48.47, 38.00));
		add(entities.flowerPatch6(48.78, 41.46));
		add(entities.flowerPatch6(32.63, 46.13));
		add(entities.flowerPatch6(14.94, 55.08));
		add(entities.flowerPatch7(14.25, 56.79));

		// hill above orchard
		add(entities.flowerPatch1(81.56, 17.71));
		add(entities.flowerPatch1(72.44, 12.46));
		add(entities.flowerPatch2(80.38, 13.25));
		add(entities.flowerPatch3(74.09, 21.00));
		add(entities.flowerPatch3(75.25, 5.83));
		add(entities.flowerPatch3(85.31, 10.25));
		add(entities.flowerPatch4(80.25, 4.96));
		add(entities.flowerPatch4(77.38, 18.17));
		add(entities.flowerPatch4(64.22, 5.63));
		add(entities.flowerPatch5(73.69, 19.29));
		add(entities.flowerPatch5(90.22, 11.29));
		add(entities.flowerPatch5(77.34, 3.67));
		add(entities.flowerPatch5(64.88, 12.25));
		add(entities.flowerPatch6(70.34, 12.92));
		add(entities.flowerPatch6(85.75, 9.04));
		add(entities.flowerPatch6(82.91, 3.79));
		add(entities.flowerPatch6(61.38, 5.71));
		add(entities.flowerPatch7(73.63, 3.96));
		add(entities.flowerPatch7(74.53, 18.38));
		add(entities.flowerPatch7(67.19, 11.17));

		add(entities.cloverPatch4(43.94, 116.83));
		add(entities.cloverPatch4(51.00, 116.29));
		add(entities.cloverPatch4(60.47, 117.92));
		add(entities.cloverPatch4(58.16, 109.04));
		add(entities.cloverPatch3(60.66, 116.17));
		add(entities.cloverPatch3(57.13, 117.50));
		add(entities.cloverPatch3(58.06, 110.46));
		add(entities.cloverPatch5(48.88, 113.58));
		add(entities.cloverPatch5(64.38, 113.75));
		add(entities.cloverPatch5(41.97, 105.54));
		add(entities.cloverPatch4(52.97, 103.71));
		add(entities.cloverPatch3(79.19, 115.25));
		add(entities.cloverPatch3(89.06, 117.08));
		add(entities.cloverPatch4(83.25, 110.67));
		add(entities.cloverPatch5(82.50, 113.54));
		add(entities.cloverPatch6(85.84, 117.92));
		add(entities.cloverPatch3(103.38, 108.17));
		add(entities.cloverPatch3(110.06, 117.38));
		add(entities.cloverPatch5(113.78, 117.92));
		add(entities.cloverPatch5(105.91, 107.00));
		add(entities.cloverPatch5(104.47, 109.75));
		add(entities.cloverPatch4(117.47, 97.17));
		add(entities.cloverPatch6(89.69, 83.46));
		add(entities.cloverPatch6(108.50, 73.88));
		add(entities.cloverPatch3(99.00, 64.80));
		add(entities.cloverPatch5(97.78, 66.63));
		add(entities.cloverPatch5(90.38, 69.29));
		add(entities.cloverPatch6(88.81, 65.21));
		add(entities.cloverPatch6(80.59, 53.42));
		add(entities.cloverPatch6(115.03, 45.58));
		add(entities.cloverPatch7(84.66, 55.29));
		add(entities.cloverPatch7(116.16, 45.79));
		add(entities.cloverPatch5(81.72, 54.29));
		add(entities.cloverPatch5(43.53, 75.83));
		add(entities.cloverPatch7(46.38, 76.63));
		add(entities.cloverPatch3(69.98, 48.58));
		add(entities.cloverPatch3(73.11, 43.50));
		add(entities.cloverPatch5(67.27, 48.31));
		add(entities.cloverPatch5(74.25, 45.19));
		add(entities.cloverPatch6(69.94, 47.40));
		add(entities.cloverPatch7(89.36, 63.65));
		add(entities.clover1(72.00, 70.00));
		add(entities.cloverPatch4(55.38, 148.38));
		add(entities.cloverPatch4(42.91, 141.83));
		add(entities.cloverPatch5(64.66, 145.75));
		add(entities.cloverPatch5(48.78, 131.00));
		add(entities.cloverPatch6(46.34, 131.96));
		add(entities.cloverPatch6(91.16, 146.83));
		add(entities.cloverPatch4(103.41, 137.33));
		add(entities.cloverPatch6(134.22, 149.08));
		add(entities.cloverPatch6(133.78, 135.79));
		add(entities.cloverPatch3(151.78, 128.38));
		add(entities.cloverPatch4(156.84, 109.63));
		add(entities.cloverPatch4(123.19, 108.54));
		add(entities.cloverPatch3(152.09, 91.63));
		add(entities.cloverPatch3(126.94, 97.04));
		add(entities.cloverPatch7(149.22, 81.13));
		add(entities.cloverPatch6(157.34, 74.00));
	}

	if (isAutumn) {
		add(entities.leafpileStickRed(151.19, 98.60));
		add(entities.leaves5(150.11, 99.15));
		add(entities.leaves5(143.66, 105.88));
		add(entities.leaves4(149.91, 106.00));
		add(entities.leaves2(143.14, 100.50));
		add(entities.leaves1(67.00, 48.00));
		add(entities.leaves2(68.00, 45.00));
		add(entities.leaves3(61.20, 71.50));
		add(entities.leaves3(46.00, 46.00));
		add(entities.leaves3(86.00, 47.00));
		add(entities.leaves4(83.50, 64.00));
		add(entities.leaves4(88.50, 58.00));
		add(entities.leaves4(71.50, 47.00));
		add(entities.leaves4(45.00, 76.20));
		add(entities.leaves4(84.00, 55.50));
		add(entities.leaves5(82.00, 54.00));
		add(entities.leaves5(69.00, 53.00));
		add(entities.leaves5(42.50, 48.70));
		add(entities.leaves3(70.50, 70.50));
		add(entities.leaves5(53.00, 87.00));
		add(entities.leaves4(57.00, 89.00));
		add(entities.leaves4(117.28, 46.00));
		add(entities.leaves2(61.00, 86.00));
		add(entities.leaves3(66.00, 87.00));
		add(entities.leaves1(69.00, 87.50));
		add(entities.leaves2(72.00, 85.50));
		add(entities.leafpileStickOrange(71.00, 69.50));
		add(entities.leafpileSmallYellow(44.00, 45.50));
		add(entities.leafpileSmallOrange(64.00, 72.00));
		add(entities.leafpileStickOrange(67.50, 47.30));
		add(entities.leafpileStickYellow(84.50, 46.30));
		add(entities.leafpileMediumYellow(47.30, 75.50));
		add(entities.leafpileMediumRed(51.00, 89.00));
		add(entities.leafpileBigYellow(79.00, 54.50));
		add(entities.leafpileBigstickRed(45.00, 52.20));
		add(entities.leafpileBigstickRed(50.50, 88.00));
		add(entities.leafpileSmallOrange(66.40, 58.00));
		add(entities.leafpileBigstickOrange(66.50, 69.80));
		add(entities.leafpileStickOrange(67.50, 71.60));
		add(entities.leafpileSmallOrange(67.00, 70.50));
		add(entities.leafpileSmallYellow(91.00, 95.70));
		add(entities.leafpileBigYellow(84.00, 86.30));
		add(entities.leafpileBigRed(94.00, 91.40));
		add(entities.leafpileBigYellow(76.00, 96.00));
		add(entities.leafpileMediumYellow(77.50, 97.50));
		add(entities.leafpileBigstickRed(85.80, 74.00));
		add(entities.leafpileMediumOrange(87.00, 75.50));
		add(entities.leafpileMediumAltOrange(89.00, 83.50));
		add(entities.leafpileMediumRed(80.00, 92.50));
		add(entities.leafpileSmallOrange(80.00, 84.80));
		add(entities.leaves1(85.00, 90.00));
		add(entities.leaves2(89.00, 95.00));
		add(entities.leaves3(92.00, 93.00));
		add(entities.leaves4(95.00, 88.00));
		add(entities.leaves5(90.00, 85.00));
		add(entities.leaves1(93.00, 77.00));
		add(entities.leaves2(86.00, 83.00));
		add(entities.leaves3(77.00, 82.00));
		add(entities.leaves4(75.00, 84.00));
		add(entities.leaves5(77.00, 91.00));
		add(entities.leaves1(84.00, 92.00));
		add(entities.leaves2(83.00, 97.00));
		add(entities.leaves3(89.00, 95.00));
		add(entities.leaves4(95.00, 94.00));
		add(entities.leaves5(97.00, 88.00));
		add(entities.leaves1(75.00, 81.00));
		add(entities.leaves2(79.00, 95.00));
		add(entities.leaves1(79.00, 77.00));
		add(entities.leaves2(83.00, 73.00));
		add(entities.leaves3(87.00, 71.00));
		add(entities.leaves4(98.00, 73.00));
		add(entities.leafpileBigYellow(96.25, 103.29));
		add(entities.leafpileBigstickYellow(127.69, 95.46));
		add(entities.leafpileBigOrange(118.63, 116.04));
		add(entities.leafpileBigYellow(133.50, 135.38));
		add(entities.leafpileBigRed(118.06, 136.38));
		add(entities.leafpileBigOrange(143.25, 84.21));
		add(entities.leafpileBigstickRed(89.69, 114.71));
		add(entities.leafpileMediumRed(83.19, 112.88));
		add(entities.leafpileMediumOrange(110.81, 126.13));
		add(entities.leafpileMediumYellow(121.81, 137.21));
		add(entities.leafpileMediumRed(137.50, 131.71));
		add(entities.leafpileMediumOrange(123.69, 97.96));
		add(entities.leafpileMediumYellow(109.75, 81.29));
		add(entities.leaves5(101.16, 112.71));
		add(entities.leaves5(152.19, 91.21));
		add(entities.leaves5(100.06, 83.79));
		add(entities.leaves5(151.31, 125.46));
		add(entities.leaves5(147.19, 116.13));
		add(entities.leaves5(141.63, 135.04));
		add(entities.leaves4(115.38, 127.29));
		add(entities.leaves4(143.69, 133.38));
		add(entities.leaves4(148.56, 118.88));
		add(entities.leaves4(150.44, 93.88));
		add(entities.leaves4(107.25, 86.04));
		add(entities.leaves4(122.88, 108.38));
		add(entities.leaves3(153.25, 94.96));
		add(entities.leaves3(156.44, 108.96));
		add(entities.leaves3(142.63, 134.71));
		add(entities.leaves3(151.44, 131.46));
		add(entities.leaves3(101.50, 114.71));
		add(entities.leaves3(102.50, 111.46));
		add(entities.leaves3(116.50, 128.79));
		add(entities.leaves3(107.06, 84.96));
		add(entities.leaves3(122.63, 110.46));
		add(entities.leaves3(132.94, 105.29));
		add(entities.leaves2(148.88, 82.13));
		add(entities.leaves2(109.38, 85.04));
		add(entities.leaves2(103.81, 113.29));
		add(entities.leaves2(130.06, 94.63));
		add(entities.leaves2(120.56, 106.79));
		add(entities.leaves2(148.19, 120.54));
		add(entities.leaves2(142.00, 137.13));
		add(entities.leaves2(152.81, 132.38));
		add(entities.leaves1(157.69, 88.71));
		add(entities.leaves1(149.69, 80.13));
		add(entities.leaves1(105.50, 84.21));
		add(entities.leaves1(108.63, 113.38));
		add(entities.leaves1(116.81, 116.79));
		add(entities.leaves1(117.50, 128.46));

		add(entities.leaves5(65.09, 24.92));
		add(entities.leaves5(42.56, 22.00));
		add(entities.leaves5(45.13, 28.96));
		add(entities.leaves5(71.13, 32.71));
		add(entities.leaves4(62.31, 32.54));
		add(entities.leaves3(41.78, 28.50));
		add(entities.leaves3(63.97, 24.17));
		add(entities.leaves2(66.75, 29.21));
		add(entities.leaves2(68.91, 31.42));
		add(entities.leaves2(59.72, 43.71));
		add(entities.leaves1(61.00, 42.75));
		add(entities.leaves1(47.53, 28.92));
		add(entities.leaves1(41.00, 25.04));
		add(entities.leaves3(66.09, 22.00));
		add(entities.leaves3(72.25, 21.00));
		add(entities.leaves4(69.91, 20.50));
		add(entities.leaves2(46.09, 43.88));
		add(entities.leafpileMediumRed(43.31, 29.25));
		add(entities.leafpileStickYellow(66.63, 27.75));
		add(entities.leafpileMediumYellow(62.44, 16.54));
		add(entities.leaves3(56.81, 17.17));
		add(entities.leaves1(50.16, 31.04));
		add(entities.leafpileBigYellow(32.69, 69.21));
		add(entities.leafpileMediumAltYellow(12.31, 63.63));
		add(entities.leafpileSmallOrange(24.16, 78.67));
		add(entities.leafpileStickYellow(11.88, 64.33));
		add(entities.leaves5(30.59, 66.50));
		add(entities.leaves5(32.41, 54.00));
		add(entities.leaves5(12.34, 61.67));
		add(entities.leaves4(25.91, 77.17));
		add(entities.leaves4(22.81, 66.79));
		add(entities.leaves4(9.94, 57.79));
		add(entities.leaves3(29.69, 54.54));
		add(entities.leaves3(28.97, 64.92));
		add(entities.leaves3(24.41, 79.54));
		add(entities.leaves3(10.97, 61.04));
		add(entities.leaves2(24.94, 67.25));
		add(entities.leaves2(34.81, 68.46));
		add(entities.leaves2(32.13, 56.08));
		add(entities.leaves2(10.97, 63.83));
		add(entities.leaves2(29.03, 77.38));
		add(entities.leaves2(16.09, 48.46));
		add(entities.leaves4(10.75, 46.75));
		add(entities.leaves1(8.53, 59.79));
		add(entities.leaves1(28.75, 66.67));
		add(entities.leaves1(29.97, 51.79));
		add(entities.leaves1(14.47, 65.58));
		add(entities.leaves1(31.38, 78.63));
		add(entities.leafpileBigOrange(23.44, 36.88));
		add(entities.leafpileMediumAltRed(13.09, 45.21));
		add(entities.leafpileMediumYellow(31.22, 25.71));
		add(entities.leafpileStickYellow(26.00, 26.13));
		add(entities.leafpileSmallOrange(20.75, 19.58));
		add(entities.leaves5(24.03, 38.38));
		add(entities.leaves5(29.88, 38.88));
		add(entities.leaves5(28.16, 22.50));
		add(entities.leaves5(24.94, 16.75));
		add(entities.leaves4(12.78, 42.71));
		add(entities.leaves4(26.53, 36.63));
		add(entities.leaves4(21.34, 20.21));
		add(entities.leaves4(26.84, 26.83));
		add(entities.leaves3(28.19, 43.67));
		add(entities.leaves3(28.94, 42.04));
		add(entities.leaves3(8.81, 47.42));
		add(entities.leaves3(24.50, 20.00));
		add(entities.leaves2(32.19, 35.04));
		add(entities.leaves2(30.81, 23.54));
		add(entities.leaves2(24.63, 20.63));
		add(entities.leaves2(39.19, 15.42));
		add(entities.leaves2(15.47, 46.88));
		add(entities.leafpileSmallYellow(30.19, 40.88));
		add(entities.leafpileBigRed(11.22, 9.63));
		add(entities.leafpileMediumAltYellow(38.22, 7.71));
		add(entities.leafpileStickRed(44.44, 6.25));
		add(entities.leafpileSmallOrange(25.31, 8.46));
		add(entities.leaves5(20.84, 6.17));
		add(entities.leaves5(43.78, 6.04));
		add(entities.leaves4(9.06, 7.88));
		add(entities.leaves4(38.94, 5.75));
		add(entities.leaves4(40.34, 13.96));
		add(entities.leaves3(42.78, 15.04));
		add(entities.leaves3(22.81, 8.50));
		add(entities.leaves3(13.06, 9.71));
		add(entities.leaves2(25.25, 6.83));
		add(entities.leaves2(8.44, 5.50));
		add(entities.leaves1(9.16, 5.17));
		add(entities.leaves1(20.44, 5.21));
		add(entities.leaves1(33.75, 22.92));
		add(entities.leaves1(29.09, 21.21));
		add(entities.leaves1(42.03, 5.17));
		add(entities.leafpileMediumAltOrange(59.41, 5.83));
		add(entities.leafpileMediumAltYellow(90.59, 3.33));
		add(entities.leafpileStickRed(75.69, 5.67));
		add(entities.leafpileSmallOrange(70.53, 23.00));
		add(entities.leaves5(84.19, 21.67));
		add(entities.leaves5(77.75, 5.25));
		add(entities.leaves4(75.16, 3.92));
		add(entities.leaves4(76.31, 15.38));
		add(entities.leaves3(87.00, 20.79));
		add(entities.leaves3(76.91, 14.33));
		add(entities.leaves3(89.41, 4.63));
		add(entities.leaves3(71.38, 6.08));
		add(entities.leaves2(71.50, 7.08));
		add(entities.leaves2(83.16, 23.71));
		add(entities.leaves2(88.84, 2.71));
		add(entities.leaves1(84.00, 23.88));
		add(entities.leaves1(75.03, 16.58));
		add(entities.leaves1(87.81, 4.71));
		add(entities.leaves1(91.88, 2.29));
		add(entities.leaves1(73.13, 8.08));
		add(entities.leaves1(72.03, 23.00));
		add(entities.leafpileStickRed(84.03, 36.21));
		add(entities.leafpileSmallYellow(82.78, 30.21));
		add(entities.leaves5(81.00, 32.67));
		add(entities.leaves5(87.53, 34.88));
		add(entities.leaves4(87.78, 37.00));
		add(entities.leaves4(79.47, 35.29));
		add(entities.leaves4(87.69, 29.83));
		add(entities.leaves3(78.34, 36.75));
		add(entities.leaves3(73.16, 35.21));
		add(entities.leaves3(85.66, 33.13));
		add(entities.leaves2(82.81, 36.13));
		add(entities.leaves2(83.94, 28.75));
		add(entities.leaves2(81.94, 29.71));
		add(entities.leaves2(87.00, 29.50));
		add(entities.leaves1(83.81, 30.38));
		add(entities.leaves1(85.38, 37.54));
		add(entities.leaves1(84.44, 37.00));
		add(entities.leaves1(82.34, 20.67));
		add(entities.leaves5(62.47, 5.17));
		add(entities.leaves4(58.72, 6.75));
		add(entities.leaves2(61.34, 3.29));
		add(entities.leaves1(63.25, 5.17));
		add(entities.leaves2(64.00, 2.79));
		add(entities.leafpileMediumYellow(107.56, 35.00));
		add(entities.leafpileStickYellow(115.25, 22.21));
		add(entities.leafpileBigYellow(119.63, 6.58));
		add(entities.leafpileSmallYellow(105.16, 6.21));
		add(entities.leafpileStickYellow(118.34, 33.83));
		add(entities.leaves5(108.16, 32.17));
		add(entities.leaves5(106.63, 21.54));
		add(entities.leaves5(123.50, 9.67));
		add(entities.leaves5(127.22, 34.83));
		add(entities.leaves4(119.25, 7.67));
		add(entities.leaves4(117.25, 8.50));
		add(entities.leaves4(99.06, 37.79));
		add(entities.leaves4(103.13, 19.50));
		add(entities.leaves4(102.75, 4.29));
		add(entities.leaves3(109.03, 24.79));
		add(entities.leaves3(100.38, 21.04));
		add(entities.leaves3(97.16, 36.79));
		add(entities.leaves3(107.97, 9.58));
		add(entities.leaves3(103.78, 7.21));
		add(entities.leaves3(125.94, 12.38));
		add(entities.leaves3(123.09, 12.08));
		add(entities.leaves3(117.41, 34.42));
		add(entities.leaves3(127.53, 38.17));
		add(entities.leaves2(115.56, 34.75));
		add(entities.leaves2(109.88, 33.42));
		add(entities.leaves2(108.41, 25.54));
		add(entities.leaves2(113.69, 21.25));
		add(entities.leaves2(116.34, 7.29));
		add(entities.leaves2(109.38, 7.79));
		add(entities.leaves2(99.69, 5.67));
		add(entities.leaves2(100.88, 19.29));
		add(entities.leaves2(103.63, 35.42));
		add(entities.leaves2(123.16, 36.71));
		add(entities.leaves1(115.16, 20.00));
		add(entities.leaves1(114.69, 22.75));
		add(entities.leaves1(106.69, 24.67));
		add(entities.leaves1(107.91, 8.17));
		add(entities.leaves1(98.56, 5.67));
		add(entities.leaves1(121.91, 6.42));
		add(entities.leaves1(121.84, 9.00));
		add(entities.leaves1(124.28, 13.38));
		add(entities.leaves1(129.13, 37.21));
		add(entities.leaves1(100.31, 36.67));
		add(entities.leaves1(103.75, 23.79));
		add(entities.leaves3(104.19, 15.67));
		add(entities.leaves2(104.00, 17.63));
		add(entities.leafpileBigOrange(137.00, 24.29));
		add(entities.leafpileMediumAltYellow(150.91, 9.96));
		add(entities.leafpileStickYellow(138.81, 9.75));
		add(entities.leaves5(153.50, 23.21));
		add(entities.leaves5(151.94, 5.50));
		add(entities.leaves5(136.25, 3.79));
		add(entities.leaves4(136.75, 8.54));
		add(entities.leaves4(150.34, 12.29));
		add(entities.leaves3(141.63, 8.67));
		add(entities.leaves3(139.16, 23.92));
		add(entities.leaves2(141.03, 22.71));
		add(entities.leaves2(137.41, 25.92));
		add(entities.leaves2(155.00, 26.13));
		add(entities.leaves2(148.31, 11.00));
		add(entities.leaves3(139.63, 2.50));
		add(entities.leaves1(137.13, 26.92));
		add(entities.leaves1(156.41, 26.67));
		add(entities.leaves1(148.88, 12.33));
		add(entities.leaves1(152.66, 7.13));
		add(entities.leaves4(155.44, 6.29));
		add(entities.leaves4(138.94, 5.00));
		add(entities.leaves3(139.19, 10.50));
		add(entities.leaves3(141.06, 25.46));
		add(entities.leaves1(140.13, 27.13));
		add(entities.leaves1(153.84, 22.63));
		add(entities.leafpileStickRed(141.97, 24.58));
		add(entities.leaves1(115.78, 44.00));
		add(entities.leaves2(117.47, 43.38));
		add(entities.leaves3(103.44, 44.88));
		add(entities.leaves2(102.97, 46.21));
		add(entities.leaves1(104.03, 46.50));
		add(entities.leaves4(97.44, 64.04));
		add(entities.leaves2(96.56, 62.67));
		add(entities.leaves3(118.56, 69.04));
		add(entities.leaves2(116.56, 69.13));
		add(entities.leaves1(117.59, 68.46));
		add(entities.leaves1(119.34, 70.96));
		add(entities.leaves2(87.13, 44.96));
		add(entities.leaves2(83.31, 53.04));
		add(entities.leaves5(155.84, 73.50));
		add(entities.leaves4(156.66, 75.67));
		add(entities.leaves1(154.56, 75.88));
		add(entities.leaves4(148.13, 80.63));
		add(entities.leaves2(147.16, 79.13));
		add(entities.leaves2(139.81, 83.63));
		add(entities.leaves3(141.75, 85.67));
		add(entities.leaves1(141.19, 84.75));
		add(entities.leaves1(133.78, 67.58));
		add(entities.leaves2(134.66, 67.67));
		add(entities.leaves3(136.22, 66.25));
		add(entities.leaves1(135.81, 67.83));
		add(entities.leaves1(142.66, 86.50));
		add(entities.leaves1(157.56, 77.25));
		add(entities.leaves4(151.13, 87.50));
		add(entities.leaves2(150.66, 86.21));
		add(entities.leaves2(158.03, 85.54));
		add(entities.leaves4(144.44, 94.21));
		add(entities.leaves4(127.34, 92.50));
		add(entities.leaves2(126.97, 91.79));
		add(entities.leaves2(131.22, 95.79));
		add(entities.leaves1(125.72, 99.46));
		add(entities.leaves1(125.13, 108.04));
		add(entities.leaves1(155.22, 106.42));
		add(entities.leaves2(152.72, 99.21));
		add(entities.leaves2(147.91, 95.67));
		add(entities.leaves2(132.94, 107.50));
		add(entities.leaves3(131.41, 149.21));
		add(entities.leaves2(131.09, 148.13));
		add(entities.leaves1(131.72, 147.54));
		add(entities.leaves4(134.91, 148.83));
		add(entities.leaves4(137.22, 137.63));
		add(entities.leaves4(110.41, 130.33));
		add(entities.leaves4(118.78, 138.54));
		add(entities.leaves2(116.84, 137.79));
		add(entities.leaves2(112.13, 130.17));
		add(entities.leaves3(25.44, 84.75));
		add(entities.leaves1(26.38, 83.79));
		add(entities.leaves4(86.25, 114.58));
		add(entities.leaves5(89.63, 117.63));
		add(entities.leaves2(86.25, 117.00));
		add(entities.leaves1(84.25, 117.21));
		add(entities.leaves5(41.75, 82.58));
		add(entities.leaves2(38.91, 80.96));
		add(entities.leaves1(40.78, 84.29));
		add(entities.leaves3(40.75, 81.38));
	}

	function addSnowpony(x: number, y: number, type: number) {
		const snowpony = entities.snowponies[type - 1];
		const entity = add(snowpony(x, y + 0.5));
		lockTile(map, entity.x - 0.5, entity.y);
		lockTile(map, entity.x + 0.5, entity.y);
	}

	function addSnowPile(entity: ServerEntity) {
		add(entity);
		lockTile(map, entity.x - 0.5, entity.y);
		lockTile(map, entity.x + 0.5, entity.y);

		if (
			entity.type === entities.snowPileSmall.type ||
			entity.type === entities.snowPileMedium.type ||
			entity.type === entities.snowPileBig.type
		) {
			lockTile(map, entity.x - 0.5, entity.y - 1);
			lockTile(map, entity.x + 0.5, entity.y - 1);
		}

		if (
			entity.type === entities.snowPileMedium.type ||
			entity.type === entities.snowPileBig.type
		) {
			lockTile(map, entity.x - 1, entity.y);
			lockTile(map, entity.x - 0.5, entity.y + 1);
			lockTile(map, entity.x + 0.5, entity.y + 1);
		}

		if (entity.type === entities.snowPileBig.type) {
			lockTile(map, entity.x + 1, entity.y);
			lockTile(map, entity.x - 1.5, entity.y);
			lockTile(map, entity.x - 1, entity.y + 1);
			lockTile(map, entity.x + 1, entity.y + 1);
		}
	}

	if (isWinter) {
		addSnowpony(44.00, 57.00, 1);
		addSnowpony(65.00, 64.00, 1);
		addSnowpony(68.00, 65.00, 2);
		addSnowpony(84.00, 56.00, 2);
		addSnowpony(67.00, 82.00, 1);
		addSnowpony(59.00, 87.00, 2);
		addSnowpony(85.19, 152.67, 3);
		addSnowpony(86.16, 153.04, 6);
		addSnowpony(86.09, 122.83, 4);
		addSnowpony(115.09, 109.13, 5);
		addSnowpony(108.31, 128.29, 3);
		addSnowpony(88.44, 104.71, 7);
		addSnowpony(106.50, 86.13, 9);
		addSnowpony(107.31, 86.67, 8);
		addSnowpony(87.88, 92.33, 5);
		addSnowpony(107.50, 58.83, 1);
		addSnowpony(85.09, 56.92, 1);
		addSnowpony(83.38, 57.25, 6);
		addSnowpony(66.03, 83.13, 7);
		addSnowpony(51.69, 102.38, 1);
		addSnowpony(69.41, 112.50, 1);
		addSnowpony(67.84, 111.17, 4);
		addSnowpony(53.69, 133.33, 9);
		addSnowpony(59.75, 119.79, 6);
		addSnowpony(65.03, 156.46, 2);
		addSnowpony(49.13, 148.38, 3);
		addSnowpony(119.19, 149.96, 3);
		addSnowpony(136.06, 156.00, 7);
		addSnowpony(141.22, 130.92, 5);
		addSnowpony(116.06, 136.58, 2);
		addSnowpony(147.50, 101.04, 4);
		addSnowpony(138.91, 97.92, 3);
		addSnowpony(125.50, 88.75, 2);
		addSnowpony(137.13, 67.50, 7);
		addSnowpony(115.13, 65.88, 2);
		addSnowpony(135.53, 44.33, 2);
		addSnowpony(153.34, 51.00, 5);
		addSnowpony(156.78, 60.08, 3);
		addSnowpony(116.88, 46.79, 8);
		addSnowpony(123.56, 53.67, 3);
		addSnowpony(100.56, 44.75, 4);
		addSnowpony(156.31, 124.88, 3);
		addSnowpony(149.50, 150.00, 6);
		addSnowpony(54.41, 132.83, 8);

		addSnowpony(29.69, 67.63, 1);
		addSnowpony(26.72, 44.42, 2);
		addSnowpony(23.22, 26.04, 3);
		addSnowpony(20.97, 27.21, 4);
		addSnowpony(12.97, 14.71, 5);
		addSnowpony(37.81, 28.21, 6);
		addSnowpony(50.38, 4.00, 7);
		addSnowpony(81.78, 18.00, 8);
		addSnowpony(80.00, 19.50, 1);
		addSnowpony(84.25, 3.08, 2);
		addSnowpony(97.19, 21.25, 3);
		addSnowpony(86.47, 38.42, 4);
		addSnowpony(122.47, 27.42, 5);
		addSnowpony(133.44, 7.54, 6);
		addSnowpony(130.31, 9.04, 7);
		addSnowpony(143.41, 19.42, 8);
		addSnowpony(20.63, 78.13, 1);
		addSnowpony(25.25, 90.63, 2);
		addSnowpony(27.56, 102.08, 3);
		addSnowpony(22.19, 109.83, 4);
		addSnowpony(5.72, 113.42, 5);
		addSnowpony(2.19, 116.75, 6);
		addSnowpony(13.75, 138.71, 7);
		addSnowpony(3.50, 150.63, 8);
		addSnowpony(35.09, 151.63, 1);
		addSnowpony(37.75, 123.75, 2);

		addSnowPile(entities.snowPileBig(67.06, 78.46));
		addSnowPile(entities.snowPileMedium(65.25, 77.21));
		addSnowPile(entities.snowPileSmall(61.13, 70.08));
		addSnowPile(entities.snowPileSmall(68.44, 71.25));
		addSnowPile(entities.snowPileBig(74.84, 94.58));
		addSnowPile(entities.snowPileSmall(76.56, 95.50));
		addSnowPile(entities.snowPileBig(52.97, 60.04));
		addSnowPile(entities.snowPileBig(80.63, 54.29));
		addSnowPile(entities.snowPileSmall(82.94, 65.04));
		addSnowPile(entities.snowPileBig(117.19, 80.38));
		addSnowPile(entities.snowPileSmall(122.19, 83.38));
		addSnowPile(entities.snowPileSmall(135.81, 66.58));
		addSnowPile(entities.snowPileBig(150.25, 99.42));
		addSnowPile(entities.snowPileMedium(143.50, 106.67));
		addSnowPile(entities.snowPileSmall(148.28, 98.88));
		addSnowPile(entities.snowPileMedium(115.75, 98.04));
		addSnowPile(entities.snowPileMedium(139.81, 85.25));
		addSnowPile(entities.snowPileMedium(137.53, 98.79));
		addSnowPile(entities.snowPileMedium(115.50, 45.79));
		addSnowPile(entities.snowPileBig(151.88, 138.79));
		addSnowPile(entities.snowPileSmall(150.09, 138.00));
		addSnowPile(entities.snowPileSmall(140.28, 144.50));
		addSnowPile(entities.snowPileSmall(102.56, 147.13));
		addSnowPile(entities.snowPileBig(92.75, 139.75));
		addSnowPile(entities.snowPileBig(74.34, 157.38));
		addSnowPile(entities.snowPileSmall(73.19, 155.96));
		addSnowPile(entities.snowPileSmall(87.09, 147.63));
		addSnowPile(entities.snowPileBig(69.59, 134.54));
		addSnowPile(entities.snowPileMedium(84.66, 130.25));
		addSnowPile(entities.snowPileMedium(77.41, 121.38));
		addSnowPile(entities.snowPileSmall(79.13, 120.75));
		addSnowPile(entities.snowPileSmall(77.34, 133.83));
		addSnowPile(entities.snowPileBig(72.84, 106.33));
		addSnowPile(entities.snowPileMedium(63.41, 121.63));
		addSnowPile(entities.snowPileSmall(64.91, 122.29));
		addSnowPile(entities.snowPileTiny(71.06, 70.04));
		addSnowPile(entities.snowPileTiny(64.25, 77.88));
		addSnowPile(entities.snowPileTiny(44.41, 76.17));
		addSnowPile(entities.snowPileTiny(51.28, 69.00));
		addSnowPile(entities.snowPileTiny(74.56, 83.79));
		addSnowPile(entities.snowPileTinier(64.72, 78.29));
		addSnowPile(entities.snowPileTinier(67.31, 71.04));
		addSnowPile(entities.snowPileTinier(60.56, 69.21));
		addSnowPile(entities.snowPileTinier(51.44, 59.58));
		addSnowPile(entities.snowPileTinier(74.19, 84.25));
		addSnowPile(entities.snowPileTiny(49.75, 87.50));
		addSnowPile(entities.snowPileTiny(77.31, 100.83));
		addSnowPile(entities.snowPileTiny(75.81, 118.29));
		addSnowPile(entities.snowPileTiny(74.25, 106.83));
		addSnowPile(entities.snowPileTinier(76.22, 118.58));
		addSnowPile(entities.snowPileTinier(73.75, 107.00));
		addSnowPile(entities.snowPileTinier(75.63, 95.92));
		addSnowPile(entities.snowPileTiny(62.28, 121.96));
		addSnowPile(entities.snowPileTinier(62.91, 122.42));
		addSnowPile(entities.snowPileTinier(86.19, 147.25));
		addSnowPile(entities.snowPileTinier(78.50, 121.54));
		addSnowPile(entities.snowPileTiny(85.69, 130.50));
		addSnowPile(entities.snowPileTiny(72.44, 156.25));
		addSnowPile(entities.snowPileTiny(101.75, 146.29));
		addSnowPile(entities.snowPileTiny(112.34, 152.42));
		addSnowPile(entities.snowPileTiny(93.28, 110.67));
		addSnowPile(entities.snowPileTiny(103.28, 122.71));
		addSnowPile(entities.snowPileTinier(103.75, 122.96));
		addSnowPile(entities.snowPileTinier(93.72, 111.00));
		addSnowPile(entities.snowPileTiny(116.81, 97.13));
		addSnowPile(entities.snowPileTiny(110.28, 91.79));
		addSnowPile(entities.snowPileTiny(115.78, 80.96));
		addSnowPile(entities.snowPileTinier(116.16, 81.33));
		addSnowPile(entities.snowPileTinier(123.00, 83.42));
		addSnowPile(entities.snowPileTinier(116.66, 45.96));
		addSnowPile(entities.snowPileTinier(140.84, 85.33));
		addSnowPile(entities.snowPileTiny(138.75, 98.96));
		addSnowPile(entities.snowPileTinier(139.09, 98.79));
		addSnowPile(entities.snowPileTiny(148.47, 99.33));
		addSnowPile(entities.snowPileTinier(147.34, 98.58));
		addSnowPile(entities.snowPileTinier(144.66, 106.79));
		addSnowPile(entities.snowPileTiny(149.13, 138.50));
		addSnowPile(entities.snowPileTiny(141.09, 144.63));
		addSnowPile(entities.snowPileTinier(149.63, 138.88));
		addSnowPile(entities.snowPileTinier(140.63, 145.00));
		addSnowPile(entities.snowPileTiny(85.88, 147.67));
		addSnowPile(entities.snowPileTiny(94.34, 139.96));
		addSnowPile(entities.snowPileTinier(82.88, 56.88));
		addSnowPile(entities.snowPileTiny(85.84, 56.54));
		addSnowPile(entities.snowPileTinier(85.31, 57.13));
		addSnowPile(entities.snowPileTiny(66.91, 82.79));
		addSnowPile(entities.snowPileTinier(66.47, 83.21));
		addSnowPile(entities.snowPileTinier(65.38, 82.92));
		addSnowPile(entities.snowPileTinier(68.75, 112.17));
		addSnowPile(entities.snowPileTinier(54.13, 133.38));
		addSnowPile(entities.snowPileTinier(84.44, 152.42));
		addSnowPile(entities.snowPileTiny(85.41, 152.96));
		addSnowPile(entities.snowPileTiny(86.56, 152.04));
		addSnowPile(entities.snowPileTinier(86.97, 152.38));
		addSnowPile(entities.snowPileTinier(105.84, 85.96));
		addSnowPile(entities.snowPileTiny(106.53, 86.29));
		addSnowPile(entities.snowPileTinier(107.91, 86.42));
		addSnowPile(entities.snowPileTinier(155.66, 61.17));
		addSnowPile(entities.snowPileTiny(157.47, 60.42));
		addSnowPile(entities.snowPileTinier(157.72, 60.21));
		addSnowPile(entities.snowPileTinier(116.22, 46.42));
		addSnowPile(entities.snowPileBig(94.25, 68.29));
		addSnowPile(entities.snowPileMedium(73.56, 43.42));
		addSnowPile(entities.snowPileMedium(52.75, 38.46));
		addSnowPile(entities.snowPileSmall(52.03, 39.88));
		addSnowPile(entities.snowPileBig(43.72, 30.13));
		addSnowPile(entities.snowPileSmall(54.22, 17.13));
		addSnowPile(entities.snowPileTiny(48.69, 30.38));
		addSnowPile(entities.snowPileTiny(53.22, 39.46));
		addSnowPile(entities.snowPileTiny(60.19, 34.79));
		addSnowPile(entities.snowPileSmall(79.28, 37.21));
		addSnowPile(entities.snowPileSmall(84.19, 22.21));
		addSnowPile(entities.snowPileBig(99.34, 21.25));
		addSnowPile(entities.snowPileTiny(97.88, 22.29));
		addSnowPile(entities.snowPileSmall(106.94, 42.13));
		addSnowPile(entities.snowPileMedium(120.38, 26.79));
		addSnowPile(entities.snowPileSmall(121.00, 28.00));
		addSnowPile(entities.snowPileMedium(145.56, 20.17));
		addSnowPile(entities.snowPileBig(144.41, 21.29));
		addSnowPile(entities.snowPileBig(134.91, 4.46));
		addSnowPile(entities.snowPileSmall(120.56, 7.88));
		addSnowPile(entities.snowPileSmall(155.88, 55.21));
		addSnowPile(entities.snowPileSmall(148.28, 114.38));
		addSnowPile(entities.snowPileSmall(138.84, 154.50));
		addSnowPile(entities.snowPileMedium(139.88, 153.13));
		addSnowPile(entities.snowPileMedium(60.38, 150.25));
		addSnowPile(entities.snowPileBig(36.41, 149.33));
		addSnowPile(entities.snowPileMedium(37.31, 150.63));
		addSnowPile(entities.snowPileMedium(16.25, 138.88));
		addSnowPile(entities.snowPileSmall(15.31, 139.83));
		addSnowPile(entities.snowPileSmall(2.63, 149.38));
		addSnowPile(entities.snowPileMedium(4.19, 113.96));
		addSnowPile(entities.snowPileSmall(4.97, 115.08));
		addSnowPile(entities.snowPileSmall(29.34, 102.83));
		addSnowPile(entities.snowPileMedium(25.66, 89.00));
		addSnowPile(entities.snowPileSmall(26.91, 89.88));
		addSnowPile(entities.snowPileSmall(32.91, 69.38));
		addSnowPile(entities.snowPileSmall(21.13, 76.46));
		addSnowPile(entities.snowPileMedium(15.81, 53.46));
		addSnowPile(entities.snowPileMedium(25.94, 27.25));
		addSnowPile(entities.snowPileSmall(24.22, 28.50));
		addSnowPile(entities.snowPileBig(13.53, 17.13));
		addSnowPile(entities.snowPileSmall(12.34, 16.38));
		addSnowPile(entities.snowPileSmall(22.59, 5.46));
		addSnowPile(entities.snowPileMedium(52.38, 3.96));
		addSnowPile(entities.snowPileTiny(51.13, 4.71));
		addSnowPile(entities.snowPileTinier(50.94, 13.33));
		addSnowPile(entities.snowPileSmall(89.22, 2.71));
	}

	function addXmasTree(x: number, y: number) {
		x -= 33;
		y -= 24;
		addEntities(entities.pine(x + 33, y + 24, 1));
		add(entities.xmasLights(x + 33, y + 24));
		add(entities.xmasLight(x + 33.22, y + 24.88));
		add(entities.xmasLight(x + 33.59, y + 24.04));
		add(entities.xmasLight(x + 32.28, y + 24.08));
		add(entities.xmasLight(x + 31.84, y + 24.42));
		add(entities.xmasLight(x + 30.97, y + 24.00));
		add(entities.xmasLight(x + 32.31, y + 22.63));
		add(entities.xmasLight(x + 31.63, y + 21.75));
		add(entities.xmasLight(x + 32.75, y + 20.92));
		add(entities.xmasLight(x + 32.19, y + 19.50));
		add(entities.xmasLight(x + 32.75, y + 18.17));
		add(entities.xmasLight(x + 33.38, y + 18.42));
		add(entities.xmasLight(x + 33.38, y + 19.79));
		add(entities.xmasLight(x + 33.94, y + 20.42));
		add(entities.xmasLight(x + 33.63, y + 22.33));
		add(entities.xmasLight(x + 34.00, y + 22.46));
		add(entities.xmasLight(x + 34.38, y + 21.83));
		add(entities.xmasLight(x + 35.00, y + 23.63));
		add(entities.xmasLight(x + 34.56, y + 24.17));
	}

	function addGraveWithGhost(x: number, y: number, tombType: number) {
		const tombs = [entities.tombstone1, entities.tombstone2];
		const tomb = add(tombs[tombType](x, y));
		const createGhost = tombType === 0 ? entities.ghost1 : entities.ghost2;
		const createGhostHooves = tombType === 0 ? entities.ghostHooves1 : entities.ghostHooves2;
		const ghost = add(createGhost(x + toWorldX(1), y));
		const hooves = add(createGhostHooves(x + toWorldX(1), y));
		return { tomb, ghost, hooves };
	}

	const addGhost = (x: number, y: number, tombType: number, anims?: number[]) => {
		const { ghost, hooves, tomb } = addGraveWithGhost(x, y, tombType);
		const randomDelay = () => random(1 * 60, 5 * 60, true);
		let delay = randomDelay();
		let resetDelay = 0;
		let reset = true;

		ghost.serverUpdate = delta => {
			delay -= delta;
			resetDelay -= delta;

			if (delay < 0) {
				const flip = Math.random() > 0.5;
				const anim = sample(anims || (tomb.type === entities.tombstone1.type ? [1, 3] : [1, 2, 3]))!;
				setEntityAnimation(ghost, anim, flip);
				setEntityAnimation(hooves, anim, flip);
				delay = randomDelay();
				reset = false;
				resetDelay = 5;
			} else if (!reset && resetDelay < 0) {
				setEntityAnimation(ghost, GhostAnimation.None);
				setEntityAnimation(hooves, GhostAnimation.None);
				reset = true;
			}
		};
	};

	const createEyes = (x: number, y: number) => {
		const entity = add(entities.eyes(x, y));
		let delay = 5;
		let open = true;

		entity.serverUpdate = delta => {
			delay -= delta;

			if (delay < 0) {
				if (open) {
					setEntityAnimation(entity, 1);
					delay = 0.2;
					open = false;
				} else {
					setEntityAnimation(entity, 0);
					delay = random(5, 10, true);
					open = true;
				}
			}
		};
	};

	const addJacko = (x: number, y: number) => {
		add(entities.jacko(x, y)).boop = boopLight;
	};

	const addJackoLanternSpot = (x: number, y: number) => {
		const giveLantern = give(entities.jackoLanternOn.type, 'Now go collect some candies!');

		add(createSign(x, y, 'Jack-o-Lanterns', giveLantern, entities.signQuest));

		addJacko(x + 0.5, y - 0.3);
		addJacko(x - 0.3, y + 0.3);

		add(entities.jackoLanternOff(x + 0.2, 17.7 + y - 18.5));
		add(entities.jackoLanternOff(x + 0.7, 17.8 + y - 18.5));
		add(entities.jackoLanternOff(x + 0.3, y + 0.2));
		add(entities.jackoLanternOff(x + 0.7, y + 0.5));
		add(entities.jackoLanternOn(x, 19.2 + y - 18.5));
		add(entities.jackoLanternOn(x + 0.5, 19.4 + y - 18.5));
		add(entities.jackoLanternOn(x - 0.9, 19.2 + y - 18.5));
	};

	if (isHalloween) {
		const donateX = 64, donateY = 79;
		add(createSign(donateX, donateY, 'Donate candies', donateCandy, entities.signDonate));
		add(entities.box(donateX + 0.1, donateY + 1.2)).interact = donateCandy;

		add(entities.jackoOn(132.69, 108.79));
		add(entities.jackoOn(131.31, 134.79));
		add(entities.jackoOn(134.55, 139.38));
		add(entities.jackoOn(122.94, 105.38));
		add(entities.jackoOn(126.63, 107.38));
		add(entities.jackoOn(127.75, 110.88));
		add(entities.jackoOn(126.13, 124.38));
		add(entities.jackoOn(126.44, 133.71));
		add(entities.jackoOn(126.88, 137.71));
		add(entities.jackoOn(132.38, 136.88));

		addGhost(149.53, 135.58, 1);
		addGhost(144.38, 100.21, 1);
		addGhost(149.84, 100.58, 1);
		add(entities.tombstone2(144.56, 105.25));
		addGhost(146.34, 105.29, 1);
		add(entities.tombstone1(146.28, 100.50));
		addGhost(148.25, 100.50, 0);
		add(entities.tombstone1(148.34, 105.38));
		add(entities.tombstone1(150.03, 105.21));
		addGhost(102.28, 93.29, 1);
		addGhost(66.59, 57.46, 1);
		addGhost(72.19, 69.21, 1);

		createEyes(155.52, 102.73);
		createEyes(156.81, 104.02);
		createEyes(155.66, 104.71);
		createEyes(158.05, 106.65);
		createEyes(147.25, 111.96);
		createEyes(146.59, 109.33);
		createEyes(148.19, 110.27);
		createEyes(141.31, 111.52);
		createEyes(145.23, 115.35);
		createEyes(144.16, 114.44);
		createEyes(142.39, 107.33);
		createEyes(141.19, 108.63);
		createEyes(142.39, 111.02);
		createEyes(149.59, 113.52);
		createEyes(150.22, 113.06);
		createEyes(140.02, 107.44);
		createEyes(142.83, 115.50);
		createEyes(138.78, 111.50);
		createEyes(137.22, 112.27);

		createEyes(144.59, 93.00);
		createEyes(145.43, 93.95);
		createEyes(147.40, 91.25);
		createEyes(146.90, 93.04);
		createEyes(148.68, 92.37);
		createEyes(153.15, 94.29);
		createEyes(154.46, 94.95);
		createEyes(152.40, 96.08);
		createEyes(154.87, 97.20);
		createEyes(155.53, 97.79);

		add(entities.jackoLanternOn(131.97, 149.77));
		add(entities.jackoLanternOn(132.02, 83.46));
		add(entities.jackoLanternOn(131.98, 149.85));
		add(entities.jackoLanternOn(106.45, 150.31));
		add(entities.jackoLanternOn(107.14, 149.79));
		add(entities.jackoLanternOn(80.33, 93.19));

		addGhost(45.34, 152.83, 0);
		addGhost(45.75, 106.08, 0);
		addGhost(59.78, 96.83, 0);
		addGhost(81.00, 93.00, 0);
		addGhost(83.62, 132.875, 0);
		addGhost(115.96, 45.79, 0);
		addGhost(149.75, 81.58, 0);
		addGhost(52.40, 138.70, 1);
		addGhost(52.12, 88.29, 1);
		addGhost(49.06, 64.83, 1);
		addGhost(48.43, 50.83, 1);
		addGhost(80.72, 115.83, 1);
		addGhost(86.50, 46.83, 1);
		addGhost(113.812, 107.37, 1);
		addGhost(118.062, 125.12, 1);
		addGhost(106.59, 149.83, 1);
		addGhost(132.43, 83.12, 1);
		addGhost(135.46, 67.66, 1);
		addGhost(131.53, 149.50, 1);

		add(entities.jackoLanternOn(45.84, 153.20));
		add(entities.jackoLanternOn(46.15, 152.75));
		add(entities.jackoLanternOn(53.00, 138.70));
		add(entities.jackoLanternOn(48.56, 64.58));
		add(entities.jackoLanternOn(48.93, 51.04));
		add(entities.jackoLanternOn(72.53, 69.58));
		add(entities.jackoLanternOn(80.31, 116.16));
		add(entities.jackoLanternOn(83.06, 133.29));
		add(entities.jackoLanternOn(86.15, 47.12));
		add(entities.jackoLanternOn(115.50, 46.13));
		add(entities.jackoLanternOn(114.25, 107.83));
		add(entities.jackoLanternOn(114.53, 107.41));
		add(entities.jackoLanternOn(132.03, 83.41));
		add(entities.jackoLanternOn(132.93, 83.08));
		add(entities.jackoLanternOn(115.50, 46.12));
		add(entities.jackoLanternOn(149.15, 81.37));
		add(entities.jackoLanternOn(144.15, 105.58));
		add(entities.jackoLanternOn(146.75, 100.83));
		add(entities.jackoLanternOn(150.63, 105.58));

		add(entities.jackoLanternOn(52.68, 139.04));
		add(entities.jackoLanternOn(46.28, 106.41));
		add(entities.jackoLanternOn(52.53, 88.62));
		add(entities.jackoLanternOn(135.84, 67.91));

		add(entities.jackoLanternOff(52.62, 88.12));
		add(entities.jackoLanternOff(106.09, 150.04));
		add(entities.jackoLanternOff(51.93, 138.58));

		addJacko(71.90, 70.00);
		addJacko(90.20, 66.40);
		addJacko(80.00, 53.80);
		addJacko(67.30, 88.60);
		addJacko(86.20, 97.30);
		addJacko(99.70, 92.00);
		addJacko(91.00, 86.10);
		addJacko(85.70, 75.10);
		addJacko(84.50, 91.40);
		addJacko(99.00, 87.00);
		addJacko(91.60, 55.90);
		addJacko(95.60, 47.50);
		addJacko(98.40, 44.20);
		addJacko(100.10, 49.00);
		addJacko(87.20, 46.50);
		addJacko(69.70, 47.20);
		addJacko(49.10, 89.50);
		addJacko(59.10, 97.60);
		addJacko(46.70, 98.10);
		addJacko(52.20, 77.40);
		addJacko(62.50, 72.20);
		addJacko(66.70, 71.40);

		addJacko(97.50, 100.79);
		addJacko(110.34, 92.79);
		addJacko(117.34, 99.38);
		addJacko(108.94, 101.50);
		addJacko(109.63, 102.21);
		addJacko(108.00, 85.00);
		addJacko(93.50, 106.17);
		addJacko(113.22, 108.17);
		addJacko(117.56, 117.38);
		addJacko(118.81, 125.33);
		addJacko(117.25, 127.71);
		addJacko(118.03, 129.50);
		addJacko(93.22, 135.46);
		addJacko(78.94, 147.54);
		addJacko(82.00, 147.67);
		addJacko(102.06, 146.83);
		addJacko(96.59, 146.58);
		addJacko(108.75, 141.33);
		addJacko(110.03, 146.71);
		addJacko(147.88, 148.04);
		addJacko(145.41, 150.08);
		addJacko(147.28, 153.67);
		addJacko(150.78, 153.00);
		addJacko(150.78, 149.08);
		addJacko(152.88, 131.38);
		addJacko(143.25, 137.17);
		addJacko(141.22, 116.13);
		addJacko(138.16, 132.46);
		addJacko(141.34, 102.04);
		addJacko(141.31, 103.88);
		addJacko(134.56, 86.71);
		addJacko(139.34, 85.29);
		addJacko(148.50, 81.71);
		addJacko(150.09, 82.54);
		addJacko(129.78, 98.67);
		addJacko(136.75, 66.38);
		addJacko(117.63, 70.33);
		addJacko(131.81, 52.63);
		addJacko(116.72, 46.21);
		addJacko(137.22, 55.25);
		addJacko(131.91, 49.21);
		addJacko(124.63, 47.08);
		addJacko(122.69, 51.58);

		addJacko(125.97, 145.21);
		addJacko(115.91, 139.92);
		addJacko(119.59, 145.54);

		addJacko(53.59, 133.58);
		addJacko(48.78, 136.08);
		addJacko(48.22, 142.75);
		addJacko(55.22, 143.50);
		addJacko(58.34, 135.21);
		addJacko(58.94, 140.63);

		addJacko(76.63, 125.00);
		addJacko(76.59, 128.88);
		addJacko(77.06, 120.88);
		addJacko(86.91, 121.08);
		addJacko(86.84, 129.33);
		addJacko(76.91, 134.63);
		addJacko(86.47, 135.50);
		addJacko(137.40, 97.60);

		addJacko(44.53, 152.91);
		addJacko(49.56, 65.16);
		addJacko(81.50, 92.41);
		addJacko(81.18, 116.25);
		addJacko(116.71, 46.20);
		addJacko(118.81, 125.33);
		addJacko(148.50, 81.70);
		addJacko(150.09, 82.54);
		addJacko(151.46, 99.08);

		addJacko(45.09, 105.75);

		add(entities.jackoLanternOff(66.60, 72.10));
		add(entities.jackoLanternOff(67.20, 71.90));

		addJackoLanternSpot(101.00, 100.00);
		addJackoLanternSpot(147.00, 135.00);
		addJackoLanternSpot(190.00, 176.00);
		addJackoLanternSpot(107.00, 173.00);
		addJackoLanternSpot(165.00, 95.00);
	}

	if (isChristmas) {
		addEntities(createToyStash(103.87, 86.12));

		const donateX = 64, donateY = 79;
		add(createSign(donateX, donateY, 'Donate gifts', donateGift, entities.signDonate));
		add(entities.boxGifts(donateX + 0.1, donateY + 1.2)).interact = donateGift;

		const xmasTreeY = 49.5, xmasTreeX = 40.25;
		addXmasTree(33 + xmasTreeX, 24 + xmasTreeY);
		add(entities.giftPilePine(33 + xmasTreeX, 24.5 + xmasTreeY));
		add(entities.giftPile6(31.13 + xmasTreeX, 25.13 + xmasTreeY));
		add(entities.giftPile1(34.75 + xmasTreeX, 25.71 + xmasTreeY));
		add(createCookieTable(32.7 + xmasTreeX, 26.5 + xmasTreeY));

		add(entities.mistletoe(86.40, 83.00));
		add(entities.mistletoe(92.00, 93.00));
		add(entities.giftPile4(43.50, 53.50));
		add(entities.giftPileTree(81.10, 92.50));
		add(entities.giftPile1(76.00, 90.00));
		add(entities.giftPile3(79.00, 53.00));
		add(entities.giftPile6(85.00, 54.50));

		add(entities.giftPileTree(97.28, 64.38));
		add(entities.giftPilePine(63.03, 98.38));
		add(entities.giftPile5(65.25, 98.83));
		add(entities.giftPile6(61.03, 99.29));
		add(entities.giftPile1(65.09, 112.96));
		add(entities.giftPile3(63.06, 113.67));
		add(entities.giftPile4(64.59, 114.71));
		add(entities.giftPile2(57.50, 146.04));
		add(entities.giftPile6(58.25, 147.67));
		add(entities.giftPileTree(132.38, 149.08));
		add(entities.giftPile5(134.03, 149.33));
		add(entities.giftPile2(147.47, 126.58));
		add(entities.giftPileTree(137.84, 115.21));
		add(entities.giftPile5(134.06, 121.79));
		add(entities.giftPilePine(147.59, 101.86));
		add(entities.giftPile1(143.16, 98.99));
		add(entities.giftPile4(134.41, 67.58));
		add(entities.giftPilePine(154.81, 55.63));
		add(entities.giftPile1(144.13, 45.54));
		add(entities.giftPile3(132.66, 47.25));
		add(entities.giftPileTree(118.78, 48.25));

		add(entities.giftPile1(51.31, 31.33));
		add(entities.giftPile2(58.66, 31.75));
		add(entities.giftPile4(72.28, 37.50));
		add(entities.giftPile6(91.06, 38.13));
		add(entities.giftPile3(100.00, 38.17));
		add(entities.giftPileTree(143.56, 14.21));
		add(entities.giftPile1(126.03, 12.08));
		add(entities.giftPileInteractive(148.91, 34.50));
		add(entities.giftPile6(96.97, 11.79));
		add(entities.giftPile2(77.22, 6.46));
		add(entities.giftPileTree(62.66, 6.13));
		add(entities.giftPile3(20.78, 6.71));
		add(entities.giftPile1(8.41, 15.75));
		add(entities.giftPile6(15.13, 32.08));
		add(entities.giftPileInteractive(14.22, 33.04));
		add(entities.giftPileTree(25.66, 59.29));
		add(entities.giftPile6(16.03, 77.17));
		add(entities.giftPile1(22.09, 105.88));
		add(entities.giftPileInteractive(9.34, 96.17));
		add(entities.giftPile3(24.25, 144.25));
		add(entities.giftPile6(14.88, 155.13));
		add(entities.giftPile1(33.19, 133.13));
		add(entities.giftPile6(41.56, 122.17));

		add(entities.holly(121.00, 145.17));
		add(entities.holly(122.03, 145.17));
		add(entities.holly(123.00, 145.13));
		add(entities.holly(125.00, 145.13));
		add(entities.holly(118.00, 140.17));
		add(entities.holly(121.03, 140.13));
		add(entities.holly(119.03, 140.21));
		add(entities.holly(135.00, 144.17));
		add(entities.holly(137.03, 144.17));
		add(entities.holly(138.03, 144.17));
		add(entities.holly(137.00, 140.13));
		add(entities.holly(139.00, 140.13));
		add(entities.holly(140.00, 140.04));
		add(entities.holly(142.00, 140.13));
		add(entities.holly(143.00, 144.58));
		add(entities.holly(144.97, 144.63));
		add(entities.holly(121.00, 100.13));
		add(entities.holly(124.00, 100.13));
		add(entities.holly(119.03, 100.13));
		add(entities.holly(117.97, 100.13));
		add(entities.holly(118.03, 105.21));
		add(entities.holly(120.00, 105.17));
		add(entities.holly(79.00, 147.21));
		add(entities.holly(82.03, 147.17));
		add(entities.holly(76.97, 147.21));
		add(entities.holly(84.00, 147.17));
		add(entities.holly(85.03, 147.17));
		add(entities.holly(86.00, 147.08));
		add(entities.holly(77.03, 136.17));
		add(entities.holly(80.03, 136.13));
		add(entities.holly(81.00, 136.17));
		add(entities.holly(83.00, 137.17));
		add(entities.holly(86.00, 137.17));
		add(entities.holly(87.00, 137.08));
		add(entities.holly(88.00, 137.17));
		add(entities.holly(73.03, 100.88));
		add(entities.holly(76.81, 100.88));
		add(entities.holly(81.03, 97.04));
		add(entities.holly(83.63, 100.67));
		add(entities.holly(87.44, 100.71));
		add(entities.holly(92.22, 96.08));
		add(entities.holly(96.72, 100.58));
		add(entities.holly(45.50, 53.13));
		add(entities.holly(49.31, 53.13));

		add(entities.giftPile3(120.69, 145.46));
		add(entities.mistletoe(130.81, 149.46));
		add(entities.mistletoe(125.56, 139.38));
		add(entities.mistletoe(140.09, 131.50));
		add(entities.mistletoe(154.81, 107.88));
		add(entities.mistletoe(132.06, 123.25));
		add(entities.mistletoe(148.16, 114.54));
		add(entities.giftPile6(137.34, 131.17));
		add(entities.giftPile3(47.94, 142.42));
		add(entities.giftPile2(76.00, 147.75));

		add(createCookieTable(29.43, 70.20));
		add(createCookieTable(104.75, 58.92));
		add(createCookieTable(79.31, 6.70));
		add(createCookieTable(110.06, 93.00));
		add(createCookieTable(146.47, 145.21));
	}

	if (isEaster) {
		const giveBasket = give(entities.basket.type);

		// spot 1
		add(entities.basketBin(73.00, 74.00)).interact = giveBasket;
		add(entities.eggBasket2(73.53, 74.88));
		add(entities.eggBasket3(74.41, 73.92));
		add(entities.eggBasket4(74.16, 74.17));
		add(createSign(74.00, 73.80, 'Egg baskets', giveBasket, entities.signQuest));

		// spot 2
		add(entities.basketBin(33 + 70, 34 + 53)).interact = giveBasket;
		add(entities.eggBasket2(33.53 + 70, 34.88 + 53));
		add(entities.eggBasket3(34.41 + 70, 33.92 + 53));
		add(entities.eggBasket4(34.16 + 70, 34.17 + 53));
		add(createSign(34 + 70, 33.8 + 53, 'Egg baskets', giveBasket, entities.signQuest));

		// donation spot
		add(createSign(62.00, 78.00, 'Donate eggs', donateEgg, entities.signDonate));
		add(entities.barrel(62.15, 78.87)).interact = donateEgg;
	}
}

export function updateMainMapSeason(world: World, map: ServerMap, season: Season, holiday: Holiday) {
	removeSeasonalObjects(world, map);
	addSeasonalObjects(world, map, season, holiday);

	const isWinter = season === Season.Winter;

	for (let y = 0, i = 0; y < map.height; y++) {
		for (let x = 0; x < map.width; x++ , i++) {
			const tile = mainMapTiles[i];

			if (isWinter) {
				if (x > 18 && (tile === TileType.Water || tile === TileType.WalkableWater || tile === TileType.Boat)) {
					setTile(map, x, y, tile === TileType.Water ? TileType.Ice : TileType.WalkableIce);
				} else {
					setTile(map, x, y, tile);
				}
			} else {
				if (tile === TileType.Ice || tile === TileType.SnowOnIce) {
					setTile(map, x, y, TileType.Water);
				} else if (tile === TileType.WalkableIce) {
					setTile(map, x, y, TileType.WalkableWater);
				} else {
					setTile(map, x, y, tile);
				}
			}
		}
	}

	snapshotTiles(map);

	for (const controller of map.controllers) {
		controller.initialize(world.now / 1000);
	}
}

export function createMainMap(world: World): ServerMap {
	const mapSize = 20;
	const map = createServerMap('', MapType.None, mapSize, mapSize, TileType.Grass);

	map.flags |= MapFlags.EdibleGrass;

	// spawns

	map.spawnArea = rect(51, 21, 8, 8);

	map.spawns.set('harbor', rect(5.2, 72.2, 3.4, 2.6));
	map.spawns.set('cave', rect(75.5, 27, 2, 2));

	map.spawns.set('lake', rect(134, 68, 2, 1));
	map.spawns.set('bridge', rect(107, 37, 2, 2));
	map.spawns.set('forest', rect(105, 91, 3, 3));
	map.spawns.set('graveyard', rect(146, 101, 3, 3));
	map.spawns.set('pumpkins', rect(71, 125, 3, 3));

	map.spawns.set('center', rect(74, 74, 2, 2));
	map.spawns.set('topleft', rect(17, 10, 3, 3));
	map.spawns.set('topright', rect(131, 17, 3, 3));
	map.spawns.set('bottomleft', rect(17, 149, 3, 3));
	map.spawns.set('bottomright', rect(154, 140, 3, 3));

	// tiles

	deserializeMap(map, mainMapData);

	if (!DEVELOPMENT) {
		snapshotTiles(map);
	}

	if (DEVELOPMENT) {
		addSpawnPointIndicators(world, map);
	}

	const giveLantern = give(entities.lanternOn.type);

	const isWinter = world.season === Season.Winter;
	const isHalloween = world.holiday === Holiday.Halloween;

	const addWoodenFence = createWoodenFenceMaker(world, map);
	const addStoneWall = createStoneWallFenceMaker(world, map);

	function add(entity: ServerEntity) {
		if (entity.x < 0 || entity.x > map.width || entity.y < 0 || entity.y > map.height) {
			if (DEVELOPMENT) {
				logger.warn(`skipped entity (${getEntityTypeName(entity.type)}) outside map (${entity.x} ${entity.y})`);
			}

			return { x: entity.x, y: entity.y } as ServerEntity;
		}

		return world.addEntity(entity, map);
	}

	function addEntities(entities: ServerEntity[]) {
		return entities.map(add);
	}

	function addTree(x: number, y: number, variant: number, web = false, spider = false) {
		addEntities(entities.tree(x, y, variant, web, spider && !isWinter));
	}

	function cliffNE(x: number, y: number) {
		add(entities.cliffTopNE(x + 0.5, y));
		lockTiles(map, x - 1, y - 1, 3, 3);
	}

	const cliffDecals = [entities.cliffDecal1, entities.cliffDecal3, entities.cliffDecal2];

	function cracksS(x: number, y: number) {
		const code = (Math.random() * 1000) % 64;
		const index1 = code & 0b11;
		const index2 = (code >> 2) & 0b11;
		const index3 = (code >> 4) & 0b11;
		index1 && index1 !== 3 && add(cliffDecals[index1 - 1](x + 0.5, y - 1)); // no decal 2 here
		index2 && add(cliffDecals[index2 - 1](x + 0.5, y));
		index3 && add(cliffDecals[index3 - 1](x + 0.5, y + 1));
	}

	function cracksSLeft(x: number, y: number) {
		const code = (Math.random() * 1000) % 4;
		(code & 0b01) && add(entities.cliffDecalL(x + 0.5, y - 1));
		(code & 0b10) && add(entities.cliffDecalL(x + 0.5, y));
	}

	function cracksSRight(x: number, y: number) {
		const code = (Math.random() * 1000) % 4;
		(code & 0b01) && add(entities.cliffDecalR(x + 0.5, y - 1));
		(code & 0b10) && add(entities.cliffDecalR(x + 0.5, y));
	}

	function cliffSW(x: number, y: number) {
		add(entities.cliffSW(x + 0.5, y - 2));
		lockTiles(map, x - 1, y - 4, 3, 7);
		cracksSLeft(x, y);
	}

	function cliffSE(x: number, y: number) {
		add(entities.cliffSE(x + 0.5, y - 2));
		lockTiles(map, x - 1, y - 3, 3, 6);
		cracksSRight(x, y);
	}

	function cliffS(x: number, y: number) {
		add(entities.cliffS2(x + 0.5, y - 1));
		lockTiles(map, x, y - 2, 1, 5);
		cracksS(x, y);
	}

	function cliffSStart(x: number, y: number) {
		add(entities.cliffS1(x + 0.5, y - 1));
		lockTiles(map, x, y - 2, 1, 5);
		cracksS(x, y);
	}

	function cliffSEnd(x: number, y: number) {
		add(entities.cliffS3(x + 0.5, y - 1));
		lockTiles(map, x, y - 2, 1, 5);
		cracksS(x, y);
	}

	function cliffS1(x: number, y: number) {
		add(entities.cliffSb(x + 0.5, y - 1));
		lockTiles(map, x, y - 2, 1, 5);
		cracksS(x, y);
	}

	function cliffS1Entrance(x: number, y: number) {
		add(entities.cliffSbEntrance(x + 0.5, y - 1));
		lockTiles(map, x, y - 2, 1, 5);
	}

	function cliffRightWithTrimNoEdge(x: number, y: number, h: number) {
		cliffRight(x, y, h);
		cliffTrimRight(x + 1, y, h, false);
	}

	function cliffRightWithTrim(x: number, y: number, h: number) {
		cliffRight(x, y - 3, h - 3);
		cliffTrimRight(x + 1, y, h);
	}

	function cliffLeftWithTrim(x: number, y: number, h: number) {
		cliffLeft(x, y - 3, h - 3);
		cliffTrimLeft(x, y, h);
	}

	function cliffLeft(x: number, y: number, h: number) {
		for (let i = 0; i < h; i++) {
			add(entities.cliffTopW(x + 0.5, y - i));
			lockTiles(map, x, y - i - 1, 2, 3);
		}
	}

	function cliffRight(x: number, y: number, h: number) {
		for (let i = 0; i < h; i++) {
			add(entities.cliffTopE(x + 0.5, y - i));
			lockTiles(map, x - 1, y - i - 1, 2, 3);
		}
	}

	function cliffTrimLeft(x: number, y: number, h: number) {
		add(entities.cliffBotTrimLeft(x - 0.5, y));

		for (let i = 0; i < (h - 2); i++) {
			add(entities.cliffMidTrimLeft(x - 0.5, y - 1 - i));
		}

		add(entities.cliffTopTrimLeft(x - 0.5, y - h + 1));
	}

	function cliffTrimRight(x: number, y: number, h: number, botTrim = true) {
		if (botTrim) {
			add(entities.cliffBotTrimRight(x + 0.5, y));
		} else {
			add(entities.cliffMidTrimRight(x + 0.5, y));
		}

		for (let i = 0; i < (h - 2); i++) {
			add(entities.cliffMidTrimRight(x + 0.5, y - 1 - i));
		}

		if (h > 1) {
			add(entities.cliffTopTrimRight(x + 0.5, y - h + 1));
		}
	}

	function cliffSSection(x: number, y: number, w: number) {
		cliffSStart(x, y);

		for (let i = 1; i < (w - 1); i++) {
			cliffS(x + i, y);
		}

		cliffSEnd(x + w - 1, y);
	}

	function cliffSESection(x: number, y: number, w: number) {
		for (let i = 0; i < w; i++) {
			cliffSE(x + i, y - i);
		}
	}

	function cliffSWSection(x: number, y: number, w: number) {
		for (let i = 0; i < w; i++) {
			cliffSW(x + i, y + i);
		}
	}

	// actual cliffs
	cliffS(0, 49);
	cliffS(1, 49);
	cliffSEnd(2, 49);
	cliffSE(3, 49);
	cliffSSection(4, 48, 2);
	cliffSWSection(6, 49, 2);
	cliffSSection(8, 50, 4);
	cliffSW(12, 51);
	cliffSSection(13, 51, 4);
	cliffSE(17, 51);
	cliffRightWithTrim(17, 51, 6);
	// harbor ramp
	cliffLeftWithTrim(23, 50, 6);
	cliffSW(23, 50);
	cliffSSection(24, 50, 5);
	cliffSE(29, 50);
	cliffRightWithTrim(29, 50, 7);
	cliffSESection(30, 45, 2);
	cliffRightWithTrim(31, 44, 5);
	cliffSESection(32, 41, 1);
	cliffRightWithTrim(32, 41, 4);
	cliffSESection(33, 39, 2);
	cliffRightWithTrim(34, 38, 5);
	cliffNE(34, 33);
	// no path spot
	cliffRightWithTrimNoEdge(33, 32, 6);
	cliffSE(34, 28);
	cliffRightWithTrim(34, 28, 5);
	cliffSESection(35, 25, 2);
	cliffS1(37, 23);
	cliffSE(38, 23);
	cliffRightWithTrim(38, 23, 4);
	cliffSESection(39, 21, 2);
	cliffRightWithTrim(40, 20, 4);
	cliffSESection(41, 18, 1);
	cliffS1(42, 17);
	cliffSE(43, 17);
	// corner
	cliffSSection(44, 16, 2);
	cliffSE(46, 16);
	cliffS1(47, 15);
	cliffSW(48, 16);
	cliffSSection(49, 16, 2);
	cliffSESection(51, 16, 2);
	// end corner
	cliffSSection(53, 14, 3);
	cliffSW(56, 15);
	cliffSSection(57, 15, 2);
	cliffSE(59, 15);
	cliffSSection(60, 14, 3);
	cliffSWSection(63, 15, 2);
	cliffS1(65, 16);
	cliffSW(66, 17);
	cliffLeftWithTrim(67, 19, 4);
	cliffSW(67, 19);
	cliffLeftWithTrim(68, 23, 6);
	cliffSW(68, 23);
	cliffLeftWithTrim(69, 25, 4);
	cliffSW(69, 25);
	cliffSSection(70, 25, 4);
	cliffSE(74, 25);

	// mine entrance
	cliffS1Entrance(75, 24);
	cliffS1Entrance(76, 24);
	cliffS1Entrance(77, 24);

	cliffSW(78, 25);
	cliffS1(79, 25);
	cliffSW(80, 26);
	cliffSSection(81, 26, 3);
	cliffSE(84, 26);
	cliffSSection(85, 25, 2);
	cliffSE(87, 25);
	cliffRightWithTrim(87, 25, 5);
	cliffNE(87, 20);
	cliffNE(86, 19);
	cliffRightWithTrimNoEdge(85, 18, 1);
	cliffNE(85, 17);
	cliffRightWithTrimNoEdge(84, 16, 3);
	cliffSESection(85, 15, 2);
	cliffS1(87, 13);
	cliffSW(88, 14);
	cliffSSection(89, 14, 2);
	cliffSE(91, 14);
	cliffRightWithTrim(91, 14, 6);
	// river ramp
	cliffLeftWithTrim(96, 14, 6);
	cliffSW(96, 14);
	cliffSSection(97, 14, 3);
	cliffSE(100, 14);
	cliffSSection(101, 13, 3);
	cliffSE(104, 13);
	cliffRightWithTrim(104, 13, 5);
	cliffSESection(105, 10, 1);
	cliffRightWithTrim(105, 10, 5);
	cliffSESection(106, 7, 1);
	cliffS1(107, 6);
	cliffSE(108, 6);
	cliffRightWithTrim(108, 6, 4);
	cliffSESection(109, 4, 2);
	cliffRightWithTrim(110, 3, 4);

	const plankWidth = 78 / tileWidth;
	const plankHeight = 12 / tileHeight;

	const plank = () => sample(entities.planks)!;
	const shortPlank = () => sample(entities.planksShort)!;

	// barrel storage
	addWoodenFence(100, 24, 6);
	addWoodenFence(100, 24, 2, false, true, false);
	addWoodenFence(100, 29, 3, false, false, true);
	addWoodenFence(106, 24, 8, false, true, true);
	addWoodenFence(100, 32, 6);
	add(entities.barrel(104.56, 24.70));
	add(entities.barrel(105.34, 25.08));
	add(entities.barrel(104.90, 25.70));
	add(entities.barrel(100.84, 24.50));
	add(entities.barrel(101.75, 24.50));
	add(entities.barrel(100.72, 31.25));
	add(entities.barrel(101.44, 31.54));
	add(entities.barrel(101.75, 30.75));
	add(entities.barrel(105.25, 29.79));
	add(entities.barrel(105.50, 30.71));
	add(entities.barrel(105.25, 31.67));
	add(entities.barrel(103.91, 31.04));
	add(entities.barrel(106.94, 24.08));
	add(entities.barrel(107.75, 24.88));
	add(entities.barrel(105.59, 32.83));
	add(entities.barrel(99.34, 24.13));
	add(entities.barrel(99.41, 25.21));
	add(entities.barrel(98.31, 24.88));
	add(entities.lanternOn(100.50, 25.63));
	add(entities.lanternOn(100.50, 28.96));
	add(entities.lanternOn(105.53, 25.88));

	// orchard / mine entrance
	const mineEntrance = add(entities.mineEntrance(76.5, 23.08));
	// const mineClosed = add(entities.mineClosed(76.5, 23.08));
	// setEntityName(mineClosed, 'Mine Closed');

	if (true) {
		add(entities.collider1x1(74.50, 25.17));
		add(entities.collider1x1(77.50, 25.21));
		mineEntrance.interact = (_, client) => goToMap(world, client, 'cave');
		add(entities.triggerHouseDoor(76.50, 25.88)).trigger = (_, client) => goToMap(world, client, 'cave');
		add(entities.mineRailsFadeUp(76.5, 25));
		add(entities.mineRailsV(76.5, 26));
		add(entities.mineRailsV(76.5, 27));
		add(entities.mineRailsNW(76.5, 28));
		add(entities.mineRailsH(75.5, 28));
		add(entities.mineRailsH(74.5, 28));
		add(entities.mineRailsH(73.5, 28));
		add(entities.mineRailsEndLeft(72.5, 28.5));
		add(entities.mineCart(74, 28));
	}

	add(entities.rock(79.09, 27.33));
	add(entities.rock2(79.47, 27.71));
	add(entities.rock3(73.53, 27.21));
	add(entities.rock2(73.88, 27.42));
	add(entities.lanternOn(74.59, 29.20));
	add(entities.lanternOn(78.88, 27.67));
	add(createBoxOfLanterns(79.84, 29.00));

	// addEntities(entities.tree5(74.25, 30.00, 0));
	// addEntities(entities.tree5(78.53, 30.04, 0));
	// addEntities(entities.tree5(76.34, 33.00, 1));
	add(entities.tree5Stump(74.25, 30.00));
	add(entities.tree5Stump(78.53, 30.04));

	addEntities(entities.tree5(78.59, 36.63, 2));
	addEntities(entities.tree4(80.97, 33.29, 1));
	addEntities(entities.tree5(83.50, 36.54, 2));
	addEntities(entities.tree5(83.16, 29.63, 0));
	addEntities(entities.tree5(86.00, 33.00, 1));
	addEntities(entities.tree5(87.75, 36.54, 2));
	addEntities(entities.tree5(87.66, 29.54, 0));
	addEntities(entities.tree5(73.91, 36.17, 1));
	addEntities(entities.tree5(72.00, 32.83, 2));
	addEntities(entities.tree5(69.59, 36.04, 0));
	addWoodenFence(62, 38, 9);
	addWoodenFence(71, 38, 1, false, true, true);
	addWoodenFence(71, 39, 3);
	addWoodenFence(78, 39, 3);
	addWoodenFence(81, 39, 1, false, true, true);
	addWoodenFence(81, 40, 9);
	addWoodenFence(69, 43, 8);
	addWoodenFence(90, 28, 12, false, false, true);
	add(entities.lanternOn(77.97, 36.42));
	add(entities.lanternOn(73.81, 39.21));
	add(entities.box(81.91, 39.13));
	add(entities.box(83.03, 39.50));

	// bridge
	add(plank()(110.7, 36.60));
	add(shortPlank()(112.56, 36.60));
	add(shortPlank()(110.18, 37.08));
	add(plank()(112.06, 37.08));
	add(plank()(110.71, 37.58));
	add(shortPlank()(112.59, 37.58));
	add(shortPlank()(110.21, 38.08));
	add(plank()(112.09, 38.08));
	add(plank()(110.63, 38.58));
	add(shortPlank()(112.50, 38.58));
	add(entities.plankShadow(111.46, 38.50));
	add(entities.pierLeg(111.46, 38.50));

	add(entities.collider3x1(110, 36));
	add(entities.collider3x1(110, 39));

	// pier
	const pierX = 0;
	const pierY = 8 / tileHeight;

	add(createSignWithText(pierX + 8.5, pierY + 71.1, 'Party Island',
		`Hop on the boat to travel to an island, that is unique to your party`));

	add(entities.triggerBoat(7.5, 70)).trigger = (_, client) => goToMap(world, client, 'island');

	addEntities(entities.fullBoat(7, 69.66));
	add(entities.pierLeg(pierX + 10, pierY + 72.6));
	add(entities.pierLeg(pierX + 11.9, pierY + 72.6));
	add(entities.pierLeg(pierX + 5, pierY + 74.6));
	add(entities.pierLeg(pierX + 6.9, pierY + 74.6));
	add(entities.pierLeg(pierX + 8.8, pierY + 74.6));
	const plankOffsets = [0, -1, 0, -2, -1, -1, 0, -2, -1].map(x => x / tileWidth);

	for (let y = 0; y < 9; y++) {
		const maxX = y < 5 ? ((y % 2) ? 5 : 4) : ((y % 2) ? 3 : 2);
		const baseX = pierX + 4.5 + ((y % 2) ? 0 : (plankWidth / 2)) + plankOffsets[y];
		const baseY = pierY + 71 - (9 / tileHeight);

		for (let x = 0; x < maxX; x++) {
			if ((x === 0 && (y % 2)) || (x === (maxX - 1) && (y % 2))) {
				const ox = x === 0 ? (18 / tileWidth) : (-18 / tileWidth);
				add(shortPlank()(baseX + ox + x * plankWidth, baseY + y * plankHeight));
			} else {
				add(plank()(baseX + x * plankWidth, baseY + y * plankHeight));
			}
		}
	}

	add(entities.collider1x3(3.5, 69));
	add(entities.collider1x3(3.5, 72));
	add(entities.collider1x1(3.5, 75));

	add(entities.collider3x1(4, 69));
	add(entities.collider3x1(7, 69));
	add(entities.collider1x1(9, 70));
	add(entities.collider1x2(9.6, 69));
	add(entities.collider3x1(10, 70.3));
	add(entities.collider2x1(4, 70));
	add(entities.collider1x3(4, 71));
	add(entities.collider1x2(4, 73));
	add(entities.collider1x2(4, 73));
	add(entities.collider3x1(4, 75));
	add(entities.collider3x1(7, 75));
	add(entities.collider1x2(9, 73));
	add(entities.collider3x1(10, 73));

	add(entities.plankShadowShort(pierX + 5.09, pierY + 74.08 - plankHeight * 6));
	add(entities.plankShadowShort(pierX + 5.06, pierY + 74.08 - plankHeight * 4));
	add(entities.plankShadowShort(pierX + 5.09, pierY + 74.08 - plankHeight * 2));
	add(entities.plankShadowShort(pierX + 5.06, pierY + 74.08));

	add(entities.plankShadowShort(pierX + 8.84, pierY + 74.12 - plankHeight * 2));
	add(entities.plankShadowShort(pierX + 8.78, pierY + 74.12 - plankHeight));
	add(entities.plankShadowShort(pierX + 8.81, pierY + 74.12));

	add(entities.plankShadow(pierX + 11.68, pierY + 72.62));
	add(entities.plankShadow2(pierX + 11.68 - plankWidth, pierY + 72.62));
	add(entities.plankShadowShort(pierX + 13.5, pierY + 72.45));

	add(entities.plankShadow2(pierX + 5.75, pierY + 74.62));
	add(entities.plankShadow(pierX + 5.75 + plankWidth, pierY + 74.62));

	add(entities.lanternOn(pierX + 13.25, pierY + 70.83));
	add(entities.lanternOn(pierX + 13.31, pierY + 73.04));
	add(entities.lanternOn(pierX + 9.31, pierY + 73.10));
	add(entities.lanternOn(pierX + 9.63, pierY + 70.88));
	add(entities.lanternOn(pierX + 4.72, pierY + 70.96));
	add(entities.lanternOn(pierX + 4.69, pierY + 74.96));

	add(entities.barrel(pierX + 13.75, pierY + 73.71));
	add(entities.barrel(pierX + 13.56, pierY + 74.46));
	add(entities.barrel(pierX + 14.34, pierY + 74.17));
	add(entities.barrel(pierX + 16.56, pierY + 76.62));
	add(entities.barrel(pierX + 5.41, pierY + 71.21));
	add(entities.barrel(pierX + 13.96, pierY + 67.67));
	add(entities.barrel(pierX + 14.75, pierY + 67.96));

	// plants
	add(entities.largeLeafedBush1(13.59, 64.79));
	add(entities.largeLeafedBush2(22.09, 68.75));
	add(entities.largeLeafedBush1(31.72, 65.50));
	add(entities.largeLeafedBush2(30.25, 53.67));
	add(entities.largeLeafedBush1(31.46, 52.66));
	add(entities.largeLeafedBush2(42.50, 47.71));
	add(entities.largeLeafedBush1(43.44, 52.50));
	add(entities.largeLeafedBush2(37.72, 25.54));
	add(entities.largeLeafedBush1(38.53, 25.17));
	add(entities.largeLeafedBush2(43.94, 25.04));
	add(entities.largeLeafedBush1(53.13, 16.50));
	add(entities.largeLeafedBush2(53.03, 17.42));
	add(entities.largeLeafedBush1(63.50, 31.46));
	add(entities.largeLeafedBush2(62.19, 32.33));
	add(entities.largeLeafedBush1(68.53, 28.79));
	add(entities.largeLeafedBush2(67.38, 21.04));
	add(entities.largeLeafedBush1(68.97, 36.84));
	add(entities.largeLeafedBush2(70.69, 45.71));
	add(entities.largeLeafedBush1(76.91, 43.58));
	add(entities.largeLeafedBush2(77.75, 44.17));
	add(entities.largeLeafedBush1(63.59, 46.58));
	add(entities.largeLeafedBush2(76.71, 60.76));
	add(entities.largeLeafedBush1(77.59, 60.00));
	add(entities.largeLeafedBush2(80.88, 53.21));
	add(entities.largeLeafedBush1(89.38, 57.71));
	add(entities.largeLeafedBush2(104.41, 45.79));
	add(entities.largeLeafedBush1(104.88, 46.58));
	add(entities.largeLeafedBush2(105.81, 44.88));
	add(entities.largeLeafedBush1(104.47, 32.75));
	add(entities.largeLeafedBush2(103.72, 33.33));
	add(entities.largeLeafedBush1(88.03, 15.58));
	add(entities.largeLeafedBush2(88.84, 16.17));
	add(entities.largeLeafedBush1(88.09, 16.63));
	add(entities.largeLeafedBush2(105.91, 16.46));
	add(entities.largeLeafedBush1(106.65, 9.20));
	add(entities.largeLeafedBush2(103.69, 6.46));
	add(entities.largeLeafedBush1(100.94, 5.38));
	add(entities.largeLeafedBush2(73.22, 6.71));
	add(entities.largeLeafedBush1(57.66, 6.08));
	add(entities.largeLeafedBush2(56.97, 6.67));
	add(entities.largeLeafedBush1(32.53, 24.25));
	add(entities.largeLeafedBush2(33.47, 24.54));
	add(entities.largeLeafedBush1(25.19, 19.13));
	add(entities.largeLeafedBush2(13.94, 49.08));
	add(entities.largeLeafedBush1(13.50, 48.21));
	add(entities.largeLeafedBush2(11.09, 11.71));
	add(entities.largeLeafedBush1(11.81, 12.63));
	add(entities.largeLeafedBush2(23.72, 7.42));
	add(entities.largeLeafedBush1(23.22, 8.25));
	add(entities.largeLeafedBush2(25.84, 38.33));
	add(entities.largeLeafedBush1(9.03, 61.50));
	add(entities.largeLeafedBush2(125.03, 37.50));
	add(entities.largeLeafedBush1(119.56, 47.92));
	add(entities.largeLeafedBush2(124.69, 26.54));
	add(entities.largeLeafedBush1(125.56, 26.00));
	add(entities.largeLeafedBush2(139.97, 9.25));
	add(entities.largeLeafedBush1(150.41, 11.83));
	add(entities.largeLeafedBush2(154.31, 25.71));
	add(entities.largeLeafedBush1(153.46, 26.20));
	add(entities.largeLeafedBush2(139.00, 25.79));
	add(entities.largeLeafedBush1(121.69, 7.92));
	add(entities.largeLeafedBush2(157.03, 66.88));
	add(entities.largeLeafedBush1(152.81, 89.54));
	add(entities.largeLeafedBush2(151.81, 81.04));
	add(entities.largeLeafedBush1(152.06, 82.00));
	add(entities.largeLeafedBush2(146.66, 94.96));
	add(entities.largeLeafedBush1(156.56, 106.71));
	add(entities.largeLeafedBush2(156.63, 107.92));
	add(entities.largeLeafedBush1(152.81, 129.96));
	add(entities.largeLeafedBush2(143.50, 135.79));
	add(entities.largeLeafedBush1(143.19, 136.75));
	add(entities.largeLeafedBush2(131.53, 121.92));
	add(entities.largeLeafedBush1(132.44, 133.67));
	add(entities.largeLeafedBush2(132.84, 134.83));
	add(entities.largeLeafedBush1(139.00, 131.58));
	add(entities.largeLeafedBush2(125.00, 137.83));
	add(entities.largeLeafedBush1(123.41, 138.33));
	add(entities.largeLeafedBush2(119.81, 136.96));
	add(entities.largeLeafedBush1(122.38, 120.63));
	add(entities.largeLeafedBush2(111.19, 126.54));
	add(entities.largeLeafedBush1(113.66, 130.13));
	add(entities.largeLeafedBush2(112.50, 118.17));
	add(entities.largeLeafedBush1(107.94, 113.83));
	add(entities.largeLeafedBush2(108.06, 114.79));
	add(entities.largeLeafedBush1(105.28, 105.88));
	add(entities.largeLeafedBush2(100.16, 111.25));
	add(entities.largeLeafedBush1(101.06, 111.88));
	add(entities.largeLeafedBush2(121.81, 107.25));
	add(entities.largeLeafedBush1(122.84, 107.63));
	add(entities.largeLeafedBush2(88.69, 115.50));
	add(entities.largeLeafedBush1(89.06, 116.42));
	add(entities.largeLeafedBush2(81.00, 112.33));
	add(entities.largeLeafedBush1(81.69, 113.21));
	add(entities.largeLeafedBush2(91.53, 151.42));
	add(entities.largeLeafedBush1(90.81, 150.75));
	add(entities.largeLeafedBush2(99.44, 153.25));
	add(entities.largeLeafedBush1(99.03, 153.96));
	add(entities.largeLeafedBush2(108.50, 147.17));
	add(entities.largeLeafedBush1(117.75, 153.38));
	add(entities.largeLeafedBush2(118.44, 152.58));
	add(entities.largeLeafedBush1(132.91, 148.54));
	add(entities.largeLeafedBush2(125.53, 144.92));
	add(entities.largeLeafedBush1(124.72, 145.50));
	add(entities.largeLeafedBush2(145.03, 144.92));
	add(entities.largeLeafedBush1(118.06, 124.92));
	add(entities.largeLeafedBush2(116.03, 94.42));
	add(entities.largeLeafedBush1(103.25, 81.96));
	add(entities.largeLeafedBush2(103.78, 82.88));
	add(entities.largeLeafedBush1(87.47, 89.54));
	add(entities.largeLeafedBush2(87.97, 90.50));
	add(entities.largeLeafedBush1(79.59, 84.50));
	add(entities.largeLeafedBush2(77.88, 85.25));
	add(entities.largeLeafedBush1(80.34, 91.42));
	add(entities.largeLeafedBush2(90.81, 78.63));
	add(entities.largeLeafedBush1(98.00, 63.71));
	add(entities.largeLeafedBush2(42.41, 84.79));
	add(entities.largeLeafedBush1(39.19, 82.92));
	add(entities.largeLeafedBush2(30.78, 77.13));
	add(entities.largeLeafedBush1(31.16, 78.08));
	add(entities.largeLeafedBush2(34.47, 70.63));
	add(entities.largeLeafedBush1(14.09, 90.08));
	add(entities.largeLeafedBush2(14.97, 89.17));
	add(entities.largeLeafedBush1(32.41, 111.13));
	add(entities.largeLeafedBush2(31.59, 111.58));
	add(entities.largeLeafedBush1(52.81, 110.38));
	add(entities.largeLeafedBush2(53.44, 110.04));
	add(entities.largeLeafedBush1(31.59, 109.83));
	add(entities.largeLeafedBush2(51.13, 95.04));
	add(entities.largeLeafedBush1(50.34, 95.54));
	add(entities.largeLeafedBush2(52.25, 96.21));
	add(entities.largeLeafedBush1(67.65, 81.45));

	add(entities.largeLeafedBush3(63.50, 32.21));
	add(entities.largeLeafedBush4(69.28, 35.67));
	add(entities.largeLeafedBush3(66.56, 20.08));
	add(entities.largeLeafedBush4(64.25, 23.33));
	add(entities.largeLeafedBush3(67.81, 29.42));
	add(entities.largeLeafedBush4(72.44, 27.38));
	add(entities.largeLeafedBush3(52.22, 17.21));
	add(entities.largeLeafedBush4(43.59, 24.08));
	add(entities.largeLeafedBush3(38.47, 25.88));
	add(entities.largeLeafedBush4(46.38, 29.21));
	add(entities.largeLeafedBush3(41.69, 47.96));
	add(entities.largeLeafedBush4(44.16, 53.21));
	add(entities.largeLeafedBush3(31.16, 53.67));
	add(entities.largeLeafedBush4(31.00, 65.92));
	add(entities.largeLeafedBush3(20.72, 69.42));
	add(entities.largeLeafedBush4(12.88, 65.04));
	add(entities.largeLeafedBush3(9.47, 62.29));
	add(entities.largeLeafedBush4(13.03, 49.04));
	add(entities.largeLeafedBush3(25.13, 38.79));
	add(entities.largeLeafedBush4(15.38, 34.33));
	add(entities.largeLeafedBush3(33.34, 25.17));
	add(entities.largeLeafedBush4(25.31, 19.92));
	add(entities.largeLeafedBush3(24.06, 8.58));
	add(entities.largeLeafedBush4(10.91, 12.58));
	add(entities.largeLeafedBush3(9.72, 7.38));
	add(entities.largeLeafedBush4(40.19, 16.13));
	add(entities.largeLeafedBush3(57.59, 7.33));
	add(entities.largeLeafedBush4(73.03, 7.54));
	add(entities.largeLeafedBush3(71.41, 22.75));
	add(entities.largeLeafedBush4(87.32, 16.17));
	add(entities.largeLeafedBush3(85.25, 27.29));
	add(entities.largeLeafedBush4(100.81, 6.17));
	add(entities.largeLeafedBush3(106.44, 10.25));
	add(entities.largeLeafedBush4(105.72, 17.71));
	add(entities.largeLeafedBush3(105.28, 7.13));
	add(entities.largeLeafedBush4(104.56, 33.75));
	add(entities.largeLeafedBush3(105.63, 45.58));
	add(entities.largeLeafedBush4(117.41, 49.58));
	add(entities.largeLeafedBush3(73.91, 66.96));
	add(entities.largeLeafedBush4(76.68, 59.87));
	add(entities.largeLeafedBush3(84.06, 64.33));
	add(entities.largeLeafedBush4(81.50, 53.67));
	add(entities.largeLeafedBush3(76.72, 44.54));
	add(entities.largeLeafedBush4(62.81, 46.92));
	add(entities.largeLeafedBush3(70.41, 46.63));
	add(entities.largeLeafedBush4(34.47, 69.75));
	add(entities.largeLeafedBush3(30.34, 78.54));
	add(entities.largeLeafedBush4(39.84, 83.38));
	add(entities.largeLeafedBush3(42.06, 85.42));
	add(entities.largeLeafedBush4(50.94, 96.17));
	add(entities.largeLeafedBush3(30.97, 110.46));
	add(entities.largeLeafedBush4(13.75, 95.92));
	add(entities.largeLeafedBush3(14.41, 95.67));
	add(entities.largeLeafedBush4(14.88, 90.13));
	add(entities.largeLeafedBush3(28.66, 119.33));
	add(entities.largeLeafedBush4(31.53, 133.17));
	add(entities.largeLeafedBush3(53.47, 110.92));
	add(entities.largeLeafedBush4(90.69, 151.54));
	add(entities.largeLeafedBush3(99.72, 154.13));
	add(entities.largeLeafedBush4(95.78, 146.63));
	add(entities.largeLeafedBush3(108.44, 148.00));
	add(entities.largeLeafedBush4(93.25, 131.96));
	add(entities.largeLeafedBush3(125.56, 145.83));
	add(entities.largeLeafedBush4(123.97, 139.04));
	add(entities.largeLeafedBush3(120.59, 137.38));
	add(entities.largeLeafedBush4(118.44, 153.63));
	add(entities.largeLeafedBush3(111.16, 152.63));
	add(entities.largeLeafedBush4(133.06, 149.46));
	add(entities.largeLeafedBush3(144.16, 144.96));
	add(entities.largeLeafedBush4(143.72, 137.46));
	add(entities.largeLeafedBush3(132.09, 135.33));
	add(entities.largeLeafedBush4(138.16, 131.88));
	add(entities.largeLeafedBush3(152.63, 131.21));
	add(entities.largeLeafedBush4(145.72, 120.67));
	add(entities.largeLeafedBush3(131.56, 122.79));
	add(entities.largeLeafedBush4(122.16, 121.50));
	add(entities.largeLeafedBush3(122.22, 107.92));
	add(entities.largeLeafedBush4(117.28, 125.38));
	add(entities.largeLeafedBush3(111.34, 127.42));
	add(entities.largeLeafedBush4(112.44, 119.13));
	add(entities.largeLeafedBush3(107.25, 115.04));
	add(entities.largeLeafedBush4(114.28, 130.79));
	add(entities.largeLeafedBush3(105.34, 106.79));
	add(entities.largeLeafedBush4(100.31, 112.17));
	add(entities.largeLeafedBush3(87.47, 91.08));
	add(entities.largeLeafedBush4(79.84, 85.33));
	add(entities.largeLeafedBush3(103.19, 83.25));
	add(entities.largeLeafedBush4(98.38, 85.96));
	add(entities.largeLeafedBush3(114.09, 92.21));
	add(entities.largeLeafedBush4(115.81, 95.21));
	add(entities.largeLeafedBush3(117.38, 70.04));
	add(entities.largeLeafedBush4(147.13, 95.75));
	add(entities.largeLeafedBush3(142.53, 98.54));
	add(entities.largeLeafedBush4(157.44, 107.33));
	add(entities.largeLeafedBush3(152.19, 90.08));
	add(entities.largeLeafedBush4(158.34, 113.71));
	add(entities.largeLeafedBush3(151.38, 82.42));
	add(entities.largeLeafedBush4(157.28, 67.79));
	add(entities.largeLeafedBush3(157.97, 57.04));
	add(entities.largeLeafedBush4(154.00, 26.54));
	add(entities.largeLeafedBush3(138.13, 26.17));
	add(entities.largeLeafedBush4(125.06, 27.17));
	add(entities.largeLeafedBush3(125.66, 38.25));
	add(entities.largeLeafedBush4(119.09, 48.54));
	add(entities.largeLeafedBush3(116.81, 35.83));
	add(entities.largeLeafedBush4(141.38, 10.13));
	add(entities.largeLeafedBush3(149.03, 11.33));
	add(entities.largeLeafedBush4(152.53, 5.75));
	add(entities.largeLeafedBush3(121.41, 8.63));
	add(entities.largeLeafedBush4(109.75, 26.25));
	add(entities.largeLeafedBush3(109.38, 35.46));

	// north-west hill
	addEntities(entities.pine(37.91, 88.33, 0));
	addEntities(entities.pine(39.91, 91.29, 0));
	addEntities(entities.pine(15.53, 83.54, 0));
	addEntities(entities.pine(17.91, 82.17, 0));
	addEntities(entities.pine(21.59, 86.71, 0));
	addEntities(entities.pine(27.56, 81.38, 0));
	addEntities(entities.pine(2.88, 36.17, 0));
	addEntities(entities.pine(4.34, 40.79, 0));
	addEntities(entities.pine(2.59, 56.46, 0));
	addEntities(entities.pine(0.72, 53.33, 0));
	addEntities(entities.pine(8.72, 26.92, 0));
	addEntities(entities.pine(10.19, 29.46, 0));
	addEntities(entities.pine(3.38, 20.33, 0));
	add(entities.lanternOn(7.06, 17.92));
	add(entities.lanternOn(7.78, 22.96));
	add(entities.lanternOn(11.72, 19.04));
	add(entities.boxLanterns(5.66, 21.88)).interact = giveLantern;
	addStoneWall(6, 32, 3);
	addStoneWall(6, 32, 4, false, true, true);
	addStoneWall(12, 32, 1, false, true);
	addStoneWall(12, 38, 1, false, false, true);
	addStoneWall(6, 40, 3);
	add(entities.barrel(11.34, 33.08));
	add(entities.barrel(10.31, 33.46));
	add(entities.barrel(11.22, 33.96));
	add(entities.barrel(6.63, 39.08));
	add(entities.barrel(7.75, 39.21));
	add(entities.lanternOnWall(7.97, 32.29));
	add(entities.lanternOnWall(10.00, 40.33));
	add(entities.lanternOnWall(6.00, 36.33));
	add(entities.lanternOnWall(12.00, 34.33));

	// north hill
	addWoodenFence(52, 12.5, 11);
	addWoodenFence(104.25, 9.25, 2, false, false, true);
	addWoodenFence(101.25, 11.25, 3);

	// bridge
	addWoodenFence(104, 36, 5);
	addWoodenFence(105, 41, 3);

	// north-east fields
	addWoodenFence(116, 13, 9);
	addWoodenFence(116, 13, 11, false, true, true);
	addWoodenFence(116, 24, 2);
	addWoodenFence(118, 24, 2, false, true, true);
	addWoodenFence(118, 26, 7);
	addWoodenFence(125, 13, 6, false, true);
	addWoodenFence(125, 22, 4, false, false, true);
	addWoodenFence(140, 25, 12);
	addWoodenFence(140, 25, 9, false, true, true);
	addWoodenFence(152, 25, 9, false, true, true);
	addWoodenFence(140, 34, 5);
	addWoodenFence(148, 34, 4);

	// harbor
	addStoneWall(13.2, 67, 1);
	addStoneWall(15.2, 61, 3, false, false, true);
	addStoneWall(20, 64, 3, false, false, true);
	addStoneWall(20, 70, 4);
	addStoneWall(16, 76, 3);

	// north hills
	addEntities(entities.tree(15.06, 48.38, 0));
	addEntities(entities.tree(12.25, 44.21, 1 + 8));
	addEntities(entities.tree(29.50, 41.29, 2));
	addEntities(entities.tree(24.88, 37.67, 0 + 4));
	addEntities(entities.tree(45.91, 28.38, 1));
	addEntities(entities.tree(42.94, 24.33, 2));
	addEntities(entities.tree(31.78, 24.71, 0));
	addEntities(entities.tree(29.53, 22.29, 1 + 4));
	addEntities(entities.tree(26.69, 26.50, 2));
	addEntities(entities.tree(41.69, 13.25, 0));
	addEntities(entities.tree(65.13, 23.38, 1 + 8));
	addEntities(entities.tree(69.81, 19.75, 2 + 8));
	addEntities(entities.tree(70.91, 22.00, 0 + 4));
	addEntities(entities.tree(67.63, 28.33, 1));
	addEntities(entities.tree(62.84, 31.67, 2 + 4));
	addEntities(entities.tree(108.62, 8.71, 0));
	addEntities(entities.tree(105.09, 16.96, 1));
	addEntities(entities.tree(103.03, 19.25, 2 + 8));
	addEntities(entities.tree(107.81, 23.50, 0 + 4));
	addEntities(entities.tree(97.81, 38.63, 1));
	addEntities(entities.tree(108.63, 35.13, 2));
	addEntities(entities.tree(61.13, 43.67, 0));
	addEntities(entities.tree(24.44, 7.92, 0 + 4));
	addEntities(entities.tree(23.06, 16.54, 1 + 8));
	addEntities(entities.tree(24.66, 19.46, 2));
	addEntities(entities.tree(38.97, 6.96, 0));
	addEntities(entities.tree(41.19, 4.54, 1));
	addEntities(entities.tree(62.44, 2.96, 2 + 4));
	addEntities(entities.tree(58.50, 6.38, 0 + 4));
	addEntities(entities.tree(75.19, 5.04, 1 + 8));
	addEntities(entities.tree(89.91, 4.00, 2));
	addEntities(entities.tree(104.47, 6.58, 0));
	addEntities(entities.tree(102.53, 3.42, 1));
	addEntities(entities.tree(21.72, 6.04, 2 + 4));
	addEntities(entities.tree(12.06, 10.75, 0 + 8));
	addEntities(entities.tree(9.66, 6.46, 1));
	addEntities(entities.tree5(13.50, 7.63, 0));
	addEntities(entities.tree5(21.22, 20.17, 1));
	addEntities(entities.tree5(43.88, 6.79, 2));
	addEntities(entities.tree5(62.53, 5.88, 0));
	addEntities(entities.tree5(72.44, 7.29, 1));
	addEntities(entities.tree5(100.38, 5.63, 2));
	addEntities(entities.pine(1.66, 6.29, 0));
	addEntities(entities.pine(3.91, 9.67, 0));
	addEntities(entities.pine(1.59, 24.67, 0));
	addEntities(entities.pine(26.75, 4.13, 0));

	// north-east fields
	add(entities.pumpkin(142.84, 27.29));
	add(entities.pumpkin(143.59, 27.92));
	add(entities.pumpkin(142.75, 28.88));
	add(entities.pumpkin(150.81, 29.33));
	add(entities.pumpkin(151.22, 30.00));
	add(entities.pumpkin(148.53, 26.54));
	add(entities.pumpkin(140.69, 32.58));
	add(entities.pumpkin(141.03, 32.96));
	add(entities.pumpkin(150.47, 33.21));
	add(entities.pumpkin(150.91, 32.54));
	add(entities.pumpkin(149.91, 32.29));
	add(entities.pumpkin(150.38, 31.54));
	add(entities.pumpkin(144.44, 30.29));
	addEntities(entities.tree(153.59, 24.96, 0));
	addEntities(entities.tree(153.28, 5.58, 1 + 4));
	addEntities(entities.tree(155.03, 8.08, 2 + 8));
	addEntities(entities.tree(149.78, 11.13, 0));
	addEntities(entities.tree(124.56, 11.67, 1));
	addEntities(entities.tree(121.00, 7.25, 2 + 4));
	addEntities(entities.tree(114.47, 21.38, 0 + 8));
	addEntities(entities.tree(136.50, 5.79, 1 + 4));
	addEntities(entities.tree(138.53, 4.04, 2));
	addEntities(entities.tree(140.72, 9.58, 0));
	addEntities(entities.tree(138.22, 25.13, 1 + 4));
	addEntities(entities.tree(140.09, 23.54, 2 + 8));
	addEntities(entities.tree(125.72, 36.83, 0));
	addEntities(entities.tree(116.44, 35.00, 1));
	addEntities(entities.tree(117.53, 33.17, 2 + 4));
	addEntities(entities.pine(141.28, 37.29, 0));
	addEntities(entities.pine(155.88, 34.67, 0));
	addEntities(entities.pine(135.19, 34.88, 0));
	addEntities(entities.pine(155.16, 11.54, 0));
	addEntities(entities.pine(149.75, 17.25, 0));
	addEntities(entities.pine(151.88, 19.79, 0));

	// harbor road
	addEntities(entities.tree(12.91, 64.13, 0));
	addEntities(entities.tree(30.03, 77.58, 1));
	addEntities(entities.tree(21.22, 69.17, 2));
	addEntities(entities.tree(30.69, 53.00, 0));
	addEntities(entities.tree(33.72, 69.96, 1));
	addEntities(entities.tree(30.94, 64.96, 2));
	addEntities(entities.tree(39.72, 82.25, 0));
	addEntities(entities.tree(10.81, 59.25, 1));
	addEntities(entities.pine(37.78, 58.79, 0));

	// south-west forest
	addEntities(entities.pine(28.22, 132.04, 0));
	addEntities(entities.pine(30.91, 130.67, 0));
	addEntities(entities.pine(32.03, 145.79, 0));
	addEntities(entities.pine(27.75, 152.04, 0));
	addEntities(entities.pine(28.59, 113.42, 0));
	addEntities(entities.pine(40.34, 119.54, 0));
	addEntities(entities.pine(18.75, 114.63, 0));
	addEntities(entities.pine(16.69, 117.79, 0));
	addEntities(entities.pine(20.91, 122.38, 0));
	addEntities(entities.pine(23.31, 121.71, 0));
	addEntities(entities.pine(23.69, 126.58, 0));
	addEntities(entities.pine(6.25, 141.58, 0));
	addEntities(entities.pine(4.66, 147.21, 0));
	addEntities(entities.pine(8.06, 144.71, 0));
	addEntities(entities.pine(3.47, 123.46, 0));
	addEntities(entities.pine(35.00, 105.04, 0));
	addEntities(entities.pine(32.00, 101.96, 0));
	addEntities(entities.pine(16.69, 96.46, 0));
	addEntities(entities.pine(17.75, 100.00, 0));
	addEntities(entities.pine(21.03, 95.13, 0));
	addEntities(entities.pine(36.94, 134.46, 0));
	addEntities(entities.pine(37.75, 136.83, 0));
	add(entities.rock(20.84, 98.25));
	add(entities.rock(29.09, 119.00));
	add(entities.rock(36.81, 141.83));
	add(entities.rock(10.00, 149.58));
	add(entities.rock(5.53, 121.88));
	add(entities.rock(3.28, 103.38));
	add(entities.rock(36.84, 122.42));
	add(entities.lanternOn(33.19, 135.83));
	add(entities.lanternOn(28.16, 135.38));
	add(entities.lanternOn(26.41, 137.92));
	add(entities.lanternOn(26.91, 143.96));
	add(entities.lanternOn(34.25, 140.50));
	add(entities.lanternOn(30.88, 143.71));
	add(entities.lanternOn(20.63, 146.96));
	add(entities.lanternOn(15.06, 147.46));
	add(entities.lanternOn(14.94, 152.50));
	add(entities.lanternOn(19.13, 154.92));
	add(entities.lanternOn(21.00, 152.71));
	add(entities.lanternOn(29.84, 105.04));
	add(entities.lanternOn(24.34, 108.92));
	add(entities.lanternOn(29.59, 109.92));
	add(entities.boxLanterns(15.66, 154.88)).interact = giveLantern;
	add(entities.boxLanterns(31.72, 134.50)).interact = giveLantern;
	add(entities.boxLanterns(138.97, 27.33)).interact = giveLantern;
	add(entities.boxLanterns(139.47, 10.83)).interact = giveLantern;
	add(entities.treeStump1(23.09, 145.67));
	add(entities.treeStump2(30.78, 132.92));
	add(entities.treeStump1(35.31, 143.04));
	add(entities.treeStump2(18.31, 124.13));
	add(entities.treeStump1(7.50, 147.38));
	add(entities.treeStump2(5.22, 128.71));
	add(entities.treeStump1(22.22, 147.25));
	add(entities.treeStump2(24.91, 149.33));
	add(entities.treeStump1(9.63, 139.50));
	add(entities.treeStump2(11.59, 141.79));
	add(entities.treeStump1(12.16, 139.67));
	add(entities.treeStump2(17.09, 125.88));
	addEntities(entities.pine(12.81, 133.33, 0));
	addEntities(entities.pine(9.38, 115.92, 0));
	addEntities(entities.pine(11.63, 112.17, 0));
	addEntities(entities.pine(20.56, 134.58, 0));
	addEntities(entities.pine(21.81, 156.33, 0));
	addEntities(entities.pine5(10.94, 136.04, 0));
	addEntities(entities.pine5(24.44, 158.46, 0));
	addEntities(entities.pine5(22.47, 133.29, 0));
	addEntities(entities.pine5(10.47, 110.38, 0));
	addEntities(entities.pine4(9.72, 133.50, 0));
	addEntities(entities.pine4(23.88, 136.75, 0));
	addEntities(entities.pine4(19.63, 158.33, 0));
	add(entities.treeStump1(13.66, 104.42));
	add(entities.treeStump1(29.03, 100.88));
	add(entities.treeStump1(3.19, 110.88));
	add(entities.treeStump1(35.56, 92.04));
	add(entities.treeStump1(13.13, 88.33));
	add(entities.treeStump1(34.81, 90.54));
	add(entities.treeStump1(38.59, 115.58));
	addWoodenFence(9, 95.5, 5);
	addWoodenFence(13.5, 90, 1, false, false, true);
	addWoodenFence(13.5, 91, 3);
	add(entities.lanternOn(12.69, 90.08));
	add(entities.lanternOn(8.88, 94.42));
	add(entities.lanternOn(8.97, 90.75));
	add(entities.boxLanterns(12.38, 87.96)).interact = giveLantern;
	addEntities(entities.pine(72.63, 153.08, 0));
	addEntities(entities.pine(70.41, 157.92, 0));

	addEntities(entities.pine5(4.84, 125.75, 0));
	addEntities(entities.pine5(30.91, 154.46, 0));
	addEntities(entities.pine5(42.56, 155.46, 0));
	addEntities(entities.pine5(31.88, 106.21, 0));
	addEntities(entities.pine5(1.28, 128.04, 0));
	addEntities(entities.pine5(15.59, 87.58, 0));
	addEntities(entities.pine5(37.41, 94.33, 0));
	addEntities(entities.pine5(29.63, 84.88, 0));
	addEntities(entities.pine5(13.41, 101.63, 0));
	addEntities(entities.pine5(4.25, 108.21, 0));
	addEntities(entities.pine5(27.28, 115.88, 0));
	addEntities(entities.pine5(36.00, 139.08, 0));
	addEntities(entities.pine5(36.41, 61.08, 0));
	addEntities(entities.pine5(26.69, 57.04, 0));
	addEntities(entities.pine5(6.28, 54.46, 0));
	addEntities(entities.pine5(7.22, 43.50, 0));
	addEntities(entities.pine5(6.41, 30.54, 0));
	addEntities(entities.pine5(7.88, 14.13, 0));
	addEntities(entities.pine5(132.75, 38.08, 0));
	addEntities(entities.pine5(148.16, 21.42, 0));
	addEntities(entities.pine5(157.44, 14.13, 0));
	addEntities(entities.pine5(154.25, 32.38, 0));

	addEntities(entities.tree5(41.69, 85.00, 0));
	addEntities(entities.tree5(24.91, 79.29, 1));
	addEntities(entities.tree5(24.06, 68.17, 2));
	addEntities(entities.tree5(10.00, 62.00, 0));
	addEntities(entities.tree5(8.94, 47.38, 1));
	addEntities(entities.tree5(33.06, 56.04, 2));
	addEntities(entities.tree5(32.94, 35.21, 0));
	addEntities(entities.tree5(39.88, 15.58, 1));
	addEntities(entities.tree5(42.38, 29.96, 2));
	addEntities(entities.tree5(69.53, 30.46, 0));
	addEntities(entities.tree5(85.94, 21.08, 1));
	addEntities(entities.tree5(84.38, 23.33, 2));
	addEntities(entities.tree5(103.91, 22.46, 0));
	addEntities(entities.tree5(110.50, 33.71, 1));
	addEntities(entities.tree5(103.63, 46.04, 2));
	addEntities(entities.tree5(62.81, 46.25, 0));

	addEntities(entities.tree4(136.78, 8.79, 0));
	addEntities(entities.tree4(155.53, 26.58, 1));
	addEntities(entities.tree4(127.63, 38.21, 2));
	addEntities(entities.tree4(117.03, 8.42, 0));
	addEntities(entities.tree4(109.47, 25.83, 1));
	addEntities(entities.tree4(100.47, 20.96, 2));
	addEntities(entities.tree4(108.94, 1.83, 0));
	addEntities(entities.tree4(76.25, 15.42, 1));
	addEntities(entities.tree4(77.81, 5.88, 2));
	addEntities(entities.tree4(42.78, 15.25, 0));
	addEntities(entities.tree4(27.84, 28.21, 1));
	addEntities(entities.tree4(28.25, 43.75, 2));
	addEntities(entities.tree4(10.66, 46.75, 0));
	addEntities(entities.tree4(29.34, 66.25, 1));
	addEntities(entities.tree4(25.59, 84.79, 2));
	addEntities(entities.pine4(4.81, 59.46, 0));
	addEntities(entities.pine4(12.88, 85.58, 0));
	addEntities(entities.pine4(10.81, 99.63, 0));
	addEntities(entities.pine4(19.47, 127.13, 0));
	addEntities(entities.pine4(3.19, 130.63, 0));
	addEntities(entities.pine4(11.91, 148.50, 0));
	addEntities(entities.pine4(28.06, 155.58, 0));
	addEntities(entities.pine4(39.81, 147.38, 0));
	addEntities(entities.pine4(40.75, 132.83, 0));
	addEntities(entities.pine4(25.63, 113.83, 0));
	addEntities(entities.pine4(36.47, 102.96, 0));
	addEntities(entities.pine4(5.75, 109.96, 0));
	addEntities(entities.pine(5.66, 156.04, 0));
	addEntities(entities.pine(8.25, 158.83, 0));
	addEntities(entities.pine(37.38, 158.75, 0));
	addEntities(entities.pine(0.75, 139.38, 0));
	addEntities(entities.pine5(2.00, 137.63, 0));
	addEntities(entities.pine4(10.16, 156.88, 0));
	addEntities(entities.pine4(35.28, 157.71, 0));
	addEntities(entities.pine5(34.09, 148.13, 0));
	addEntities(entities.pine3(22.28, 143.50, 0));
	addEntities(entities.pine3(2.09, 141.83, 0));
	addEntities(entities.pine3(42.22, 121.67, 0));
	addEntities(entities.pine3(29.94, 121.00, 0));
	addEntities(entities.pine3(16.47, 120.25, 0));
	addEntities(entities.pine3(38.50, 105.08, 0));
	addEntities(entities.pine3(15.38, 103.58, 0));
	addEntities(entities.pine3(41.34, 94.21, 0));
	addEntities(entities.pine3(27.84, 87.21, 0));
	addEntities(entities.pine3(25.63, 58.58, 0));
	addEntities(entities.pine3(6.66, 15.96, 0));
	addEntities(entities.pine3(1.47, 39.46, 0));
	addEntities(entities.pine3(28.63, 6.08, 0));
	add(entities.rock(15.78, 34.00));
	add(entities.rock(32.63, 25.42));
	add(entities.rock(8.91, 7.29));
	add(entities.rock(51.63, 13.17));
	add(entities.rock(86.00, 22.29));
	add(entities.rock(104.91, 7.92));
	add(entities.rock(108.53, 24.21));
	add(entities.rock(98.63, 38.04));
	add(entities.rock(117.22, 24.63));

	add(createSignWithText(70.5, 70.5, 'Pony Town', '      Pony Town\n[under construction]', entities.sign));

	addEntities(createToyStash(47.00, 55.00));

	addEntities(entities.pine3(72.78, 64.13, 0));

	const addCat = (x: number, y: number) => {
		const entity = add(entities.cat(x, y));
		let delay = 5;
		let boopDelay = 5;
		let hideDelay = 5;
		let hidden = false;

		entity.boopY = -0.1;
		entity.boop = () => {
			if (!hidden && boopDelay < 0) {
				setTimeout(() => sayToAll(entity, '😠', '😠', MessageType.Thinking, {}), 500);
				boopDelay = random(5, 10, true);
			}
		};

		entity.serverUpdate = delta => {
			delay -= delta;
			boopDelay -= delta;
			hideDelay -= delta;

			if (hideDelay < 0 && delay < 0) {
				if (hidden) {
					hidden = false;
					setEntityAnimation(entity, CatAnimation.Enter);
					hideDelay = random(30, 60, true);
					delay = random(2, 4, true);
				} else {
					hidden = true;
					setEntityAnimation(entity, CatAnimation.Exit);
					hideDelay = random(15, 30, true);
				}
			} else if (!hidden && delay < 0) {
				const rand = Math.random();

				if (rand < 0.1) {
					sayToAll(entity, 'meow', 'meow', MessageType.System, {});
					delay = random(2, 4, true);
				} else if (rand < 0.5) {
					setEntityAnimation(entity, CatAnimation.Wag);
					delay = random(2, 4, true);
				} else {
					setEntityAnimation(entity, CatAnimation.Blink);
					delay = random(2, 4, true);
				}
			}
		};
	};

	add(createSign(70, 61.5, 'Letter Sign', give(entities.letter.type, `Here's your letter!`), entities.sign));

	add(entities.mistletoe(43.00, 48.00));
	add(entities.mistletoe(78.00, 85.70));
	add(entities.fence3(46.50, 53.00));
	add(entities.fence3(65.00, 71.00));
	add(entities.fence3(64.00, 76.00));
	add(entities.fence3(55.00, 76.50));
	add(entities.fence2(92.00, 96.00));
	add(entities.fence2(85.00, 97.00));
	add(entities.fence1(48.00, 75.00));

	// pine trees
	add(entities.pine1(48.50, 65.50));
	add(entities.pine2(51.00, 65.00));

	addEntities(entities.pine3(52.00, 63.00, 0));
	addEntities(entities.pine4(53.00, 67.00, 0));
	addEntities(entities.pine5(43.00, 62.00, 0));
	addEntities(entities.pine(48.50, 63.00, 0));
	addEntities(entities.pine(46.00, 67.00, 0));
	addEntities(entities.pine(42.00, 69.00, 0));
	addEntities(entities.pine3(113.00, 104.00, 0));
	add(createCookieTable2(74.00, 66.00));

	addEntities(entities.pine(93.00, 53.00, 0));
	addEntities(entities.pine(97.00, 57.00, 0));
	addEntities(entities.pine(94.00, 62.00, 0));
	addEntities(entities.pine(64.00, 91.00, 0));
	addEntities(entities.pine(59.00, 95.00, 0));
	addEntities(entities.pine(63.00, 98.00, 0));

	// small trees
	add(entities.trees1[0](51.50, 69.00));
	add(entities.trees1[1](75.30, 72.20));
	add(entities.trees1[2](93.00, 67.00));
	add(entities.trees1[0](87.60, 47.00));
	add(entities.trees2[0](71.70, 78.70));
	add(entities.trees2[1](94.80, 94.60));
	add(entities.trees2[2](87.00, 52.70));
	add(entities.trees3[2](87.50, 45.50));
	add(entities.trees3[0](88.30, 82.50));
	add(entities.trees3[2](95.50, 94.00));
	add(entities.trees3[0](84.50, 97.50));
	add(entities.trees3[1](74.00, 83.80));
	add(entities.trees3[2](46.00, 77.50));

	addEntities(entities.tree4(61.70, 70.50, 0));
	addEntities(entities.tree4(47.50, 74.50, 1));
	addEntities(entities.tree4(69.00, 53.50, 2));
	addEntities(entities.tree4(88.50, 57.70, 0));
	addEntities(entities.tree4(83.50, 64.50, 1));
	addEntities(entities.tree4(76.00, 82.00, 2));
	addEntities(entities.tree4(90.00, 82.70, 1));
	addEntities(entities.tree4(95.00, 80.00, 2));
	addEntities(entities.tree4(97.00, 88.00, 0));
	addEntities(entities.tree4(83.50, 96.50, 0));
	addEntities(entities.tree4(84.00, 91.00, 1));
	addEntities(entities.tree5(86.00, 46.50, 0));
	addEntities(entities.tree5(84.00, 55.00, 1));
	addEntities(entities.tree5(63.00, 71.60, 1));
	addEntities(entities.tree5(45.00, 76.00, 0));
	addEntities(entities.tree5(82.00, 80.50, 0));
	addEntities(entities.tree5(89.00, 81.50, 2));
	addEntities(entities.tree5(98.00, 85.50, 2));
	addEntities(entities.tree5(90.00, 95.00, 0));
	addEntities(entities.tree5(78.00, 90.50, 0));

	// trees - top
	addTree(45.00, 45.00, 1);
	addTree(42.00, 47.00, 2 + 4, false, isHalloween);
	addTree(48.00, 50.00, 0 + 8, true, true);
	addTree(82.00, 53.00, 1);

	addEntities(entities.tree4(71.50, 47.00, 0));
	addEntities(entities.tree5(70.00, 46.00, 1));
	add(entities.trees2[2](68.50, 48.00));

	// trees - bottom right
	addTree(83.00, 87.00, 1);
	addTree(85.00, 82.00, 0 + 8, isHalloween);
	addTree(87.00, 90.00, 1 + 4);
	addTree(92.00, 85.00, 2, true, true);
	addTree(79.00, 85.00, 3 + 4);
	addTree(81.00, 92.00, 0 + 8, isHalloween, isHalloween);
	addTree(90.00, 79.00, 1 + 4);
	addTree(94.00, 76.00, 2);
	addTree(96.00, 87.00, 3 + 4);
	addTree(93.00, 92.00, 0 + 8, isHalloween);
	addTree(97.00, 82.00, 1 + 4, false, isHalloween);

	// tree stumps - right
	add(entities.treeStump2(91.50, 68.50));
	add(entities.treeStump1(92.50, 66.50));
	add(entities.treeStump2(88.50, 64.50));

	// trees - 80x80
	addTree(102.71, 82.41, 0);
	addTree(102.09, 89.41, 1 + 4);
	addTree(108.71, 82.37, 2 + 8);
	addTree(111.37, 86.58, 0);
	addTree(116.65, 95.12, 1 + 8);
	addTree(118.43, 98.41, 2);
	addTree(104.59, 106.54, 0 + 4);
	addTree(101.12, 110.79, 1 + 8);
	addTree(107.28, 114.20, 2, isHalloween);
	addTree(119.62, 114.91, 0);
	addTree(96.53, 94.95, 1 + 4);
	addTree(94.75, 102.37, 2 + 4);
	addTree(81.81, 112.12, 0 + 8, isHalloween);
	addTree(88.03, 115.83, 1);
	addTree(111.84, 118.62, 2 + 4);
	addTree(118.78, 47.50, 2 + 8);

	// top right
	addTree(135.00, 66.90, 1);
	addTree(156.38, 75.17, 0);
	addTree(149.38, 78.33, 1 + 4, isHalloween);
	addTree(151.13, 81.33, 2);
	addTree(156.88, 86.58, 0 + 4);
	addTree(152.31, 88.83, 1 + 8, isHalloween, isHalloween);
	addTree(155.50, 90.17, 2);
	addTree(140.88, 83.92, 0);
	addTree(147.56, 95.00, 1 + 8);

	addEntities(entities.pine(141.13, 45.67, 0));
	addEntities(entities.pine(138.31, 52.33, 0));
	addEntities(entities.pine(148.25, 49.00, 0));
	addEntities(entities.pine(155.06, 46.17, 0));
	addEntities(entities.pine(157.38, 49.17, 0));
	addEntities(entities.pine(150.56, 60.42, 0));
	addEntities(entities.tree5(147.88, 80.42, 2));
	addEntities(entities.tree5(154.31, 93.33, 0));
	addEntities(entities.pine5(155.72, 52.13, 0));
	addEntities(entities.pine5(139.66, 54.50, 0));
	addEntities(entities.pine4(149.72, 51.04, 0));
	addEntities(entities.pine4(142.09, 57.75, 0));
	addEntities(entities.pine4(153.34, 48.21, 0));
	addEntities(entities.pine3(147.63, 53.96, 0));
	addEntities(entities.pine3(143.47, 44.25, 0));
	addEntities(entities.pine3(136.06, 53.88, 0));
	add(entities.treeStump1(136.91, 45.67));
	add(entities.treeStump2(132.69, 51.63));
	add(entities.treeStump1(131.41, 48.08));
	add(entities.lanternOn(136.09, 67.29));
	add(entities.lanternOn(132.38, 68.38));
	add(entities.lanternOn(138.53, 67.75));
	add(entities.rock(151.16, 63.21));
	add(entities.rock(148.66, 79.38));
	add(entities.treeStump1(154.72, 54.83));
	add(entities.treeStump2(152.22, 63.29));
	add(entities.treeStump1(149.84, 67.58));
	add(entities.treeStump2(152.81, 70.54));
	add(entities.treeStump1(154.06, 64.63));
	add(entities.treeStump2(156.50, 67.38));
	add(entities.treeStump1(156.56, 61.29));
	add(entities.treeStump2(155.44, 60.38));
	add(entities.treeStump1(157.41, 56.67));

	// forest
	addTree(122.69, 106.50, 0);
	addTree(131.69, 105.58, 1);
	addTree(130.94, 122.33, 2 + 4, isHalloween);
	addTree(132.69, 118.08, 0 + 8);
	addTree(124.38, 138.25, 1 + 8);
	addTree(134.94, 137.42, 2, isHalloween, isHalloween);
	addTree(131.94, 134.25, 0);
	addTree(138.25, 130.92, 1 + 8);
	addTree(121.69, 121.00, 2 + 4);
	addTree(111.94, 126.83, 0 + 4, isHalloween);
	addTree(115.06, 125.25, 1 + 8);
	addTree(114.44, 129.58, 2);
	addTree(120.69, 136.25, 0);
	addTree(125.00, 98.92, 1 + 8);
	addTree(128.56, 93.92, 2);
	addTree(140.88, 111.33, 0);
	addTree(137.94, 114.83, 1);
	addTree(147.19, 113.58, 2, isHalloween);
	addTree(143.94, 118.17, 0 + 4);
	addTree(149.94, 122.92, 1 + 8);
	addTree(148.13, 125.67, 2, isHalloween, isHalloween);
	addTree(144.19, 136.08, 0);
	addTree(152.13, 130.33, 1 + 4);
	addTree(155.88, 107.25, 2 + 8);
	addTree(132.31, 148.75, 0, isHalloween);
	addEntities(entities.tree5(125.81, 109.00, 0));
	addEntities(entities.tree5(119.31, 122.75, 1));
	addEntities(entities.tree5(141.88, 114.58, 2));
	addEntities(entities.tree5(139.13, 138.50, 0));
	addEntities(entities.tree5(150.25, 115.92, 1));
	addEntities(entities.tree5(118.69, 138.50, 2));
	addEntities(entities.tree5(133.56, 121.67, 0));
	addEntities(entities.tree4(130.50, 97.17, 0));
	addEntities(entities.tree4(116.00, 116.08, 1));
	addEntities(entities.tree4(133.44, 108.00, 2));
	addEntities(entities.tree4(110.50, 130.33, 0));
	addEntities(entities.tree4(145.31, 120.25, 1));
	addEntities(entities.tree4(149.40, 129.33, 2));
	addEntities(entities.tree4(141.81, 85.67, 0));
	addEntities(entities.tree4(158.19, 108.67, 1));
	add(entities.tree3(123.50, 122.50));
	add(entities.tree3(139.63, 116.25));
	add(entities.tree3(112.75, 130.83));
	add(entities.tree3(156.63, 92.42));
	add(entities.tree3(137.00, 138.08));
	add(entities.rock(133.81, 137.54));
	add(entities.rock(122.97, 139.54));
	add(entities.rock(130.22, 121.79));
	add(entities.rock(126.25, 109.54));
	add(entities.rock(151.00, 129.83));
	add(entities.treeStump1(141.53, 117.29));
	add(entities.treeStump2(139.31, 132.38));
	add(entities.treeStump1(117.78, 125.63));
	add(entities.treeStump2(125.66, 111.50));
	add(entities.treeStump1(123.06, 113.79));
	add(entities.treeStump2(124.13, 117.71));
	add(entities.treeStump1(129.25, 99.88));
	add(entities.lanternOn(52.97, 134.75));
	add(entities.lanternOn(49.19, 138.25));
	add(entities.lanternOn(49.25, 142.08));
	add(entities.lanternOn(54.97, 142.96));
	add(entities.lanternOn(45.53, 146.04));

	// graveyard
	addStoneWall(142, 98, 2, false, true); // left (1)
	addStoneWall(142, 104, 2, false, false, true); // left (2)
	addStoneWall(142, 98, 5); // top
	addStoneWall(152, 98, 5, false, true, true); // right
	addStoneWall(142, 108, 5); // bottom

	add(entities.lanternOnWall(148.00, 98.20));
	add(entities.lanternOnWall(144.00, 108.20));
	add(entities.lanternOnWall(152.00, 108.20));
	addCat(149, 108.19);

	// forest path
	add(entities.boxLanterns(52.50, 133.96)).interact = giveLantern;
	add(entities.boxLanterns(124.53, 112.67)).interact = giveLantern;
	add(entities.boxLanterns(142.59, 118.54)).interact = giveLantern;

	addWoodenFence(132, 108, 6, false);
	addWoodenFence(125, 121, 4, false);
	addWoodenFence(131, 130, 3, false);
	addWoodenFence(125, 132, 4, false);
	addWoodenFence(118, 100, 6);
	addWoodenFence(117, 105, 3);

	add(entities.lanternOn(123.59, 112.67));
	add(entities.lanternOn(124.03, 116.42));
	add(entities.lanternOn(141.50, 118.25));
	add(entities.lanternOn(138.25, 116.63));
	add(entities.lanternOn(145.63, 121.33));
	add(entities.lanternOn(135.78, 122.00));
	add(entities.lanternOn(137.78, 124.17));
	add(entities.lanternOn(138.53, 120.54));
	add(entities.lanternOn(143.44, 119.04));
	add(entities.lanternOn(94.41, 132.92));
	add(entities.lanternOn(95.53, 136.17));
	add(entities.lanternOn(91.31, 133.71));
	add(entities.lanternOn(90.56, 136.58));
	add(entities.lanternOn(93.34, 138.17));

	// bottom left
	addEntities(entities.pine(45.00, 126.33, 0));
	addEntities(entities.pine(52.69, 130.42, 0));
	addEntities(entities.pine(49.81, 133.58, 0));
	addEntities(entities.pine(46.75, 140.92, 0));
	addEntities(entities.pine(57.56, 143.92, 0));
	addEntities(entities.pine(52.38, 150.42, 0));
	addEntities(entities.pine(41.50, 144.83, 0));
	addEntities(entities.pine(44.06, 151.17, 0));
	addEntities(entities.pine(95.56, 122.83, 0));
	addEntities(entities.pine(105.81, 120.92, 0));
	addEntities(entities.pine(103.19, 131.00, 0));
	addEntities(entities.pine(100.81, 129.67, 0));
	addEntities(entities.pine(97.88, 133.33, 0));
	addEntities(entities.pine(108.13, 137.92, 0));
	addEntities(entities.pine(105.13, 139.50, 0));
	addEntities(entities.pine5(45.31, 143.75, 0));
	addEntities(entities.pine5(53.94, 153.50, 0));
	addEntities(entities.pine5(41.56, 130.83, 0));
	addEntities(entities.pine5(58.63, 132.58, 0));
	addEntities(entities.pine5(60.06, 147.17, 0));
	addEntities(entities.pine5(43.69, 133.25, 0));
	addEntities(entities.pine4(55.63, 133.92, 0));
	addEntities(entities.pine4(50.31, 152.83, 0));
	addEntities(entities.pine4(62.31, 143.92, 0));
	addEntities(entities.pine4(98.50, 139.08, 0));
	addEntities(entities.pine4(107.38, 123.75, 0));
	addEntities(entities.pine4(89.63, 125.33, 0));
	addEntities(entities.pine4(64.19, 149.00, 0));
	addEntities(entities.pine3(57.00, 127.75, 0));
	addEntities(entities.pine3(62.31, 151.17, 0));
	addEntities(entities.pine3(51.00, 155.58, 0));
	addEntities(entities.pine3(110.25, 140.25, 0));
	addEntities(entities.pine3(90.06, 130.33, 0));
	addEntities(entities.pine3(105.75, 124.75, 0));

	// bottom center
	addStoneWall(93, 141.5, 3);
	addStoneWall(101, 141.5, 3);
	addStoneWall(90, 146, 3);
	addStoneWall(103, 146.5, 3);

	// bottom right
	addWoodenFence(118, 140, 4);
	addWoodenFence(121, 145, 4);
	addWoodenFence(136, 140, 6);
	addWoodenFence(134, 144, 6);
	addWoodenFence(143, 144.5, 2);

	// pumpkin field
	addEntities(entities.pine5(100.38, 120.58, 0));
	addEntities(entities.pine5(93.31, 128.58, 0));
	addEntities(entities.pine5(100.00, 137.75, 0));

	addWoodenFence(76, 120, 12); // top
	addWoodenFence(76, 120, 5, false, true); // left 1
	addWoodenFence(76, 129, 7, false, false); // left 2
	addWoodenFence(88, 120, 10, false, true); // right 1
	addWoodenFence(88, 130, 1, true, true, true); // right 2
	addWoodenFence(89, 130, 7, false, false, true); // right 3
	addWoodenFence(76, 136, 6); // bottom 1
	addWoodenFence(82, 136, 1, false, true, true); // bottom 2
	addWoodenFence(82, 137, 7); // bottom 3

	addWoodenFence(82, 147, 6); // top
	addWoodenFence(75, 147, 4); // top
	addWoodenFence(88, 147, 10, false, true); // right
	addWoodenFence(75, 157, 13, true, false, true); // bottom
	addWoodenFence(75, 147, 10, false, true, true); // left

	if (true) {
		add(entities.pumpkin(77.44, 124.67));
		add(entities.pumpkin(78.31, 125.75));
		add(entities.pumpkin(80.63, 124.00));
		add(entities.pumpkin(84.25, 123.83));
		add(entities.pumpkin(82.81, 126.67));
		add(entities.pumpkin(80.75, 129.17));
		add(entities.pumpkin(82.19, 128.42));
		add(entities.pumpkin(82.38, 129.42));
		add(entities.pumpkin(81.56, 129.67));
		add(entities.pumpkin(76.94, 131.25));
		add(entities.pumpkin(78.25, 134.67));
		add(entities.pumpkin(80.56, 134.00));
		add(entities.pumpkin(84.88, 124.17));
		add(entities.pumpkin(83.81, 124.83));
		add(entities.pumpkin(84.56, 132.50));
		add(entities.pumpkin(84.19, 133.83));
		add(entities.pumpkin(84.75, 135.83));
		add(entities.pumpkin(87.13, 132.50));
		add(entities.pumpkin(86.56, 134.00));
		add(entities.pumpkin(87.70, 134.50));
		add(entities.pumpkin(88.31, 135.67));
		add(entities.pumpkin(82.25, 122.17));
	}

	add(entities.treeStump1(91.25, 123.67));
	add(entities.treeStump1(94.94, 126.33));
	add(entities.treeStump1(92.56, 131.42));

	// rock circle 2
	add(entities.rock(111.63, 152.33));
	add(entities.rock(107.63, 147.92));
	add(entities.rock(105.31, 152.33));
	add(entities.rock(108.50, 156.33));
	add(entities.rock(115.44, 155.67));
	add(entities.rock(115.38, 149.67));
	add(entities.rock(113.69, 147.33));
	add(entities.rock(105.63, 150.50));
	add(entities.rock(112.88, 157.25));
	add(entities.rock(117.38, 152.83));
	addEntities(entities.pine3(106.38, 148.58, 0));
	addEntities(entities.pine4(115.94, 148.25, 0));
	addEntities(entities.pine4(114.13, 157.92, 0));
	addEntities(entities.pine5(104.25, 150.50, 0));

	addEntities(entities.tree5(85.28, 116.79, 1));
	addEntities(entities.tree5(91.03, 118.33, 2));
	addEntities(entities.tree5(104.46, 115.70, 0));
	addEntities(entities.tree5(112.96, 107.33, 1));
	addEntities(entities.tree5(100.84, 92.20, 2));
	addEntities(entities.tree5(107.62, 84.29, 0));
	addEntities(entities.tree5(97.43, 64.04, 1));
	addEntities(entities.tree5(116.28, 44.75, 2));
	addEntities(entities.tree5(118.68, 70.62, 0));
	addEntities(entities.tree4(89.81, 103.54, 0));
	addEntities(entities.tree4(110.78, 92.29, 1));
	addEntities(entities.tree4(117.09, 69.66, 2));

	add(entities.trees3[0](76.37, 118.08));

	addEntities(entities.pine(92.28, 104.58, 0));
	addEntities(entities.pine(116.15, 105.75, 0));
	addEntities(entities.pine(112.12, 103.45, 0));
	addEntities(entities.pine(118.93, 88.95, 0));
	addEntities(entities.pine(111.34, 77.33, 0));
	addEntities(entities.pine(114.62, 75.66, 0));
	addEntities(entities.pine(98.43, 117.79, 0));
	addEntities(entities.pine(42.59, 115.91, 0));
	addEntities(entities.pine(47.09, 117.70, 0));
	addEntities(entities.pine5(44.59, 104.50, 0));
	addEntities(entities.pine4(95.34, 106.58, 0));
	addEntities(entities.pine3(47.78, 104.75, 0));
	addEntities(entities.pine3(58.78, 110.04, 0));

	add(entities.pine2(57.50, 109.00));
	add(entities.fence3(86.43, 100.58));
	add(entities.fence3(93.96, 100.50));

	add(entities.treeStump1(105.31, 89.12));
	add(entities.treeStump2(108.25, 88.16));
	add(entities.treeStump1(113.37, 91.54));
	add(entities.treeStump2(114.12, 95.45));
	add(entities.treeStump1(109.53, 100.58));
	add(entities.treeStump2(107.46, 100.62));
	add(entities.treeStump1(99.34, 101.04));
	add(entities.treeStump2(101.12, 95.12));
	add(entities.treeStump1(102.43, 91.79));
	add(entities.treeStump2(80.18, 113.66));
	add(entities.treeStump1(81.81, 114.95));
	add(entities.treeStump2(77.62, 118.58));
	add(entities.treeStump1(46.93, 106.70));
	add(entities.treeStump2(51.81, 117.41));
	add(entities.treeStump1(53.50, 115.58));
	add(entities.treeStump2(117.03, 48.66));

	add(entities.rock(104.81, 88.83));
	add(entities.rock(114.53, 95.25));
	add(entities.rock(103.96, 106.25));
	add(entities.rock(84.50, 116.21));
	add(entities.rock(54.25, 116.58));
	add(entities.rock(118.06, 49.20));
	add(entities.rock(104.56, 47.65));

	add(entities.boxLanterns(113.45, 95.16)).interact = giveLantern;
	add(entities.box(105.90, 88.81));
	add(entities.lanternOn(113.31, 95.48));
	add(entities.lanternOn(112.64, 94.42));
	add(entities.lanternOn(105.98, 89.17));
	add(entities.lanternOn(106.81, 100.67));
	add(entities.lanternOn(102.94, 92.25));

	add(entities.fence1(80.03, 97.00));
	add(entities.fence2(74.81, 100.79));

	// rocks
	add(entities.rock(46.00, 50.00));
	add(entities.rock(48.50, 81.50));
	add(entities.rock(45.50, 84.50));
	add(entities.rock(44.50, 88.50));
	add(entities.rock(46.50, 93.50));
	add(entities.rock(50.50, 94.50));
	add(entities.rock(55.50, 93.50));
	add(entities.rock(56.50, 91.50));
	add(entities.rock(56.50, 86.50));
	add(entities.rock(55.50, 83.50));
	add(entities.rock(52.50, 81.50));
	add(entities.rock(50.50, 87.50));
	add(entities.rock(70.50, 62.30));
	add(entities.rock(74.50, 67.50));
	add(entities.rock(86.50, 52.50));
	add(entities.rock(91.50, 55.50));
	add(entities.rock(88.50, 58.50));
	add(entities.rock(52.00, 68.50));
	add(entities.rock(52.50, 69.50));
	add(entities.rock(61.50, 71.50));
	add(entities.rock(83.50, 91.50));
	add(entities.rock(90.50, 83.50));

	// pumpkins
	add(entities.pumpkin(74.50, 88.50));
	add(entities.pumpkin(74.00, 90.00));
	add(entities.pumpkin(68.00, 87.00));
	add(entities.pumpkin(69.00, 93.00));
	add(entities.pumpkin(68.00, 95.00));
	add(entities.pumpkin(69.70, 61.80));

	addCat(67.06, 71);

	// lights

	const addJacko = createAddLight(world, map, entities.jacko);
	const addTorch = createAddLight(world, map, entities.torch);

	// jack-o-lanterns
	// top left
	addJacko(45, 48);

	add(entities.lanternOn(66.75, 62));
	add(entities.lanternOn(67.7, 62.8));
	add(entities.lanternOn(69.5, 62.2));
	add(entities.boxLanterns(67.6, 62.6)).interact = giveLantern;
	add(entities.boxLanterns(66.5, 63.3)).interact = giveLantern;

	add(entities.treeStump1(70, 62.5));

	// top left
	addTorch(50.00, 54.00);
	addTorch(46.50, 55.00);
	// top
	addTorch(76.00, 53.00);
	addTorch(63.00, 50.00);
	addTorch(65.90, 64.00);
	addTorch(68.00, 47.00);
	addTorch(71.00, 50.00);
	addTorch(70.00, 57.00);
	addTorch(68.30, 62.00);
	addTorch(70.70, 61.50);
	// top right
	addTorch(92.00, 59.00);
	addTorch(88.00, 53.00);
	addTorch(94.00, 45.00);
	addTorch(89.00, 45.00);
	addTorch(92.00, 49.00);
	// left
	addTorch(44.00, 65.00);
	addTorch(49.00, 69.00);
	addTorch(55.00, 65.00);
	// center
	addTorch(70.00, 69.00);
	// right
	addTorch(84.00, 65.00);
	addTorch(80.00, 68.00);
	addTorch(86.00, 71.00);
	addTorch(98.00, 66.50);
	// bot left
	addTorch(47.00, 80.50);
	addTorch(43.00, 87.00);
	addTorch(49.00, 94.00);
	addTorch(57.00, 91.00);
	addTorch(56.00, 82.00);
	addTorch(49.00, 87.00);
	addTorch(60.00, 88.00);
	// bot
	addTorch(72.00, 79.00);
	addTorch(68.00, 81.00);
	addTorch(69.00, 88.80);
	// bot right
	addTorch(87.00, 94.00);
	addTorch(101.50, 94.00);
	addTorch(94.50, 93.80);
	addTorch(100.00, 100.00);
	addTorch(99.00, 95.00);
	// 80x80
	addTorch(47.81, 106.50);
	addTorch(52.00, 110.85);
	addTorch(56.75, 116.96);
	addTorch(52.03, 116.88);
	addTorch(59.88, 100.50);
	addTorch(63.81, 101.67);
	addTorch(60.53, 104.63);
	addTorch(62.00, 102.88);
	addTorch(63.47, 106.33);
	addTorch(66.97, 104.00);
	addTorch(77.22, 116.17);
	addTorch(73.13, 100.13);
	addTorch(76.78, 100.42);
	addTorch(85.53, 105.50);
	addTorch(89.84, 106.33);
	addTorch(86.78, 109.25);
	addTorch(116.34, 110.83);
	addTorch(112.00, 107.60);
	addTorch(109.94, 111.46);
	addTorch(113.78, 113.83);
	addTorch(112.97, 110.83);
	addTorch(96.09, 114.88);
	addTorch(100.09, 50.75);
	addTorch(112.59, 45.96);
	addTorch(116.03, 47.92);
	addTorch(116.94, 59.08);
	addTorch(109.06, 64.29);
	addTorch(111.94, 69.96);
	addTorch(104.94, 71.21);
	addTorch(102.91, 49.42);
	addTorch(115.00, 79.79);
	addTorch(116.63, 77.46);
	addTorch(113.19, 78.17);
	addTorch(64.36, 103.92);
	// 15x15
	addTorch(117.09, 140.33);
	addTorch(120.13, 144.79);
	addTorch(123.34, 140.13);
	addTorch(126.31, 144.79);
	addTorch(134.00, 143.75);
	addTorch(133.88, 139.00);
	addTorch(131.66, 135.79);
	addTorch(126.03, 137.58);
	addTorch(125.94, 133.08);
	addTorch(130.06, 129.50);
	addTorch(125.81, 128.67);
	addTorch(125.88, 123.29);
	addTorch(130.09, 123.08);
	addTorch(126.19, 118.75);
	addTorch(127.22, 114.00);
	addTorch(132.54, 111.75);
	addTorch(127.13, 109.50);
	addTorch(130.72, 106.33);
	addTorch(121.47, 106.10);
	addTorch(123.69, 100.71);
	addTorch(126.69, 101.96);
	addTorch(119.28, 100.58);
	addTorch(117.89, 104.67);
	addTorch(138.34, 139.08);
	addTorch(139.69, 144.17);
	addTorch(142.78, 139.75);
	addTorch(145.16, 143.96);
	addTorch(148.34, 138.88);
	addTorch(148.53, 143.79);
	addTorch(142.50, 144.42);
	addTorch(138.34, 147.29);
	addTorch(140.72, 147.71);
	addTorch(143.81, 148.00);
	addTorch(142.91, 151.58);
	addTorch(139.47, 151.08);
	addTorch(136.34, 150.79);
	addTorch(136.41, 144.88);
	addTorch(140.72, 155.04);
	addTorch(152.69, 152.17);
	addTorch(155.78, 152.42);
	addTorch(153.84, 155.54);
	addTorch(150.88, 131.13);
	addTorch(153.38, 130.83);
	addTorch(113.78, 146.13);
	addTorch(110.94, 141.38);
	addTorch(107.06, 141.83);
	addTorch(107.13, 145.71);
	addTorch(100.63, 141.79);
	addTorch(101.97, 146.08);
	addTorch(96.44, 145.92);
	addTorch(98.41, 141.71);
	addTorch(92.63, 141.79);
	addTorch(90.28, 145.83);
	addTorch(88.22, 140.79);
	addTorch(88.03, 138.17);
	addTorch(83.50, 138.33);
	addTorch(79.59, 136.88);
	addTorch(75.69, 136.75);
	addTorch(75.19, 132.13);
	addTorch(75.22, 121.33);
	addTorch(78.63, 111.50);
	addTorch(81.69, 105.92);
	addTorch(82.78, 100.71);
	addTorch(69.84, 115.58);
	addTorch(68.94, 119.21);
	addTorch(69.03, 122.75);
	addTorch(69.00, 126.42);
	addTorch(69.25, 131.79);
	addTorch(69.59, 136.83);
	addTorch(86.09, 145.33);
	addTorch(82.09, 145.00);
	addTorch(78.16, 144.79);
	addTorch(73.78, 144.96);
	addTorch(74.41, 149.21);
	addTorch(66.16, 142.13);
	addTorch(69.09, 140.71);
	addTorch(69.59, 144.63);
	addTorch(71.13, 147.83);
	addTorch(58.22, 149.33);
	addTorch(61.09, 150.92);
	addTorch(63.88, 140.50);
	addTorch(59.91, 138.63);
	addTorch(56.72, 136.50);
	addTorch(124.56, 46.29);
	addTorch(127.19, 48.63);
	addTorch(123.91, 50.33);
	addTorch(126.97, 52.75);
	addTorch(131.50, 46.63);
	addTorch(130.56, 50.42);
	addTorch(134.09, 49.17);
	addTorch(132.59, 53.79);
	addTorch(126.63, 56.58);
	addTorch(129.38, 54.63);
	addTorch(151.78, 62.96);
	addTorch(155.75, 63.33);
	addTorch(149.00, 66.21);
	addTorch(148.84, 70.75);
	addTorch(153.31, 71.71);
	addTorch(157.34, 68.79);
	addTorch(157.75, 65.54);
	addTorch(151.16, 69.21);
	addTorch(75.31, 124.79);
	addTorch(75.47, 128.88);
	// cookie stands lights
	addTorch(33.19 + 0.25, 26.29 + 9.5);
	addTorch(65.78, 114.08);
	addTorch(89.78, 132.17);
	addTorch(124.78, 147.25);
	addTorch(132.97, 150.29);
	addTorch(144.13, 98.58);
	addTorch(120.34, 48.38);
	addTorch(144.62, 125.20);

	// top left hill
	addTorch(22.40, 45.12);
	addTorch(18.19, 40.75);
	addTorch(21.13, 35.96);
	addTorch(20.91, 30.63);
	addTorch(14.22, 30.54);
	addTorch(27.78, 30.83);
	addTorch(30.16, 34.46);
	addTorch(18.13, 24.42);
	addTorch(16.31, 17.83);
	addTorch(17.69, 13.46);
	addTorch(20.88, 10.00);
	addTorch(14.22, 10.92);
	addTorch(21.13, 16.75);
	addTorch(14.09, 22.88);
	addTorch(28.03, 12.96);
	addTorch(31.19, 8.17);
	addTorch(36.38, 10.83);
	addTorch(44.56, 8.33);
	addTorch(51.28, 11.88);
	addTorch(60.13, 9.33);
	addTorch(62.91, 11.88);
	addTorch(71.00, 8.25);
	addTorch(76.28, 12.54);
	addTorch(82.66, 9.58);
	// center
	addTorch(53.09, 71.08);
	addTorch(60.78, 70.88);
	addTorch(67.19, 76.38);
	addTorch(60.53, 76.63);
	addTorch(52.38, 76.79);
	addTorch(48.13, 75.29);
	addTorch(58.97, 55.75);
	addTorch(53.75, 51.00);
	addTorch(58.81, 42.42);
	addTorch(53.97, 40.00);
	addTorch(59.59, 37.00);
	addTorch(53.34, 30.46);
	addTorch(58.09, 30.29);
	addTorch(69.84, 38.92);
	addTorch(68.09, 41.92);
	addTorch(79.78, 39.79);
	addTorch(78.19, 43.83);
	addTorch(92.19, 39.00);
	addTorch(99.25, 39.21);
	addTorch(99.19, 45.21);
	addTorch(103.19, 36.58);
	addTorch(104.63, 41.71);
	addTorch(100.00, 58.58);
	addTorch(92.22, 30.46);
	addTorch(96.06, 28.88);
	addTorch(90.88, 24.08);
	addTorch(95.34, 22.50);
	addTorch(90.81, 17.21);
	addTorch(95.88, 15.83);
	addTorch(96.28, 10.33);
	addTorch(91.25, 8.83);
	addTorch(94.34, 2.38);
	addTorch(97.16, 6.71);
	addTorch(88.78, 4.54);
	addTorch(50.69, 20.42);
	addTorch(59.38, 20.29);
	addTorch(50.28, 29.21);
	addTorch(48.72, 32.92);
	addTorch(42.66, 36.50);
	addTorch(38.19, 31.17);
	addTorch(37.53, 37.88);
	// top right
	addTorch(115.50, 36.17);
	addTorch(113.94, 40.13);
	addTorch(109.72, 35.71);
	addTorch(123.44, 37.00);
	addTorch(131.59, 39.75);
	addTorch(138.38, 38.13);
	addTorch(137.66, 43.00);
	addTorch(144.16, 36.17);
	addTorch(148.09, 36.71);
	addTorch(146.03, 41.00);
	addTorch(150.97, 41.00);
	addTorch(155.88, 37.67);
	addTorch(152.56, 34.83);
	addTorch(127.00, 17.88);
	addTorch(127.88, 25.21);
	addTorch(131.88, 15.21);
	addTorch(135.78, 21.92);
	addTorch(132.41, 28.33);
	addTorch(122.81, 32.38);
	addTorch(127.66, 33.33);
	addTorch(141.53, 13.67);
	addTorch(145.75, 13.75);
	addTorch(141.59, 17.25);
	addTorch(145.69, 17.71);
	addTorch(135.72, 9.29);
	addTorch(131.59, 7.63);
	addTorch(129.69, 11.71);
	// harbor
	addTorch(22.50, 75.92);
	addTorch(20.34, 70.58);
	addTorch(28.66, 70.29);
	addTorch(36.72, 70.88);
	addTorch(32.41, 77.00);
	addTorch(15.03, 67.63);
	addTorch(20.03, 63.00);
	addTorch(15.59, 60.63);
	addTorch(16.88, 53.79);
	addTorch(21.75, 54.21);
	addTorch(15.47, 76.13);
	// south-west forest
	addTorch(36.84, 84.25);
	addTorch(30.28, 89.29);
	addTorch(29.84, 96.92);
	addTorch(23.34, 98.54);
	addTorch(21.59, 105.33);
	addTorch(15.28, 107.83);
	addTorch(14.81, 115.33);
	addTorch(9.41, 120.79);
	addTorch(15.59, 125.63);
	addTorch(14.16, 135.13);
	addTorch(14.97, 94.67);
	addTorch(17.16, 90.21);
	addTorch(22.25, 92.71);

	add(createSign(77.06, 60.16, 'Rose sign', give(entities.rose.type, `Here's your rose!`), entities.sign));

	if (world.featureFlags.test) {
		add(createSign(14.5, 70, 'Public Island', (_, client) => goToMap(world, client, 'public-island'), entities.signDebug));
		add(createSignWithText(60.7, 60.2, 'Pickable items', `Click on the item to carry it around`, entities.signDebug));
		add(entities.flower3Pickable(60, 60)).interact = (_, { pony }) => holdItem(pony, entities.flowerPick.type);
		add(entities.apple(61, 61)).interact = (_, { pony }) => holdItem(pony, entities.apple.type);
		add(entities.appleGreen2(61.3, 61.4)).interact = (_, { pony }) => holdItem(pony, entities.appleGreen2.type);
		add(entities.orange(60.3, 61.2)).interact = (_, { pony }) => holdItem(pony, entities.orange.type);
		add(entities.grapesPurple[0](60.67, 61.63)).interact = (_, { pony }) => holdItem(pony, entities.grapesPurple[0].type);
	}

	if (BETA) {
		const objects = [
			entities.fence1, entities.box, entities.boxLanterns, entities.gift3, entities.pumpkin, entities.sign,
			entities.rope,
		].map(e => e.type);

		add(createSign(62.7, 58.2, 'Jack-o-Lanterns', give(entities.jackoLanternOn.type, 'Have a lantern'), entities.signDebug));
		add(createSign(62.7, 60.2, 'Pickable objects', (_, client) => holdItem(client.pony, sample(objects)!), entities.signDebug));
		add(createSign(77.0, 69.0, 'Palette', (_, client) => goToMap(world, client, 'palette'), entities.signDebug));
	}

	// new added on Halloween
	addEntities(entities.tree4(155.18, 100.04, 1));
	addEntities(entities.tree4(144.97, 96.25, 0));
	addEntities(entities.tree(153.60, 99.54, 2));
	addEntities(entities.pine(157.50, 96.79, 0));
	add(entities.treeStump1(158.03, 110.12));
	add(entities.treeStump1(158.75, 112.91));
	add(entities.treeStump2(157.00, 111.50));

	// center lakes
	add(entities.waterRock1(77.66, 61.67));
	add(entities.waterRock7(76.56, 65.58));
	add(entities.waterRock8(76.97, 65.79));
	add(entities.waterRock10(83.47, 67.63));

	// sea
	add(entities.waterRock1(3.78, 61.96));
	add(entities.waterRock1(12.53, 75.88));
	add(entities.waterRock1(9.38, 80.50));
	add(entities.waterRock1(5.34, 95.42));
	add(entities.waterRock3(4.91, 95.71));
	add(entities.waterRock3(8.44, 85.79));
	add(entities.waterRock3(8.50, 64.00));
	add(entities.waterRock2(3.19, 61.42));
	add(entities.waterRock2(8.97, 86.00));
	add(entities.waterRock2(3.31, 100.88));
	add(entities.waterRock4(4.75, 95.21));
	add(entities.waterRock4(12.44, 77.58));
	add(entities.waterRock4(8.44, 63.54));
	add(entities.waterRock5(3.38, 61.96));
	add(entities.waterRock5(7.22, 90.79));
	add(entities.waterRock6(3.66, 100.25));
	add(entities.waterRock6(12.22, 78.04));
	add(entities.waterRock7(7.97, 63.88));
	add(entities.waterRock7(8.25, 86.38));
	add(entities.waterRock8(9.03, 80.83));
	add(entities.waterRock8(1.31, 101.71));
	add(entities.waterRock9(11.34, 79.17));
	add(entities.waterRock10(9.97, 66.79));
	add(entities.waterRock10(4.25, 94.38));
	add(entities.waterRock11(9.47, 66.88));
	add(entities.waterRock11(12.28, 70.71));
	add(entities.waterRock11(7.00, 91.25));

	// river
	add(entities.waterRock1(114.06, 1.96));
	add(entities.waterRock1(112.13, 17.92));
	add(entities.waterRock1(112.84, 28.38));
	add(entities.waterRock1(111.66, 35.75));
	add(entities.waterRock2(109.15, 16.50));
	add(entities.waterRock2(114.66, 32.50));
	add(entities.waterRock3(112.91, 20.33));
	add(entities.waterRock3(110.38, 9.75));
	add(entities.waterRock4(109.59, 16.75));
	add(entities.waterRock4(113.41, 7.96));
	add(entities.waterRock4(111.63, 35.13));
	add(entities.waterRock5(114.34, 33.04));
	add(entities.waterRock5(110.63, 9.38));
	add(entities.waterRock6(109.63, 16.58));
	add(entities.waterRock6(113.28, 28.58));
	add(entities.waterRock7(114.50, 1.54));
	add(entities.waterRock7(111.97, 35.38));
	add(entities.waterRock8(113.28, 28.17));
	add(entities.waterRock8(111.44, 22.79));
	add(entities.waterRock8(110.72, 9.63));
	add(entities.waterRock9(107.94, 12.75));
	add(entities.waterRock9(113.97, 6.58));
	add(entities.waterRock10(108.38, 12.63));
	add(entities.waterRock10(114.44, 33.46));
	add(entities.waterRock11(112.31, 18.25));
	add(entities.waterRock11(111.34, 12.25));
	add(entities.waterRock11(110.59, 39.75));

	// river+lake
	add(entities.waterRock1(107.75, 45.83));
	add(entities.waterRock1(105.63, 50.92));
	add(entities.waterRock1(118.56, 58.83));
	add(entities.waterRock1(127.59, 59.13));
	add(entities.waterRock1(131.50, 67.58));
	add(entities.waterRock1(124.25, 68.54));
	add(entities.waterRock2(117.44, 53.67));
	add(entities.waterRock2(128.41, 59.17));
	add(entities.waterRock2(105.06, 50.30));
	add(entities.waterRock2(111.56, 43.54));
	add(entities.waterRock3(112.69, 56.08));
	add(entities.waterRock3(105.53, 50.29));
	add(entities.waterRock3(127.88, 59.46));
	add(entities.waterRock3(134.09, 57.88));
	add(entities.waterRock4(111.38, 43.21));
	add(entities.waterRock4(112.97, 55.83));
	add(entities.waterRock4(124.66, 68.88));
	add(entities.waterRock5(110.47, 52.58));
	add(entities.waterRock5(118.16, 58.54));
	add(entities.waterRock5(132.63, 70.75));
	add(entities.waterRock6(108.03, 46.17));
	add(entities.waterRock6(116.94, 54.04));
	add(entities.waterRock6(129.66, 55.92));
	add(entities.waterRock7(109.91, 52.46));
	add(entities.waterRock7(120.31, 53.54));
	add(entities.waterRock7(133.09, 71.08));
	add(entities.waterRock8(132.59, 71.13));
	add(entities.waterRock8(110.22, 52.04));
	add(entities.waterRock8(111.63, 43.00));
	add(entities.waterRock8(110.81, 39.88));
	add(entities.waterRock9(109.81, 48.83));
	add(entities.waterRock10(120.41, 54.08));
	add(entities.waterRock10(131.13, 67.96));
	add(entities.waterRock11(121.75, 64.25));
	add(entities.waterRock10(121.31, 63.60));
	add(entities.waterRock1(121.13, 75.83));
	add(entities.waterRock1(125.47, 78.67));
	add(entities.waterRock1(140.31, 78.96));
	add(entities.waterRock1(146.44, 71.42));
	add(entities.waterRock1(143.47, 50.71));
	add(entities.waterRock1(142.00, 63.75));
	add(entities.waterRock2(139.69, 67.21));
	add(entities.waterRock2(147.75, 61.83));
	add(entities.waterRock2(125.94, 78.92));
	add(entities.waterRock2(140.81, 78.46));
	add(entities.waterRock3(140.06, 67.67));
	add(entities.waterRock3(145.31, 74.92));
	add(entities.waterRock3(137.53, 58.75));
	add(entities.waterRock3(143.84, 50.88));
	add(entities.waterRock3(121.63, 75.42));
	add(entities.waterRock3(133.47, 82.50));
	add(entities.waterRock4(125.94, 78.46));
	add(entities.waterRock4(148.03, 62.17));
	add(entities.waterRock4(143.91, 50.42));
	add(entities.waterRock5(137.81, 59.13));
	add(entities.waterRock5(142.47, 64.04));
	add(entities.waterRock5(146.13, 71.96));
	add(entities.waterRock5(129.16, 80.54));
	add(entities.waterRock5(146.44, 52.88));
	add(entities.waterRock6(140.38, 78.25));
	add(entities.waterRock6(133.06, 82.21));
	add(entities.waterRock6(139.31, 62.96));
	add(entities.waterRock6(138.19, 69.79));
	add(entities.waterRock6(147.38, 65.83));
	add(entities.waterRock7(129.63, 80.79));
	add(entities.waterRock7(145.56, 74.54));
	add(entities.waterRock7(146.88, 52.67));
	add(entities.waterRock8(140.09, 67.21));
	add(entities.waterRock10(133.41, 82.04));
	add(entities.waterRock11(147.66, 62.33));
	add(entities.waterRock8(145.97, 71.42));
	add(entities.waterRock8(121.56, 75.92));
	add(entities.waterRock10(122.38, 73.54));
	add(entities.waterRock8(129.53, 81.46));
	add(entities.waterRock11(136.40, 80.92));
	add(entities.waterRock8(136.88, 80.54));
	add(entities.waterRock11(144.94, 58.71));
	add(entities.waterRock8(133.75, 57.75));
	add(entities.waterRock6(126.63, 80.29));
	add(entities.waterRock1(128.59, 74.63));
	add(entities.waterRock3(129.47, 74.33));
	add(entities.waterRock6(129.16, 74.83));
	add(entities.waterRock8(128.75, 75.00));
	add(entities.waterRock7(140.59, 73.54));
	add(entities.waterRock10(140.94, 73.67));
	add(entities.waterRock8(140.59, 74.08));

	// pine forest lakes
	add(entities.waterRock1(34.81, 118.79));
	add(entities.waterRock1(31.38, 115.79));
	add(entities.waterRock1(51.63, 111.79));
	add(entities.waterRock2(62.38, 111.75));
	add(entities.waterRock2(49.63, 112.83));
	add(entities.waterRock2(31.72, 115.25));
	add(entities.waterRock2(36.69, 109.75));
	add(entities.waterRock3(34.56, 119.04));
	add(entities.waterRock3(32.63, 122.50));
	add(entities.waterRock3(52.03, 112.08));
	add(entities.waterRock4(62.59, 111.38));
	add(entities.waterRock4(51.59, 112.17));
	add(entities.waterRock4(31.91, 115.54));
	add(entities.waterRock5(34.28, 118.46));
	add(entities.waterRock5(33.44, 112.67));
	add(entities.waterRock6(30.66, 118.25));
	add(entities.waterRock6(55.28, 114.13));
	add(entities.waterRock7(33.75, 112.21));
	add(entities.waterRock7(29.94, 116.67));
	add(entities.waterRock7(49.78, 113.29));
	add(entities.waterRock8(49.97, 112.88));
	add(entities.waterRock8(32.72, 122.96));
	add(entities.waterRock9(53.41, 111.63));
	add(entities.waterRock10(64.34, 110.96));
	add(entities.waterRock10(36.91, 110.13));
	add(entities.waterRock10(30.44, 116.50));
	add(entities.waterRock8(30.31, 116.79));
	add(entities.waterRock10(32.94, 122.67));

	// bottom lake
	add(entities.waterRock1(95.34, 148.83));
	add(entities.waterRock2(98.56, 150.54));
	add(entities.waterRock3(95.44, 151.63));
	add(entities.waterRock4(95.75, 151.58));
	add(entities.waterRock5(92.44, 150.67));
	add(entities.waterRock6(92.72, 150.92));
	add(entities.waterRock8(92.75, 150.50));
	add(entities.waterRock9(98.81, 150.96));
	add(entities.waterRock10(98.41, 150.92));
	add(entities.waterRock4(95.03, 149.00));

	// forest puddle
	add(entities.waterRock5(140.44, 122.71));
	add(entities.waterRock4(140.13, 122.67));

	add(entities.bench1(18.69, 88.50));
	add(entities.bench1(27.94, 104.21));
	add(entities.bench1(22.56, 70.50));
	add(entities.bench1(25.28, 70.46));
	add(entities.bench1(44.16, 31.46));
	add(entities.bench1(46.84, 31.50));
	add(entities.bench1(30.03, 29.46));
	add(entities.bench1(87.00, 3.33));
	add(entities.bench1(101.91, 8.25));
	add(entities.bench1(142.13, 11.54));
	add(entities.bench1(144.84, 11.58));
	add(entities.benchSeat(142.00, 15.88));
	add(entities.benchSeat(144.78, 15.83));
	add(entities.benchBack(142.00, 16.7917));
	add(entities.benchBack(144.78, 16.71));
	add(entities.benchSeat(45.78, 36.42));
	add(entities.benchBack(45.78, 37.33));
	add(entities.bench1(93.59, 146.33));
	add(entities.bench1(144.13, 138.75));
	add(entities.bench1(146.66, 138.83));
	add(entities.bench1(133.22, 150.71));
	add(entities.benchSeat(133.13, 153.71));
	add(entities.benchBack(133.13, 154.63));
	add(entities.bench1(117.28, 62.13));
	add(entities.benchSeat(117.25, 65.13));
	add(entities.benchBack(117.25, 66.04));
	add(entities.bench1(123.81, 53.08));
	add(entities.bench1(127.09, 53.04));
	add(entities.lanternOn(117.09, 64.08));
	add(entities.lanternOn(20.34, 89.04));
	add(entities.benchSeatH(147.14, 13.02));
	add(entities.benchBackH2(147.66, 15.70));
	add(entities.benchSeatH(27.44, 117.21));
	add(entities.benchBackH(26.97, 119.92));
	add(entities.benchSeatH(136.63, 151.29));
	add(entities.benchSeatH(129.34, 151.25));
	add(entities.benchBackH(128.85, 153.96));
	add(entities.benchBackH2(137.16, 153.96));

	updateMainMapSeason(world, map, world.season, world.holiday);

	addEntities(createBunny([
		point(72.34, 56.79),
		point(70.69, 56.08),
		point(69.56, 55.67),
		point(68.03, 57.67),
		point(70.28, 57.96),
		point(71.28, 58.79),
		point(70.00, 59.54),
		point(68.72, 58.67),
		point(67.22, 59.96),
		point(65.38, 61.17),
		point(65.31, 62.50),
		point(64.25, 64.25),
		point(65.69, 66.00),
		point(68.47, 69.50),
		point(69.59, 69.79),
		point(69.56, 68.21),
		point(71.06, 68.79),
		point(72.94, 64.67),
		point(74.31, 63.13),
		point(74.41, 60.79),
		point(75.50, 60.13),
		point(76.03, 57.75),
		point(78.19, 54.42),
		point(77.47, 52.75),
		point(78.38, 50.46),
		point(79.03, 51.67),
		point(80.50, 50.96),
		point(81.69, 50.42),
		point(82.75, 51.54),
		point(83.75, 51.96),
		point(83.75, 52.96),
		point(86.13, 54.25),
		point(87.28, 54.04),
		point(87.59, 55.13),
		point(86.31, 55.50),
		point(84.22, 56.38),
		point(82.06, 56.25),
		point(81.47, 54.71),
		point(80.84, 54.71),
		point(81.41, 56.13),
		point(82.19, 59.58),
		point(84.03, 62.25),
		point(86.44, 63.92),
		point(88.00, 63.21),
		point(87.16, 64.29),
		point(85.78, 65.13),
		point(82.50, 65.42),
		point(81.47, 66.38),
		point(80.25, 66.58),
		point(79.47, 68.04),
		point(77.84, 68.04),
		point(75.91, 67.92),
		point(75.16, 66.58),
		point(74.72, 64.96),
		point(73.16, 63.54),
		point(71.97, 62.25),
		point(72.56, 60.79),
		point(71.16, 59.83),
		point(72.19, 58.17),
	]));

	addEntities(createBunny([
		point(111.84, 63.92),
		point(114.81, 64.79),
		point(111.50, 67.54),
		point(115.94, 69.58),
		point(112.09, 75.42),
		point(105.78, 79.75),
		point(111.13, 80.96),
		point(117.09, 80.29),
		point(120.88, 87.38),
		point(124.22, 91.50),
		point(128.81, 88.71),
		point(125.81, 85.21),
		point(131.44, 91.17),
		point(129.19, 95.38),
		point(132.38, 96.21),
		point(137.06, 96.50),
		point(142.28, 95.75),
		point(140.19, 89.46),
		point(145.56, 87.33),
		point(150.13, 89.83),
		point(151.75, 84.92),
		point(148.28, 82.29),
		point(150.13, 80.04),
		point(153.78, 79.17),
		point(150.44, 70.71),
		point(153.19, 67.96),
		point(152.38, 65.08),
		point(154.38, 62.63),
		point(152.44, 58.17),
		point(148.56, 57.00),
		point(149.56, 53.58),
		point(152.41, 51.21),
		point(151.03, 47.79),
		point(148.66, 45.25),
		point(143.31, 46.46),
		point(140.75, 49.58),
		point(141.78, 54.04),
		point(140.94, 56.08),
		point(139.19, 57.33),
		point(137.41, 55.13),
		point(134.91, 55.88),
		point(131.03, 52.08),
		point(128.63, 48.67),
		point(124.88, 49.25),
		point(124.56, 44.46),
		point(122.47, 45.83),
		point(121.50, 42.83),
		point(117.72, 45.63),
		point(115.34, 46.13),
		point(114.97, 43.25),
		point(115.94, 40.38),
		point(114.19, 37.83),
		point(108.16, 37.75),
		point(108.66, 40.25),
		point(108.53, 41.63),
		point(107.59, 42.67),
		point(101.91, 44.00),
		point(102.09, 46.67),
		point(100.34, 46.08),
		point(100.56, 48.25),
		point(102.28, 51.83),
		point(105.06, 52.92),
		point(104.75, 55.75),
		point(108.25, 55.67),
		point(106.88, 57.92),
		point(106.97, 62.38),
		point(111.09, 60.42),
		point(112.84, 62.63),
	]));

	addEntities(createBunny([
		point(85.00, 88.54),
		point(81.91, 89.75),
		point(77.06, 88.46),
		point(75.75, 90.58),
		point(78.06, 92.46),
		point(76.88, 92.96),
		point(78.59, 94.13),
		point(76.72, 95.29),
		point(79.94, 95.71),
		point(82.34, 93.63),
		point(85.81, 95.04),
		point(88.88, 93.58),
		point(92.66, 94.04),
		point(95.06, 92.21),
		point(98.00, 92.96),
		point(98.25, 94.92),
		point(98.13, 100.46),
		point(96.94, 102.71),
		point(96.09, 104.46),
		point(98.00, 106.46),
		point(100.41, 103.96),
		point(102.25, 107.50),
		point(103.97, 109.42),
		point(105.66, 108.04),
		point(107.19, 106.13),
		point(107.69, 102.42),
		point(108.78, 101.96),
		point(109.88, 104.42),
		point(108.53, 106.38),
		point(111.22, 109.50),
		point(114.34, 109.58),
		point(114.75, 112.63),
		point(114.28, 116.50),
		point(117.38, 118.50),
		point(117.88, 123.04),
		point(119.38, 124.38),
		point(119.25, 127.21),
		point(117.72, 129.13),
		point(114.41, 133.63),
		point(115.28, 134.75),
		point(115.03, 137.63),
		point(117.81, 145.83),
		point(122.03, 148.08),
		point(120.56, 151.42),
		point(119.28, 154.29),
		point(121.28, 154.71),
		point(123.44, 152.13),
		point(123.34, 150.17),
		point(126.38, 150.25),
		point(125.91, 154.08),
		point(124.91, 155.33),
		point(131.81, 157.13),
		point(139.19, 156.83),
		point(144.88, 153.63),
		point(147.00, 150.38),
		point(145.63, 149.13),
		point(150.34, 148.50),
		point(150.78, 151.04),
		point(149.28, 154.17),
		point(145.00, 151.04),
		point(150.50, 145.29),
		point(150.56, 138.17),
		point(153.09, 136.33),
		point(156.03, 136.29),
		point(154.78, 133.42),
		point(151.63, 134.08),
		point(148.56, 133.21),
		point(146.16, 129.38),
		point(146.34, 124.08),
		point(148.03, 119.42),
		point(145.09, 113.92),
		point(142.81, 110.83),
		point(140.09, 109.42),
		point(135.94, 105.75),
		point(138.91, 98.96),
		point(141.97, 94.92),
		point(143.66, 92.50),
		point(141.00, 91.29),
		point(144.03, 89.58),
		point(141.38, 87.79),
		point(138.75, 90.54),
		point(134.84, 89.50),
		point(131.41, 88.00),
		point(131.38, 90.63),
		point(128.03, 88.46),
		point(125.25, 88.08),
		point(125.50, 84.13),
		point(122.72, 84.42),
		point(119.22, 87.17),
		point(113.50, 83.25),
		point(110.56, 80.33),
		point(105.22, 79.96),
		point(102.34, 77.04),
		point(100.69, 78.54),
		point(98.09, 78.04),
		point(99.97, 75.92),
		point(95.53, 76.25),
		point(94.31, 78.00),
		point(91.00, 75.92),
		point(86.34, 77.46),
		point(87.31, 80.75),
		point(86.19, 83.83),
		point(89.47, 84.04),
		point(86.28, 86.33),
	]));

	addEntities(createBunny([
		point(60.94, 119.21),
		point(60.44, 116.92),
		point(57.34, 117.92),
		point(58.25, 114.08),
		point(57.41, 111.25),
		point(55.63, 109.79),
		point(53.94, 104.42),
		point(51.97, 105.04),
		point(53.31, 101.04),
		point(51.34, 96.96),
		point(49.16, 96.54),
		point(43.22, 97.79),
		point(43.47, 99.42),
		point(40.50, 99.17),
		point(41.00, 96.54),
		point(38.16, 98.25),
		point(33.91, 98.88),
		point(30.03, 101.04),
		point(29.25, 102.17),
		point(26.34, 102.71),
		point(24.63, 102.96),
		point(23.81, 106.83),
		point(21.50, 108.38),
		point(22.63, 110.17),
		point(20.72, 111.79),
		point(23.06, 113.33),
		point(24.44, 117.58),
		point(25.19, 120.79),
		point(28.19, 121.92),
		point(26.88, 123.79),
		point(32.19, 126.29),
		point(31.97, 128.25),
		point(34.28, 130.54),
		point(35.91, 130.00),
		point(38.59, 129.88),
		point(37.25, 125.92),
		point(40.75, 123.96),
		point(42.25, 128.00),
		point(45.91, 129.33),
		point(46.59, 132.08),
		point(48.53, 129.29),
		point(52.03, 126.50),
		point(47.31, 122.00),
		point(50.09, 118.42),
		point(52.94, 119.54),
		point(55.59, 119.38),
	]));

	addEntities(createBunny([
		point(65.28, 127.13),
		point(62.63, 129.54),
		point(67.25, 130.13),
		point(64.53, 130.38),
		point(62.81, 133.17),
		point(67.31, 133.25),
		point(69.09, 134.88),
		point(64.97, 136.25),
		point(67.03, 139.29),
		point(64.94, 141.13),
		point(64.66, 143.71),
		point(66.75, 144.08),
		point(67.56, 141.71),
		point(69.50, 142.04),
		point(68.16, 144.79),
		point(66.25, 147.50),
		point(64.25, 146.58),
		point(62.41, 148.42),
		point(59.22, 150.04),
		point(59.88, 151.33),
		point(58.94, 153.00),
		point(57.66, 151.92),
		point(55.47, 149.42),
		point(55.91, 147.79),
		point(53.06, 147.25),
		point(50.38, 144.21),
		point(47.00, 145.54),
		point(44.06, 145.33),
		point(42.84, 143.79),
		point(43.78, 142.50),
		point(42.38, 140.29),
		point(44.84, 138.46),
		point(45.84, 133.29),
		point(48.72, 132.13),
		point(50.16, 128.92),
		point(52.63, 129.42),
		point(54.78, 127.42),
		point(56.31, 129.00),
		point(56.22, 130.42),
		point(59.56, 130.38),
	]));

	addEntities(createBunny([
		point(62.75, 128.29),
		point(62.50, 130.54),
		point(66.16, 128.46),
		point(67.94, 129.42),
		point(67.47, 133.38),
		point(63.84, 132.25),
		point(65.50, 130.67),
		point(67.78, 136.50),
		point(66.28, 139.96),
		point(64.69, 141.96),
		point(65.88, 146.08),
		point(68.63, 143.75),
		point(65.88, 143.08),
		point(68.34, 141.58),
		point(68.00, 140.38),
		point(67.41, 144.13),
		point(67.22, 139.92),
		point(67.41, 134.38),
	]));

	addEntities(createBunny([
		point(66.56, 130.17),
		point(67.41, 128.33),
		point(66.25, 127.21),
		point(64.41, 128.00),
		point(62.97, 128.46),
		point(63.53, 130.92),
		point(62.16, 131.96),
		point(64.66, 133.42),
		point(67.34, 134.13),
		point(68.25, 134.83),
		point(64.47, 137.50),
		point(65.09, 139.58),
		point(64.59, 142.83),
		point(66.56, 144.63),
		point(67.75, 141.71),
		point(69.63, 142.79),
		point(68.34, 144.83),
		point(63.63, 146.50),
		point(62.03, 148.67),
		point(58.63, 149.83),
		point(58.78, 152.63),
		point(60.06, 150.38),
		point(62.19, 146.71),
		point(65.66, 146.75),
		point(69.34, 144.58),
		point(71.59, 143.54),
		point(72.19, 141.54),
		point(68.09, 141.21),
		point(66.75, 138.88),
		point(67.09, 135.96),
		point(63.63, 133.46),
	]));

	addEntities(createBunny([
		point(77.28, 149.21),
		point(77.44, 150.83),
		point(79.34, 151.38),
		point(77.00, 153.88),
		point(82.84, 153.00),
		point(83.47, 155.21),
		point(86.59, 154.17),
		point(85.94, 151.04),
		point(84.69, 149.54),
		point(85.44, 147.92),
		point(81.41, 149.38),
	]));

	addEntities(createBunny([
		point(77.59, 149.08),
		point(78.03, 152.38),
		point(76.63, 152.13),
		point(76.81, 154.54),
		point(79.34, 153.75),
		point(81.22, 154.71),
		point(83.19, 154.54),
		point(84.56, 152.42),
		point(81.09, 151.25),
		point(81.94, 149.46),
		point(80.09, 149.46),
		point(84.00, 153.17),
		point(85.91, 149.29),
		point(86.34, 153.42),
	]));

	addEntities(createBunny([
		point(86.09, 148.13),
		point(84.44, 149.13),
		point(86.25, 152.13),
		point(86.78, 150.29),
		point(84.63, 151.46),
		point(86.00, 153.79),
		point(84.03, 154.88),
		point(81.81, 152.25),
		point(82.19, 150.88),
		point(80.19, 149.42),
		point(78.09, 149.42),
		point(77.72, 152.25),
		point(80.28, 152.54),
		point(77.63, 154.33),
		point(79.22, 155.21),
		point(82.78, 153.58),
		point(83.75, 150.38),
		point(82.97, 149.04),
	]));

	addEntities(createBunny([
		point(86.09, 148.13),
		point(84.44, 149.13),
		point(86.25, 152.13),
		point(86.78, 150.29),
		point(84.63, 151.46),
		point(86.00, 153.79),
		point(84.03, 154.88),
		point(81.81, 152.25),
		point(82.19, 150.88),
		point(80.19, 149.42),
		point(78.09, 149.42),
		point(77.72, 152.25),
		point(80.28, 152.54),
		point(77.63, 154.33),
		point(79.22, 155.21),
		point(82.78, 153.58),
		point(83.75, 150.38),
		point(82.97, 149.04),
		point(9.09, 102.54),
		point(6.84, 104.00),
		point(8.75, 105.00),
		point(6.94, 106.58),
		point(8.59, 110.33),
		point(7.56, 112.79),
		point(6.00, 114.46),
		point(4.63, 113.46),
		point(2.34, 113.75),
		point(1.19, 116.25),
		point(2.50, 117.54),
		point(5.00, 115.92),
		point(6.16, 119.08),
		point(7.44, 123.25),
		point(6.53, 124.42),
		point(7.13, 128.13),
		point(6.00, 131.71),
		point(7.56, 136.38),
		point(10.88, 139.00),
		point(10.91, 140.54),
		point(12.69, 141.08),
		point(14.06, 141.92),
		point(16.09, 141.42),
		point(14.59, 140.08),
		point(14.78, 137.63),
		point(12.34, 137.79),
		point(10.38, 138.25),
		point(7.97, 136.75),
		point(6.69, 131.33),
		point(8.56, 127.42),
		point(7.25, 123.58),
		point(7.00, 119.13),
		point(4.34, 117.67),
		point(3.53, 114.75),
		point(4.75, 114.58),
		point(6.34, 115.63),
		point(7.19, 113.21),
		point(7.81, 108.46),
		point(9.22, 106.58),
		point(11.47, 104.83),
		point(11.63, 102.63),
		point(10.34, 103.17),
	]));

	addEntities(createBunny([
		point(21.72, 63.50),
		point(23.09, 65.46),
		point(24.53, 63.54),
		point(25.59, 65.13),
		point(25.28, 66.71),
		point(27.69, 67.92),
		point(30.22, 67.58),
		point(32.94, 67.79),
		point(36.38, 68.92),
		point(37.16, 67.83),
		point(35.88, 65.79),
		point(38.34, 65.25),
		point(39.50, 67.38),
		point(40.19, 64.96),
		point(39.34, 62.88),
		point(37.28, 64.04),
		point(34.44, 62.67),
		point(32.44, 61.17),
		point(32.53, 59.63),
		point(29.41, 58.88),
		point(29.22, 61.79),
		point(26.50, 61.83),
		point(24.53, 61.58),
		point(22.88, 61.50),
		point(23.00, 63.38),
		point(25.78, 62.88),
	]));

	addEntities(createBunny([
		point(21.38, 28.04),
		point(19.81, 26.08),
		point(21.22, 23.75),
		point(23.19, 25.29),
		point(25.09, 22.92),
		point(25.81, 25.79),
		point(26.56, 22.83),
		point(28.31, 19.92),
		point(29.41, 16.79),
		point(31.00, 15.25),
		point(32.41, 16.83),
		point(32.72, 18.38),
		point(34.63, 16.67),
		point(33.53, 15.50),
		point(38.81, 13.92),
		point(41.16, 14.88),
		point(43.09, 13.96),
		point(46.19, 12.46),
		point(45.22, 7.96),
		point(46.31, 5.96),
		point(45.34, 5.08),
		point(47.00, 4.50),
		point(47.41, 5.58),
		point(55.22, 4.75),
		point(56.09, 7.83),
		point(57.91, 8.00),
		point(60.94, 7.58),
		point(62.13, 6.50),
		point(63.09, 7.38),
		point(64.34, 6.42),
		point(65.09, 6.96),
		point(67.06, 11.17),
		point(65.78, 12.29),
		point(67.66, 13.33),
		point(70.09, 12.71),
		point(71.13, 14.67),
		point(70.22, 16.04),
		point(73.09, 16.75),
		point(74.78, 14.00),
		point(74.47, 17.83),
		point(73.19, 21.04),
		point(74.38, 21.50),
		point(77.09, 20.13),
		point(77.72, 19.17),
		point(79.22, 20.88),
		point(80.19, 22.88),
		point(81.84, 22.71),
		point(82.47, 21.67),
		point(82.50, 20.08),
		point(81.47, 19.25),
		point(81.00, 17.58),
		point(82.47, 16.08),
		point(80.63, 15.42),
		point(78.59, 15.88),
		point(78.50, 14.38),
		point(79.78, 13.00),
		point(81.81, 12.54),
		point(83.19, 12.29),
		point(84.22, 10.38),
		point(87.00, 10.83),
		point(87.91, 10.08),
		point(89.41, 11.38),
		point(90.38, 8.83),
		point(91.91, 6.96),
		point(97.44, 8.38),
		point(99.56, 9.46),
		point(98.50, 10.83),
		point(97.28, 10.46),
		point(97.72, 7.42),
		point(95.28, 7.83),
		point(95.06, 11.75),
		point(94.84, 16.21),
		point(96.50, 17.17),
		point(98.66, 17.71),
		point(99.00, 19.54),
		point(97.06, 20.92),
		point(95.50, 20.63),
		point(90.22, 21.67),
		point(89.28, 24.21),
		point(89.22, 26.50),
		point(88.66, 26.50),
		point(88.38, 28.63),
		point(85.84, 28.46),
		point(85.31, 30.67),
		point(83.59, 31.71),
		point(81.63, 31.25),
		point(79.53, 31.88),
		point(73.91, 31.63),
		point(71.19, 31.08),
		point(69.97, 32.08),
		point(66.94, 31.63),
		point(65.47, 34.58),
		point(62.72, 36.08),
		point(60.00, 34.92),
		point(57.09, 32.92),
		point(52.00, 32.50),
		point(52.59, 36.88),
		point(50.75, 39.54),
		point(48.63, 39.33),
		point(48.72, 41.38),
		point(47.03, 40.46),
		point(43.28, 41.63),
		point(40.88, 44.96),
		point(35.88, 44.00),
		point(32.72, 46.67),
		point(32.13, 50.00),
		point(33.47, 52.88),
		point(32.91, 54.71),
		point(30.38, 55.67),
		point(28.06, 54.71),
		point(25.66, 53.38),
		point(24.03, 54.21),
		point(22.78, 53.50),
		point(21.19, 56.54),
		point(18.25, 56.83),
		point(15.22, 57.00),
		point(13.69, 55.83),
		point(14.88, 55.08),
		point(16.47, 55.33),
		point(18.31, 53.42),
		point(19.25, 51.54),
		point(19.38, 49.29),
		point(21.84, 44.83),
		point(22.34, 43.04),
		point(24.00, 43.04),
		point(25.31, 44.71),
		point(25.03, 45.83),
		point(26.38, 46.88),
		point(27.28, 45.67),
		point(26.94, 43.83),
		point(26.88, 41.58),
		point(28.31, 39.96),
		point(27.81, 37.63),
		point(25.72, 35.71),
		point(24.16, 35.54),
		point(22.50, 30.58),
		point(23.81, 29.88),
		point(24.13, 27.54),
	]));

	addEntities(createBunny([
		point(133.75, 6.38),
		point(131.81, 5.29),
		point(128.88, 5.42),
		point(128.69, 7.00),
		point(131.72, 8.96),
		point(133.38, 8.13),
		point(133.09, 10.63),
		point(129.16, 9.33),
		point(128.84, 8.25),
		point(125.84, 9.96),
		point(124.91, 8.96),
		point(122.41, 10.83),
		point(119.44, 10.46),
		point(117.00, 10.25),
		point(115.16, 10.67),
		point(114.88, 11.58),
		point(113.97, 13.88),
		point(114.66, 15.33),
		point(114.34, 16.33),
		point(115.09, 17.75),
		point(115.41, 19.83),
		point(115.47, 24.79),
		point(116.84, 25.92),
		point(117.34, 28.17),
		point(120.56, 29.50),
		point(122.09, 30.50),
		point(121.28, 32.08),
		point(123.25, 29.92),
		point(126.31, 29.46),
		point(128.69, 33.00),
		point(131.22, 32.67),
		point(132.50, 31.25),
		point(134.47, 32.13),
		point(135.31, 29.88),
		point(136.41, 29.75),
		point(136.25, 28.25),
		point(134.59, 27.75),
		point(135.84, 25.38),
		point(136.22, 23.29),
		point(137.22, 23.25),
		point(137.78, 20.25),
		point(138.69, 19.29),
		point(137.34, 17.00),
		point(137.31, 14.21),
		point(134.41, 13.25),
		point(131.91, 11.83),
		point(132.34, 9.88),
	]));

	if (true) {
		const toLake = { icon: SignIcon.Lake, name: 'Lake' };
		const toHarbor = { icon: SignIcon.Boat, name: 'Harbor' };
		const toSpawn = { icon: SignIcon.Spawn, name: 'Spawn' };
		const toTownCenter = { icon: SignIcon.TownCenter, name: 'Town Center' };
		const toPineForest = { icon: SignIcon.PineForest, name: 'Pine Forest' };
		const toPartyIsland = { icon: SignIcon.Boat, name: 'Party Island' };
		const toGiftPile = { icon: SignIcon.GiftPile, name: 'Gift Pile' };
		const toMountains = { icon: SignIcon.Mountains, name: 'Mountains' };
		const toForest = { icon: SignIcon.Forest, name: 'Forest' };
		const toPumpkinFarm = { icon: SignIcon.Pumpkins, name: 'Pumpkin Farm' };
		const toFlowerField = { icon: SignIcon.Fields, name: 'Flower Field' };
		const toBarrelStorage = { icon: SignIcon.Barrels, name: 'Barrel Storage' };
		const toMines = { icon: SignIcon.Mines, name: 'Mines' };
		const toBridge = { icon: SignIcon.Bridge, name: 'Bridge' };
		const toCarrots = { icon: SignIcon.Carrots, name: 'Carrot farm' };

		addEntities(createDirectionSign(77, 72, {
			w: [toSpawn, toGiftPile, toHarbor, toPineForest, undefined],
			e: [toLake, toCarrots, toMines, toBarrelStorage],
			s: [toForest, toPumpkinFarm],
		}));

		addEntities(createDirectionSign(54.33, 70.58, {
			r: 1,
			n: [toSpawn, toMines],
			w: [toPineForest, toHarbor, toMountains],
			e: [toTownCenter, toLake],
		}));

		addEntities(createDirectionSign(36.00, 75.98, {
			w: [toHarbor, toMountains],
			e: [toSpawn, toTownCenter, toMines, toLake],
			s: [toPineForest],
		}));

		addEntities(createDirectionSign(19.34, 71.00, {
			n: [toMountains],
			w: [undefined, toPartyIsland],
			e: [toSpawn, toTownCenter, toPineForest],
		}));

		addEntities(createDirectionSign(24.86, 9.98, {
			r: 1,
			e: [toBridge, toMines, toLake],
			s: [toHarbor, toPineForest],
		}));

		addEntities(createDirectionSign(58.66, 54.88, {
			w: [toGiftPile],
		}));

		addEntities(createDirectionSign(54.38, 39.29, {
			r: 1,
			n: [toSpawn],
			e: [toMines, toBridge, toLake],
			s: [toTownCenter, toHarbor],
		}));

		addEntities(createDirectionSign(99.00, 40.15, {
			n: [toMountains, toBarrelStorage],
			w: [toSpawn, toMines, toHarbor],
			e: [toBridge, toCarrots],
			s: [toLake, toTownCenter, toForest],
		}));

		addEntities(createDirectionSign(122.75, 37.00, {
			r: 1,
			w: [toTownCenter, toSpawn, toMines],
			n: [toCarrots],
		}));

		addEntities(createDirectionSign(103.75, 70.10, {
			r: 1,
			n: [toBridge, toMountains, toCarrots],
			w: [toTownCenter, toHarbor],
			e: [toLake, toForest],
		}));

		addEntities(createDirectionSign(128.16, 102.13, {
			w: [toSpawn, toTownCenter, toHarbor],
			e: [toLake],
			s: [toFlowerField],
		}));

		addEntities(createDirectionSign(129.53, 140.75, {
			w: [toPumpkinFarm, toPineForest, toHarbor],
			e: [toFlowerField],
			n: [toForest, toLake, toTownCenter],
		}));

		addEntities(createDirectionSign(70.98, 135.85, {
			r: 1,
			n: [toSpawn, toTownCenter, toHarbor, toMines],
			w: [undefined, toPineForest],
			e: [toForest, undefined, toFlowerField],
		}));

		addEntities(createDirectionSign(54.91, 7.92, {
			w: [toHarbor, toPineForest],
			e: [toBridge, toMines, toLake],
		}));

		addEntities(createDirectionSign(90.17, 5.35, {
			w: [toHarbor, toPineForest],
			s: [toBridge, toMines, toLake],
		}));

		addEntities(createDirectionSign(78.41, 96.46, {
			w: [toTownCenter, toHarbor],
			e: [toForest, toLake],
			s: [toPumpkinFarm, toPineForest],
		}));

		addEntities(createDirectionSign(95.84, 25.33, {
			e: [toBarrelStorage],
		}));

		addEntities(createDirectionSign(77.15, 39.20, {
			n: [toMines],
			w: [undefined, toSpawn],
			e: [toBridge, toCarrots, toLake],
		}));

		addEntities(createDirectionSign(106.80, 95.46, {
			r: 1,
			w: [toTownCenter, toPumpkinFarm, toHarbor],
			n: [toLake, toMines, toCarrots],
			e: [undefined, toFlowerField],
		}));

		addEntities(createDirectionSign(17.67, 138.90, {
			n: [toHarbor, toMountains, toTownCenter],
		}));
	}

	const apples = [entities.apple, entities.apple2, entities.apple, entities.apple2, entities.appleGreen, entities.appleGreen2];
	const otherFruits = [entities.orange, entities.orange2, entities.pear, entities.banana];

	const ctrls = map.controllers;

	ctrls.push(new ctrl.UpdateController(map));
	ctrls.push(new ctrl.TorchController(world, map));
	ctrls.push(new ctrl.CloudController(world, map, 5));
	ctrls.push(new ctrl.CollectableController(world, map, apples, 8, pickEntity, checkNotCollecting));
	ctrls.push(new ctrl.CollectableController(world, map, otherFruits, 3, pickEntity, checkNotCollecting));

	ctrls.push(new ctrl.CollectableController(
		world, map, [entities.gift1, entities.gift2], 50, pickGift, undefined, undefined, undefined,
		() => world.holiday === Holiday.Christmas));

	ctrls.push(new ctrl.CollectableController(
		world, map, [entities.candy], 60, pickCandy, checkLantern, undefined, undefined,
		() => world.holiday === Holiday.Halloween));

	ctrls.push(new ctrl.CollectableController(
		world, map, entities.eggs, 200, pickEgg, checkBasket, 5, undefined,
		() => world.holiday === Holiday.Easter));

	ctrls.push(new ctrl.CollectableController(
		world, map, [entities.fourLeafClover], 2, pickClover, checkNotCollecting, 1, positionClover,
		() => world.season === Season.Spring || world.season === Season.Summer));

	ctrls.push(new ctrl.PlantController(world, map, {
		area: rect(116.2, 14.2, 7.8, 9.6),
		count: 100,
		stages: [
			[entities.carrot4],
			[entities.carrot3],
			[entities.carrot2, entities.carrot2b],
			[entities.carrot1, entities.carrot1b],
		],
		growOnlyOn: TileType.Dirt,
		onPick: (_, client) => holdItem(client.pony, entities.carrotHeld.type),
		isActive: () => world.season !== Season.Winter,
	}));

	if (!DEVELOPMENT) {
		ctrls.push(new ctrl.FlyingCritterController(
			world, map, entities.bat, 2, 20, () => isNightTime(world.time)));
		ctrls.push(new ctrl.FlyingCritterController(
			world, map, entities.firefly, 1, 40, () => world.season !== Season.Winter && isNightTime(world.time)));
		ctrls.push(new ctrl.FlyingCritterController(
			world, map, entities.butterfly, 1.5, 40, () => world.season !== Season.Winter && isDayTime(world.time)));
	}

	if (BETA) {
		ctrls.push(new ctrl.WallController(world, map, entities.woodenWalls));
	}

	return map;
}
