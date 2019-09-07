import {
	PaletteManager, Season, TileSets, Region, TileType, Camera, PaletteSpriteBatch, DrawOptions, WorldMap, IMap,
	Sprite, MapType
} from '../common/interfaces';
import * as sprites from '../generated/sprites';
import { getRegionTile, getRegionElevation } from '../common/region';
import { getRegionGlobal } from '../common/worldMap';
import { tileWidth, tileHeight, tileElevation, WATER_FPS, REGION_SIZE, WATER_HEIGHT } from '../common/constants';
import { clamp, toInt, at, invalidEnumReturn } from '../common/utils';
import { isAreaVisible } from '../common/camera';
import { WHITE } from '../common/colors';
import { releasePalette } from '../graphics/paletteManager';
import { drawPixelText } from '../graphics/graphicsUtils';
import { toScreenX, toScreenY, toWorldZ } from '../common/positionUtils';

const TILE_COUNTS = [[0, 4], [2, 3], [4, 3], [6, 3], [8, 3], [13, 3], [14, 3], [47, 4]];
export const TILE_COUNT_MAP: number[] = [];
export const TILE_MAP_MAP: number[] = [];

TILE_COUNTS.forEach(([tile, count]) => {
	while (TILE_COUNT_MAP.length < (tile + 1)) {
		TILE_COUNT_MAP.push(1);
	}

	TILE_COUNT_MAP[tile] = count;
});

let tileIndex = 0;

for (let i = 0; i <= 47; i++) {
	TILE_MAP_MAP.push(tileIndex);
	tileIndex += TILE_COUNT_MAP[i];
}

//   1 |  2 |   4
// ----+----+----
//   8 |    |  16
// ----+----+----
//  32 | 64 | 128
export const TILE_MAP = [
	46, 46, 22, 22, 46, 46, 22, 22, 21, 21, // 0-9
	17, 11, 21, 21, 17, 11, 19, 19, 18, 18, // 10-19
	19, 19, 12, 12, 14, 14, 24, 28, 14, 14, // 20-29
	30, 6, 46, 46, 22, 22, 46, 46, 22, 22, // 30-39
	21, 21, 17, 11, 21, 21, 17, 11, 19, 19, // 40-49
	18, 18, 19, 19, 12, 12, 14, 14, 24, 28, // 50-59
	14, 14, 30, 6, 20, 20, 13, 13, 20, 20, // 60-69
	13, 13, 16, 16, 23, 32, 16, 16, 23, 32, // 70-79
	15, 15, 25, 25, 15, 15, 34, 34, 26, 26, // 80-89
	45, 41, 26, 26, 42, 36, 20, 20, 13, 13, // 90-99
	20, 20, 13, 13, 10, 10, 31, 4, 10, 10, // 100-109
	31, 4, 15, 15, 25, 25, 15, 15, 34, 34, // 110-119
	27, 27, 43, 37, 27, 27, 35, 5, 46, 46, // 120-129
	22, 22, 46, 46, 22, 22, 21, 21, 17, 11, // 130-139
	21, 21, 17, 11, 19, 19, 18, 18, 19, 19, // 140-149
	12, 12, 14, 14, 24, 28, 14, 14, 30, 6, // 150-159
	46, 46, 22, 22, 46, 46, 22, 22, 21, 21, // 160-169
	17, 11, 21, 21, 17, 11, 19, 19, 18, 18, // 170-179
	19, 19, 12, 12, 14, 14, 24, 28, 14, 14, // 180-189
	30, 6, 20, 20, 13, 13, 20, 20, 13, 13, // 190-199
	16, 16, 23, 32, 16, 16, 23, 32, 9, 9, // 200-209
	33, 33, 9, 9, 8, 8, 29, 29, 44, 39, // 210-219
	29, 29, 38, 7, 20, 20, 13, 13, 20, 20, // 220-229
	13, 13, 10, 10, 31, 4, 10, 10, 31, 4, // 230-239
	9, 9, 33, 33, 9, 9, 8, 8, 2, 2, // 240-249
	40, 3, 2, 2, 1, 0 // 250-255
];

