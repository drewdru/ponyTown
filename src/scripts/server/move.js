"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const chalk_1 = require("chalk");
const movementUtils_1 = require("../common/movementUtils");
const entityUtils_1 = require("../common/entityUtils");
const camera_1 = require("../common/camera");
const logger_1 = require("./logger");
const utils_1 = require("../common/utils");
const playerUtils_1 = require("./playerUtils");
const positionUtils_1 = require("../common/positionUtils");
const constants_1 = require("../common/constants");
const entityUtils_2 = require("./entityUtils");
const collision_1 = require("../common/collision");
const teleportReportLimit = 10;
const maxLagLimitSeconds = 15;
const maxLagLimit = maxLagLimitSeconds * constants_1.SECOND;
exports.createMove = (teleportCounter) => (client, now, a, b, c, d, e, settings) => {
    if (client.loading || client.fixingPosition || client.isSwitchingMap)
        return;
    const connectionDuration = (now - client.connectedTime) >>> 0;
    const pony = client.pony;
    const { x, y, dir, flags, time, camera } = movementUtils_1.decodeMovement(a, b, c, d, e);
    const v = movementUtils_1.dirToVector(dir);
    const speed = movementUtils_1.flagsToSpeed(flags);
    if (checkOutsideMap(client, x, y))
        return;
    camera_1.setupCamera(client.camera, camera.x, camera.y, camera.w, camera.h, client.map);
    if (checkLagging(client, time, connectionDuration, settings))
        return;
    if (checkTeleporting(client, x, y, time, settings, teleportCounter))
        return;
    if (!collision_1.isStaticCollision(pony, client.map, true)) {
        client.safeX = pony.x;
        client.safeY = pony.y;
    }
    pony.x = x;
    pony.y = y;
    if (collision_1.isStaticCollision(pony, client.map)) {
        pony.x = client.safeX;
        pony.y = client.safeY;
        if (!collision_1.isStaticCollision(pony, client.map)) {
            if (settings.logFixingPosition) {
                client.reporter.systemLog(`Fixed colliding (${x} ${y}) -> (${pony.x} ${pony.y})`);
            }
            DEVELOPMENT && !TESTS && logger_1.logger.warn(`Fixing position due to collision`);
            entityUtils_2.fixPosition(pony, client.map, client.safeX, client.safeY, false);
        }
        else {
            pony.x = x;
            pony.y = y;
        }
    }
    pony.vx = v.x * speed;
    pony.vy = v.y * speed;
    let ponyState = pony.state || 0;
    const facingRight = utils_1.hasFlag(ponyState, 2 /* FacingRight */);
    const right = movementUtils_1.isMovingRight(pony.vx, facingRight);
    if (facingRight !== right) {
        ponyState = utils_1.setFlag(ponyState, 2 /* FacingRight */, right);
        ponyState = utils_1.setFlag(ponyState, 4 /* HeadTurned */, false);
    }
    if ((pony.vx || pony.vy) && (entityUtils_1.isSittingState(ponyState) || entityUtils_1.isLyingState(ponyState))) {
        ponyState = entityUtils_1.setPonyState(ponyState, 0 /* PonyStanding */);
    }
    pony.state = ponyState;
    entityUtils_2.updateEntity(pony, false);
    if (pony.exprCancellable) {
        playerUtils_1.setEntityExpression(pony, undefined);
    }
    pony.timestamp = now / 1000;
    client.lastX = pony.x;
    client.lastY = pony.y;
    client.lastTime = time;
    client.lastVX = pony.vx;
    client.lastVY = pony.vy;
};
function checkOutsideMap(client, x, y) {
    if (collision_1.isOutsideMap(x, y, client.map)) {
        const message = `map: [${client.map.id || 'main'}] coords: [${x.toFixed(2)}, ${y.toFixed(2)}]`;
        if (!client.shadowed) {
            client.reporter.warn(`Outside map`, message);
        }
        playerUtils_1.kickClient(client, `outside ${message}`);
        return true;
    }
    return false;
}
function checkLagging(client, time, connectionTime, settings) {
    const dt = time - connectionTime;
    const lagging = (dt > maxLagLimit) || (dt < -maxLagLimit);
    if (lagging) {
        if (settings.logLagging) {
            // logger.warn(`Time delta > ${maxLagLimitSeconds}s (${dt}) account: ${client.account.name} [${client.accountId}]`);
            client.reporter.systemLog(`Time delta > ${maxLagLimitSeconds}s (${dt})`);
            client.logDisconnect = true;
        }
        if (settings.kickLagging) {
            client.reporter.systemLog(`Lagging (dt: ${dt} time: ${time} connectionTime: ${connectionTime})`);
            playerUtils_1.kickClient(client, 'lagging');
            return true;
        }
    }
    return false;
}
function checkTeleporting(client, x, y, time, settings, counter) {
    if (!client.lastTime)
        return false;
    const pony = client.pony;
    const borderX = 0.5;
    const borderY = 0.5;
    const delta = ((time - client.lastTime) / 1000) * 1;
    const afterX = positionUtils_1.roundPositionX(client.lastX + client.lastVX * delta);
    const afterY = positionUtils_1.roundPositionY(client.lastY + client.lastVY * delta);
    const afterMinX = client.lastVX === 0 ? afterX - Math.abs(client.lastVY) : afterX;
    const afterMaxX = client.lastVX === 0 ? afterX + Math.abs(client.lastVY) : afterX;
    const afterMinY = client.lastVY === 0 ? afterY - Math.abs(client.lastVX) : afterY;
    const afterMaxY = client.lastVY === 0 ? afterY + Math.abs(client.lastVX) : afterY;
    const minX = Math.floor((Math.min(client.lastX, afterMinX) - borderX) * constants_1.tileWidth) / constants_1.tileWidth;
    const maxX = Math.ceil((Math.max(client.lastX, afterMaxX) + borderX) * constants_1.tileWidth) / constants_1.tileWidth;
    const minY = Math.floor((Math.min(client.lastY, afterMinY) - borderY) * constants_1.tileHeight) / constants_1.tileHeight;
    const maxY = Math.ceil((Math.max(client.lastY, afterMaxY) + borderY) * constants_1.tileHeight) / constants_1.tileHeight;
    const outX = x < minX || x > maxX;
    const outY = y < minY || y > maxY;
    if (outX || outY) {
        if (settings.logTeleporting) {
            const colX = outX ? chalk_1.default.red : chalk_1.default.reset;
            const colY = outY ? chalk_1.default.red : chalk_1.default.reset;
            logger_1.logger.log(`[${chalk_1.default.gray(moment().format('MMM DD HH:mm:ss'))}] [${chalk_1.default.yellow('teleport')}] ` +
                `[${chalk_1.default.gray(client.accountId)}] (${client.account.name})\n` +
                `\tdx: ${client.lastX.toFixed(5)} -> ${colX(x.toFixed(5))} [${minX.toFixed(5)}-${maxX.toFixed(5)}]\n` +
                `\tdy: ${client.lastY.toFixed(5)} -> ${colY(y.toFixed(5))} [${minY.toFixed(5)}-${maxY.toFixed(5)}]\n` +
                `\tdt: ${delta.toFixed(5)}`);
        }
        if (settings.reportTeleporting) {
            const { count } = counter.add(client.accountId);
            if (count > teleportReportLimit) {
                counter.remove(client.accountId);
                client.reporter.warn(`Teleporting (x${teleportReportLimit})`);
            }
        }
        if (settings.kickTeleporting) {
            playerUtils_1.kickClient(client, 'teleporting');
            return true;
        }
        if (settings.fixTeleporting) {
            pony.vx = 0;
            pony.vy = 0;
            client.reporter.systemLog(`Fixed teleporting (${x} ${y}) -> (${pony.x} ${pony.y})`);
            entityUtils_2.fixPosition(client.pony, client.map, pony.x, pony.y, false);
            return true;
        }
    }
    const dx = Math.abs(x - pony.x);
    const dy = Math.abs(y - pony.y);
    if (dx > 8 || dy > 8) {
        if (settings.fixTeleporting) {
            pony.vx = 0;
            pony.vy = 0;
            client.reporter.systemLog(`Fixed teleporting (too far) (${x} ${y}) -> (${pony.x} ${pony.y})`);
            entityUtils_2.fixPosition(client.pony, client.map, pony.x, pony.y, false);
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=move.js.map