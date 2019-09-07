"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const collision_1 = require("../common/collision");
const constants_1 = require("../common/constants");
let currentPlayer;
let setX = 0;
let setY = 0;
function setupPlayer(game, player) {
    const pony = player;
    pony.flags = utils_1.setFlag(pony.flags, 256 /* Interactive */, false);
    if (collision_1.isStaticCollision(player, game.map, false)) {
        collision_1.fixCollision(player, game.map);
    }
    game.setPlayer(pony);
    currentPlayer = player;
    savePlayerPosition();
}
exports.setupPlayer = setupPlayer;
function savePlayerPosition() {
    if (currentPlayer) {
        setX = currentPlayer.x;
        setY = currentPlayer.y;
    }
}
exports.savePlayerPosition = savePlayerPosition;
function restorePlayerPosition() {
    if (currentPlayer) {
        if (currentPlayer.x !== setX || currentPlayer.y !== setY) {
            currentPlayer.x = setX;
            currentPlayer.y = setY;
            DEVELOPMENT && console.warn('Restoring player position');
        }
    }
}
exports.restorePlayerPosition = restorePlayerPosition;
// Account creation lock
exports.setAclCookie = (acl) => {
    document.cookie = `acl=${acl}; expires=${utils_1.fromNow(constants_1.WEEK).toUTCString()}; path=/`;
};
//# sourceMappingURL=sec.js.map