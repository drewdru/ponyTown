"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const core_1 = require("@angular/core");
const sinon_1 = require("sinon");
const gameService_1 = require("../../components/services/gameService");
const model_1 = require("../../components/services/model");
const game_1 = require("../../client/game");
const errorReporter_1 = require("../../components/services/errorReporter");
const storageService_1 = require("../../components/services/storageService");
describe('GameService', () => {
    let model = lib_1.stubClass(model_1.Model);
    let game = lib_1.stubClass(game_1.PonyTownGame);
    let errorHandler = lib_1.stubClass(core_1.ErrorHandler);
    let errorReporter = lib_1.stubClass(errorReporter_1.ErrorReporter);
    let storage = lib_1.stubClass(storageService_1.StorageService);
    let window = lib_1.stubFromInstance({ addEventListener() { } });
    let gameService;
    // let connectSocket: SinonStub;
    // let startLoop: SinonStub;
    beforeEach(() => {
        lib_1.resetStubMethods(model);
        lib_1.resetStubMethods(game, 'leave');
        lib_1.resetStubMethods(errorHandler);
        lib_1.resetStubMethods(errorReporter);
        lib_1.resetStubMethods(window);
        lib_1.resetStubMethods(storage);
        const zone = {
            run: (f) => f(),
            runOutsideAngular: (f) => f(),
        };
        gameService = new gameService_1.GameService(model, game, zone, errorHandler, errorReporter, storage);
        global.WebSocket = {};
    });
    afterEach(() => {
        delete global.WebSocket;
    });
    // describe('join()', () => {
    // 	it('joins to the game', async () => {
    // 		model.join.resolves({ token: 'token' });
    // 		startLoop.returns({});
    // 		gameService.server = { id: 'serverid' } as any;
    // 		await gameService.join('ponyid');
    // 		assert.calledWith(model.join, 'serverid', 'ponyid');
    // 	});
    // });
    describe('leave()', () => {
        // it('notifies game of leaving', () => {
        // 	gameService.leave('test');
        // 	assert.calledOnce(game.leave);
        // });
        it('calls left()', () => {
            const left = sinon_1.stub(gameService, 'left');
            gameService.leave('test');
            sinon_1.assert.calledOnce(left);
        });
    });
});
//# sourceMappingURL=gameService.spec.js.map