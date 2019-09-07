import { PonyTownGame } from './game';
import { Pony, EntityFlags } from '../common/interfaces';
import { setFlag, fromNow } from '../common/utils';
import { fixCollision, isStaticCollision } from '../common/collision';
import { WEEK } from '../common/constants';

let currentPlayer: Pony | undefined;
let setX = 0;
let setY = 0;

export function setupPlayer(game: PonyTownGame, player: Pony) {
	const pony = player;
	pony.flags = setFlag(pony.flags, EntityFlags.Interactive, false);

	if (isStaticCollision(player, game.map, false)) {
		fixCollision(player, game.map);
	}

	game.setPlayer(pony);
	currentPlayer = player;
	savePlayerPosition();
}

export function savePlayerPosition() {
	if (currentPlayer) {
		setX = currentPlayer.x;
		setY = currentPlayer.y;
	}
}

export function restorePlayerPosition() {
	if (currentPlayer) {
		if (currentPlayer.x !== setX || currentPlayer.y !== setY) {
			currentPlayer.x = setX;
			currentPlayer.y = setY;
			DEVELOPMENT && console.warn('Restoring player position');
		}
	}
}

// Account creation lock
export const setAclCookie = (acl: string) => {
	document.cookie = `acl=${acl}; expires=${fromNow(WEEK).toUTCString()}; path=/`;
};
