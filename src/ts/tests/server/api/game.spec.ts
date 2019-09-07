import '../../lib';
import { SinonStub, stub, assert } from 'sinon';
import { expect } from 'chai';
import { createJoinGame, JoinGame } from '../../../server/api/game';
import { VERSION_ERROR } from '../../../common/errors';
import { PatreonFlags, InternalGameServerState } from '../../../common/adminInterfaces';
import { delay, fromNow } from '../../../common/utils';
import { genObjectId, account } from '../../mocks';

describe('api game', () => {
	describe('joinGame()', () => {
		let joinGame: JoinGame;
		let findCharacter: SinonStub;
		let join: SinonStub;
		let addOrigin: SinonStub;
		let hasInvites: SinonStub;
		let server: InternalGameServerState;

		beforeEach(() => {
			findCharacter = stub();
			join = stub();
			addOrigin = stub();
			hasInvites = stub();
			server = { state: { settings: {} } } as any;
			const findServer = stub();
			findServer.withArgs('serverid').returns(server);

			joinGame = createJoinGame(
				findServer, { version: '1', host: 'http://foo.bar/', debug: false, local: false }, findCharacter,
				join, addOrigin, hasInvites);
		});

		it('returns join token', async () => {
			const a = account({ _id: genObjectId() });
			const character = {} as any;
			findCharacter.withArgs('charid').returns(character);
			join.withArgs(server, a, character).returns('tokenid');

			await expect(joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.eventually.eql({ token: 'tokenid' });
		});

		it('resolves if meets server requirement', async () => {
			server.state.require = 'sup2';
			const a = account({ _id: genObjectId(), patreon: PatreonFlags.Supporter2 });
			const character = {} as any;
			findCharacter.withArgs('charid').returns(character);
			join.withArgs(server, a, character).returns('tokenid');

			await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any);
		});

		it('resolves if meets server requirement (invited)', async () => {
			server.state.require = 'inv';
			const a = account({ _id: genObjectId() });
			const character = {} as any;
			findCharacter.withArgs('charid').returns(character);
			hasInvites.resolves(true);
			join.withArgs(server, a, character).returns('tokenid');

			await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any);
		});

		it('adds origin to account', async () => {
			const a = account({ _id: genObjectId() });
			const origin = {} as any;
			findCharacter.withArgs('charid').returns({});

			await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, origin);

			assert.calledWith(addOrigin, a, origin);
		});

		it('returns alert if has account alert', async () => {
			const a = account({ _id: genObjectId(), alert: { message: 'test alert', expires: fromNow(9999) } });
			const origin = {} as any;
			findCharacter.withArgs('charid').returns({});

			const result = await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, origin);

			expect(result).eql({ alert: 'test alert' });
		});

		it('does not returl alert if alredy has alert', async () => {
			const a = account({ _id: genObjectId(), alert: { message: 'test alert', expires: fromNow(9999) } });
			const origin = {} as any;
			const character = {} as any;
			findCharacter.withArgs('charid').returns(character);
			join.withArgs(server, a, character).returns('tokenid');

			const result = await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', true, origin);

			expect(result).eql({ token: 'tokenid' });
		});

		it('rejects if passed version is different than server version', async () => {
			await expect(joinGame(account({ _id: genObjectId() }), 'charid', 'serverid', '2', 'http://foo.bar/', false, {} as any))
				.rejectedWith(VERSION_ERROR);
		});

		it('rejects if passed url is different than server url', async () => {
			await expect(joinGame(account({ _id: genObjectId() }), 'charid', 'serverid', '1', 'http://im.invalid/', false, {} as any))
				.rejectedWith('Invalid data');
		});

		it('rejects if server is not found', async () => {
			await expect(joinGame(account({ _id: genObjectId() }), 'charid', 'doesnotexist', '1', 'http://foo.bar/', false, {} as any))
				.rejectedWith('Invalid data');
		});

		it('rejects if server is offline', async () => {
			server.state.settings.isServerOffline = true;

			await expect(joinGame(account({ _id: genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.rejectedWith('Server is offline');
		});

		it('rejects if server is restricted', async () => {
			server.state.require = 'mod';

			await expect(joinGame(account({ _id: genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.rejectedWith('Server is restricted');
		});

		it('rejects if character ID is missing', async () => {
			await expect(joinGame(
				account({ _id: genObjectId() }), undefined as any, 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.rejectedWith('Invalid data');
		});

		it('rejects if character ID is not string', async () => {
			await expect(joinGame(
				account({ _id: genObjectId() }), { foo: 'bar' } as any, 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.rejectedWith('Invalid data');
		});

		it('rejects if character does not exist', async () => {
			await expect(joinGame(
				account({ _id: genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.rejectedWith('Character does not exist');
		});

		it('rejects if already joining', async () => {
			findCharacter.withArgs('charid').returns({});
			join.returns(new Promise(() => { }));
			const _id = genObjectId();

			joinGame(account({ _id }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any);

			await delay(1);
			await expect(joinGame(account({ _id }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.rejectedWith('Already waiting for join request');
		});

		it('does not reject if other client is already joining', async () => {
			findCharacter.withArgs('charid').returns({});
			findCharacter.withArgs('charid2').returns({});
			join.returns(new Promise(() => { }));
			join.returns('tokenid');

			joinGame(account({ _id: genObjectId() }), 'charid2', 'serverid', '1', 'http://foo.bar/', false, {} as any);

			await delay(1);
			await expect(joinGame(account({ _id: genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.eventually.eql({ token: 'tokenid' });
		});

		it('rejects if joining is blocked', async () => {
			server.state.settings.blockJoining = true;
			findCharacter.withArgs('charid').returns({});

			await expect(joinGame(account({ _id: genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {} as any))
				.rejectedWith('Cannot join to the server');
		});
	});
});
