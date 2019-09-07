import { sample } from 'lodash';
import { Entity, CreateEntityMethod, ServerFlags } from '../../common/interfaces';
import { Controller, ServerEntity, ServerMap } from '../serverInterfaces';
import { World } from '../world';
import { findClosestEntity, findEntities } from '../serverMap';
import { timingEnd, timingStart } from '../timing';
import { hasFlag, distanceXY } from '../../common/utils';
import { moveRandomly, findClosest, moveTowards } from '../entityUtils';
import { randomPosition } from './collectableController';

export class FlyingCritterController implements Controller {
	private entities: Entity[] = [];
	constructor(
		private world: World, private map: ServerMap, private critter: CreateEntityMethod, private speed: number,
		private limit: number, private isActive: () => boolean, private spawnOnStart = false
	) {
	}
	initialize() {
		if (this.spawnOnStart) {
			for (let i = 0; i < this.limit; i++) {
				const { x, y } = randomPosition(this.map);
				this.entities.push(this.world.addEntity(this.critter(x, y), this.map));
			}
		}
	}
	update(_: number, now: number) {
		timingStart('FlyingCritterController.update()');
		updateTreehidingEntities(
			this.entities, this.world, this.map, this.limit, this.speed, now, this.critter, this.isActive);
		timingEnd();
	}
}

function isTreeCrown(entity: ServerEntity) {
	return hasFlag(entity.serverFlags || 0, ServerFlags.TreeCrown);
}

export function findClosestTree(map: ServerMap, x: number, y: number) {
	return findClosestEntity(map, x, y, isTreeCrown);
}

export function findTrees(map: ServerMap) {
	return findEntities(map, isTreeCrown);
}

interface TargetTree extends Entity {
	targetTree?: Entity;
}

export function updateTreehidingEntities(
	entities: TargetTree[], world: World, map: ServerMap, limit: number, speed: number, timestamp: number,
	create: (x: number, y: number) => Entity, isActive: () => boolean
) {
	const offsetY = -2;

	if (isActive()) {
		// release new critter
		if (entities.length < limit && Math.random() < 0.1) {
			const trees = findTrees(map);
			const tree = sample(trees);

			if (tree) {
				const entity = create(tree.x, tree.y + offsetY);
				entities.push(world.addEntity(entity, map));
				moveRandomly(map, entity, speed, 1, timestamp);
			}
		}

		for (const entity of entities) {
			moveRandomly(map, entity, speed, 0.02, timestamp);
		}
	} else if (entities.length) {
		// head to tree and disappear
		const trees = findTrees(map);

		for (let i = entities.length - 1; i >= 0; i--) {
			const e = entities[i];

			e.targetTree = e.targetTree || findClosest(e.x, e.y, trees);

			if (distanceXY(e.x, e.y, e.targetTree.x, e.targetTree.y + offsetY) < 0.1) {
				entities.splice(i, 1);
				world.removeEntity(e, map);
			} else {
				moveTowards(e, e.targetTree.x, e.targetTree.y + offsetY, speed, timestamp);
			}
		}
	}
}
