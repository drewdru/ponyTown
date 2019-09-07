import { isCommand, processCommand, hasFlag, includes, point } from '../common/utils';
import { canPonyLie, canPonyFlyUp, canPonyStand, canPonySit, doBoopPonyAction } from '../common/pony';
import { PonyTownGame } from './game';
import {
	setPonyState, canBoop, isPonyLying, isPonyFlying, isPonyStanding, isPonySitting, getInteractBounds,
	isFacingRight, closestEntity, entityInRange
} from '../common/entityUtils';
import { EntityState, Action, Pony, ChatType, EntityFlags, Point, TileType } from '../common/interfaces';
import { FLY_DELAY } from '../common/constants';
import { randomString } from '../common/stringUtils';
import { pickEntitiesByRect, pickAnyEntities } from '../common/worldMap';
import { centerPoint } from '../common/rect';
import { pointToWorld, roundPositionX, roundPositionY } from '../common/positionUtils';
import { hammer, shovel } from '../common/entities';

export function handleActionCommand(message: string, game: PonyTownGame): boolean {
	if (isCommand(message)) {
		const { command = '' } = processCommand(message);
		const player = game.player;

		if (DEVELOPMENT) {
			if (command === 'spammessages') {
				let i = 0;
				setInterval(() => game.send(server => server.say(0, randomString(5) + ` #${i++}`, ChatType.Say)), 100);
				return true;
			}
		}

		switch (command.toLowerCase()) {
			case 'testerrorreporting':
				throw new Error('test error');
			case 'disablepixelratio':
				game.togglePixelRatio();
				return true;
			case 'lie':
			case 'lay':
				if (player) {
					if (isPonyLying(player)) {
						sitAction(player, game);
					} else {
						lieAction(player, game);
					}
				}
				return true;
			case 'sit':
				if (player) {
					if (isPonyFlying(player)) {
						standAction(player, game);
					} else {
						sitAction(player, game);
					}
				}
				return true;
			case 'stand':
				if (player) {
					standAction(player, game);
				}
				return true;
			case 'fly':
				if (player) {
					if (isPonyFlying(player)) {
						standAction(player, game);
					} else {
						flyAction(player, game);
					}
				}
				return true;
		}
	}

	return false;
}

export function upAction(game: PonyTownGame) {
	const player = game.player;

	if (player) {
		if (isPonyLying(player)) {
			sitAction(player, game);
		} else if (isPonySitting(player)) {
			standAction(player, game);
		} else if (isPonyStanding(player)) {
			flyAction(player, game);
		}
	}
}

export function downAction(game: PonyTownGame) {
	const player = game.player;

	if (player) {
		if (isPonySitting(player)) {
			lieAction(player, game);
		} else if (isPonyStanding(player)) {
			sitAction(player, game);
		} else if (isPonyFlying(player)) {
			standAction(player, game);
		}
	}
}

export function sitAction(player: Pony, game: PonyTownGame) {
	if (canPonySit(player, game.map) && game.send(server => server.action(Action.Sit))) {
		player.state = setPonyState(player.state, EntityState.PonySitting);
		game.stateOverride = EntityState.PonySitting;
		game.onActionsUpdate.next();
	}
}

export function standAction(player: Pony, game: PonyTownGame) {
	if (canPonyStand(player, game.map) && game.send(server => server.action(Action.Stand))) {
		player.state = setPonyState(player.state, EntityState.PonyStanding);
		game.stateOverride = EntityState.PonyStanding;
		game.onActionsUpdate.next();
	}
}

export function lieAction(player: Pony, game: PonyTownGame) {
	if (canPonyLie(player, game.map) && game.send(server => server.action(Action.Lie))) {
		player.state = setPonyState(player.state, EntityState.PonyLying);
		game.stateOverride = EntityState.PonyLying;
		game.onActionsUpdate.next();
	}
}

