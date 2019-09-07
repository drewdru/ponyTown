import { Injectable, NgZone, ErrorHandler } from '@angular/core';
import { merge } from 'lodash';
import { createClientSocket, SocketService, ClientOptions, ClientErrorHandler } from 'ag-sockets/dist/browser';
import { ServerInfo, IServerActions, GameStatus, AccountData, LeaveReason } from '../../common/interfaces';
import { RequestError, findById, includes } from '../../common/utils';
import { OFFLINE_ERROR, PROTECTION_ERROR, BROWSER_NOT_SUPPORTED_ERROR, VERSION_ERROR } from '../../common/errors';
import { startGameLoop, GameLoop } from '../../client/gameLoop';
import { ClientActions } from '../../client/clientActions';
import { socketOptions } from '../../client/data';
import { PonyTownGame } from '../../client/game';
import { Model } from './model';
import { ErrorReporter } from './errorReporter';
import { meetsRequirement } from '../../common/accountUtils';
import { isLanguage, isFocused, sortServersForRussian } from '../../client/clientUtils';
import { StorageService } from './storageService';

export interface ClientSocketService extends SocketService<ClientActions, IServerActions> { }

function createSocket(
	gameService: GameService, game: PonyTownGame, model: Model, zone: NgZone, options: ClientOptions,
	token: string, errorHandler: ClientErrorHandler
): ClientSocketService {
	const socket = createClientSocket<ClientActions, IServerActions>(options, token, errorHandler);
	socket.client = new ClientActions(gameService, game, model, zone);

	if (!socket.supportsBinary) {
		throw new Error(BROWSER_NOT_SUPPORTED_ERROR);
	}

	return socket;
}

