"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const utils_1 = require("../../common/utils");
const accountUtils_1 = require("../accountUtils");
const db_1 = require("../db");
const internal_1 = require("../internal");
const logger_1 = require("../logger");
const taskQueue_1 = require("../utils/taskQueue");
const admin_1 = require("./admin");
function mergeBan(a, b) {
    return (a === -1 || b === -1) ? -1 : Math.max(a || 0, b || 0);
}
function mergeLists(a, b, limit) {
    return [...(a || []), ...(b || [])].sort((a, b) => utils_1.compareDates(a.date, b.date)).slice(-limit);
}
async function findAccounts(id, withId, allowAdmin = false) {
    const accounts = await db_1.Account.find({ _id: { $in: [id, withId] } })
        .populate('auths', 'name')
        .populate('characters', 'name')
        .exec();
    if (!allowAdmin) {
        accounts.forEach(a => accountUtils_1.checkIfNotAdmin(a, `merge: ${a._id}`));
    }
    const account = accounts.find(a => a._id.toString() === id);
    const merge = accounts.find(a => a._id.toString() === withId);
    if (accounts.length !== 2 || !account || !merge) {
        throw new Error('Account does not exist');
    }
    return { account, merge };
}
function dumpData(account, friends, hides) {
    const { name, note, flags, counters = {}, auths = [], characters = [], ignores = [], emails = [], state = {}, birthdate, } = account;
    return {
        name,
        note,
        flags,
        state,
        birthdate,
        emails: emails.slice(),
        ignores: ignores.slice(),
        counters: lodash_1.clone(counters),
        auths: auths.map(({ _id, name }) => ({ id: _id.toString(), name })),
        characters: characters.map(({ _id, name }) => ({ id: _id.toString(), name })),
        settings: account.settings,
        friends: friends.slice(),
        hides: hides.slice(),
    };
}
function mergeStates(a, b) {
    if (a && b) {
        return Object.assign({}, b, a, { gifts: utils_1.toInt(a.gifts) + utils_1.toInt(b.gifts), candies: utils_1.toInt(a.candies) + utils_1.toInt(b.candies), clovers: utils_1.toInt(a.clovers) + utils_1.toInt(b.clovers), toys: utils_1.toInt(a.toys) | utils_1.toInt(b.toys) });
    }
    else {
        return a || b;
    }
}
async function merge(id, withId, reason, removedDocument, allowAdmin = false, creatingDuplicates = false) {
    const start = Date.now();
    const [{ account, merge }, accountFriends, mergeFriends, accountHides, mergeHides] = await Promise.all([
        findAccounts(id, withId, allowAdmin),
        db_1.findFriendIds(id),
        db_1.findFriendIds(withId),
        db_1.findHidesForMerge(id),
        db_1.findHidesForMerge(withId),
    ]);
    const data = {
        account: dumpData(account, accountFriends, accountHides),
        merge: dumpData(merge, mergeFriends, mergeHides),
    };
    const origins = lodash_1.uniqBy([...(account.origins || []), ...(merge.origins || [])], x => x.ip);
    const ignores = lodash_1.uniq([...(account.ignores || []), ...(merge.ignores || [])]);
    const emails = lodash_1.uniq([...(account.emails || []), ...(merge.emails || [])]);
    const note = `${account.note || ''}\n${merge.note || ''}`.trim();
    const createdAt = utils_1.minDate(account.createdAt, merge.createdAt);
    const lastVisit = utils_1.maxDate(account.lastVisit, merge.lastVisit);
    const ban = mergeBan(account.ban, merge.ban);
    const shadow = mergeBan(account.shadow, merge.shadow);
    const mute = mergeBan(account.mute, merge.mute);
    const patreon = Math.max(utils_1.toInt(account.patreon), utils_1.toInt(merge.patreon));
    const counters = lodash_1.assignWith(account.counters || {}, merge.counters || {}, (a, b) => (a | 0) + (b | 0));
    const creatingDuplicatesFlag = creatingDuplicates ? 2 /* CreatingDuplicates */ : 0;
    const flags = account.flags | merge.flags | creatingDuplicatesFlag;
    const supporter = utils_1.toInt(account.supporter) | utils_1.toInt(merge.supporter);
    const birthdate = account.birthdate || merge.birthdate;
    const supporterLog = mergeLists(account.supporterLog, merge.supporterLog, 10);
    const supporterTotal = utils_1.toInt(account.supporterTotal) + utils_1.toInt(merge.supporterTotal);
    const banLog = mergeLists(account.banLog, merge.banLog, 10);
    const merges = mergeLists(account.merges, merge.merges, 20);
    const state = mergeStates(account.state, merge.state);
    const alert = account.alert || merge.alert;
    merges.push({ id: withId, name: merge.name, date: new Date(), reason, data });
    const update = {
        origins, ignores, emails, note, lastVisit, ban, shadow, mute, flags, counters, patreon, supporter, merges,
        createdAt, supporterLog, supporterTotal, banLog, state, alert, birthdate,
    };
    await Promise.all([
        db_1.Account.updateOne({ _id: account._id }, update).exec(),
        db_1.Account.updateMany({ ignores: { $exists: true, $ne: [], $in: [withId] } }, { $addToSet: { ignores: id } }).exec()
            .then(() => db_1.Account.updateMany({ ignores: { $exists: true, $ne: [], $in: [withId] } }, { $pull: { ignores: withId } }).exec()),
        db_1.Auth.updateMany({ account: merge._id }, { account: account._id }).exec(),
        db_1.Event.updateMany({ account: merge._id }, { account: account._id }).exec(),
        db_1.Character.updateMany({ account: merge._id }, { account: account._id }).exec(),
        Promise.all([
            db_1.SupporterInvite.updateMany({ source: merge._id }, { source: account._id }).exec(),
            db_1.SupporterInvite.updateMany({ target: merge._id }, { target: account._id }).exec(),
        ]).then(() => db_1.SupporterInvite.remove({ target: account._id, source: account._id }).exec()),
        Promise.all([
            db_1.FriendRequest.updateMany({ source: merge._id }, { source: account._id }).exec(),
            db_1.FriendRequest.updateMany({ target: merge._id }, { target: account._id }).exec(),
        ]).then(() => db_1.FriendRequest.remove({ target: account._id, source: account._id }).exec()),
        Promise.all([
            db_1.HideRequest.updateMany({ source: merge._id }, { source: account._id }).exec(),
            db_1.HideRequest.updateMany({ target: merge._id }, { target: account._id }).exec(),
        ]).then(() => db_1.HideRequest.remove({ target: account._id, source: account._id }).exec()),
    ]);
    await removeDuplicateFriendRequests(id);
    await merge.remove();
    await admin_1.kickFromAllServers(withId);
    await removedDocument('accounts', withId);
    await accountUtils_1.updateCharacterCount(id);
    await internal_1.accountMerged(id, withId);
    await internal_1.accountChanged(id);
    logger_1.system(account._id, `Merged ${account.name} with ${merge.name} [${merge._id}] (${reason}) (${Date.now() - start}ms)`);
}
async function removeDuplicateFriendRequests(id) {
    const friendRequests = await db_1.FriendRequest.find({ $or: [{ source: id }, { target: id }] }).exec();
    const checked = new Set();
    const removeRequests = [];
    for (const request of friendRequests) {
        const friendId = request.source.toString() === id ? request.target.toString() : request.source.toString();
        if (checked.has(friendId)) {
            removeRequests.push(request._id);
        }
        else {
            checked.add(friendId);
        }
    }
    if (removeRequests.length) {
        await db_1.FriendRequest.remove({ _id: { $in: removeRequests } }).exec();
    }
}
async function split(accountId, mergeId, split, keep, reason) {
    const start = Date.now();
    const account = await db_1.findAccountSafe(accountId);
    const unmerge = await db_1.Account.create({
        name: split.name,
        note: split.note,
        flags: split.flags || 0,
        emails: split.emails,
        state: split.state,
        ignores: split.ignores,
        counters: split.counters,
        birthdate: split.birthdate,
        settings: split.settings,
    });
    const accountUpdate = {
        note: `${account.note}\nsplit: [${unmerge._id}]`.trim(),
        state: keep.state,
    };
    const removeIgnores = lodash_1.difference(split.ignores, account.ignores || []);
    if (removeIgnores.length) {
        accountUpdate.$pull = { ignores: removeIgnores };
    }
    const newCounters = split.counters || {};
    if (Object.keys(newCounters).length > 0) {
        const oldCounters = account.counters || {};
        const counters = lodash_1.mapValues(newCounters, (value, key) => Math.max(0, utils_1.toInt(oldCounters[key]) - utils_1.toInt(value)));
        accountUpdate.counters = counters;
    }
    const authIds = split.auths.map(x => x.id);
    await Promise.all([
        db_1.Auth.updateMany({ _id: { $in: authIds } }, { account: unmerge._id, disabled: false }).exec(),
        db_1.Character.updateMany({ _id: { $in: split.characters.map(x => x.id) } }, { account: unmerge._id }).exec(),
        db_1.Account.updateOne({ _id: account._id }, accountUpdate).exec(),
    ]);
    // friends
    const friendsToRemove = [...(keep.friends || []), ...(split.friends || [])];
    await db_1.FriendRequest.deleteMany({
        $or: [
            { target: account._id, source: { $in: friendsToRemove } },
            { source: account._id, target: { $in: friendsToRemove } },
        ],
    }).exec();
    await db_1.FriendRequest.create([
        ...(keep.friends || []).map(id => ({ source: account._id, target: id })),
        ...(split.friends || []).map(id => ({ source: unmerge._id, target: id }))
    ]);
    // hides
    const hidesToRemove = [...(keep.hides || []), ...(split.hides || [])].map(hide => hide.id);
    await db_1.HideRequest.deleteMany({
        $or: [
            { source: account._id, target: { $in: hidesToRemove } },
        ],
    }).exec();
    await db_1.HideRequest.create([
        ...(keep.hides || []).map(hide => ({ source: account._id, target: hide.id, name: hide.name, date: new Date(hide.date) })),
        ...(split.hides || []).map(hide => ({ source: unmerge._id, target: hide.id, name: hide.name, date: new Date(hide.date) }))
    ]);
    // other
    if (mergeId) {
        await db_1.Account.updateOne({ _id: account._id, 'merges._id': mergeId }, { 'merges.$.split': true }).exec();
    }
    await Promise.all([
        accountUtils_1.updateCharacterCount(accountId),
        accountUtils_1.updateCharacterCount(unmerge._id),
        internal_1.accountChanged(accountId),
    ]);
    logger_1.system(account._id, `Split off ${unmerge.name} [${unmerge._id}] (${reason}) (${Date.now() - start}ms)`);
}
exports.split = split;
exports.mergeAccounts = taskQueue_1.makeQueued(merge);
exports.splitAccounts = taskQueue_1.makeQueued(split);
//# sourceMappingURL=merge.js.map