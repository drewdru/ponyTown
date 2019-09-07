import { expect } from 'chai';
import { useFakeTimers, SinonFakeTimers, SinonStub, stub, assert } from 'sinon';
import {
	createClient, createIgnorePlayer, findClientByEntityId, setEntityExpression, interactWith,
	cancelEntityExpression, canPerformAction, createClientAndPony, addIgnore, turnHead, boop, stand,
	sit, lie, fly, expressionAction, isIgnored, resetClientUpdates, holdItem, unholdItem, holdToy, unholdToy
} from '../../server/playerUtils';
import { mockClient, clientPony, serverEntity, genObjectId, setupCollider } from '../mocks';
import { IClient } from '../../server/serverInterfaces';
import { createFunctionWithPromiseHandler } from '../lib';
import { parseExpression } from '../../common/expressionUtils';
import { encodeExpression, decodeExpression, EMPTY_EXPRESSION } from '../../common/encoders/expressionEncoder';
import { EXPRESSION_TIMEOUT } from '../../common/constants';
import { CharacterState } from '../../common/adminInterfaces';
import { Action, PonyOptions, EntityState, UpdateFlags } from '../../common/interfaces';
import { createServerRegion } from '../../server/serverRegion';
import { rect } from '../../common/rect';
import { CounterService } from '../../server/services/counter';
import { createCamera } from '../../common/camera';
import { getRegion } from '../../common/worldMap';
import { createServerMap } from '../../server/serverMap';
import { createBinaryWriter, getWriterBuffer } from 'ag-sockets';
import { sendAction } from '../../server/entityUtils';
import { updateColliders } from '../common/collision.spec';