@Injectable({
	providedIn: 'root',
})
export class GameService {
	playing = false;
	joining = false;
	offline = false;
	protectionError = false;
	rateLimitError = false;
	versionError = false;
	version?: string;
	server?: ServerInfo;
	servers: ServerInfo[] = [];
	error?: string;
	leftMessage?: string;
	private safelyLeft = false;
	private gameLoop?: GameLoop;
	private disconnectedTimeout?: any;
	private initialized = false;
	private update?: boolean;
	private locked = false;
	constructor(
		private model: Model,
		private game: PonyTownGame,
		private zone: NgZone,
		private errorHandler: ErrorHandler,
		private errorReporter: ErrorReporter,
		private storage: StorageService,
	) {
		this.pollStatus();
	}
	get selected() {
		return this.game.selected;
	}
	get account() {
		return this.model.account;
	}
	get canPlay(): boolean {
		return !!this.model.pony &&
			!!this.model.pony.name &&
			!this.model.pending &&
			!this.joining &&
			!!this.server &&
			!this.server.offline &&
			!this.rateLimitError &&
			!this.versionError &&
			!this.locked;
	}
	get updateWarning(): boolean {
		return !!this.update;
	}
	get filterSwearWords(): boolean {
		return !!(this.server && this.server.filter)
			|| !!(this.account && this.account.settings && this.account.settings.filterSwearWords);
	}
	get wasPlaying() {
		return this.storage.getBoolean('playing');
	}
	join(ponyId: string) {
		this.errorReporter.captureEvent({ name: 'Join' });
		const server = this.server;

		if (this.playing || this.joining || !server) {
			return Promise.resolve();
		}

		if (typeof WebSocket === 'undefined' || typeof Float32Array === 'undefined') {
			return Promise.reject(new Error(BROWSER_NOT_SUPPORTED_ERROR));
		}

		this.joining = true;
		this.leftMessage = undefined;
		this.safelyLeft = false;

		return this.model.join(server.id, ponyId)
			.then(({ token, alert }) => {
				if (!this.joining) {
					return false;
				}

				if (!token) {
					this.model.accountAlert = alert;
					this.joining = false;
					return false;
				}

				return this.zone.runOutsideAngular(() => {
					const options = { ...socketOptions(), path: server.path, host: server.host };
					const errorHandler = this.errorReporter.createClientErrorHandler(options);
					const socket = createSocket(this, this.game, this.model, this.zone, options, token, errorHandler);

					if (this.gameLoop) {
						this.gameLoop.cancel();
					}

					this.game.startup(socket, this.model.isMod);
					this.gameLoop = startGameLoop(this.game, e => this.handleGameError(e));

					return this.gameLoop.started
						.then(() => {
							this.errorReporter.captureEvent({ name: 'gameLoop.started' });
							const socketConnected = this.pollUntilConnected(socket);
							socket.connect();
							return socketConnected;
						})
						.then(() => {
							this.errorReporter.captureEvent({ name: 'socketConnected' });
							return true;
						})
						.catch(e => {
							this.errorReporter.captureEvent({ name: 'socket.disconnect()', error: e.message });
							socket.disconnect();
							throw e;
						});
				});
			})
			.then(joined => {
				this.errorReporter.captureEvent({ name: joined ? 'Joined game' : 'Not joined game' });
			})
			.catch((e: RequestError) => {
				this.errorReporter.captureEvent({ name: 'Failed to join game', error: e.message });

				// if (e.status && e.status > 500 && e.status < 500) {
				// 	this.rateLimitError = true;
				// 	setTimeout(() => this.rateLimitError = false, 5000);
				// }

				this.zone.run(() => this.left('join.catch'));
				throw e;
			});
	}
	leave(reason: string) {
		this.errorReporter.captureEvent({ name: 'Leave', reason });
		this.game.leave();
		this.left('leave');
	}
	joined() {
		this.errorReporter.captureEvent({ name: 'Joined' });
		this.storage.setBoolean('playing', true);
		clearTimeout(this.disconnectedTimeout);
		setTimeout(() => {
			this.joining = false;
			this.playing = true;
		});
	}
	left(from: string, reason = LeaveReason.None) {
		this.errorReporter.captureEvent({ name: 'Left', from, reason });
		this.storage.setBoolean('playing', false);
		this.safelyLeft = true;

		if (reason === LeaveReason.Swearing) {
			this.leftMessage = 'Kicked for swearing or inappropriate language';
			this.locked = true;
		} else {
			this.leftMessage = undefined;
		}

		if (this.gameLoop) {
			this.errorReporter.captureEvent({ name: 'gameLoop.cancel()' });
			this.gameLoop.cancel();
			this.gameLoop = undefined;
		}

		clearTimeout(this.disconnectedTimeout);

		setTimeout(() => {
			this.joining = false;
			this.playing = false;
		});

		if (this.locked) {
			setTimeout(() => {
				this.locked = false;
			}, 7000);
		}

		if (this.model.friends) {
			for (const friend of this.model.friends) {
				friend.online = false;
				friend.entityId = 0;
			}
		}

		this.game.release();
		this.game.onLeft.next();
	}
	disconnected() {
		this.errorReporter.captureEvent({ name: 'Disconnected' });
		clearTimeout(this.disconnectedTimeout);

		if (!this.safelyLeft) {
			this.disconnectedTimeout = setTimeout(() => this.left('disconnected.timeout'), 10000);
		}
	}
	private pollStatus() {
		return this.getAndUpdateStatus(this.account)
			.finally(() => {
				setTimeout(() => this.pollStatus(), this.initialized ? 10000 : 500);
			});
	}
	private getAndUpdateStatus(account: AccountData | undefined) {
		if (this.joining || this.playing || !account || !isFocused()) {
			return Promise.resolve();
		} else {
			return this.model.status(this.initialized)
				.then(status => this.updateStatus(account, status))
				.catch((e: RequestError) => {
					DEVELOPMENT && console.error(e);
					this.offline = e.message === OFFLINE_ERROR;
					this.versionError = e.message === VERSION_ERROR;
					this.protectionError = e.message === PROTECTION_ERROR;
				});
		}
	}
	private updateStatus(account: AccountData, status: GameStatus) {
		this.initialized = true;
		this.offline = false;
		this.version = status.version;
		this.update = status.update;

		for (const server of status.servers) {
			const existing = findById(this.servers, server.id);

			if (existing) {
				merge(existing, server);
			} else if ('name' in server) {
				const info = server as ServerInfo;
				info.countryFlags = info.flag && /^[a-z]{2}( [a-z]{2})*$/.test(info.flag) ? info.flag.split(/ /g) : [];

				if (info.name && account && meetsRequirement(account, info.require)) {
					this.servers.push(info);
				}
			} else {
				// got new server on the list
				this.initialized = false;
			}
		}

		for (let i = this.servers.length - 1; i >= 0; i--) {
			if (!findById(status.servers, this.servers[i].id)) {
				this.servers.splice(i, 1);
			}
		}

		if (isLanguage('ru')) {
			this.servers.sort(sortServersForRussian);
		}

		if (!this.server && account.settings.defaultServer) {
			this.server = findById(this.servers, account.settings.defaultServer);

			if (DEVELOPMENT && /join/.test(this.model.pony.name)) {
				setTimeout(() => this.join(this.model.pony.id));
			}
		}

		if (!includes(this.servers, this.server)) {
			this.server = undefined;
		}
	}
	private handleGameError(error: Error) {
		this.errorReporter.captureEvent({ name: 'handleGameError', error: error.message });
		this.error = error.message;
		this.errorHandler.handleError(error);
		this.leave('handleGameError');
	}
	private pollUntilConnected(socket: ClientSocketService) {
		return new Promise<void>((resolve, reject) => {
			const interval = setInterval(() => {
				if (socket.isConnected) {
					clearInterval(interval);
					this.zone.run(resolve);
				} else if (!this.joining) {
					clearInterval(interval);
					this.zone.run(() => reject(new Error('Cancelled (poll)')));
				}
			}, 10);
		});
	}
}