const enum TileTypeNumber {
	None = 0,
	Grass = 1,
	Water = 2,
	Wood = 3,
	GrassNew = 4,
	Water2 = 5,
	Water3 = 6,
	Water4 = 7,
	Ice = 8,
	SnowOnIce = 9,
	Stone = 10,
	Stone2 = 11,
	Boat = 12,
}

const waterFrames: number[] = [
	TileTypeNumber.Water, TileTypeNumber.Water2, TileTypeNumber.Water3, TileTypeNumber.Water4
];

export function updateTileSets(
	paletteManager: PaletteManager, tileSets: TileSets | undefined, season: Season, mapType: MapType
) {
	if (tileSets) {
		tileSets.forEach(t => releasePalette(t.palette));
	}

	return createTileSets(paletteManager, season, mapType);
}

export function createTileSets(paletteManager: PaletteManager, season: Season, mapType: MapType): TileSets {
	const isWinter = season === Season.Winter;
	const isAutumn = season === Season.Autumn;
	const isCave = mapType === MapType.Cave;

	const grassTiles = isCave ? sprites.caveTiles : (isWinter ? sprites.snowTiles : sprites.grassTiles);
	const grassPalette = grassTiles.palettes[isCave ? 0 : (isAutumn ? 1 : 0)];
	const icePaletteIndex = isWinter ? 2 : (isAutumn ? 1 : 0);
	const waterPaletteIndex = isCave ? 3 : (isWinter ? 2 : (isAutumn ? 1 : 0));
	const waterPalette = sprites.waterTiles1.palettes[waterPaletteIndex];

	// indexes equal to TileTypeNumber values
	return [
		{ // 0
			sprites: [sprites.tile_none.color],
			palette: paletteManager.addArray(sprites.tile_none.palettes![0]),
		},
		{ // 1
			sprites: grassTiles.sprites,
			palette: paletteManager.addArray(grassPalette),
		},
		{ // 2
			sprites: sprites.waterTiles1.sprites,
			palette: paletteManager.addArray(waterPalette),
		},
		{ // 3
			sprites: sprites.woodTiles.sprites,
			palette: paletteManager.addArray(sprites.woodTiles.palettes[0]),
		},
		{ // 4
			sprites: sprites.grassTilesNew.sprites,
			palette: paletteManager.addArray(sprites.grassTilesNew.palettes[0]),
		},
		// water frames
		{ // 5
			sprites: sprites.waterTiles2.sprites,
			palette: paletteManager.addArray(waterPalette),
		},
		{ // 6
			sprites: sprites.waterTiles3.sprites,
			palette: paletteManager.addArray(waterPalette),
		},
		{ // 7
			sprites: sprites.waterTiles4.sprites,
			palette: paletteManager.addArray(waterPalette),
		},
		// ice
		{ // 8
			sprites: sprites.iceTiles.sprites,
			palette: paletteManager.addArray(sprites.iceTiles.palettes[icePaletteIndex]),
		},
		// snow on ice
		{ // 9
			sprites: sprites.snowOnIceTiles.sprites,
			palette: paletteManager.addArray(sprites.snowOnIceTiles.palettes[0]),
		},
		// stone
		{ // 10
			sprites: sprites.stoneTiles.sprites,
			palette: paletteManager.addArray(sprites.stoneTiles.palettes[0]),
		},
		// stone 2
		{ // 11
			sprites: sprites.stone2Tiles.sprites,
			palette: paletteManager.addArray(sprites.stone2Tiles.palettes[0]),
		},
	];
}

