import * as fs from 'fs';
import { pathTo } from '../paths';
import { ServerMap, MapUsage, ServerEntity } from '../serverInterfaces';
import { World, goToMap } from '../world';
import { addSpawnPointIndicators } from '../mapUtils';
import { createServerMap, deserializeMap } from '../serverMap';
import { TileType, MapType } from '../../common/interfaces';
import { rect } from '../../common/rect';
import { TorchController, FlyingCritterController } from '../controllers';
import * as entities from '../../common/entities';
import { WallController } from '../controllers/wallController';
import { createBoxOfLanterns, give } from '../controllerUtils';
import { holdItem } from '../playerUtils';

const mapData = JSON.parse(fs.readFileSync(pathTo('src', 'maps', 'cave.json'), 'utf8'));

export function createCaveMap(world: World): ServerMap {
	const map = createServerMap('cave', MapType.Cave, 7, 7, TileType.None, MapUsage.Public);

	map.spawnArea = rect(27, 52, 1, 2);
	map.tilesLocked = true;

	deserializeMap(map, mapData);

	// for (let y = 0; y < map.height; y++) {
	// 	for (let x = 0; x < map.width; x++) {
	// 		const tile = getTile(map, x, y);
	// 		if (tile === TileType.Dirt) {
	// 			setTile(map, x, y, TileType.None);
	// 		} else if (tile === TileType.Grass) {
	// 			setTile(map, x, y, TileType.Dirt);
	// 		}
	// 	}
	// }

	const add = (entity: ServerEntity) => world.addEntity(entity, map);

	const caveDecals = [entities.caveDecal1, entities.caveDecal3, entities.caveDecal2];

	function cracksS(x: number, y: number) {
		const code = (Math.random() * 1000) % 64;
		const index1 = code & 0b11;
		const index2 = (code >> 2) & 0b11;
		const index3 = (code >> 4) & 0b11;
		index1 && index1 !== 3 && add(caveDecals[index1 - 1](x + 0.5, y - 1)); // no decal 2 here
		index2 && add(caveDecals[index2 - 1](x + 0.5, y));
		index3 && add(caveDecals[index3 - 1](x + 0.5, y + 1));
	}

	function cracksSLeft(x: number, y: number) {
		const code = (Math.random() * 1000) % 4;
		(code & 0b01) && add(entities.caveDecalL(x + 0.5, y - 1));
		(code & 0b10) && add(entities.caveDecalL(x + 0.5, y));
	}

	function cracksSRight(x: number, y: number) {
		const code = (Math.random() * 1000) % 4;
		(code & 0b01) && add(entities.caveDecalR(x + 0.5, y - 1));
		(code & 0b10) && add(entities.caveDecalR(x + 0.5, y));
	}

	function caveSW(x: number, y: number) {
		add(entities.caveSW(x + 0.5, y - 2));
		cracksSLeft(x, y);
	}

	function caveSE(x: number, y: number) {
		add(entities.caveSE(x + 0.5, y - 2));
		cracksSRight(x, y);
	}

	function caveS(x: number, y: number) {
		add(entities.caveS2(x + 0.5, y - 1));
		cracksS(x, y);
	}

	function caveSStart(x: number, y: number) {
		add(entities.caveS1(x + 0.5, y - 1));
		cracksS(x, y);
	}

	function caveSEnd(x: number, y: number) {
		add(entities.caveS3(x + 0.5, y - 1));
		cracksS(x, y);
	}

	function caveS1(x: number, y: number) {
		add(entities.caveSb(x + 0.5, y - 1));
		cracksS(x, y);
	}

	function caveN(x: number, y: number) {
		add(entities.caveTopN(x + 0.5, y));
	}

	function caveNE(x: number, y: number) {
		add(entities.caveTopNE(x + 0.5, y));
	}

	function caveNW(x: number, y: number) {
		add(entities.caveTopNW(x + 0.5, y));
	}

	function caveRightWithTrimNoEdge(x: number, y: number, h: number) {
		caveRight(x, y, h);
		caveTrimRight(x + 1, y, h, false);
	}

	function caveLeftWithTrimNoEdge(x: number, y: number, h: number) {
		caveLeft(x, y, h);
		caveTrimLeft(x, y, h, false);
	}

	function caveRightWithTrim(x: number, y: number, h: number) {
		caveRight(x, y - 3, h - 3);
		caveTrimRight(x + 1, y, h);
	}

	function caveLeftWithTrim(x: number, y: number, h: number) {
		caveLeft(x, y - 3, h - 3);
		caveTrimLeft(x, y, h);
	}

	function caveLeft(x: number, y: number, h: number) {
		for (let i = 0; i < h; i++) {
			add(entities.caveTopW(x + 0.5, y - i));
		}
	}

	function caveRight(x: number, y: number, h: number) {
		for (let i = 0; i < h; i++) {
			add(entities.caveTopE(x + 0.5, y - i));
		}
	}

	function caveTrimLeft(x: number, y: number, h: number, botTrim = true) {
		if (botTrim) {
			add(entities.caveBotTrimLeft(x - 0.5, y));
		} else {
			add(entities.caveMidTrimLeft(x - 0.5, y));
		}

		for (let i = 0; i < (h - 2); i++) {
			add(entities.caveMidTrimLeft(x - 0.5, y - 1 - i));
		}

		if (h > 1) {
			add(entities.caveTopTrimLeft(x - 0.5, y - h + 1));
		}
	}

	function caveTrimRight(x: number, y: number, h: number, botTrim = true) {
		if (botTrim) {
			add(entities.caveBotTrimRight(x + 0.5, y));
		} else {
			add(entities.caveMidTrimRight(x + 0.5, y));
		}

		for (let i = 0; i < (h - 2); i++) {
			add(entities.caveMidTrimRight(x + 0.5, y - 1 - i));
		}

		if (h > 1) {
			add(entities.caveTopTrimRight(x + 0.5, y - h + 1));
		}
	}

	function caveSSection(x: number, y: number, w: number) {
		caveSStart(x, y);

		for (let i = 1; i < (w - 1); i++) {
			caveS(x + i, y);
		}

		caveSEnd(x + w - 1, y);
	}

	function caveSESection(x: number, y: number, w: number) {
		for (let i = 0; i < w; i++) {
			caveSE(x + i, y - i);
		}
	}

	function caveSWSection(x: number, y: number, w: number) {
		for (let i = 0; i < w; i++) {
			caveSW(x + i, y + i);
		}
	}

	// large crypt
	caveS1(6, 1);
	caveRightWithTrim(5, 3, 4);
	caveSESection(4, 4, 2);
	caveRightWithTrimNoEdge(3, 8, 6);
	caveNE(4, 9);
	caveNE(5, 10);
	caveNE(6, 11);
	caveN(7, 12);
	caveNE(8, 12);
	caveNE(9, 13);
	caveRightWithTrim(9, 19, 6);
	caveSE(9, 19);
	caveSSection(7, 19, 2);
	caveSE(6, 20);
	caveRightWithTrim(5, 22, 4);
	caveSESection(4, 23, 2);
	caveRightWithTrimNoEdge(3, 27, 6);
	caveNE(4, 28);
	caveRightWithTrimNoEdge(4, 31, 3);
	caveNE(5, 32);
	caveN(6, 33);
	caveNW(7, 32);
	caveN(8, 32);
	caveN(9, 32);
	caveN(10, 32);
	caveNW(11, 31);
	caveNW(12, 30);
	caveLeftWithTrimNoEdge(13, 29, 2);
	caveNW(13, 27);
	caveNW(14, 26);
	caveLeftWithTrimNoEdge(15, 25, 1);
	caveNW(15, 24);
	caveN(16, 24);
	caveN(17, 24);
	caveNE(18, 24);
	caveNE(19, 25);
	caveN(20, 26);
	caveNE(21, 26);
	caveN(22, 27);
	caveNE(23, 27);
	caveNE(24, 28);
	caveNE(25, 29);
	caveNE(26, 30);
	caveRightWithTrimNoEdge(26, 31, 1);
	caveNE(27, 32);
	caveNE(28, 33);
	caveRightWithTrim(28, 38, 5);
	caveSE(28, 38);
	caveS1(27, 38);
	caveSW(26, 38);
	caveLeftWithTrim(26, 38, 4);
	caveSW(25, 36);
	caveSSection(23, 35, 2);
	caveSE(22, 36);
	caveRightWithTrimNoEdge(21, 37, 3);
	caveNE(22, 38);
	caveRightWithTrim(22, 41, 3);
	caveSE(22, 41);
	caveSW(21, 41);
	caveLeftWithTrim(21, 41, 4);
	caveSWSection(18, 37, 3);
	caveS1(17, 36);
	caveSE(16, 37);
	caveRightWithTrim(15, 39, 4);
	caveS1(15, 38);
	caveSWSection(13, 37, 2);
	caveS1(12, 36);
	caveSESection(10, 38, 2);
	caveRightWithTrimNoEdge(9, 39, 3);
	caveNE(10, 40);
	caveRightWithTrim(10, 44, 4);
	caveSE(10, 44);
	caveSSection(5, 44, 2);
	caveSE(7, 44);
	caveSW(8, 44);
	caveS1(9, 44);
	caveSE(4, 45);
	caveRightWithTrimNoEdge(3, 46, 3);
	caveNE(4, 47);
	caveN(5, 48);
	caveN(6, 48);
	caveN(7, 48);
	caveN(8, 48);
	caveN(9, 48);
	caveN(10, 48);
	caveNE(11, 48);
	caveN(12, 49);
	caveNE(13, 49);
	caveRightWithTrimNoEdge(13, 50, 1);
	caveNE(14, 51);
	caveN(15, 52);
	caveNW(16, 51);
	caveN(17, 51);
	caveNW(18, 50);
	caveNW(19, 49);
	caveNW(20, 48);
	caveLeftWithTrimNoEdge(21, 47, 2);
	caveNW(21, 45);
	caveN(22, 45);
	caveNE(23, 45);
	caveRightWithTrimNoEdge(23, 47, 2);
	caveNE(24, 48);
	caveRightWithTrimNoEdge(24, 49, 1);
	caveNE(25, 50);
	caveRightWithTrimNoEdge(25, 55, 5);
	// entrance to caves
	caveLeftWithTrimNoEdge(29, 55, 4);
	caveNW(29, 51);
	caveNW(30, 50);
	caveN(31, 50);
	caveN(32, 50);
	caveNW(33, 49);
	caveLeftWithTrimNoEdge(34, 48, 1);
	caveNW(34, 47);
	caveLeftWithTrimNoEdge(35, 46, 3);
	caveNW(35, 43);
	caveN(36, 43);
	caveN(37, 43);
	caveNW(38, 42);
	caveN(39, 42);
	caveN(40, 42);
	caveN(41, 42);
	caveN(42, 42);
	caveNE(43, 42);
	caveN(44, 43);
	caveNE(45, 43);
	caveN(46, 44);
	caveNW(47, 43);
	caveN(48, 43);
	caveNW(49, 42);
	caveN(50, 42);
	caveNW(51, 41);
	caveNW(52, 40);
	caveLeftWithTrimNoEdge(53, 39, 1);
	caveNW(53, 38);
	caveLeftWithTrimNoEdge(54, 37, 4);
	caveSW(53, 35);
	caveLeftWithTrim(53, 35, 4);
	caveSW(52, 33);
	caveLeftWithTrim(52, 33, 5);
	caveSWSection(50, 29, 2);
	caveS1(49, 28);
	caveSW(48, 28);
	caveS1(47, 27);
	caveSESection(45, 29, 2);
	caveS1(44, 29);
	caveRightWithTrim(43, 31, 4);
	caveSESection(42, 32, 2);
	caveRightWithTrim(41, 35, 5);
	caveSE(41, 35);
	caveRightWithTrim(40, 37, 4);
	caveSE(40, 37);
	caveSSection(37, 37, 3);
	caveSE(36, 38);
	caveSSection(33, 38, 3);
	caveSW(32, 38);
	caveLeftWithTrim(32, 38, 4);
	caveNW(32, 34);
	// small crypt

	// large crypt
	caveLeftWithTrim(13, 18, 4);
	caveSW(13, 18);
	caveLeftWithTrim(14, 20, 4);
	caveSW(14, 20);
	caveSESection(15, 20, 2);
	caveS1(17, 18);
	caveSW(18, 19);
	caveS1(19, 19);
	caveSW(20, 20);
	caveSSection(21, 20, 2);
	caveSESection(23, 20, 3);
	caveRightWithTrim(25, 18, 4);
	caveSE(26, 16);
	caveRightWithTrim(26, 16, 4);
	caveNE(26, 12);
	caveRightWithTrimNoEdge(25, 11, 2);
	caveNE(25, 9);
	caveRightWithTrimNoEdge(24, 8, 4);
	caveSE(25, 6);
	caveRightWithTrim(25, 6, 4);
	caveSESection(26, 4, 2);
	caveS1(28, 2);
	caveSE(29, 2);
	caveSSection(30, 1, 4);
	caveSW(34, 2);
	caveS1(35, 2);
	caveSW(36, 3);
	caveLeftWithTrim(37, 5, 4);
	caveSW(37, 5);
	caveLeftWithTrim(38, 7, 4);
	caveSWSection(38, 7, 3);
	caveS1(41, 9);
	caveSESection(42, 9, 2);
	caveS1(44, 7);
	caveSE(45, 7);
	caveSSection(46, 6, 2);
	caveSW(48, 7);
	caveS1(49, 7);
	caveSW(50, 8);
	caveS1(51, 8);
	caveSW(52, 9);
	caveLeftWithTrim(53, 11, 4);
	caveSW(53, 11);
	caveLeftWithTrimNoEdge(54, 15, 6);
	caveNW(53, 16);
	caveLeftWithTrimNoEdge(53, 18, 2);
	caveNW(52, 19);
	caveNW(51, 20);
	caveNW(50, 21);
	caveN(49, 22);
	caveNW(48, 22);
	caveN(47, 23);
	caveNE(46, 22);
	caveN(45, 22);
	caveNE(44, 21);
	caveNE(43, 20);
	caveRightWithTrimNoEdge(42, 19, 1);
	caveNE(42, 18);
	caveN(41, 18);
	caveN(40, 18);
	caveNE(39, 17);
	caveRightWithTrimNoEdge(38, 16, 1);
	caveNE(38, 15);
	caveN(37, 15);
	caveNE(36, 14);
	caveN(35, 14);
	caveNW(34, 14);
	caveNW(33, 15);
	caveN(32, 16);
	caveNW(31, 16);
	caveN(30, 17);
	caveNW(29, 17);
	caveLeftWithTrimNoEdge(29, 19, 2);
	caveNW(28, 20);
	caveLeftWithTrimNoEdge(28, 21, 1);
	caveNW(27, 22);
	caveLeftWithTrim(27, 26, 4);
	caveSW(27, 26);
	caveS1(28, 26);
	caveLeftWithTrim(29, 28, 4);
	caveSWSection(29, 28, 2);
	caveSSection(31, 29, 2);
	// small crypt

	add(entities.caveFill(3, 9));
	add(entities.caveFill(4, 10));
	add(entities.caveFill(5, 11));
	add(entities.caveFill(6, 12));
	add(entities.caveFill(8, 13));
	add(entities.caveFill(3, 28));
	add(entities.caveFill(4, 32));
	add(entities.caveFill(5, 33));
	add(entities.caveFill(7, 33));
	add(entities.caveFill(11, 32));
	add(entities.caveFill(12, 31));
	add(entities.caveFill(13, 30));
	add(entities.caveFill(14, 27));
	add(entities.caveFill(15, 26));
	add(entities.caveFill(18, 25));
	add(entities.caveFill(19, 26));
	add(entities.caveFill(23, 28));
	add(entities.caveFill(24, 29));
	add(entities.caveFill(25, 30));
	add(entities.caveFill(26, 32));
	add(entities.caveFill(27, 33));
	add(entities.caveFill(9, 40));
	add(entities.caveFill(11, 49));
	add(entities.caveFill(13, 51));
	add(entities.caveFill(14, 52));
	add(entities.caveFill(16, 52));
	add(entities.caveFill(18, 51));
	add(entities.caveFill(19, 50));
	add(entities.caveFill(20, 49));
	add(entities.caveFill(21, 48));
	add(entities.caveFill(23, 48));
	add(entities.caveFill(24, 50));
	add(entities.caveFill(30, 51));
	add(entities.caveFill(33, 50));
	add(entities.caveFill(34, 49));
	add(entities.caveFill(35, 47));
	add(entities.caveFill(38, 43));
	add(entities.caveFill(43, 43));
	add(entities.caveFill(45, 44));
	add(entities.caveFill(47, 44));
	add(entities.caveFill(49, 43));
	add(entities.caveFill(51, 42));
	add(entities.caveFill(52, 41));
	add(entities.caveFill(53, 40));
	add(entities.caveFill(54, 38));
	add(entities.caveFill(33, 34));
	add(entities.caveFill(28, 22));
	add(entities.caveFill(31, 17));
	add(entities.caveFill(33, 16));
	add(entities.caveFill(36, 15));
	add(entities.caveFill(38, 17));
	add(entities.caveFill(39, 18));
	add(entities.caveFill(43, 21));
	add(entities.caveFill(44, 22));
	add(entities.caveFill(46, 23));
	add(entities.caveFill(48, 23));
	add(entities.caveFill(50, 22));
	add(entities.caveFill(51, 21));
	add(entities.caveFill(52, 20));
	add(entities.caveFill(53, 19));
	add(entities.caveFill(54, 16));
	add(entities.caveFill(24, 9));
	add(entities.caveFill(25, 12));
	add(entities.caveFill(21, 27));

	add(entities.trigger3x1(27.5, 55)).trigger = (_, client) => goToMap(world, client, '', 'cave');

	add(entities.lanternOn(10.38, 18.38));
	add(entities.lanternOn(12.66, 18.38));
	add(entities.lanternOn(18.41, 12.00));
	add(entities.lanternOn(21.41, 12.13));
	add(entities.lanternOn(18.47, 14.21));
	add(entities.lanternOn(21.44, 14.33));
	add(entities.lanternOn(10.41, 11.54));
	add(entities.lanternOn(12.66, 11.50));
	add(entities.lanternOn(13.94, 4.67));
	add(entities.lanternOn(9.44, 4.67));
	add(entities.lanternOn(27.44, 31.54));
	add(entities.lanternOn(21.97, 26.50));
	add(entities.lanternOn(19.31, 21.79));
	add(entities.lanternOn(15.53, 24.17));
	add(entities.lanternOn(9.28, 25.63));
	add(entities.lanternOn(29.34, 17.29));
	add(entities.lanternOn(15.81, 40.42));
	add(entities.lanternOn(11.28, 43.50));
	add(entities.lanternOn(14.66, 48.75));
	add(entities.lanternOn(18.44, 48.33));
	add(entities.lanternOn(16.18, 45.04));
	add(entities.lanternOn(39.53, 41.91));
	add(entities.lanternOn(41.37, 37.41));
	add(entities.lanternOn(45.84, 34.13));
	add(entities.lanternOn(50.50, 38.17));
	add(entities.lanternOn(44.78, 41.12));
	add(entities.lanternOn(37.46, 27.12));
	add(entities.lanternOn(26.22, 51.79));
	add(entities.lanternOn(28.75, 51.75));
	add(entities.lanternOn(23.34, 42.08));
	add(entities.lanternOn(23.88, 45.33));
	add(entities.lanternOn(33.66, 40.20));
	add(entities.lanternOn(34.44, 45.17));
	add(entities.lanternOn(28.81, 44.25));
	add(entities.lanternOn(25.31, 20.50));
	add(entities.lanternOn(28.63, 28.38));
	add(entities.lanternOn(29.28, 36.92));
	add(entities.lanternOn(32.38, 31.38));
	add(entities.lanternOn(33.22, 22.83));
	add(entities.lanternOn(31.84, 49.83));
	add(entities.lanternOn(30.28, 48.91));
	add(entities.lanternOn(14.09, 8.63));
	add(entities.lanternOn(9.41, 8.54));

	add(entities.waterRock1(8.63, 27.92));
	add(entities.waterRock3(8.75, 28.08));
	add(entities.waterRock6(29.59, 8.79));
	add(entities.waterRock8(29.66, 9.00));
	add(entities.waterRock5(31.81, 6.83));
	add(entities.waterRock4(31.41, 6.58));
	add(entities.waterRock1(32.34, 9.79));
	add(entities.waterRock1(46.56, 13.50));
	add(entities.waterRock10(46.25, 13.71));
	add(entities.waterRock11(49.63, 16.63));
	add(entities.waterRock9(46.50, 11.46));
	add(entities.waterRock4(46.38, 11.63));

	add(entities.box(32.03, 49.13));

	add(createBoxOfLanterns(30.97, 49.63)).interact = (_, client) => {
		if (client.pony.options!.hold === entities.crystalHeld.type) {
			holdItem(client.pony, entities.crystalLantern.type);
		} else {
			holdItem(client.pony, entities.lanternOn.type);
		}
	};

	// top rooms
	add(createBoxOfLanterns(9.34, 11.46));
	add(entities.crate1A(17.78, 11.21));
	add(entities.crate1A(18.84, 11.29));
	add(entities.crate1A(7.69, 4.13));
	add(entities.crate1A(8.72, 4.13));
	add(entities.crate1A(10.00, 4.17));
	add(entities.crate1A(8.06, 5.33));
	add(entities.crate1BHigh(8.31, 4.17));
	add(entities.crate1BHigh(18.25, 11.30));
	add(entities.barrel(15.31, 3.79));
	add(entities.barrel(14.66, 4.54));
	add(entities.barrel(15.28, 5.08));
	add(entities.barrel(14.50, 3.75));
	add(entities.barrel(15.34, 6.08));
	add(entities.barrel(19.78, 10.75));
	add(entities.barrel(20.56, 11.25));

	function railsH(x: number, y: number, length: number) {
		for (let i = 0; i < length; i++) {
			add(entities.mineRailsH(x + i + 0.5, y));
		}
	}

	function railsV(x: number, y: number, length: number) {
		for (let i = 0; i < length; i++) {
			add(entities.mineRailsV(x + 0.5, y - i));
		}
	}

	railsV(30, 40, 8);
	add(entities.mineRailsSE(30.5, 32));
	railsH(31, 32, 5);
	add(entities.mineRailsEndRight(36.5, 32.5));

	railsH(5, 46, 13);
	add(entities.mineRailsNW(18.5, 46));
	railsV(18, 45, 1);
	add(entities.mineRailsNSE(18.5, 44));
	railsH(19, 44, 7);
	railsV(18, 43, 1);
	add(entities.mineRailsSW(18.5, 42));

	add(entities.mineCart(49, 40));
	add(entities.crystalsCartPile(49, 40)).interact = give(entities.crystalHeld.type);

	add(entities.mineCart(31.5, 46));
	add(entities.crystalsCartPile(31.5, 46)).interact = give(entities.crystalHeld.type);

	add(entities.mineRailsEndRight(50.5, 40.5));
	railsH(38, 40, 9);
	add(entities.mineRailsNWE(47.5, 40));
	railsH(48, 40, 2);
	add(entities.mineRailsSE(37.5, 40));
	add(entities.mineRailsNW(37.5, 41));
	railsH(27, 41, 3);
	add(entities.mineRailsNWE(30.5, 41));
	railsH(31, 41, 6);
	add(entities.mineRailsSE(26.5, 41));
	railsV(26, 43, 2);
	add(entities.mineRailsNSW(26.5, 44));
	railsV(26, 45, 1);
	add(entities.mineRailsNE(26.5, 46));
	railsH(28, 46, 5);
	add(entities.mineRailsEndRight(33.5, 46.5));
	railsH(14, 42, 4);
	add(entities.mineRailsEndLeft(13.5, 42.5));

	railsV(47, 39, 8);
	add(entities.mineRailsEndTop(47.5, 32));

	add(entities.mineRailsSWE(27.5, 46));
	railsV(27, 55, 9);

	add(entities.wallMap(23.97, 36.96));
	add(entities.table3(24.00, 37.2916));
	add(entities.lanternOnTable(24.375, 37.30));
	add(entities.lanternOn(22.50, 38.33));
	add(entities.sandPileSmall(25.50, 40.33));
	add(entities.table3(37.81, 39.41));

	add(entities.sandPileMedium(31.44, 42.67));
	add(entities.sandPileSmall(32.03, 43.54));
	add(entities.sandPileTiny(28.75, 45.33));
	add(entities.sandPileSmall(32.63, 47.50));
	add(entities.sandPileTiny(33.03, 47.96));
	add(entities.sandPileSmall(27.94, 45.25));
	add(entities.sandPileSmall(29.81, 48.00));
	add(entities.sandPileTiny(29.13, 48.38));
	add(entities.sandPileSmall(35.72, 42.46));
	add(entities.sandPileTiny(32.53, 42.42));
	add(entities.sandPileTinier(36.47, 42.71));
	add(entities.sandPileBig(50.00, 34.96));
	add(entities.sandPileMedium(49.16, 36.00));
	add(entities.sandPileSmall(44.13, 34.42));
	add(entities.sandPileMedium(17.88, 40.58));
	add(entities.sandPileSmall(18.69, 41.29));
	add(entities.sandPileSmall(15.63, 49.88));
	add(entities.sandPileTiny(16.31, 50.33));
	add(entities.sandPileTinier(17.63, 41.58));
	add(entities.sandPileSmall(7.19, 24.29));
	add(entities.sandPileTiny(6.69, 24.79));

	add(entities.sandPileMedium(6.19, 46.92));
	add(entities.sandPileTiny(5.03, 47.25));
	add(entities.rockB(5.13, 46.46));
	add(entities.rockB(7.31, 47.33));
	add(entities.rock2B(5.00, 47.13));
	add(entities.rock3B(5.72, 46.54));
	add(entities.rock3B(7.91, 47.04));
	add(entities.rock2B(8.03, 45.75));
	add(entities.rock2B(6.72, 47.54));
	add(entities.rock2B(32.03, 49.38));
	add(entities.rock2B(50.63, 39.71));
	add(entities.rock3B(41.59, 37.13));
	add(entities.rock3B(32.13, 31.25));
	add(entities.rock3B(22.34, 22.08));
	add(entities.rock2B(22.91, 22.29));
	add(entities.rock3B(35.63, 4.17));
	add(entities.rock2B(44.66, 9.29));
	add(entities.rockB(7.47, 21.33));
	add(entities.rock2B(7.81, 21.71));

	add(entities.caveCover(13.125, 11.625));
	add(entities.caveCover(14.125, 11.625));
	add(entities.caveCover(15.125, 11.625));
	add(entities.caveCover(13.125, 15.625));
	add(entities.caveCover(14.125, 15.625));
	add(entities.caveCover(15.125, 15.625));
	add(entities.caveCover(15.875, 15.625));
	add(entities.caveCover(16.875, 16.625));
	add(entities.caveCover(17.875, 16.625));
	add(entities.caveCover(18.875, 16.625));
	add(entities.caveCover(19.875, 16.625));
	add(entities.caveCover(20.875, 16.625));
	add(entities.caveCover(21.875, 16.625));
	add(entities.caveCover(22.875, 16.625));
	add(entities.caveCover(30.88, 27.625));
	add(entities.caveCover(31.88, 27.625));
	add(entities.caveCover(32.88, 27.625));
	add(entities.caveCover(38.125, 30.625));
	add(entities.caveCover(33.125, 34.625));
	add(entities.caveCover(34.03, 34.625));
	add(entities.caveCover(35.03, 34.625));
	add(entities.caveCover(36.03, 34.625));
	add(entities.caveCover(37.03, 34.625));
	add(entities.caveCover(38.03, 34.625));
	add(entities.caveCover(32.88, 35.17));

	add(entities.crystals1(48.50, 10.42));
	add(entities.crystals1(42.59, 17.17));
	add(entities.crystals2(47.44, 14.42));
	add(entities.crystals3(52.06, 16.25));
	add(entities.crystals4(48.69, 18.96));
	add(entities.crystals5(45.56, 10.21));
	add(entities.crystals6(51.53, 11.58));
	add(entities.crystals7(45.53, 16.50));
	add(entities.crystals9(51.56, 18.71));
	add(entities.crystals10(45.59, 20.67));
	add(entities.crystals10(43.59, 13.33));
	add(entities.crystals3(40.63, 13.46));
	add(entities.crystals9(38.80, 10.04));
	add(entities.crystals8(37.34, 13.58));
	add(entities.crystals8(49.91, 15.21));
	add(entities.crystals1(33.41, 10.46));
	add(entities.crystals1(32.66, 4.33));
	add(entities.crystals2(34.38, 8.71));
	add(entities.crystals3(33.44, 14.67));
	add(entities.crystals3(27.47, 6.38));
	add(entities.crystals4(28.63, 5.79));
	add(entities.crystals5(28.69, 9.46));
	add(entities.crystals5(37.38, 9.79));
	add(entities.crystals6(28.22, 10.96));
	add(entities.crystals7(31.56, 11.75));
	add(entities.crystals8(34.81, 6.21));
	add(entities.crystals9(26.22, 8.04));
	add(entities.crystals10(36.91, 8.21));
	add(entities.crystals2(28.68, 14.54));
	add(entities.crystals8(28.63, 18.79));
	add(entities.crystals7(26.34, 23.71));
	add(entities.crystals6(23.22, 23.29));
	add(entities.crystals5(16.43, 22.29));
	add(entities.crystals3(8.59, 30.33));
	add(entities.crystals5(6.59, 27.58));
	add(entities.crystals2(11.625, 28.42));
	add(entities.crystals8(7.31, 22.54));
	add(entities.crystals4(8.44, 23.17));
	add(entities.crystals6(7.31, 29.83));
	add(entities.crystals1(5.44, 25.38));
	add(entities.crystals3(5.31, 6.50));
	add(entities.crystals7(6.41, 10.42));

	add(entities.crystals5(49.56, 31.46));
	add(entities.crystals8(50.63, 33.33));
	add(entities.crystals1(47.19, 30.21));
	add(entities.crystals9(46.06, 32.21));
	add(entities.crystals8(17.28, 39.38));
	add(entities.crystals3(12.41, 39.33));
	add(entities.crystals6(11.31, 40.75));

	add(entities.waterCrystal1(31.34, 7.13));
	add(entities.waterCrystal2(31.03, 6.92));
	add(entities.waterCrysta3(31.00, 7.29));
	add(entities.waterCrysta3(32.34, 10.00));
	add(entities.waterCrystal2(46.06, 13.29));
	add(entities.waterCrysta3(49.44, 16.29));
	add(entities.waterCrysta3(46.72, 11.67));
	add(entities.waterCrysta3(41.75, 12.54));
	add(entities.waterCrystal1(8.47, 27.46));
	add(entities.waterCrysta3(10.47, 27.54));

	add(entities.stalactite3(17.06, 20.79));
	add(entities.stalactite3(22.25, 22.83));
	add(entities.stalactite2(21.81, 22.46));
	add(entities.stalactite1(17.41, 21.08));
	add(entities.stalactite1(28.31, 28.25));
	add(entities.stalactite2(13.69, 20.63));
	add(entities.stalactite3(6.56, 22.04));
	add(entities.stalactite3(7.38, 28.46));
	add(entities.stalactite1(7.66, 28.54));
	add(entities.stalactite2(6.28, 22.42));
	add(entities.stalactite2(9.69, 20.79));
	add(entities.stalactite1(10.06, 20.58));
	add(entities.stalactite2(12.25, 25.79));
	add(entities.stalactite1(11.91, 26.08));
	add(entities.stalactite3(11.88, 25.71));
	add(entities.stalactite2(31.25, 31.25));
	add(entities.stalactite3(22.72, 42.88));
	add(entities.stalactite1(23.06, 42.71));
	add(entities.stalactite3(10.59, 40.21));
	add(entities.stalactite2(12.19, 38.42));
	add(entities.stalactite1(12.63, 38.42));
	add(entities.stalactite3(47.25, 29.46));
	add(entities.stalactite2(44.34, 31.33));
	add(entities.stalactite1(47.69, 29.58));
	add(entities.stalactite1(51.75, 33.50));
	add(entities.stalactite2(26.31, 18.21));
	add(entities.stalactite3(28.22, 4.33));
	add(entities.stalactite3(37.69, 7.29));
	add(entities.stalactite2(39.44, 10.00));
	add(entities.stalactite2(28.75, 4.13));
	add(entities.stalactite1(27.47, 10.88));
	add(entities.stalactite1(37.28, 7.04));
	add(entities.stalactite3(49.88, 9.42));
	add(entities.stalactite3(50.63, 13.92));
	add(entities.stalactite3(42.84, 14.63));
	add(entities.stalactite3(50.78, 20.96));
	add(entities.stalactite3(44.09, 9.46));
	add(entities.stalactite2(43.16, 15.04));
	add(entities.stalactite2(49.44, 9.21));
	add(entities.stalactite2(46.00, 8.42));
	add(entities.stalactite2(51.47, 14.17));
	add(entities.stalactite1(51.06, 14.29));
	add(entities.stalactite1(42.59, 15.13));
	add(entities.stalactite1(44.31, 9.67));
	add(entities.stalactite1(51.78, 10.33));
	add(entities.stalactite1(50.44, 21.29));
	add(entities.stalactite1(47.41, 17.71));
	add(entities.stalactite2(47.06, 17.71));
	add(entities.stalactite1(28.66, 19.67));
	add(entities.stalactite3(4.34, 6.33));
	add(entities.stalactite2(4.56, 7.00));
	add(entities.stalactite1(5.56, 10.29));
	add(entities.stalactite3(35.38, 11.83));
	add(entities.stalactite2(35.28, 12.21));
	add(entities.stalactite1(34.94, 11.79));
	add(entities.stalactite3(15.03, 22.29));
	add(entities.stalactite1(14.63, 22.17));

	// storage room
	add(entities.table3(37.03, 23.71));
	add(entities.lanternOnTable(37.25, 23.75));
	add(entities.barrel(31.69, 24.71));
	add(entities.barrel(32.03, 25.50));
	add(entities.barrel(31.63, 26.17));
	add(entities.barrel(38.34, 25.75));
	add(entities.barrel(38.41, 27.04));
	add(entities.barrel(37.78, 26.38));
	add(entities.barrel(31.94, 26.96));
	add(entities.toolboxFull(34.28, 22.96)).interact = give(entities.pickaxe.type);
	add(entities.box(38.22, 29.96));
	add(entities.ropeRack(34.31, 22.20)).interact = give(entities.rope.type);
	add(entities.boxLanterns(35.63, 24.04)).interact = give(entities.lanternOn.type);
	add(entities.crate1A(38.19, 28.79));
	add(entities.crate1A(34.81, 28.58));
	add(entities.crate1A(34.72, 29.88));
	add(entities.crate2A(34.81, 30.67));

	add(entities.ropeRack(34.31, 39.91)).interact = give(entities.rope.type);
	add(entities.crate1A(34.22, 43.38));
	add(entities.crate1A(33.91, 44.50));

	function placeMineCart(x: number, y: number) {
		add(entities.mineCartBack(x + 0.22, y - 0.04));
		add(entities.mineCartFront(x + 0.22, y + 0.83));
	}

	placeMineCart(41, 40);
	placeMineCart(45, 40);
	placeMineCart(16, 42);
	placeMineCart(8, 46);
	placeMineCart(12, 46);
	placeMineCart(15, 46);
	placeMineCart(28, 41);

	map.controllers.push(new TorchController(world, map));
	map.controllers.push(new FlyingCritterController(world, map, entities.bat, 2, 10, () => true, true));

	const wallController = new WallController(world, map, entities.stoneWalls);
	map.controllers.push(wallController);
	wallController.top = 3;
	wallController.isTall = (x, y) => {
		if (y === 10 && x >= 17 && x <= 23)
			return true;

		if (x >= 31 && x <= 39 && y >= 22 && y <= 25)
			return true;

		if (y === 31 && x >= 33 && x <= 34)
			return true;

		return false;
	};

	if (wallController.toggleWall) {
		// large crypt
		for (let x = 7; x <= 15; x++) {
			wallController.toggleWall(x, 3, TileType.WallH);
		}

		for (let y = 3; y <= 10; y++) {
			wallController.toggleWall(16, y, TileType.WallV);
		}

		for (let x = 13; x <= 15; x++) {
			wallController.toggleWall(x, 11, TileType.WallH);
		}

		wallController.toggleWall(13, 11, TileType.WallV);

		for (let x = 13; x <= 16; x++) {
			wallController.toggleWall(x, 12, TileType.WallH);
		}

		wallController.toggleWall(17, 10, TileType.WallV);
		wallController.toggleWall(17, 11, TileType.WallV);

		for (let x = 17; x <= 22; x++) {
			wallController.toggleWall(x, 10, TileType.WallH);
		}

		for (let y = 10; y <= 15; y++) {
			wallController.toggleWall(23, y, TileType.WallV);
		}

		for (let x = 17; x <= 22; x++) {
			wallController.toggleWall(x, 16, TileType.WallH);
		}

		wallController.toggleWall(17, 15, TileType.WallV);

		for (let x = 13; x <= 16; x++) {
			wallController.toggleWall(x, 15, TileType.WallH);
		}

		// small crypt
		wallController.toggleWall(33, 31, TileType.WallH);
		wallController.toggleWall(34, 30, TileType.WallV);
		wallController.toggleWall(34, 29, TileType.WallV);
		wallController.toggleWall(34, 28, TileType.WallV);
		wallController.toggleWall(34, 27, TileType.WallV);
		wallController.toggleWall(33, 27, TileType.WallH);
		wallController.toggleWall(32, 27, TileType.WallH);
		wallController.toggleWall(31, 27, TileType.WallH);
		wallController.toggleWall(31, 26, TileType.WallV);
		wallController.toggleWall(31, 25, TileType.WallV);
		wallController.toggleWall(31, 24, TileType.WallV);
		wallController.toggleWall(31, 24, TileType.WallH);
		wallController.toggleWall(32, 23, TileType.WallV);
		wallController.toggleWall(32, 22, TileType.WallV);
		wallController.toggleWall(32, 22, TileType.WallH);
		wallController.toggleWall(33, 22, TileType.WallH);
		wallController.toggleWall(34, 22, TileType.WallH);
		wallController.toggleWall(35, 22, TileType.WallV);
		wallController.toggleWall(35, 23, TileType.WallH);
		wallController.toggleWall(36, 23, TileType.WallH);
		wallController.toggleWall(37, 23, TileType.WallH);
		wallController.toggleWall(38, 23, TileType.WallV);
		wallController.toggleWall(38, 24, TileType.WallV);
		wallController.toggleWall(38, 25, TileType.WallH);
		wallController.toggleWall(39, 25, TileType.WallV);
		wallController.toggleWall(39, 26, TileType.WallV);
		wallController.toggleWall(39, 27, TileType.WallV);
		wallController.toggleWall(39, 28, TileType.WallV);
		wallController.toggleWall(39, 29, TileType.WallV);
		wallController.toggleWall(38, 30, TileType.WallH);
		wallController.toggleWall(38, 30, TileType.WallV);
		wallController.toggleWall(38, 31, TileType.WallV);
		wallController.toggleWall(38, 32, TileType.WallV);
		wallController.toggleWall(38, 33, TileType.WallV);
		wallController.toggleWall(37, 34, TileType.WallH);
		wallController.toggleWall(36, 34, TileType.WallH);
		wallController.toggleWall(35, 34, TileType.WallH);
		wallController.toggleWall(34, 34, TileType.WallH);
		wallController.toggleWall(33, 34, TileType.WallH);
		wallController.toggleWall(33, 34, TileType.WallV);
	}

	if (DEVELOPMENT) {
		addSpawnPointIndicators(world, map);
	}

	return map;
}
