"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ag_sockets_1 = require("ag-sockets");
const interfaces_1 = require("../common/interfaces");
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const adminUtils_1 = require("../common/adminUtils");
const entities = require("../common/entities");
const accountUtils_1 = require("./accountUtils");
const notification_1 = require("./services/notification");
const party_1 = require("./services/party");
const world_1 = require("./world");
const hiding_1 = require("./services/hiding");
const playerUtils_1 = require("./playerUtils");
const account_1 = require("./api/account");
const counter_1 = require("./services/counter");
const expressionEncoder_1 = require("../common/encoders/expressionEncoder");
const entityUtils_1 = require("./entityUtils");
const supporterInvites_1 = require("./services/supporterInvites");
const logger_1 = require("./logger");
const db_1 = require("./db");
const chat_1 = require("./chat");
const worldMap_1 = require("../common/worldMap");
const regionUtils_1 = require("./regionUtils");
const serverMap_1 = require("./serverMap");
const friends_1 = require("./services/friends");
const camera_1 = require("../common/camera");
const characterUtils_1 = require("./characterUtils");
const collision_1 = require("../common/collision");
const entities_1 = require("../common/entities");
const ponyInfo_1 = require("../common/ponyInfo");
const modActionNames = ['None', 'Report', 'Mute', 'Shadow', 'Kick', 'Ban'];
const playerActionNames = [
    'None',
    'Ignore',
    'Unignore',
    'InviteToParty',
    'RemoveFromParty',
    'PromotePartyLeader',
    'HidePlayer',
    'InviteToSupporterServers',
    'AddFriend',
    'RemoveFriend',
];
const editorAdded = new Map();
const debugRate = DEVELOPMENT ? '1000/s' : '';
let ServerActions = class ServerActions {
    constructor(client, world, notificationService, partyService, supporterInvites, getSettings, server, chatSay, moveFunc, hiding, states, accountService, ignorePlayer, findClientByEntityId, friends) {
        this.client = client;
        this.world = world;
        this.notificationService = notificationService;
        this.partyService = partyService;
        this.supporterInvites = supporterInvites;
        this.getSettings = getSettings;
        this.server = server;
        this.chatSay = chatSay;
        this.moveFunc = moveFunc;
        this.hiding = hiding;
        this.states = states;
        this.accountService = accountService;
        this.ignorePlayer = ignorePlayer;
        this.findClientByEntityId = findClientByEntityId;
        this.friends = friends;
    }
    get account() {
        return this.client.account;
    }
    get pony() {
        return this.client.pony;
    }
    get map() {
        return this.client.map;
    }
    connected() {
        this.client.connectedTime = Date.now();
        this.client.lastPacket = Date.now();
        this.client.loading = true;
        this.client.reporter.systemLog(`joined [${this.server.id}] as "${this.client.characterName}" [${this.client.ip}]`);
        if (DEVELOPMENT && /slow/.test(this.client.characterName)) {
            setTimeout(() => this.world.joinClientToQueue(this.client), 5000);
        }
        else {
            this.world.joinClientToQueue(this.client);
        }
    }
    async disconnected() {
        const state = playerUtils_1.createCharacterState(this.pony, this.client.map);
        const duration = Date.now() - this.client.connectedTime;
        const leaveReason = this.client.leaveReason || 'disconnected';
        if (this.client.logDisconnect) {
            logger_1.logger.warn(`disconnected (${leaveReason}) account: ${this.client.account.name} [${this.client.accountId}]`);
        }
        this.client.offline = true;
        this.client.offlineAt = new Date();
        this.client.reporter.systemLog(`left [${this.server.id}] (${leaveReason}) (${utils_1.formatDuration(duration)})`);
        this.world.leaveClient(this.client);
        this.partyService.clientDisconnected(this.client);
        this.friends.clientDisconnected(this.client);
        this.states.add(this.client.characterId, state);
        await Promise.all([
            this.accountService.updateAccount(this.client.accountId, { lastVisit: new Date(), state: this.account.state }),
            this.accountService.updateCharacterState(this.client.characterId, state),
        ]);
    }
    say(entityId, text, chatType) {
        validateNumber(entityId, 'entityId');
        validateString(text, 'text');
        validateNumber(chatType, 'chatType');
        this.updateLastAction();
        if (this.client.isSwitchingMap)
            return;
        const target = entityId ? this.world.getEntityById(entityId) : undefined;
        this.chatSay(this.client, text, chatType, target && target.client, this.getSettings());
    }
    select(entityId, flags) {
        validateNumber(entityId, 'entityId');
        this.updateLastAction();
        if (this.client.isSwitchingMap)
            return;
        const entity = entityId === 0 ? undefined : (this.world.getEntityById(entityId) || this.getEntityFromClients(entityId));
        const mod = this.client.isMod;
        this.client.selected = entity;
        if (entity && entity.client && entity !== this.client.pony) {
            if (flags) {
                const baseOptions = mod ? { modInfo: accountUtils_1.getModInfo(entity.client) } : {};
                const options = Object.assign({}, baseOptions, entity.extraOptions);
                if (utils_1.hasFlag(flags, 2 /* FetchInfo */)) {
                    const playerState = playerUtils_1.getPlayerState(this.client, entity);
                    const flags = 32 /* Options */ | 256 /* Name */ | 64 /* Info */ | 1024 /* PlayerState */;
                    entityUtils_1.pushUpdateEntityToClient(this.client, { entity, flags, options, playerState });
                }
                else if (utils_1.hasFlag(flags, 1 /* FetchEx */) || mod) {
                    entityUtils_1.pushUpdateEntityToClient(this.client, { entity, flags: 32 /* Options */, options });
                }
            }
        }
        else if (entityId) {
            this.client.updateSelection(entityId, 0);
        }
    }
    interact(entityId) {
        validateNumber(entityId, 'entityId');
        this.updateLastAction();
        if (this.client.isSwitchingMap)
            return;
        playerUtils_1.interactWith(this.client, this.world.getEntityById(entityId));
    }
    use() {
        this.updateLastAction();
        if (this.client.isSwitchingMap)
            return;
        playerUtils_1.useHeldItem(this.client);
    }
    action(action) {
        validateNumber(action, 'action');
        this.updateLastAction();
        switch (action) {
            case 21 /* KeepAlive */:
                break;
            case 9 /* UnhideAllHiddenPlayers */:
                this.hiding.requestUnhideAll(this.client);
                break;
            default:
                if (this.client.isSwitchingMap)
                    return;
                playerUtils_1.execAction(this.client, action, this.getSettings());
                break;
        }
    }
    actionParam(action, param) {
        validateNumber(action, 'action');
        switch (action) {
            case 19 /* CancelSupporterInvite */:
                validateString(param, 'param');
                // TODO: ...
                break;
            case 11 /* SwapCharacter */: {
                validateString(param, 'param');
                this.updateLastAction();
                if (param !== this.client.characterId) {
                    characterUtils_1.swapCharacter(this.client, this.world, { account: this.client.account._id, _id: param })
                        .catch(e => this.client.reporter.error(e));
                }
                break;
            }
            case 22 /* RemoveFriend */: {
                validateString(param, 'param');
                this.updateLastAction();
                const target = world_1.findClientByAccountId(this.world, param);
                if (target) {
                    this.friends.remove(this.client, target);
                }
                else {
                    this.friends.removeByAccountId(this.client, param);
                }
                break;
            }
            case 23 /* FriendsCRC */: {
                validateNumber(param, 'param');
                const crc = param >>> 0;
                if (this.client.friendsCRC === undefined) {
                    this.client.friendsCRC = utils_1.computeFriendsCRC(Array.from(this.client.friends.values()));
                }
                if (this.client.friendsCRC !== crc) {
                    db_1.findFriends(this.client.accountId, true)
                        .then(friends => {
                        this.client.updateFriends(friends.map(f => {
                            const client = world_1.findClientByAccountId(this.world, f.accountId);
                            return {
                                accountId: f.accountId,
                                accountName: f.accountName,
                                entityId: client && client.pony.id,
                                status: client ? 1 /* Online */ : 0 /* None */,
                                name: f.name,
                                nameBad: f.nameBad,
                                info: f.pony,
                            };
                        }), true);
                    })
                        .catch(e => logger_1.logger.error(e));
                }
                break;
            }
            case 27 /* RemoveEntity */: {
                validateNumber(param, 'param');
                this.updateLastAction();
                const entity = this.world.getEntityById(param | 0);
                if (entity && utils_1.hasFlag(entity.state, 8 /* Editable */) && this.pony.options.hold === entities.broom.type &&
                    this.map.regions.some(r => utils_1.includes(r.entities, entity))) {
                    if (this.isHouseLocked()) {
                        chat_1.saySystem(this.client, `House is locked`);
                    }
                    else {
                        this.world.removeEntity(entity, this.map);
                    }
                }
                break;
            }
            case 28 /* PlaceEntity */: {
                if (!param || typeof param !== 'object' || typeof param.x !== 'number' || typeof param.y !== 'number' ||
                    typeof param.type !== 'number') {
                    return;
                }
                this.updateLastAction();
                const { x, y, type } = param;
                if (collision_1.isOutsideMap(x, y, this.map) ||
                    !entities.placeableEntities.some(x => x.type === type) ||
                    !utils_1.hasFlag(this.map.flags, 2 /* EditableEntities */)) {
                    return chat_1.saySystem(this.client, `Cannot place object`);
                }
                if (this.isHouseLocked()) {
                    return chat_1.saySystem(this.client, `House is locked`);
                }
                let totalEditableEntities = 0;
                for (const region of this.map.regions) {
                    for (const entity of region.entities) {
                        if (utils_1.hasFlag(entity.state, 8 /* Editable */)) {
                            totalEditableEntities++;
                        }
                    }
                }
                if (totalEditableEntities >= this.map.editableEntityLimit) {
                    return chat_1.saySystem(this.client, `Object limit reached`);
                }
                const entity = entities_1.createAnEntity(type, 0, x, y, {}, ponyInfo_1.mockPaletteManager, this.world);
                entity.state |= 8 /* Editable */;
                this.world.addEntity(entity, this.map);
                break;
            }
            default:
                throw new Error(`Invalid Action (${action})`);
        }
    }
    actionParam2(action, param) {
        validateNumber(action, 'action');
        switch (action) {
            case 20 /* Info */:
                validateNumber(param, 'param');
                this.client.incognito = utils_1.hasFlag(param, 1 /* Incognito */);
                this.client.supportsWasm = utils_1.hasFlag(param, 2 /* SupportsWASM */);
                this.client.supportsLetAndConst = utils_1.hasFlag(param, 4 /* SupportsLetAndConst */);
                break;
            case 24 /* RequestEntityInfo */: {
                validateNumber(param, 'param');
                const entity = this.world.getEntityById(param | 0);
                if (entity && entity.client) {
                    this.client.entityInfo(entity.id, entity.name || '', entity.crc || 0, !!entity.nameBad);
                }
                break;
            }
            default:
                throw new Error(`Invalid Action (${action})`);
        }
    }
    async getInvites() {
        return [
            { id: 'a', info: constants_1.OFFLINE_PONY, name: 'Offline Pony', active: true },
            { id: 'b', info: constants_1.OFFLINE_PONY, name: 'Fuzzy', active: true },
            { id: 'c', info: constants_1.OFFLINE_PONY, name: 'Molly', active: false },
        ];
    }
    expression(expression) {
        validateNumber(expression, 'expression');
        this.updateLastAction();
        const expr = expressionEncoder_1.decodeExpression(expression);
        const cancellable = !!expr && expressionEncoder_1.isCancellableExpression(expr);
        if (cancellable) {
            playerUtils_1.setEntityExpression(this.pony, expr, 0, true);
        }
        else {
            this.pony.exprPermanent = expr;
            playerUtils_1.setEntityExpression(this.pony, undefined, 0);
        }
    }
    playerAction(entityId, action, param) {
        validateNumber(entityId, 'entityId');
        validateNumber(action, 'action');
        this.updateLastAction();
        const target = this.getClientByEntityId(entityId);
        if (!target) {
            this.client.reporter.warnLog(`No client for: ${playerActionNames[action]} [${action}], id: ${entityId}`);
            return;
        }
        switch (action) {
            case 1 /* Ignore */:
            case 2 /* Unignore */:
                this.ignorePlayer(this.client, target, action === 1 /* Ignore */);
                break;
            case 3 /* InviteToParty */:
                this.partyService.invite(this.client, target);
                break;
            case 4 /* RemoveFromParty */:
                this.partyService.remove(this.client, target);
                break;
            case 5 /* PromotePartyLeader */:
                this.partyService.promoteLeader(this.client, target);
                break;
            case 6 /* HidePlayer */:
                const hideFor = utils_1.toInt(param);
                if (hideFor === 0) {
                    this.hiding.requestHide(this.client, target, 0);
                }
                else {
                    this.hiding.requestHide(this.client, target, utils_1.clamp(hideFor, constants_1.MIN_HIDE_TIME, constants_1.MAX_HIDE_TIME));
                }
                break;
            case 7 /* InviteToSupporterServers */:
                this.supporterInvites.requestInvite(this.client, target);
                break;
            case 8 /* AddFriend */:
                this.friends.add(this.client, target);
                break;
            case 9 /* RemoveFriend */:
                this.friends.remove(this.client, target);
                break;
            default:
                throw new Error(`Invalid player action (${playerActionNames[action]}) [${action}]`);
        }
    }
    leaveParty() {
        this.updateLastAction();
        if (this.client.isSwitchingMap)
            return;
        if (this.client.party) {
            this.partyService.remove(this.client.party.leader, this.client);
        }
    }
    async otherAction(entityId, action, param) {
        validateNumber(entityId, 'entityId');
        validateNumber(action, 'action');
        validateNumber(param, 'param');
        this.updateLastAction();
        const target = this.getClientForModAction(entityId, modActionNames[action]);
        switch (action) {
            case 1 /* Report */:
                await this.logModAction(target, 'Reported');
                break;
            case 2 /* Mute */:
                await this.setBan(target, 'mute', param);
                break;
            case 3 /* Shadow */:
                await this.setBan(target, 'shadow', param);
                break;
            case 5 /* Ban */:
                await this.setBan(target, 'ban', -1);
                break;
            case 4 /* Kick */:
                await this.world.kick(target, 'mod kick');
                break;
            default:
                throw new Error(`Invalid mod action (${action})`);
        }
    }
    setBan(target, field, value) {
        const timeout = value > 0 ? Date.now() + value : value;
        this.logModAction(target, adminUtils_1.banMessage(field, timeout));
        return this.accountService.update(target.accountId, { [field]: timeout });
    }
    async setNote(entityId, text) {
        validateNumber(entityId, 'entityId');
        validateString(text, 'text', true);
        this.updateLastAction();
        const client = this.getClientForModAction(entityId, 'setNote');
        await this.accountService.update(client.accountId, { note: text });
    }
    async saveSettings(settings) {
        this.updateLastAction();
        const wasHidden = !!this.client.accountSettings.hidden;
        await this.accountService.updateSettings(this.account, settings);
        this.client.accountSettings = Object.assign({}, this.account.settings);
        this.client.reporter.systemLog(`Saved settings`);
        const isHidden = !!this.client.accountSettings.hidden;
        if (wasHidden !== isHidden) {
            for (const friend of world_1.findAllOnlineFriends(this.world, this.client)) {
                if (isHidden) {
                    friend.updateFriends([{ accountId: this.client.accountId, status: 0 /* None */ }], false);
                }
                else {
                    friend.updateFriends([friends_1.toFriendOnline(this.client)], false);
                }
                playerUtils_1.updateEntityPlayerState(friend, this.client.pony);
            }
        }
    }
    acceptNotification(id) {
        validateNumber(id, 'id');
        this.updateLastAction();
        this.notificationService.acceptNotification(this.client, id);
    }
    rejectNotification(id) {
        validateNumber(id, 'id');
        this.updateLastAction();
        this.notificationService.rejectNotification(this.client, id);
    }
    getPonies(ids) {
        const party = this.client.party;
        const createPonyData = ({ pony }) => {
            return [
                pony.id,
                pony.options,
                pony.encodedName,
                pony.encryptedInfoSafe,
                playerUtils_1.getPlayerState(this.client, pony),
                !!pony.nameBad,
            ];
        };
        if (party && ids && ids.length && ids.length <= constants_1.PARTY_LIMIT) {
            const ponies = party.clients
                .filter(c => utils_1.includes(ids, c.pony.id))
                .map(createPonyData);
            this.client.updatePonies(ponies);
        }
    }
    loaded() {
        this.client.loading = false;
    }
    fixedPosition() {
        this.client.fixingPosition = false;
    }
    updateCamera(x, y, width, height) {
        validateNumber(x, 'x');
        validateNumber(y, 'y');
        validateNumber(width, 'width');
        validateNumber(height, 'height');
        this.updateLastAction();
        camera_1.setupCamera(this.client.camera, x, y, width, height, this.client.map);
    }
    move(a, b, c, d, e) {
        validateNumber(a, 'a');
        validateNumber(b, 'b');
        validateNumber(c, 'c');
        validateNumber(d, 'd');
        validateNumber(e, 'e');
        this.updateLastAction();
        this.moveFunc(this.client, Date.now(), a, b, c, d, e, this.getSettings());
    }
    isHouseLocked() {
        return this.map.editingLocked && this.client.party && this.client.party.leader !== this.client;
    }
    changeTile(x, y, type) {
        validateNumber(x, 'x');
        validateNumber(y, 'y');
        validateNumber(type, 'type');
        this.updateLastAction();
        if (this.client.isSwitchingMap)
            return;
        const wallTile = type === 100 /* WallH */ || type === 101 /* WallV */;
        if (utils_1.hasFlag(this.map.flags, 1 /* EditableWalls */) && wallTile) {
            if (this.isHouseLocked()) {
                chat_1.saySystem(this.client, `House is locked`);
            }
            else {
                this.world.toggleWall(this.map, x, y, type);
            }
        }
        else if (BETA && this.client.isMod && wallTile) {
            this.world.toggleWall(this.map, x, y, type);
        }
        else if (utils_1.hasFlag(this.map.flags, 4 /* EditableTiles */) && this.pony.options.hold === entities.shovel.type) {
            if (!interfaces_1.houseTiles.some(t => t.type === type))
                return;
            if (this.isHouseLocked())
                return chat_1.saySystem(this.client, `House is locked`);
            this.world.setTile(this.map, x, y, type);
        }
        else if (BETA && this.client.isMod && interfaces_1.isValidModTile(type)) {
            this.world.setTile(this.map, x, y, type);
        }
        else if (interfaces_1.isValidTile(type)) {
            if ((BETA || utils_1.distanceXY(x, y, this.pony.x, this.pony.y) < constants_1.TILE_CHANGE_RANGE)) {
                const tile = worldMap_1.getTile(this.map, x, y);
                if (tile === 1 /* Dirt */ || tile === 2 /* Grass */) {
                    if (this.client.shadowed) {
                        entityUtils_1.pushUpdateTileToClient(this.client, x, y, type);
                    }
                    else {
                        this.world.setTile(this.map, x, y, type);
                    }
                }
            }
        }
    }
    leave() {
        this.client.leaveReason = 'leave';
        this.client.left(0 /* None */);
    }
    editorAction(action) {
        if (this.server.flags.editor && this.client.isMod) {
            const added = editorAdded.get(this.client.accountId) || [];
            editorAdded.set(this.client.accountId, added);
            switch (action.type) {
                case 'place':
                    if (utils_1.includes(account_1.allEntities, action.entity)) {
                        const name = action.entity;
                        const entity = entities[name](action.x, action.y);
                        const toAdd = Array.isArray(entity) ? entity : [entity];
                        toAdd.forEach(e => this.world.addEntity(e, this.map));
                        added.push({ name, entities: toAdd });
                    }
                    else {
                        chat_1.saySystem(this.client, 'Invalid entity');
                    }
                    break;
                case 'move':
                    for (const { id, x, y } of action.entities) {
                        const entity = this.world.getEntityById(id);
                        if (entity && entity.type !== constants_1.PONY_TYPE) {
                            entity.x = x;
                            entity.y = y;
                            entityUtils_1.updateEntity(entity, false);
                            regionUtils_1.updateRegion(entity, this.client.map);
                            regionUtils_1.getExpectedRegion(entity, this.client.map).colliderDirty = true;
                        }
                    }
                    break;
                case 'undo':
                    const remove = added.pop();
                    remove && remove.entities.forEach(e => this.world.removeEntityFromSomeMap(e));
                    break;
                case 'clear':
                    added.forEach(x => x.entities.forEach(e => this.world.removeEntityFromSomeMap(e)));
                    added.length = 0;
                    break;
                case 'list':
                    const existingEntities = added
                        .filter(({ entities }) => entities.some(e => !!this.world.getEntityById(e.id)))
                        .map(({ name, entities: [{ x, y }] }) => ({ name, x, y }));
                    this.client.entityList(existingEntities);
                    break;
                case 'remove':
                    for (const id of action.entities) {
                        const entity = this.world.getEntityById(id);
                        if (entity && entity.type !== constants_1.PONY_TYPE) {
                            this.world.removeEntityFromSomeMap(entity);
                        }
                    }
                    break;
                case 'tile': {
                    const { x, y, tile, size } = action;
                    if (interfaces_1.isValidModTile(tile)) {
                        for (let iy = 0; iy < size; iy++) {
                            for (let ix = 0; ix < size; ix++) {
                                this.world.setTile(this.map, x + ix, y + iy, tile);
                            }
                        }
                    }
                    break;
                }
                case 'party': {
                    const entities = serverMap_1.findEntities(this.map, e => !!e.client && /^debug/.test(e.name || ''));
                    for (const e of entities.slice(0, constants_1.PARTY_LIMIT - 1)) {
                        this.partyService.invite(this.client, e.client);
                    }
                    break;
                }
                default:
                    throw new Error(`Invalid editor action (${action})`);
            }
        }
    }
    logModAction(client, title) {
        client.reporter.system(`${title} by ${this.account.name}`);
    }
    getClientForModAction(entityId, action) {
        if (!this.client.isMod) {
            this.client.disconnect(true, true);
            throw new Error(`Action not allowed (${action})`);
        }
        const client = this.world.getClientByEntityId(entityId);
        if (!client) {
            throw new Error(`Client does not exist (${action})`);
        }
        if (client.accountId === this.client.accountId) {
            throw new Error(`Cannot perform action on self (${action})`);
        }
        return client;
    }
    getEntityFromClients(entityId) {
        const client = this.getClientByEntityId(entityId);
        return client && client.pony;
    }
    getClientByEntityId(entityId) {
        return this.world.getClientByEntityId(entityId) || this.findClientByEntityId(this.client, entityId);
    }
    updateLastAction() {
        this.client.lastPacket = Date.now();
    }
};
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '2/s', binary: [ag_sockets_1.Bin.U32, ag_sockets_1.Bin.Str, ag_sockets_1.Bin.U8] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, String, Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "say", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '3/s', binary: [ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U8] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "select", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '2/s', serverRateLimit: '4/s', binary: [ag_sockets_1.Bin.U32] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "interact", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '2/s', binary: [] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "use", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '3/s', serverRateLimit: '8/s', binary: [ag_sockets_1.Bin.U8] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "action", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '2/s', serverRateLimit: '4/s', binary: [ag_sockets_1.Bin.U8, ag_sockets_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "actionParam", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '10/s', serverRateLimit: '20/s', binary: [ag_sockets_1.Bin.U8, ag_sockets_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "actionParam2", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true, rateLimit: '1/s', binary: [] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], ServerActions.prototype, "getInvites", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '2/s', serverRateLimit: '4/s', binary: [ag_sockets_1.Bin.U32] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "expression", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '3/s', binary: [ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U8, ag_sockets_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "playerAction", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '1/s', binary: [] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "leaveParty", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true, rateLimit: '10/s', binary: [ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U8, ag_sockets_1.Bin.I32] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, Number]),
    tslib_1.__metadata("design:returntype", Promise)
], ServerActions.prototype, "otherAction", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ promise: true, binary: [ag_sockets_1.Bin.U32, ag_sockets_1.Bin.Str] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, String]),
    tslib_1.__metadata("design:returntype", Promise)
], ServerActions.prototype, "setNote", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '5/s', binary: [ag_sockets_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ServerActions.prototype, "saveSettings", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ binary: [ag_sockets_1.Bin.U16] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "acceptNotification", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ binary: [ag_sockets_1.Bin.U16] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "rejectNotification", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ binary: [[ag_sockets_1.Bin.U32]] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Array]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "getPonies", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ binary: [] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "loaded", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ binary: [] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "fixedPosition", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ binary: [ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U16, ag_sockets_1.Bin.U16] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, Number, Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "updateCamera", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ binary: [ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U32, ag_sockets_1.Bin.U16] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, Number, Number, Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "move", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: debugRate || '3/s', serverRateLimit: debugRate || '7/s', binary: [ag_sockets_1.Bin.U16, ag_sockets_1.Bin.U16, ag_sockets_1.Bin.U8] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Number, Number, Number]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "changeTile", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ rateLimit: '1/s', binary: [] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "leave", null);
tslib_1.__decorate([
    ag_sockets_1.Method({ binary: [ag_sockets_1.Bin.Obj] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", void 0)
], ServerActions.prototype, "editorAction", null);
ServerActions = tslib_1.__decorate([
    ag_sockets_1.Socket({
        id: 'game',
        debug: false,
        connectionTokens: true,
        pingInterval: 3000,
        connectionTimeout: 10000,
        reconnectTimeout: 500,
        transferLimit: 4000,
        perMessageDeflate: false,
        keepOriginalRequest: true,
    }),
    tslib_1.__metadata("design:paramtypes", [Object, world_1.World,
        notification_1.NotificationService,
        party_1.PartyService,
        supporterInvites_1.SupporterInvitesService, Function, Object, Function, Function, hiding_1.HidingService,
        counter_1.CounterService, Object, Function, Function, friends_1.FriendsService])
], ServerActions);
exports.ServerActions = ServerActions;
function validateNumber(value, fieldName) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        throw new Error(`Not a number (${fieldName})`);
    }
}
function validateString(value, fieldName, allowNull = false) {
    if (typeof value !== 'string' && !(allowNull && value === null)) {
        throw new Error(`Not a string (${fieldName})`);
    }
}
if (DEVELOPMENT) {
    /* istanbul ignore next */
    ag_sockets_1.getMethods(ServerActions)
        .forEach(m => m.options.binary || console.error(`Missing binary encoding for ServerActions.${m.name}()`));
}
//# sourceMappingURL=serverActions.js.map