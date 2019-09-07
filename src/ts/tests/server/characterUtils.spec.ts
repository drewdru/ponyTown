import '../lib';
import { expect } from 'chai';
import { encodeString } from 'ag-sockets/dist/utf8';
import { createExtraOptions, updatePony, encryptInfo, createPony, getAndFixCharacterState } from '../../server/characterUtils';
import { account, character, serverEntity, entity, genObjectId } from '../mocks';
import { CharacterFlags, CharacterState, SupporterFlags, CharacterStateFlags } from '../../common/adminInterfaces';
import { OFFLINE_PONY } from '../../common/constants';
import * as entities from '../../common/entities';
import { EntityState, EntityFlags } from '../../common/interfaces';
import { rect } from '../../common/rect';
import { createServerMap } from '../../server/serverMap';
import { CounterService } from '../../server/services/counter';
import { createCharacterState } from '../../server/playerUtils';
import { hasFlag } from '../../common/utils';

describe('characterUtils', () => {
	describe('createPony()', () => {
		const defaultState: CharacterState = { x: 0, y: 0, flags: 0 };

		it('creates pony entity', () => {
			const pony = createPony(account({ _id: '' }), character({ name: 'foo' }), defaultState);

			expect(pony).not.undefined;
			expect(pony.type).equal(entities.pony.type);
		});

		it('sets initial position for character from state', () => {
			const main: CharacterState = { ...defaultState, x: 1, y: 2 };

			const pony = createPony(account({ _id: '' }), character({ name: 'foo' }), main);

			expect(pony.x).eql(1, 'x');
			expect(pony.y).eql(2, 'y');
		});

		it('sets facing from state', () => {
			const main: CharacterState = { ...defaultState, flags: CharacterStateFlags.Right };

			const pony = createPony(account({ _id: '' }), character({ name: 'foo' }), main);

			expect(pony.state).equal(EntityState.FacingRight);
		});

		it('sets extra flag from state', () => {
			const main: CharacterState = { ...defaultState, flags: CharacterStateFlags.Extra };

			const pony = createPony(account({ _id: '' }), character({ name: 'foo' }), main);

			expect(pony.options!.extra).true;
		});

		it('sets held item from state', () => {
			const main: CharacterState = { ...defaultState, hold: 'apple' };

			const pony = createPony(account({ _id: '' }), character({ name: 'foo' }), main);

			expect(pony.options!.hold).equal(entities.apple.type);
		});

		it('ignores held item from state if type is invalid', () => {
			const main: CharacterState = { ...defaultState, hold: 'does_not_exist' };

			const pony = createPony(account({ _id: '' }), character({ name: 'foo' }), main);

			expect(pony.options!.hold).undefined;
		});

		it('sets canCollide flag', () => {
			const pony = createPony(
				account({ _id: genObjectId() }), character({ name: 'foo', info: OFFLINE_PONY }), {} as any);

			expect(hasFlag(pony.flags, EntityFlags.CanCollide)).true;
		});

		it('sets canFly flag to false for ponies without wings', () => {
			const pony = createPony(
				account({ _id: genObjectId() }), character({ name: 'foo', info: OFFLINE_PONY }), {} as any);

			expect(pony.canFly).false;
		});

		it('sets canFly flag to true for ponies with wings', () => {
			const info = 'CAb///9xcXHaICDHx8eqqqq9vb02QAJkJEIFcADAAwgEnAcgQNiMS4A=';
			const pony = createPony(
				account({ _id: genObjectId() }), character({ name: 'foo', info }), {} as any);

			expect(pony.canFly).true;
		});

		it('sets character name', () => {
			const pony = createPony(
				account({ _id: genObjectId() }), character({ name: 'foo', info: OFFLINE_PONY }), {} as any);

			expect(pony.name).equal('foo');
		});

		it('sets extra options name', () => {
			const pony = createPony(
				account({ _id: genObjectId() }), character({ name: 'foo', info: OFFLINE_PONY }), {} as any);

			expect(pony.extraOptions).eql(createExtraOptions(character({ name: 'foo' })));
		});
	});

	describe('updatePony()', () => {
		it('sets name', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId() }), character({ name: 'Foo' }));

			expect(entity.name).equal('Foo');
		});

		it('sets options', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId(), roles: ['mod'] }), character({ name: 'Foo', tag: 'mod' }));

			expect(entity.options).eql({ tag: 'mod' });
		});

		it('sets extra options', () => {
			const entity = serverEntity(1);

			updatePony(
				entity,
				account({ _id: genObjectId() }),
				{ name: 'Foo', auth: { provider: 'github', name: 'FooAcc', url: 'foo.com' } } as any);

			expect(entity.extraOptions).eql({
				ex: true,
				site: {
					provider: 'github',
					name: 'FooAcc',
					url: 'foo.com',
				}
			});
		});

		it('sets canFly flag', () => {
			const entity1 = serverEntity(1);
			const entity2 = serverEntity(2);

			updatePony(entity1, account({ _id: genObjectId() }), character({ name: 'Foo', info: OFFLINE_PONY }));
			updatePony(
				entity2, account({ _id: '' }), character({ name: 'Bar', info: 'DAT/AADapSD/1wC7Li42QAJkJEAT8ADAAxADhAYQFGAQAA==' }));

			expect(entity1.canFly).false;
			expect(entity2.canFly).true;
		});

		it('sets info and encrypted info', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId() }), character({ name: 'Foo', info: OFFLINE_PONY }));

			expect(entity.info).equal(OFFLINE_PONY);
			expect(entity.encryptedInfoSafe).eql(encryptInfo(OFFLINE_PONY));
		});

		it('sets encoded name fields', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId() }), character({ name: 'Fuck Foo' }));

			expect(entity.encodedName).eql(encodeString('Fuck Foo'));
		});

		it('sets info safe fields', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId() }), character({ name: 'Foo', info: OFFLINE_PONY }));

			expect(entity.infoSafe).eql(OFFLINE_PONY);
			expect(entity.encryptedInfoSafe).eql(encryptInfo(OFFLINE_PONY));
		});

		it('sets info safe fields to info with removed CM if bad CM flag is true', () => {
			const entity = serverEntity(1);
			const offlinePonyWithoutCM = 'DAKVlZUvLy82QIxomgCfgAYAGIAoQGEBAA==';

			updatePony(
				entity,
				account({ _id: genObjectId() }),
				character({ name: 'Foo', info: OFFLINE_PONY, flags: CharacterFlags.BadCM }));

			expect(entity.infoSafe).eql(offlinePonyWithoutCM);
			expect(entity.encryptedInfoSafe).eql(encryptInfo(offlinePonyWithoutCM));
		});

		it('sets options', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId() }), character({ name: 'foo' }));

			expect(entity.name).equal('foo');
		});

		it('fills in missing info', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId() }), character({ name: 'foo' }));

			expect(entity.name).equal('foo');
		});

		it('includes tag', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId(), roles: ['mod'] }), character({ name: 'foo', tag: 'mod' }));

			expect(entity.options!.tag).equal('mod');
		});

		it('prioritazes set tag', () => {
			const entity = serverEntity(1);

			updatePony(
				entity,
				account({ _id: genObjectId(), supporter: SupporterFlags.Supporter1, roles: ['mod'] }),
				character({ name: 'foo', tag: 'mod' }));

			expect(entity.options!.tag).equal('mod');
		});

		it('creates supporter tag', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId(), supporter: SupporterFlags.Supporter1 }), character({ name: 'foo' }));

			expect(entity.options!.tag).equal('sup1');
		});

		it('does not create support tag if hide support flag is true', () => {
			const entity = serverEntity(1);

			updatePony(
				entity,
				account({ _id: genObjectId(), supporter: SupporterFlags.Supporter1 }),
				character({ name: 'foo', flags: CharacterFlags.HideSupport }));

			expect(entity.options!.tag).undefined;
		});

		it('does not include tag if role is missing', () => {
			const entity = serverEntity(1);

			updatePony(entity, account({ _id: genObjectId() }), character({ name: 'foo', tag: 'mod' }));

			expect(entity.options!.tag).undefined;
		});
	});

	describe('createExtraOptions()', () => {
		it('sets ex flag', () => {
			expect(createExtraOptions(character({}))).eql({
				ex: true,
			});
		});

		it('sets site object from auth', () => {
			expect(createExtraOptions(character({
				auth: {
					provider: 'github',
					name: 'foo',
					url: 'foo.com',
				} as any,
			}))).eql({
				ex: true,
				site: {
					provider: 'github',
					name: 'foo',
					url: 'foo.com',
				}
			});
		});
	});

	describe('getAndFixCharacterState()', () => {
		it('returns saved state', () => {
			const server = { id: 'srvr' } as any;
			const character = { _id: genObjectId(), state: { srvr: { x: 100, y: 321, map: 'bar' } } } as any;
			const map = { id: 'bar', spawnArea: rect(10, 20, 0, 0) };
			const world = { getMainMap: () => map, getMap: () => map } as any;
			const states = new CounterService<CharacterState>(1);

			const state = getAndFixCharacterState(server, character, world, states);

			expect(state).eql({ x: 100, y: 321, map: 'bar' });
		});

		it('returns state from from counter service if available', () => {
			const server = { id: 'srvr' } as any;
			const character = { _id: genObjectId(), state: { srvr: { x: 100, y: 321, map: 'bar' } } } as any;
			const map = { id: 'bar', spawnArea: rect(10, 20, 0, 0) };
			const world = { getMainMap: () => map, getMap: () => map } as any;
			const states = new CounterService<CharacterState>(1);
			states.add(character._id.toString(), {
				x: 4, y: 7, map: 'foo', flags: CharacterStateFlags.Right | CharacterStateFlags.Extra
			});

			const state = getAndFixCharacterState(server, character, world, states);

			expect(state).eql({ x: 4, y: 7, map: 'foo', flags: CharacterStateFlags.Right | CharacterStateFlags.Extra });
		});

		it('creates default state if none is provided', () => {
			const server = {} as any;
			const character = { _id: genObjectId() } as any;
			const map = { id: 'foo', spawnArea: rect(10, 20, 0, 0) };
			const world = { getMainMap: () => map, getMap: () => map } as any;
			const states = new CounterService<CharacterState>(1);

			const state = getAndFixCharacterState(server, character, world, states);

			expect(state).eql({ x: 10, y: 20, map: 'foo' });
		});

		it('spawns on main map at spawn point if RespawnAtSpawn flag is set', () => {
			const server = { id: 'srvr' } as any;
			const character = {
				_id: genObjectId(),
				state: { srvr: { x: 100, y: 321, map: 'bar' } },
				flags: CharacterFlags.RespawnAtSpawn,
			} as any;
			const map = { id: 'foo', spawnArea: rect(10, 20, 0, 0) };
			const world = { getMainMap: () => map, getMap: () => map } as any;
			const states = new CounterService<CharacterState>(1);

			const state = getAndFixCharacterState(server, character, world, states);

			expect(state).eql({ x: 10, y: 20, map: 'foo' });
		});
	});

	describe('createCharacterState()', () => {
		const map = createServerMap('foo', 0, 1, 1);

		it('returns state of character', () => {
			expect(createCharacterState(entity(0, 12, 23), map)).eql({
				x: 12,
				y: 23,
				map: 'foo',
			});
		});

		it('encodes right flag', () => {
			const state = createCharacterState(entity(0, 12, 23, 0, { state: EntityState.FacingRight }), map);

			expect(hasFlag(state.flags, CharacterStateFlags.Right)).true;
		});

		it('encodes held object', () => {
			const state = createCharacterState(entity(0, 12, 23, 0, { options: { hold: entities.apple.type } }), map);

			expect(state.hold).equal('apple');
		});

		it('encodes extra flag', () => {
			const state = createCharacterState(entity(0, 12, 23, 0, { options: { extra: true } }), map);

			expect(hasFlag(state.flags, CharacterStateFlags.Extra)).true;
		});
	});
});
