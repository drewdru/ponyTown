"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const ag_sockets_1 = require("ag-sockets");
const db_1 = require("./db");
const entities = require("../common/entities");
const adminUtils_1 = require("../common/adminUtils");
const serverUtils_1 = require("./serverUtils");
const utils_1 = require("../common/utils");
const interfaces_1 = require("../common/interfaces");
const expressionEncoder_1 = require("../common/encoders/expressionEncoder");
const constants_1 = require("../common/constants");
const camera_1 = require("../common/camera");
const serverMap_1 = require("./serverMap");
const reporter_1 = require("./reporter");
const accountUtils_1 = require("./accountUtils");
const accountUtils_2 = require("../common/accountUtils");
const originUtils_1 = require("./originUtils");
const characterUtils_1 = require("./characterUtils");
const entityUtils_1 = require("./entityUtils");
const emoji_1 = require("../client/emoji");
const expressionUtils_1 = require("../common/expressionUtils");
const entityUtils_2 = require("../common/entityUtils");
const rect_1 = require("../common/rect");
const friends_1 = require("./services/friends");
const entities_1 = require("../common/entities");
const chat_1 = require("./chat");
function isMutedOrShadowed(client) {
    return client.shadowed || adminUtils_1.isMuted(client.account);
}
exports.isMutedOrShadowed = isMutedOrShadowed;
function isIgnored(ignoring, target) {
    return target.ignores.has(ignoring.accountId);
}
exports.isIgnored = isIgnored;
function kickClient(client, reason = 'kicked') {
    client.leaveReason = reason;
    client.disconnect(true, true);
}
exports.kickClient = kickClient;
function getCounter(client, key) {
    return utils_1.toInt(client.account.state && client.account.state[key]);
}
exports.getCounter = getCounter;
function createClientAndPony(client, friends, hides, server, world, states) {
    const { account, character } = client.tokenData;
    const origin = client.originalRequest && originUtils_1.getOriginFromHTTP(client.originalRequest);
    const reporter = reporter_1.create(server, account._id, character._id, origin);
    const state = characterUtils_1.getAndFixCharacterState(server, character, world, states);
    client.characterState = state;
    const pony = characterUtils_1.createPony(account, character, state);
    pony.client = createClient(client, account, friends, hides, character, pony, world.getMainMap(), reporter, origin);
    camera_1.centerCameraOn(client.camera, pony);
}
exports.createClientAndPony = createClientAndPony;
function updateClientCharacter(client, character) {
    client.character = character;
    client.characterId = client.character._id.toString();
    client.characterName = emoji_1.replaceEmojis(client.character.name);
}
exports.updateClientCharacter = updateClientCharacter;
function createClient(client, account, friends, hides, character, pony, defaultMap, reporter, origin) {
    updateClientCharacter(client, character);
    client.ip = origin && origin.ip || '';
    client.country = origin && origin.country || '??';
    client.userAgent = client.originalRequest && client.originalRequest.headers['user-agent'];
    client.accountId = account._id.toString();
    client.accountName = account.name;
    client.ignores = new Set(account.ignores);
    client.hides = new Set();
    client.permaHides = new Set(hides);
    client.friends = new Set(friends);
    client.friendsCRC = undefined;
    client.accountSettings = Object.assign({}, account.settings);
    client.supporterLevel = adminUtils_1.supporterLevel(account);
    client.isMod = accountUtils_2.isMod(account);
    client.reporter = reporter;
    client.account = account;
    client.character = character;
    client.pony = pony;
    client.map = defaultMap;
    client.isSwitchingMap = false;
    client.notifications = [];
    client.regions = [];
    client.shadowed = adminUtils_1.isShadowed(account);
    client.country = origin && origin.country || '??';
    client.camera = camera_1.createCamera();
    client.camera.w = 800;
    client.camera.h = 600;
    client.safeX = pony.x;
    client.safeY = pony.y;
    client.lastPacket = Date.now();
    client.lastAction = 0;
    client.lastBoopAction = 0;
    client.lastExpressionAction = 0;
    client.lastSays = [];
    client.lastX = pony.x;
    client.lastY = pony.y;
    client.lastTime = 0;
    client.lastVX = 0;
    client.lastVY = 0;
    client.lastMapSwitch = 0;
    client.lastSitX = 0;
    client.lastSitY = 0;
    client.lastSitTime = 0;
    client.sitCount = 0;
    client.lastSwap = 0;
    client.lastMapLoadOrSave = 0;
    client.lastCameraX = 0;
    client.lastCameraY = 0;
    client.lastCameraW = 0;
    client.lastCameraH = 0;
    client.updateQueue = ag_sockets_1.createBinaryWriter(128);
    client.regionUpdates = [];
    client.saysQueue = [];
    client.unsubscribes = [];
    client.subscribes = [];
    client.positions = [];
    return client;
}
exports.createClient = createClient;
function resetClientUpdates(client) {
    ag_sockets_1.resetWriter(client.updateQueue);
    client.regionUpdates.length = 0;
    client.saysQueue.length = 0;
    client.unsubscribes.length = 0;
    client.subscribes.length = 0;
}
exports.resetClientUpdates = resetClientUpdates;
function createCharacterState(entity, map) {
    const options = entity.options;
    const flags = (utils_1.hasFlag(entity.state, 2 /* FacingRight */) ? 1 /* Right */ : 0) |
        (options.extra ? 2 /* Extra */ : 0);
    const state = { x: entity.x, y: entity.y };
    if (flags) {
        state.flags = flags;
    }
    if (map.id) {
        state.map = map.id;
    }
    if (options.hold) {
        state.hold = entities.getEntityTypeName(options.hold);
    }
    if (options.toy) {
        state.toy = options.toy;
    }
    return state;
}
exports.createCharacterState = createCharacterState;
async function createAndUpdateCharacterState(client, server) {
    const state = createCharacterState(client.pony, client.map);
    await characterUtils_1.updateCharacterState(client.characterId, server.id, state);
}
exports.createAndUpdateCharacterState = createAndUpdateCharacterState;
// utils
function addIgnore(target, accountId) {
    target.account.ignores = target.account.ignores || [];
    target.account.ignores.push(accountId);
    target.ignores.add(accountId);
}
exports.addIgnore = addIgnore;
function removeIgnore(target, accountId) {
    if (target.account.ignores) {
        utils_1.removeItem(target.account.ignores, accountId);
    }
    target.ignores.delete(accountId);
}
exports.removeIgnore = removeIgnore;
exports.createIgnorePlayer = (updateAccount, handlePromise = serverUtils_1.handlePromiseDefault) => (client, target, ignored) => {
    if (target.accountId === client.accountId)
        return;
    const id = client.accountId;
    const is = isIgnored(client, target);
    if (ignored === is)
        return;
    if (ignored) {
        addIgnore(target, id);
    }
    else {
        removeIgnore(target, id);
    }
    handlePromise(updateAccount(target.accountId, { [ignored ? '$push' : '$pull']: { ignores: id } })
        .then(() => updateEntityPlayerState(client, target.pony))
        .then(() => {
        const { accountId, account, character } = target;
        const message = `${ignored ? 'ignored' : 'unignored'} ${character.name} (${account.name}) [${accountId}]`;
        client.reporter.systemLog(message);
    }), client.reporter.error);
};
function findClientByEntityId(self, entityId) {
    const selected = self.selected;
    if (selected && selected.id === entityId && selected.client) {
        return selected.client;
    }
    if (self.party) { // TODO: remove ?
        const client = self.party.clients.find(c => c.pony.id === entityId);
        if (client) {
            //this.logger.log('client from party');
            return client;
        }
        const pending = self.party.pending.find(c => c.client.pony.id === entityId);
        if (pending) {
            //this.logger.log('pending from party');
            return pending.client;
        }
    }
    const notification = self.notifications.find(c => c.entityId === entityId);
    if (notification) {
        //this.logger.log('sender from notification');
        return notification.sender;
    }
    return undefined;
}
exports.findClientByEntityId = findClientByEntityId;
function cancelEntityExpression(entity) {
    if (entity.exprCancellable) {
        setEntityExpression(entity, undefined);
    }
}
exports.cancelEntityExpression = cancelEntityExpression;
function setEntityExpression(entity, expression, timeout = constants_1.EXPRESSION_TIMEOUT, cancellable = false) {
    expression = expression || entity.exprPermanent;
    const expr = expressionEncoder_1.encodeExpression(expression);
    entity.options.expr = expr;
    if (expression && timeout) {
        entity.exprTimeout = Date.now() + timeout;
    }
    else {
        entity.exprTimeout = undefined;
    }
    const sleeping = expression !== undefined && utils_1.hasFlag(expression.extra, 2 /* Zzz */);
    entity.exprCancellable = cancellable || sleeping;
    entityUtils_1.updateEntityExpression(entity);
}
exports.setEntityExpression = setEntityExpression;
function playerBlush(pony, args = '') {
    const expr = parseOrCurrentExpression(pony, args) || expressionUtils_1.expression(1 /* Neutral */, 1 /* Neutral */, 2 /* Neutral */);
    expr.extra |= 1 /* Blush */;
    setEntityExpression(pony, expr, constants_1.DAY, !!pony.exprCancellable);
}
exports.playerBlush = playerBlush;
function parseOrCurrentExpression(pony, message) {
    return expressionUtils_1.parseExpression(message)
        || expressionEncoder_1.decodeExpression((!pony.options || pony.options.expr == null) ? expressionEncoder_1.EMPTY_EXPRESSION : pony.options.expr);
}
exports.parseOrCurrentExpression = parseOrCurrentExpression;
function playerSleep(pony, args = '') {
    if (pony.vx === 0 && pony.vy === 0) {
        const base = parseOrCurrentExpression(pony, args) || expressionUtils_1.expression(6 /* Closed */, 6 /* Closed */, 2 /* Neutral */);
        const muzzle = interfaces_1.CLOSED_MUZZLES.indexOf(base.muzzle) !== -1 ? base.muzzle : 2 /* Neutral */;
        const expr = Object.assign({}, base, { muzzle, left: 6 /* Closed */, right: 6 /* Closed */, extra: 2 /* Zzz */ });
        setEntityExpression(pony, expr, 0, true);
    }
}
exports.playerSleep = playerSleep;
function playerLove(pony, args = '') {
    const expr = parseOrCurrentExpression(pony, args) || expressionUtils_1.expression(1 /* Neutral */, 1 /* Neutral */, 0 /* Smile */);
    expr.extra |= 16 /* Hearts */;
    setEntityExpression(pony, expr, constants_1.DAY, !!pony.exprCancellable);
}
exports.playerLove = playerLove;
function playerCry(pony, args = '') {
    const expr = expressionUtils_1.parseExpression(args) || expressionUtils_1.expression(15 /* Sad */, 15 /* Sad */, 1 /* Frown */);
    expr.extra = expr.extra | 4 /* Cry */;
    setEntityExpression(pony, expr, 0);
}
exports.playerCry = playerCry;
const fruitTypes = entities.fruits.map(f => f.type);
function interactWith(client, target) {
    if (target) {
        const pony = client.pony;
        if (target.interact && (!target.interactRange || utils_1.distance(pony, target) < target.interactRange)) {
            target.interact(target, client);
        }
        else if (target.triggerBounds && target.trigger) {
            if (utils_1.containsPointWitBorder(target.x, target.y, target.triggerBounds, pony.x, pony.y, 3)) {
                target.trigger(target, client);
            }
            else {
                DEVELOPMENT && console.warn(`outside trigger bounds ` +
                    `(bounds: ${target.x} ${target.y} ${JSON.stringify(target.triggerBounds)} point: ${pony.x} ${pony.y})`);
            }
        }
        else if (target.interactAction) {
            switch (target.interactAction) {
                case 1 /* Toolbox */: {
                    switchTool(client, false);
                    break;
                }
                case 2 /* GiveLantern */: {
                    if (client.pony.options.hold === entities.lanternOn.type) {
                        unholdItem(pony);
                    }
                    else {
                        holdItem(pony, entities.lanternOn.type);
                    }
                    break;
                }
                case 3 /* GiveFruits */: {
                    const index = fruitTypes.indexOf(client.pony.options.hold || 0) + 1;
                    holdItem(client.pony, fruitTypes[index % fruitTypes.length]);
                    break;
                }
                case 4 /* GiveCookie1 */: {
                    const hold = client.pony.options.hold;
                    let cookie = hold;
                    while (hold === cookie) {
                        cookie = lodash_1.sample(entities.candies1Types);
                    }
                    holdItem(client.pony, cookie);
                    break;
                }
                case 5 /* GiveCookie2 */: {
                    const hold = client.pony.options.hold;
                    let cookie = hold;
                    while (hold === cookie) {
                        cookie = lodash_1.sample(entities.candies2Types);
                    }
                    holdItem(client.pony, cookie);
                    break;
                }
                default:
                    utils_1.invalidEnum(target.interactAction);
            }
        }
    }
}
exports.interactWith = interactWith;
function useHeldItem(client) {
    const hold = client.pony.options.hold || 0;
    if (isGift(hold)) {
        openGift(client);
    }
}
exports.useHeldItem = useHeldItem;
function canPerformAction(client) {
    return client.lastAction < Date.now();
}
exports.canPerformAction = canPerformAction;
function updateEntityPlayerState(client, entity) {
    const playerState = getPlayerState(client, entity);
    entityUtils_1.pushUpdateEntityToClient(client, { entity, flags: 1024 /* PlayerState */, playerState });
}
exports.updateEntityPlayerState = updateEntityPlayerState;
// actions
function turnHead(client) {
    if (canPerformAction(client)) {
        entityUtils_1.updateEntityState(client.pony, client.pony.state ^ 4 /* HeadTurned */);
    }
}
exports.turnHead = turnHead;
const purpleGrapeTypes = entities.grapesPurple.map(x => x.type);
const greenGrapeTypes = entities.grapesGreen.map(x => x.type);
function boop(client, now) {
    if (canPerformAction(client) && entityUtils_2.canBoop2(client.pony) && client.lastBoopAction < now) {
        cancelEntityExpression(client.pony);
        entityUtils_1.sendAction(client.pony, 1 /* Boop */);
        if (!client.shadowed && (entityUtils_2.isPonySitting(client.pony) || entityUtils_2.isPonyStanding(client.pony))) {
            const boopRect = entityUtils_2.getBoopRect(client.pony);
            const boopBounds = rect_1.withBorder(boopRect, 1);
            const entities = serverMap_1.findEntitiesInBounds(client.map, boopBounds);
            const entity = entities.find(e => entityUtils_1.canBoopEntity(e, boopRect));
            if (entity) {
                if (entity.boop) {
                    entity.boop(client);
                }
                else if (entity.type === constants_1.PONY_TYPE) {
                    const clientHold = client.pony.options.hold || 0;
                    if (entityUtils_1.isHoldingGrapes(entity) && clientHold !== entities_1.grapeGreen.type && clientHold !== entities_1.grapePurple.type) {
                        let index = purpleGrapeTypes.indexOf(entity.options.hold || 0);
                        if (index !== -1) {
                            holdItem(client.pony, entities_1.grapePurple.type);
                            if (index === (purpleGrapeTypes.length - 1)) {
                                unholdItem(entity);
                            }
                            else {
                                holdItem(entity, purpleGrapeTypes[index + 1]);
                            }
                        }
                        else {
                            let index = greenGrapeTypes.indexOf(entity.options.hold || 0);
                            if (index !== -1) {
                                holdItem(client.pony, entities_1.grapeGreen.type);
                                if (index === (greenGrapeTypes.length - 1)) {
                                    unholdItem(entity);
                                }
                                else {
                                    holdItem(entity, greenGrapeTypes[index + 1]);
                                }
                            }
                        }
                    }
                }
            }
        }
        client.lastBoopAction = now + 500;
    }
}
exports.boop = boop;
function stand(client) {
    if (canPerformAction(client) && entityUtils_2.canStand(client.pony, client.map)) {
        if (!entityUtils_2.isPonyFlying(client.pony)) {
            cancelEntityExpression(client.pony);
        }
        entityUtils_1.updateEntityState(client.pony, entityUtils_2.setPonyState(client.pony.state, 0 /* PonyStanding */));
    }
}
exports.stand = stand;
const SIT_MAX_TIME = 2 * constants_1.SECOND;
const SIT_MAX_DIST = 1;
const SIT_MAX_COUNT = 5;
function checkSuspiciousSitting(client) {
    const now = Date.now();
    const { x, y } = client.pony;
    const dist = utils_1.distanceXY(x, y, client.lastSitX, client.lastSitY);
    if ((now - client.lastSitTime) < SIT_MAX_TIME && dist < SIT_MAX_DIST && entityUtils_1.findPlayersThetCanBeSitOn(client.map, client.pony)) {
        client.sitCount++;
        if (client.sitCount > SIT_MAX_COUNT) {
            client.reporter.warn(`Suspicious sitting`);
            client.sitCount = 0;
        }
    }
    else {
        client.sitCount = 1;
    }
    client.lastSitX = x;
    client.lastSitY = y;
    client.lastSitTime = now;
}
function sit(client, settings) {
    if (canPerformAction(client) && entityUtils_2.canSit(client.pony, client.map)) {
        entityUtils_1.updateEntityState(client.pony, entityUtils_2.setPonyState(client.pony.state, 48 /* PonySitting */));
        if (settings.reportSitting) {
            checkSuspiciousSitting(client);
        }
    }
}
exports.sit = sit;
function lie(client) {
    if (canPerformAction(client) && entityUtils_2.canLie(client.pony, client.map)) {
        entityUtils_1.updateEntityState(client.pony, entityUtils_2.setPonyState(client.pony.state, 64 /* PonyLying */));
    }
}
exports.lie = lie;
function fly(client) {
    if (canPerformAction(client) && client.pony.canFly && !entityUtils_2.isPonyFlying(client.pony)) {
        cancelEntityExpression(client.pony);
        entityUtils_1.updateEntityState(client.pony, entityUtils_2.setPonyState(client.pony.state, 80 /* PonyFlying */));
        client.pony.inTheAirDelay = constants_1.FLY_DELAY;
    }
}
exports.fly = fly;
function expressionAction(client, action) {
    if (canPerformAction(client) && interfaces_1.isExpressionAction(action) && client.lastExpressionAction < Date.now()) {
        cancelEntityExpression(client.pony);
        entityUtils_1.sendAction(client.pony, action);
        client.lastExpressionAction = Date.now() + 500;
    }
}
exports.expressionAction = expressionAction;
// hold
function holdItem(entity, hold) {
    if (entity.options && entity.options.hold !== hold) {
        entityUtils_1.updateEntityOptions(entity, { hold });
    }
}
exports.holdItem = holdItem;
function unholdItem(entity) {
    if (entity.options && entity.options.hold) {
        entityUtils_1.updateEntityOptions(entity, { hold: 0 });
        delete entity.options.hold;
    }
}
exports.unholdItem = unholdItem;
// toy
function holdToy(entity, toy) {
    if (entity.options && entity.options.toy !== toy) {
        entityUtils_1.updateEntityOptions(entity, { toy });
    }
}
exports.holdToy = holdToy;
function unholdToy(entity) {
    if (entity.options && entity.options.toy) {
        entityUtils_1.updateEntityOptions(entity, { toy: 0 });
        delete entity.options.toy;
    }
}
exports.unholdToy = unholdToy;
// gifts and toys
const giftTypes = [entities.gift2.type];
const toys = [
    // hat
    { type: 0, multiplier: 20 },
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 5 },
    { type: 0, multiplier: 1 },
    // snowpony
    { type: 0, multiplier: 20 },
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 1 },
    // gift
    { type: 0, multiplier: 20 },
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 5 },
    { type: 0, multiplier: 1 },
    // hanging thing
    { type: 0, multiplier: 20 },
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 5 },
    { type: 0, multiplier: 1 },
    // teddy
    { type: 0, multiplier: 20 },
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 20 },
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 5 },
    { type: 0, multiplier: 5 },
    { type: 0, multiplier: 1 },
    // xmas tree
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 5 },
    // deer
    { type: 0, multiplier: 5 },
    { type: 0, multiplier: 1 },
    // candy horns
    { type: 0, multiplier: 10 },
    { type: 0, multiplier: 2 },
    { type: 0, multiplier: 1 },
    // star
    { type: 0, multiplier: 5 },
    // halo
    { type: 0, multiplier: 5 },
];
toys.forEach((toy, i) => toy.type = i + 1);
const toyTypes = utils_1.flatten(toys.map(x => utils_1.array(x.multiplier, x.type)));
function hasToyUnlocked(type, collectedToys) {
    const index = toys.findIndex(t => t.type === type);
    return utils_1.hasFlag(collectedToys, 1 << index);
}
function unlockToy(type, collectedToys) {
    const index = toys.findIndex(t => t.type === type);
    return collectedToys | (1 << index);
}
function getCollectedToysCount(client) {
    const stateToys = utils_1.toInt((client.account.state || {}).toys);
    const total = toys.length;
    let collected = 0;
    for (let i = 0, bit = 1; i < total; i++, bit <<= 1) {
        if (stateToys & bit) {
            collected++;
        }
    }
    return { collected, total };
}
exports.getCollectedToysCount = getCollectedToysCount;
function getNextToyOrExtra(client) {
    const collectedToys = utils_1.toInt((client.account.state || {}).toys);
    const options = client.pony.options || {};
    const extra = !!options.extra;
    const toy = utils_1.toInt(options.toy);
    if (extra) {
        return { extra: false, toy: 0 };
    }
    else {
        for (let i = toys.findIndex(t => t.type === toy) + 1; i < toys.length; i++) {
            const type = toys[i].type;
            if (hasToyUnlocked(type, collectedToys)) {
                return { extra: false, toy: type };
            }
        }
        return { extra: true, toy: 0 };
    }
}
exports.getNextToyOrExtra = getNextToyOrExtra;
function openGift(client) {
    const options = client.pony.options || {};
    if (isGift(options.hold)) {
        let toyType = 0;
        do {
            toyType = lodash_1.sample(toyTypes);
        } while (toyType === options.toy);
        entityUtils_1.sendAction(client.pony, 12 /* HoldPoof */);
        unholdItem(client.pony);
        setTimeout(() => holdToy(client.pony, toyType), 200);
        const state = client.account.state || {};
        if (!hasToyUnlocked(toyType, utils_1.toInt(state.toys))) {
            accountUtils_1.updateAccountState(client.account, state => {
                state.toys = unlockToy(toyType, utils_1.toInt(state.toys));
            });
        }
    }
}
exports.openGift = openGift;
function isGift(type) {
    return type !== undefined && utils_1.includes(giftTypes, type);
}
exports.isGift = isGift;
function isHiddenBy(a, b) {
    return a.hides.has(b.accountId) || b.hides.has(a.accountId) ||
        a.permaHides.has(b.accountId) || b.permaHides.has(a.accountId);
}
exports.isHiddenBy = isHiddenBy;
function getPlayerState(client, entity) {
    let state = 0 /* None */;
    if (entity.client !== undefined) {
        if (isIgnored(client, entity.client)) {
            state |= 1 /* Ignored */;
        }
        if (isHiddenBy(client, entity.client)) {
            state |= 2 /* Hidden */;
        }
        if (friends_1.isOnlineFriend(client, entity.client)) {
            state |= 4 /* Friend */;
        }
    }
    return state;
}
exports.getPlayerState = getPlayerState;
async function reloadFriends(client) {
    const friends = await db_1.findFriendIds(client.accountId);
    client.friends = new Set(friends);
    client.friendsCRC = undefined;
    client.actionParam(0, 23 /* FriendsCRC */, undefined);
}
exports.reloadFriends = reloadFriends;
function execAction(client, action, settings) {
    switch (action) {
        case 1 /* Boop */:
            boop(client, Date.now());
            break;
        case 2 /* TurnHead */:
            turnHead(client);
            break;
        case 10 /* Stand */:
            stand(client);
            break;
        case 6 /* Sit */:
            sit(client, settings);
            break;
        case 7 /* Lie */:
            lie(client);
            break;
        case 8 /* Fly */:
            fly(client);
            break;
        case 14 /* Drop */:
            unholdItem(client.pony);
            break;
        case 13 /* Sleep */:
            playerSleep(client.pony);
            break;
        case 16 /* Blush */:
            playerBlush(client.pony);
            break;
        case 17 /* Cry */:
            playerCry(client.pony);
            break;
        case 18 /* Love */:
            playerLove(client.pony);
            break;
        case 15 /* DropToy */:
            unholdToy(client.pony);
            entityUtils_1.updateEntityOptions(client.pony, { extra: false });
            break;
        case 26 /* Magic */:
            if (client.pony.canMagic) {
                const has = utils_1.hasFlag(client.pony.state, 8 /* Magic */);
                entityUtils_1.updateEntityState(client.pony, utils_1.setFlag(client.pony.state, 8 /* Magic */, !has));
            }
            break;
        case 29 /* SwitchTool */:
            switchTool(client, false);
            break;
        case 30 /* SwitchToolRev */:
            switchTool(client, true);
            break;
        case 31 /* SwitchToPlaceTool */:
            holdItem(client.pony, entities.hammer.type);
            break;
        case 32 /* SwitchToTileTool */:
            holdItem(client.pony, entities.shovel.type);
            break;
        default:
            if (interfaces_1.isExpressionAction(action)) {
                expressionAction(client, action);
            }
            else {
                throw new Error(`Invalid action (${action})`);
            }
            break;
    }
}
exports.execAction = execAction;
function switchTool(client, reverse) {
    const hold = client.pony.options.hold || 0;
    const index = entities_1.tools.findIndex(t => t.type === hold);
    const unholdIndex = reverse ? 0 : entities_1.tools.length - 1;
    if (index === unholdIndex) {
        unholdItem(client.pony);
    }
    else {
        const newIndex = reverse ? (index === -1 ? entities_1.tools.length - 1 : index - 1) : ((index + 1) % entities_1.tools.length);
        const tool = entities_1.tools[newIndex];
        holdItem(client.pony, tool.type);
        chat_1.saySystem(client, tool.text);
    }
}
exports.switchTool = switchTool;
function teleportTo(client, x, y) {
    entityUtils_1.fixPosition(client.pony, client.map, x, y, true);
    client.safeX = client.pony.x;
    client.safeY = client.pony.y;
    client.lastTime = 0;
}
exports.teleportTo = teleportTo;
//# sourceMappingURL=playerUtils.js.map