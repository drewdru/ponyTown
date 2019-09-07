import { times, fill, clamp } from 'lodash';
import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { rect } from '../../../common/rect';
import { AgDragEvent } from '../../shared/directives/agDrag';
import { updateCamera, centerCameraOn, isAreaVisible, createCamera } from '../../../common/camera';
import { tileWidth, tileHeight, PONY_SPEED_TROT } from '../../../common/constants';
import { Key } from '../../../client/input/input';
import { Rect, Point } from '../../../common/interfaces';
import { toWorldX, toWorldY } from '../../../common/positionUtils';

export function getRegionsBounds(client: any, region: any) {
	const screenSize = client.screenSize;
	const width = Math.ceil(((1.3 * screenSize.width) / region.size) / 2) * 2 + 2;
	const height = Math.ceil(((1.3 * screenSize.height) / region.size) / 2) * 2 + 2;
	return rect(region.x - Math.ceil(width / 2), region.y - Math.ceil(height / 2), width, height);
}

export function getRegionsBoundsCameraBased(_entity: Point, camera: Rect, regionSize: number) {
	const left = Math.floor(camera.x / regionSize - 0.5);
	const top = Math.floor(camera.y / regionSize - 0.5);
	const right = Math.floor((camera.x + camera.w) / regionSize + 0.5);
	const bottom = Math.floor((camera.y + camera.h) / regionSize + 0.5);
	return rect(left, top, right - left, bottom - top);
}

@Component({
	selector: 'tools-regions',
	templateUrl: 'tools-regions.pug',
})
export class ToolsRegions implements OnInit, OnDestroy {
	currentMapSize = 80;
	tileWidth = tileWidth;
	tileHeight = tileHeight;
	screen = { width: 390, height: 580 };
	// screen = { width: 1920, height: 1080 };
	regionsX = 18;
	regionsY = 16;
	regionSize = 8;
	scale = 0.25;
	zoom = 2;
	regions: string[][];
	camera = createCamera();
	approxCamera = createCamera();
	player = { x: 0, y: 0 };
	frame = 0;
	lastFrame = 0;
	constructor() {
		this.regions = times(this.regionsY, () => times(this.regionsX, () => ''));
	}
	ngOnInit() {
		this.update();
		this.frame = requestAnimationFrame(this.tick);
	}
	ngOnDestroy() {
		cancelAnimationFrame(this.frame);
	}
	update() {
		const regionWidth = this.regionSize * tileWidth;
		const regionHeight = this.regionSize * tileHeight;
		const map = { width: this.regionsX * this.regionSize, height: this.regionsY * this.regionSize } as any;

		this.camera.w = Math.ceil(this.screen.width / this.zoom);
		this.camera.h = Math.ceil(this.screen.height / this.zoom);
		updateCamera(this.camera, this.player, map);

		this.approxCamera.w = this.camera.w * 1.3;
		this.approxCamera.h = this.camera.h * 1.3;
		centerCameraOn(this.approxCamera, this.player);
		updateCamera(this.approxCamera, this.player, map);

		this.regions.forEach(x => fill(x, ''));

		const rx = clamp(Math.floor(this.player.x / this.regionSize), 0, this.regionsX - 1);
		const ry = clamp(Math.floor(this.player.y / this.regionSize), 0, this.regionsY - 1);

		const bounds1 = getRegionsBounds(
			{
				screenSize: {
					width: Math.ceil(this.camera.w / tileWidth),
					height: Math.ceil(this.camera.h / tileHeight)
				}
			},
			{ size: this.regionSize, x: rx, y: ry });

		const bounds2 = getRegionsBoundsCameraBased(
			this.player,
			rect(toWorldX(this.camera.x), toWorldY(this.camera.y), toWorldX(this.camera.w), toWorldY(this.camera.h)),
			this.regionSize);

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
				if (isAreaVisible(this.camera, x * regionWidth, y * regionHeight, regionWidth, regionHeight)) {
					if (this.regions[y][x] === 'Sienna') {
						this.regions[y][x] = 'SeaGreen';
					} else {
						this.regions[y][x] = 'Crimson';
					}
				}
			}
		}

		this.regions[ry][rx] = 'MediumSeaGreen';
	}
	dragRegion({ x, y }: AgDragEvent) {
		this.player.x = x / (this.tileWidth * this.scale);
		this.player.y = y / (this.tileHeight * this.scale);
		this.update();
	}
	private right = false;
	private left = false;
	private up = false;
	private down = false;
	@HostListener('window:keydown', ['$event'])
	keydown(e: KeyboardEvent) {
		if (e.keyCode === Key.KEY_P) {
			this.zoom = this.zoom === 4 ? 1 : (this.zoom + 1);
			this.update();
		} else if (e.keyCode === Key.RIGHT) {
			this.right = true;
		} else if (e.keyCode === Key.LEFT) {
			this.left = true;
		} else if (e.keyCode === Key.UP) {
			this.up = true;
		} else if (e.keyCode === Key.DOWN) {
			this.down = true;
		}
	}
	@HostListener('window:keyup', ['$event'])
	keyup(e: KeyboardEvent) {
		if (e.keyCode === Key.RIGHT) {
			this.right = false;
		} else if (e.keyCode === Key.LEFT) {
			this.left = false;
		} else if (e.keyCode === Key.UP) {
			this.up = false;
		} else if (e.keyCode === Key.DOWN) {
			this.down = false;
		}
	}
	tick = (now: number) => {
		this.frame = requestAnimationFrame(this.tick);
		const delta = (now - this.lastFrame) / 1000;
		this.lastFrame = now;

		let dx = 0;
		let dy = 0;

		if (this.right) dx += 1;
		if (this.left) dx -= 1;
		if (this.up) dy -= 1;
		if (this.down) dy += 1;

		if (dx || dy) {
			this.player.x += dx * delta * PONY_SPEED_TROT;
			this.player.y += dy * delta * PONY_SPEED_TROT;
			this.update();
		}
	}
}
