import { compact } from 'lodash';
import * as entities from '../../common/entities';
import { IClient, ServerEntity, Controller, ServerMap } from '../serverInterfaces';
import { World } from '../world';
import { Character } from '../db';
import { setEntityName } from '../entityUtils';
import { times } from '../../common/utils';
import { encryptInfo } from '../characterUtils';
import { createCamera } from '../../common/camera';
import { timingStart, timingEnd } from '../timing';
import { createBinaryWriter } from 'ag-sockets';

export class TestController implements Controller {
	private clients: IClient[] = [];
	private initialized = false;
	constructor(private world: World, private map: ServerMap) {
	}
	initialize() {
		if (this.initialized)
			return;

		const world = this.world;
		const map = this.map;

		if (DEVELOPMENT) {
			Promise.all(times(10, i => `debug ${i + 1}`).map(name => Character.findOne({ name }).exec()))
				.then(compact)
				.then(items => items.forEach((item, i) => {
					const name = item.name;
					const tag = i === 0 ? 'mod' : (i === 2 ? 'sup2' : '');
					const extraOptions = i === 0 ? {
						site: {
							provider: 'github',
							name: 'Test name',
							url: 'https://github.com/Microsoft/TypeScript',
						}
					} : undefined;
					const p = entities.pony(57 + 1 * i, 47 + 1 * i) as ServerEntity;
					p.options = { tag };
					setEntityName(p, name);
					p.encryptedInfoSafe = encryptInfo(item.info || '');
					p.client = {
						map,
						accountSettings: {},
						account: { id: 'foobar', name: 'Debug account' } as any,
						country: 'XY',
						regions: [],
						saysQueue: { push() { }, length: 0 } as any,
						notifications: [],
						camera: createCamera(),
						accountId: 'foobar',
						characterId: '',
						ignores: new Set(),
						hides: new Set(),
						permaHides: new Set(),
						updateQueue: createBinaryWriter(1),
						addEntity() { },
						addNotification() { },
						removeNotification() { },
						updateParty() { },
						mapUpdate() { },
					} as Partial<IClient> as any;
					p.client!.pony = p;
					this.clients.push(p.client!);
					p.extraOptions = extraOptions;
					world.addEntity(p, map);
				}));
		}

		this.initialized = true;
	}
	update() {
		timingStart('TestController.update()');
		timingEnd();
	}
	sparseUpdate() {
		timingStart('TestController.sparseUpdate()');

		for (const client of this.clients) {
			for (const notification of client.notifications) {
				notification.accept && notification.accept();
			}
		}

		timingEnd();
	}
}
