import { Entity, IMap, Region, EntityFlags } from './interfaces';
import { clamp } from './utils';
import { toWorldX, toWorldY } from './positionUtils';
import { getRegionGlobal, isInWaterAt } from './worldMap';
import { tileWidth, tileHeight, PONY_TYPE, REGION_SIZE, REGION_WIDTH, REGION_HEIGHT } from './constants';
import { isInTheAir, isFlying } from './entityUtils';

let isCollidingCount = 0;
let isCollidingObjectCount = 0;

export function getCollisionStats() {
	const stats = { isCollidingCount, isCollidingObjectCount };
	isCollidingCount = 0;
	isCollidingObjectCount = 0;
	return stats;
}

export function isOutsideMap<T>(x: number, y: number, map: IMap<T>): boolean {
	return x < 0 || y < 0 || x >= map.width || y >= map.height;
}

export function canCollideWith(entity: Entity): boolean {
	return (entity.flags & EntityFlags.CanCollideWith) !== 0;
}

export function isStaticCollision<T>(entity: Entity, map: IMap<T>, forceOnGround = false) {
	if (DEVELOPMENT && entity.type !== PONY_TYPE) {
		console.error(`isStaticCollision: non-pony entity`);
	}

	const flying = !forceOnGround && isInTheAir(entity);
	return isPonyColliding(entity.x, entity.y, map as any, flying);
}

export function fixCollision<T>(entity: Entity, map: IMap<T>) {
	if (DEVELOPMENT && entity.type !== PONY_TYPE) {
		console.error(`fixCollision: non-pony entity`);
	}

	const flying = isInTheAir(entity);

	for (let x = -1; x <= 1; x++) {
		for (let y = -1; y <= 1; y++) {
			const tx = entity.x + x;
			const ty = entity.y + y;

			if (!isPonyColliding(tx, ty, map as any, flying)) {
				entity.x += x;
				entity.y += y;
				return true;
			}
		}
	}

	return false;
}

function isPonyColliding<T extends Region | undefined>(x: number, y: number, map: IMap<T>, flying: boolean): boolean {
	if (isOutsideMap(x, y, map)) {
		return true;
	}

	const region = getRegionGlobal(map, x, y);

	if (region === undefined) {
		return true;
	}

	const rx = clamp(Math.floor((x - region.x * REGION_SIZE) * tileWidth), 0, REGION_WIDTH);
	const ry = clamp(Math.floor((y - region.y * REGION_SIZE) * tileHeight), 0, REGION_HEIGHT);
	const pixel = region.collider[rx + ry * REGION_WIDTH];
	const mask = flying ? 2 : 1;

	return (pixel & mask) !== 0;
}

function isColliding(x: number, y: number, mask: number, map: IMap<Region | undefined>) {
	if (x < 0 || x >= (map.width * tileWidth) || y < 0 || y >= (map.height * tileHeight)) {
		return true;
	} else {
		const regionX = (x / REGION_WIDTH) | 0;
		const regionY = (y / REGION_HEIGHT) | 0;
		const region = map.regions[regionX + regionY * map.regionsX];

		if (region === undefined) {
			return true;
		} else {
			const insideX = (x % REGION_WIDTH) | 0;
			const insideY = (y % REGION_HEIGHT) | 0;
			return (region.collider[insideX + insideY * REGION_WIDTH] & mask) !== 0;
		}
	}
}

