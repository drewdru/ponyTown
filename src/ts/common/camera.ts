import { Entity, Rect, Point, Size, Camera } from './interfaces';
import { CAMERA_WIDTH_MAX, CAMERA_WIDTH_MIN, CAMERA_HEIGHT_MAX, CAMERA_HEIGHT_MIN } from './constants';
import { clamp, intersect, pointInXYWH, pointInRect, lerp } from './utils';
import { toScreenX, toScreenY, toWorldX, toWorldY } from './positionUtils';
import { getChatBallonXY } from '../graphics/graphicsUtils';

const cameraPadding = 0.3;
export const characterHeight = 25;

export function createCamera(): Camera {
	return {
		x: 0,
		y: 0,
		w: 100,
		h: 100,
		offset: 0,
		shift: 0,
		shiftTarget: 0,
		shiftRatio: 0,
		actualY: 0,
	};
}

export function setupCamera(camera: Camera, x: number, y: number, width: number, height: number, map: Size) {
	camera.w = clamp(width, CAMERA_WIDTH_MIN, CAMERA_WIDTH_MAX);
	camera.h = clamp(height, CAMERA_HEIGHT_MIN, CAMERA_HEIGHT_MAX);
	camera.x = clamp(x, 0, toScreenX(map.width) - camera.w);
	camera.y = clamp(y, 0, toScreenY(map.height) - camera.h);
}

export function updateCamera(camera: Camera, player: Point, map: Size) {
	const cameraWith = camera.w;
	const cameraHeight = camera.h;
	const cameraHeightShifted = Math.ceil(camera.h - camera.offset);

	const playerX = toScreenX(player.x);
	const playerY = toScreenY(player.y);

	const mapWidth = toScreenX(map.width);
	const mapHeight = toScreenY(map.height);

	const minX = Math.min(0, (mapWidth - cameraWith) / 2);
	const minY = Math.min(0, (mapHeight - cameraHeight) / 2);
	const minYShifted = Math.min(0, (mapHeight - cameraHeightShifted) / 2);
	const maxX = Math.max(mapWidth - cameraWith, minX);
	const maxY = Math.max(mapHeight - cameraHeight, minY);
	const maxYShifted = Math.max(mapHeight - cameraHeightShifted, minY);

	const hSpace = Math.floor(cameraWith * cameraPadding);
	const vSpace = Math.floor(cameraHeight * cameraPadding);
	const vSpaceShifted = Math.floor(cameraHeightShifted * cameraPadding);

	const hPad = (cameraWith - hSpace) / 2;
	const vPad = (cameraHeight - vSpace) / 2;
	const vPadShifted = (cameraHeightShifted - vSpaceShifted) / 2;

	const minCamX = clamp(playerX - (hSpace + hPad), minX, maxX);
	const maxCamX = clamp(playerX - hPad, minX, maxX);
	const minCamY = clamp(playerY - (vSpace + vPad) - characterHeight, minY, maxY);
	const maxCamY = clamp(playerY - vPad - characterHeight, minY, maxY);
	const minCamYShifted = clamp(playerY - (vSpaceShifted + vPadShifted) - characterHeight, minYShifted, maxYShifted);
	const maxCamYShifted = clamp(playerY - vPadShifted - characterHeight, minYShifted, maxYShifted);

	camera.x = Math.floor(clamp(camera.x, minCamX, maxCamX));
	camera.y = Math.floor(clamp(camera.y, minCamY, maxCamY));
	camera.shiftTarget = Math.floor(clamp(camera.shiftTarget, minCamYShifted, maxCamYShifted));
	camera.actualY = calculateCameraY(camera);
}

export function centerCameraOn(camera: Camera, point: Point) {
	camera.x = Math.floor(toScreenX(point.x) - camera.w / 2);
	camera.y = Math.floor((toScreenY(point.y) - camera.h / 2) - characterHeight);
	camera.shiftTarget = Math.floor((toScreenY(point.y) - Math.ceil(camera.h - camera.offset) / 2) - characterHeight);
}

export function calculateCameraY(camera: Camera) {
	return Math.round(lerp(camera.y, camera.shiftTarget - camera.offset, camera.shiftRatio));
}

export function isWorldPointVisible(camera: Camera, point: Point): boolean {
	return pointInRect(toScreenX(point.x), toScreenY(point.y), camera);
}

export function isWorldPointWithPaddingVisible(camera: Camera, point: Point, padding: number): boolean {
	return pointInXYWH(
		toScreenX(point.x), toScreenY(point.y),
		camera.x - padding, camera.actualY - padding, camera.w + 2 * padding, camera.h + 2 * padding);
}

export function isAreaVisible(camera: Camera, x: number, y: number, w: number, h: number): boolean {
	return intersect(camera.x, camera.actualY, camera.w, camera.h, x, y, w, h);
}

export function isRectVisible(camera: Camera, rect: Rect): boolean {
	return intersect(camera.x, camera.actualY, camera.w, camera.h, rect.x, rect.y, rect.w, rect.h);
}

export function isBoundsVisible(camera: Camera, bounds: Rect | undefined, x: number, y: number): boolean {
	return bounds !== undefined &&
		isAreaVisible(camera, toScreenX(x) + bounds.x, toScreenY(y) + bounds.y, bounds.w, bounds.h);
}

export function isEntityVisible(camera: Camera, entity: Entity): boolean {
	return isBoundsVisible(camera, entity.bounds, entity.x, entity.y);
}

function isChatBaloonAboveScreenTop(camera: Camera, entity: Entity) {
	return getChatBallonXY(entity, camera).y <= -5;
}

export function isChatVisible(camera: Camera, entity: Entity): boolean {
	return isBoundsVisible(camera, entity.bounds, entity.x, entity.y)
		&& !isChatBaloonAboveScreenTop(camera, entity);
}

export function screenToWorld(camera: Camera, point: Point): Point {
	return {
		x: toWorldX(point.x + camera.x),
		y: toWorldY(point.y + camera.actualY),
	};
}

export function worldToScreen(camera: Camera, point: Point): Point {
	return {
		x: Math.floor(toScreenX(point.x) - camera.x),
		y: Math.floor(toScreenY(point.y) - camera.actualY),
	};
}

// export function mapDepth(camera: Camera, y: number): number {
// 	return (toScreenY(y) - camera.actualY) - camera.maxDepth;
// }
