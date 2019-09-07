import { Controller, ServerEntity, ServerMap } from '../serverInterfaces';
import { timingStart, timingEnd } from '../timing';

export class UpdateController implements Controller {
	private updatables: ServerEntity[] = [];
	constructor(private map: ServerMap) {
	}
	initialize() {
		this.updatables = [];

		for (const region of this.map.regions) {
			for (const entity of region.entities) {
				if (entity.serverUpdate) {
					this.updatables.push(entity);
				}
			}
		}
	}
	update(delta: number, now: number) {
		timingStart('TorchController.update()');

		for (const entity of this.updatables) {
			entity.serverUpdate!(delta, now);
		}

		timingEnd();
	}
}
