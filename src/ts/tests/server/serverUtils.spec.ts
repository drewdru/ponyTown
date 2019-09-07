import '../lib';
import { stub, assert, SinonStub } from 'sinon';
import { expect } from 'chai';
import { Types } from 'mongoose';
import { toPonyObject, toSocialSite, tokenService, toPonyObjectAdmin } from '../../server/serverUtils';
import { character, genId, auth } from '../mocks';
import { CharacterFlags } from '../../common/adminInterfaces';
import { TokenService } from '../../server/serverInterfaces';

describe('serverUtils', () => {
	describe('tokenService()', () => {
		let service: TokenService;
		let socket: {
			clearTokens: SinonStub;
			token: SinonStub;
		};

		beforeEach(() => {
			socket = {
				clearTokens: stub(),
				token: stub(),
			};

			service = tokenService(socket as any);
		});

		it('clears tokens for account', () => {
			service.clearTokensForAccount('foo');

			const filter = socket.clearTokens.args[0][0];
			expect(filter('', { accountId: 'foo' })).true;
			expect(filter('', { accountId: 'bar' })).false;
			assert.calledOnce(socket.clearTokens);
		});

		it('clears all tokens', () => {
			service.clearTokensAll();

			const filter = socket.clearTokens.args[0][0];
			expect(filter('', {})).true;
			assert.calledOnce(socket.clearTokens);
		});

		it('creates token', () => {
			const token = { account: {}, character: {} } as any;

			service.createToken(token);

			assert.calledWith(socket.token, token);
		});
	});

	describe('toPonyObject()', () => {
		it('returns pony object', () => {
			const id = genId();

			expect(toPonyObject(character({
				_id: Types.ObjectId(id),
				name: 'foo',
				desc: 'aaa',
				info: 'info',
				site: Types.ObjectId('000000000000000000000002'),
				tag: 'tag',
				lastUsed: new Date(123),
			}))).eql({
				id: id,
				name: 'foo',
				desc: 'aaa',
				info: 'info',
				site: '000000000000000000000002',
				tag: 'tag',
				lastUsed: '1970-01-01T00:00:00.123Z',
				hideSupport: undefined,
				respawnAtSpawn: undefined,
			});
		});

		it('handles empty fields', () => {
			const id = genId();

			expect(toPonyObject(character({
				_id: Types.ObjectId(id),
				name: 'foo',
			}))).eql({
				id: id,
				name: 'foo',
				desc: '',
				info: '',
				site: undefined,
				tag: undefined,
				lastUsed: undefined,
				hideSupport: undefined,
				respawnAtSpawn: undefined,
			});
		});

		it('sets hide support field', () => {
			const output = toPonyObject(character({
				_id: Types.ObjectId(genId()),
				name: 'foo',
				flags: CharacterFlags.HideSupport,
			}));

			expect(output!.hideSupport).true;
		});

		it('sets respawn at spawn field', () => {
			const output = toPonyObject(character({
				_id: Types.ObjectId(genId()),
				name: 'foo',
				flags: CharacterFlags.RespawnAtSpawn,
			}));

			expect(output!.respawnAtSpawn).true;
		});

		it('returns null for undefined character', () => {
			expect(toPonyObject(undefined)).null;
		});
	});

	describe('toPonyObjectAdmin()', () => {
		it('returns pony object', () => {
			const id = genId();

			expect(toPonyObjectAdmin(character({
				_id: Types.ObjectId(id),
				name: 'foo',
				desc: 'aaa',
				info: 'info',
				site: Types.ObjectId('000000000000000000000001'),
				tag: 'tag',
				lastUsed: new Date(123),
				creator: 'foo bar',
			}))).eql({
				id: id,
				name: 'foo',
				desc: 'aaa',
				info: 'info',
				site: '000000000000000000000001',
				tag: 'tag',
				lastUsed: '1970-01-01T00:00:00.123Z',
				hideSupport: undefined,
				respawnAtSpawn: undefined,
				creator: 'foo bar',
			});
		});

		it('returns null for undefined character', () => {
			expect(toPonyObjectAdmin(undefined)).null;
		});
	});

	describe('toSocialSite()', () => {
		it('returns site object', () => {
			const id = genId();

			expect(toSocialSite(auth({
				_id: Types.ObjectId(id),
				name: 'foo',
				provider: 'github',
				url: 'foo.com',
			}))).eql({
				id: id,
				name: 'foo',
				provider: 'github',
				url: 'foo.com',
			});
		});
	});
});
