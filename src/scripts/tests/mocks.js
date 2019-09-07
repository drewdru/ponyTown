"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const mongoose_1 = require("mongoose");
const sinon_1 = require("sinon");
const clientActions_1 = require("../client/clientActions");
const interfaces_1 = require("../common/interfaces");
const serverMap_1 = require("../server/serverMap");
const camera_1 = require("../common/camera");
const worldMap_1 = require("../common/worldMap");
const mixins_1 = require("../common/mixins");
const ag_sockets_1 = require("ag-sockets");
const constants_1 = require("../common/constants");
function auth(item) {
    return item;
}
exports.auth = auth;
function account(item) {
    return item;
}
exports.account = account;
function character(item) {
    return item;
}
exports.character = character;
function mock(ctor, fields = {}) {
    const object = {};
    const prototype = ctor.prototype;
    Object.getOwnPropertyNames(prototype)
        .filter(key => !Object.getOwnPropertyDescriptor(prototype, key).get && typeof prototype[key] === 'function')
        .forEach(key => object[key] = function () { });
    return Object.assign(object, fields);
}
exports.mock = mock;
function entity(id, x = 0, y = 0, type = 0, more = {}) {
    return Object.assign({ id, x, y, z: 0, vx: 0, vy: 0, type, order: 0, state: 0, playerState: 0, flags: 0, timestamp: 0, options: {} }, more);
}
exports.entity = entity;
function serverEntity(id, x = 0, y = 0, type = 0, more = {}) {
    return Object.assign({ id, x, y, z: 0, vx: 0, vy: 0, type, order: 0, state: 0, playerState: 0, flags: 0, timestamp: 0, options: {} }, more);
}
exports.serverEntity = serverEntity;
function clientPony() {
    return mockClient().pony;
}
exports.clientPony = clientPony;
let id = 1;
let ponyId = 1;
function genId() {
    return (++id).toString(16).padStart(24, '0');
}
exports.genId = genId;
function genObjectId() {
    return mongoose_1.Types.ObjectId(genId());
}
exports.genObjectId = genObjectId;
function mockClient(fields = {}) {
    const pony = entity(++ponyId, 0, 0, constants_1.PONY_TYPE);
    const accountId = genId();
    const characterId = genId();
    pony.options = {};
    const partial = Object.assign({ accountId,
        characterId, ignores: new Set(), hides: new Set(), permaHides: new Set(), friends: new Set(), accountSettings: {}, originalRequest: { headers: {} }, account: { id: accountId, _id: mongoose_1.Types.ObjectId(accountId), ignores: [] }, character: { id: characterId, _id: mongoose_1.Types.ObjectId(characterId) }, isMod: false, pony, map: serverMap_1.createServerMap('', 0, 1, 1), notifications: [], regions: [], updateQueue: ag_sockets_1.createBinaryWriter(128), regionUpdates: [], unsubscribes: [], subscribes: [], saysQueue: [], lastSays: [], lastAction: 0, lastBoopAction: 0, lastExpressionAction: 0, viewWidth: 3, viewHeight: 3, screenSize: { width: 20, height: 20 }, reporter: mockReporter(), camera: camera_1.createCamera(), reportInviteLimit() { },
        disconnect() { } }, fields);
    const client = mock(clientActions_1.ClientActions, partial);
    client.pony.client = client;
    return client;
}
exports.mockClient = mockClient;
function mockReporter() {
    return {
        info() { },
        warn() { },
        warnLog() { },
        danger() { },
        error() { },
        system() { },
        systemLog() { },
        setPony() { },
    };
}
exports.mockReporter = mockReporter;
function mockSubject() {
    const values = [];
    return {
        values,
        next(value) {
            values.push(value);
        },
    };
}
exports.mockSubject = mockSubject;
function createStubFromInstance(instance) {
    return lodash_1.mapValues(instance, () => sinon_1.stub());
}
exports.createStubFromInstance = createStubFromInstance;
function setupCollider(map, x, y) {
    const entity = serverEntity(0, x, y, 0);
    mixins_1.mixColliderRect(-16, -12, 32, 24)(entity, {}, interfaces_1.defaultWorldState);
    worldMap_1.getRegionGlobal(map, x, y).colliders.push(entity);
}
exports.setupCollider = setupCollider;
//# sourceMappingURL=mocks.js.map