export function drawTiles(
	batch: PaletteSpriteBatch, region: Region, camera: Camera, map: WorldMap, tileSets: TileSets, options: DrawOptions
) {
	const { tileIndices } = region;
	const { tileTime } = map;
	const regionX = region.x * REGION_SIZE;
	const regionY = region.y * REGION_SIZE;

	if (isAreaVisible(camera, regionX * tileWidth, regionY * tileHeight, REGION_SIZE * tileWidth, REGION_SIZE * tileHeight)) {
		const minX = clamp(Math.floor(camera.x / tileWidth - regionX), 0, REGION_SIZE);
		const minY = clamp(Math.floor(camera.actualY / tileHeight - regionY), 0, REGION_SIZE);
		const maxX = clamp(Math.ceil((camera.x + camera.w) / tileWidth - regionX), 0, REGION_SIZE);
		const maxY = clamp(Math.ceil((camera.actualY + camera.h) / tileHeight - regionY), 0, REGION_SIZE);

		for (let y = minY; y < maxY; y++) {
			for (let x = minX; x < maxX; x++) {
				const tileIndex = tileIndices[x | (y << 3)];

				if (tileIndex === -1) {
					options.error(`Uninitialized tile index at (${x}, ${y}) ` +
						`region: (${region.x}, ${region.y}, ${region.tilesDirty}, ${region.lastTileUpdate}) ` +
						`now: ${performance.now()}`);
					region.tilesDirty = true;
					continue;
				}

				const tileTypeNumber = tileIndex >>> 8;
				const isWater = tileTypeNumber === TileTypeNumber.Water || tileTypeNumber === TileTypeNumber.Boat;
				const tileSpriteIndex = tileIndex & 0xff;
				const tileSetIndex = isWater ? at(waterFrames, toInt(tileTime) % waterFrames.length)! : tileTypeNumber;
				const tileSet = tileSets[tileSetIndex];

				if (!tileSet) {
					options.error(`Missing tileset: position: (${x}, ${y}) tile: (${getRegionTile(region, x, y)}) ` +
						`info: (${tileIndex}, ${tileSetIndex}, ${tileTime}, ${tileSpriteIndex}, ${JSON.stringify(waterFrames)})`);
					tileIndices[x | (y << 3)] = -1;
					region.tilesDirty = true;
					continue;
				}

				const rx = (x + regionX) * tileWidth;
				const ry = (y + regionY) * tileHeight;

				if (DEVELOPMENT && !tileSet.sprites[tileSpriteIndex]) {
					console.error('Missing sprite', tileSetIndex, tileSpriteIndex);
				}

				batch.drawSprite(tileSet.sprites[tileSpriteIndex], WHITE, tileSet.palette, rx, ry);
			}
		}
	}
}

export function drawTilesDebugInfo(batch: PaletteSpriteBatch, region: Region, camera: Camera, options: DrawOptions) {
	const { tileIndices } = region;
	const regionX = region.x * REGION_SIZE;
	const regionY = region.y * REGION_SIZE;

	if (isAreaVisible(camera, regionX * tileWidth, regionY * tileHeight, REGION_SIZE * tileWidth, REGION_SIZE * tileHeight)) {
		const minX = clamp(Math.floor(camera.x / tileWidth - regionX), 0, REGION_SIZE);
		const minY = clamp(Math.floor(camera.actualY / tileHeight - regionY), 0, REGION_SIZE);
		const maxX = clamp(Math.ceil((camera.x + camera.w) / tileWidth - regionX), 0, REGION_SIZE);
		const maxY = clamp(Math.ceil((camera.actualY + camera.h) / tileHeight - regionY), 0, REGION_SIZE);

		for (let y = minY; y < maxY; y++) {
			for (let x = minX; x < maxX; x++) {
				const tileIndex = tileIndices[x | (y << 3)];

				if (tileIndex === -1) {
					continue;
				}

				const tileTypeNumber = tileIndex >>> 8;
				const tileSpriteIndex = tileIndex & 0xff;
				const rx = (x + regionX) * tileWidth;
				const ry = (y + regionY) * tileHeight;

				if (options.tileIndices) {
					drawPixelText(batch, rx + 2, ry + 2, 0x000000ff, `${tileTypeNumber}:${tileSpriteIndex}`);
					drawPixelText(batch, rx + 2, ry + 2 + 7, 0x555555ff, `${region.tiles[x + REGION_SIZE * y]}`);
				}

				if (options.tileGrid) {
					batch.drawRect(y !== 0 ? 0x00000011 : 0x00000022, rx, ry, tileWidth, 1);
					batch.drawRect(x !== 0 ? 0x00000011 : 0x00000022, rx, ry + 1, 1, tileHeight - 1);
				}
			}
		}
	}
}

