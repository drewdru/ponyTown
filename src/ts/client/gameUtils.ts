import { Notification } from '../common/interfaces';
import { PonyTownGame } from './game';
import { removeById } from '../common/utils';

export function addNotification({ notifications }: PonyTownGame, notification: Notification) {
	const open = notifications.length === 0;

	notifications.push(notification);

	setTimeout(() => {
		notification.open = open;
		notification.fresh = false;
	}, 500);
}

export function removeNotification({ notifications }: PonyTownGame, id: number) {
	const notification = removeById(notifications, id);

	if (notification && notification.open && notifications.length) {
		notifications[0].open = true;
	}
}

export function resetGameFields(game: PonyTownGame) {
	game.loaded = false;
	game.placeInQueue = 0;
	game.playerId = undefined;
	game.playerName = undefined;
	game.playerInfo = undefined;
	game.playerCRC = undefined;
	game.party = undefined;
	game.whisperTo = undefined;
	game.messageQueue = [];
	game.lastWhisperFrom = undefined;
	game.onPartyUpdate.next();
	game.fallbackPonies.clear();
}

export function markGameAsLoaded(game: PonyTownGame) {
	if (!game.loaded) {
		game.loaded = true;
		game.fullyLoaded = false;
		setTimeout(() => game.fullyLoaded = true, 300);
	}
}

export function isSelected(game: PonyTownGame, id: number) {
	return game.selected && game.selected.id === id;
}
