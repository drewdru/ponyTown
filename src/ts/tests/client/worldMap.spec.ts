import '../lib';
import { Subject } from 'rxjs';
import { expect } from 'chai';
import { useFakeTimers, SinonFakeTimers } from 'sinon';
import { getRegion, addEntity, setRegion, createWorldMap } from '../../common/worldMap';
import { PonyTownGame } from '../../client/game';
import { MessageType, Entity, Pony, TileType, EntityState, DecodedUpdate } from '../../common/interfaces';
import { entity, mock } from '../mocks';
import { rect } from '../../common/rect';
import { pony, apple } from '../../common/entities';
import { createAnimator } from '../../common/animator';
import { defaultPonyState } from '../../client/ponyHelpers';
import { createRegion } from '../../common/region';
import { createCamera } from '../../common/camera';
import { chatAnimationDuration } from '../../graphics/graphicsUtils';
import { handleUpdateEntity, handleSays } from '../../client/handlers';

describe('worldMap', () => {
	describe('updateEntityInternal()', () => {
		let game: PonyTownGame;
		const def: DecodedUpdate = {
			id: 0, x: 0, y: 0, vx: 0, vy: 0, state: 0, expression: 0, playerState: 0, switchRegion: false,
			options: undefined, name: undefined, info: undefined, crc: undefined, type: undefined, action: undefined,
			filterName: false,
		};

		beforeEach(() => {
			game = {} as any;
			game.map = createWorldMap({ type: 0, flags: 0, regionsX: 2, regionsY: 1, defaultTile: 0 });
			setRegion(game.map, 0, 0, createRegion(0, 0));
			setRegion(game.map, 1, 0, createRegion(1, 0));
			game.onActionsUpdate = new Subject();
		});

		it('updates x, y, vx, vy', () => {
			const e = entity(123, 0, 0, 2);
			addEntity(game.map, e);

			handleUpdateEntity(game, { ...def, id: 123, x: 2, y: 3, vx: 4, vy: 5, state: 123, expression: 234 });

			expect(e.x).equal(2);
			expect(e.y).equal(3);
			expect(e.vx).equal(4);
			expect(e.vy).equal(5);
		});

		it('switches regions', () => {
			const e = entity(123, 0, 0, 1) as Pony;
			e.ponyState = defaultPonyState();
			addEntity(game.map, e);

			handleUpdateEntity(game, { ...def, id: 123, x: 12, y: 3, vx: 4, vy: 5, switchRegion: true });

			expect(getRegion(game.map, 1, 0)!.entities).includes(e);
		});

		it('does not update x, y, vx, vy for player', () => {
			const e = entity(123, 0, 0, 1) as Pony;
			e.ponyState = defaultPonyState();
			addEntity(game.map, e);
			game.playerId = e.id;
			game.player = e as any;

			handleUpdateEntity(game, { ...def, id: 123, x: 2, y: 3, vx: 4, vy: 5 });

			expect(e.x).equal(0);
			expect(e.y).equal(0);
			expect(e.vx).equal(0);
			expect(e.vy).equal(0);
		});

		it('updates flags', () => {
			const e = entity(123, 0, 0, 1) as Pony;
			e.ponyState = defaultPonyState();
			addEntity(game.map, e);

			handleUpdateEntity(game, { ...def, id: 123, x: 2, y: 3, vx: 4, vy: 5, state: 123 });

			expect(e.state).equal(123);
		});

		it('updates expression', () => {
			const e = entity(123, 0, 0, 1) as Pony;
			e.expr = 0;
			e.ponyState = defaultPonyState();
			addEntity(game.map, e);

			handleUpdateEntity(game, { ...def, id: 123, x: 2, y: 3, vx: 4, vy: 5, expression: 234 });

			expect(e.expr).equal(234);
		});

		it('overrides right flag for player', () => {
			const player = entity(123, 0, 0, 1);
			game.player = player as any;
			game.player!.ponyState = defaultPonyState();
			game.rightOverride = true;
			addEntity(game.map, player);

			handleUpdateEntity(game, { ...def, id: 123, x: 2, y: 3, vx: 4, vy: 5 });

			expect(player.state).equal(EntityState.FacingRight);
		});

		it('overrides headTurned flag for player', () => {
			const player = entity(123, 0, 0, 1);
			game.player = player as any;
			game.player!.ponyState = defaultPonyState();
			game.headTurnedOverride = true;
			addEntity(game.map, player);

			handleUpdateEntity(game, { ...def, id: 123, x: 2, y: 3, vx: 4, vy: 5 });

			expect(player.state).equal(EntityState.HeadTurned);
		});

		it('overrides sitting flag for player', () => {
			const player = entity(123, 0, 0, 1);
			game.player = player as any;
			game.player!.ponyState = defaultPonyState();
			game.stateOverride = EntityState.PonySitting;
			addEntity(game.map, player);

			handleUpdateEntity(game, { ...def, id: 123, x: 2, y: 3, vx: 4, vy: 5 });

			expect(player.state).equal(EntityState.PonySitting);
		});
	});

	describe('handleSays()', () => {
		let e: Entity;
		let clock: SinonFakeTimers;
		let game: PonyTownGame;

		beforeEach(() => {
			game = mock(PonyTownGame);
			e = entity(1, 1, 1, 2, { bounds: rect(0, 0, 10, 10) });
			(e as Pony).animator = createAnimator();
			(e as Pony).ponyState = defaultPonyState();
			game.map = createWorldMap({ type: 0, flags: 0, regionsX: 1, regionsY: 1, defaultTile: TileType.None });
			setRegion(game.map, 0, 0, createRegion(0, 0));
			addEntity(game.map, e);
			game.camera = createCamera();
			game.settings = { account: {} } as any;
			game.messageQueue = [];
			game.findEntityFromChatLog = () => undefined;
			(game as any).model = { friends: [] };
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('adds says object to entity', () => {
			handleSays(game, 1, 'test', MessageType.Chat);

			expect(e.says).eql({ message: 'test', timer: 5.1875, total: 5.1875, type: MessageType.Chat, created: 0 });
		});

		// it('does nothing if entity is not on the map', () => {
		// 	game.map.removeEntity(1);

		// 	handleSays(game, 1, 'test', MessageType.Chat);

		// 	expect(e.says).undefined;
		// });

		it('does nothing if entity is not visible', () => {
			e.x = 1000;

			handleSays(game, 1, 'test', MessageType.Chat);

			expect(e.says).undefined;
		});

		// it('does nothing if entity is ignored', () => {
		// 	e.playerState = setFlag(e.playerState, EntityPlayerState.Ignored, true);

		// 	handleSays(game, 1, 'test', MessageType.Chat);

		// 	expect(e.says).undefined;
		// });

		it('emits chat message', () => {
			e.name = 'foo';
			e.type = pony.type;
			e.crc = 123;

			handleSays(game, 1, 'test', MessageType.Chat);

			expect(game.messageQueue).eql([
				{ id: 1, name: 'foo', crc: 123, message: 'test', type: MessageType.Chat },
			]);
		});

		it('emits chat message for party message even if entity is not visible', () => {
			e.name = 'foo';
			e.type = pony.type;
			e.x = 1000;
			e.crc = 123;

			handleSays(game, 1, 'test', MessageType.Party);

			expect(game.messageQueue).eql([
				{ id: 1, name: 'foo', crc: 123, message: 'test', type: MessageType.Party },
			]);
		});

		it('does nothing if entity is not visible', () => {
			e.type = pony.type;
			e.x = 1000;

			handleSays(game, 1, 'test', MessageType.Chat);

			expect(game.messageQueue).eql([]);
		});

		it('does not call game.onMessage for non-pony entities', () => {
			e.type = apple.type;

			handleSays(game, 1, 'test', MessageType.Chat);

			expect(game.messageQueue).eql([]);
		});

		it('does not call game.onMessage for "." message', () => {
			e.type = pony.type;

			handleSays(game, 1, '.', MessageType.Chat);

			expect(game.messageQueue).eql([]);
		});

		it('dismisses previous message for "." message', () => {
			e.type = pony.type;
			handleSays(game, 1, 'test', MessageType.Chat);

			handleSays(game, 1, '.', MessageType.Chat);

			expect(e.says!.timer).equal(chatAnimationDuration);
		});
	});
});
