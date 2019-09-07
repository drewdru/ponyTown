import * as moment from 'moment';
import chalk from 'chalk';
import { IClient } from './serverInterfaces';
import { decodeMovement, dirToVector, flagsToSpeed, isMovingRight } from '../common/movementUtils';
import { setPonyState, isSittingState, isLyingState } from '../common/entityUtils';
import { setupCamera } from '../common/camera';
import { logger } from './logger';
import { hasFlag, setFlag } from '../common/utils';
import { EntityState } from '../common/interfaces';
import { kickClient, setEntityExpression } from './playerUtils';
import { CounterService } from './services/counter';
import { roundPositionX, roundPositionY } from '../common/positionUtils';
import { tileWidth, tileHeight, SECOND } from '../common/constants';
import { GameServerSettings } from '../common/adminInterfaces';
import { updateEntity, fixPosition } from './entityUtils';
import { isStaticCollision, isOutsideMap } from '../common/collision';

const teleportReportLimit = 10;
const maxLagLimitSeconds = 15;
const maxLagLimit = maxLagLimitSeconds * SECOND;

export type Move = ReturnType<typeof createMove>;

export const createMove =
	(teleportCounter: CounterService<void>) =>
		(client: IClient, now: number, a: number, b: number, c: number, d: number, e: number, settings: GameServerSettings) => {
			if (client.loading || client.fixingPosition || client.isSwitchingMap)
				return;

			const connectionDuration = (now - client.connectedTime) >>> 0;
			const pony = client.pony;
			const { x, y, dir, flags, time, camera } = decodeMovement(a, b, c, d, e);
			const v = dirToVector(dir);
			const speed = flagsToSpeed(flags);

			if (checkOutsideMap(client, x, y))
				return;

			setupCamera(client.camera, camera.x, camera.y, camera.w, camera.h, client.map);

			if (checkLagging(client, time, connectionDuration, settings))
				return;

			if (checkTeleporting(client, x, y, time, settings, teleportCounter))
				return;

			if (!isStaticCollision(pony, client.map, true)) {
				client.safeX = pony.x;
				client.safeY = pony.y;
			}

			pony.x = x;
			pony.y = y;

			if (isStaticCollision(pony, client.map)) {
				pony.x = client.safeX;
				pony.y = client.safeY;

				if (!isStaticCollision(pony, client.map)) {
					if (settings.logFixingPosition) {
						client.reporter.systemLog(`Fixed colliding (${x} ${y}) -> (${pony.x} ${pony.y})`);
					}

					DEVELOPMENT && !TESTS && logger.warn(`Fixing position due to collision`);
					fixPosition(pony, client.map, client.safeX, client.safeY, false);
				} else {
					pony.x = x;
					pony.y = y;
				}
			}

			pony.vx = v.x * speed;
			pony.vy = v.y * speed;

			let ponyState = pony.state || 0;

			const facingRight = hasFlag(ponyState, EntityState.FacingRight);
			const right = isMovingRight(pony.vx, facingRight);

			if (facingRight !== right) {
				ponyState = setFlag(ponyState, EntityState.FacingRight, right);
				ponyState = setFlag(ponyState, EntityState.HeadTurned, false);
			}

			if ((pony.vx || pony.vy) && (isSittingState(ponyState) || isLyingState(ponyState))) {
				ponyState = setPonyState(ponyState, EntityState.PonyStanding);
			}

			pony.state = ponyState;

			updateEntity(pony, false);

			if (pony.exprCancellable) {
				setEntityExpression(pony, undefined);
			}

			pony.timestamp = now / 1000;

			client.lastX = pony.x;
			client.lastY = pony.y;
			client.lastTime = time;
			client.lastVX = pony.vx;
			client.lastVY = pony.vy;
		};

function checkOutsideMap(client: IClient, x: number, y: number): boolean {
	if (isOutsideMap(x, y, client.map)) {
		const message = `map: [${client.map.id || 'main'}] coords: [${x.toFixed(2)}, ${y.toFixed(2)}]`;

		if (!client.shadowed) {
			client.reporter.warn(`Outside map`, message);
		}

		kickClient(client, `outside ${message}`);
		return true;
	}

	return false;
}

function checkLagging(client: IClient, time: number, connectionTime: number, settings: GameServerSettings): boolean {
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
			kickClient(client, 'lagging');
			return true;
		}
	}

	return false;
}

function checkTeleporting(
	client: IClient, x: number, y: number, time: number, settings: GameServerSettings, counter: CounterService<void>
): boolean {
	if (!client.lastTime)
		return false;

	const pony = client.pony;
	const borderX = 0.5;
	const borderY = 0.5;
	const delta = ((time - client.lastTime) / 1000) * 1;

	const afterX = roundPositionX(client.lastX + client.lastVX * delta);
	const afterY = roundPositionY(client.lastY + client.lastVY * delta);

	const afterMinX = client.lastVX === 0 ? afterX - Math.abs(client.lastVY) : afterX;
	const afterMaxX = client.lastVX === 0 ? afterX + Math.abs(client.lastVY) : afterX;
	const afterMinY = client.lastVY === 0 ? afterY - Math.abs(client.lastVX) : afterY;
	const afterMaxY = client.lastVY === 0 ? afterY + Math.abs(client.lastVX) : afterY;

	const minX = Math.floor((Math.min(client.lastX, afterMinX) - borderX) * tileWidth) / tileWidth;
	const maxX = Math.ceil((Math.max(client.lastX, afterMaxX) + borderX) * tileWidth) / tileWidth;
	const minY = Math.floor((Math.min(client.lastY, afterMinY) - borderY) * tileHeight) / tileHeight;
	const maxY = Math.ceil((Math.max(client.lastY, afterMaxY) + borderY) * tileHeight) / tileHeight;

	const outX = x < minX || x > maxX;
	const outY = y < minY || y > maxY;

	if (outX || outY) {
		if (settings.logTeleporting) {
			const colX = outX ? chalk.red : chalk.reset;
			const colY = outY ? chalk.red : chalk.reset;

			logger.log(
				`[${chalk.gray(moment().format('MMM DD HH:mm:ss'))}] [${chalk.yellow('teleport')}] ` +
				`[${chalk.gray(client.accountId)}] (${client.account.name})\n` +
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
			kickClient(client, 'teleporting');
			return true;
		}

		if (settings.fixTeleporting) {
			pony.vx = 0;
			pony.vy = 0;
			client.reporter.systemLog(`Fixed teleporting (${x} ${y}) -> (${pony.x} ${pony.y})`);
			fixPosition(client.pony, client.map, pony.x, pony.y, false);
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
			fixPosition(client.pony, client.map, pony.x, pony.y, false);
			return true;
		}
	}

	return false;
}
