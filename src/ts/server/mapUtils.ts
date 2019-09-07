import { ServerEntity, ServerMap, IClient } from './serverInterfaces';
import { World } from './world';
import { Rect, SignEntityOptions, MessageType, CreateEntityMethod, PonyOptions, Point } from '../common/interfaces';
import { roundPosition } from '../common/positionUtils';
import { getRegionGlobal } from '../common/worldMap';
import { addEntityToRegion, getRegionTiles, removeEntityFromRegion } from './serverRegion';
import * as entities from '../common/entities';
import { updateTileIndices } from '../client/tileUtils';
import { generateRegionCollider } from '../common/region';
import { PONY_TYPE, tileWidth, tileHeight } from '../common/constants';
import { sayTo, saySystem } from './chat';
import { setEntityName, updateEntityVelocity, setEntityAnimation } from './entityUtils';
import { updateAccountState } from './accountUtils';
import { toInt, includes } from '../common/utils';
import { holdItem } from './playerUtils';
import { random, sample, clamp } from 'lodash';
import { findEntities } from './serverMap';
import { randomPosition } from './controllers/collectableController';
import { BunnyAnimation } from '../common/entities';

export const worldForTemplates: any = {
	featureFlags: {},
	addEntity(entity: ServerEntity, map: ServerMap) {
		roundPosition(entity);
		const region = getRegionGlobal(map, entity.x, entity.y);
		entity.region = region;
		addEntityToRegion(region, entity, map);
		return entity;
	},
	removeEntity(entity: ServerEntity, map: ServerMap) {
		let removed = false;

		if (entity.region) {
			removed = removeEntityFromRegion(entity.region, entity, map);
		}

		return removed;
	},
};

export function addSpawnPointIndicators(world: World, map: ServerMap) {
	const addSpawn = ({ x, y, w, h }: Rect) => {
		world.addEntity(entities.spawnPole(x, y), map);

		if (w && h) {
			world.addEntity(entities.spawnPole(x + w, y), map);
			world.addEntity(entities.spawnPole(x, y + h), map);
			world.addEntity(entities.spawnPole(x + w, y + h), map);
		}
	};

	addSpawn(map.spawnArea);

	for (const spawn of Array.from(map.spawns.values())) {
		addSpawn(spawn);
	}
}

export function generateTileIndicesAndColliders(map: ServerMap) {
	for (const region of map.regions) {
		getRegionTiles(region); // initialize encodedTiles

		if (region.tilesDirty) {
			updateTileIndices(region, map);
		}
	}

	for (const region of map.regions) {
		if (region.colliderDirty) {
			generateRegionCollider(region, map);
		}
	}
}

export function removePonies(entities: ServerEntity[]) {
	for (let i = entities.length - 1; i >= 0; i--) {
		if (entities[i].type === PONY_TYPE) {
			entities.splice(i, 1);
		}
	}
}

export interface SignDirection {
	icon: number;
	name: string;
}

export interface SignConfig {
	r?: number;
	w?: (SignDirection | undefined)[];
	e?: (SignDirection | undefined)[];
	n?: (SignDirection | undefined)[];
	s?: (SignDirection | undefined)[];
}

export function createDirectionSign(x: number, y: number, config: SignConfig) {
	const result: ServerEntity[] = [];
	const options: SignEntityOptions = { sign: {} };
	const lines: string[] = [];
	const { w = [], e = [], s = [], n = [] } = config;
	const max = clamp(Math.max(w.length, e.length, s.length, n.length), 3, 5);
	const skip = 5 - max;

	function parse(entries: (SignDirection | undefined)[], arrow: string, plates: CreateEntityMethod[], ox: number) {
		for (let i = 0; i < entries.length; i++) {
			const e = entries[i];

			if (e) {
				lines.push(`${arrow} ${e.name}`);
				const nameplate = plates[i](x + ox / tileWidth, y);
				setEntityName(nameplate, e.name);
				result.push(nameplate);
			}
		}
	}

	if (config.r) {
		options.sign.r = config.r;
	}

	const ups = config.r ? entities.directionSignUpsRight : entities.directionSignUpsLeft;
	const downs = config.r ? entities.directionSignDownsLeft : entities.directionSignDownsRight;

	if (config.n) {
		options.sign.n = config.n.map(x => x ? x.icon : -1);
		parse(config.n, '↑', ups.slice(skip), 0);
	}

	if (config.w) {
		options.sign.w = config.w.map(x => x ? x.icon : -1);
		parse(config.w, '←', entities.directionSignLefts.slice(skip), -10);
	}

	if (config.e) {
		options.sign.e = config.e.map(x => x ? x.icon : -1);
		parse(config.e, '→', entities.directionSignRights.slice(skip), 10);
	}

	if (config.s) {
		options.sign.s = config.s.map(x => x ? x.icon : -1);
		parse(config.s, '↓', downs.slice(skip), 0);
	}

	const text = lines.join('\n');
	const entity = entities.directionSign(x, y, options) as ServerEntity;
	entity.interact = (entity, client) => sayTo(client, entity, text, MessageType.System);
	result.push(entity);
	return result;
}