export function updatePosition(entity: Entity, delta: number, map: IMap<Region | undefined>) {
	const ex = entity.x;
	const ey = entity.y;
	const speed = (!isFlying(entity) && isInWaterAt(map, ex, ey)) ? 0.5 : 1.0;
	const destX = ex + entity.vx * speed * delta;
	const destY = ey + entity.vy * speed * delta;

	if ((entity.flags & EntityFlags.CanCollide) === 0) {
		entity.x = destX;
		entity.y = destY;
		return;
	}

	if (DEVELOPMENT && entity.type !== PONY_TYPE) {
		console.error(`updatePosition: non-pony entity`);
	}

	const flying = isInTheAir(entity);
	const mask = flying ? 2 : 1;

	const srcX = ex * tileWidth;
	const srcY = ey * tileHeight;
	let dstX = destX * tileWidth;
	let dstY = destY * tileHeight;

	const x0 = Math.floor(srcX) | 0;
	const y0 = Math.floor(srcY) | 0;
	const x1 = Math.floor(dstX) | 0;
	const y1 = Math.floor(dstY) | 0;

	const minX = Math.min(x0, x1) | 0;
	const maxX = Math.max(x0, x1) | 0;
	const minY = Math.min(y0, y1) | 0;
	const maxY = Math.max(y0, y1) | 0;

	let x = x0 | 0;
	let y = y0 | 0;

	let actualX = x | 0;
	let actualY = y | 0;

	if (isColliding(actualX, actualY, mask, map)) {
		if (!isOutsideMap(destX, destY, map)) {
			entity.x = destX;
			entity.y = destY;
		}

		return;
	}

	const a = (dstY - srcY) / (dstX - srcX);
	const b = srcY - a * srcX;
	const useGt = srcY < dstY;

	let stepXT = 0 | 0, stepYT = 0 | 0;
	let stepXF = 0 | 0, stepYF = 0 | 0;
	let ox = 0, oy = 0;

	const shiftRight = srcX <= dstX;
	const shiftLeft = srcX >= dstX;
	const shiftUp = srcY >= dstY;
	const shiftDown = srcY <= dstY;
	const horizontalOrVertical = srcX === dstX || srcY === dstY;

	if (srcX < dstX) {
		if (srcY < dstY) {
			ox = 1;
			oy = 1;
			stepYT = 1 | 0;
			stepXF = 1 | 0;
		} else {
			ox = 1;
			stepYT = -1 | 0;
			stepXF = 1 | 0;
		}
	} else if (srcX > dstX) {
		if (srcY < dstY) {
			oy = 1;
			stepYT = 1 | 0;
			stepXF = -1 | 0;
		} else {
			stepYT = -1 | 0;
			stepXF = -1 | 0;
		}
	} else {
		if (srcY < dstY) {
			stepYF = stepYT = 1 | 0;
		} else {
			stepYF = stepYT = -1 | 0;
		}
	}

	let steps = 1000;

	for (; steps; steps--) {
		const fx = a * (x + ox) + b;
		const fy = y + oy;

		let tx = 0 | 0;
		let ty = 0 | 0;

		if (useGt ? (fx > fy) : (fx < fy)) {
			tx = (tx + stepXT) | 0;
			ty = (ty + stepYT) | 0;
		} else {
			tx = (tx + stepXF) | 0;
			ty = (ty + stepYF) | 0;
		}

		x = (x + tx) | 0;
		y = (y + ty) | 0;

		if (x < minX || x > maxX || y < minY || y > maxY) {
			break;
		}

		let actualNX = (actualX + tx) | 0;
		let actualNY = (actualY + ty) | 0;
		let collides = isColliding(actualNX, actualNY, mask, map);
		let canMove = false;

		if (collides) {
			if (tx !== 0) {
				let canShiftUp = false;
				let canShiftDown = false;

				if (
					shiftUp && (canShiftUp = !isColliding(actualX, actualY - 1, mask, map)) &&
					!isColliding(actualNX, actualY - 1, mask, map)
				) {
					actualNX = actualX;
					actualNY -= 1;
					dstY -= 1;
					collides = false;
				} else if (
					shiftDown && (canShiftDown = !isColliding(actualX, actualY + 1, mask, map)) &&
					!isColliding(actualNX, actualY + 1, mask, map)
				) {
					actualNX = actualX;
					actualNY += 1;
					dstY += 1;
					collides = false;
				} else if (shiftUp && canShiftUp && !isColliding(actualNX, actualY - 2, mask, map)) {
					actualNX = actualX;
					actualNY -= 1;
					dstY -= 1;
					collides = false;
				} else if (shiftDown && canShiftDown && !isColliding(actualNX, actualY + 2, mask, map)) {
					actualNX = actualX;
					actualNY += 1;
					dstY += 1;
					collides = false;
				}

				canMove = canShiftUp || canShiftDown;
			} else {
				let canShiftLeft = false;
				let canShiftRight = false;

				if (
					shiftLeft && (canShiftLeft = !isColliding(actualX - 1, actualY, mask, map)) &&
					!isColliding(actualX - 1, actualNY, mask, map)
				) {
					actualNX -= 1;
					actualNY = actualY;
					dstX -= 1;
					collides = false;
				} else if (
					shiftRight && (canShiftRight = !isColliding(actualX + 1, actualY, mask, map)) &&
					!isColliding(actualX + 1, actualNY, mask, map)
				) {
					actualNX += 1;
					actualNY = actualY;
					dstX += 1;
					collides = false;
				} else if (shiftLeft && canShiftLeft && !isColliding(actualX - 2, actualNY, mask, map)) {
					actualNX -= 1;
					actualNY = actualY;
					dstX -= 1;
					collides = false;
				} else if (shiftRight && canShiftRight && !isColliding(actualX + 2, actualNY, mask, map)) {
					actualNX += 1;
					actualNY = actualY;
					dstX += 1;
					collides = false;
				}

				canMove = canShiftLeft || canShiftRight;
			}
		}

		if (!collides) {
			actualX = actualNX;
			actualY = actualNY;
		} else if (!canMove || horizontalOrVertical) {
			break;
		}
	}

	const epsilon = 1 / 1024;
	const left = Math.min(x0, actualX);
	const right = Math.max(x0 + 1, actualX + 1) - epsilon;
	const top = Math.min(y0, actualY);
	const bottom = Math.max(y0 + 1, actualY + 1) - epsilon;

	entity.x = toWorldX(clamp(dstX, left, right));
	entity.y = toWorldY(clamp(dstY, top, bottom));

	if (DEVELOPMENT && steps <= 0) {
		console.error('Overflow collision steps');
	}
}
