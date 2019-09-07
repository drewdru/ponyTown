"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const base64_js_1 = require("base64-js");
const utf8_1 = require("ag-sockets/dist/utf8");
const db_1 = require("./db");
const security_1 = require("../common/security");
const adminUtils_1 = require("../common/adminUtils");
const utils_1 = require("../common/utils");
const logger_1 = require("./logger");
const entities_1 = require("../common/entities");
const constants_1 = require("../common/constants");
const compressPony_1 = require("../common/compressPony");
const ponyUtils_1 = require("../client/ponyUtils");
const tags_1 = require("../common/tags");
const emoji_1 = require("../client/emoji");
const entityUtils_1 = require("./entityUtils");
const chat_1 = require("./chat");
const entityUtils_2 = require("../common/entityUtils");
const playerUtils_1 = require("./playerUtils");
const expressionEncoder_1 = require("../common/encoders/expressionEncoder");
exports.defaultCharacterState = { x: 0, y: 0 };
function encryptInfo(info) {
    return utils_1.bitmask(base64_js_1.toByteArray(info), constants_1.PONY_INFO_KEY);
}
exports.encryptInfo = encryptInfo;
function createPony(account, character, state) {
    const pony = entities_1.pony(state.x, state.y);
    pony.state = utils_1.hasFlag(state.flags, 1 /* Right */) ? 2 /* FacingRight */ : 0;
    updatePony(pony, account, character);
    updatePonyFromState(pony, state);
    cleanupPonyOptions(pony);
    return pony;
}
exports.createPony = createPony;
function createDefaultCharacterState(map) {
    return Object.assign({}, exports.defaultCharacterState, utils_1.randomPoint(map.spawnArea), { map: map.id });
}
function getCharacterState(character, serverId, map) {
    return character.state && character.state[serverId] || createDefaultCharacterState(map);
}
exports.getCharacterState = getCharacterState;
async function updateCharacterState(characterId, serverId, state) {
    await db_1.Character.updateOne({ _id: characterId }, { [`state.${serverId}`]: state }).exec();
}
exports.updateCharacterState = updateCharacterState;
function getAndFixCharacterState(server, character, world, states) {
    const map = world.getMainMap();
    const savedState = utils_1.last(states.get(character._id.toString()).items) || getCharacterState(character, server.id, map);
    const state = Object.assign({}, exports.defaultCharacterState, savedState);
    if (utils_1.hasFlag(character.flags, 8 /* RespawnAtSpawn */)) {
        Object.assign(state, Object.assign({ map: map.id }, utils_1.randomPoint(map.spawnArea)));
    }
    return state;
}
exports.getAndFixCharacterState = getAndFixCharacterState;
function updatePonyFromState(pony, state) {
    if (!pony.options) {
        pony.options = {};
    }
    if (state.hold) {
        const type = entities_1.getEntityType(state.hold);
        if (type) {
            pony.options.hold = type;
        }
    }
    else if (pony.options.hold) {
        pony.options.hold = 0;
    }
    if (state.toy) {
        pony.options.toy = state.toy;
    }
    else if (pony.options.toy) {
        pony.options.toy = 0;
    }
    pony.options.extra = utils_1.hasFlag(state.flags, 2 /* Extra */);
}
exports.updatePonyFromState = updatePonyFromState;
function cleanupPonyOptions({ options }) {
    if (options) {
        if (!options.hold) {
            delete options.hold;
        }
        if (!options.extra) {
            delete options.extra;
        }
    }
}
exports.cleanupPonyOptions = cleanupPonyOptions;
function filterForbidden(name) {
    const isForbidden = security_1.isForbiddenName(name);
    return isForbidden ? lodash_1.repeat('?', name.length) : name;
}
exports.filterForbidden = filterForbidden;
function updatePony(pony, account, character) {
    const info = character.info || '';
    const ponyInfo = compressPony_1.decompressPony(info);
    const originalName = emoji_1.replaceEmojis(character.name);
    const allowedName = filterForbidden(originalName);
    const options = {};
    const level = adminUtils_1.supporterLevel(account);
    if (character.tag && tags_1.canUseTag(account, character.tag)) {
        options.tag = character.tag;
    }
    else if (level && !utils_1.hasFlag(character.flags, 4 /* HideSupport */)) {
        options.tag = `sup${level}`;
    }
    pony.options = options;
    pony.extraOptions = createExtraOptions(character);
    pony.canFly = ponyUtils_1.canFly(ponyInfo);
    pony.canMagic = ponyUtils_1.canMagic(ponyInfo);
    // name
    entityUtils_1.setEntityName(pony, allowedName);
    // info
    pony.info = info;
    if (utils_1.hasFlag(character.flags, 1 /* BadCM */) && ponyInfo.cm) {
        ponyInfo.cm = undefined;
        pony.infoSafe = compressPony_1.compressPony(ponyInfo);
        pony.encryptedInfoSafe = encryptInfo(pony.infoSafe);
    }
    else {
        pony.infoSafe = pony.info;
        pony.encryptedInfoSafe = encryptInfo(info);
    }
    // crc
    pony.crc = createCharacterCRC(account._id.toString(), originalName);
}
exports.updatePony = updatePony;
function createCharacterCRC(accountId, characterName) {
    const characterNameBuffer = utf8_1.encodeString(characterName);
    const accountIdBuffer = utf8_1.encodeString(accountId);
    const buffer = new Uint32Array(Math.ceil((characterNameBuffer.byteLength + accountIdBuffer.byteLength) / 4));
    const bufferUint8 = new Uint8Array(buffer.buffer);
    bufferUint8.set(characterNameBuffer);
    bufferUint8.set(accountIdBuffer, characterNameBuffer.byteLength);
    return utils_1.computeCRC(buffer) & 0xffff;
}
function createExtraOptions(character) {
    const options = {
        ex: true,
    };
    if (character.auth && !security_1.isForbiddenName(character.auth.name)) {
        options.site = {
            provider: character.auth.provider,
            name: character.auth.name,
            url: character.auth.url,
        };
    }
    return options;
}
exports.createExtraOptions = createExtraOptions;
function logRemovedCharacter({ _id, account, name, info }) {
    logger_1.log(logger_1.systemMessage(`${account}`, `removed pony [${_id}] "${name}" ${info}`));
}
exports.logRemovedCharacter = logRemovedCharacter;
async function swapCharacter(client, { server }, query) {
    if (client.isSwitchingMap)
        return;
    if ((Date.now() - client.lastSwap) < constants_1.SWAP_TIMEOUT) {
        return;
    }
    const character = await db_1.queryCharacter(query);
    if (!character) {
        return chat_1.saySystem(client, `Can't find character`);
    }
    if (entityUtils_2.isPonyFlying(client.pony) && !ponyUtils_1.canFly(compressPony_1.decompressPony(character.info || ''))) {
        return chat_1.saySystem(client, `Can't swap to that character in-flight`);
    }
    const state = playerUtils_1.createCharacterState(client.pony, client.map);
    updateCharacterState(client.characterId, server.id, state)
        .catch(logger_1.logger.error);
    db_1.Character.updateOne({ _id: character._id }, { lastUsed: new Date() }).exec()
        .catch(logger_1.logger.error);
    playerUtils_1.updateClientCharacter(client, character);
    updatePony(client.pony, client.account, client.character);
    updatePonyFromState(client.pony, getCharacterState(character, server.id, client.map));
    const options = client.pony.options;
    options.expr = expressionEncoder_1.encodeExpression(undefined);
    client.pony.state &= ~8 /* Magic */;
    entityUtils_1.pushUpdateEntity({
        entity: client.pony, options: Object.assign({ hold: 0, toy: 0 }, options),
        flags: 64 /* Info */ | 256 /* Name */ | 32 /* Options */ | 4 /* State */,
    });
    cleanupPonyOptions(client.pony);
    client.myEntity(client.pony.id, client.characterName, client.character.info, client.characterId, client.pony.crc || 0);
    client.reporter.systemLog(`Swapped to "${client.characterName}"`);
    client.lastSwap = Date.now();
}
exports.swapCharacter = swapCharacter;
//# sourceMappingURL=characterUtils.js.map