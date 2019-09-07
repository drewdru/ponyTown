import { isNight } from '../../common/timeUtils';
import { Controller, ServerEntity, ServerMap } from '../serverInterfaces';
import { World } from '../world';
import { timingStart, timingEnd } from '../timing';
import { updateLights } from '../controllerUtils';
import { hasFlag } from '../../common/utils';
import { EntityFlags } from '../../common/interfaces';

export class TorchController implements Controller {
	private lights: ServerEntity[] = [];
	constructor(private world: World, private map: ServerMap) {
	}
	initialize() {
		this.lights = [];

		for (const region of this.map.regions) {
			for (const entity of region.entities) {
				if (hasFlag(entity.flags, EntityFlags.OnOff)) {
					this.lights.push(entity);
				}
			}
		}
	}
	update() {
		timingStart('TorchController.update()');
		timingEnd();
	}
	sparseUpdate() {
		timingStart('TorchController.sparseUpdate()');
		updateLights(this.lights, isNight(this.world.time));
		timingEnd();
	}
}
