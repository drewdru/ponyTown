import { stubClass, resetStubMethods } from '../lib';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { expect } from 'chai';
import { assert, match } from 'sinon';
import { from } from 'rxjs';
import { Model } from '../../components/services/model';
import { ErrorReporter } from '../../components/services/errorReporter';
import { NAME_ERROR } from '../../common/errors';
import { StorageService } from '../../components/services/storageService';

describe.skip('Model', () => {
	let http: any = stubClass(HttpClient);
	let router = stubClass(Router);
	let storage = stubClass(StorageService);
	let errorReporter = stubClass(ErrorReporter);
	let model: Model;

	beforeEach(async () => {
		resetStubMethods(http, 'post', 'get');
		resetStubMethods(router);
		resetStubMethods(storage);
		resetStubMethods(errorReporter);
		http.post.withArgs('/api1/account').returns(from([{
			id: 'accid',
			name: 'accname',
			settings: {},
			friends: [],
		}]));
		model = new Model(http as any, router as any, storage as any, errorReporter);
		await model.accountPromise;
		(global as any).location = { href: 'local-href' };
	});

	describe('supporter', () => {
		it('returns 0 if not supporter', () => {
			expect(model.supporter).equal(0);
		});

		it('returns supporter level', () => {
			model.account!.supporter = 2;

			expect(model.supporter).equal(2);
		});
	});

	describe('signOut()', () => {
		it('makes sign out request', async () => {
			http.post.withArgs('/auth/sign-out').returns(from([{}]));

			await model.signOut();
			await model.accountPromise;

			assert.calledWithMatch(http.post, '/auth/sign-out', {}, match.any);
		});

		it('re-fetches account details', async () => {
			http.post.reset();
			http.post.withArgs('/auth/sign-out').returns(from([{}]));
			http.post.withArgs('/api1/account').returns(from([null]));

			await model.signOut();
			await model.accountPromise;

			assert.calledWithMatch(http.post, '/api1/account', match.any, match.any);
		});
	});

	describe('updateAccount()', () => {
		it('makes update request', async () => {
			http.post.withArgs('/api/account-update').returns(from([{ name: 'bar' }]));

			await model.updateAccount({ name: 'bar', birthdate: '' });

			assert.calledWithMatch(http.post, '/api/account-update', { account: { name: 'bar' } }, match.any);
		});

		it('updates account with returned result', async () => {
			http.post.withArgs('/api/account-update').returns(from([{ name: 'bar' }]));

			await model.updateAccount({ name: 'bar', birthdate: '' });

			expect(model.account!.name).equal('bar');
		});
	});

	describe('saveSettings()', () => {
		it('makes save settings request', async () => {
			http.post.withArgs('/api/account-settings')
				.returns(from([{ settings: { ignorePartyInvites: true } }]));

			await model.saveSettings({ ignorePartyInvites: true });

			assert.calledWithMatch(http.post, '/api/account-settings', { settings: { ignorePartyInvites: true } }, match.any);
		});

		it('updates settings with returned result', async () => {
			http.post.withArgs('/api/account-settings')
				.returns(from([{ settings: { ignorePartyInvites: true } }]));

			await model.saveSettings({ ignorePartyInvites: true });

			expect(model.account!.settings.ignorePartyInvites).true;
		});
	});

	describe('removeSite()', () => {
		it('makes remove request', async () => {
			http.post.withArgs('/api/remove-site').returns(from([{}]));

			await model.removeSite('siteid');

			assert.calledWithMatch(http.post, '/api/remove-site', { siteId: 'siteid' }, match.any);
		});

		it('removes site from the list', async () => {
			http.post.withArgs('/api/remove-site').returns(from([{}]));
			const site = { id: 'siteid' } as any;
			model.account!.sites = [site];

			await model.removeSite('siteid');

			expect(model.account!.sites).not.contain(site);
		});
	});

	describe('savePony()', () => {
		it('makes save request', async () => {
			http.post.withArgs('/api/pony/save').returns(from([{}]));

			await model.savePony({
				id: 'ponyid',
				name: 'ponyname',
				info: 'ponyinfo',
				site: 'siteid',
				tag: 'tagname',
				hideSupport: true,
			});

			assert.calledWithMatch(http.post, '/api/pony/save', {
				pony: {
					id: 'ponyid',
					name: 'ponyname',
					info: 'ponyinfo',
					site: 'siteid',
					tag: 'tagname',
					hideSupport: true,
				},
			}, match.any);
		});

		it('rejects if name is invalid', async () => {
			http.post.withArgs('/api/pony/save').returns(from([{}]));

			await expect(model.savePony({ id: '', name: '', info: 'ponyinfo' })).rejectedWith(NAME_ERROR);
		});

		it('rejects if already saving', async () => {
			http.post.withArgs('/api/pony/save').returns(from([{}]));

			await Promise.all([
				model.savePony({ id: '', name: 'ponyname', info: 'ponyinfo' }),
				expect(model.savePony({ id: '', name: '', info: 'ponyinfo' })).rejectedWith('Saving in progress'),
			]);
		});
	});

	describe('removePony()', () => {
		it('makes remove request', async () => {
			const ponyObject = { id: 'ponyid' } as any;
			http.post.withArgs('/api/pony/remove').returns(from([{}]));

			await model.removePony(ponyObject);

			assert.calledWithMatch(http.post, '/api/pony/remove', { id: 'ponyid' }, match.any);
		});
	});

	describe('status()', () => {
		it('fetches full server status', async () => {
			const status = {};
			http.get.withArgs('/api2/game/status').returns(from([status]));

			const result = await model.status(false);

			assert.calledWithMatch(http.get, '/api2/game/status');
			expect(result).eql(status);
		});
	});

	describe('join()', () => {
		it('fetches join result', async () => {
			const state = {};
			http.post.withArgs('/api/game/join').returns(from([state]));

			const result = await model.join('serverid', 'ponyid');

			assert.calledWithMatch(http.post, '/api/game/join', {
				accountId: 'accid',
				accountName: 'accname',
				version: undefined,
				serverId: 'serverid',
				ponyId: 'ponyid',
				url: 'local-href',
			}, match.any);
			expect(result).equal(state);
		});

		it('rejects if called when already pending', async () => {
			http.post.withArgs('/api/game/join').returns(from([{}]));

			const promise1 = model.join('serverid', 'ponyid');
			const promise2 = model.join('serverid', 'ponyid');

			await Promise.all([
				promise1,
				expect(promise2).rejectedWith('Joining in progress'),
			]);
		});

		it('rejects if server is invalid', async () => {
			http.post.withArgs('/api/game/join').returns(from([{}]));

			await expect(model.join('', 'ponyid')).rejectedWith('Invalid server ID');
		});

		it('rejects if pony is invalid', async () => {
			http.post.withArgs('/api/game/join').returns(from([{}]));

			await expect(model.join('serverid', '')).rejectedWith('Invalid pony ID');
		});
	});
});