describe('playerUtils', () => {
	const def = { x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: undefined };

	let client: IClient;

	beforeEach(() => {
		client = mockClient();
	});

	describe('isIgnored()', () => {
		it('returns true if target account id is on ignored list', () => {
			expect(isIgnored({ accountId: 'foo' } as any, { ignores: new Set(['foo']) } as any)).true;
		});

		it('returns false if target account id is not on ignored list', () => {
			expect(isIgnored({ accountId: 'foo' } as any, { ignores: new Set(['bar']) } as any)).false;
		});

		it('returns false if account ignore list is empty', () => {
			expect(isIgnored({ accountId: 'foo' } as any, { ignores: new Set() } as any)).false;
		});

		it('returns false if account does not have ignore list', () => {
			expect(isIgnored({ accountId: 'foo' } as any, { ignores: new Set() } as any)).false;
		});
	});

	describe('createClientAndPony()', () => {
		it('sets up client and pony', () => {
			const account = { _id: genObjectId() };
			const character = { _id: genObjectId(), name: 'Foo' };
			const client = {
				tokenData: { account, character },
			} as any;
			const map = { spawnArea: rect(0, 0, 0, 0) };
			const world = {
				getMainMap: () => map,
				getMap: () => map,
				isColliding: stub(),
			};

			createClientAndPony(client, [], [], { name: 'test' } as any, world as any, new CounterService<CharacterState>(1));

			// ...
		});
	});

	describe('createClient()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
			clock.setSystemTime(123);
		});

		afterEach(() => {
			clock.restore();
		});

		it('initializes client fields', () => {
			const originalRequest = { headers: { 'user-agent': 'test' } };
			const client = { originalRequest } as any;
			const account = { _id: genObjectId(), _account: 1, name: 'Foo' } as any;
			const character = { _id: genObjectId(), _character: 1, name: 'Im :apple:' } as any;
			const pony = { _pony: 1, x: 10, y: 20 } as any;
			const reporter = { _reporter: 1 } as any;
			const origin = { ip: '', country: 'XY' };
			const map = {} as any;

			const result = createClient(client, account, [], [], character, pony, map, reporter, origin);

			expect(result).equal(client);
			expect(result).eql({
				accountId: account._id.toString(),
				accountName: 'Foo',
				characterId: character._id.toString(),
				characterName: 'Im 🍎',
				ignores: new Set(),
				hides: new Set(),
				permaHides: new Set(),
				friends: new Set(),
				friendsCRC: undefined,
				accountSettings: {},
				originalRequest,
				supporterLevel: 0,
				isMod: false,
				userAgent: 'test',
				reporter,
				account,
				character,
				ip: '',
				map,
				isSwitchingMap: false,
				pony,
				notifications: [],
				updateQueue: createBinaryWriter(128),
				regionUpdates: [],
				saysQueue: [],
				unsubscribes: [],
				subscribes: [],
				regions: [],
				camera: Object.assign(createCamera(), { w: 800, h: 600 }),
				lastSays: [],
				lastSwap: 0,
				shadowed: false,
				country: 'XY',
				safeX: 10,
				safeY: 20,
				lastPacket: 123,
				lastAction: 0,
				lastBoopAction: 0,
				lastExpressionAction: 0,
				lastX: 10,
				lastY: 20,
				lastTime: 0,
				lastVX: 0,
				lastVY: 0,
				lastCameraX: 0,
				lastCameraY: 0,
				lastCameraW: 0,
				lastCameraH: 0,
				lastMapSwitch: 0,
				sitCount: 0,
				lastSitX: 0,
				lastSitY: 0,
				lastSitTime: 0,
				lastMapLoadOrSave: 0,
				positions: [],
			});
		});

		it('sets shadowed field if is shadowed', () => {
			const originalRequest = { headers: { 'user-agent': 'test' } };
			const client = { originalRequest } as any;
			const account = { _id: genObjectId(), shadow: -1 } as any;
			const character = { _id: genObjectId() } as any;
			const pony = {} as any;
			const reporter = {} as any;
			const map = {} as any;

			const result = createClient(client, account, [], [], character, pony, map, reporter, undefined);

			expect(result.shadowed).true;
			expect(result.country).equal('??');
		});
	});

	describe('resetClientUpdates()', () => {
		it('resets all queues', () => {
			const client = mockClient();
			client.updateQueue.offset = 100;
			client.regionUpdates.push({} as any);
			client.saysQueue.push({} as any);
			client.unsubscribes.push({} as any);
			client.subscribes.push({} as any);

			resetClientUpdates(client);

			expect(client.updateQueue.offset).equal(0);
			expect(client.regionUpdates).eql([]);
			expect(client.saysQueue).eql([]);
			expect(client.unsubscribes).eql([]);
			expect(client.subscribes).eql([]);
		});
	});

	describe('ignorePlayer()', () => {
		let ignorePlayer: (client: IClient, target: IClient, ignored: boolean) => void;
		let updateAccount: SinonStub;

		beforeEach(() => {
			updateAccount = stub().resolves();
			ignorePlayer = createFunctionWithPromiseHandler(createIgnorePlayer, updateAccount);
		});

		it('adds client to targets ignores list', async () => {
			const client = mockClient();
			const target = mockClient();

			await ignorePlayer(client, target, true);

			assert.calledWithMatch(updateAccount, target.accountId, { $push: { ignores: client.accountId } });
		});

		it('removes client from targets ignores list', async () => {
			const client = mockClient();
			const target = mockClient();
			addIgnore(target, client.accountId);

			await ignorePlayer(client, target, false);

			assert.calledWithMatch(updateAccount, target.accountId, { $pull: { ignores: client.accountId } });
		});

		it('does nothing if already ignored', async () => {
			const client = mockClient();
			const target = mockClient();
			addIgnore(target, client.accountId);

			await ignorePlayer(client, target, true);

			assert.notCalled(updateAccount);
		});

		it('does nothing if already unignored', async () => {
			const client = mockClient();
			const target = mockClient();

			await ignorePlayer(client, target, false);

			assert.notCalled(updateAccount);
		});

		it('does nothing if called for self', async () => {
			const client = mockClient();

			await ignorePlayer(client, client, true);

			assert.notCalled(updateAccount);
		});

		it('adds client to targets account instance ignores list', async () => {
			const client = mockClient();
			const target = mockClient();
			target.account.ignores = undefined;

			await ignorePlayer(client, target, true);

			expect(target.account.ignores).eql([client.accountId]);
		});

		it('removes client from targets account instance ignores list', async () => {
			const client = mockClient();
			const target = mockClient();
			addIgnore(target, client.accountId);

			await ignorePlayer(client, target, false);

			expect(target.account.ignores).eql([]);
		});

		it('sends target player state update to client', async () => {
			const client = mockClient();
			const target = mockClient();
			target.pony.id = 123;

			await ignorePlayer(client, target, true);

			expect(Array.from(getWriterBuffer(client.updateQueue)))
				.eql([2, 4, 0, 0, 0, 0, 123, 1]);
		});
	});

	describe('findClientByEntityId()', () => {
		it('returns client from selected pony', () => {
			const self = mockClient();
			const client = mockClient();
			self.selected = client.pony;

			expect(findClientByEntityId(self, client.pony.id)).equal(client);
		});

		it('returns client from party clients', () => {
			const self = mockClient();
			const client = mockClient();
			self.party = {
				id: '',
				clients: [client],
				leader: client,
				pending: [],
			};

			expect(findClientByEntityId(self, client.pony.id)).equal(client);
		});

		it('returns client from party pending', () => {
			const self = mockClient();
			const client = mockClient();
			self.party = {
				id: '',
				clients: [],
				leader: client,
				pending: [{ client, notificationId: 0 }],
			};

			expect(findClientByEntityId(self, client.pony.id)).equal(client);
		});

		it('returns undefined if not found in party', () => {
			const self = mockClient();
			const client = mockClient();
			self.party = {
				id: '',
				clients: [],
				leader: mockClient(),
				pending: [],
			};

			expect(findClientByEntityId(self, client.pony.id)).undefined;
		});

		it('returns client from notifications', () => {
			const self = mockClient();
			const client = mockClient();
			self.notifications = [
				{ id: 0, name: 'name', message: '', entityId: client.pony.id, sender: client },
			];

			expect(findClientByEntityId(self, client.pony.id)).equal(client);
		});

		it('returns undefined if not found', () => {
			const self = mockClient();

			expect(findClientByEntityId(self, 1)).undefined;
		});
	});

	describe('cancelEntityExpression()', () => {
		it('cancels expression', () => {
			const entity = serverEntity(0);
			entity.options = { expr: 1234 } as PonyOptions;
			entity.exprCancellable = true;
			entity.exprPermanent = decodeExpression(1111);

			cancelEntityExpression(entity);

			expect(entity.options).eql({ expr: 1111 });
			expect(entity.exprCancellable).false;
		});

		it('does nothing if entity does not have cancellable expression', () => {
			const entity = serverEntity(0);
			entity.options = { expr: 1234 } as PonyOptions;

			cancelEntityExpression(entity);

			expect(entity.options).eql({ expr: 1234 });
		});
	});

	describe('setEntityExpression()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('sets expression on pony options', () => {
			const pony = clientPony();
			const expression = parseExpression(':)');

			setEntityExpression(pony, expression);

			expect(pony.options!.expr).equal(encodeExpression(expression));
		});

		it('sets empty expression by default', () => {
			const pony = clientPony();

			setEntityExpression(pony, undefined);

			expect(pony.options!.expr).equal(encodeExpression(undefined));
		});

		it('uses permanent expression if no expression provided', () => {
			const pony = clientPony();
			const expression = parseExpression(':)');
			pony.exprPermanent = expression;

			setEntityExpression(pony, undefined);

			expect(pony.options!.expr).equal(encodeExpression(expression));
		});

		it('sets default expression timeout', () => {
			const pony = clientPony();
			clock.setSystemTime(1234);

			setEntityExpression(pony, parseExpression(':)'));

			expect(pony.exprTimeout).equal(1234 + EXPRESSION_TIMEOUT);
		});

		it('sets custom expression timeout if provided', () => {
			const pony = clientPony();
			clock.setSystemTime(1234);

			setEntityExpression(pony, parseExpression(':)'), 123);

			expect(pony.exprTimeout).equal(1234 + 123);
		});

		it('unsets expression timeout if given 0 for timeout', () => {
			const pony = clientPony();
			pony.exprTimeout = 1234;

			setEntityExpression(pony, parseExpression(':)'), 0);

			expect(pony.exprTimeout).undefined;
		});

		it('sets expression cancellable flag', () => {
			const pony = clientPony();

			setEntityExpression(pony, parseExpression(':)'), 123, true);

			expect(pony.exprCancellable).true;
		});

		it('sets expression cancellable flag', () => {
			const pony = clientPony();

			setEntityExpression(pony, parseExpression(':)'), 123, false);

			expect(pony.exprCancellable).false;
		});

		it('adds expression to region updates', () => {
			const entity = clientPony();
			const region = createServerRegion(0, 0);
			entity.region = region;

			setEntityExpression(entity, parseExpression(':)'), 123, false);

			expect(region.entityUpdates).eql([
				{ entity, flags: UpdateFlags.Expression, x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: undefined },
			]);
		});

		it('sends expression update to user instead of region updates for shadowed client', () => {
			const pony = clientPony();
			pony.region = createServerRegion(0, 0);
			pony.client!.shadowed = true;
			pony.id = 123;

			setEntityExpression(pony, parseExpression(':)'), 123, false);

			expect(Array.from(getWriterBuffer(pony.client!.updateQueue)))
				.eql([2, 0, 8, 0, 0, 0, 123, 0, 0, 4, 32]);
		});
	});

	describe('interactWith()', () => {
		it('calls interact method on target', () => {
			const client = mockClient();
			const interact = stub();
			const target = serverEntity(1, 0, 0, 1, { interact });

			interactWith(client, target);

			assert.calledWith(interact, target, client);
		});

		it('calls interact method on target if within range', () => {
			const client = mockClient();
			const interact = stub();
			const target = serverEntity(1, 10, 10, 1, { interact, interactRange: 5 });
			client.pony.x = 9;
			client.pony.y = 11;

			interactWith(client, target);

			assert.calledWith(interact, target, client);
		});

		it('does not call interact if out of range', () => {
			const client = mockClient();
			const interact = stub();
			const target = serverEntity(1, 10, 10, 1, { interact, interactRange: 5 });
			client.pony.x = 2;
			client.pony.y = 1;

			interactWith(client, target);

			assert.notCalled(interact);
		});

		it('does nothing for undefined entity', () => {
			interactWith(mockClient(), undefined);
		});

		it('does nothing for entity without interact', () => {
			interactWith(mockClient(), serverEntity(1));
		});
	});

	describe('canPerformAction()', () => {
		it('returns true if last action date is below current time', () => {
			expect(canPerformAction(mockClient({ lastAction: 1234 }))).true;
		});

		it('returns false if last action date is ahead or current time', () => {
			expect(canPerformAction(mockClient({ lastAction: Date.now() + 1000 }))).false;
		});
	});

	describe('sendAction()', () => {
		it('adds action to region', () => {
			const entity = serverEntity(1);
			const region = createServerRegion(0, 0);
			entity.region = region;

			sendAction(entity, Action.Boop);

			expect(region.entityUpdates).eql([
				{
					entity, flags: UpdateFlags.Action, x: 0, y: 0, vx: 0, vy: 0, action: Action.Boop,
					playerState: 0, options: undefined,
				},
			]);
		});

		it('sends only to entity client if shadowed', () => {
			const client = mockClient();
			client.shadowed = true;
			const entity = client.pony;
			const region = createServerRegion(0, 0);
			entity.region = region;
			entity.region.clients.push(mockClient(), client);
			client.pony.id = 123;

			sendAction(entity, Action.Boop);

			expect(Array.from(getWriterBuffer(client.updateQueue))).eql([2, 0, 128, 0, 0, 0, 123, 1]);
			expect(region.entityUpdates).eql([]);
		});
	});

	describe('boop()', () => {
		let client: IClient;

		beforeEach(() => {
			client = mockClient();
			client.map = createServerMap('foo', 0, 1, 1);
			client.pony.region = client.map.regions[0];
			client.lastAction = 0;
		});

		it('sends boop action', () => {
			boop(client, 1000);

			expect(client.pony.region!.entityUpdates).eql([
				{
					entity: client.pony, flags: UpdateFlags.Action, x: 0, y: 0, vx: 0, vy: 0, action: Action.Boop,
					playerState: 0, options: undefined,
				},
			]);
		});

		it('cancels expression', () => {
			client.pony.exprCancellable = true;
			client.pony.options!.expr = 123;

			boop(client, 1000);

			expect(client.pony.options!.expr).equal(EMPTY_EXPRESSION);
		});

		it('updates last boop action', () => {
			client.lastBoopAction = 0;

			boop(client, 100);

			expect(client.lastBoopAction).equal(100 + 500);
		});

		it('executes boop on found entity', () => {
			const boop = stub();
			client.pony.x = 5;
			client.pony.y = 5;
			getRegion(client.map, 0, 0).entities.push(serverEntity(0, 4.2, 5, 0, { boop }));

			boop(client);

			assert.calledWith(boop, client);
		});

		it('does not execute boop on found entity if shadowed', () => {
			const stubBoop = stub();
			client.pony.x = 5;
			client.pony.y = 5;
			client.shadowed = true;
			getRegion(client.map, 0, 0).entities.push(serverEntity(0, 4.2, 5, 0, { boop: stubBoop }));

			boop(client, 0);

			assert.notCalled(stubBoop);
		});

		it('does nothing if cannot perform action', () => {
			client.lastAction = 1000;

			boop(client, 0);

			expect(client.pony.region!.entityUpdates).eql([]);
		});

		it('does nothing if moving', () => {
			client.pony.vx = 1;

			boop(client, 0);

			expect(client.pony.region!.entityUpdates).eql([]);
		});
	});

	describe('turnHead()', () => {
		it('updates HeadTurned flag', () => {
			const client = mockClient();
			client.pony.state = 0;

			turnHead(client);

			expect(client.pony.state).equal(EntityState.HeadTurned);
		});

		it('does not update flags if cannot perform action', () => {
			const client = mockClient();
			client.lastAction = Date.now() + 1000;
			client.pony.state = 0;

			turnHead(client);

			expect(client.pony.state).equal(0);
		});
	});

	describe('stand()', () => {
		beforeEach(() => {
			client.pony.exprCancellable = true;
			client.pony.options!.expr = 123;
		});

		it('updates entity flag to standing', () => {
			client.pony.state = EntityState.PonySitting;

			stand(client);

			expect(client.pony.state).equal(EntityState.PonyStanding);
		});

		it('does not change other entity flags', () => {
			client.pony.state = EntityState.PonySitting | EntityState.FacingRight;

			stand(client);

			expect(client.pony.state).equal(EntityState.PonyStanding | EntityState.FacingRight);
		});

		it('cancels expression', () => {
			client.pony.state = EntityState.PonySitting;

			stand(client);

			expect(client.pony.options!.expr).equal(EMPTY_EXPRESSION);
		});

		it('does not cancel expression if transitioning from flying', () => {
			client.pony.state = EntityState.PonyFlying;

			stand(client);

			expect(client.pony.options!.expr).equal(123);
		});

		it('does nothing if already standing', () => {
			client.pony.state = EntityState.PonyStanding;

			stand(client);

			expect(client.pony.state).equal(EntityState.PonyStanding);
			expect(client.pony.options!.expr).equal(123);
		});

		it('does nothing if cannot perform action', () => {
			client.lastAction = Date.now() + 1000;
			client.pony.state = 0;

			stand(client);

			expect(client.pony.state).equal(0);
			expect(client.pony.options!.expr).equal(123);
		});

		it('does nothing if cannot land', () => {
			client.pony.state = EntityState.PonyFlying;
			client.pony.x = 0.5;
			client.pony.y = 0.5;
			setupCollider(client.map, 0.5, 0.5);
			updateColliders(client.map);

			stand(client);

			expect(client.pony.state).equal(EntityState.PonyFlying);
			expect(client.pony.options!.expr).equal(123);
		});
	});

	describe('sit()', () => {
		it('updates entity flag to sitting', () => {
			client.pony.state = EntityState.PonyStanding;

			sit(client, {});

			expect(client.pony.state).equal(EntityState.PonySitting);
		});

		it('does not change other entity flags', () => {
			client.pony.state = EntityState.PonyStanding | EntityState.FacingRight;

			sit(client, {});

			expect(client.pony.state).equal(EntityState.PonySitting | EntityState.FacingRight);
		});

		it('does nothing if already sitting', () => {
			client.pony.state = EntityState.PonySitting;

			sit(client, {});

			expect(client.pony.state).equal(EntityState.PonySitting);
		});

		it('does nothing if cannot perform action', () => {
			client.lastAction = Date.now() + 1000;
			client.pony.state = 0;

			sit(client, {});

			expect(client.pony.state).equal(0);
		});

		it('does nothing if moving', () => {
			client.pony.vx = 1;
			client.pony.state = 0;

			sit(client, {});

			expect(client.pony.state).equal(0);
		});
	});

	describe('lie()', () => {
		it('updates entity flag to lying', () => {
			client.pony.state = EntityState.PonyStanding;

			lie(client);

			expect(client.pony.state).equal(EntityState.PonyLying);
		});

		it('does not change other entity flags', () => {
			client.pony.state = EntityState.PonyStanding | EntityState.FacingRight;

			lie(client);

			expect(client.pony.state).equal(EntityState.PonyLying | EntityState.FacingRight);
		});

		it('does nothing if already lying', () => {
			client.pony.state = EntityState.PonyLying;

			lie(client);

			expect(client.pony.state).equal(EntityState.PonyLying);
		});

		it('does nothing if cannot perform action', () => {
			client.lastAction = Date.now() + 1000;
			client.pony.state = 0;

			lie(client);

			expect(client.pony.state).equal(0);
		});

		it('does nothing if moving', () => {
			client.pony.vx = 1;
			client.pony.state = 0;

			lie(client);

			expect(client.pony.state).equal(0);
		});
	});

	describe('fly()', () => {
		beforeEach(() => {
			client.pony.canFly = true;
			client.pony.exprCancellable = true;
			client.pony.options!.expr = 123;
		});

		it('updates entity flag to flying', () => {
			client.pony.state = EntityState.PonyStanding;

			fly(client);

			expect(client.pony.state).equal(EntityState.PonyFlying | EntityState.Flying);
		});

		it('does not change other entity flags', () => {
			client.pony.state = EntityState.PonyStanding | EntityState.FacingRight;

			fly(client);

			expect(client.pony.state).equal(EntityState.PonyFlying | EntityState.FacingRight | EntityState.Flying);
		});

		it('cancels expression', () => {
			fly(client);

			expect(client.pony.options!.expr).equal(EMPTY_EXPRESSION);
		});

		it('does nothing if already flying', () => {
			client.lastAction = Date.now() + 1000;
			client.pony.state = EntityState.PonyFlying;

			fly(client);

			expect(client.pony.state).equal(EntityState.PonyFlying);
			expect(client.pony.options!.expr).equal(123);
		});

		it('does nothing if cannot perform action', () => {
			client.lastAction = Date.now() + 1000;
			client.pony.state = 0;

			fly(client);

			expect(client.pony.state).equal(0);
			expect(client.pony.options!.expr).equal(123);
		});

		it('does nothing if cannot fly', () => {
			client.pony.canFly = false;
			client.pony.state = 0;

			fly(client);

			expect(client.pony.state).equal(0);
			expect(client.pony.options!.expr).equal(123);
		});
	});

	describe('expressionAction()', () => {
		beforeEach(() => {
			client.pony.region = createServerRegion(1, 1);
			client.pony.exprCancellable = true;
			client.pony.options!.expr = 123;
		});

		it('sends given action', () => {
			expressionAction(client, Action.Yawn);

			expect(client.pony.region!.entityUpdates).eql([
				{ ...def, entity: client.pony, flags: UpdateFlags.Expression | UpdateFlags.Action, action: Action.Yawn },
			]);
		});

		it('cancels expression', () => {
			expressionAction(client, Action.Yawn);

			expect(client.pony.options!.expr).equal(EMPTY_EXPRESSION);
		});

		it('does nothing if cannot perform action', () => {
			client.lastAction = Date.now() + 1000;

			expressionAction(client, Action.Yawn);

			expect(client.pony.region!.entityUpdates).eql([]);
		});

		it('does nothing if not expression action', () => {
			client.pony.canFly = false;

			expressionAction(client, Action.Boop);

			expect(client.pony.region!.entityUpdates).eql([]);
		});

		it('updates last expression action', () => {
			client.lastExpressionAction = 0;

			expressionAction(client, Action.Yawn);

			expect(client.lastExpressionAction).greaterThan(Date.now());
		});
	});

	describe('holdItem()', () => {
		it('updates entity options', () => {
			const entity = serverEntity(123);

			holdItem(entity, 456);

			expect(entity.options).eql({ hold: 456 });
		});

		it('sends entity update', () => {
			const entity = serverEntity(123);
			const region = createServerRegion(1, 1);
			entity.region = region;

			holdItem(entity, 456);

			expect(region.entityUpdates).eql([
				{ ...def, entity, flags: UpdateFlags.Options, options: { hold: 456 } },
			]);
		});

		it('does not send entity update if hold is already set', () => {
			const entity = serverEntity(123);
			const region = createServerRegion(1, 1);
			entity.region = region;
			entity.options = { hold: 456 };

			holdItem(entity, 456);

			expect(region.entityUpdates).eql([]);
		});
	});

	describe('unholdItem()', () => {
		it('updates entity options', () => {
			const entity = serverEntity(123);
			entity.options = { hold: 456 };

			unholdItem(entity);

			expect(entity.options).eql({});
		});

		it('sends entity update', () => {
			const entity = serverEntity(123);
			const region = createServerRegion(1, 1);
			entity.region = region;
			entity.options = { hold: 456 };

			unholdItem(entity);

			expect(region.entityUpdates).eql([
				{ ...def, entity, flags: UpdateFlags.Options, options: { hold: 0 } },
			]);
		});

		it('does not send entity update if hold is not set', () => {
			const entity = serverEntity(123);
			const region = createServerRegion(1, 1);
			entity.region = region;

			unholdItem(entity);

			expect(region.entityUpdates).eql([]);
		});
	});

	describe('holdToy()', () => {
		it('updates entity options', () => {
			const entity = serverEntity(123);

			holdToy(entity, 456);

			expect(entity.options).eql({ toy: 456 });
		});

		it('sends entity update', () => {
			const entity = serverEntity(123);
			const region = createServerRegion(1, 1);
			entity.region = region;

			holdToy(entity, 456);

			expect(region.entityUpdates).eql([
				{ ...def, entity, flags: UpdateFlags.Options, options: { toy: 456 } },
			]);
		});

		it('does not send entity update if hold is already set', () => {
			const entity = serverEntity(123);
			const region = createServerRegion(1, 1);
			entity.region = region;
			entity.options = { toy: 456 };

			holdToy(entity, 456);

			expect(region.entityUpdates).eql([]);
		});
	});

	describe('unholdToy()', () => {
		it('updates entity options', () => {
			const entity = serverEntity(123);
			entity.options = { toy: 456 };

			unholdToy(entity);

			expect(entity.options).eql({});
		});

		it('sends entity update', () => {
			const entity = serverEntity(123);
			const region = createServerRegion(1, 1);
			entity.region = region;
			entity.options = { toy: 456 };

			unholdToy(entity);

			expect(region.entityUpdates).eql([
				{ ...def, entity, flags: UpdateFlags.Options, options: { toy: 0 } },
			]);
		});

		it('does not send entity update if toy is not set', () => {
			const entity = serverEntity(123);
			const region = createServerRegion(1, 1);
			entity.region = region;

			unholdToy(entity);

			expect(region.entityUpdates).eql([]);
		});
	});
});
