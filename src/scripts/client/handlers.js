"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const browser_1 = require("ag-sockets/dist/browser");
const utf8_1 = require("ag-sockets/dist/utf8");
const interfaces_1 = require("../common/interfaces");
const utils_1 = require("../common/utils");
const camera_1 = require("../common/camera");
const region_1 = require("../common/region");
const entities_1 = require("../common/entities");
const entityUtils_1 = require("../common/entityUtils");
const pony_1 = require("../common/pony");
const sec_1 = require("./sec");
const constants_1 = require("../common/constants");
const clientUtils_1 = require("./clientUtils");
const graphicsUtils_1 = require("../graphics/graphicsUtils");
const updateDecoder_1 = require("../common/encoders/updateDecoder");
const entityUtils_2 = require("../common/entityUtils");
const compressPony_1 = require("../common/compressPony");
const ponyInfo_1 = require("../common/ponyInfo");
const ponyAnimations_1 = require("./ponyAnimations");
const worldMap_1 = require("../common/worldMap");
const gameUtils_1 = require("./gameUtils");
const model_1 = require("../components/services/model");
const collision_1 = require("../common/collision");
const draw_1 = require("./draw");
function log(message) {
    if (DEVELOPMENT && !TESTS) {
        console.error(message);
    }
}
function handleAddEntity(game, region, update, initial) {
    const { id, type = 0, x = 0, y = 0, vx = 0, vy = 0, state = 0, playerState = 0, options = {}, name, filterName, info, crc = 0, action // , expression
     } = update;
    const filteredName = filterEntityName(game, name, filterName);
    const entity = createEntityOrPony(game, type, id, x, y, options, crc, filteredName, info, state);
    entity.id = id;
    entity.x = x;
    entity.y = y;
    entity.vx = vx;
    entity.vy = vy;
    entity.playerState = playerState || 0 /* None */;
    worldMap_1.addEntityToMapRegion(game.map, region, entity);
    if (pony_1.isPony(entity)) {
        if (id === game.playerId) {
            game.apply(() => sec_1.setupPlayer(game, entity));
        }
        if (gameUtils_1.isSelected(game, id)) {
            game.select(entity);
        }
        if (game.whisperTo && game.whisperTo.id === id) {
            game.whisperTo = entity;
        }
        if (!initial) {
            game.onPonyAddOrUpdate.next(entity);
        }
    }
    if (action !== undefined) {
        handleAction(game, id, action);
    }
}
function handleUpdateEntity(game, update) {
    const { id, x, y, vx, vy, state, playerState, expression, options, switchRegion, name, filterName, info, crc = 0, action } = update;
    const filteredName = filterEntityName(game, name, filterName);
    const entity = findEntityByIdInGame(game, id);
    if (entity) {
        const isPlayer = id === game.playerId;
        if (x !== undefined && y !== undefined) {
            if (switchRegion) {
                if (DEVELOPMENT && isPlayer && !worldMap_1.getRegionGlobal(game.map, x, y)) {
                    console.error(`Switching player to unsubscribed region`);
                }
                worldMap_1.switchEntityRegion(game.map, entity, x, y);
            }
            if (!isPlayer) {
                // if (DEVELOPMENT && isPony(entity)) {
                // 	const dx = entity.x - x;
                // 	const dy = entity.y - y;
                // 	console.log(`adjust x: [${num(dx)}] (${ms(dx)}) y: [${num(dy)}] (${ms(dy)})`);
                // }
                entity.x = x;
                entity.y = y;
                entityUtils_2.updateEntityVelocity(game.map, entity, vx, vy);
                if (collision_1.canCollideWith(entity)) {
                    const rx = region_1.worldToRegionX(entity.x, game.map);
                    const ry = region_1.worldToRegionY(entity.y, game.map);
                    for (let y = -1; y <= 1; y++) {
                        for (let x = -1; x <= 1; x++) {
                            const region = worldMap_1.getRegionUnsafe(game.map, rx + x, ry + y);
                            if (region) {
                                region.colliderDirty = true;
                            }
                        }
                    }
                }
            }
            else if (utils_1.distanceXY(entity.x, entity.y, x, y) > 8) {
                log(`Fixing player position (${entity.x}, ${entity.y}) => (${x}, ${y})`);
                entity.x = x;
                entity.y = y;
                sec_1.savePlayerPosition();
            }
        }
        if (state !== undefined) {
            updateEntityStateInternal(game, entity, state);
        }
        if (playerState !== undefined) {
            updateEntityPlayerStateInternal(game, entity, playerState);
        }
        if (expression !== undefined && pony_1.isPony(entity)) {
            pony_1.setPonyExpression(entity, expression);
        }
        if (options != null) {
            updateEntityOptionsInternal(entity, options, game);
        }
        if (filteredName !== undefined && !isPlayer) {
            entity.name = filteredName;
        }
        if (info !== undefined && !isPlayer) {
            const ponyInfo = utils_1.bitmask(info, constants_1.PONY_INFO_KEY);
            if (entity.fake) {
                entity.palettePonyInfo = compressPony_1.decodePonyInfo(ponyInfo, ponyInfo_1.mockPaletteManager);
            }
            else {
                updatePonyInfoWithPoof(game, entity, ponyInfo, crc);
            }
        }
        if (action !== undefined) {
            handleAction(game, id, action);
        }
        applyIfSelected(game, id);
    }
    else {
        log(`handleUpdateEntity: missing entity: ${id}`);
    }
}
exports.handleUpdateEntity = handleUpdateEntity;
function handleUpdatePonies(game, ponies) {
    for (const [id, options = {}, name, info, playerState, nameBad] of ponies) {
        const decodedName = name && utf8_1.decodeString(name) || undefined;
        const filteredName = filterEntityName(game, decodedName, nameBad);
        const decodedInfo = info ? utils_1.bitmask(info, constants_1.PONY_INFO_KEY) : '';
        const pony = createPonyEntity(game, id, options, filteredName, decodedInfo, 0 /* None */);
        pony.playerState = playerState;
        game.fallbackPonies.set(pony.id, pony);
    }
    const missing = game.party && game.party.members.filter(p => !p.pony);
    if (missing && missing.length) {
        game.apply(() => missing.forEach(p => p.pony = game.fallbackPonies.get(p.id)));
    }
}
exports.handleUpdatePonies = handleUpdatePonies;
function createPonyEntity(game, id, options, name, info, state) {
    if (!game.webgl) {
        throw new Error('WebGL not initialized');
    }
    const pony = pony_1.createPony(id, state, info, game.webgl.palettes.defaultPalette, game.paletteManager);
    if (name) {
        pony.name = name;
    }
    updateEntityOptionsInternal(pony, options, game);
    // bypass name/info filtering for player pony
    if (id === game.playerId) {
        if (game.playerName) {
            pony.name = game.playerName;
        }
        if (game.playerInfo) {
            pony.crc = game.playerCRC;
            pony_1.updatePonyInfo(pony, game.playerInfo, game.applyChanges);
        }
    }
    return pony;
}
function updateEntityStateInternal(game, entity, state) {
    if (entity === game.player) {
        const right = game.rightOverride;
        const headTurned = game.headTurnedOverride;
        const stateOverride = game.stateOverride;
        if (right !== undefined) {
            state = utils_1.setFlag(state, 2 /* FacingRight */, right);
            game.rightOverride = undefined;
        }
        if (headTurned !== undefined) {
            state = utils_1.setFlag(state, 4 /* HeadTurned */, headTurned);
            game.headTurnedOverride = undefined;
        }
        if (stateOverride !== undefined) {
            if (stateOverride !== entityUtils_1.getPonyState(state)) {
                state = entityUtils_1.setPonyState(state, stateOverride);
            }
            game.stateOverride = undefined;
        }
        game.onActionsUpdate.next();
    }
    const wasPonyFlying = entityUtils_1.isPonyFlying(entity);
    const hadLight = draw_1.hasDrawLight(entity);
    const hadLightSprite = draw_1.hasLightSprite(entity);
    entity.state = state;
    if (!wasPonyFlying && entityUtils_1.isPonyFlying(entity) && pony_1.isPony(entity)) {
        entity.inTheAirDelay = constants_1.FLY_DELAY;
    }
    const hasLight = draw_1.hasDrawLight(entity);
    const hasLightSprite1 = draw_1.hasLightSprite(entity);
    worldMap_1.addOrRemoveFromEntityList(game.map.entitiesLight, entity, hadLight, hasLight);
    worldMap_1.addOrRemoveFromEntityList(game.map.entitiesLightSprite, entity, hadLightSprite, hasLightSprite1);
}
function updateEntityPlayerStateInternal(game, entity, playerState) {
    if (!entity.fake && !entityUtils_1.isHidden(entity) && utils_1.hasFlag(playerState, 2 /* Hidden */)) {
        playEffect(game, entity, entities_1.poof.type);
        if (gameUtils_1.isSelected(game, entity.id)) {
            game.select(undefined);
        }
    }
    entity.playerState = playerState;
}
function findEntityByIdInGame(game, id) {
    let entity = worldMap_1.findEntityById(game.map, id);
    if (!entity && gameUtils_1.isSelected(game, id)) {
        entity = game.selected;
    }
    return entity;
}
function applyIfSelected(game, id) {
    if (gameUtils_1.isSelected(game, id)) {
        game.applyChanges();
    }
}
function handleUpdates(game, updates) {
    const reader = browser_1.createBinaryReader(updates);
    while (reader.offset < reader.view.byteLength) {
        const type = browser_1.readUint8(reader);
        switch (type) {
            case 0 /* None */:
                log(`handleUpdates (none)`);
                break;
            case 1 /* AddEntity */: {
                const update = updateDecoder_1.readOneUpdate(reader);
                const { x = 0, y = 0 } = update;
                const region = worldMap_1.getRegionGlobal(game.map, x, y);
                if (region) {
                    handleAddEntity(game, region, update, false);
                }
                else {
                    log(`handleUpdates (add): missing region at ${x} ${y}`);
                }
                break;
            }
            case 2 /* UpdateEntity */: {
                const update = updateDecoder_1.readOneUpdate(reader);
                handleUpdateEntity(game, update);
                break;
            }
            case 3 /* RemoveEntity */: {
                const id = browser_1.readUint32(reader);
                handleRemoveEntity(game, id);
                break;
            }
            case 4 /* UpdateTile */: {
                const x = browser_1.readUint16(reader);
                const y = browser_1.readUint16(reader);
                const type = browser_1.readUint8(reader);
                worldMap_1.setTile(game.map, x, y, type);
                break;
            }
            default:
                utils_1.invalidEnum(type);
        }
    }
}
exports.handleUpdates = handleUpdates;
function updatePonyInfoWithPoof(game, entity, info, crc) {
    const update = (pony) => {
        pony.crc = crc;
        pony_1.updatePonyInfo(pony, info, game.applyChanges);
        game.onPonyAddOrUpdate.next(pony);
    };
    if (entity && pony_1.isPony(entity)) {
        if (entityUtils_1.isHidden(entity)) {
            update(entity);
        }
        else {
            playEffect(game, entity, entities_1.poof2.type);
            setTimeout(() => update(entity), 100);
        }
    }
}
exports.updatePonyInfoWithPoof = updatePonyInfoWithPoof;
function handleRemoveEntity(game, id) {
    const entity = worldMap_1.findEntityById(game.map, id);
    if (entity) {
        worldMap_1.removeEntity(game.map, entity);
    }
    else {
        log(`handleRemoveEntity: Missing entity: ${id}`);
    }
    if (id === game.playerId) {
        log(`handleRemoveEntity: Removing player`);
    }
    if (entity && entity.type === constants_1.PONY_TYPE) {
        playEffect(game, entity, entities_1.poof.type);
    }
    if (gameUtils_1.isSelected(game, id)) {
        setTimeout(() => {
            if (gameUtils_1.isSelected(game, id)) {
                game.select(undefined);
            }
        }, 15 * constants_1.SECOND);
    }
}
exports.handleRemoveEntity = handleRemoveEntity;
function findPonyById(map, id) {
    const entity = worldMap_1.findEntityById(map, id);
    return entity && pony_1.isPony(entity) ? entity : undefined;
}
function handleAction(game, id, action) {
    const pony = findPonyById(game.map, id);
    if (pony) {
        switch (action) {
            case 1 /* Boop */:
                pony_1.doBoopPonyAction(game, pony);
                break;
            case 12 /* HoldPoof */:
                pony_1.doPonyAction(pony, 3 /* HoldPoof */);
                break;
            case 3 /* Yawn */:
                if (!pony_1.hasHeadAnimation(pony)) {
                    pony_1.setHeadAnimation(pony, ponyAnimations_1.yawn);
                }
                break;
            case 4 /* Laugh */:
                if (!pony_1.hasHeadAnimation(pony)) {
                    pony_1.setHeadAnimation(pony, ponyAnimations_1.laugh);
                }
                break;
            case 5 /* Sneeze */:
                if (!pony_1.hasHeadAnimation(pony)) {
                    pony_1.setHeadAnimation(pony, ponyAnimations_1.sneeze);
                }
                break;
            default:
                log(`handleAction: Invalid action: ${action}`);
        }
    }
    else {
        log(`handleAction: Missing entity: ${id}`);
    }
}
exports.handleAction = handleAction;
function playEffect(game, target, type) {
    if (entityUtils_1.isHidden(target))
        return;
    try {
        const entity = entities_1.createAnEntity(type, 0, target.x, target.y, {}, game.paletteManager, game);
        worldMap_1.addEntity(game.map, entity);
        setTimeout(() => worldMap_1.removeEntityDirectly(game.map, entity), 1000);
    }
    catch (e) {
        DEVELOPMENT && console.error(e);
    }
}
exports.playEffect = playEffect;
function findEntityOrMockByAnyMeans(game, id) {
    if (!id) {
        return undefined;
    }
    let entity = worldMap_1.findEntityById(game.map, id);
    if (!entity && game.party) {
        const member = utils_1.findById(game.party.members, id);
        entity = member && member.pony;
    }
    if (!entity) {
        const friend = game.model.friends && game.model.friends.find(f => f.entityId === id);
        if (friend) {
            entity = { fake: true, type: constants_1.PONY_TYPE, id: friend.entityId, name: friend.actualName, crc: friend.crc };
        }
    }
    if (!entity) {
        entity = game.findEntityFromChatLog(id);
    }
    return entity;
}
exports.findEntityOrMockByAnyMeans = findEntityOrMockByAnyMeans;
function findBestEntityByName(game, name) {
    const regex = new RegExp(`^${lodash_1.escapeRegExp(name)}$`, 'i');
    if (game.model.friends) {
        for (const friend of game.model.friends) {
            if (friend.online && friend.entityId && regex.test(friend.actualName)) {
                return { fake: true, type: constants_1.PONY_TYPE, id: friend.entityId, name: friend.actualName, crc: friend.crc };
            }
        }
    }
    let result = undefined;
    if (game.player) {
        for (const entity of game.map.entities) {
            if (entity.type === constants_1.PONY_TYPE && entity.id !== game.playerId && !entityUtils_1.isHidden(entity) && entity.name && regex.test(entity.name)) {
                if (!result || (utils_1.distance(game.player, entity) < utils_1.distance(game.player, result))) {
                    result = entity;
                }
            }
        }
    }
    if (!result) {
        result = game.findEntityFromChatLogByName(name);
    }
    return result;
}
exports.findBestEntityByName = findBestEntityByName;
function findMatchingEntityNames(game, match) {
    const result = [];
    const ids = new Set();
    const regex = new RegExp(`^${lodash_1.escapeRegExp(match)}`, 'i');
    if (game.model.friends) {
        for (const friend of game.model.friends) {
            if (friend.online && friend.entityId && friend.actualName && regex.test(friend.actualName)) {
                ids.add(friend.entityId);
                result.push(friend.actualName);
            }
        }
    }
    for (const entity of game.map.entities) {
        if (entity.type === constants_1.PONY_TYPE &&
            entity.id !== game.playerId &&
            entity.name &&
            !entityUtils_1.isHidden(entity) &&
            regex.test(entity.name) &&
            !ids.has(entity.id)) {
            result.push(entity.name);
        }
    }
    return result;
}
exports.findMatchingEntityNames = findMatchingEntityNames;
let cachedFilter = undefined;
let cachedRegex = undefined;
function containsFilteredWords(message, filter) {
    if (cachedFilter !== filter) {
        if (filter) {
            const words = lodash_1.compact(filter.replace(/[,]/g, ' ').split(/[\r\n\t ]+/g).map(x => x.trim()));
            cachedRegex = new RegExp(`(^| )(${words.map(lodash_1.escapeRegExp).join('|')})($| )`, 'i');
        }
        else {
            cachedRegex = undefined;
        }
        cachedFilter = filter;
    }
    return cachedRegex && cachedRegex.test(message);
}
exports.containsFilteredWords = containsFilteredWords;
function handleSays(game, id, message, type) {
    const entity = findEntityOrMockByAnyMeans(game, id);
    if (entity) {
        handleSay(game, entity, message, type);
    }
    else {
        DEVELOPMENT && console.warn('incomplete say');
        game.incompleteSays.push({ id, message, type, time: Date.now() });
        game.send(server => server.actionParam2(24 /* RequestEntityInfo */, id));
    }
}
exports.handleSays = handleSays;
function isFriendEntityId(game, id) {
    if (game.model.friends) {
        for (const friend of game.model.friends) {
            if (friend.entityId === id) {
                return true;
            }
        }
    }
    return false;
}
function shouldShowChatMessage(game, entity, message, type) {
    if (entity === game.player)
        return true;
    if (interfaces_1.isWhisperTo(type))
        return true;
    if (interfaces_1.isWhisper(type) && isFriendEntityId(game, entity.id))
        return true;
    if (interfaces_1.isPublicMessage(type) && !entity.fake && !camera_1.isChatVisible(game.camera, entity))
        return false;
    if (interfaces_1.isNonIgnorableMessage(type))
        return true;
    if (game.settings.account.filterCyrillic && clientUtils_1.containsCyrillic(message))
        return false;
    if (game.settings.account.ignorePublicChat && interfaces_1.isPublicMessage(type))
        return false;
    if (interfaces_1.isWhisper(type) && game.settings.account.ignoreNonFriendWhispers)
        return false;
    if (containsFilteredWords(message, game.settings.account.filterWords))
        return false;
    return true;
}
function isChatInRange(entity, player, range) {
    return player === undefined || constants_1.isChatlogRangeUnlimited(range) || utils_1.distance(entity, player) < range;
}
function shouldShowChatMessageInChatlog(game, entity, type) {
    if (entity.type !== constants_1.PONY_TYPE)
        return false;
    if (entity.fake)
        return true;
    if (!interfaces_1.isPublicMessage(type))
        return true;
    if (!isChatInRange(entity, game.player, game.settings.account.chatlogRange))
        return false;
    return true;
}
function handleSay(game, entity, message, type) {
    if (!shouldShowChatMessage(game, entity, message, type))
        return;
    if (type === 12 /* Dismiss */ || message === '.') {
        if (!entity.fake && entity.says) {
            graphicsUtils_1.dismissSays(entity.says);
        }
    }
    else {
        const bubbleEntity = interfaces_1.isWhisperTo(type) ? game.player : entity;
        if (bubbleEntity && !bubbleEntity.fake && game.map.entitiesById.has(bubbleEntity.id)) {
            const total = clientUtils_1.getSaysTime(message);
            entityUtils_1.addChatBubble(game.map, bubbleEntity, { message, type, total, timer: total, created: Date.now() });
        }
        if (interfaces_1.isWhisper(type)) {
            const friend = game.model.friends && game.model.friends.find(f => f.entityId === entity.id);
            game.lastWhisperFrom = { entityId: entity.id, accountId: friend && friend.accountId };
        }
        if (shouldShowChatMessageInChatlog(game, entity, type)) {
            const { id, name = '', crc } = entity;
            game.messageQueue.push({ id, crc, name, message, type });
        }
    }
}
exports.handleSay = handleSay;
function handleEntityInfo(game, id, name, crc, nameBad) {
    name = filterEntityName(game, name, nameBad);
    for (let i = 0; i < game.incompleteSays.length;) {
        const say = game.incompleteSays[i];
        if (say.id === id) {
            game.incompleteSays.splice(i, 1);
            const entity = { fake: true, type: constants_1.PONY_TYPE, id, name, crc };
            handleSay(game, entity, say.message, say.type);
        }
        else {
            i++;
        }
    }
}
exports.handleEntityInfo = handleEntityInfo;
function subscribeRegion(game, data) {
    const { x, y, updates, tileData } = updateDecoder_1.decodeUpdate(data);
    const region = region_1.createRegion(x, y, tileData);
    const initial = !game.loaded;
    worldMap_1.setRegion(game.map, x, y, region);
    for (const update of updates) {
        handleAddEntity(game, region, update, initial);
    }
}
exports.subscribeRegion = subscribeRegion;
function filterEntityName({ settings, worldFlags }, name, nameBad) {
    if (name && nameBad && (settings.account.filterSwearWords || utils_1.hasFlag(worldFlags, 1 /* Safe */))) {
        return lodash_1.repeat('*', name.length);
    }
    else if (name && containsFilteredWords(name, settings.account.filterWords)) {
        return lodash_1.repeat('?', name.length);
    }
    else {
        return name;
    }
}
exports.filterEntityName = filterEntityName;
function createEntityOrPony(game, type, id, x, y, options, crc, name, info, state) {
    if (type === constants_1.PONY_TYPE) {
        const entity = createPonyEntity(game, id, options, name, info ? utils_1.bitmask(info, constants_1.PONY_INFO_KEY) : '', state);
        const member = game.party && game.party.members.find(p => p.id === id);
        entity.crc = crc;
        if (member) {
            game.apply(() => member.pony = entity);
        }
        if (gameUtils_1.isSelected(game, id)) {
            game.select(entity);
        }
        return entity;
    }
    else {
        const entity = entities_1.createAnEntity(type, id, x, y, options, game.paletteManager, game);
        entity.state = state;
        if (name) {
            entity.name = name;
        }
        return entity;
    }
}
function updateEntityOptionsInternal(entity, options, game) {
    Object.assign(entity, options);
    if (pony_1.isPony(entity) && 'hold' in options) {
        pony_1.updatePonyHold(entity, game);
    }
}
function handleUpdateFriends(game, friends, removeMissing) {
    if (!game.model.friends)
        return;
    for (const { accountId, accountName, status, entityId, name, info, crc, nameBad = false } of friends) {
        let friend = game.model.friends.find(f => f.accountId === accountId);
        if (utils_1.hasFlag(status, 2 /* Remove */)) {
            if (friend) {
                utils_1.removeItem(game.model.friends, friend);
            }
        }
        else {
            if (!friend) {
                friend = {
                    accountId,
                    accountName: '',
                    online: false,
                    name: undefined,
                    nameBad: false,
                    pony: undefined,
                    entityId: 0,
                    crc: 0,
                    ponyInfo: undefined,
                    actualName: '',
                };
                game.model.friends.push(friend);
            }
            friend.online = utils_1.hasFlag(status, 1 /* Online */);
            if (accountName !== undefined) {
                friend.accountName = accountName;
            }
            if (entityId !== undefined) {
                if (game.lastWhisperFrom && game.lastWhisperFrom.accountId === friend.accountId) {
                    game.lastWhisperFrom.entityId = entityId;
                }
                game.onEntityIdUpdate.next({ old: friend.entityId, new: entityId });
                friend.entityId = entityId;
            }
            if (name !== undefined) {
                friend.name = name;
                friend.nameBad = nameBad;
                friend.actualName = filterEntityName(game, name, nameBad) || '';
            }
            if (crc !== undefined) {
                friend.crc = crc;
            }
            if (info !== undefined) {
                friend.pony = info;
                friend.ponyInfo = compressPony_1.decodePonyInfo(info, ponyInfo_1.mockPaletteManager);
            }
            if (friend.entityId && game.whisperTo && game.whisperTo.id === friend.entityId) {
                game.whisperTo.name = friend.actualName;
                game.whisperTo.crc = friend.crc;
            }
        }
    }
    if (removeMissing) {
        for (let i = game.model.friends.length - 1; i >= 0; i--) {
            if (!friends.find(f => f.accountId === game.model.friends[i].accountId)) {
                game.model.friends.splice(i, 1);
            }
        }
        DEVELOPMENT && console.log('Refreshing friend list');
    }
    game.model.friends.sort(model_1.compareFriends);
    game.apply(() => { });
}
exports.handleUpdateFriends = handleUpdateFriends;
//# sourceMappingURL=handlers.js.map