export function drawTilesNew(
	batch: PaletteSpriteBatch, region: Region, camera: Camera, map: WorldMap, tileSets: TileSets, options: DrawOptions
) {
	const regionX = region.x * REGION_SIZE;
	const regionY = region.y * REGION_SIZE;
	const TILE_COLOR = 0x666666ff;
	const TILE_FRONT_COLOR = 0x5e5e5eff;
	const OUTLINE_2_COLOR = 0xffffff22;
	const OUTLINE_COLOR = 0x00000022;

	if (isAreaVisible(camera, regionX * tileWidth, regionY * tileHeight, REGION_SIZE * tileWidth, REGION_SIZE * tileHeight)) {
		const minX = clamp(Math.floor(camera.x / tileWidth - regionX), 0, REGION_SIZE);
		const minY = clamp(Math.floor(camera.y / tileHeight - regionY), 0, REGION_SIZE);
		const maxX = clamp(Math.ceil((camera.x + camera.w) / tileWidth - regionX), 0, REGION_SIZE);
		const maxY = clamp(Math.ceil((camera.y + camera.h) / tileHeight - regionY), 0, REGION_SIZE);

		for (let y = minY; y < maxY; y++) {
			for (let x = minX; x < maxX; x++) {
				const elevation = getRegionElevation(region, x, y);
				const cliffTop = getRegionElevation(region, x, y - 1) < elevation;
				const cliffLeft = getRegionElevation(region, x - 1, y) < elevation;
				const cliffRight = getRegionElevation(region, x + 1, y) < elevation;
				const cliffBottom = getRegionElevation(region, x, y + 1) < elevation;
				const elevDiff = Math.max(0, elevation - getRegionElevation(region, x, y + 1));
				const tx = (x + regionX) * tileWidth;
				const ty = (y + regionY) * tileHeight - elevation * tileElevation;

				batch.drawRect(TILE_COLOR, tx, ty, tileWidth, tileHeight);

				if (elevation) {
					batch.drawRect(TILE_FRONT_COLOR, tx, ty + tileHeight, tileWidth, elevDiff * tileElevation);

					if (cliffLeft) {
						batch.drawRect(OUTLINE_COLOR, tx, ty + tileHeight, 1, elevation * tileElevation);
					}

					if (cliffRight) {
						batch.drawRect(OUTLINE_COLOR, tx + tileWidth - 1, ty + tileHeight, 1, elevation * tileElevation);
					}

					if (cliffBottom) {
						batch.drawRect(OUTLINE_2_COLOR, tx, ty + tileHeight - 1, tileWidth, 1);
						batch.drawRect(OUTLINE_2_COLOR, tx, (ty + tileHeight + elevDiff * tileElevation) - 1, tileWidth, 1);
					}
				}

				if (cliffTop) {
					batch.drawRect(OUTLINE_2_COLOR, tx, ty, tileWidth, 1);
				}

				if (cliffLeft) {
					batch.drawRect(OUTLINE_2_COLOR, tx, ty, 1, tileHeight);
				}

				if (cliffRight) {
					batch.drawRect(OUTLINE_COLOR, tx + tileWidth - 1, ty, 1, tileHeight);
				}

				if (cliffBottom) {
					batch.drawRect(OUTLINE_COLOR, tx, ty + tileHeight - 1, tileWidth, 1);
				}

				if (options.gridLines) {
					batch.drawRect(OUTLINE_COLOR, tx + tileWidth - 1, ty, 1, tileHeight);
					batch.drawRect(OUTLINE_COLOR, tx, ty + tileHeight - 1, tileWidth - 1, 1);
					// drawPixelText(batch, tx + 1, ty + 1, OUTLINE_COLOR, elevation.toString(10));
				}

				const rx = x + regionX;
				const ry = y + regionY;

				const tileIndex = region.tileIndices[x | (y << 3)];
				// const tileTypeNumber = tileIndex >> 8;
				const tileOffset = tileIndex & 0xff;
				const grass = tileSets[3];
				const baseX = (region.x * REGION_SIZE) | 0;
				const baseY = (region.y * REGION_SIZE) | 0;

				if (getTileNormal(region.tiles, baseX, baseY, x, y, map, TileType.None) === TileType.Grass) {
					batch.drawSprite(grass.sprites[tileOffset], WHITE, grass.palette, rx * tileWidth, ry * tileHeight);
				}
			}
		}
	}
}

