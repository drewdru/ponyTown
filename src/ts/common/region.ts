import { TileType, Region, IMap } from './interfaces';
import { clamp } from './utils';
import { tileWidth, tileHeight, REGION_SIZE, REGION_WIDTH, REGION_HEIGHT } from './constants';
import { getRegion } from './worldMap';
import { toScreenX, toScreenY } from './positionUtils';
import { ponyColliders, ponyCollidersBounds } from './mixins';
import { decompressTiles } from './compress';

const { min, max, floor } = Math;

export function createRegion(x: number, y: number, tileData?: Uint8Array): Region {
	const size = REGION_SIZE;
	const tiles = tileData ? decompressTiles(tileData) : new Uint8Array(size * size);
	const tileIndices = new Int16Array(size * size);
	const randoms = new Uint8Array(size * size);
	// const elevation = new Uint8Array(size * size);
	const collider = new Uint8Array(size * size * tileWidth * tileHeight);

	if (!tileData) {
		tiles.fill(TileType.Dirt);
	}

	tileIndices.fill(-1);

	for (let i = 0; i < randoms.length; i++) {
		randoms[i] = (Math.random() * 256) | 0;
	}

	return {
		x, y, tiles, tileIndices,
		randoms,
		// elevation,
		entities: [],
		colliders: [],
		collider,
		colliderDirty: true,
		tilesDirty: true,
	};
}

export function getRegionTile(region: Region, x: number, y: number): TileType {
	return region.tiles[x | (y << 3)];
}

export function setRegionTile(region: Region, x: number, y: number, type: TileType) {
	region.tiles[x | (y << 3)] = type;
}

export function getRegionTileIndex(region: Region, x: number, y: number) {
	return region.tileIndices[x | (y << 3)];
}

export function setRegionTileDirty(region: Region, x: number, y: number) {
	region.tileIndices[x | (y << 3)] = -1;
	region.tilesDirty = true;
}

export function getRegionElevation(_region: Region, _x: number, _y: number) {
	return 0; // region.elevation[x | (y << 3)];
}

export function setRegionElevation(_region: Region, _x: number, _y: number, _value: number) {
	// region.elevation[x | (y << 3)] = value;
}

export function worldToRegionX<T>(x: number, map: IMap<T>) {
	return clamp(floor(x / REGION_SIZE), 0, map.regionsX - 1);
}

export function worldToRegionY<T>(y: number, map: IMap<T>) {
	return clamp(floor(y / REGION_SIZE), 0, map.regionsY - 1);
}

export function invalidateRegionsCollider<T extends Region | undefined>(region: Region, map: IMap<T>) {
	const minY = max(0, region.y - 1);
	const maxY = min(map.regionsY - 1, region.y + 1);
	const minX = max(0, region.x - 1);
	const maxX = min(map.regionsX - 1, region.x + 1);

	for (let ry = minY; ry <= maxY; ry++) {
		for (let rx = minX; rx <= maxX; rx++) {
			const r = getRegion(map, rx, ry);

			if (r) {
				r.colliderDirty = true;
			}
		}
	}
}

export function generateRegionCollider<T extends Region | undefined>(region: Region, map: IMap<T>) {
	const regionCollider = region.collider;
	const tileTypes = region.tiles;

	region.colliderDirty = false;
	regionCollider.fill(0);

	for (let ty = 0, i = 0; ty < REGION_SIZE; ty++) {
		for (let tx = 0; tx < REGION_SIZE; tx++ , i++) {
			const type = tileTypes[i];

			if (type === TileType.None) {
				const x0 = (tx * tileWidth) | 0;
				const y0 = (ty * tileHeight) | 0;
				const x1 = (x0 + tileWidth) | 0;
				const y1 = (y0 + tileHeight) | 0;

				for (let y = y0; y < y1; y++) {
					for (let x = x0; x < x1; x++) {
						regionCollider[(x + ((y * REGION_WIDTH) | 0)) | 0] = 3;
					}
				}
			}
		}
	}

	const minY = max(0, region.y - 1);
	const maxY = min(map.regionsY - 1, region.y + 1);
	const minX = max(0, region.x - 1);
	const maxX = min(map.regionsX - 1, region.x + 1);

	const pBounds = ponyCollidersBounds;
	const pbX0 = pBounds.x | 0;
	const pbY0 = pBounds.y | 0;
	const pbX1 = (pbX0 + pBounds.w) | 0;
	const pbY1 = (pbY0 + pBounds.h) | 0;

	const baseX = region.x * REGION_SIZE;
	const baseY = region.y * REGION_SIZE;

	for (let ry = minY; ry <= maxY; ry++) {
		for (let rx = minX; rx <= maxX; rx++) {
			const r = getRegion(map, rx, ry);

			if (r === undefined)
				continue;

			for (const entity of r.colliders) {
				const entityX = toScreenX(entity.x - baseX) | 0;
				const entityY = toScreenY(entity.y - baseY) | 0;

				const cBounds = entity.collidersBounds!;
				const ecbX = entityX + cBounds.x;
				const ecbY = entityY + cBounds.y;

				if (
					(ecbX + pbX0) > REGION_WIDTH || (ecbY + pbY0) > REGION_HEIGHT ||
					(ecbX + cBounds.w + pbX1) < 0 || (ecbY + cBounds.h + pbY1) < 0
				) {
					continue;
				}

				for (const c of entity.colliders!) {
					const value = (c.tall ? 3 : 1) | 0;
					const baseX0 = (entityX + c.x) | 0;
					const baseY0 = (entityY + c.y) | 0;
					const baseX1 = (baseX0 + c.w) | 0;
					const baseY1 = (baseY0 + c.h) | 0;

					if (c.exact) {
						const x0 = (baseX0 < 0 ? 0 : baseX0) | 0;
						const y0 = (baseY0 < 0 ? 0 : baseY0) | 0;
						const x1 = (baseX1 > REGION_WIDTH ? REGION_WIDTH : baseX1) | 0;
						const y1 = (baseY1 > REGION_HEIGHT ? REGION_HEIGHT : baseY1) | 0;

						if (x1 > x0 && y1 > y0) {
							for (let y = y0 | 0; y < y1; y = (y + 1) | 0) {
								const oy = (y * REGION_WIDTH) | 0;

								for (let x = x0 | 0; x < x1; x = (x + 1) | 0) {
									regionCollider[(x + oy) | 0] |= value;
								}
							}
						}
					} else {
						for (const pc of ponyColliders) {
							const tx0 = (baseX0 + pc.x) | 0;
							const ty0 = (baseY0 + pc.y) | 0;
							const tx1 = (baseX1 + ((pc.x + pc.w) | 0)) | 0;
							const ty1 = (baseY1 + ((pc.y + pc.h) | 0)) | 0;

							const x0 = (tx0 < 0 ? 0 : tx0) | 0;
							const y0 = (ty0 < 0 ? 0 : ty0) | 0;
							const x1 = (tx1 > REGION_WIDTH ? REGION_WIDTH : tx1) | 0;
							const y1 = (ty1 > REGION_HEIGHT ? REGION_HEIGHT : ty1) | 0;

							if (x1 > x0 && y1 > y0) {
								for (let y = y0 | 0; y < y1; y = (y + 1) | 0) {
									const oy = (y * REGION_WIDTH) | 0;

									for (let x = x0 | 0; x < x1; x = (x + 1) | 0) {
										regionCollider[(x + oy) | 0] |= value;
									}
								}
							}
						}
					}
				}
			}
		}
	}
}
