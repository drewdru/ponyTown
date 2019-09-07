"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const lodash_1 = require("lodash");
const core_1 = require("@angular/core");
const rect_1 = require("../../../common/rect");
const camera_1 = require("../../../common/camera");
const constants_1 = require("../../../common/constants");
const positionUtils_1 = require("../../../common/positionUtils");
function getRegionsBounds(client, region) {
    const screenSize = client.screenSize;
    const width = Math.ceil(((1.3 * screenSize.width) / region.size) / 2) * 2 + 2;
    const height = Math.ceil(((1.3 * screenSize.height) / region.size) / 2) * 2 + 2;
    return rect_1.rect(region.x - Math.ceil(width / 2), region.y - Math.ceil(height / 2), width, height);
}
exports.getRegionsBounds = getRegionsBounds;
function getRegionsBoundsCameraBased(_entity, camera, regionSize) {
    const left = Math.floor(camera.x / regionSize - 0.5);
    const top = Math.floor(camera.y / regionSize - 0.5);
    const right = Math.floor((camera.x + camera.w) / regionSize + 0.5);
    const bottom = Math.floor((camera.y + camera.h) / regionSize + 0.5);
    return rect_1.rect(left, top, right - left, bottom - top);
}
exports.getRegionsBoundsCameraBased = getRegionsBoundsCameraBased;
let ToolsRegions = class ToolsRegions {
    constructor() {
        this.currentMapSize = 80;
        this.tileWidth = constants_1.tileWidth;
        this.tileHeight = constants_1.tileHeight;
        this.screen = { width: 390, height: 580 };
        // screen = { width: 1920, height: 1080 };
        this.regionsX = 18;
        this.regionsY = 16;
        this.regionSize = 8;
        this.scale = 0.25;
        this.zoom = 2;
        this.camera = camera_1.createCamera();
        this.approxCamera = camera_1.createCamera();
        this.player = { x: 0, y: 0 };
        this.frame = 0;
        this.lastFrame = 0;
        this.right = false;
        this.left = false;
        this.up = false;
        this.down = false;
        this.tick = (now) => {
            this.frame = requestAnimationFrame(this.tick);
            const delta = (now - this.lastFrame) / 1000;
            this.lastFrame = now;
            let dx = 0;
            let dy = 0;
            if (this.right)
                dx += 1;
            if (this.left)
                dx -= 1;
            if (this.up)
                dy -= 1;
            if (this.down)
                dy += 1;
            if (dx || dy) {
                this.player.x += dx * delta * constants_1.PONY_SPEED_TROT;
                this.player.y += dy * delta * constants_1.PONY_SPEED_TROT;
                this.update();
            }
        };
        this.regions = lodash_1.times(this.regionsY, () => lodash_1.times(this.regionsX, () => ''));
    }
    ngOnInit() {
        this.update();
        this.frame = requestAnimationFrame(this.tick);
    }
    ngOnDestroy() {
        cancelAnimationFrame(this.frame);
    }
    update() {
        const regionWidth = this.regionSize * constants_1.tileWidth;
        const regionHeight = this.regionSize * constants_1.tileHeight;
        const map = { width: this.regionsX * this.regionSize, height: this.regionsY * this.regionSize };
        this.camera.w = Math.ceil(this.screen.width / this.zoom);
        this.camera.h = Math.ceil(this.screen.height / this.zoom);
        camera_1.updateCamera(this.camera, this.player, map);
        this.approxCamera.w = this.camera.w * 1.3;
        this.approxCamera.h = this.camera.h * 1.3;
        camera_1.centerCameraOn(this.approxCamera, this.player);
        camera_1.updateCamera(this.approxCamera, this.player, map);
        this.regions.forEach(x => lodash_1.fill(x, ''));
        const rx = lodash_1.clamp(Math.floor(this.player.x / this.regionSize), 0, this.regionsX - 1);
        const ry = lodash_1.clamp(Math.floor(this.player.y / this.regionSize), 0, this.regionsY - 1);
        const bounds1 = getRegionsBounds({
            screenSize: {
                width: Math.ceil(this.camera.w / constants_1.tileWidth),
                height: Math.ceil(this.camera.h / constants_1.tileHeight)
            }
        }, { size: this.regionSize, x: rx, y: ry });
        const bounds2 = getRegionsBoundsCameraBased(this.player, rect_1.rect(positionUtils_1.toWorldX(this.camera.x), positionUtils_1.toWorldY(this.camera.y), positionUtils_1.toWorldX(this.camera.w), positionUtils_1.toWorldY(this.camera.h)), this.regionSize);
        const bounds = [bounds1, bounds2][1];
        for (let ix = 0; ix <= bounds.w; ix++) {
            for (let iy = 0; iy <= bounds.h; iy++) {
                const yy = bounds.y + iy;
                const xx = bounds.x + ix;
                if (xx >= 0 && xx < this.regionsX && yy >= 0 && yy < this.regionsY) {
                    this.regions[yy][xx] = 'Sienna';
                }
            }
        }
        for (let x = 0; x < this.regionsX; x++) {
            for (let y = 0; y < this.regionsY; y++) {
                if (camera_1.isAreaVisible(this.camera, x * regionWidth, y * regionHeight, regionWidth, regionHeight)) {
                    if (this.regions[y][x] === 'Sienna') {
                        this.regions[y][x] = 'SeaGreen';
                    }
                    else {
                        this.regions[y][x] = 'Crimson';
                    }
                }
            }
        }
        this.regions[ry][rx] = 'MediumSeaGreen';
    }
    dragRegion({ x, y }) {
        this.player.x = x / (this.tileWidth * this.scale);
        this.player.y = y / (this.tileHeight * this.scale);
        this.update();
    }
    keydown(e) {
        if (e.keyCode === 80 /* KEY_P */) {
            this.zoom = this.zoom === 4 ? 1 : (this.zoom + 1);
            this.update();
        }
        else if (e.keyCode === 39 /* RIGHT */) {
            this.right = true;
        }
        else if (e.keyCode === 37 /* LEFT */) {
            this.left = true;
        }
        else if (e.keyCode === 38 /* UP */) {
            this.up = true;
        }
        else if (e.keyCode === 40 /* DOWN */) {
            this.down = true;
        }
    }
    keyup(e) {
        if (e.keyCode === 39 /* RIGHT */) {
            this.right = false;
        }
        else if (e.keyCode === 37 /* LEFT */) {
            this.left = false;
        }
        else if (e.keyCode === 38 /* UP */) {
            this.up = false;
        }
        else if (e.keyCode === 40 /* DOWN */) {
            this.down = false;
        }
    }
};
tslib_1.__decorate([
    core_1.HostListener('window:keydown', ['$event']),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [KeyboardEvent]),
    tslib_1.__metadata("design:returntype", void 0)
], ToolsRegions.prototype, "keydown", null);
tslib_1.__decorate([
    core_1.HostListener('window:keyup', ['$event']),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [KeyboardEvent]),
    tslib_1.__metadata("design:returntype", void 0)
], ToolsRegions.prototype, "keyup", null);
ToolsRegions = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-regions',
        templateUrl: 'tools-regions.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [])
], ToolsRegions);
exports.ToolsRegions = ToolsRegions;
//# sourceMappingURL=tools-regions.js.map