export function updateTileIndices(region: Region, map: IMap<Region | undefined>) {
	for (let y = 0, i = 0; y < REGION_SIZE; y++) {
		for (let x = 0; x < REGION_SIZE; x++ , i++) {
			if (region.tileIndices[i] === -1) {
				region.tileIndices[i] = getTileIndex(region, i, x, y, map);
			}
		}
	}

	region.tilesDirty = false;
	region.lastTileUpdate = performance.now();
}

function tileTypeNumber(type: TileType) {
	switch (type) {
		case TileType.Water:
		case TileType.WalkableWater:
			return TileTypeNumber.Water;
		case TileType.Wood:
			return TileTypeNumber.Wood;
		case TileType.Ice:
		case TileType.WalkableIce:
			return TileTypeNumber.Ice;
		case TileType.SnowOnIce:
			return TileTypeNumber.SnowOnIce;
		case TileType.Stone:
			return TileTypeNumber.Stone;
		case TileType.Stone2:
			return TileTypeNumber.Stone2;
		case TileType.Boat:
			return TileTypeNumber.Boat;
		case TileType.Grass:
		case TileType.Dirt:
		case TileType.ElevatedDirt:
			return TileTypeNumber.Grass;
		case TileType.None:
		case TileType.WallH:
		case TileType.WallV:
			return TileTypeNumber.None;
		default:
			return invalidEnumReturn(type, TileTypeNumber.None);
	}
}

function normalizeTile(type: TileType, base: TileType) {
	switch (type) {
		case TileType.SnowOnIce:
			return base === TileType.SnowOnIce ? type : TileType.Ice;
		case TileType.WalkableIce:
			return TileType.Ice;
		case TileType.WalkableWater:
		case TileType.Boat:
			return TileType.Water;
		case TileType.ElevatedDirt:
			return TileType.Dirt;
		default:
			return type;
	}
}

function normalizeTileBase(type: TileType) {
	switch (type) {
		case TileType.WalkableIce:
			return TileType.Ice;
		case TileType.WalkableWater:
		case TileType.Boat:
			return TileType.Water;
		case TileType.ElevatedDirt:
			return TileType.Dirt;
		default:
			return type;
	}
}

function getTileNormal(
	tiles: Uint8Array, baseX: number, baseY: number, x: number, y: number, map: IMap<Region | undefined>, base: TileType
) {
	if (x >= 0 && y >= 0 && x < REGION_SIZE && y < REGION_SIZE) {
		return normalizeTile(tiles[x | (y << 3)], base);
	} else {
		const mapX = clamp(x + baseX, 0, map.width - 1);
		const mapY = clamp(y + baseY, 0, map.height - 1);
		const region = getRegionGlobal(map, mapX, mapY);

		if (region !== undefined) {
			const regionX = mapX - region.x * REGION_SIZE;
			const regionY = mapY - region.y * REGION_SIZE;
			return normalizeTile(region.tiles[regionX | (regionY << 3)], base);
		} else {
			return TileType.None;
		}
	}
}

