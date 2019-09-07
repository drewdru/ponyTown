"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const game_1 = require("../../../client/game");
const utils_1 = require("../../../common/utils");
const icons_1 = require("../../../client/icons");
const pony_1 = require("../../../common/pony");
let NotificationItem = class NotificationItem {
    constructor(game) {
        this.game = game;
        this.banIcon = icons_1.faBan;
    }
    get isOpen() {
        return this.notification.open;
    }
    set isOpen(value) {
        if (value) {
            this.game.notifications.forEach(n => n.open = false);
        }
        this.notification.open = value;
    }
    get okButton() {
        return utils_1.hasFlag(this.notification.flags, 1 /* Ok */);
    }
    get yesButton() {
        return utils_1.hasFlag(this.notification.flags, 2 /* Yes */);
    }
    get acceptButton() {
        return utils_1.hasFlag(this.notification.flags, 8 /* Accept */);
    }
    get noButton() {
        return utils_1.hasFlag(this.notification.flags, 4 /* No */);
    }
    get rejectButton() {
        return utils_1.hasFlag(this.notification.flags, 16 /* Reject */);
    }
    get ignoreButton() {
        return utils_1.hasFlag(this.notification.flags, 64 /* Ignore */);
    }
    get paletteInfo() {
        return pony_1.getPaletteInfo(this.notification.pony);
    }
    ngOnDestroy() {
        this.isOpen = false;
    }
    accept() {
        this.game.send(server => server.acceptNotification(this.notification.id));
    }
    reject() {
        this.game.send(server => server.rejectNotification(this.notification.id));
    }
    ignore() {
        this.reject();
        const pony = this.notification.pony;
        if (pony !== this.game.player) {
            this.game.send(server => server.playerAction(pony.id, 1 /* Ignore */, undefined));
            pony.playerState = utils_1.setFlag(pony.playerState, 1 /* Ignored */, true);
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], NotificationItem.prototype, "notification", void 0);
NotificationItem = tslib_1.__decorate([
    core_1.Component({
        selector: 'notification-item',
        templateUrl: 'notification-item.pug',
        styleUrls: ['notification-item.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [game_1.PonyTownGame])
], NotificationItem);
exports.NotificationItem = NotificationItem;
//# sourceMappingURL=notification-item.js.map