import '../lib';
import { noop } from 'lodash';
import { Types } from 'mongoose';
import { expect } from 'chai';
import { stub, assert, SinonStub, SinonFakeTimers, useFakeTimers, match } from 'sinon';
import {
	createRemoveOldSupporters, createUpdateSupporters, fetchPatreonData, createUpdatePatreonInfo,
	RemoveOldSupporters, UpdateSupporters, createAddTotalPledged, AddTotalPledged
} from '../../server/patreon';
import { genId, auth, account } from '../mocks';
import { PatreonFlags, PatreonData } from '../../common/adminInterfaces';
import { fromNow, fromDate } from '../../common/utils';
import { DAY, rewardLevel1, rewardLevel2 } from '../../common/constants';

const dbId = () => Types.ObjectId(genId());
const queryBase = 'page%5Bcount%5D=100&sort=created';
const queryAdd = '&include=patron.null,reward.null&fields%5Bpledge%5D=total_historical_amount_cents,declined_since';
const query = `${queryBase}${queryAdd}`;

describe('patreon', () => {
	describe('fetchPatreonData()', () => {
		let client: SinonStub;

		beforeEach(() => {
			client = stub();
			client.withArgs('/current_user/campaigns')
				.resolves({ rawJson: { data: [{ id: 'foo' }], included: [] } });
			client.withArgs(`/campaigns/foo/pledges?${query}`)
				.resolves({ rawJson: { data: [], links: {} } });
		});

		it('returns rewards', async () => {
			client.withArgs('/current_user/campaigns')
				.resolves({
					rawJson: {
						data: [{ id: 'foo', attributes: {} }],
						included: [
							{ type: 'reward', id: '123', attributes: { title: 'title', description: 'desc' } },
							{ type: 'other', id: '111', attributes: { title: 'ttt', description: 'ddd' } },
						],
					},
				});

			const result = await fetchPatreonData(client as any, noop);

			expect(result.rewards).eql([
				{ id: '123', title: 'title', description: 'desc' },
			]);
		});

		it('fixes incomplete data', async () => {
			client.withArgs('/current_user/campaigns')
				.resolves({
					rawJson: {
						data: [{ id: 'foo' }],
						included: [
							{ type: 'reward', id: '123', attributes: {} },
						],
					},
				});

			const result = await fetchPatreonData(client as any, noop);

			expect(result.rewards).eql([
				{ id: '123', title: '', description: '' },
			]);
		});

		it('returns pledges', async () => {
			client.withArgs(`/campaigns/foo/pledges?${query}`)
				.resolves({
					rawJson: {
						data: [
							{
								attributes: { total_historical_amount_cents: 100 },
								relationships: { patron: { data: { id: 'patid1' } }, reward: { data: { id: 'rewid1' } } },
							},
							{
								attributes: { total_historical_amount_cents: 200 },
								relationships: { patron: { data: { id: 'patid2' } }, reward: { data: { id: 'rewid2' } } },
							},
						],
						links: {},
					},
				});

			const result = await fetchPatreonData(client as any, noop);

			expect(result.pledges).eql([
				{ user: 'patid1', reward: 'rewid1', total: 100, declinedSince: undefined },
				{ user: 'patid2', reward: 'rewid2', total: 200, declinedSince: undefined },
			]);
		});

		it('skips pledges with missing data', async () => {
			client.withArgs(`/campaigns/foo/pledges?${query}`)
				.resolves({
					rawJson: {
						data: [
							{
								attributes: {},
								relationships: { patron: { data: { id: 'patid1' } }, reward: { data: { id: 'rewid1' } } },
							},
							{
								attributes: {},
								relationships: { patron: {}, reward: { data: { id: 'rewid2' } } },
							},
							{
								attributes: {},
								relationships: { patron: { data: { id: 'patid3' } }, reward: {} },
							},
						],
						links: {},
					},
				});

			const result = await fetchPatreonData(client as any, noop);

			expect(result.pledges).eql([
				{ user: 'patid1', reward: 'rewid1', total: 0, declinedSince: undefined },
			]);
		});

		it('fetches multiple pages of pledges (with correct parameters for next page)', async () => {
			client.withArgs(`/campaigns/foo/pledges?${query}`)
				.resolves({
					rawJson: {
						data: [
							{
								attributes: {},
								relationships: { patron: { data: { id: 'patid1' } }, reward: { data: { id: 'rewid1' } } },
							},
						],
						links: {
							next: 'https://www.patreon.com/api/oauth2/api/link-to-next-page?page=5',
						},
					},
				});
			client.withArgs('/link-to-next-page?page=5' + queryAdd)
				.resolves({
					rawJson: {
						data: [
							{
								attributes: {},
								relationships: { patron: { data: { id: 'patid2' } }, reward: { data: { id: 'rewid2' } } },
							},
						],
						links: {},
					},
				});

			const result = await fetchPatreonData(client as any, noop);

			assert.calledWith(client, '/link-to-next-page?page=5' + queryAdd);
			expect(result.pledges).eql([
				{ user: 'patid1', reward: 'rewid1', total: 0, declinedSince: undefined },
				{ user: 'patid2', reward: 'rewid2', total: 0, declinedSince: undefined },
			]);
		});

		it('throws on too many pages', async () => {
			client.withArgs(`/campaigns/foo/pledges?${query}`)
				.resolves({
					rawJson: {
						data: [
							{
								attributes: {},
								relationships: { patron: { data: { id: 'patid1' } }, reward: { data: { id: 'rewid1' } } },
							},
						],
						links: {
							next: `/campaigns/foo/pledges?${queryBase}`,
						},
					},
				});

			await expect(fetchPatreonData(client as any, noop)).rejectedWith('Exceeded 100 pages of patreon data');
		});
	});

	describe('updatePatreonInfo()', () => {
		let queryAuths: SinonStub;
		let queryAccounts: SinonStub;
		let removeOldSupporters: SinonStub;
		let updateSupporters: SinonStub;
		let addTotalPledged: SinonStub;
		let updatePatreonInfo: (data: PatreonData, now: Date) => any;

		beforeEach(() => {
			queryAuths = stub();
			queryAccounts = stub();
			removeOldSupporters = stub();
			updateSupporters = stub();
			addTotalPledged = stub();
			updatePatreonInfo = createUpdatePatreonInfo(
				queryAuths, queryAccounts, removeOldSupporters, updateSupporters, addTotalPledged);
		});

		it('queries auths', async () => {
			queryAuths.resolves([]);
			queryAccounts.resolves([]);

			await updatePatreonInfo({
				pledges: [
					{ reward: '123', user: 'foo', total: 0 },
					{ reward: '123', user: 'bar', total: 0 },
				],
				rewards: [],
			}, new Date());

			assert.calledWith(queryAuths, match({
				provider: 'patreon',
				openId: { $in: ['foo', 'bar'] },
				account: { $exists: true },
				banned: { $ne: true },
				disabled: { $ne: true },
			}), '_id account openId pledged');
		});

		it('queries accounts', async () => {
			queryAuths.resolves([]);
			queryAccounts.resolves([]);

			await updatePatreonInfo({ pledges: [], rewards: [] }, new Date());

			assert.calledWith(
				queryAccounts, match({ patreon: { $exists: true, $ne: 0 } }), '_id patreon supporterDeclinedSince');
		});

		it('removes old supporters', async () => {
			const auths = [{}] as any;
			const accounts = [{}] as any;
			queryAuths.resolves(auths);
			queryAccounts.resolves(auths);

			await updatePatreonInfo({ pledges: [], rewards: [] }, new Date());

			assert.calledWith(removeOldSupporters, auths, accounts);
		});

		it('adds new supporters', async () => {
			const auths = [{}] as any;
			const accounts = [{}] as any;
			const pledges = [{}] as any;
			const now = new Date();
			queryAuths.resolves(auths);
			queryAccounts.resolves(auths);

			await updatePatreonInfo({ pledges, rewards: [] }, now);

			assert.calledWith(updateSupporters, auths, accounts, pledges, now);
		});

		it('adds total pledged', async () => {
			const auths = [{}] as any;
			const pledges = [{}] as any;
			queryAuths.resolves(auths);
			queryAccounts.resolves(auths);

			await updatePatreonInfo({ pledges, rewards: [] }, new Date());

			assert.calledWith(addTotalPledged, auths, pledges);
		});
	});

	describe('removeOldSupporters()', () => {
		let updateAccounts: SinonStub;
		let log: SinonStub;
		let removeOldSupporters: RemoveOldSupporters;
		let clock: SinonFakeTimers;

		const update = {
			$unset: { patreon: 1, supporterDeclinedSince: 1 },
			$push: {
				supporterLog: {
					$each: [{ date: new Date(1234), message: 'removed supporter' }],
					$slice: -10,
				},
			},
		};

		beforeEach(() => {
			clock = useFakeTimers();
			clock.setSystemTime(1234);
			updateAccounts = stub();
			log = stub();
			removeOldSupporters = createRemoveOldSupporters(updateAccounts, log);
		});

		afterEach(() => {
			clock.restore();
		});

		it('does nothing if list of auth and accounts are empty', async () => {
			await removeOldSupporters([], []);

			assert.calledWithMatch(updateAccounts, { _id: { $in: [] } }, update);
		});

		it('unsets patreon for all accounts without corresponding auths', async () => {
			const accountId = dbId();

			await removeOldSupporters([], [account({ _id: accountId })]);

			assert.calledWithMatch(updateAccounts, { _id: { $in: [accountId] } }, update);
			assert.calledWith(log, accountId.toHexString(), `removed supporter`);
		});

		it('unsets patreon for all accounts without corresponding auths (2)', async () => {
			const account1Id = dbId();
			const account2Id = dbId();

			await removeOldSupporters(
				[auth({ account: Types.ObjectId(account2Id.toHexString()) })],
				[account({ _id: account1Id }), account({ _id: account2Id })]);

			assert.calledWithMatch(updateAccounts, { _id: { $in: [account1Id] } }, update);
			assert.calledWith(log, account1Id.toHexString(), `removed supporter`);
		});

		it('works with unassigned auths', async () => {
			const accountId = dbId();

			await removeOldSupporters(
				[auth({ account: undefined })],
				[account({ _id: accountId })]);

			assert.calledWithMatch(updateAccounts, { _id: { $in: [accountId] } }, update);
		});
	});

	describe('updateSupporters()', () => {
		let updateAccount: SinonStub;
		let log: SinonStub;
		let updateSupporters: UpdateSupporters;
		let clock: SinonFakeTimers;

		function push(message: string) {
			return {
				supporterLog: {
					$each: [{ date: new Date(1234), message }],
					$slice: -10,
				},
			};
		}

		beforeEach(() => {
			clock = useFakeTimers();
			clock.setSystemTime(1234);
			updateAccount = stub();
			log = stub();
			updateSupporters = createUpdateSupporters(updateAccount, log);
		});

		afterEach(() => {
			clock.restore();
		});

		it('does nothing if list of auth and accounts are empty', async () => {
			await updateSupporters([], [], [], new Date());

			assert.notCalled(updateAccount);
		});

		it('adds patreon info to account', async () => {
			const accountId = dbId();

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[],
				[{ reward: rewardLevel1, user: '123', total: 0 }],
				new Date());

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.Supporter1,
				supporterDeclinedSince: undefined,
				$push: push('added supporter (1)'),
			});
			assert.calledWith(log, accountId.toString(), 'added supporter (1)');
		});

		it('handles duplicate auths', async () => {
			const accountId = dbId();

			await updateSupporters(
				[auth({ account: accountId, openId: '123' }), auth({ account: accountId, openId: '321' })],
				[],
				[{ reward: rewardLevel2, user: '321', total: 0 }, { reward: rewardLevel1, user: '123', total: 0 }],
				new Date());

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.Supporter2,
				supporterDeclinedSince: undefined,
				$push: push('added supporter (2)'),
			});
			assert.calledWith(log, accountId.toString(), 'added supporter (2)');
		});

		it('handles unassigned auths', async () => {
			await updateSupporters(
				[auth({ account: undefined, openId: '123' })],
				[],
				[{ reward: rewardLevel2, user: '123', total: 0 }],
				new Date());

			assert.notCalled(updateAccount);
		});

		it('sets supporter to none if pledge is missing', async () => {
			const accountId = dbId();

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: accountId, patreon: PatreonFlags.Supporter1 })],
				[],
				new Date());

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.None,
				supporterDeclinedSince: undefined,
				$push: push('removed supporter'),
			});
			assert.calledWith(log, accountId.toString(), 'removed supporter');
		});

		it('updates existing info', async () => {
			const accountId = dbId();

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter1 })],
				[{ reward: rewardLevel2, user: '123', total: 0 }],
				new Date());

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.Supporter2,
				supporterDeclinedSince: undefined,
				$push: push('added supporter (2)'),
			});
			assert.calledWith(log, accountId.toString(), 'added supporter (2)');
		});

		it('does not update if supporter level did not change (2 patreon accounts)', async () => {
			const accountId = dbId();

			await updateSupporters(
				[auth({ account: accountId, openId: '123' }), auth({ account: accountId, openId: '321' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter2 })],
				[{ reward: rewardLevel2, user: '123', total: 0 }],
				new Date());

			assert.notCalled(updateAccount);
			assert.notCalled(log);
		});

		it('does not remove support if decline is set but day of month is < 7', async () => {
			const accountId = dbId();
			const now = new Date('2018-04-02T09:00:00.000Z');
			const date = fromDate(now, -1 * DAY);

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter1 })],
				[{ reward: rewardLevel1, user: '123', total: 0, declinedSince: date.toISOString() }],
				now);

			assert.calledWith(updateAccount, accountId.toString(), {
				supporterDeclinedSince: date,
			});
			assert.notCalled(log);
		});

		it('removes support if decline is set and day of month is > 14', async () => {
			const accountId = dbId();
			const now = new Date('2018-04-16T09:00:00.000Z');
			const date = fromDate(now, -1 * DAY);

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter1 })],
				[{ reward: rewardLevel1, user: '123', total: 0, declinedSince: date.toISOString() }],
				now);

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.None,
				supporterDeclinedSince: date,
				$push: push('removed supporter (declined)'),
			});
			assert.calledWith(log, accountId.toString(), 'removed supporter (declined)');
		});

		it('removes support if decline is set and day of month is < 14 and decline is > 14 days old', async () => {
			const accountId = dbId();
			const now = new Date('2018-04-02T09:00:00.000Z');
			const date = fromDate(now, -16 * DAY);

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter1 })],
				[{ reward: rewardLevel1, user: '123', total: 0, declinedSince: date.toISOString() }],
				now);

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.None,
				supporterDeclinedSince: date,
				$push: push('removed supporter (declined)'),
			});
			assert.calledWith(log, accountId.toString(), 'removed supporter (declined)');
		});

		it('does not add log if declined but supporter is already removed', async () => {
			const accountId = dbId();
			const now = new Date('2018-04-16T09:00:00.000Z');
			const date = fromDate(now, -1 * DAY);

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[],
				[{ reward: rewardLevel1, user: '123', total: 0, declinedSince: date.toISOString() }],
				now);

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.None,
				supporterDeclinedSince: date,
			});
			assert.notCalled(log);
		});

		it('updates declined date', async () => {
			const accountId = dbId();
			const date = fromNow(-100);

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter1 })],
				[{ reward: rewardLevel2, user: '123', total: 0, declinedSince: date.toISOString() }],
				new Date());

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.Supporter2,
				supporterDeclinedSince: date,
				$push: push('added supporter (2)'),
			});
			assert.calledWith(log, accountId.toString(), 'added supporter (2)');
		});

		it('updates declined date even if patreon is not changed', async () => {
			const accountId = dbId();
			const date = fromNow(-100);

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter2 })],
				[{ reward: rewardLevel2, user: '123', total: 0, declinedSince: date.toISOString() }],
				new Date());

			assert.calledWith(updateAccount, accountId.toString(), {
				supporterDeclinedSince: date,
			});
			assert.notCalled(log);
		});

		it('sets supporter to none if reward has invalid ID', async () => {
			const accountId = dbId();

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter1 })],
				[{ reward: 'invalid', user: '123', total: 0 }],
				new Date());

			assert.calledWith(updateAccount, accountId.toString(), {
				patreon: PatreonFlags.None,
				supporterDeclinedSince: undefined,
				$push: push('removed supporter'),
			});
			assert.calledWith(log, accountId.toString(), 'removed supporter');
		});

		it('does nothing if patreon info is already set', async () => {
			const accountId = dbId();

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({ _id: Types.ObjectId(accountId.toHexString()), patreon: PatreonFlags.Supporter1 })],
				[{ reward: rewardLevel1, user: '123', total: 0 }],
				new Date());

			assert.notCalled(updateAccount);
		});

		it('does nothing if declined date is the same', async () => {
			const accountId = dbId();

			await updateSupporters(
				[auth({ account: accountId, openId: '123' })],
				[account({
					_id: Types.ObjectId(accountId.toHexString()),
					patreon: PatreonFlags.Supporter1,
					supporterDeclinedSince: new Date(1234),
				})],
				[{ reward: rewardLevel1, user: '123', total: 0, declinedSince: (new Date(1234).toISOString()) }],
				new Date());

			assert.notCalled(updateAccount);
		});
	});

	describe('addTotalPledged()', () => {
		let updateAuth: SinonStub;
		let addTotalPledged: AddTotalPledged;

		beforeEach(() => {
			updateAuth = stub();
			addTotalPledged = createAddTotalPledged(updateAuth);
		});

		it('does nothing if lists of auth and pledges are empty', async () => {
			await addTotalPledged([], []);

			assert.notCalled(updateAuth);
		});

		it('does nothing if cannot find auths for pledges', async () => {
			await addTotalPledged([], [{ reward: 'some', user: '123', total: 0 }]);

			assert.notCalled(updateAuth);
		});

		it('does nothing if cannot find pledges for auth', async () => {
			await addTotalPledged([auth({ openId: '123' })], []);

			assert.notCalled(updateAuth);
		});

		it('does nothing if total is already correct', async () => {
			await addTotalPledged([auth({ openId: '123', pledged: 10 })], [{ reward: 'some', user: '123', total: 10 }]);

			assert.notCalled(updateAuth);
		});

		it('updates total if different', async () => {
			const authId = dbId();

			await addTotalPledged([auth({ _id: authId, openId: '123' })], [{ reward: 'some', user: '123', total: 10 }]);

			assert.calledWith(updateAuth, authId, { pledged: 10 });
		});
	});
});
