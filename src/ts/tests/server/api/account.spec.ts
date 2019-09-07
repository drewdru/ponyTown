import '../../lib';
import { expect } from 'chai';
import { assert, stub, SinonStub } from 'sinon';
import {
	createUpdateAccount, UpdateAccount, createRemoveSite, RemoveSite, createUpdateSettings, UpdateSettings,
	createGetAccountCharacters, GetAccountCharacters, GetAccountData, createGetAccountData, modCheck
} from '../../../server/api/account';
import { account, genObjectId } from '../../mocks';
import * as db from '../../../server/db';

describe('api account', () => {
	describe('getAccountData()', () => {
		let findCharacters: SinonStub;
		let findAuths: SinonStub;
		let getAccountData: GetAccountData;
		let findFriends: SinonStub;

		beforeEach(() => {
			findCharacters = stub();
			findAuths = stub();
			findFriends = stub(db, 'findFriends').resolves([]);
			getAccountData = createGetAccountData(findCharacters, findAuths);
		});

		afterEach(() => {
			findFriends.restore();
		});

		it('returns account data', async () => {
			findCharacters.resolves([]);
			findAuths.resolves([]);
			const _id = genObjectId();

			const result = await getAccountData(account({ _id, name: 'foo', birthdate: new Date(123), characterCount: 5 }));

			expect(result).eql({
				id: _id.toString(),
				name: 'foo',
				birthdate: '1970-01-01',
				birthyear: undefined,
				characterCount: 5,
				ponies: [],
				settings: {},
				sites: [],
				alert: undefined,
				supporter: undefined,
				flags: 0,
				roles: undefined,
			});
		});

		it('adds mod check if account is mod', async () => {
			findCharacters.resolves([]);
			findAuths.resolves([]);

			const result = await getAccountData(account({ _id: genObjectId(), roles: ['mod'] }));

			expect(result.check).eql(modCheck);
		});
	});

	describe('getAccountCharacters()', () => {
		let findCharacters: SinonStub;
		let getAccountCharacters: GetAccountCharacters;

		beforeEach(() => {
			findCharacters = stub();
			getAccountCharacters = createGetAccountCharacters(findCharacters);
		});

		it('returns empty array', async () => {
			findCharacters.resolves([]);

			const result = await getAccountCharacters(account({}));

			expect(result).eql([]);
		});

		it('returns chracters array', async () => {
			const accountId = genObjectId();
			const characterId = genObjectId();
			findCharacters.withArgs(accountId).resolves([
				{
					_id: characterId,
					name: 'foo',
					info: 'info',
					lastUsed: new Date(123),
				},
			]);

			const result = await getAccountCharacters(account({ _id: accountId }));

			expect(result).eql([
				{
					id: characterId.toString(),
					name: 'foo',
					desc: '',
					info: 'info',
					lastUsed: '1970-01-01T00:00:00.123Z',
					site: undefined,
					tag: undefined,
					hideSupport: undefined,
					respawnAtSpawn: undefined,
				},
			]);
		});
	});

	describe('updateAccount()', () => {
		let findAccount: SinonStub;
		let updateAccount: UpdateAccount;
		let updateOne: SinonStub;
		let log: SinonStub;

		beforeEach(() => {
			findAccount = stub();
			log = stub();
			updateOne = stub(db.Account, 'updateOne').returns({ exec: stub().resolves() } as any);
			updateAccount = createUpdateAccount(findAccount, log);
		});

		afterEach(() => {
			updateOne.restore();
		});

		it('resolves to account data', async () => {
			const account = {
				_id: genObjectId(),
				name: 'name',
				birthdate: new Date(123),
				birthyear: 123,
				roles: ['role'],
				settings: { foo: 'bar' },
				characterCount: 5,
				save: stub(),
			} as any;
			findAccount.withArgs(account._id).resolves(account);

			const result = await updateAccount(account, {} as any);

			expect(result).eql({
				id: account._id.toString(),
				name: 'name',
				birthdate: '1970-01-01',
				birthyear: 123,
				roles: ['role'],
				settings: { foo: 'bar' },
				supporter: undefined,
				characterCount: 5,
				flags: 0,
			});
		});

		it('saves account', async () => {
			const acc = account({ _id: genObjectId() });
			findAccount.resolves(acc);

			await updateAccount(acc, {} as any);

			assert.calledWith(updateOne, { _id: acc._id }, {});
		});

		it('updates account name', async () => {
			const acc = account({ _id: genObjectId() });
			findAccount.resolves(acc);

			await updateAccount(acc, { name: 'foo', birthdate: '' });

			expect(acc.name).equal('foo');
		});

		it('logs account rename', async () => {
			const acc = account({ _id: genObjectId(), name: 'bar' });
			findAccount.resolves(acc);

			await updateAccount(acc, { name: 'foo', birthdate: '' });

			assert.calledWith(log, acc._id, 'Renamed "bar" => "foo"');
		});

		it('cleans account name before updating', async () => {
			const acc = account({ _id: genObjectId() });
			findAccount.resolves(acc);

			await updateAccount(acc, { name: 'f\t\r\noo', birthdate: '' });

			expect(acc.name).equal('foo');
		});

		const invalidNameValues: any[] = [
			'',
			// 'a',
			'string_that_is_exceeding_character_limit_for_account_names_aaaaaaaaaaaaaaaaaaaaaaaaa',
			{ foo: 'bar' },
			123,
			null,
		];

		invalidNameValues.forEach(name => it(`does not update account name if it is invalid (${name})`, async () => {
			const account = { _id: genObjectId(), name: 'name', save: stub() } as any;
			findAccount.resolves(account);

			await updateAccount(account, { name, birthdate: '' });

			expect(account.name).equal('name');
		}));

		it('updates account birthdate', async () => {
			const account = { _id: genObjectId(), save: stub() } as any;
			findAccount.resolves(account);

			await updateAccount(account, { name: 'foo', birthdate: '2000-02-03' });

			expect(account.birthdate.getTime()).equal(new Date('2000-02-03').getTime());
		});

		it('does not update birthday if it has invalid value', async () => {
			const account = { _id: genObjectId(), save: stub(), birthdate: new Date(321) } as any;
			findAccount.resolves(account);

			await updateAccount(account, { name: 'foo', birthdate: '0123-00-01' });

			expect(account.birthdate.getTime()).equal(new Date(321).getTime());
		});

		it('logs birthday change', async () => {
			const account = { _id: genObjectId(), name: 'bar', save: stub(), birthdate: new Date(12345) } as any;
			findAccount.resolves(account);

			await updateAccount(account, { name: 'bar', birthdate: '2000-02-03' });

			assert.calledWith(log, account._id, 'Changed birthdate 1970-01-01 (49yo) => 2000-02-03 (19yo)');
		});
	});

	describe('updateSettings()', () => {
		let findAccount: SinonStub;
		let updateOne: SinonStub;
		let updateSettings: UpdateSettings;

		beforeEach(() => {
			findAccount = stub();
			updateOne = stub(db.Account, 'updateOne').returns({ exec: stub().resolves() } as any);
			updateSettings = createUpdateSettings(findAccount);
		});

		afterEach(() => {
			updateOne.restore();
		});

		it('returns account data', async () => {
			const _id = genObjectId();

			findAccount.resolves({
				_id,
				name: 'foo',
				birthdate: new Date(123),
				birthyear: 123,
				roles: ['mod'],
				settings: { foo: 'bar' },
				characterCount: 4,
				flags: 1,
				supporter: 1,
				save() { },
			});

			const result = await updateSettings(account({}), {});

			expect(result).eql({
				id: _id.toString(),
				name: 'foo',
				birthdate: '1970-01-01',
				birthyear: 123,
				roles: ['mod'],
				settings: { foo: 'bar' },
				characterCount: 4,
				flags: 0,
				supporter: 1,
			});
		});

		it('updates account settings', async () => {
			const save = stub();
			const acc = { _id: genObjectId(), save, settings: undefined as any };
			findAccount.resolves(acc);

			await updateSettings(account({ _id: acc._id }), {
				filterSwearWords: true,
				filterCyrillic: true,
				ignorePartyInvites: true,
			});

			expect(acc.settings).eql({
				filterSwearWords: true,
				filterCyrillic: true,
				ignorePartyInvites: true,
			});
			assert.calledWith(updateOne, { _id: acc._id }, {
				settings: {
					filterSwearWords: true,
					filterCyrillic: true,
					ignorePartyInvites: true,
				}
			});
		});

		it('merges account settings', async () => {
			const save = stub();
			const acc = {
				_id: genObjectId(),
				save,
				settings: {
					filterSwearWords: true,
					filterCyrillic: true,
					ignorePartyInvites: true,
				},
			};
			findAccount.resolves(acc);

			await updateSettings(account({ _id: acc._id }), {
				filterSwearWords: false,
				filterCyrillic: true,
				ignorePartyInvites: true,
			});

			expect(acc.settings).eql({
				filterSwearWords: false,
				filterCyrillic: true,
				ignorePartyInvites: true,
			});
			assert.calledWith(updateOne, { _id: acc._id }, {
				settings: {
					filterSwearWords: false,
					filterCyrillic: true,
					ignorePartyInvites: true,
				}
			});
		});

		it('ignores missing fields', async () => {
			const acc = { _id: genObjectId(), settings: undefined as any };
			findAccount.resolves(acc);

			await updateSettings(account({ _id: acc._id }), {});

			expect(acc.settings).eql({});
			assert.calledWith(updateOne, { _id: acc._id }, { settings: {} });
		});

		it('ignores missing settings', async () => {
			const acc = { _id: genObjectId(), settings: undefined as any };
			findAccount.resolves(acc);

			await updateSettings(account({ _id: acc._id }), undefined);

			expect(acc.settings).eql({});
			assert.calledWith(updateOne, { _id: acc._id }, { settings: {} });
		});
	});

	describe('removeSite()', () => {
		let findAuth: SinonStub;
		let countAuths: SinonStub;
		let log: SinonStub;
		let removeSite: RemoveSite;
		let updateOne: SinonStub<any>;

		beforeEach(() => {
			findAuth = stub();
			countAuths = stub();
			log = stub();
			updateOne = stub(db.Auth, 'updateOne').returns({ exec: () => stub().resolves() } as any);
			removeSite = createRemoveSite(findAuth, countAuths, log);
		});

		afterEach(() => {
			updateOne.restore();
		});

		it('returns empty object', async () => {
			findAuth.resolves({});
			countAuths.resolves(2);

			const result = await removeSite(account({}), 'SITE_ID');

			expect(result).eql({});
		});

		it('disables auth', async () => {
			const authId = genObjectId();
			const accountId = genObjectId();
			const auth = { _id: authId, disabled: false };
			const acc = account({ _id: accountId });
			findAuth.withArgs('SITE_ID', accountId).resolves(auth);
			countAuths.withArgs(accountId).resolves(2);

			await removeSite(acc, 'SITE_ID');

			assert.calledWithMatch(updateOne, { _id: authId }, { disabled: true });
		});

		it('throws if siteId is not string', async () => {
			findAuth.resolves(account({}));
			countAuths.resolves(2);

			await expect(removeSite(account({}), {}))
				.rejectedWith('Social account not found');
		});

		it('throws if auth does not exist', async () => {
			findAuth.resolves(undefined);
			countAuths.resolves(2);

			await expect(removeSite(account({}), 'SITE_ID'))
				.rejectedWith('Social account not found');
		});

		it('throws if auth is disabled', async () => {
			findAuth.resolves({ disabled: true });
			countAuths.resolves(2);

			await expect(removeSite(account({}), 'SITE_ID'))
				.rejectedWith('Social account not found');
		});

		it('throws if user has only one auth', async () => {
			findAuth.resolves({});
			countAuths.resolves(1);

			await expect(removeSite(account({}), 'SITE_ID'))
				.rejectedWith('Cannot remove your only one social account');
		});

		it('logs auth removal', async () => {
			const accountId = genObjectId();
			const authId = genObjectId();
			findAuth.resolves({ _id: authId, name: 'foo' });
			countAuths.resolves(2);

			await removeSite(account({ _id: accountId }), 'SITE_ID');

			assert.calledWith(log, accountId, `removed auth: foo [${authId}]`);
		});
	});
});
