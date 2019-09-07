"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const utils_1 = require("./utils");
const positionUtils_1 = require("./positionUtils");
const rect_1 = require("./rect");
const DIRS = [
    [0, -1],
    [0.5, -1],
    [1, -1],
    [1, -0.5],
    [1, 0],
    [1, 0.5],
    [1, 1],
    [0.5, 1],
    [0, 1],
    [-0.5, 1],
    [-1, 1],
    [-1, 0.5],
    [-1, 0],
    [-1, -0.5],
    [-1, -1],
    [-0.5, -1],
];
const SECA = 0xcd3003ca;
const SECB = 0x5b903a62;
const SECC = 0x1c267e56;
const SECD = 0x1921ba6f;
const SECE = 0x0000bc0e;
const PI2 = Math.PI * 2;
const DIRS_ANGLE = DIRS.length / PI2;
function flagsToSpeed(flags) {
    const state = flags & 240 /* PonyStateMask */;
    if (state === 32 /* PonyTrotting */) {
        return constants_1.PONY_SPEED_TROT;
    }
    else if (state === 16 /* PonyWalking */) {
        return constants_1.PONY_SPEED_WALK;
    }
    else {
        return 0;
    }
}
exports.flagsToSpeed = flagsToSpeed;
function dirToVector(dir) {
    const [x, y] = DIRS[(dir | 0) % DIRS.length];
    return { x, y };
}
exports.dirToVector = dirToVector;
function vectorToDir(x, y) {
    const angle = Math.atan2(x, -y);
    return Math.round((angle < 0 ? angle + PI2 : angle) * DIRS_ANGLE) % DIRS.length;
}
exports.vectorToDir = vectorToDir;
exports.POSITION_MIN = 0;
exports.POSITION_MAX = 100000;
function encodeMovement(x, y, dir, flags, time, camera) {
    const pixelX = Math.floor(utils_1.clamp(x, exports.POSITION_MIN, exports.POSITION_MAX) * constants_1.tileWidth);
    const pixelY = Math.floor(utils_1.clamp(y, exports.POSITION_MIN, exports.POSITION_MAX) * constants_1.tileHeight);
    const camX = ((pixelX - camera.x) & 0xfff) >>> 0;
    const camY = ((pixelY - camera.y) & 0xfff) >>> 0;
    const camW = (camera.w & 0xfff) >>> 0;
    const camH = (camera.h & 0xfff) >>> 0;
    const a = pixelX | ((dir & 0xff) << 24);
    const b = pixelY | ((flags & 0xff) << 24);
    const c = time;
    const d = (camX << 20) | (camY << 8) | (camW >>> 4);
    const e = ((camW & 0xf) << 12) | camH;
    return [
        (a ^ SECA) >>> 0,
        (b ^ SECB) >>> 0,
        (c ^ SECC) >>> 0,
        (d ^ SECD) >>> 0,
        (e ^ SECE) >>> 0,
    ];
}
exports.encodeMovement = encodeMovement;
function decodeMovement(a, b, c, d, e) {
    a = (a >>> 0) ^ SECA;
    b = (b >>> 0) ^ SECB;
    c = (c >>> 0) ^ SECC;
    d = (d >>> 0) ^ SECD;
    e = (e >>> 0) ^ SECE;
    const pixelX = a & 0xffffff;
    const pixelY = b & 0xffffff;
    const x = positionUtils_1.toWorldX(pixelX + 0.5);
    const y = positionUtils_1.toWorldY(pixelY + 0.5);
    const dir = (a >>> 24) & 0xff;
    const flags = (b >>> 24) & 0xff;
    const time = c;
    const camX = pixelX - ((d >>> 20) & 0xfff);
    const camY = pixelY - ((d >>> 8) & 0xfff);
    const camW = ((d & 0xff) << 4) | ((e >>> 12) & 0xf);
    const camH = e & 0xfff;
    return { x, y, dir, flags, time, camera: rect_1.rect(camX, camY, camW, camH) };
}
exports.decodeMovement = decodeMovement;
function isMovingRight(vx, right) {
    return vx < 0 ? false : (vx > 0 ? true : right);
}
exports.isMovingRight = isMovingRight;
function shouldBeFacingRight(entity) {
    return isMovingRight(entity.vx, utils_1.hasFlag(entity.state, 2 /* FacingRight */));
}
exports.shouldBeFacingRight = shouldBeFacingRight;
//# sourceMappingURL=movementUtils.js.map