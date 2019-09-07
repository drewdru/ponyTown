"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const browser_1 = require("ag-sockets/dist/browser");
const utf8_1 = require("ag-sockets/dist/utf8");
const constants_1 = require("../constants");
function writeVelocity(writer, value) {
    if (value >= constants_1.MAX_VELOCITY || value <= -constants_1.MAX_VELOCITY) {
        throw new Error(`Exceeded max velocity (${value})`);
    }
    browser_1.writeInt16(writer, (value * 0x8000) / constants_1.MAX_VELOCITY);
}
exports.writeVelocity = writeVelocity;
function readVelocity(reader) {
    return (browser_1.readInt16(reader) * constants_1.MAX_VELOCITY) / 0x8000;
}
exports.readVelocity = readVelocity;
function writeCoordX(writer, value) {
    browser_1.writeInt16(writer, (value * constants_1.tileWidth) | 0);
}
exports.writeCoordX = writeCoordX;
function writeCoordY(writer, value) {
    browser_1.writeInt16(writer, (value * constants_1.tileHeight) | 0);
}
exports.writeCoordY = writeCoordY;
function readCoordX(reader) {
    return browser_1.readInt16(reader) / constants_1.tileWidth;
}
exports.readCoordX = readCoordX;
function readCoordY(reader) {
    return browser_1.readInt16(reader) / constants_1.tileHeight;
}
exports.readCoordY = readCoordY;
function emptyUpdate(id) {
    return {
        id,
        x: undefined,
        y: undefined,
        vx: 0,
        vy: 0,
        state: undefined,
        expression: undefined,
        type: undefined,
        options: undefined,
        crc: undefined,
        name: undefined,
        filterName: false,
        info: undefined,
        action: undefined,
        switchRegion: false,
        playerState: undefined,
    };
}
exports.emptyUpdate = emptyUpdate;
function decodeUpdate(data) {
    const reader = browser_1.createBinaryReader(data);
    const x = browser_1.readUint16(reader);
    const y = browser_1.readUint16(reader);
    const updates = [];
    let update;
    while (update = readOneUpdate(reader)) {
        updates.push(update);
    }
    const removesLength = browser_1.readLength(reader);
    const removes = [];
    for (let i = 0; i < removesLength; i++) {
        removes.push(browser_1.readUint32(reader));
    }
    const tilesLength = browser_1.readLength(reader);
    const tiles = [];
    for (let i = 0; i < tilesLength; i++) {
        tiles.push({
            x: browser_1.readUint8(reader),
            y: browser_1.readUint8(reader),
            type: browser_1.readUint8(reader),
        });
    }
    const tileData = browser_1.readUint8Array(reader);
    return { x, y, updates, removes, tiles, tileData };
}
exports.decodeUpdate = decodeUpdate;
function readOneUpdate(reader) {
    if (reader.offset >= reader.view.byteLength)
        return undefined;
    const flags = browser_1.readUint16(reader);
    if (flags === 0) {
        return undefined;
    }
    const id = browser_1.readUint32(reader);
    const update = emptyUpdate(id);
    update.switchRegion = (flags & 2048 /* SwitchRegion */) !== 0;
    if ((flags & 1 /* Position */) !== 0) {
        update.x = readCoordX(reader);
        update.y = readCoordY(reader);
    }
    if ((flags & 2 /* Velocity */) !== 0) {
        update.vx = readVelocity(reader);
        update.vy = readVelocity(reader);
    }
    if ((flags & 4 /* State */) !== 0) {
        update.state = browser_1.readUint8(reader);
    }
    if ((flags & 8 /* Expression */) !== 0) {
        update.expression = browser_1.readUint32(reader);
    }
    if ((flags & 16 /* Type */) !== 0) {
        update.type = browser_1.readUint16(reader);
    }
    if ((flags & 32 /* Options */) !== 0) {
        update.options = browser_1.readObject(reader);
    }
    if ((flags & 64 /* Info */) !== 0) {
        update.crc = browser_1.readUint16(reader);
        update.info = browser_1.readUint8Array(reader);
    }
    if ((flags & 128 /* Action */) !== 0) {
        update.action = browser_1.readUint8(reader);
    }
    if ((flags & 256 /* Name */) !== 0) {
        update.name = utf8_1.decodeString(browser_1.readUint8Array(reader)) || undefined;
        update.filterName = (flags & 512 /* NameBad */) !== 0;
    }
    if ((flags & 1024 /* PlayerState */) !== 0) {
        update.playerState = browser_1.readUint8(reader);
    }
    return update;
}
exports.readOneUpdate = readOneUpdate;
//# sourceMappingURL=updateDecoder.js.map