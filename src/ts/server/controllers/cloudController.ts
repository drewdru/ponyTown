import { tileWidth } from '../../common/constants';
import { Entity } from '../../common/interfaces';
import { entitiesIntersect } from '../../common/utils';
import { cloud } from '../../common/entities';
import * as sprites from '../../generated/sprites';
import { Controller, ServerMap, ServerEntity } from '../serverInterfaces';
import { World } from '../world';
import { updateEntityVelocity } from '../entityUtils';
import { timingEnd, timingStart } from '../timing';

const spriteWidth = sprites.cloud.shadow!.w / tileWidth;
const cloudVX = -0.5;

export class CloudController implements Controller {
	private clouds: Entity[] = [];
	private initialized = false;
	constructor(private world: World, private map: ServerMap, private cloudCount: number) {
	}
	initialize() {
		if (this.initialized)
			return;

		for (let i = 0; i < this.cloudCount; i++) {
			this.addCloud(false, this.world.now / 1000);
		}

		this.initialized = true;
	}
	update(_: number, now: number) {
		timingStart('CloudController.update()');
		for (let i = this.clouds.length - 1; i >= 0; i--) {
			const cloud = this.clouds[i];

			if (cloud.x < -spriteWidth) {
				this.clouds.splice(i, 1);
				this.world.removeEntity(cloud, this.map);
			}
		}

		if (this.clouds.length < this.cloudCount) {
			this.addCloud(true, now);
		}
		timingEnd();
	}
	private addCloud(end: boolean, timestamp: number) {
		const x = end ? this.map.width + spriteWidth : this.map.width * Math.random();
		const y = this.map.height * Math.random();
		const entity = cloud(x, y) as ServerEntity;

		if (!this.clouds.some(c => entitiesIntersect(c, entity))) {
			this.clouds.push(this.world.addEntity(entity, this.map));
			updateEntityVelocity(entity, cloudVX, 0, timestamp);
		}
	}
}