function getTileIndex(region: Region, index: number, x: number, y: number, map: IMap<Region | undefined>): number {
	const tiles = region.tiles;
	const type = tiles[x | (y << 3)] as TileType;
	const tileType = tileTypeNumber(type);
	let baseTileIndex = 0;

	if (type === TileType.Dirt || type === TileType.ElevatedDirt) {
		baseTileIndex = 47;
	} else if (type !== TileType.None) {
		let topLeft = 0, top = 0, topRight = 0, left = 0, right = 0, bottomLeft = 0, bottom = 0, bottomRight = 0;

		if (x > 1 && y > 1 && x < (REGION_SIZE - 1) && y < (REGION_SIZE - 1)) {
			topLeft = normalizeTile(tiles[(x - 1) | (y - 1) << 3], type);
			top = normalizeTile(tiles[(x) | (y - 1) << 3], type);
			topRight = normalizeTile(tiles[(x + 1) | (y - 1) << 3], type);
			left = normalizeTile(tiles[(x - 1) | (y) << 3], type);
			right = normalizeTile(tiles[(x + 1) | (y) << 3], type);
			bottomLeft = normalizeTile(tiles[(x - 1) | (y + 1) << 3], type);
			bottom = normalizeTile(tiles[(x) | (y + 1) << 3], type);
			bottomRight = normalizeTile(tiles[(x + 1) | (y + 1) << 3], type);
		} else {
			const baseX = (region.x * REGION_SIZE) | 0;
			const baseY = (region.y * REGION_SIZE) | 0;
			topLeft = getTileNormal(tiles, baseX, baseY, x - 1, y - 1, map, type);
			top = getTileNormal(tiles, baseX, baseY, x, y - 1, map, type);
			topRight = getTileNormal(tiles, baseX, baseY, x + 1, y - 1, map, type);
			left = getTileNormal(tiles, baseX, baseY, x - 1, y, map, type);
			right = getTileNormal(tiles, baseX, baseY, x + 1, y, map, type);
			bottomLeft = getTileNormal(tiles, baseX, baseY, x - 1, y + 1, map, type);
			bottom = getTileNormal(tiles, baseX, baseY, x, y + 1, map, type);
			bottomRight = getTileNormal(tiles, baseX, baseY, x + 1, y + 1, map, type);
		}

		const normalized = normalizeTileBase(type);
		const index = 0
			| ((topLeft === normalized) ? 1 : 0)
			| ((top === normalized) ? 2 : 0)
			| ((topRight === normalized) ? 4 : 0)
			| ((left === normalized) ? 8 : 0)
			| ((right === normalized) ? 16 : 0)
			| ((bottomLeft === normalized) ? 32 : 0)
			| ((bottom === normalized) ? 64 : 0)
			| ((bottomRight === normalized) ? 128 : 0);

		baseTileIndex = TILE_MAP[index];
	}

	const tileCount = type !== TileType.None ? TILE_COUNT_MAP[baseTileIndex] : 1;
	const tileIndex = TILE_MAP_MAP[baseTileIndex] + (tileCount > 1 ? region.randoms[index] % tileCount : 0);
	return (tileType << 8) | tileIndex;
}

const tileIndices = [
	47, 47, 0, 0, 13, 19, 21, 20, 15, 16,
	47, 47, 0, 0, 13, 13, 45, 22, 18, 17,
	9, 2, 2, 2, 10, 14, 14, 14, 35, 36,
	8, 5, null, 7, 4, 27, 26, 29, 37, 38,
	8, null, 46, null, 4, 28, 24, 30, 39, 40,
	8, 3, null, 1, 4, 23, 31, 32, 41, 42,
	12, 6, 6, 6, 11, 25, 33, 34, 43, 44,
];

