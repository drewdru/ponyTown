"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const browser_1 = require("ag-sockets/dist/browser");
const utils_1 = require("../../common/utils");
const errors_1 = require("../../common/errors");
const gameLoop_1 = require("../../client/gameLoop");
const clientActions_1 = require("../../client/clientActions");
const data_1 = require("../../client/data");
const game_1 = require("../../client/game");
const model_1 = require("./model");
const errorReporter_1 = require("./errorReporter");
const accountUtils_1 = require("../../common/accountUtils");
const clientUtils_1 = require("../../client/clientUtils");
const storageService_1 = require("./storageService");
function createSocket(gameService, game, model, zone, options, token, errorHandler) {
    const socket = browser_1.createClientSocket(options, token, errorHandler);
    socket.client = new clientActions_1.ClientActions(gameService, game, model, zone);
    if (!socket.supportsBinary) {
        throw new Error(errors_1.BROWSER_NOT_SUPPORTED_ERROR);
    }
    return socket;
}
let GameService = class GameService {
    constructor(model, game, zone, errorHandler, errorReporter, storage) {
        this.model = model;
        this.game = game;
        this.zone = zone;
        this.errorHandler = errorHandler;
        this.errorReporter = errorReporter;
        this.storage = storage;
        this.playing = false;
        this.joining = false;
        this.offline = false;
        this.protectionError = false;
        this.rateLimitError = false;
        this.versionError = false;
        this.servers = [];
        this.safelyLeft = false;
        this.initialized = false;
        this.locked = false;
        this.pollStatus();
    }
    get selected() {
        return this.game.selected;
    }
    get account() {
        return this.model.account;
    }
    get canPlay() {
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
    get updateWarning() {
        return !!this.update;
    }
    get filterSwearWords() {
        return !!(this.server && this.server.filter)
            || !!(this.account && this.account.settings && this.account.settings.filterSwearWords);
    }
    get wasPlaying() {
        return this.storage.getBoolean('playing');
    }
    join(ponyId) {
        this.errorReporter.captureEvent({ name: 'Join' });
        const server = this.server;
        if (this.playing || this.joining || !server) {
            return Promise.resolve();
        }
        if (typeof WebSocket === 'undefined' || typeof Float32Array === 'undefined') {
            return Promise.reject(new Error(errors_1.BROWSER_NOT_SUPPORTED_ERROR));
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
                const options = Object.assign({}, data_1.socketOptions(), { path: server.path, host: server.host });
                const errorHandler = this.errorReporter.createClientErrorHandler(options);
                const socket = createSocket(this, this.game, this.model, this.zone, options, token, errorHandler);
                if (this.gameLoop) {
                    this.gameLoop.cancel();
                }
                this.game.startup(socket, this.model.isMod);
                this.gameLoop = gameLoop_1.startGameLoop(this.game, e => this.handleGameError(e));
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
            .catch((e) => {
            this.errorReporter.captureEvent({ name: 'Failed to join game', error: e.message });
            // if (e.status && e.status > 500 && e.status < 500) {
            // 	this.rateLimitError = true;
            // 	setTimeout(() => this.rateLimitError = false, 5000);
            // }
            this.zone.run(() => this.left('join.catch'));
            throw e;
        });
    }
    leave(reason) {
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
    left(from, reason = 0 /* None */) {
        this.errorReporter.captureEvent({ name: 'Left', from, reason });
        this.storage.setBoolean('playing', false);
        this.safelyLeft = true;
        if (reason === 1 /* Swearing */) {
            this.leftMessage = 'Kicked for swearing or inappropriate language';
            this.locked = true;
        }
        else {
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
    pollStatus() {
        return this.getAndUpdateStatus(this.account)
            .finally(() => {
            setTimeout(() => this.pollStatus(), this.initialized ? 10000 : 500);
        });
    }
    getAndUpdateStatus(account) {
        if (this.joining || this.playing || !account || !clientUtils_1.isFocused()) {
            return Promise.resolve();
        }
        else {
            return this.model.status(this.initialized)
                .then(status => this.updateStatus(account, status))
                .catch((e) => {
                DEVELOPMENT && console.error(e);
                this.offline = e.message === errors_1.OFFLINE_ERROR;
                this.versionError = e.message === errors_1.VERSION_ERROR;
                this.protectionError = e.message === errors_1.PROTECTION_ERROR;
            });
        }
    }
    updateStatus(account, status) {
        this.initialized = true;
        this.offline = false;
        this.version = status.version;
        this.update = status.update;
        for (const server of status.servers) {
            const existing = utils_1.findById(this.servers, server.id);
            if (existing) {
                lodash_1.merge(existing, server);
            }
            else if ('name' in server) {
                const info = server;
                info.countryFlags = info.flag && /^[a-z]{2}( [a-z]{2})*$/.test(info.flag) ? info.flag.split(/ /g) : [];
                if (info.name && account && accountUtils_1.meetsRequirement(account, info.require)) {
                    this.servers.push(info);
                }
            }
            else {
                // got new server on the list
                this.initialized = false;
            }
        }
        for (let i = this.servers.length - 1; i >= 0; i--) {
            if (!utils_1.findById(status.servers, this.servers[i].id)) {
                this.servers.splice(i, 1);
            }
        }
        if (clientUtils_1.isLanguage('ru')) {
            this.servers.sort(clientUtils_1.sortServersForRussian);
        }
        if (!this.server && account.settings.defaultServer) {
            this.server = utils_1.findById(this.servers, account.settings.defaultServer);
            if (DEVELOPMENT && /join/.test(this.model.pony.name)) {
                setTimeout(() => this.join(this.model.pony.id));
            }
        }
        if (!utils_1.includes(this.servers, this.server)) {
            this.server = undefined;
        }
    }
    handleGameError(error) {
        this.errorReporter.captureEvent({ name: 'handleGameError', error: error.message });
        this.error = error.message;
        this.errorHandler.handleError(error);
        this.leave('handleGameError');
    }
    pollUntilConnected(socket) {
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (socket.isConnected) {
                    clearInterval(interval);
                    this.zone.run(resolve);
                }
                else if (!this.joining) {
                    clearInterval(interval);
                    this.zone.run(() => reject(new Error('Cancelled (poll)')));
                }
            }, 10);
        });
    }
};
GameService = tslib_1.__decorate([
    core_1.Injectable({
        providedIn: 'root',
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model,
        game_1.PonyTownGame,
        core_1.NgZone,
        core_1.ErrorHandler,
        errorReporter_1.ErrorReporter,
        storageService_1.StorageService])
], GameService);
exports.GameService = GameService;
//# sourceMappingURL=gameService.js.map