import { tileWidth, tileHeight, tileElevation } from './constants';
import { Point, Rect } from './interfaces';

export function toScreenX(x: number) {
	return Math.floor(x * tileWidth) | 0;
}

export function toScreenY(y: number) {
	return Math.floor(y * tileHeight) | 0;
}

export function toScreenYWithZ(y: number, z: number) {
	return Math.floor(y * tileHeight - z * tileElevation) | 0;
}

export function toWorldX(x: number) {
	return x / tileWidth;
}

export function toWorldY(y: number) {
	return y / tileHeight;
}

export function toWorldZ(z: number) {
	return z / tileElevation;
}

export function pointToScreen({ x, y }: Point): Point {
	return {
		x: toScreenX(x),
		y: toScreenY(y),
	};
}

export function pointToWorld({ x, y }: Point): Point {
	return {
		x: toWorldX(x),
		y: toWorldY(y),
	};
}

export function rectToScreen({ x, y, w, h }: Rect): Rect {
	return {
		x: toScreenX(x),
		y: toScreenY(y),
		w: toScreenX(w),
		h: toScreenY(h),
	};
}

export function roundPositionX(x: number) {
	return Math.floor(x * tileWidth) / tileWidth;
}

export function roundPositionY(y: number) {
	return Math.floor(y * tileHeight) / tileHeight;
}

export function roundPositionXMidPixel(x: number) {
	return (Math.floor(x * tileWidth) + 0.5) / tileWidth;
}

export function roundPositionYMidPixel(y: number) {
	return (Math.floor(y * tileHeight) + 0.5) / tileHeight;
}

export function roundPosition(point: Point) {
	point.x = roundPositionX(point.x);
	point.y = roundPositionY(point.y);
}
