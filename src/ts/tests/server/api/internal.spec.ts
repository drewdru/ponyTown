import { stubClass, resetStubMethods } from '../../lib';
import { expect } from 'chai';
import { stub, assert, SinonStub, SinonFakeTimers, useFakeTimers, SinonStubbedInstance, createStubInstance } from 'sinon';
import {
	createAccountChanged, createAccountStatus, createJoin, createGetServerState, createKick, createKickAll,
	createGetServerStats, createAccountMerged, createAccountAround, createAction, createShutdownServer,
	createNotifyUpdate, createCancelUpdate, createHiddenStats
} from '../../../server/api/internal';
import { World } from '../../../server/world';
import { mock, mockClient, genObjectId } from '../../mocks';
import {
	PatreonFlags, ServerConfig, GameServerSettings, ServerLiveSettings, ServerStats, HidingStats
} from '../../../common/adminInterfaces';
import { ICharacter, IAccount } from '../../../server/db';
import { Types } from 'mongoose';
import { HidingService } from '../../../server/services/hiding';
import { StatsTracker } from '../../../server/stats';

describe('api internal', () => {
	describe('accountChanged()', () => {
		let func: ReturnType<typeof createAccountChanged>;
		let world: World;
		let findAccount: SinonStub;
		let clearTokensForAccount: SinonStub;

		beforeEach(() => {
			world = new World(
				{} as any, { partyChanged: { subscribe() { } } } as any, {} as any, {} as any, {} as any,
				() => ({}), {} as any, {} as any);
			clearTokensForAccount = stub();
			findAccount = stub();
			func = createAccountChanged(world, { clearTokensForAccount } as any, findAccount);
		});

		it('notifies world of account update', async () => {
			const account: any = { _id: genObjectId() };
			findAccount.withArgs('foobar').resolves(account);
			const accountUpdated = stub(world, 'accountUpdated');

			await func('foobar');

			assert.calledWith(accountUpdated, account);
		});

		it('clears tokens for account if account is banned', async () => {
			const account = { _id: genObjectId(), ban: -1 };
			findAccount.withArgs('foobar').resolves(account);

			await func('foobar');

			assert.calledWith(clearTokensForAccount, 'foobar');
		});
	});

	describe('accountMerged()', () => {
		const hiding = stubClass(HidingService);
		let func: ReturnType<typeof createAccountMerged>;

		beforeEach(() => {
			resetStubMethods(hiding, 'merged');
			func = createAccountMerged(hiding as any);
		});

		it('notifies hiding service of merge', async () => {
			await func('foo', 'bar');

			assert.calledWith(hiding.merged, 'foo', 'bar');
		});
	});

	describe('accountStatus()', () => {
		let func: ReturnType<typeof createAccountStatus>;
		let world: World;
		let server: ServerConfig;
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
			world = { clientsByAccount: new Map() } as any;
			server = { id: 'foo' } as any;
			func = createAccountStatus(world, server);
		});

		afterEach(() => {
			clock.restore();
		});

		it('returns client account status', async () => {
			const client = mockClient();
			client.characterName = 'derpy';
			client.pony.name = '?????';
			client.pony.x = 5.2;
			client.pony.y = 6.1;
			client.userAgent = 'useragent';
			client.connectedTime = 0;
			clock.setSystemTime(12 * 1000);
			world.clientsByAccount.set('bar', client);

			await expect(func('bar')).eventually.eql({
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
			await expect(func('bar')).eventually.eql({ online: false });
		});
	});

	describe('accountAround()', () => {
		let func: ReturnType<typeof createAccountAround>;

		beforeEach(() => {
			func = createAccountAround({ clientsByAccount: new Map() } as any);
		});

		it('returns client arount given account', async () => {
			await expect(func('bar')).eventually.eql([]);
		});
	});

	describe('hiddenStats()', () => {
		let hiddenStats: ReturnType<typeof createHiddenStats>;
		let hiding: SinonStubbedInstance<HidingService>;

		beforeEach(() => {
			hiding = createStubInstance(HidingService);
			hiddenStats = createHiddenStats(hiding as any);
		});

		it('returns hiding stats for given account', async () => {
			const result: HidingStats = {} as any;
			hiding.getStatsFor.withArgs('bar').returns(result);

			await expect(hiddenStats('bar')).eventually.equal(result);
		});
	});

	describe('join()', () => {
		let func: (accountId: string, ponyId: string) => Promise<string>;
		let world: World;
		let server: ServerConfig;
		let settings: GameServerSettings;
		let clearTokensForAccount: SinonStub;
		let createToken: SinonStub;
		let findAccount: SinonStub;
		let findCharacter: SinonStub;
		let findAuth: SinonStub;
		let hasInvite: SinonStub;
		let account: IAccount;
		let character: ICharacter;
		let clock: SinonFakeTimers;
		let liveSettings: ServerLiveSettings;

		beforeEach(() => {
			account = { save() { }, _id: new Types.ObjectId('5983e1f7519f95530becdf7d') } as any;
			character = { save() { }, _id: new Types.ObjectId('5983e1f7519f95530becdf7a') } as any;
			world = mock(World);
			server = { id: 'foo' } as any;
			settings = {};
			liveSettings = {} as any;
			clearTokensForAccount = stub();
			createToken = stub();
			findAccount = stub().withArgs('foo').resolves(account);
			findCharacter = stub().withArgs('bar', 'foo').resolves(character);
			findAuth = stub();
			hasInvite = stub();
			func = createJoin(
				world, () => settings, server, { clearTokensForAccount, createToken } as any, findAccount, findCharacter,
				findAuth, liveSettings, hasInvite);
			clock = useFakeTimers();
		});

		afterEach(() => clock.restore());

		it('returns new token id', () => {
			createToken.returns('lalala');

			return expect(func('foo', 'bar')).eventually.equal('lalala');
		});

		it('creates token using fetched account and character', () => {
			return func('foo', 'bar')
				.then(() => {
					expect(createToken.args[0][0].account).equal(account);
					expect(createToken.args[0][0].character).equal(character);
				});
		});

		it('kicks all other clients with the same account', () => {
			const kickByAccount = stub(world, 'kickByAccount');

			return func('foo', 'bar')
				.then(() => {
					assert.calledWith(kickByAccount, 'foo');
					assert.calledWith(clearTokensForAccount, 'foo');
				});
		});

		it('updates account default server', () => {
			const save = stub(account, 'save');
			server.id = 'someidhere';

			return func('foo', 'bar')
				.then(() => {
					expect(account.settings).eql({ defaultServer: 'someidhere' });
					assert.calledOnce(save);
				});
		});

		it('updates account default server (with existing settings)', () => {
			const save = stub(account, 'save');
			server.id = 'someidhere';
			account.settings = { ignorePartyInvites: true };

			return func('foo', 'bar')
				.then(() => {
					expect(account.settings).eql({ ignorePartyInvites: true, defaultServer: 'someidhere' });
					assert.calledOnce(save);
				});
		});

		it('updates account last visit', () => {
			const save = stub(account, 'save');
			clock.setSystemTime(123);

			return func('foo', 'bar')
				.then(() => {
					expect(account.lastVisit.toISOString()).equal(new Date(123).toISOString());
					assert.calledOnce(save);
				});
		});

		it('updates character last used', () => {
			const save = stub(character, 'save');
			clock.setSystemTime(123);

			return func('foo', 'bar')
				.then(() => {
					expect(character.lastUsed!.toISOString()).equal(new Date(123).toISOString());
					assert.calledOnce(save);
				});
		});

		it('rejects if server is offline', () => {
			settings.isServerOffline = true;

			return expect(func('foo', 'bar')).rejectedWith('Server is offline');
		});

		it('rejects if server is restricted from user', () => {
			server.require = 'mod';

			return expect(func('foo', 'bar')).rejectedWith('Server is restricted');
		});

		it('resolves if user meets server restrictions', () => {
			server.require = 'mod';
			account.roles = ['mod'];

			return func('foo', 'bar');
		});

		it('resolves if user meets server restrictions (supporter)', () => {
			server.require = 'sup1';
			account.patreon = PatreonFlags.Supporter2;

			return func('foo', 'bar');
		});

		it('resolves if user meets server restrictions (invited)', () => {
			server.require = 'inv';
			hasInvite.resolves(true);

			return func('foo', 'bar');
		});

		it('sets up character social site', async () => {
			const site = {};
			const siteId = new Types.ObjectId('5983e1f7519f95530becdf70');
			findAuth.withArgs(siteId, account._id).resolves(site);
			character.site = siteId;

			await func('foo', 'bar');

			expect(character.auth).equal(site);
		});

		it('does not set up character social site if its missing', async () => {
			const siteId = new Types.ObjectId('5983e1f7519f95530becdf70');
			findAuth.withArgs(siteId, account._id).resolves(undefined);
			character.site = siteId;

			await func('foo', 'bar');

			expect(character.auth).undefined;
		});

		it('does not set up character social site if its disabled', async () => {
			const site = { disabled: true };
			const siteId = new Types.ObjectId('5983e1f7519f95530becdf70');
			findAuth.withArgs(siteId, account._id).resolves(site);
			character.site = siteId;

			await func('foo', 'bar');

			expect(character.auth).undefined;
		});

		it('does not set up character social site if its banned', async () => {
			const site = { banned: true };
			const siteId = new Types.ObjectId('5983e1f7519f95530becdf70');
			findAuth.withArgs(siteId, account._id).resolves(site);
			character.site = siteId;

			await func('foo', 'bar');

			expect(character.auth).undefined;
		});
	});

	describe('getServerState()', () => {
		let func: ReturnType<typeof createGetServerState>;
		let world: World;
		let server: ServerConfig;
		let settings: GameServerSettings;
		let liveSettings: ServerLiveSettings;

		beforeEach(() => {
			world = mock(World);
			server = { flags: {} } as any;
			settings = {};
			liveSettings = { updating: false, shutdown: false };
			func = createGetServerState(server, () => settings, world, liveSettings);
		});

		it('returns combined server state', async () => {
			Object.assign(server, { id: 'aaa', name: 'bbb', path: 'ccc', desc: 'ddd', alert: 'eee', require: 'mod' });
			world.clients = [{} as any, {} as any];
			world.joinQueue = [{} as any, {} as any, {} as any];
			world.maps = [{} as any, {} as any];
			settings.isServerOffline = true;
			settings.filterSwears = true;

			const result = await func();

			expect(result).eql({
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
			world.clients = [{} as any, {} as any];
			world.joinQueue = [];
			world.maps = [];

			const result = await func();

			expect(result).eql({
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
		let stats: SinonStubbedInstance<StatsTracker>;
		let func: ReturnType<typeof createGetServerStats>;

		beforeEach(() => {
			stats = createStubInstance(StatsTracker);
			func = createGetServerStats(stats as any);
		});

		it('returns socket stats', async () => {
			const result: ServerStats = {} as any;
			stats.getSocketStats.returns(result);

			await expect(func()).eventually.equal(result);
		});
	});

	describe('action()', () => {
		let action: ReturnType<typeof createAction>;

		beforeEach(() => {
			action = createAction({} as any);
		});

		it('throws if action is invalid', async () => {
			await expect(action('foo', 'foobar')).rejectedWith('Invalid action (foo)');
		});
	});

	describe('kick()', () => {
		let func: ReturnType<typeof createKick>;
		let world: World;
		let clearTokensForAccount: SinonStub;

		beforeEach(() => {
			world = mock(World);
			clearTokensForAccount = stub();
			func = createKick(world, { clearTokensForAccount } as any);
		});

		it('kicks clients by account ID', async () => {
			const kickByAccount = stub(world, 'kickByAccount');

			await func('foo', undefined);

			assert.calledWith(kickByAccount, 'foo');
		});

		it('clears tokens by account ID', async () => {
			await func('foo', undefined);

			assert.calledWith(clearTokensForAccount, 'foo');
		});

		it('kicks clients by character ID', async () => {
			const kickByCharacter = stub(world, 'kickByCharacter');

			await func(undefined, 'bar');

			assert.calledWith(kickByCharacter, 'bar');
		});

		it('does nothing if ID is not provided', async () => {
			await func(undefined, undefined);
		});
	});

	describe('kickAll()', () => {
		let func: ReturnType<typeof createKickAll>;
		let world: World;
		let clearTokensAll: SinonStub;

		beforeEach(() => {
			world = mock(World);
			clearTokensAll = stub();
			func = createKickAll(world, { clearTokensAll } as any);
		});

		it('kicks all clients', async () => {
			const kickAll = stub(world, 'kickAll');

			await func();

			assert.calledOnce(kickAll);
		});

		it('clears all tokens', async () => {
			await func();

			assert.calledOnce(clearTokensAll);
		});
	});

	describe('notifyUpdate()', () => {
		let func: ReturnType<typeof createNotifyUpdate>;
		let world = stubClass(World);
		let liveSettings: ServerLiveSettings;

		beforeEach(() => {
			resetStubMethods(world, 'notifyUpdate', 'saveClientStates');
			liveSettings = {} as any;
			func = createNotifyUpdate(world as any, liveSettings);
		});

		it('notifies world of update', async () => {
			await func();

			assert.calledOnce(world.notifyUpdate);
		});

		it('updates character state', async () => {
			await func();

			assert.calledOnce(world.saveClientStates);
		});
	});

	describe('cancelUpdate()', () => {
		let func: ReturnType<typeof createCancelUpdate>;
		let live: ServerLiveSettings;

		beforeEach(() => {
			live = {} as any;
			func = createCancelUpdate(live);
		});

		it('sets updating to false', async () => {
			live.updating = true;

			await func();

			expect(live.updating).false;
		});
	});

	describe('shutdownServer()', () => {
		let shutdownServer: ReturnType<typeof createShutdownServer>;
		let world: World;
		let liveSettings: ServerLiveSettings;

		beforeEach(() => {
			world = mock(World);
			(world as any).server = { id: 'foo' };
			liveSettings = {} as any;
			shutdownServer = createShutdownServer(world, liveSettings);
		});

		it('updates shutdown option in live settings to true', async () => {
			await shutdownServer(true);

			expect(liveSettings.shutdown).true;
		});

		it('updates shutdown option in live settings to false', async () => {
			await shutdownServer(false);

			expect(liveSettings.shutdown).false;
		});

		it('kicks all players', async () => {
			const kickAll = stub(world, 'kickAll');

			await shutdownServer(true);

			assert.calledOnce(kickAll);
		});
	});
});
