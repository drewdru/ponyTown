"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const camera_1 = require("../../common/camera");
const rect_1 = require("../../common/rect");
const mocks_1 = require("../mocks");
const positionUtils_1 = require("../../common/positionUtils");
describe('Camera', () => {
    describe('updateCamera()', () => {
        it('should not move camera if already in view', () => {
            const camera = camera_1.createCamera();
            camera.w = 512;
            camera.h = 480;
            camera.x = 1344;
            camera.actualY = camera.y = 960;
            camera_1.updateCamera(camera, { x: 50, y: 50 }, { width: 100, height: 100 });
            chai_1.expect(camera.x).equal(1344, 'x');
            chai_1.expect(camera.y).equal(960, 'y');
        });
        it('should move camera if player is not in view', () => {
            const camera = camera_1.createCamera();
            camera.w = 512;
            camera.h = 480;
            camera.x = 1344;
            camera.actualY = camera.y = 960;
            camera_1.updateCamera(camera, { x: 75, y: 75 }, { width: 100, height: 100 });
            chai_1.expect(camera.x).equal(2067, 'x');
            chai_1.expect(camera.y).equal(1463, 'y');
        });
        it('does not restrict camera position if camera is not near the edge of map', () => {
            const camera = camera_1.createCamera();
            camera.w = positionUtils_1.toScreenX(50);
            camera.h = positionUtils_1.toScreenY(50);
            camera.x = positionUtils_1.toScreenX(25);
            camera.actualY = camera.y = positionUtils_1.toScreenY(25);
            camera_1.updateCamera(camera, { x: 50, y: 50 }, { width: 100, height: 100 });
            chai_1.expect(camera.x).equal(positionUtils_1.toScreenX(25), 'x');
            chai_1.expect(camera.y).equal(positionUtils_1.toScreenY(25), 'y');
        });
        it('restricts camera position to top left edge of map', () => {
            const camera = camera_1.createCamera();
            camera.w = positionUtils_1.toScreenX(50);
            camera.h = positionUtils_1.toScreenY(50);
            camera_1.updateCamera(camera, { x: 0, y: 0 }, { width: 100, height: 100 });
            chai_1.expect(camera.x).equal(0, 'x');
            chai_1.expect(camera.y).equal(0, 'y');
        });
        it('restricts camera position to bottom right edge of map', () => {
            const camera = camera_1.createCamera();
            camera.w = positionUtils_1.toScreenX(50);
            camera.h = positionUtils_1.toScreenY(50);
            camera_1.updateCamera(camera, { x: 100, y: 100 }, { width: 100, height: 100 });
            chai_1.expect(camera.x).equal(positionUtils_1.toScreenX(50), 'x');
            chai_1.expect(camera.y).equal(positionUtils_1.toScreenY(50), 'y');
        });
        it('centers map in view if map is smaller than camera view', () => {
            const camera = camera_1.createCamera();
            camera.w = positionUtils_1.toScreenX(100);
            camera.h = positionUtils_1.toScreenY(100);
            camera_1.updateCamera(camera, { x: 25, y: 25 }, { width: 50, height: 50 });
            chai_1.expect(camera.x).equal(positionUtils_1.toScreenX(-25), 'x');
            chai_1.expect(camera.y).equal(positionUtils_1.toScreenY(-25), 'y');
        });
    });
    describe('centerCameraOn()', () => {
        it('centers camera on point', () => {
            const camera = camera_1.createCamera();
            camera_1.centerCameraOn(camera, { x: 0, y: 0 });
            chai_1.expect(camera.x).equal(-50, 'x');
            chai_1.expect(camera.y).equal(-75, 'y');
        });
    });
    describe('isWorldPointVisible()', () => {
        it('returns true if entity position is in view of camera', () => {
            chai_1.expect(camera_1.isWorldPointVisible(camera_1.createCamera(), mocks_1.entity(0, 1, 1))).true;
        });
        it('returns false if entity position is out of view of camera', () => {
            chai_1.expect(camera_1.isWorldPointVisible(camera_1.createCamera(), mocks_1.entity(0, 10, 10))).false;
        });
    });
    describe('isEntityVisible()', () => {
        it('returns true if entity bounds are in view of camera', () => {
            chai_1.expect(camera_1.isEntityVisible(camera_1.createCamera(), mocks_1.entity(0, 1, 1, 1, { bounds: rect_1.rect(0, 0, 0.1, 0.1) }))).true;
        });
        it('returns false if entity bounds are out of view of camera', () => {
            chai_1.expect(camera_1.isEntityVisible(camera_1.createCamera(), mocks_1.entity(0, 10, 10, 1, { bounds: rect_1.rect(0, 0, 0.1, 0.1) }))).false;
        });
    });
    describe('isAreaVisible()', () => {
        it('returns true if rectangle intersects camera view', () => {
            const camera = camera_1.createCamera();
            Object.assign(camera, { w: 100, h: 100, x: 0, y: 0 });
            chai_1.expect(camera_1.isAreaVisible(camera, 50, 50, 100, 100)).true;
        });
        it('returns false if rectangle does not intersect camera view', () => {
            const camera = camera_1.createCamera();
            Object.assign(camera, { w: 100, h: 100, x: 0, y: 0 });
            chai_1.expect(camera_1.isAreaVisible(camera, 101, 101, 100, 100)).false;
        });
    });
    describe('isRectVisible()', () => {
        it('returns true if rectangle intersects camera view', () => {
            const camera = camera_1.createCamera();
            Object.assign(camera, { w: 100, h: 100, x: 0, y: 0 });
            chai_1.expect(camera_1.isRectVisible(camera, rect_1.rect(50, 50, 100, 100))).true;
        });
        it('returns false if rectangle does not intersect camera view', () => {
            const camera = camera_1.createCamera();
            Object.assign(camera, { w: 100, h: 100, x: 0, y: 0 });
            chai_1.expect(camera_1.isRectVisible(camera, rect_1.rect(101, 101, 100, 100))).false;
        });
    });
    describe('screenToWorld()', () => {
        it('maps position from screen to world coordinates', () => {
            const camera = camera_1.createCamera();
            camera.x = 32;
            camera.actualY = camera.y = 24;
            chai_1.expect(camera_1.screenToWorld(camera, { x: 64, y: 48 })).eql({ x: 3, y: 3 });
        });
    });
    describe('worldToScreen()', () => {
        it('maps position from world to screen coordinates', () => {
            const camera = camera_1.createCamera();
            camera.x = 32;
            camera.actualY = camera.y = 24;
            chai_1.expect(camera_1.worldToScreen(camera, { x: 3, y: 3 })).eql({ x: 64, y: 48 });
        });
    });
});
//# sourceMappingURL=camera.spec.js.map