"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const lodash_1 = require("lodash");
const mongoose_1 = require("mongoose");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const patreon_1 = require("../../server/patreon");
const mocks_1 = require("../mocks");
const utils_1 = require("../../common/utils");
const constants_1 = require("../../common/constants");
const dbId = () => mongoose_1.Types.ObjectId(mocks_1.genId());
const queryBase = 'page%5Bcount%5D=100&sort=created';
const queryAdd = '&include=patron.null,reward.null&fields%5Bpledge%5D=total_historical_amount_cents,declined_since';
const query = `${queryBase}${queryAdd}`;
describe('patreon', () => {
    describe('fetchPatreonData()', () => {
        let client;
        beforeEach(() => {
            client = sinon_1.stub();
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
            const result = await patreon_1.fetchPatreonData(client, lodash_1.noop);
            chai_1.expect(result.rewards).eql([
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
            const result = await patreon_1.fetchPatreonData(client, lodash_1.noop);
            chai_1.expect(result.rewards).eql([
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
            const result = await patreon_1.fetchPatreonData(client, lodash_1.noop);
            chai_1.expect(result.pledges).eql([
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
            const result = await patreon_1.fetchPatreonData(client, lodash_1.noop);
            chai_1.expect(result.pledges).eql([
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
            const result = await patreon_1.fetchPatreonData(client, lodash_1.noop);
            sinon_1.assert.calledWith(client, '/link-to-next-page?page=5' + queryAdd);
            chai_1.expect(result.pledges).eql([
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
            await chai_1.expect(patreon_1.fetchPatreonData(client, lodash_1.noop)).rejectedWith('Exceeded 100 pages of patreon data');
        });
    });
    describe('updatePatreonInfo()', () => {
        let queryAuths;
        let queryAccounts;
        let removeOldSupporters;
        let updateSupporters;
        let addTotalPledged;
        let updatePatreonInfo;
        beforeEach(() => {
            queryAuths = sinon_1.stub();
            queryAccounts = sinon_1.stub();
            removeOldSupporters = sinon_1.stub();
            updateSupporters = sinon_1.stub();
            addTotalPledged = sinon_1.stub();
            updatePatreonInfo = patreon_1.createUpdatePatreonInfo(queryAuths, queryAccounts, removeOldSupporters, updateSupporters, addTotalPledged);
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
            sinon_1.assert.calledWith(queryAuths, sinon_1.match({
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
            sinon_1.assert.calledWith(queryAccounts, sinon_1.match({ patreon: { $exists: true, $ne: 0 } }), '_id patreon supporterDeclinedSince');
        });
        it('removes old supporters', async () => {
            const auths = [{}];
            const accounts = [{}];
            queryAuths.resolves(auths);
            queryAccounts.resolves(auths);
            await updatePatreonInfo({ pledges: [], rewards: [] }, new Date());
            sinon_1.assert.calledWith(removeOldSupporters, auths, accounts);
        });
        it('adds new supporters', async () => {
            const auths = [{}];
            const accounts = [{}];
            const pledges = [{}];
            const now = new Date();
            queryAuths.resolves(auths);
            queryAccounts.resolves(auths);
            await updatePatreonInfo({ pledges, rewards: [] }, now);
            sinon_1.assert.calledWith(updateSupporters, auths, accounts, pledges, now);
        });
        it('adds total pledged', async () => {
            const auths = [{}];
            const pledges = [{}];
            queryAuths.resolves(auths);
            queryAccounts.resolves(auths);
            await updatePatreonInfo({ pledges, rewards: [] }, new Date());
            sinon_1.assert.calledWith(addTotalPledged, auths, pledges);
        });
    });
    describe('removeOldSupporters()', () => {
        let updateAccounts;
        let log;
        let removeOldSupporters;
        let clock;
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
            clock = sinon_1.useFakeTimers();
            clock.setSystemTime(1234);
            updateAccounts = sinon_1.stub();
            log = sinon_1.stub();
            removeOldSupporters = patreon_1.createRemoveOldSupporters(updateAccounts, log);
        });
        afterEach(() => {
            clock.restore();
        });
        it('does nothing if list of auth and accounts are empty', async () => {
            await removeOldSupporters([], []);
            sinon_1.assert.calledWithMatch(updateAccounts, { _id: { $in: [] } }, update);
        });
        it('unsets patreon for all accounts without corresponding auths', async () => {
            const accountId = dbId();
            await removeOldSupporters([], [mocks_1.account({ _id: accountId })]);
            sinon_1.assert.calledWithMatch(updateAccounts, { _id: { $in: [accountId] } }, update);
            sinon_1.assert.calledWith(log, accountId.toHexString(), `removed supporter`);
        });
        it('unsets patreon for all accounts without corresponding auths (2)', async () => {
            const account1Id = dbId();
            const account2Id = dbId();
            await removeOldSupporters([mocks_1.auth({ account: mongoose_1.Types.ObjectId(account2Id.toHexString()) })], [mocks_1.account({ _id: account1Id }), mocks_1.account({ _id: account2Id })]);
            sinon_1.assert.calledWithMatch(updateAccounts, { _id: { $in: [account1Id] } }, update);
            sinon_1.assert.calledWith(log, account1Id.toHexString(), `removed supporter`);
        });
        it('works with unassigned auths', async () => {
            const accountId = dbId();
            await removeOldSupporters([mocks_1.auth({ account: undefined })], [mocks_1.account({ _id: accountId })]);
            sinon_1.assert.calledWithMatch(updateAccounts, { _id: { $in: [accountId] } }, update);
        });
    });
    describe('updateSupporters()', () => {
        let updateAccount;
        let log;
        let updateSupporters;
        let clock;
        function push(message) {
            return {
                supporterLog: {
                    $each: [{ date: new Date(1234), message }],
                    $slice: -10,
                },
            };
        }
        beforeEach(() => {
            clock = sinon_1.useFakeTimers();
            clock.setSystemTime(1234);
            updateAccount = sinon_1.stub();
            log = sinon_1.stub();
            updateSupporters = patreon_1.createUpdateSupporters(updateAccount, log);
        });
        afterEach(() => {
            clock.restore();
        });
        it('does nothing if list of auth and accounts are empty', async () => {
            await updateSupporters([], [], [], new Date());
            sinon_1.assert.notCalled(updateAccount);
        });
        it('adds patreon info to account', async () => {
            const accountId = dbId();
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [], [{ reward: constants_1.rewardLevel1, user: '123', total: 0 }], new Date());
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 1 /* Supporter1 */,
                supporterDeclinedSince: undefined,
                $push: push('added supporter (1)'),
            });
            sinon_1.assert.calledWith(log, accountId.toString(), 'added supporter (1)');
        });
        it('handles duplicate auths', async () => {
            const accountId = dbId();
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' }), mocks_1.auth({ account: accountId, openId: '321' })], [], [{ reward: constants_1.rewardLevel2, user: '321', total: 0 }, { reward: constants_1.rewardLevel1, user: '123', total: 0 }], new Date());
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 2 /* Supporter2 */,
                supporterDeclinedSince: undefined,
                $push: push('added supporter (2)'),
            });
            sinon_1.assert.calledWith(log, accountId.toString(), 'added supporter (2)');
        });
        it('handles unassigned auths', async () => {
            await updateSupporters([mocks_1.auth({ account: undefined, openId: '123' })], [], [{ reward: constants_1.rewardLevel2, user: '123', total: 0 }], new Date());
            sinon_1.assert.notCalled(updateAccount);
        });
        it('sets supporter to none if pledge is missing', async () => {
            const accountId = dbId();
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: accountId, patreon: 1 /* Supporter1 */ })], [], new Date());
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 0 /* None */,
                supporterDeclinedSince: undefined,
                $push: push('removed supporter'),
            });
            sinon_1.assert.calledWith(log, accountId.toString(), 'removed supporter');
        });
        it('updates existing info', async () => {
            const accountId = dbId();
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 1 /* Supporter1 */ })], [{ reward: constants_1.rewardLevel2, user: '123', total: 0 }], new Date());
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 2 /* Supporter2 */,
                supporterDeclinedSince: undefined,
                $push: push('added supporter (2)'),
            });
            sinon_1.assert.calledWith(log, accountId.toString(), 'added supporter (2)');
        });
        it('does not update if supporter level did not change (2 patreon accounts)', async () => {
            const accountId = dbId();
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' }), mocks_1.auth({ account: accountId, openId: '321' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 2 /* Supporter2 */ })], [{ reward: constants_1.rewardLevel2, user: '123', total: 0 }], new Date());
            sinon_1.assert.notCalled(updateAccount);
            sinon_1.assert.notCalled(log);
        });
        it('does not remove support if decline is set but day of month is < 7', async () => {
            const accountId = dbId();
            const now = new Date('2018-04-02T09:00:00.000Z');
            const date = utils_1.fromDate(now, -1 * constants_1.DAY);
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 1 /* Supporter1 */ })], [{ reward: constants_1.rewardLevel1, user: '123', total: 0, declinedSince: date.toISOString() }], now);
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                supporterDeclinedSince: date,
            });
            sinon_1.assert.notCalled(log);
        });
        it('removes support if decline is set and day of month is > 14', async () => {
            const accountId = dbId();
            const now = new Date('2018-04-16T09:00:00.000Z');
            const date = utils_1.fromDate(now, -1 * constants_1.DAY);
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 1 /* Supporter1 */ })], [{ reward: constants_1.rewardLevel1, user: '123', total: 0, declinedSince: date.toISOString() }], now);
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 0 /* None */,
                supporterDeclinedSince: date,
                $push: push('removed supporter (declined)'),
            });
            sinon_1.assert.calledWith(log, accountId.toString(), 'removed supporter (declined)');
        });
        it('removes support if decline is set and day of month is < 14 and decline is > 14 days old', async () => {
            const accountId = dbId();
            const now = new Date('2018-04-02T09:00:00.000Z');
            const date = utils_1.fromDate(now, -16 * constants_1.DAY);
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 1 /* Supporter1 */ })], [{ reward: constants_1.rewardLevel1, user: '123', total: 0, declinedSince: date.toISOString() }], now);
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 0 /* None */,
                supporterDeclinedSince: date,
                $push: push('removed supporter (declined)'),
            });
            sinon_1.assert.calledWith(log, accountId.toString(), 'removed supporter (declined)');
        });
        it('does not add log if declined but supporter is already removed', async () => {
            const accountId = dbId();
            const now = new Date('2018-04-16T09:00:00.000Z');
            const date = utils_1.fromDate(now, -1 * constants_1.DAY);
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [], [{ reward: constants_1.rewardLevel1, user: '123', total: 0, declinedSince: date.toISOString() }], now);
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 0 /* None */,
                supporterDeclinedSince: date,
            });
            sinon_1.assert.notCalled(log);
        });
        it('updates declined date', async () => {
            const accountId = dbId();
            const date = utils_1.fromNow(-100);
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 1 /* Supporter1 */ })], [{ reward: constants_1.rewardLevel2, user: '123', total: 0, declinedSince: date.toISOString() }], new Date());
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 2 /* Supporter2 */,
                supporterDeclinedSince: date,
                $push: push('added supporter (2)'),
            });
            sinon_1.assert.calledWith(log, accountId.toString(), 'added supporter (2)');
        });
        it('updates declined date even if patreon is not changed', async () => {
            const accountId = dbId();
            const date = utils_1.fromNow(-100);
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 2 /* Supporter2 */ })], [{ reward: constants_1.rewardLevel2, user: '123', total: 0, declinedSince: date.toISOString() }], new Date());
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                supporterDeclinedSince: date,
            });
            sinon_1.assert.notCalled(log);
        });
        it('sets supporter to none if reward has invalid ID', async () => {
            const accountId = dbId();
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 1 /* Supporter1 */ })], [{ reward: 'invalid', user: '123', total: 0 }], new Date());
            sinon_1.assert.calledWith(updateAccount, accountId.toString(), {
                patreon: 0 /* None */,
                supporterDeclinedSince: undefined,
                $push: push('removed supporter'),
            });
            sinon_1.assert.calledWith(log, accountId.toString(), 'removed supporter');
        });
        it('does nothing if patreon info is already set', async () => {
            const accountId = dbId();
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({ _id: mongoose_1.Types.ObjectId(accountId.toHexString()), patreon: 1 /* Supporter1 */ })], [{ reward: constants_1.rewardLevel1, user: '123', total: 0 }], new Date());
            sinon_1.assert.notCalled(updateAccount);
        });
        it('does nothing if declined date is the same', async () => {
            const accountId = dbId();
            await updateSupporters([mocks_1.auth({ account: accountId, openId: '123' })], [mocks_1.account({
                    _id: mongoose_1.Types.ObjectId(accountId.toHexString()),
                    patreon: 1 /* Supporter1 */,
                    supporterDeclinedSince: new Date(1234),
                })], [{ reward: constants_1.rewardLevel1, user: '123', total: 0, declinedSince: (new Date(1234).toISOString()) }], new Date());
            sinon_1.assert.notCalled(updateAccount);
        });
    });
    describe('addTotalPledged()', () => {
        let updateAuth;
        let addTotalPledged;
        beforeEach(() => {
            updateAuth = sinon_1.stub();
            addTotalPledged = patreon_1.createAddTotalPledged(updateAuth);
        });
        it('does nothing if lists of auth and pledges are empty', async () => {
            await addTotalPledged([], []);
            sinon_1.assert.notCalled(updateAuth);
        });
        it('does nothing if cannot find auths for pledges', async () => {
            await addTotalPledged([], [{ reward: 'some', user: '123', total: 0 }]);
            sinon_1.assert.notCalled(updateAuth);
        });
        it('does nothing if cannot find pledges for auth', async () => {
            await addTotalPledged([mocks_1.auth({ openId: '123' })], []);
            sinon_1.assert.notCalled(updateAuth);
        });
        it('does nothing if total is already correct', async () => {
            await addTotalPledged([mocks_1.auth({ openId: '123', pledged: 10 })], [{ reward: 'some', user: '123', total: 10 }]);
            sinon_1.assert.notCalled(updateAuth);
        });
        it('updates total if different', async () => {
            const authId = dbId();
            await addTotalPledged([mocks_1.auth({ _id: authId, openId: '123' })], [{ reward: 'some', user: '123', total: 10 }]);
            sinon_1.assert.calledWith(updateAuth, authId, { pledged: 10 });
        });
    });
});
//# sourceMappingURL=patreon.spec.js.map