"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const playerUtils_1 = require("../../server/playerUtils");
const mocks_1 = require("../mocks");
const lib_1 = require("../lib");
const expressionUtils_1 = require("../../common/expressionUtils");
const expressionEncoder_1 = require("../../common/encoders/expressionEncoder");
const constants_1 = require("../../common/constants");
const serverRegion_1 = require("../../server/serverRegion");
const rect_1 = require("../../common/rect");
const counter_1 = require("../../server/services/counter");
const camera_1 = require("../../common/camera");
const worldMap_1 = require("../../common/worldMap");
const serverMap_1 = require("../../server/serverMap");
const ag_sockets_1 = require("ag-sockets");
const entityUtils_1 = require("../../server/entityUtils");
const collision_spec_1 = require("../common/collision.spec");
describe('playerUtils', () => {
    const def = { x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: undefined };
    let client;
    beforeEach(() => {
        client = mocks_1.mockClient();
    });
    describe('isIgnored()', () => {
        it('returns true if target account id is on ignored list', () => {
            chai_1.expect(playerUtils_1.isIgnored({ accountId: 'foo' }, { ignores: new Set(['foo']) })).true;
        });
        it('returns false if target account id is not on ignored list', () => {
            chai_1.expect(playerUtils_1.isIgnored({ accountId: 'foo' }, { ignores: new Set(['bar']) })).false;
        });
        it('returns false if account ignore list is empty', () => {
            chai_1.expect(playerUtils_1.isIgnored({ accountId: 'foo' }, { ignores: new Set() })).false;
        });
        it('returns false if account does not have ignore list', () => {
            chai_1.expect(playerUtils_1.isIgnored({ accountId: 'foo' }, { ignores: new Set() })).false;
        });
    });
    describe('createClientAndPony()', () => {
        it('sets up client and pony', () => {
            const account = { _id: mocks_1.genObjectId() };
            const character = { _id: mocks_1.genObjectId(), name: 'Foo' };
            const client = {
                tokenData: { account, character },
            };
            const map = { spawnArea: rect_1.rect(0, 0, 0, 0) };
            const world = {
                getMainMap: () => map,
                getMap: () => map,
                isColliding: sinon_1.stub(),
            };
            playerUtils_1.createClientAndPony(client, [], [], { name: 'test' }, world, new counter_1.CounterService(1));
            // ...
        });
    });
    describe('createClient()', () => {
        let clock;
        beforeEach(() => {
            clock = sinon_1.useFakeTimers();
            clock.setSystemTime(123);
        });
        afterEach(() => {
            clock.restore();
        });
        it('initializes client fields', () => {
            const originalRequest = { headers: { 'user-agent': 'test' } };
            const client = { originalRequest };
            const account = { _id: mocks_1.genObjectId(), _account: 1, name: 'Foo' };
            const character = { _id: mocks_1.genObjectId(), _character: 1, name: 'Im :apple:' };
            const pony = { _pony: 1, x: 10, y: 20 };
            const reporter = { _reporter: 1 };
            const origin = { ip: '', country: 'XY' };
            const map = {};
            const result = playerUtils_1.createClient(client, account, [], [], character, pony, map, reporter, origin);
            chai_1.expect(result).equal(client);
            chai_1.expect(result).eql({
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
                updateQueue: ag_sockets_1.createBinaryWriter(128),
                regionUpdates: [],
                saysQueue: [],
                unsubscribes: [],
                subscribes: [],
                regions: [],
                camera: Object.assign(camera_1.createCamera(), { w: 800, h: 600 }),
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
            const client = { originalRequest };
            const account = { _id: mocks_1.genObjectId(), shadow: -1 };
            const character = { _id: mocks_1.genObjectId() };
            const pony = {};
            const reporter = {};
            const map = {};
            const result = playerUtils_1.createClient(client, account, [], [], character, pony, map, reporter, undefined);
            chai_1.expect(result.shadowed).true;
            chai_1.expect(result.country).equal('??');
        });
    });
    describe('resetClientUpdates()', () => {
        it('resets all queues', () => {
            const client = mocks_1.mockClient();
            client.updateQueue.offset = 100;
            client.regionUpdates.push({});
            client.saysQueue.push({});
            client.unsubscribes.push({});
            client.subscribes.push({});
            playerUtils_1.resetClientUpdates(client);
            chai_1.expect(client.updateQueue.offset).equal(0);
            chai_1.expect(client.regionUpdates).eql([]);
            chai_1.expect(client.saysQueue).eql([]);
            chai_1.expect(client.unsubscribes).eql([]);
            chai_1.expect(client.subscribes).eql([]);
        });
    });
    describe('ignorePlayer()', () => {
        let ignorePlayer;
        let updateAccount;
        beforeEach(() => {
            updateAccount = sinon_1.stub().resolves();
            ignorePlayer = lib_1.createFunctionWithPromiseHandler(playerUtils_1.createIgnorePlayer, updateAccount);
        });
        it('adds client to targets ignores list', async () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            await ignorePlayer(client, target, true);
            sinon_1.assert.calledWithMatch(updateAccount, target.accountId, { $push: { ignores: client.accountId } });
        });
        it('removes client from targets ignores list', async () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            playerUtils_1.addIgnore(target, client.accountId);
            await ignorePlayer(client, target, false);
            sinon_1.assert.calledWithMatch(updateAccount, target.accountId, { $pull: { ignores: client.accountId } });
        });
        it('does nothing if already ignored', async () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            playerUtils_1.addIgnore(target, client.accountId);
            await ignorePlayer(client, target, true);
            sinon_1.assert.notCalled(updateAccount);
        });
        it('does nothing if already unignored', async () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            await ignorePlayer(client, target, false);
            sinon_1.assert.notCalled(updateAccount);
        });
        it('does nothing if called for self', async () => {
            const client = mocks_1.mockClient();
            await ignorePlayer(client, client, true);
            sinon_1.assert.notCalled(updateAccount);
        });
        it('adds client to targets account instance ignores list', async () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            target.account.ignores = undefined;
            await ignorePlayer(client, target, true);
            chai_1.expect(target.account.ignores).eql([client.accountId]);
        });
        it('removes client from targets account instance ignores list', async () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            playerUtils_1.addIgnore(target, client.accountId);
            await ignorePlayer(client, target, false);
            chai_1.expect(target.account.ignores).eql([]);
        });
        it('sends target player state update to client', async () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            target.pony.id = 123;
            await ignorePlayer(client, target, true);
            chai_1.expect(Array.from(ag_sockets_1.getWriterBuffer(client.updateQueue)))
                .eql([2, 4, 0, 0, 0, 0, 123, 1]);
        });
    });
    describe('findClientByEntityId()', () => {
        it('returns client from selected pony', () => {
            const self = mocks_1.mockClient();
            const client = mocks_1.mockClient();
            self.selected = client.pony;
            chai_1.expect(playerUtils_1.findClientByEntityId(self, client.pony.id)).equal(client);
        });
        it('returns client from party clients', () => {
            const self = mocks_1.mockClient();
            const client = mocks_1.mockClient();
            self.party = {
                id: '',
                clients: [client],
                leader: client,
                pending: [],
            };
            chai_1.expect(playerUtils_1.findClientByEntityId(self, client.pony.id)).equal(client);
        });
        it('returns client from party pending', () => {
            const self = mocks_1.mockClient();
            const client = mocks_1.mockClient();
            self.party = {
                id: '',
                clients: [],
                leader: client,
                pending: [{ client, notificationId: 0 }],
            };
            chai_1.expect(playerUtils_1.findClientByEntityId(self, client.pony.id)).equal(client);
        });
        it('returns undefined if not found in party', () => {
            const self = mocks_1.mockClient();
            const client = mocks_1.mockClient();
            self.party = {
                id: '',
                clients: [],
                leader: mocks_1.mockClient(),
                pending: [],
            };
            chai_1.expect(playerUtils_1.findClientByEntityId(self, client.pony.id)).undefined;
        });
        it('returns client from notifications', () => {
            const self = mocks_1.mockClient();
            const client = mocks_1.mockClient();
            self.notifications = [
                { id: 0, name: 'name', message: '', entityId: client.pony.id, sender: client },
            ];
            chai_1.expect(playerUtils_1.findClientByEntityId(self, client.pony.id)).equal(client);
        });
        it('returns undefined if not found', () => {
            const self = mocks_1.mockClient();
            chai_1.expect(playerUtils_1.findClientByEntityId(self, 1)).undefined;
        });
    });
    describe('cancelEntityExpression()', () => {
        it('cancels expression', () => {
            const entity = mocks_1.serverEntity(0);
            entity.options = { expr: 1234 };
            entity.exprCancellable = true;
            entity.exprPermanent = expressionEncoder_1.decodeExpression(1111);
            playerUtils_1.cancelEntityExpression(entity);
            chai_1.expect(entity.options).eql({ expr: 1111 });
            chai_1.expect(entity.exprCancellable).false;
        });
        it('does nothing if entity does not have cancellable expression', () => {
            const entity = mocks_1.serverEntity(0);
            entity.options = { expr: 1234 };
            playerUtils_1.cancelEntityExpression(entity);
            chai_1.expect(entity.options).eql({ expr: 1234 });
        });
    });
    describe('setEntityExpression()', () => {
        let clock;
        beforeEach(() => {
            clock = sinon_1.useFakeTimers();
        });
        afterEach(() => {
            clock.restore();
        });
        it('sets expression on pony options', () => {
            const pony = mocks_1.clientPony();
            const expression = expressionUtils_1.parseExpression(':)');
            playerUtils_1.setEntityExpression(pony, expression);
            chai_1.expect(pony.options.expr).equal(expressionEncoder_1.encodeExpression(expression));
        });
        it('sets empty expression by default', () => {
            const pony = mocks_1.clientPony();
            playerUtils_1.setEntityExpression(pony, undefined);
            chai_1.expect(pony.options.expr).equal(expressionEncoder_1.encodeExpression(undefined));
        });
        it('uses permanent expression if no expression provided', () => {
            const pony = mocks_1.clientPony();
            const expression = expressionUtils_1.parseExpression(':)');
            pony.exprPermanent = expression;
            playerUtils_1.setEntityExpression(pony, undefined);
            chai_1.expect(pony.options.expr).equal(expressionEncoder_1.encodeExpression(expression));
        });
        it('sets default expression timeout', () => {
            const pony = mocks_1.clientPony();
            clock.setSystemTime(1234);
            playerUtils_1.setEntityExpression(pony, expressionUtils_1.parseExpression(':)'));
            chai_1.expect(pony.exprTimeout).equal(1234 + constants_1.EXPRESSION_TIMEOUT);
        });
        it('sets custom expression timeout if provided', () => {
            const pony = mocks_1.clientPony();
            clock.setSystemTime(1234);
            playerUtils_1.setEntityExpression(pony, expressionUtils_1.parseExpression(':)'), 123);
            chai_1.expect(pony.exprTimeout).equal(1234 + 123);
        });
        it('unsets expression timeout if given 0 for timeout', () => {
            const pony = mocks_1.clientPony();
            pony.exprTimeout = 1234;
            playerUtils_1.setEntityExpression(pony, expressionUtils_1.parseExpression(':)'), 0);
            chai_1.expect(pony.exprTimeout).undefined;
        });
        it('sets expression cancellable flag', () => {
            const pony = mocks_1.clientPony();
            playerUtils_1.setEntityExpression(pony, expressionUtils_1.parseExpression(':)'), 123, true);
            chai_1.expect(pony.exprCancellable).true;
        });
        it('sets expression cancellable flag', () => {
            const pony = mocks_1.clientPony();
            playerUtils_1.setEntityExpression(pony, expressionUtils_1.parseExpression(':)'), 123, false);
            chai_1.expect(pony.exprCancellable).false;
        });
        it('adds expression to region updates', () => {
            const entity = mocks_1.clientPony();
            const region = serverRegion_1.createServerRegion(0, 0);
            entity.region = region;
            playerUtils_1.setEntityExpression(entity, expressionUtils_1.parseExpression(':)'), 123, false);
            chai_1.expect(region.entityUpdates).eql([
                { entity, flags: 8 /* Expression */, x: 0, y: 0, vx: 0, vy: 0, action: 0, playerState: 0, options: undefined },
            ]);
        });
        it('sends expression update to user instead of region updates for shadowed client', () => {
            const pony = mocks_1.clientPony();
            pony.region = serverRegion_1.createServerRegion(0, 0);
            pony.client.shadowed = true;
            pony.id = 123;
            playerUtils_1.setEntityExpression(pony, expressionUtils_1.parseExpression(':)'), 123, false);
            chai_1.expect(Array.from(ag_sockets_1.getWriterBuffer(pony.client.updateQueue)))
                .eql([2, 0, 8, 0, 0, 0, 123, 0, 0, 4, 32]);
        });
    });
    describe('interactWith()', () => {
        it('calls interact method on target', () => {
            const client = mocks_1.mockClient();
            const interact = sinon_1.stub();
            const target = mocks_1.serverEntity(1, 0, 0, 1, { interact });
            playerUtils_1.interactWith(client, target);
            sinon_1.assert.calledWith(interact, target, client);
        });
        it('calls interact method on target if within range', () => {
            const client = mocks_1.mockClient();
            const interact = sinon_1.stub();
            const target = mocks_1.serverEntity(1, 10, 10, 1, { interact, interactRange: 5 });
            client.pony.x = 9;
            client.pony.y = 11;
            playerUtils_1.interactWith(client, target);
            sinon_1.assert.calledWith(interact, target, client);
        });
        it('does not call interact if out of range', () => {
            const client = mocks_1.mockClient();
            const interact = sinon_1.stub();
            const target = mocks_1.serverEntity(1, 10, 10, 1, { interact, interactRange: 5 });
            client.pony.x = 2;
            client.pony.y = 1;
            playerUtils_1.interactWith(client, target);
            sinon_1.assert.notCalled(interact);
        });
        it('does nothing for undefined entity', () => {
            playerUtils_1.interactWith(mocks_1.mockClient(), undefined);
        });
        it('does nothing for entity without interact', () => {
            playerUtils_1.interactWith(mocks_1.mockClient(), mocks_1.serverEntity(1));
        });
    });
    describe('canPerformAction()', () => {
        it('returns true if last action date is below current time', () => {
            chai_1.expect(playerUtils_1.canPerformAction(mocks_1.mockClient({ lastAction: 1234 }))).true;
        });
        it('returns false if last action date is ahead or current time', () => {
            chai_1.expect(playerUtils_1.canPerformAction(mocks_1.mockClient({ lastAction: Date.now() + 1000 }))).false;
        });
    });
    describe('sendAction()', () => {
        it('adds action to region', () => {
            const entity = mocks_1.serverEntity(1);
            const region = serverRegion_1.createServerRegion(0, 0);
            entity.region = region;
            entityUtils_1.sendAction(entity, 1 /* Boop */);
            chai_1.expect(region.entityUpdates).eql([
                {
                    entity, flags: 128 /* Action */, x: 0, y: 0, vx: 0, vy: 0, action: 1 /* Boop */,
                    playerState: 0, options: undefined,
                },
            ]);
        });
        it('sends only to entity client if shadowed', () => {
            const client = mocks_1.mockClient();
            client.shadowed = true;
            const entity = client.pony;
            const region = serverRegion_1.createServerRegion(0, 0);
            entity.region = region;
            entity.region.clients.push(mocks_1.mockClient(), client);
            client.pony.id = 123;
            entityUtils_1.sendAction(entity, 1 /* Boop */);
            chai_1.expect(Array.from(ag_sockets_1.getWriterBuffer(client.updateQueue))).eql([2, 0, 128, 0, 0, 0, 123, 1]);
            chai_1.expect(region.entityUpdates).eql([]);
        });
    });
    describe('boop()', () => {
        let client;
        beforeEach(() => {
            client = mocks_1.mockClient();
            client.map = serverMap_1.createServerMap('foo', 0, 1, 1);
            client.pony.region = client.map.regions[0];
            client.lastAction = 0;
        });
        it('sends boop action', () => {
            playerUtils_1.boop(client, 1000);
            chai_1.expect(client.pony.region.entityUpdates).eql([
                {
                    entity: client.pony, flags: 128 /* Action */, x: 0, y: 0, vx: 0, vy: 0, action: 1 /* Boop */,
                    playerState: 0, options: undefined,
                },
            ]);
        });
        it('cancels expression', () => {
            client.pony.exprCancellable = true;
            client.pony.options.expr = 123;
            playerUtils_1.boop(client, 1000);
            chai_1.expect(client.pony.options.expr).equal(expressionEncoder_1.EMPTY_EXPRESSION);
        });
        it('updates last boop action', () => {
            client.lastBoopAction = 0;
            playerUtils_1.boop(client, 100);
            chai_1.expect(client.lastBoopAction).equal(100 + 500);
        });
        it('executes boop on found entity', () => {
            const boop = sinon_1.stub();
            client.pony.x = 5;
            client.pony.y = 5;
            worldMap_1.getRegion(client.map, 0, 0).entities.push(mocks_1.serverEntity(0, 4.2, 5, 0, { boop }));
            boop(client);
            sinon_1.assert.calledWith(boop, client);
        });
        it('does not execute boop on found entity if shadowed', () => {
            const stubBoop = sinon_1.stub();
            client.pony.x = 5;
            client.pony.y = 5;
            client.shadowed = true;
            worldMap_1.getRegion(client.map, 0, 0).entities.push(mocks_1.serverEntity(0, 4.2, 5, 0, { boop: stubBoop }));
            playerUtils_1.boop(client, 0);
            sinon_1.assert.notCalled(stubBoop);
        });
        it('does nothing if cannot perform action', () => {
            client.lastAction = 1000;
            playerUtils_1.boop(client, 0);
            chai_1.expect(client.pony.region.entityUpdates).eql([]);
        });
        it('does nothing if moving', () => {
            client.pony.vx = 1;
            playerUtils_1.boop(client, 0);
            chai_1.expect(client.pony.region.entityUpdates).eql([]);
        });
    });
    describe('turnHead()', () => {
        it('updates HeadTurned flag', () => {
            const client = mocks_1.mockClient();
            client.pony.state = 0;
            playerUtils_1.turnHead(client);
            chai_1.expect(client.pony.state).equal(4 /* HeadTurned */);
        });
        it('does not update flags if cannot perform action', () => {
            const client = mocks_1.mockClient();
            client.lastAction = Date.now() + 1000;
            client.pony.state = 0;
            playerUtils_1.turnHead(client);
            chai_1.expect(client.pony.state).equal(0);
        });
    });
    describe('stand()', () => {
        beforeEach(() => {
            client.pony.exprCancellable = true;
            client.pony.options.expr = 123;
        });
        it('updates entity flag to standing', () => {
            client.pony.state = 48 /* PonySitting */;
            playerUtils_1.stand(client);
            chai_1.expect(client.pony.state).equal(0 /* PonyStanding */);
        });
        it('does not change other entity flags', () => {
            client.pony.state = 48 /* PonySitting */ | 2 /* FacingRight */;
            playerUtils_1.stand(client);
            chai_1.expect(client.pony.state).equal(0 /* PonyStanding */ | 2 /* FacingRight */);
        });
        it('cancels expression', () => {
            client.pony.state = 48 /* PonySitting */;
            playerUtils_1.stand(client);
            chai_1.expect(client.pony.options.expr).equal(expressionEncoder_1.EMPTY_EXPRESSION);
        });
        it('does not cancel expression if transitioning from flying', () => {
            client.pony.state = 80 /* PonyFlying */;
            playerUtils_1.stand(client);
            chai_1.expect(client.pony.options.expr).equal(123);
        });
        it('does nothing if already standing', () => {
            client.pony.state = 0 /* PonyStanding */;
            playerUtils_1.stand(client);
            chai_1.expect(client.pony.state).equal(0 /* PonyStanding */);
            chai_1.expect(client.pony.options.expr).equal(123);
        });
        it('does nothing if cannot perform action', () => {
            client.lastAction = Date.now() + 1000;
            client.pony.state = 0;
            playerUtils_1.stand(client);
            chai_1.expect(client.pony.state).equal(0);
            chai_1.expect(client.pony.options.expr).equal(123);
        });
        it('does nothing if cannot land', () => {
            client.pony.state = 80 /* PonyFlying */;
            client.pony.x = 0.5;
            client.pony.y = 0.5;
            mocks_1.setupCollider(client.map, 0.5, 0.5);
            collision_spec_1.updateColliders(client.map);
            playerUtils_1.stand(client);
            chai_1.expect(client.pony.state).equal(80 /* PonyFlying */);
            chai_1.expect(client.pony.options.expr).equal(123);
        });
    });
    describe('sit()', () => {
        it('updates entity flag to sitting', () => {
            client.pony.state = 0 /* PonyStanding */;
            playerUtils_1.sit(client, {});
            chai_1.expect(client.pony.state).equal(48 /* PonySitting */);
        });
        it('does not change other entity flags', () => {
            client.pony.state = 0 /* PonyStanding */ | 2 /* FacingRight */;
            playerUtils_1.sit(client, {});
            chai_1.expect(client.pony.state).equal(48 /* PonySitting */ | 2 /* FacingRight */);
        });
        it('does nothing if already sitting', () => {
            client.pony.state = 48 /* PonySitting */;
            playerUtils_1.sit(client, {});
            chai_1.expect(client.pony.state).equal(48 /* PonySitting */);
        });
        it('does nothing if cannot perform action', () => {
            client.lastAction = Date.now() + 1000;
            client.pony.state = 0;
            playerUtils_1.sit(client, {});
            chai_1.expect(client.pony.state).equal(0);
        });
        it('does nothing if moving', () => {
            client.pony.vx = 1;
            client.pony.state = 0;
            playerUtils_1.sit(client, {});
            chai_1.expect(client.pony.state).equal(0);
        });
    });
    describe('lie()', () => {
        it('updates entity flag to lying', () => {
            client.pony.state = 0 /* PonyStanding */;
            playerUtils_1.lie(client);
            chai_1.expect(client.pony.state).equal(64 /* PonyLying */);
        });
        it('does not change other entity flags', () => {
            client.pony.state = 0 /* PonyStanding */ | 2 /* FacingRight */;
            playerUtils_1.lie(client);
            chai_1.expect(client.pony.state).equal(64 /* PonyLying */ | 2 /* FacingRight */);
        });
        it('does nothing if already lying', () => {
            client.pony.state = 64 /* PonyLying */;
            playerUtils_1.lie(client);
            chai_1.expect(client.pony.state).equal(64 /* PonyLying */);
        });
        it('does nothing if cannot perform action', () => {
            client.lastAction = Date.now() + 1000;
            client.pony.state = 0;
            playerUtils_1.lie(client);
            chai_1.expect(client.pony.state).equal(0);
        });
        it('does nothing if moving', () => {
            client.pony.vx = 1;
            client.pony.state = 0;
            playerUtils_1.lie(client);
            chai_1.expect(client.pony.state).equal(0);
        });
    });
    describe('fly()', () => {
        beforeEach(() => {
            client.pony.canFly = true;
            client.pony.exprCancellable = true;
            client.pony.options.expr = 123;
        });
        it('updates entity flag to flying', () => {
            client.pony.state = 0 /* PonyStanding */;
            playerUtils_1.fly(client);
            chai_1.expect(client.pony.state).equal(80 /* PonyFlying */ | 1 /* Flying */);
        });
        it('does not change other entity flags', () => {
            client.pony.state = 0 /* PonyStanding */ | 2 /* FacingRight */;
            playerUtils_1.fly(client);
            chai_1.expect(client.pony.state).equal(80 /* PonyFlying */ | 2 /* FacingRight */ | 1 /* Flying */);
        });
        it('cancels expression', () => {
            playerUtils_1.fly(client);
            chai_1.expect(client.pony.options.expr).equal(expressionEncoder_1.EMPTY_EXPRESSION);
        });
        it('does nothing if already flying', () => {
            client.lastAction = Date.now() + 1000;
            client.pony.state = 80 /* PonyFlying */;
            playerUtils_1.fly(client);
            chai_1.expect(client.pony.state).equal(80 /* PonyFlying */);
            chai_1.expect(client.pony.options.expr).equal(123);
        });
        it('does nothing if cannot perform action', () => {
            client.lastAction = Date.now() + 1000;
            client.pony.state = 0;
            playerUtils_1.fly(client);
            chai_1.expect(client.pony.state).equal(0);
            chai_1.expect(client.pony.options.expr).equal(123);
        });
        it('does nothing if cannot fly', () => {
            client.pony.canFly = false;
            client.pony.state = 0;
            playerUtils_1.fly(client);
            chai_1.expect(client.pony.state).equal(0);
            chai_1.expect(client.pony.options.expr).equal(123);
        });
    });
    describe('expressionAction()', () => {
        beforeEach(() => {
            client.pony.region = serverRegion_1.createServerRegion(1, 1);
            client.pony.exprCancellable = true;
            client.pony.options.expr = 123;
        });
        it('sends given action', () => {
            playerUtils_1.expressionAction(client, 3 /* Yawn */);
            chai_1.expect(client.pony.region.entityUpdates).eql([
                Object.assign({}, def, { entity: client.pony, flags: 8 /* Expression */ | 128 /* Action */, action: 3 /* Yawn */ }),
            ]);
        });
        it('cancels expression', () => {
            playerUtils_1.expressionAction(client, 3 /* Yawn */);
            chai_1.expect(client.pony.options.expr).equal(expressionEncoder_1.EMPTY_EXPRESSION);
        });
        it('does nothing if cannot perform action', () => {
            client.lastAction = Date.now() + 1000;
            playerUtils_1.expressionAction(client, 3 /* Yawn */);
            chai_1.expect(client.pony.region.entityUpdates).eql([]);
        });
        it('does nothing if not expression action', () => {
            client.pony.canFly = false;
            playerUtils_1.expressionAction(client, 1 /* Boop */);
            chai_1.expect(client.pony.region.entityUpdates).eql([]);
        });
        it('updates last expression action', () => {
            client.lastExpressionAction = 0;
            playerUtils_1.expressionAction(client, 3 /* Yawn */);
            chai_1.expect(client.lastExpressionAction).greaterThan(Date.now());
        });
    });
    describe('holdItem()', () => {
        it('updates entity options', () => {
            const entity = mocks_1.serverEntity(123);
            playerUtils_1.holdItem(entity, 456);
            chai_1.expect(entity.options).eql({ hold: 456 });
        });
        it('sends entity update', () => {
            const entity = mocks_1.serverEntity(123);
            const region = serverRegion_1.createServerRegion(1, 1);
            entity.region = region;
            playerUtils_1.holdItem(entity, 456);
            chai_1.expect(region.entityUpdates).eql([
                Object.assign({}, def, { entity, flags: 32 /* Options */, options: { hold: 456 } }),
            ]);
        });
        it('does not send entity update if hold is already set', () => {
            const entity = mocks_1.serverEntity(123);
            const region = serverRegion_1.createServerRegion(1, 1);
            entity.region = region;
            entity.options = { hold: 456 };
            playerUtils_1.holdItem(entity, 456);
            chai_1.expect(region.entityUpdates).eql([]);
        });
    });
    describe('unholdItem()', () => {
        it('updates entity options', () => {
            const entity = mocks_1.serverEntity(123);
            entity.options = { hold: 456 };
            playerUtils_1.unholdItem(entity);
            chai_1.expect(entity.options).eql({});
        });
        it('sends entity update', () => {
            const entity = mocks_1.serverEntity(123);
            const region = serverRegion_1.createServerRegion(1, 1);
            entity.region = region;
            entity.options = { hold: 456 };
            playerUtils_1.unholdItem(entity);
            chai_1.expect(region.entityUpdates).eql([
                Object.assign({}, def, { entity, flags: 32 /* Options */, options: { hold: 0 } }),
            ]);
        });
        it('does not send entity update if hold is not set', () => {
            const entity = mocks_1.serverEntity(123);
            const region = serverRegion_1.createServerRegion(1, 1);
            entity.region = region;
            playerUtils_1.unholdItem(entity);
            chai_1.expect(region.entityUpdates).eql([]);
        });
    });
    describe('holdToy()', () => {
        it('updates entity options', () => {
            const entity = mocks_1.serverEntity(123);
            playerUtils_1.holdToy(entity, 456);
            chai_1.expect(entity.options).eql({ toy: 456 });
        });
        it('sends entity update', () => {
            const entity = mocks_1.serverEntity(123);
            const region = serverRegion_1.createServerRegion(1, 1);
            entity.region = region;
            playerUtils_1.holdToy(entity, 456);
            chai_1.expect(region.entityUpdates).eql([
                Object.assign({}, def, { entity, flags: 32 /* Options */, options: { toy: 456 } }),
            ]);
        });
        it('does not send entity update if hold is already set', () => {
            const entity = mocks_1.serverEntity(123);
            const region = serverRegion_1.createServerRegion(1, 1);
            entity.region = region;
            entity.options = { toy: 456 };
            playerUtils_1.holdToy(entity, 456);
            chai_1.expect(region.entityUpdates).eql([]);
        });
    });
    describe('unholdToy()', () => {
        it('updates entity options', () => {
            const entity = mocks_1.serverEntity(123);
            entity.options = { toy: 456 };
            playerUtils_1.unholdToy(entity);
            chai_1.expect(entity.options).eql({});
        });
        it('sends entity update', () => {
            const entity = mocks_1.serverEntity(123);
            const region = serverRegion_1.createServerRegion(1, 1);
            entity.region = region;
            entity.options = { toy: 456 };
            playerUtils_1.unholdToy(entity);
            chai_1.expect(region.entityUpdates).eql([
                Object.assign({}, def, { entity, flags: 32 /* Options */, options: { toy: 0 } }),
            ]);
        });
        it('does not send entity update if toy is not set', () => {
            const entity = mocks_1.serverEntity(123);
            const region = serverRegion_1.createServerRegion(1, 1);
            entity.region = region;
            playerUtils_1.unholdToy(entity);
            chai_1.expect(region.entityUpdates).eql([]);
        });
    });
});
//# sourceMappingURL=playerUtils.spec.js.map