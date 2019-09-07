import { EntityState, Point, Rect, Entity } from './interfaces';
import { PONY_SPEED_TROT, PONY_SPEED_WALK, tileWidth, tileHeight } from './constants';
import { clamp, hasFlag } from './utils';
import { toWorldX, toWorldY } from './positionUtils';
import { rect } from './rect';

const DIRS = [
	[0, -1], // 0
	[0.5, -1],
	[1, -1],
	[1, -0.5],
	[1, 0], // 4
	[1, 0.5],
	[1, 1],
	[0.5, 1],
	[0, 1], // 8
	[-0.5, 1],
	[-1, 1],
	[-1, 0.5],
	[-1, 0], // 12
	[-1, -0.5],
	[-1, -1],
	[-0.5, -1],
];

const SECA = 0xcd3003ca;
const SECB = 0x5b903a62;
const SECC = 0x1c267e56;
const SECD = 0x1921ba6f;
const SECE = 0x0000bc0e;
const PI2 = Math.PI * 2;
const DIRS_ANGLE = DIRS.length / PI2;

export function flagsToSpeed(flags: EntityState): number {
	const state = flags & EntityState.PonyStateMask;

	if (state === EntityState.PonyTrotting) {
		return PONY_SPEED_TROT;
	} else if (state === EntityState.PonyWalking) {
		return PONY_SPEED_WALK;
	} else {
		return 0;
	}
}

export function dirToVector(dir: number): Point {
	const [x, y] = DIRS[(dir | 0) % DIRS.length];
	return { x, y };
}

export function vectorToDir(x: number, y: number): number {
	const angle = Math.atan2(x, -y);
	return Math.round((angle < 0 ? angle + PI2 : angle) * DIRS_ANGLE) % DIRS.length;
}

export interface Movement {
	x: number;
	y: number;
	dir: number;
	flags: EntityState;
	time: number;
	camera: Rect;
}

export const POSITION_MIN = 0;
export const POSITION_MAX = 100000;

export function encodeMovement(
	x: number, y: number, dir: number, flags: EntityState, time: number, camera: Rect
): [number, number, number, number, number] {
	const pixelX = Math.floor(clamp(x, POSITION_MIN, POSITION_MAX) * tileWidth);
	const pixelY = Math.floor(clamp(y, POSITION_MIN, POSITION_MAX) * tileHeight);
	const camX = ((pixelX - camera.x) & 0xfff) >>> 0;
	const camY = ((pixelY - camera.y) & 0xfff) >>> 0;
	const camW = (camera.w & 0xfff) >>> 0;
	const camH = (camera.h & 0xfff) >>> 0;

	const a = pixelX | ((dir & 0xff) << 24);
	const b = pixelY | ((flags & 0xff) << 24);
	const c = time;
	const d = (camX << 20) | (camY << 8) | (camW >>> 4);
	const e = ((camW & 0xf) << 12) | camH;

	return [
		(a ^ SECA) >>> 0,
		(b ^ SECB) >>> 0,
		(c ^ SECC) >>> 0,
		(d ^ SECD) >>> 0,
		(e ^ SECE) >>> 0,
	];
}

export function decodeMovement(a: number, b: number, c: number, d: number, e: number): Movement {
	a = (a >>> 0) ^ SECA;
	b = (b >>> 0) ^ SECB;
	c = (c >>> 0) ^ SECC;
	d = (d >>> 0) ^ SECD;
	e = (e >>> 0) ^ SECE;

	const pixelX = a & 0xffffff;
	const pixelY = b & 0xffffff;

	const x = toWorldX(pixelX + 0.5);
	const y = toWorldY(pixelY + 0.5);
	const dir = (a >>> 24) & 0xff;
	const flags = (b >>> 24) & 0xff;
	const time = c;

	const camX = pixelX - ((d >>> 20) & 0xfff);
	const camY = pixelY - ((d >>> 8) & 0xfff);
	const camW = ((d & 0xff) << 4) | ((e >>> 12) & 0xf);
	const camH = e & 0xfff;

	return { x, y, dir, flags, time, camera: rect(camX, camY, camW, camH) };
}

export function isMovingRight(vx: number, right: boolean): boolean {
	return vx < 0 ? false : (vx > 0 ? true : right);
}

export function shouldBeFacingRight(entity: Entity): boolean {
	return isMovingRight(entity.vx, hasFlag(entity.state, EntityState.FacingRight));
}
