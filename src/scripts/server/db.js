"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const logger_1 = require("./logger");
const accountUtils_1 = require("../common/accountUtils");
const emoji_1 = require("../client/emoji");
const characterUtils_1 = require("./characterUtils");
const swears_1 = require("../common/swears");
// schemas
const originInfo = {
    ip: String,
    country: String,
    last: Date,
};
const mergeInfo = {
    id: String,
    name: String,
    //code: Number,
    date: Date,
    reason: String,
    data: Object,
    split: Boolean,
};
const logEntry = {
    message: String,
    date: Date,
};
const authSchema = new mongoose_1.Schema({
    account: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
    openId: String,
    provider: String,
    name: String,
    url: String,
    emails: [String],
    disabled: Boolean,
    banned: Boolean,
    pledged: Number,
    lastUsed: Date,
}, { timestamps: true });
authSchema.index({ updatedAt: 1 });
authSchema.index({ openId: 1, provider: 1 }, { unique: true });
const bannedMuted = {
    mute: Number,
    shadow: Number,
    ban: Number,
};
const originSchema = new mongoose_1.Schema(Object.assign({ ip: { type: String, index: true }, country: String }, bannedMuted), { timestamps: true });
originSchema.index({ updatedAt: 1 });
const accountSchema = new mongoose_1.Schema({
    name: String,
    birthdate: Date,
    birthyear: Number,
    // code: Number,
    emails: { type: [String], index: true },
    lastVisit: Date,
    lastUserAgent: String,
    lastBrowserId: String,
    lastOnline: Date,
    lastCharacter: mongoose_1.Schema.Types.ObjectId,
    roles: [String],
    origins: [originInfo],
    note: String,
    noteUpdated: Date,
    ignores: [String],
    // friends: [{ type: Schema.Types.ObjectId, unique: true, ref: 'Account' }],
    flags: Number,
    characterCount: { type: Number, default: 0 },
    // NOTE: use account.markModified('settings') if changed nested field
    settings: { type: mongoose_1.Schema.Types.Mixed, default: () => ({}) },
    counters: { type: mongoose_1.Schema.Types.Mixed, default: () => ({}) },
    patreon: Number,
    supporter: Number,
    supporterLog: [logEntry],
    supporterTotal: Number,
    supporterDeclinedSince: Date,
    merges: [mergeInfo],
    banLog: [logEntry],
    mute: Number,
    shadow: Number,
    ban: Number,
    // auths: [{ type: Schema.Types.ObjectId, ref: 'Auth' }],
    state: Object,
    alert: Object,
    savedMap: String,
}, { timestamps: true });
accountSchema.virtual('auths', {
    ref: 'Auth',
    localField: '_id',
    foreignField: 'account',
});
accountSchema.virtual('characters', {
    ref: 'Character',
    localField: '_id',
    foreignField: 'account',
});
accountSchema.index({ updatedAt: 1 });
const characterSchema = new mongoose_1.Schema({
    account: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
    site: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Auth' },
    name: { type: String, index: true },
    desc: String,
    tag: String,
    info: String,
    flags: { type: Number, default: 0 },
    lastUsed: { type: Date, index: true },
    creator: String,
    state: Object,
}, { timestamps: true });
characterSchema.index({ updatedAt: 1 });
characterSchema.index({ createdAt: 1 });
const eventSchema = new mongoose_1.Schema({
    account: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
    pony: mongoose_1.Schema.Types.ObjectId,
    type: String,
    server: String,
    message: String,
    desc: String,
    origin: originInfo,
    count: { type: Number, default: 1 },
}, { timestamps: true });
eventSchema.index({ updatedAt: 1 });
const supporterInviteSchema = new mongoose_1.Schema({
    source: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
    target: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
    name: String,
    info: String,
    active: Boolean,
}, { timestamps: true });
const friendRequestSchema = new mongoose_1.Schema({
    source: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
    target: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
});
const hideRequestSchema = new mongoose_1.Schema({
    source: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
    target: { type: mongoose_1.Schema.Types.ObjectId, index: true, ref: 'Account' },
    name: String,
    date: Date,
});
const sessionSchema = new mongoose_1.Schema({
    _id: String,
    session: String,
});
// models
exports.Auth = mongoose_1.model('Auth', authSchema);
exports.Event = mongoose_1.model('Event', eventSchema);
exports.Origin = mongoose_1.model('Origin', originSchema);
exports.Session = mongoose_1.model('session', sessionSchema);
exports.Character = mongoose_1.model('Character', characterSchema);
accountSchema.post('remove', function (doc) {
    Promise.all([
        exports.Character.deleteMany({ account: doc._id }).exec(),
        exports.Event.deleteMany({ account: doc._id }).exec(),
        exports.Auth.deleteMany({ account: doc._id }).exec(),
        exports.FriendRequest.deleteMany({ $or: [{ target: doc._id }, { source: doc._id }] }).exec(),
        exports.HideRequest.deleteMany({ $or: [{ target: doc._id }, { source: doc._id }] }).exec(),
    ]).catch(logger_1.logger.error);
});
exports.Account = mongoose_1.model('Account', accountSchema);
exports.SupporterInvite = mongoose_1.model('SupporterInvite', supporterInviteSchema);
exports.FriendRequest = mongoose_1.model('FriendRequest', friendRequestSchema);
exports.HideRequest = mongoose_1.model('HideRequest', hideRequestSchema);
function iterate(query, onData) {
    return new Promise(resolve => {
        query.cursor()
            .on('data', onData)
            .on('end', resolve);
    });
}
exports.iterate = iterate;
function throwOnEmpty(message) {
    return item => {
        if (item) {
            return item;
        }
        else {
            throw new Error(message);
        }
    };
}
function nullToUndefined(item) {
    return item === null ? undefined : item;
}
exports.nullToUndefined = nullToUndefined;
exports.checkCharacterExists = throwOnEmpty('Character does not exist');
exports.checkAccountExists = throwOnEmpty('Account does not exist');
function createCharacter(account) {
    return new exports.Character({ account: account._id, creator: `${account.name} [${account._id}]` });
}
exports.createCharacter = createCharacter;
function characterCount(account) {
    return exports.Character.countDocuments({ account }).exec();
}
exports.characterCount = characterCount;
function findCharacter(pony, account) {
    return exports.Character.findOne({ _id: pony, account }).exec().then(nullToUndefined);
}
exports.findCharacter = findCharacter;
function findCharacterSafe(pony, accountId) {
    return findCharacter(pony, accountId)
        .then(exports.checkCharacterExists);
}
exports.findCharacterSafe = findCharacterSafe;
function findCharacterById(id) {
    return exports.Character.findById(id).exec().then(nullToUndefined);
}
exports.findCharacterById = findCharacterById;
exports.findAllCharacters = (account, fields) => exports.Character.find({ account }, fields).lean().exec();
function findLatestCharacters(account, count) {
    return exports.Character.find({ account })
        .sort('-lastUsed')
        .limit(count)
        .exec();
}
exports.findLatestCharacters = findLatestCharacters;
function removeCharacter(id, account) {
    return exports.Character.findOneAndRemove({ _id: id, account }).exec().then(nullToUndefined);
}
exports.removeCharacter = removeCharacter;
exports.updateCharacterState = (characterId, serverName, state) => exports.Character.updateOne({ _id: characterId }, { [`state.${serverName}`]: state }).exec().then(nullToUndefined);
exports.queryCharacter = (query, fields) => exports.Character.findOne(query, fields).exec();
exports.findAuthByOpenId = (openId, provider) => exports.Auth.findOne({ openId, provider }).exec().then(nullToUndefined);
exports.findAuthByEmail = (emails) => exports.Auth.findOne({ emails: { $in: emails } }).exec().then(nullToUndefined);
exports.findAuth = (auth, account, fields) => exports.Auth.findOne({ _id: auth, account }, fields).exec().then(nullToUndefined);
exports.findAllAuths = (account, fields) => exports.Auth.find({ account, fields }).exec();
exports.findAllVisibleAuths = (account, fields) => exports.Auth.find({ account, disabled: { $ne: true }, banned: { $ne: true } }, fields).lean().exec();
exports.countAllVisibleAuths = (account) => exports.Auth.find({ account, disabled: { $ne: true }, banned: { $ne: true } }).countDocuments().exec();
exports.queryAuths = (query, fields) => exports.Auth.find(query, fields).lean().exec();
exports.updateAuth = (id, update) => exports.Auth.updateOne({ _id: id }, update).exec();
exports.findAccount = (account, projection) => exports.Account.findById(account, projection).exec().then(nullToUndefined);
function checkIfAdmin(account) {
    return exports.Account.findOne({ _id: account }, 'roles').lean().exec()
        .then(a => a && accountUtils_1.isAdmin(a));
}
exports.checkIfAdmin = checkIfAdmin;
function findAccountSafe(account, projection) {
    return exports.findAccount(account, projection)
        .then(exports.checkAccountExists);
}
exports.findAccountSafe = findAccountSafe;
exports.updateAccount = (accountId, update) => exports.Account.updateOne({ _id: accountId }, update).exec();
exports.updateAccounts = (query, update) => exports.Account.updateMany(query, update).exec();
exports.queryAccounts = (query, fields) => exports.Account.find(query, fields).lean().exec();
exports.queryAccount = (query, fields) => exports.Account.findOne(query, fields).exec().then(nullToUndefined);
exports.hasActiveSupporterInvites = (accountId) => exports.SupporterInvite.countDocuments({ target: accountId, active: true }).exec()
    .then(count => count > 0);