export function flyAction(player: Pony, game: PonyTownGame) {
	if (canPonyFlyUp(player) && game.send(server => server.action(Action.Fly))) {
		player.state = setPonyState(player.state, EntityState.PonyFlying);
		player.inTheAirDelay = FLY_DELAY;
		game.stateOverride = EntityState.PonyFlying;
		game.onActionsUpdate.next();
	}
}

export function boopAction(game: PonyTownGame) {
	if (game.player && canBoop(game.player) && game.send(server => server.action(Action.Boop))) {
		doBoopPonyAction(game, game.player);
	}
}

export function turnHeadAction(game: PonyTownGame) {
	if (game.player && game.send(server => server.action(Action.TurnHead))) {
		game.player.state = game.player.state ^ EntityState.HeadTurned;
		game.headTurnedOverride = hasFlag(game.player.state, EntityState.HeadTurned);
		game.onActionsUpdate.next();
	}
}

export function interact(game: PonyTownGame, shift: boolean) {
	const player = game.player;

	if (player) {
		const bounds = getInteractBounds(player);
		const entities = pickEntitiesByRect(game.map, bounds, true, false);
		const center = centerPoint(bounds);
		center.x += (bounds.w / 4) * (isFacingRight(player) ? -1 : 1);
		const entity = closestEntity(pointToWorld(center), entities);

		if (entity && entityInRange(entity, player)) {
			game.send(server => server.interact(entity.id));
		} else if (player.hold === hammer.type) {
			game.changePlaceEntity(shift);
		} else if (player.hold === shovel.type) {
			game.changePlaceTile(shift);
		} else if (player.ponyState.holding && hasFlag(player.ponyState.holding.flags, EntityFlags.Usable)) {
			game.send(server => server.use());
		}
	}
}

export function toggleWall(game: PonyTownGame, hover: Point) {
	const x = hover.x | 0;
	const y = hover.y | 0;
	const dx = hover.x - x;
	const dy = hover.y - y;

	if (dx > dy) {
		if ((dx + dy) < 1) {
			game.send(server => server.changeTile(x, y, TileType.WallH));
		} else {
			game.send(server => server.changeTile(x + 1, y, TileType.WallV));
		}
	} else {
		if ((dx + dy) < 1) {
			game.send(server => server.changeTile(x, y, TileType.WallV));
		} else {
			game.send(server => server.changeTile(x, y + 1, TileType.WallH));
		}
	}
}

export function editorSelectEntities(game: PonyTownGame, hover: Point, shift: boolean) {
	game.apply(() => {
		const entities = pickAnyEntities(game.map, hover);

		if (shift) {
			const entity = entities.filter(e => !includes(game.editor.selectedEntities, e))[0];
			entity && game.editor.selectedEntities.push(entity);
		} else {
			const index = entities.findIndex(e => includes(game.editor.selectedEntities, e));
			const entity = entities[(index + 1) % entities.length];
			game.editor.selectedEntities = entity ? [entity] : [];
		}
	});
}

export function editorDragEntities(game: PonyTownGame, hover: Point, buttonPressed: boolean) {
	if (buttonPressed) {
		const dx = hover.x - game.editor.draggingStart.x;
		const dy = hover.y - game.editor.draggingStart.y;

		game.editor.selectedEntities.forEach(e => {
			e.x = roundPositionX(e.draggingStart!.x + dx);
			e.y = roundPositionY(e.draggingStart!.y + dy);
		});
	} else {
		game.apply(() => game.editor.draggingEntities = false);
		game.send(server => server.editorAction({
			type: 'move',
			entities: game.editor.selectedEntities.map(({ id, x, y }) => ({ id, x, y })),
		}));
	}
}

export function editorMoveEntities(game: PonyTownGame, hover: Point) {
	game.editor.draggingEntities = true;
	game.editor.draggingStart = hover;
	game.editor.selectedEntities.forEach(e => e.draggingStart = point(e.x, e.y));
}
