import { mapValues } from 'lodash';
import { Types } from 'mongoose';
import { Subject } from 'rxjs';
import { SinonStubbedInstance, stub } from 'sinon';
import { IClient, Reporter, ServerEntity, ServerRegion } from '../server/serverInterfaces';
import { IAccount, ICharacter, IAuth } from '../server/db';
import { ClientActions } from '../client/clientActions';
import { Entity, IMap, defaultWorldState } from '../common/interfaces';
import { createServerMap } from '../server/serverMap';
import { createCamera } from '../common/camera';
import { getRegionGlobal } from '../common/worldMap';
import { mixColliderRect } from '../common/mixins';
import { createBinaryWriter } from 'ag-sockets';
import { PONY_TYPE } from '../common/constants';

export function auth(item: Partial<IAuth>): IAuth {
	return item as IAuth;
}

export function account(item: Partial<IAccount>): IAccount {
	return item as IAccount;
}

export function character(item: Partial<ICharacter>): ICharacter {
	return item as ICharacter;
}

export function mock<T>(ctor: new (...args: any[]) => T, fields: any = {}): T {
	const object: any = {};
	const prototype = ctor.prototype;

	Object.getOwnPropertyNames(prototype)
		.filter(key => !Object.getOwnPropertyDescriptor(prototype, key)!.get && typeof prototype[key] === 'function')
		.forEach(key => object[key] = function () { });

	return Object.assign(object, fields);
}

export function entity(id: number, x = 0, y = 0, type = 0, more: Partial<Entity> = {}): Entity {
	return {
		id, x, y, z: 0, vx: 0, vy: 0, type, order: 0, state: 0, playerState: 0, flags: 0, timestamp: 0,
		options: {}, ...more
	};
}

export function serverEntity(id: number, x = 0, y = 0, type = 0, more: Partial<ServerEntity> = {}): ServerEntity {
	return {
		id, x, y, z: 0, vx: 0, vy: 0, type, order: 0, state: 0, playerState: 0, flags: 0, timestamp: 0,
		options: {}, ...more
	};
}

export function clientPony(): ServerEntity {
	return mockClient().pony;
}

let id = 1;
let ponyId = 1;

export function genId() {
	return (++id).toString(16).padStart(24, '0');
}

export function genObjectId() {
	return Types.ObjectId(genId());
}

export function mockClient(fields: any = {}): IClient {
	const pony = entity(++ponyId, 0, 0, PONY_TYPE);
	const accountId = genId();
	const characterId = genId();

	pony.options = {};

	const partial: Partial<IClient> = {
		accountId,
		characterId,
		ignores: new Set<string>(),
		hides: new Set<string>(),
		permaHides: new Set<string>(),
		friends: new Set<string>(),
		accountSettings: {},
		originalRequest: { headers: {} },
		account: { id: accountId, _id: Types.ObjectId(accountId), ignores: [] },
		character: { id: characterId, _id: Types.ObjectId(characterId) },
		isMod: false,
		pony,
		map: createServerMap('', 0, 1, 1),
		notifications: [],
		regions: [],
		updateQueue: createBinaryWriter(128),
		regionUpdates: [],
		unsubscribes: [],
		subscribes: [],
		saysQueue: [],
		lastSays: [],
		lastAction: 0,
		lastBoopAction: 0,
		lastExpressionAction: 0,
		viewWidth: 3,
		viewHeight: 3,
		screenSize: { width: 20, height: 20 },
		reporter: mockReporter(),
		camera: createCamera(),
		reportInviteLimit() { },
		disconnect() { },
		...fields,
	};

	const client = mock(ClientActions, partial) as IClient;

	client.pony.client = client;
	return client;
}

export function mockReporter(): Reporter {
	return {
		info() { },
		warn() { },
		warnLog() { },
		danger() { },
		error() { },
		system() { },
		systemLog() { },
		setPony() { },
	};
}

export type MockSubject<T = any> = Subject<T> & { values: (T | undefined)[]; };

export function mockSubject<T = any>(): MockSubject<T> {
	const values: (T | undefined)[] = [];

	return {
		values,
		next(value?: T) {
			values.push(value);
		},
	} as any;
}

export function createStubFromInstance<T extends object>(instance: T): SinonStubbedInstance<T> {
	return mapValues(instance, () => stub()) as any;
}

export function setupCollider(map: IMap<ServerRegion>, x: number, y: number) {
	const entity = serverEntity(0, x, y, 0);
	mixColliderRect(-16, -12, 32, 24)(entity, {}, defaultWorldState);
	getRegionGlobal(map, x, y).colliders.push(entity);
}
