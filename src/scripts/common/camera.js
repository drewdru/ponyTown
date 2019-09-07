"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const positionUtils_1 = require("./positionUtils");
const graphicsUtils_1 = require("../graphics/graphicsUtils");
const cameraPadding = 0.3;
exports.characterHeight = 25;
function createCamera() {
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
exports.createCamera = createCamera;
function setupCamera(camera, x, y, width, height, map) {
    camera.w = utils_1.clamp(width, constants_1.CAMERA_WIDTH_MIN, constants_1.CAMERA_WIDTH_MAX);
    camera.h = utils_1.clamp(height, constants_1.CAMERA_HEIGHT_MIN, constants_1.CAMERA_HEIGHT_MAX);
    camera.x = utils_1.clamp(x, 0, positionUtils_1.toScreenX(map.width) - camera.w);
    camera.y = utils_1.clamp(y, 0, positionUtils_1.toScreenY(map.height) - camera.h);
}
exports.setupCamera = setupCamera;
function updateCamera(camera, player, map) {
    const cameraWith = camera.w;
    const cameraHeight = camera.h;
    const cameraHeightShifted = Math.ceil(camera.h - camera.offset);
    const playerX = positionUtils_1.toScreenX(player.x);
    const playerY = positionUtils_1.toScreenY(player.y);
    const mapWidth = positionUtils_1.toScreenX(map.width);
    const mapHeight = positionUtils_1.toScreenY(map.height);
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
    const minCamX = utils_1.clamp(playerX - (hSpace + hPad), minX, maxX);
    const maxCamX = utils_1.clamp(playerX - hPad, minX, maxX);
    const minCamY = utils_1.clamp(playerY - (vSpace + vPad) - exports.characterHeight, minY, maxY);
    const maxCamY = utils_1.clamp(playerY - vPad - exports.characterHeight, minY, maxY);
    const minCamYShifted = utils_1.clamp(playerY - (vSpaceShifted + vPadShifted) - exports.characterHeight, minYShifted, maxYShifted);
    const maxCamYShifted = utils_1.clamp(playerY - vPadShifted - exports.characterHeight, minYShifted, maxYShifted);
    camera.x = Math.floor(utils_1.clamp(camera.x, minCamX, maxCamX));
    camera.y = Math.floor(utils_1.clamp(camera.y, minCamY, maxCamY));
    camera.shiftTarget = Math.floor(utils_1.clamp(camera.shiftTarget, minCamYShifted, maxCamYShifted));
    camera.actualY = calculateCameraY(camera);
}
exports.updateCamera = updateCamera;
function centerCameraOn(camera, point) {
    camera.x = Math.floor(positionUtils_1.toScreenX(point.x) - camera.w / 2);
    camera.y = Math.floor((positionUtils_1.toScreenY(point.y) - camera.h / 2) - exports.characterHeight);
    camera.shiftTarget = Math.floor((positionUtils_1.toScreenY(point.y) - Math.ceil(camera.h - camera.offset) / 2) - exports.characterHeight);
}
exports.centerCameraOn = centerCameraOn;
function calculateCameraY(camera) {
    return Math.round(utils_1.lerp(camera.y, camera.shiftTarget - camera.offset, camera.shiftRatio));
}
exports.calculateCameraY = calculateCameraY;
function isWorldPointVisible(camera, point) {
    return utils_1.pointInRect(positionUtils_1.toScreenX(point.x), positionUtils_1.toScreenY(point.y), camera);
}
exports.isWorldPointVisible = isWorldPointVisible;
function isWorldPointWithPaddingVisible(camera, point, padding) {
    return utils_1.pointInXYWH(positionUtils_1.toScreenX(point.x), positionUtils_1.toScreenY(point.y), camera.x - padding, camera.actualY - padding, camera.w + 2 * padding, camera.h + 2 * padding);
}
exports.isWorldPointWithPaddingVisible = isWorldPointWithPaddingVisible;
function isAreaVisible(camera, x, y, w, h) {
    return utils_1.intersect(camera.x, camera.actualY, camera.w, camera.h, x, y, w, h);
}
exports.isAreaVisible = isAreaVisible;
function isRectVisible(camera, rect) {
    return utils_1.intersect(camera.x, camera.actualY, camera.w, camera.h, rect.x, rect.y, rect.w, rect.h);
}
exports.isRectVisible = isRectVisible;
function isBoundsVisible(camera, bounds, x, y) {
    return bounds !== undefined &&
        isAreaVisible(camera, positionUtils_1.toScreenX(x) + bounds.x, positionUtils_1.toScreenY(y) + bounds.y, bounds.w, bounds.h);
}
exports.isBoundsVisible = isBoundsVisible;
function isEntityVisible(camera, entity) {
    return isBoundsVisible(camera, entity.bounds, entity.x, entity.y);
}
exports.isEntityVisible = isEntityVisible;
function isChatBaloonAboveScreenTop(camera, entity) {
    return graphicsUtils_1.getChatBallonXY(entity, camera).y <= -5;
}
function isChatVisible(camera, entity) {
    return isBoundsVisible(camera, entity.bounds, entity.x, entity.y)
        && !isChatBaloonAboveScreenTop(camera, entity);
}
exports.isChatVisible = isChatVisible;
function screenToWorld(camera, point) {
    return {
        x: positionUtils_1.toWorldX(point.x + camera.x),
        y: positionUtils_1.toWorldY(point.y + camera.actualY),
    };
}
exports.screenToWorld = screenToWorld;
function worldToScreen(camera, point) {
    return {
        x: Math.floor(positionUtils_1.toScreenX(point.x) - camera.x),
        y: Math.floor(positionUtils_1.toScreenY(point.y) - camera.actualY),
    };
}
exports.worldToScreen = worldToScreen;
// export function mapDepth(camera: Camera, y: number): number {
// 	return (toScreenY(y) - camera.actualY) - camera.maxDepth;
// }
//# sourceMappingURL=camera.js.map