const patchTypes = [
	entities.cloverPatch3, entities.cloverPatch4, entities.cloverPatch5, entities.cloverPatch6, entities.cloverPatch7
].map(x => x.type);

const eggBasketTypes = entities.eggBaskets.map(b => b.type);

export function pickCandy(client: IClient) {
	let count = 0;
	updateAccountState(client.account, state => state.candies = count = toInt(state.candies) + 1);
	saySystem(client, `${count} 🍬`);
}

export function pickGift(client: IClient) {
	let count = 0;
	updateAccountState(client.account, state => state.gifts = count = toInt(state.gifts) + 1);
	saySystem(client, `${count} 🎁`);
	holdItem(client.pony, entities.gift2.type);
}

export function pickClover(client: IClient) {
	let count = 0;
	updateAccountState(client.account, state => state.clovers = count = toInt(state.clovers) + 1);
	saySystem(client, `${count} 🍀`);
	holdItem(client.pony, entities.cloverPick.type);
}

export function pickEgg(client: IClient) {
	let count = 0;
	updateAccountState(client.account, state => state.eggs = count = toInt(state.eggs) + 1);
	saySystem(client, `${count} 🥚`);

	if (Math.random() < 0.05) {
		const options = client.pony.options as PonyOptions;
		const basketIndex = eggBasketTypes.indexOf(options.hold || 0);

		if (basketIndex >= 0 && basketIndex < (eggBasketTypes.length - 1)) {
			holdItem(client.pony, eggBasketTypes[basketIndex + 1]);
		}
	}
}

export function pickEntity(client: IClient, entity: ServerEntity) {
	holdItem(client.pony, entity.type);
}

export function checkLantern(client: IClient) {
	const options = client.pony.options as PonyOptions;
	const canPick = options.hold === entities.jackoLanternOn.type || options.hold === entities.jackoLanternOff.type;

	if (!canPick) {
		saySystem(client, 'Get a lantern to collect candies');
	}

	return canPick;
}

export function checkBasket(client: IClient) {
	const options = client.pony.options as PonyOptions;
	const canPick = includes(eggBasketTypes, options.hold);

	if (!canPick) {
		saySystem(client, 'Get a basket to collect eggs');
	}

	return canPick;
}

export function checkNotCollecting(client: IClient) {
	const options = client.pony.options as PonyOptions;
	const canPick = includes(eggBasketTypes, options.hold) ||
		options.hold === entities.jackoLanternOn.type ||
		options.hold === entities.jackoLanternOff.type;
	return !canPick;
}

export function positionClover(map: ServerMap) {
	const patch = sample(findEntities(map, e => includes(patchTypes, e.type)));

	if (patch && patch.bounds) {
		const bounds = patch.bounds;
		const position = {
			x: patch.x + bounds.x / tileWidth + random(0, bounds.w / tileWidth, true),
			y: patch.y + bounds.y / tileHeight + random(0, bounds.h / tileHeight, true),
		};
		return position;
	} else {
		return randomPosition(map);
	}
}

export function createBunny(waypoints: Point[]) {
	const { x, y } = waypoints[0];
	const entity = entities.bunny(x, y) as ServerEntity;
	const bunnySpeed = 2;

	let waypoint = 0;
	let sleepUntil = 0;

	entity.serverUpdate = (_delta, now) => {
		if (sleepUntil > now)
			return;

		const { x, y } = waypoints[waypoint];
		const reachedX = Math.abs(entity.x - x) < 0.2;
		const reachedY = Math.abs(entity.y - y) < 0.2;

		if (reachedX && reachedY) {
			const rand = Math.random();
			updateEntityVelocity(entity, 0, 0, now);

			if (rand < 0.1) {
				setEntityAnimation(entity, BunnyAnimation.Clean);
				sleepUntil = now + 2;
			} else if (rand < 0.2) {
				setEntityAnimation(entity, BunnyAnimation.Look);
				sleepUntil = now + 2;
			} else if (rand < 0.3) {
				setEntityAnimation(entity, BunnyAnimation.Blink);
				sleepUntil = now + 2;
			} else if (rand < 0.6) {
				setEntityAnimation(entity, BunnyAnimation.Sit);
				sleepUntil = now + 2;
			} else {
				waypoint = (waypoint + 1) % waypoints.length;
				setEntityAnimation(entity, BunnyAnimation.Sit);
				sleepUntil = now + random(0.2, 2, true);
			}
		} else {
			const vx = reachedX ? 0 : (x < entity.x ? -bunnySpeed : bunnySpeed);
			const vy = reachedY ? 0 : (y < entity.y ? -bunnySpeed : bunnySpeed);

			if (entity.vx !== vx || entity.vy !== vy) {
				updateEntityVelocity(entity, vx, vy, now);
				setEntityAnimation(entity, BunnyAnimation.Walk, vx === 0 ? undefined : vx > 0);
			}
		}
	};

	if (DEVELOPMENT && false) {
		return [entity, ...waypoints.map(({ x, y }) => entities.routePole(x, y))];
	} else {
		return [entity];
	}
}
