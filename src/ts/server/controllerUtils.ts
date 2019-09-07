import { sample } from 'lodash';
import { ServerEntity, IClient, ServerMap, Interact } from './serverInterfaces';
import { unholdItem, holdItem } from './playerUtils';
import { sayTo } from './chat';
import { MessageType, CreateEntityMethod, EntityState, setAnimationToEntityState } from '../common/interfaces';
import { World } from './world';
import * as entities from '../common/entities';
import { setEntityName, updateEntityState } from './entityUtils';
import { hasFlag, repeat } from '../common/utils';

export function give(type: number, message?: string) {
	return (e: ServerEntity, client: IClient) => {
		if (client.pony.options && client.pony.options.hold === type) {
			unholdItem(client.pony);
		} else {
			if (message) {
				sayTo(client, e, message, MessageType.Announcement);
			}

			holdItem(client.pony, type);
		}
	};
}

export function createBoxOfLanterns(x: number, y: number) {
	const boxOfLanterns = entities.boxLanterns(x, y) as ServerEntity;
	boxOfLanterns.interact = give(entities.lanternOn.type);
	setEntityName(boxOfLanterns, 'Box of lanterns');
	return boxOfLanterns;
}

export function createSign(x: number, y: number, name: string, interact: Interact, create = entities.sign) {
	const entity = create(x, y) as ServerEntity;
	setEntityName(entity, name);
	entity.interact = interact;
	return entity;
}

export function createSignWithText(x: number, y: number, name: string, text: string, create = entities.sign) {
	return createSign(x, y, name, (entity, client) => sayTo(client, entity, text, MessageType.System), create);
}

export function boopLight(this: ServerEntity) {
	setTimeout(() => {
		if (hasFlag(this.state, EntityState.On)) {
			turnOff(this);
			this.lightDelay = Date.now() + 3000;
		}
	}, 300);
}

export function createAddLight(world: World, map: ServerMap, createEntity: CreateEntityMethod) {
	return (x: number, y: number) => {
		const entity = world.addEntity(createEntity(x, y), map);
		entity.boop = boopLight;
		return entity;
	};
}

export function turnOff(entity: ServerEntity) {
	updateEntityState(entity, EntityState.None);
}

export function turnOn(entity: ServerEntity) {
	updateEntityState(entity, setAnimationToEntityState(EntityState.On, 1));
}

export function updateLights(entities: ServerEntity[], on: boolean) {
	for (const entity of entities) {
		if (hasFlag(entity.state, EntityState.On) !== on && Math.random() < 0.2) {
			if (entity.lightDelay === undefined || entity.lightDelay < Date.now()) {
				if (on) {
					turnOn(entity);
				} else {
					turnOff(entity);
				}
			}
		}
	}
}

export function createFenceMaker(
	world: World, map: ServerMap,
	size: number, poles: CreateEntityMethod[], beamsH: CreateEntityMethod[], beamsV: CreateEntityMethod[]
) {
	const add = (entity: ServerEntity) => world.addEntity(entity, map);

	return (x: number, y: number, length: number, horizontal = true, skipStart = false, skipEnd = false) => {
		const dx = horizontal ? size : 0;
		const dy = horizontal ? 0 : size;

		for (let i = 0; i < length; i++) {
			if (i || !skipStart) {
				add(sample(poles)!(x + dx * i, y + dy * i));
			}

			if (horizontal) {
				add(sample(beamsH)!(x + dx * i + (size / 2), y));
			} else {
				add(sample(beamsV)!(x, y + dy * i));
			}
		}

		if (!skipEnd) {
			add(sample(poles)!(x + dx * length, y + dy * length));
		}
	};
}

export function createWoodenFenceMaker(world: World, map: ServerMap) {
	return createFenceMaker(world, map, 1, [
		...repeat(2, entities.woodenFencePole1),
		...repeat(2, entities.woodenFencePole2),
		...repeat(2, entities.woodenFencePole3),
		...repeat(2, entities.woodenFencePole4),
		entities.woodenFencePole5,
	], [
			...repeat(5, entities.woodenFenceBeamH1),
			...repeat(5, entities.woodenFenceBeamH2),
			...repeat(5, entities.woodenFenceBeamH3),
			entities.woodenFenceBeamH4,
			entities.woodenFenceBeamH5,
			entities.woodenFenceBeamH6,
		], [
			entities.woodenFenceBeamV1,
			entities.woodenFenceBeamV2,
			entities.woodenFenceBeamV3,
		]);
}

export function createStoneWallFenceMaker(world: World, map: ServerMap) {
	return createFenceMaker(world, map, 2, [
		entities.stoneWallPole1,
	], [
			entities.stoneWallBeamH1,
		], [
			entities.stoneWallBeamV1,
		]);
}
