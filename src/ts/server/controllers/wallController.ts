import { fromByteArray, toByteArray } from 'base64-js';
import { Controller, ServerMap } from '../serverInterfaces';
import { World } from '../world';
import { Entity, TileType } from '../../common/interfaces';
import { tileHeight } from '../../common/constants';
import { array } from '../../common/utils';
import { Walls } from '../../common/entities';

const createGetAt = (width: number, height: number) => <T>(items: T[], x: number, y: number) => {
	return (x < 0 || y < 0 || x >= width || y >= height) ? undefined : items[x + y * width];
};

const createSetAt = (width: number, height: number) => <T>(items: T[], x: number, y: number, value: T) => {
	if (x >= 0 && y >= 0 && x < width && y < height) {
		items[x + y * width] = value;
	}
};

export class WallController implements Controller {
	top = 0;
	isTall = (_x: number, _y: number) => false;
	lockOuterWalls = false;
	private lockedTiles = new Set<string>();
	private hWalls: (Entity | undefined)[];
	private vWalls: (Entity | undefined)[];
	constructor(world: World, map: ServerMap, walls: Walls) {
		const width = map.width + 1;
		const height = map.height + 1;

		const getAt = createGetAt(width, height);
		const setAt = createSetAt(width, height);

		const hWalls = this.hWalls = array<Entity | undefined>(width * height, undefined);
		const vWalls = this.vWalls = array<Entity | undefined>(width * height, undefined);
		const cWalls = array<Entity | undefined>(width * height, undefined);

		const yOffset = 3 / tileHeight;

		const { wallHShort, wallVShort, wallH, wallV, wallCorners, wallCornersShort, wallCutR, wallCutL } = walls;

		const calcCorner = (x: number, y: number) => {
			// top right bottom left
			return (getAt(vWalls, x, y - 1) ? 8 : 0)
				+ (getAt(hWalls, x, y) ? 4 : 0)
				+ (getAt(vWalls, x, y) ? 2 : 0)
				+ (getAt(hWalls, x - 1, y) ? 1 : 0);
		};

		const updateCorner = (x: number, y: number) => {
			if (x < 0 || y < 0 || x >= width || y >= height)
				return;

			const top = this.top;
			const isOutside = x === 0 || y <= top || x === map.width || this.isTall(x, y);
			const corners = isOutside ? wallCorners : wallCornersShort;
			const current = getAt(cWalls, x, y);
			const calc = calcCorner(x, y);

			if (!current || current.type !== corners[calc].type) {
				if (current) {
					world.removeEntity(current, map);
				}

				setAt(cWalls, x, y, calc ? world.addEntity(corners[calc](x, y + yOffset), map) : undefined);
			}
		};

		this.toggleWall = (x, y, type) => {
			if (x < 0 || y < 0 || x >= width || y >= height)
				return;

			if (this.lockedTiles.has(`${x},${y}:${type}`))
				return;

			const walls = type === TileType.WallH ? hWalls : vWalls;
			const entity = getAt(walls, x, y);
			const top = this.top;

			if (type === TileType.WallH && x === (width - 1))
				return;

			if (type === TileType.WallV && y === (height - 1))
				return;

			if (this.lockOuterWalls) {
				if (type === TileType.WallH && (y <= top || y === (width - 1)))
					return;
				if (type === TileType.WallV && (x === 0 || x === (height - 1) || y < top))
					return;
			}

			if (entity) {
				world.removeEntity(entity, map);
				setAt(walls, x, y, undefined);
			} else {
				if (type === TileType.WallH) {
					const ctor = (y <= top || this.isTall(x, y)) ?
						wallH : (x === 0 ? wallCutL : (x === (width - 2) ? wallCutR : wallHShort));
					setAt(walls, x, y, world.addEntity(ctor(x + 0.5, y + yOffset), map));
				} else {
					const ctor = (x === 0 || x === (width - 1) || this.isTall(x, y)) ? wallV : wallVShort;
					setAt(walls, x, y, world.addEntity(ctor(x, y + 0.5), map));
				}
			}

			updateCorner(x, y);
			updateCorner(x + 1, y);
			updateCorner(x, y + 1);
		};
	}
	initialize() {
	}
	update() {
	}
	toggleWall?: (x: number, y: number, type: TileType) => void;
	lockWall(x: number, y: number, type: TileType.WallH | TileType.WallV) {
		this.lockedTiles.add(`${x},${y}:${type}`);
	}
	serialize() {
		const data = new Uint8Array(Math.ceil(this.vWalls.length / 8) + Math.ceil(this.hWalls.length / 8));
		let offset = 0;

		for (let i = 0; i < this.vWalls.length; i += 8, offset++) {
			let value = 0;

			for (let j = 0; j < 8; j++) {
				if (this.vWalls[i + j]) {
					value |= (1 << j);
				}
			}

			data[offset] = value;
		}

		for (let i = 0; i < this.hWalls.length; i += 8, offset++) {
			let value = 0;

			for (let j = 0; j < 8; j++) {
				if (this.hWalls[i + j]) {
					value |= (1 << j);
				}
			}

			data[offset] = value;
		}

		return fromByteArray(data);
	}
	deserialize(width: number, height: number, serialized: string) {
		const data = toByteArray(serialized);
		const size = (width + 1) * (height + 1);
		let offset = 0;

		for (let i = 0; i < size; i += 8, offset++) {
			let value = data[offset];

			for (let j = 0; j < 8; j++) {
				if ((!!this.vWalls[i + j]) !== ((value & (1 << j)) !== 0)) {
					const x = (i + j) % (width + 1);
					const y = Math.floor((i + j) / (width + 1));
					this.toggleWall!(x, y, TileType.WallV);
				}
			}
		}

		for (let i = 0; i < size; i += 8, offset++) {
			let value = data[offset];

			for (let j = 0; j < 8; j++) {
				if ((!!this.hWalls[i + j]) !== ((value & (1 << j)) !== 0)) {
					const x = (i + j) % (width + 1);
					const y = Math.floor((i + j) / (width + 1));
					this.toggleWall!(x, y, TileType.WallH);
				}
			}
		}
	}
}
