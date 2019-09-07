"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const lodash_1 = require("lodash");
const patreon_1 = require("patreon");
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const logger_1 = require("./logger");
exports.declinedDayLimit = 14;
exports.declinedTimeLimit = exports.declinedDayLimit * constants_1.DAY;
exports.supporterLogLimit = 10;
exports.SUPPORTER_REWARD_IDS = {
    [constants_1.rewardLevel1]: 1 /* Supporter1 */,
    [constants_1.rewardLevel2]: 2 /* Supporter2 */,
    [constants_1.rewardLevel3]: 3 /* Supporter3 */,
};
let lastPatreonData = undefined;
function getLastPatreonData() {
    return lastPatreonData;
}
exports.getLastPatreonData = getLastPatreonData;
/* istanbul ignore next */
function createPatreonClient(accessToken) {
    const timeoutLimit = 10 * constants_1.SECOND;
    const client = patreon_1.patreon(accessToken);
    client.setStore({ sync() { } });
    return (path) => Promise.race([
        utils_1.delay(timeoutLimit).then(() => { throw new Error('Patreon request timed out'); }),
        client(path),
    ]);
}
exports.createPatreonClient = createPatreonClient;
async function fetchPatreonData(client, log) {
    const campaignData = await client('/current_user/campaigns');
    const rewards = campaignData.rawJson.included
        .filter(x => x.type === 'reward')
        .map(x => ({
        id: x.id,
        title: x.attributes.title || '',
        description: x.attributes.description || '',
    }));
    const campaignId = campaignData.rawJson.data[0].id;
    const pledges = [];
    const queryParams = '&include=patron.null,reward.null&fields%5Bpledge%5D=total_historical_amount_cents,declined_since';
    const query = 'page%5Bcount%5D=100&sort=created';
    let url = `/campaigns/${campaignId}/pledges?${query}`;
    let pages = 0;
    do {
        const pledgeData = await client(`${url}${queryParams}`);
        const pledgeItems = pledgeData.rawJson.data
            .filter(x => x.relationships.patron.data && x.relationships.reward.data)
            .map(x => ({
            user: x.relationships.patron.data.id,
            reward: x.relationships.reward.data.id,
            total: x.attributes.total_historical_amount_cents || 0,
            declinedSince: x.attributes.declined_since || undefined,
        }));
        pledges.push(...pledgeItems);
        url = (pledgeData.rawJson.links.next || '').replace('https://www.patreon.com/api/oauth2/api', '');
        pages++;
        if (pages > 100) {
            throw new Error('Exceeded 100 pages of patreon data');
        }
    } while (url);
    log(`fetched patreon data (pages: ${pages}, pledges: ${pledges.length}, rewards: ${rewards.length})`);
    return lastPatreonData = { pledges, rewards };
}
exports.fetchPatreonData = fetchPatreonData;
exports.createUpdatePatreonInfo = (queryAuths, queryAccounts, removeOldSupporters, updateSupporters, updateTotalPledged) => async ({ pledges }, now) => {
    const ids = pledges.map(p => p.user);
    const query = {
        provider: 'patreon',
        openId: { $in: ids },
        account: { $exists: true },
        banned: { $ne: true },
        disabled: { $ne: true },
    };
    const patreonAuths = await queryAuths(query, '_id account openId pledged');
    const accountsWithPatreon = await queryAccounts({ patreon: { $exists: true, $ne: 0 } }, '_id patreon supporterDeclinedSince');
    // removes support from accounts without any non-banned patreon auth
    await removeOldSupporters(patreonAuths, accountsWithPatreon);
    await updateSupporters(patreonAuths, accountsWithPatreon, pledges, now);
    await updateTotalPledged(patreonAuths, pledges);
};
exports.createRemoveOldSupporters = (updateAccounts, log) => async (auths, accounts) => {
    const clear = accounts
        .filter(account => auths.every(auth => !auth.account || !account._id.equals(auth.account)))
        .map(account => account._id);
    clear.forEach(id => log(`${id}`, `removed supporter`));
    await updateAccounts({ _id: { $in: clear } }, {
        $unset: { patreon: 1, supporterDeclinedSince: 1 },
        $push: {
            supporterLog: {
                $each: [{ date: new Date(), message: 'removed supporter' }],
                $slice: -exports.supporterLogLimit,
            },
        },
    });
    await updateAccounts({ supporterDeclinedSince: { $exists: true, $lt: utils_1.fromNow(-2 * constants_1.MONTH) } }, { $unset: { supporterDeclinedSince: 1 } });
};
exports.createUpdateSupporters = (updateAccount, log) => async (auths, accountsWithPatreon, pledges, now) => {
    const start = Date.now();
    const pledgesMap = new Map();
    const accountsWithPatreonMap = new Map();
    for (const pledge of pledges) {
        pledgesMap.set(pledge.user, pledge);
    }
    for (const account of accountsWithPatreon) {
        accountsWithPatreonMap.set(account._id.toString(), account);
    }
    const setup = auths
        .filter(auth => auth.account)
        .map(auth => {
        const accountId = auth.account.toString();
        const pledge = auth.openId && pledgesMap.get(auth.openId);
        const pledgeFlags = pledge && exports.SUPPORTER_REWARD_IDS[pledge.reward] || 0 /* None */;
        const declinedSince = (pledge && pledge.declinedSince) ? new Date(pledge.declinedSince) : undefined;
        const account = accountsWithPatreonMap.get(accountId);
        const declined = isDeclined(declinedSince, now);
        const patreon = declined ? 0 /* None */ : pledgeFlags;
        const current = account && account.patreon || 0;
        const declinedChanged = !!account && !datesEqual(account.supporterDeclinedSince, declinedSince);
        const hadPatreon = !!account;
        return {
            account: accountId, patreon, declinedSince, declinedChanged, declined, current, hadPatreon
        };
    });
    const grouped = lodash_1.toPairs(lodash_1.groupBy(setup, x => x.account))
        .map(([account, items]) => {
        const current = lodash_1.max(items.map(i => i.current));
        const patreon = lodash_1.max(items.map(i => i.patreon));
        return {
            account,
            changed: items.some(i => !i.hadPatreon) || current !== patreon,
            declinedChanged: items.some(i => i.declinedChanged),
            patreon,
            declinedSince: items.map(i => i.declinedSince).find(x => !!x),
            declined: items.some(i => i.declined),
            hadPatreon: items.some(i => i.hadPatreon),
        };
    })
        .filter(({ changed, declinedChanged }) => changed || declinedChanged);
    grouped
        .filter(g => g.changed)
        .map(g => ({ account: g.account, message: supporterMessage(g.patreon, g.declined, g.hadPatreon) }))
        .filter(({ message }) => !!message)
        .forEach(({ account, message }) => log(`${account}`, message));
    logger_1.logPatreon(`update supporters (${Date.now() - start}ms) ` +
        `[auths: ${auths.length}, grouped: ${grouped.length}, pledges: ${pledges.length}, ` +
        `accountsWithPatreon: ${accountsWithPatreon.length}]`);
    await Bluebird.map(grouped, ({ account, patreon, declinedSince, changed, declined, hadPatreon }) => {
        const message = changed ? supporterMessage(patreon, declined, hadPatreon) : undefined;
        return updateAccount(account, Object.assign({ supporterDeclinedSince: declinedSince }, (changed ? { patreon } : {}), (message ? {
            $push: {
                supporterLog: {
                    $each: [{ date: new Date(), message }],
                    $slice: -exports.supporterLogLimit,
                },
            }
        } : {})));
    }, { concurrency: 4 });
};
function isDeclined(declinedSince, now) {
    return !!declinedSince && (now.getDate() > exports.declinedDayLimit ||
        (now.getTime() - declinedSince.getTime()) > exports.declinedTimeLimit);
}
function supporterMessage(patreon, declined, hadPatreon) {
    return patreon ?
        `added supporter (${patreon})` :
        (hadPatreon ? `removed supporter${declined ? ' (declined)' : ''}` : undefined);
}
function datesEqual(a, b) {
    return (!a && !b) || (a && b && a.getTime() === b.getTime());
}
exports.createAddTotalPledged = (updateAuth) => async (auths, pledges) => {
    const setup = auths
        .map(auth => ({ auth, pledge: pledges.find(p => p.user === auth.openId) }))
        .filter(({ auth, pledge }) => pledge && pledge.total !== auth.pledged);
    await Bluebird.map(setup, ({ auth, pledge }) => updateAuth(auth._id, { pledged: pledge.total }), { concurrency: 4 });
};
//# sourceMappingURL=patreon.js.map