// friend requests
async function findFriendIds(accountId) {
    const accountIdString = accountId.toString();
    const friendRequests = await exports.FriendRequest
        .find({ $or: [{ source: accountId }, { target: accountId }] }, 'source target')
        .lean()
        .exec();
    const friendIds = friendRequests
        .map((f) => f.source.toString() === accountIdString ? f.target.toString() : f.source.toString());
    return friendIds;
}
exports.findFriendIds = findFriendIds;
async function findFriends(accountId, withCharacters) {
    const friendIds = await findFriendIds(accountId);
    const accounts = await exports.Account.find({ _id: { $in: friendIds } }, '_id name lastOnline lastCharacter').lean().exec();
    let characters = [];
    if (withCharacters) {
        const characterIds = accounts.map(a => a.lastCharacter).filter(id => id);
        characters = await exports.Character.find({ _id: { $in: characterIds } }, '_id name info').lean().exec();
    }
    return accounts.map(a => {
        const characterId = a.lastCharacter && a.lastCharacter.toString();
        const character = characterId && characters.find(c => c._id.toString() === characterId);
        const name = character && characterUtils_1.filterForbidden(emoji_1.replaceEmojis(character.name));
        const nameFiltered = name && swears_1.filterName(name);
        return {
            accountId: a._id.toString(),
            accountName: a.name,
            name,
            pony: character && character.info,
            nameBad: name !== nameFiltered,
        };
    });
}
exports.findFriends = findFriends;
// hide requests
async function findHideIds(accountId) {
    const hideRequests = await exports.HideRequest.find({ source: accountId }, 'target').lean().exec();
    return hideRequests.map(f => f.target.toString());
}
exports.findHideIds = findHideIds;
async function findHideIdsRev(accountId) {
    const hideRequests = await exports.HideRequest.find({ target: accountId }, 'source').lean().exec();
    return hideRequests.map(f => f.source.toString());
}
exports.findHideIdsRev = findHideIdsRev;
async function findHidesForMerge(accountId) {
    const hideRequests = await exports.HideRequest
        .find({ source: accountId }, '_id name date')
        .lean()
        .exec();
    return hideRequests.map(f => ({
        id: f._id.toString(),
        name: f.name,
        date: f.date.toString(),
    }));
}
exports.findHidesForMerge = findHidesForMerge;
async function addHide(source, target, name) {
    if (source.toString() === target.toString())
        return;
    const existing = await exports.HideRequest.findOne({ source, target }, '_id').lean().exec();
    if (!existing) {
        await exports.HideRequest.create({ source, target, name, date: new Date() });
    }
}
exports.addHide = addHide;
//# sourceMappingURL=db.js.map