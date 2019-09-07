import '../lib';
import { expect } from 'chai';
import { stub, assert, SinonStub } from 'sinon';
import { encodeMovement } from '../../common/movementUtils';
import { Move, createMove } from '../../server/move';
import { stubClass, resetStubMethods } from '../lib';
import { IClient } from '../../server/serverInterfaces';
import { mockClient } from '../mocks';
import { CounterService } from '../../server/services/counter';
import { EntityState, Camera, UpdateFlags } from '../../common/interfaces';
import { createCamera } from '../../common/camera';
import { EMPTY_EXPRESSION } from '../../common/encoders/expressionEncoder';
import { createServerRegion } from '../../server/serverRegion';
import { createServerMap } from '../../server/serverMap';
import { rect } from '../../common/rect';
import { PONY_SPEED_TROT } from '../../common/constants';
import * as collision from '../../common/collision';

describe('move', () => {
	describe('move()', () => {
		let camera: Camera;
		let client: IClient;
		let counter = stubClass<CounterService<void>>(CounterService);
		let move: Move;
		let isStaticCollision: SinonStub;

		beforeEach(() => {
			resetStubMethods(counter, 'add', 'remove');

			isStaticCollision = stub(collision, 'isStaticCollision');
			camera = createCamera();
			client = mockClient();
			client.map = createServerMap('', 0, 10, 10);
			move = createMove(counter as any);
		});

		afterEach(() => {
			isStaticCollision.restore();
		});

		it('does nothing if loading flag is true', () => {
			client.loading = true;

			move(client, 0, 1, 2, 3, 4, 5, {});

			expect(client.pony.x).equal(0, 'x');
			expect(client.pony.y).equal(0, 'y');
		});

		it('does nothing if fixing position', () => {
			client.loading = true;

			move(client, 0, 1, 2, 3, 4, 5, {});

			expect(client.pony.x).equal(0, 'x');
			expect(client.pony.y).equal(0, 'y');
		});

		it('updates pony coordinates', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.None, 123, camera);

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.x).equal(12.015625, 'x');
			expect(client.pony.y).equal(34.020833333333336, 'y');
		});

		it('updates last coordinates, velocity and time', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.None, 123, camera);

			move(client, 0, a, b, c, d, e, {});

			expect(client.lastX).equal(12.015625, 'lastX');
			expect(client.lastY).equal(34.020833333333336, 'lastY');
			expect(client.lastVX).equal(0, 'lastVX');
			expect(client.lastVY).equal(0, 'lastVY');
			expect(client.lastTime).equal(123, 'lastTime');
		});

		it('updates pony coordinates (has last time)', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.None, 123, camera);
			client.lastTime = 1;

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.x).equal(12.015625, 'x');
			expect(client.pony.y).equal(34.020833333333336, 'y');
		});

		it('updates pony velocity', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 123, camera);

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.vx).equal(PONY_SPEED_TROT, 'vx');
			expect(client.pony.vy).equal(-PONY_SPEED_TROT, 'vy');
		});

		it('updates safe position if not colliding', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 123, camera);
			isStaticCollision.returns(false);
			client.pony.x = 10;
			client.pony.y = 30;

			move(client, 0, a, b, c, d, e, {});

			expect(client.safeX).equal(10, 'safeX');
			expect(client.safeY).equal(30, 'safeY');
			assert.calledWith(isStaticCollision, client.pony, client.map, true);
		});

		it('does not update safe position if colliding', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 123, camera);
			isStaticCollision.returns(false);
			isStaticCollision.withArgs(client.pony, client.map, true).returns(true);
			client.pony.x = 10;
			client.pony.y = 30;
			client.safeX = 1;
			client.safeY = 3;

			move(client, 0, a, b, c, d, e, {});

			expect(client.safeX).equal(1, 'safeX');
			expect(client.safeY).equal(3, 'safeY');
		});

		it('resets pony to safe position if colliding', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 123, camera);
			const fixPositionStub = stub(client, 'fixPosition');
			isStaticCollision.onCall(0).returns(true);
			isStaticCollision.onCall(1).returns(true);
			isStaticCollision.onCall(2).returns(false);
			client.safeX = 1;
			client.safeY = 3;

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.x).equal(1, 'x');
			expect(client.pony.y).equal(3, 'y');
			assert.calledWith(fixPositionStub, 1, 3, false);
		});

		it('does not reset pony to safe position if safe position is colliding', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 123, camera);
			const fixPositionStub = stub(client, 'fixPosition');
			isStaticCollision.onCall(0).returns(true);
			isStaticCollision.onCall(1).returns(true);
			isStaticCollision.onCall(2).returns(true);
			client.safeX = 1;
			client.safeY = 3;

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.x).equal(12.015625, 'x');
			expect(client.pony.y).equal(34.020833333333336, 'y');
			assert.notCalled(fixPositionStub);
		});

		it('updates pony right flag', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 123, camera);

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.state).equal(EntityState.FacingRight, 'flags');
		});

		it('resets head turned flag if turning', () => {
			client.pony.state = EntityState.HeadTurned;
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 123, camera);

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.state).equal(EntityState.FacingRight, 'flags');
		});

		it('resets sitting flag', () => {
			client.pony.state = EntityState.PonySitting;
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 123, camera);

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.state).equal(EntityState.FacingRight, 'flags');
		});

		it('adds entity update', () => {
			const region = createServerRegion(0, 0);
			client.pony.region = region;
			const [a, b, c, d, e] = encodeMovement(0, 0, 0, 0, 0, rect(0, 0, 0, 0));

			move(client, 0, a, b, c, d, e, {});

			expect(region.entityUpdates).eql([
				{
					entity: client.pony, flags: UpdateFlags.Position | UpdateFlags.State,
					x: 0.015625, y: 0.020833333333333332, vx: 0, vy: -0,
					action: 0, playerState: 0, options: undefined
				},
			]);
		});

		it('clears cancellable expression', () => {
			client.pony.exprCancellable = true;
			client.pony.options!.expr = 123;

			const [a, b, c, d, e] = encodeMovement(0, 0, 0, 0, 0, rect(0, 0, 0, 0));
			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.options!.expr).equal(EMPTY_EXPRESSION);
			expect(client.pony.exprCancellable).false;
		});

		it('reports client outside the map', () => {
			const [a, b, c, d, e] = encodeMovement(10000, 10000, 0, EntityState.None, 123, camera);
			const warn = stub(client.reporter, 'warn');
			Object.assign(client.map, { id: 'foo', width: 100, height: 100 });

			move(client, 0, a, b, c, d, e, {});

			assert.calledWith(warn, 'Outside map', 'map: [foo] coords: [10000.02, 10000.02]');
		});

		it('logs client outside the map', () => {
			const [a, b, c, d, e] = encodeMovement(10000, 10000, 0, EntityState.None, 123, camera);
			Object.assign(client.map, { id: 'foo', width: 100, height: 100 });

			move(client, 0, a, b, c, d, e, {});

			expect(client.leaveReason).equal('outside map: [foo] coords: [10000.02, 10000.02]');
		});

		it('disconnects client outside the map', () => {
			const [a, b, c, d, e] = encodeMovement(10000, 10000, 0, EntityState.None, 123, camera);
			const disconnect = stub(client, 'disconnect');
			Object.assign(client.map, { id: 'foo', width: 100, height: 100 });

			move(client, 0, a, b, c, d, e, {});

			assert.calledWith(disconnect, true, true);
		});

		it('does not update pony position when coordinates are outside the map', () => {
			const [a, b, c, d, e] = encodeMovement(10000, 10000, 0, EntityState.None, 123, camera);
			Object.assign(client.map, { width: 100, height: 100 });

			move(client, 0, a, b, c, d, e, {});

			expect(client.pony.x).equal(0, 'x');
			expect(client.pony.y).equal(0, 'y');
		});

		it('logs lagging player if logLagging setting is true', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 16000, camera);
			const systemLog = stub(client.reporter, 'systemLog');
			client.account.name = 'Foo';
			client.accountId = 'foo';

			move(client, 0, a, b, c, d, e, { logLagging: true });

			assert.calledWith(systemLog, 'Time delta > 15s (16000)');
			expect(client.logDisconnect).true;
		});

		it('kicks player for lagging if kickLagging setting is true', () => {
			const [a, b, c, d, e] = encodeMovement(12, 34, 2, EntityState.PonyTrotting, 16000, camera);
			const disconnect = stub(client, 'disconnect');

			move(client, 0, a, b, c, d, e, { kickLagging: true });

			assert.calledWith(disconnect, true, true);
			expect(client.leaveReason).equal('lagging');
		});

		it('counts teleporting', () => {
			const [a, b, c, d, e] = encodeMovement(10, 10, 2, EntityState.PonyTrotting, 1001, camera);
			counter.add.returns({ count: 1, items: [], date: 0 });
			Object.assign(client, { lastX: 0, lastY: 0, lastVX: 0, lastVY: 0, lastTime: 1 });

			move(client, 0, a, b, c, d, e, { reportTeleporting: true });

			assert.calledWith(counter.add, client.accountId);
		});

		it('reports teleporting if counter exceeded limit', () => {
			const [a, b, c, d, e] = encodeMovement(10, 10, 2, EntityState.PonyTrotting, 1001, camera);
			counter.add.returns({ count: 20, items: [], date: 0 });
			Object.assign(client, { lastX: 0, lastY: 0, lastVX: 0, lastVY: 0, lastTime: 1 });
			const warn = stub(client.reporter, 'warn');

			move(client, 0, a, b, c, d, e, { reportTeleporting: true });

			assert.calledWith(counter.add, client.accountId);
			assert.calledWith(counter.remove, client.accountId);
			assert.calledWith(warn, 'Teleporting (x10)');
		});

		it('kicks player for teleporting', () => {
			const [a, b, c, d, e] = encodeMovement(10, 10, 2, EntityState.PonyTrotting, 1001, camera);
			const disconnect = stub(client, 'disconnect');
			Object.assign(client, { lastX: 0, lastY: 0, lastVX: 0, lastVY: 0, lastTime: 1 });

			move(client, 0, a, b, c, d, e, { kickTeleporting: true });

			assert.calledWith(disconnect, true, true);
			expect(client.leaveReason).equal('teleporting');
		});

		it('fixes player position if teleporting', () => {
			const [a, b, c, d, e] = encodeMovement(10, 10, 2, EntityState.PonyTrotting, 1001, camera);
			const systemLog = stub(client.reporter, 'systemLog');
			const fixPositionStub = stub(client, 'fixPosition');
			Object.assign(client, { lastX: 0, lastY: 0, lastVX: 0, lastVY: 0, lastTime: 1 });

			move(client, 0, a, b, c, d, e, { fixTeleporting: true, logFixingPosition: true });

			expect(client.pony.vx).equal(0);
			expect(client.pony.vy).equal(0);
			assert.calledWith(fixPositionStub, 0, 0, false);
			assert.calledWith(systemLog, 'Fixed teleporting (10.015625 10.020833333333334) -> (0 0)');
		});
	});
});
