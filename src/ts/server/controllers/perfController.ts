import { range, compact } from 'lodash';
import { pony } from '../../common/entities';
import { Entity, EntityState, MessageType, EntityFlags } from '../../common/interfaces';
import { Controller, ServerEntity, IClient } from '../serverInterfaces';
import { World } from '../world';
import { Character } from '../db';
import { PONY_SPEED_TROT } from '../../common/constants';
import { setEntityName, updateEntityVelocity } from '../entityUtils';
import { encryptInfo } from '../characterUtils';
import { createCamera } from '../../common/camera';
import { shouldBeFacingRight } from '../../common/movementUtils';
import { timingEnd, timingStart } from '../timing';
import { sayToAll } from '../chat';

interface Options {
	count: number;
	moving: number;
	saying?: boolean;
	unique?: boolean;
	spread?: boolean;
	x?: number;
	y?: number;
}

export class PerfController implements Controller {
	private entities: Entity[] = [];
	private limitLeft = 11;
	private limitWidth = 30;
	private limitTop = 9;
	private limitHeight = 25;
	private initialized = false;
	constructor(private world: World, private options: Options) {
		if (options.spread) {
			this.limitWidth = 60;
			this.limitHeight = 60;
		}

		if (options.x !== undefined) {
			this.limitLeft = options.x;
		}

		if (options.y !== undefined) {
			this.limitTop = options.y;
		}
	}
	initialize() {
		if (this.initialized)
			return;

		const world = this.world;
		const map = world.getMainMap();

		const names = [
			'performance',
			'performance 2',
		];

		const query = this.options.unique ?
			Promise.resolve(Character.find({ account: '57ae2336a67f4dc52e123ed1' }).limit(this.options.count).exec()) :
			Promise.all(names.map(name => Character.findOne({ name }).exec())).then(compact);

		query
			.then(characters => {
				if (characters.length) {
					this.entities = range(this.options.count).map(i => {
						const character = characters[i % characters.length]!;
						const name = character._id.toString();
						const x = this.limitLeft + this.limitWidth * Math.random();
						const y = this.limitTop + this.limitHeight * Math.random();
						const p = pony(x, y) as ServerEntity;
						setEntityName(p, name);
						p.flags |= EntityFlags.CanCollide;
						p.encryptedInfoSafe = encryptInfo(character.info || '');
						p.client = {
							pony: p,
							accountId: 'foobar',
							characterId: character._id.toString(),
							ignores: new Set(),
							hides: new Set(),
							permaHides: new Set(),
							account: {} as any,
							regions: [],
							camera: createCamera(),
							updateRegion() { },
							addEntity() { },
							mapTest() { },
						} as Partial<IClient> as any;
						p.client!.camera.x = -10000;
						p.vx = this.options.moving ? randomVelocity() : 0;
						p.vy = this.options.moving ? randomVelocity() : 0;
						p.state = shouldBeFacingRight(p) ? EntityState.FacingRight : EntityState.None;
						return world.addEntity(p, map);
					});
				}
			});

		this.initialized = true;
	}
	update(_: number, now: number) {
		timingStart('PerfController.update()');

		const limitBottom = this.limitTop + this.limitHeight;
		const limitRight = this.limitTop + this.limitHeight;

		if (this.options.moving) {
			for (const entity of this.entities) {
				if ((entity.vy > 0 && entity.y > limitBottom) || (entity.vy < 0 && entity.y < this.limitTop)) {
					updateEntityVelocity(entity, entity.vx, -entity.vy, now);
				} else if ((entity.vx > 0 && entity.x > limitRight) || (entity.vx < 0 && entity.x < this.limitLeft)) {
					updateEntityVelocity(entity, -entity.vx, entity.vy, now);
				} else if (Math.random() < 0.1) {
					updateEntityVelocity(entity, randomVelocity(), randomVelocity(), now);
				}

				if (this.options.saying && Math.random() < 0.01) {
					sayToAll(entity, 'Hello World', 'Hello World', MessageType.Chat, {});
				}
			}
		}

		timingEnd();
	}
}

function randomVelocity() {
	const rand = Math.random();
	return rand < 0.333 ? 0 : (rand < 0.666 ? -PONY_SPEED_TROT : +PONY_SPEED_TROT);
}
