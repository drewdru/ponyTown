"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Bluebird = require("bluebird");
const lodash_1 = require("lodash");
const accountUtils_1 = require("../accountUtils");
const db_1 = require("../db");
const constants_1 = require("../../common/constants");
const serverUtils_1 = require("../serverUtils");
const characterUtils_1 = require("../characterUtils");
const admin_1 = require("./admin");
const ITEMS_PER_PAGE = 20;
const ITEMS_LIMIT = 1000;
const CACHE_TIMEOUT = 10 * constants_1.MINUTE;
function createQuery({ search }) {
    const and = [];
    if (search) {
        if (search === 'orphan') {
            and.push({ account: { $exists: false } });
        }
        else if (/^exact:/.test(search)) {
            and.push({ name: new RegExp(`^${lodash_1.escapeRegExp(search.substr(6))}$`, 'i') });
        }
        else {
            and.push({ name: new RegExp(lodash_1.escapeRegExp(search), 'i') });
        }
    }
    return and.length === 0 ? {} : (and.length === 1 ? and[0] : { $and: and });
}
async function getPonyIds(query) {
    const items = await db_1.Character
        .find(createQuery(query), '_id')
        .sort(query.orderBy || 'createdAt')
        .limit(ITEMS_LIMIT)
        .lean()
        .exec();
    return items.map(i => i._id.toString());
}
const cachedGetPonyIds = serverUtils_1.cached(getPonyIds, CACHE_TIMEOUT);
async function findPonies(query, page) {
    const from = page * ITEMS_PER_PAGE;
    const ids = await cachedGetPonyIds(query);
    const idsOnPage = ids.slice(from, from + ITEMS_PER_PAGE);
    return {
        items: idsOnPage,
        totalCount: ids.length
    };
}
exports.findPonies = findPonies;
async function assignCharacter(characterId, accountId) {
    const character = await db_1.Character.findById(characterId).exec();
    if (!character)
        return;
    await admin_1.kickFromAllServersByCharacter(characterId);
    await db_1.Character.updateOne({ _id: characterId }, { account: accountId }).exec();
    await Promise.all([
        accountUtils_1.updateCharacterCount(character.account),
        accountUtils_1.updateCharacterCount(accountId),
    ]);
}
exports.assignCharacter = assignCharacter;
async function removeCharacter(service, characterId) {
    const character = await db_1.Character.findById(characterId).exec();
    if (!character)
        return;
    await admin_1.kickFromAllServersByCharacter(characterId);
    await character.remove();
    await accountUtils_1.updateCharacterCount(character.account);
    characterUtils_1.logRemovedCharacter(character);
    service.ponies.removed(characterId);
}
exports.removeCharacter = removeCharacter;
async function removeCharacters(character, accountId, removedDocument) {
    await Bluebird.map(character, async (c) => {
        await c.remove();
        await removedDocument('ponies', c._id.toString());
        characterUtils_1.logRemovedCharacter(c);
    }, { concurrency: 4 });
    await accountUtils_1.updateCharacterCount(accountId);
}
async function removeCharactersAboveLimit(removedDocument, accountId) {
    const [account, items] = await Promise.all([
        db_1.findAccountSafe(accountId),
        db_1.Character.find({ account: accountId }).sort({ lastUsed: -1 }).exec(),
    ]);
    const limited = items.slice(accountUtils_1.getCharacterLimit(account));
    await removeCharacters(limited, accountId, removedDocument);
}
exports.removeCharactersAboveLimit = removeCharactersAboveLimit;
async function removeAllCharacters(removedDocument, accountId) {
    const items = await db_1.Character.find({ account: accountId }).sort({ lastUsed: -1 }).exec();
    await removeCharacters(items, accountId, removedDocument);
}
exports.removeAllCharacters = removeAllCharacters;
async function createCharacter(account, name, info) {
    await db_1.Character.create({ account, name, info });
    await accountUtils_1.updateCharacterCount(account);
}
exports.createCharacter = createCharacter;
//# sourceMappingURL=ponies.js.map