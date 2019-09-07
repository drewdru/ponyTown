"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const internal_1 = require("../../../server/api/internal");
const world_1 = require("../../../server/world");
const mocks_1 = require("../../mocks");
const mongoose_1 = require("mongoose");
const hiding_1 = require("../../../server/services/hiding");
const stats_1 = require("../../../server/stats");
describe('api internal', () => {
    describe('accountChanged()', () => {
        let func;
        let world;
        let findAccount;
        let clearTokensForAccount;
        beforeEach(() => {
            world = new world_1.World({}, { partyChanged: { subscribe() { } } }, {}, {}, {}, () => ({}), {}, {});
            clearTokensForAccount = sinon_1.stub();
            findAccount = sinon_1.stub();
            func = internal_1.createAccountChanged(world, { clearTokensForAccount }, findAccount);
        });
        it('notifies world of account update', async () => {
            const account = { _id: mocks_1.genObjectId() };
            findAccount.withArgs('foobar').resolves(account);
            const accountUpdated = sinon_1.stub(world, 'accountUpdated');
            await func('foobar');
            sinon_1.assert.calledWith(accountUpdated, account);
        });
        it('clears tokens for account if account is banned', async () => {
            const account = { _id: mocks_1.genObjectId(), ban: -1 };
            findAccount.withArgs('foobar').resolves(account);
            await func('foobar');
            sinon_1.assert.calledWith(clearTokensForAccount, 'foobar');
        });
    });
    describe('accountMerged()', () => {
        const hiding = lib_1.stubClass(hiding_1.HidingService);
        let func;
        beforeEach(() => {
            lib_1.resetStubMethods(hiding, 'merged');
            func = internal_1.createAccountMerged(hiding);
        });
        it('notifies hiding service of merge', async () => {
            await func('foo', 'bar');
            sinon_1.assert.calledWith(hiding.merged, 'foo', 'bar');
        });
    });
    describe('accountStatus()', () => {
        let func;
        let world;
        let server;
        let clock;
        beforeEach(() => {
            clock = sinon_1.useFakeTimers();
            world = { clientsByAccount: new Map() };
            server = { id: 'foo' };
            func = internal_1.createAccountStatus(world, server);
        });
        afterEach(() => {
            clock.restore();
        });
        it('returns client account status', async () => {
            const client = mocks_1.mockClient();
            client.characterName = 'derpy';
            client.pony.name = '?????';
            client.pony.x = 5.2;
            client.pony.y = 6.1;
            client.userAgent = 'useragent';
            client.connectedTime = 0;
            clock.setSystemTime(12 * 1000);
            world.clientsByAccount.set('bar', client);
            await chai_1.expect(func('bar')).eventually.eql({
                online: true,
                incognito: undefined,
                character: 'derpy',
                duration: '12s',
                server: 'foo',
                map: '-',
                x: 5,
                y: 6,
                userAgent: 'useragent',
            });
        });
        it('returns offline status for missing client', async () => {
            await chai_1.expect(func('bar')).eventually.eql({ online: false });
        });
    });
    describe('accountAround()', () => {
        let func;
        beforeEach(() => {
            func = internal_1.createAccountAround({ clientsByAccount: new Map() });
        });
        it('returns client arount given account', async () => {
            await chai_1.expect(func('bar')).eventually.eql([]);
        });
    });
    describe('hiddenStats()', () => {
        let hiddenStats;
        let hiding;
        beforeEach(() => {
            hiding = sinon_1.createStubInstance(hiding_1.HidingService);
            hiddenStats = internal_1.createHiddenStats(hiding);
        });
        it('returns hiding stats for given account', async () => {
            const result = {};
            hiding.getStatsFor.withArgs('bar').returns(result);
            await chai_1.expect(hiddenStats('bar')).eventually.equal(result);
        });
    });
    describe('join()', () => {
        let func;
        let world;
        let server;
        let settings;
        let clearTokensForAccount;
        let createToken;
        let findAccount;
        let findCharacter;
        let findAuth;
        let hasInvite;
        let account;
        let character;
        let clock;
        let liveSettings;
        beforeEach(() => {
            account = { save() { }, _id: new mongoose_1.Types.ObjectId('5983e1f7519f95530becdf7d') };
            character = { save() { }, _id: new mongoose_1.Types.ObjectId('5983e1f7519f95530becdf7a') };
            world = mocks_1.mock(world_1.World);
            server = { id: 'foo' };
            settings = {};
            liveSettings = {};
            clearTokensForAccount = sinon_1.stub();
            createToken = sinon_1.stub();
            findAccount = sinon_1.stub().withArgs('foo').resolves(account);
            findCharacter = sinon_1.stub().withArgs('bar', 'foo').resolves(character);
            findAuth = sinon_1.stub();
            hasInvite = sinon_1.stub();
            func = internal_1.createJoin(world, () => settings, server, { clearTokensForAccount, createToken }, findAccount, findCharacter, findAuth, liveSettings, hasInvite);
            clock = sinon_1.useFakeTimers();
        });
        afterEach(() => clock.restore());
        it('returns new token id', () => {
            createToken.returns('lalala');
            return chai_1.expect(func('foo', 'bar')).eventually.equal('lalala');
        });
        it('creates token using fetched account and character', () => {
            return func('foo', 'bar')
                .then(() => {
                chai_1.expect(createToken.args[0][0].account).equal(account);
                chai_1.expect(createToken.args[0][0].character).equal(character);
            });
        });
        it('kicks all other clients with the same account', () => {
            const kickByAccount = sinon_1.stub(world, 'kickByAccount');
            return func('foo', 'bar')
                .then(() => {
                sinon_1.assert.calledWith(kickByAccount, 'foo');
                sinon_1.assert.calledWith(clearTokensForAccount, 'foo');
            });
        });
        it('updates account default server', () => {
            const save = sinon_1.stub(account, 'save');
            server.id = 'someidhere';
            return func('foo', 'bar')
                .then(() => {
                chai_1.expect(account.settings).eql({ defaultServer: 'someidhere' });
                sinon_1.assert.calledOnce(save);
            });
        });
        it('updates account default server (with existing settings)', () => {
            const save = sinon_1.stub(account, 'save');
            server.id = 'someidhere';
            account.settings = { ignorePartyInvites: true };
            return func('foo', 'bar')
                .then(() => {
                chai_1.expect(account.settings).eql({ ignorePartyInvites: true, defaultServer: 'someidhere' });
                sinon_1.assert.calledOnce(save);
            });
        });
        it('updates account last visit', () => {
            const save = sinon_1.stub(account, 'save');
            clock.setSystemTime(123);
            return func('foo', 'bar')
                .then(() => {
                chai_1.expect(account.lastVisit.toISOString()).equal(new Date(123).toISOString());
                sinon_1.assert.calledOnce(save);
            });
        });
        it('updates character last used', () => {
            const save = sinon_1.stub(character, 'save');
            clock.setSystemTime(123);
            return func('foo', 'bar')
                .then(() => {
                chai_1.expect(character.lastUsed.toISOString()).equal(new Date(123).toISOString());
                sinon_1.assert.calledOnce(save);
            });
        });
        it('rejects if server is offline', () => {
            settings.isServerOffline = true;
            return chai_1.expect(func('foo', 'bar')).rejectedWith('Server is offline');
        });
        it('rejects if server is restricted from user', () => {
            server.require = 'mod';
            return chai_1.expect(func('foo', 'bar')).rejectedWith('Server is restricted');
        });
        it('resolves if user meets server restrictions', () => {
            server.require = 'mod';
            account.roles = ['mod'];
            return func('foo', 'bar');
        });
        it('resolves if user meets server restrictions (supporter)', () => {
            server.require = 'sup1';
            account.patreon = 2 /* Supporter2 */;
            return func('foo', 'bar');
        });
        it('resolves if user meets server restrictions (invited)', () => {
            server.require = 'inv';
            hasInvite.resolves(true);
            return func('foo', 'bar');
        });
        it('sets up character social site', async () => {
            const site = {};
            const siteId = new mongoose_1.Types.ObjectId('5983e1f7519f95530becdf70');
            findAuth.withArgs(siteId, account._id).resolves(site);
            character.site = siteId;
            await func('foo', 'bar');
            chai_1.expect(character.auth).equal(site);
        });
        it('does not set up character social site if its missing', async () => {
            const siteId = new mongoose_1.Types.ObjectId('5983e1f7519f95530becdf70');
            findAuth.withArgs(siteId, account._id).resolves(undefined);
            character.site = siteId;
            await func('foo', 'bar');
            chai_1.expect(character.auth).undefined;
        });
        it('does not set up character social site if its disabled', async () => {
            const site = { disabled: true };
            const siteId = new mongoose_1.Types.ObjectId('5983e1f7519f95530becdf70');
            findAuth.withArgs(siteId, account._id).resolves(site);
            character.site = siteId;
            await func('foo', 'bar');
            chai_1.expect(character.auth).undefined;
        });
        it('does not set up character social site if its banned', async () => {
            const site = { banned: true };
            const siteId = new mongoose_1.Types.ObjectId('5983e1f7519f95530becdf70');
            findAuth.withArgs(siteId, account._id).resolves(site);
            character.site = siteId;
            await func('foo', 'bar');
            chai_1.expect(character.auth).undefined;
        });
    });
    describe('getServerState()', () => {
        let func;
        let world;
        let server;
        let settings;
        let liveSettings;
        beforeEach(() => {
            world = mocks_1.mock(world_1.World);
            server = { flags: {} };
            settings = {};
            liveSettings = { updating: false, shutdown: false };
            func = internal_1.createGetServerState(server, () => settings, world, liveSettings);
        });
        it('returns combined server state', async () => {
            Object.assign(server, { id: 'aaa', name: 'bbb', path: 'ccc', desc: 'ddd', alert: 'eee', require: 'mod' });
            world.clients = [{}, {}];
            world.joinQueue = [{}, {}, {}];
            world.maps = [{}, {}];
            settings.isServerOffline = true;
            settings.filterSwears = true;
            const result = await func();
            chai_1.expect(result).eql({
                id: 'aaa',
                name: 'bbb',
                path: 'ccc',
                desc: 'ddd',
                alert: 'eee',
                dead: false,
                maps: 2,
                online: 2,
                onMain: 2,
                queued: 3,
                require: 'mod',
                flags: {},
                flag: undefined,
                host: undefined,
                settings,
                shutdown: false,
            });
        });
        it('uses defaults for missing values', async () => {
            Object.assign(server, { id: 'aaa', name: 'bbb', path: 'ccc', desc: 'ddd' });
            world.clients = [{}, {}];
            world.joinQueue = [];
            world.maps = [];
            const result = await func();
            chai_1.expect(result).eql({
                id: 'aaa',
                name: 'bbb',
                path: 'ccc',
                desc: 'ddd',
                alert: undefined,
                dead: false,
                maps: 0,
                online: 2,
                onMain: 2,
                queued: 0,
                require: undefined,
                host: undefined,
                flags: {},
                flag: undefined,
                settings,
                shutdown: false,
            });
        });
    });
    describe('getServerStats()', () => {
        let stats;
        let func;
        beforeEach(() => {
            stats = sinon_1.createStubInstance(stats_1.StatsTracker);
            func = internal_1.createGetServerStats(stats);
        });
        it('returns socket stats', async () => {
            const result = {};
            stats.getSocketStats.returns(result);
            await chai_1.expect(func()).eventually.equal(result);
        });
    });
    describe('action()', () => {
        let action;
        beforeEach(() => {
            action = internal_1.createAction({});
        });
        it('throws if action is invalid', async () => {
            await chai_1.expect(action('foo', 'foobar')).rejectedWith('Invalid action (foo)');
        });
    });
    describe('kick()', () => {
        let func;
        let world;
        let clearTokensForAccount;
        beforeEach(() => {
            world = mocks_1.mock(world_1.World);
            clearTokensForAccount = sinon_1.stub();
            func = internal_1.createKick(world, { clearTokensForAccount });
        });
        it('kicks clients by account ID', async () => {
            const kickByAccount = sinon_1.stub(world, 'kickByAccount');
            await func('foo', undefined);
            sinon_1.assert.calledWith(kickByAccount, 'foo');
        });
        it('clears tokens by account ID', async () => {
            await func('foo', undefined);
            sinon_1.assert.calledWith(clearTokensForAccount, 'foo');
        });
        it('kicks clients by character ID', async () => {
            const kickByCharacter = sinon_1.stub(world, 'kickByCharacter');
            await func(undefined, 'bar');
            sinon_1.assert.calledWith(kickByCharacter, 'bar');
        });
        it('does nothing if ID is not provided', async () => {
            await func(undefined, undefined);
        });
    });
    describe('kickAll()', () => {
        let func;
        let world;
        let clearTokensAll;
        beforeEach(() => {
            world = mocks_1.mock(world_1.World);
            clearTokensAll = sinon_1.stub();
            func = internal_1.createKickAll(world, { clearTokensAll });
        });
        it('kicks all clients', async () => {
            const kickAll = sinon_1.stub(world, 'kickAll');
            await func();
            sinon_1.assert.calledOnce(kickAll);
        });
        it('clears all tokens', async () => {
            await func();
            sinon_1.assert.calledOnce(clearTokensAll);
        });
    });
    describe('notifyUpdate()', () => {
        let func;
        let world = lib_1.stubClass(world_1.World);
        let liveSettings;
        beforeEach(() => {
            lib_1.resetStubMethods(world, 'notifyUpdate', 'saveClientStates');
            liveSettings = {};
            func = internal_1.createNotifyUpdate(world, liveSettings);
        });
        it('notifies world of update', async () => {
            await func();
            sinon_1.assert.calledOnce(world.notifyUpdate);
        });
        it('updates character state', async () => {
            await func();
            sinon_1.assert.calledOnce(world.saveClientStates);
        });
    });
    describe('cancelUpdate()', () => {
        let func;
        let live;
        beforeEach(() => {
            live = {};
            func = internal_1.createCancelUpdate(live);
        });
        it('sets updating to false', async () => {
            live.updating = true;
            await func();
            chai_1.expect(live.updating).false;
        });
    });
    describe('shutdownServer()', () => {
        let shutdownServer;
        let world;
        let liveSettings;
        beforeEach(() => {
            world = mocks_1.mock(world_1.World);
            world.server = { id: 'foo' };
            liveSettings = {};
            shutdownServer = internal_1.createShutdownServer(world, liveSettings);
        });
        it('updates shutdown option in live settings to true', async () => {
            await shutdownServer(true);
            chai_1.expect(liveSettings.shutdown).true;
        });
        it('updates shutdown option in live settings to false', async () => {
            await shutdownServer(false);
            chai_1.expect(liveSettings.shutdown).false;
        });
        it('kicks all players', async () => {
            const kickAll = sinon_1.stub(world, 'kickAll');
            await shutdownServer(true);
            sinon_1.assert.calledOnce(kickAll);
        });
    });
});
//# sourceMappingURL=internal.spec.js.map