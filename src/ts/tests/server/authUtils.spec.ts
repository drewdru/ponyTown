import '../lib';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import { Types } from 'mongoose';
import { updateAuthInfo } from '../../server/authUtils';
import { auth, genId } from '../mocks';
import { Profile } from '../../common/interfaces';

function profile(options: Partial<Profile>): Profile {
	return options as Profile;
}

describe('authUtils', () => {
	describe('updateAuthInfo()', () => {
		it('updates url and name fields', async () => {
			const updateAuth = stub();
			const a = auth({ _id: 'bar' });

			await updateAuthInfo(updateAuth, a, profile({ username: 'foo', url: 'bar' }), undefined);

			expect(a.name).eql('foo');
			expect(a.url).eql('bar');
			assert.calledWith(updateAuth, 'bar', { name: 'foo', url: 'bar' });
		});

		it('updates email field', async () => {
			const a = auth({ emails: ['a'] });

			await updateAuthInfo(stub(), a, profile({ emails: ['b', 'c'] }), undefined);

			expect(a.emails).eql(['a', 'b', 'c']);
		});

		it('updates email field (from empty)', async () => {
			const updateAuth = stub();
			const a = auth({ _id: 'bar' });

			await updateAuthInfo(updateAuth, a, profile({ emails: ['b', 'c'] }), undefined);

			expect(a.emails).eql(['b', 'c']);
			assert.calledWith(updateAuth, 'bar', { emails: ['b', 'c'] });
		});

		it('saves updated auth', async () => {
			const updateAuth = stub();

			await updateAuthInfo(updateAuth, auth({ _id: 'bar' }), profile({ username: 'foo' }), undefined);

			assert.calledWith(updateAuth, 'bar', { name: 'foo' });
		});

		it('updates account if passed account ID', async () => {
			const a = auth({});
			const accountId = genId();

			await updateAuthInfo(stub(), a, profile({ username: 'foo', url: 'bar' }), accountId);

			expect(a.account).eql(Types.ObjectId(accountId));
		});

		it('does not save auth if nothing changed', async () => {
			const updateAuth = stub();

			await updateAuthInfo(updateAuth, auth({ _id: 'bar', name: 'foo' }), profile({ username: 'foo' }), undefined);

			assert.notCalled(updateAuth);
		});

		it('does nothing if email list is the same', async () => {
			const updateAuth = stub();
			const a = auth({ _id: 'bar', emails: ['a', 'b'] });

			await updateAuthInfo(updateAuth, a, profile({ emails: ['b', 'a'] }), undefined);

			assert.notCalled(updateAuth);
		});

		it('does nothing if auth is undefined', async () => {
			const updateAuth = stub();

			await updateAuthInfo(updateAuth, undefined, profile({}), undefined);

			assert.notCalled(updateAuth);
		});
	});
});
