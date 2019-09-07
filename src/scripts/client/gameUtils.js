"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
function addNotification({ notifications }, notification) {
    const open = notifications.length === 0;
    notifications.push(notification);
    setTimeout(() => {
        notification.open = open;
        notification.fresh = false;
    }, 500);
}
exports.addNotification = addNotification;
function removeNotification({ notifications }, id) {
    const notification = utils_1.removeById(notifications, id);
    if (notification && notification.open && notifications.length) {
        notifications[0].open = true;
    }
}
exports.removeNotification = removeNotification;
function resetGameFields(game) {
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
exports.resetGameFields = resetGameFields;
function markGameAsLoaded(game) {
    if (!game.loaded) {
        game.loaded = true;
        game.fullyLoaded = false;
        setTimeout(() => game.fullyLoaded = true, 300);
    }
}
exports.markGameAsLoaded = markGameAsLoaded;
function isSelected(game, id) {
    return game.selected && game.selected.id === id;
}
exports.isSelected = isSelected;
//# sourceMappingURL=gameUtils.js.map