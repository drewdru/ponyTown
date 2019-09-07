import { remove, sample } from 'lodash';
import { Entity, CreateEntityMethod } from '../../common/interfaces';
import { IClient, Controller, ServerEntity, ServerMap } from '../serverInterfaces';
import { World } from '../world';
import { timingEnd, timingStart } from '../timing';
import { canPlaceItem, canBePickedByPlayer, pushRemoveEntityToClient } from '../entityUtils';

export function randomPosition(map: ServerMap) {
	const x = Math.random() * map.width;
	const y = Math.random() * map.height;
	return { x, y };
}

export class CollectableController implements Controller {
	private items: Entity[] = [];
	constructor(
		private world: World,
		private map: ServerMap,
		private ctors: CreateEntityMethod[],
		public limit: number,
		private pick: (client: IClient, entity: ServerEntity) => void,
		private check: (client: IClient) => boolean = () => true,
		private tries = 1,
		private position = randomPosition,
		private active = () => true
	) {
	}
	initialize() {
	}
	update() {
		timingStart('CollectableController.update()');

		if (this.active()) {
			for (let i = 0; i < this.tries; i++) {
				if (this.items.length < this.limit) {
					this.generateItem();
				}
			}
		}

		timingEnd();
	}
	private generateItem() {
		const { world, map } = this;
		const { x, y } = this.position(map);
		const ctor = sample(this.ctors)!;
		const entity = ctor(x, y) as ServerEntity;

		if (!entity.interactRange) {
			entity.interactRange = 1.5;
		}

		if (
			x > 0 && y > 0 && x < map.width && y < map.height && canPlaceItem(map, entity) && !canBePickedByPlayer(map, entity)
		) {
			entity.interact = this.interact;
			this.items.push(world.addEntity(entity, map));
		}
	}
	private interact = (entity: Entity, client: IClient) => {
		if (this.check(client)) {
			if (client.shadowed) {
				pushRemoveEntityToClient(client, entity);
			} else {
				remove(this.items, e => e === entity);
				this.world.removeEntity(entity, this.map);
				this.generateItem();
				this.pick(client, entity);
			}
		}
	}
}
