import { stubClass, stubFromInstance, resetStubMethods } from '../lib';
import { ErrorHandler } from '@angular/core';
import { stub, assert } from 'sinon';
import { GameService } from '../../components/services/gameService';
import { Model } from '../../components/services/model';
import { PonyTownGame } from '../../client/game';
import { ErrorReporter } from '../../components/services/errorReporter';
import { StorageService } from '../../components/services/storageService';

describe('GameService', () => {
	let model = stubClass(Model);
	let game = stubClass(PonyTownGame);
	let errorHandler = stubClass(ErrorHandler);
	let errorReporter = stubClass(ErrorReporter);
	let storage = stubClass(StorageService);
	let window = stubFromInstance<Window>({ addEventListener() { } });
	let gameService: GameService;
	// let connectSocket: SinonStub;
	// let startLoop: SinonStub;

	beforeEach(() => {
		resetStubMethods(model);
		resetStubMethods(game, 'leave');
		resetStubMethods(errorHandler);
		resetStubMethods(errorReporter);
		resetStubMethods(window);
		resetStubMethods(storage);
		const zone = {
			run: (f: () => void) => f(),
			runOutsideAngular: (f: () => void) => f(),
		};
		gameService = new GameService(
			model as any, game as any, zone as any, errorHandler as any, errorReporter as any, storage as any);

		(global as any).WebSocket = {};
	});

	afterEach(() => {
		delete (global as any).WebSocket;
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
			const left = stub(gameService, 'left');

			gameService.leave('test');

			assert.calledOnce(left);
		});
	});
});