let tileHeightMaps = new Map<number, number[]>();
let tileHeightMapsInitialized = false;

function valueToHeight(value: number, bottom: number, top: number) {
	return bottom + ((value / 255) * (top - bottom));
}

export function initializeTileHeightmaps() {
	if (tileHeightMapsInitialized)
		return;

	function createTileHeightMaps(sprite: Sprite, tileType: TileTypeNumber, bottom: number, top: number) {
		const sheetData = sprites.normalSpriteSheet.data!;
		const tiles: number[][] = [];

		for (let ty = 0; ty < 7; ty++) {
			for (let tx = 0; tx < 10; tx++) {
				const tile: number[] = [];
				const baseX = tx * tileWidth + sprite.x;
				const baseY = ty * tileHeight + sprite.y;

				for (let y = 0, i = 0; y < tileHeight; y++) {
					for (let x = 0; x < tileWidth; x++ , i++) {
						const sx = baseX + x;
						const sy = baseY + y;
						const value = sheetData.data[(sx + sy * sheetData.width) * 4];
						tile.push(valueToHeight(value, bottom, top));
					}
				}

				tiles.push(tile);
			}
		}

		tileHeightMapsInitialized = true;

		const counts = new Uint8Array(100);

		for (let i = 0; i < tileIndices.length; i++) {
			const index = tileIndices[i];

			if (index !== null) {
				const key = (tileType << 8) | (TILE_MAP_MAP[index] + counts[index]);
				tileHeightMaps.set(key, tiles[i]);
				counts[index]++;
			}
		}
	}

	createTileHeightMaps(sprites.dirt_water_heightmap, TileTypeNumber.Water, -0.25, 0);
	createTileHeightMaps(sprites.dirt_ice_heightmap, TileTypeNumber.Ice, -0.2, 0);
	createTileHeightMaps(sprites.dirt_stone_cave_height_map, TileTypeNumber.Grass, 0.2, 0);
}

const waterHeight = WATER_HEIGHT.map(toWorldZ);

export function isInWater(tileIndex: number, x: number, y: number) {
	const tileType = (tileIndex & 0xff00) >> 8;

	if (tileType === TileTypeNumber.Water) {
		const heightMaps = tileHeightMaps.get(tileIndex);

		if (heightMaps !== undefined) {
			const tx = clamp(toScreenX(x - Math.floor(x)), 0, tileWidth - 1) | 0;
			const ty = clamp(toScreenY(y - Math.floor(y)), 0, tileHeight - 1) | 0;
			return heightMaps[tx + ty * tileWidth] === -0.25;
		}
	}

	return false;
}

export function getTileHeight(
	tileType: TileType, tileIndex: number, x: number, y: number, gameTime: number, mapType: MapType
) {
	const typeNumber = (tileIndex & 0xff00) >> 8;

	if (
		typeNumber === TileTypeNumber.Ice ||
		typeNumber === TileTypeNumber.Water ||
		(mapType === MapType.Cave && tileType === TileType.Grass)
	) {
		if (tileType !== TileType.WalkableWater && tileType !== TileType.WalkableIce) {
			const heightMaps = tileHeightMaps.get(tileIndex);

			if (heightMaps !== undefined) {
				const tx = clamp(toScreenX(x - Math.floor(x)), 0, tileWidth - 1) | 0;
				const ty = clamp(toScreenY(y - Math.floor(y)), 0, tileHeight - 1) | 0;
				return heightMaps[tx + ty * tileWidth];
			}
		}
	} else if (typeNumber === TileTypeNumber.SnowOnIce) {
		return -0.2;
	} else if (tileType === TileType.ElevatedDirt) {
		return 0.5;
	} else if (typeNumber === TileTypeNumber.Boat) {
		const frame = ((gameTime / 1000) * WATER_FPS) | 0;
		return waterHeight[frame % waterHeight.length];
	}

	return 0;
}
