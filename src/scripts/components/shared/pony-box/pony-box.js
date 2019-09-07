"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const pony_1 = require("../../../common/pony");
const model_1 = require("../../services/model");
const game_1 = require("../../../client/game");
const icons_1 = require("../../../client/icons");
const constants_1 = require("../../../common/constants");
const partyUtils_1 = require("../../../client/partyUtils");
const tags_1 = require("../../../common/tags");
const entityUtils_1 = require("../../../common/entityUtils");
const utils_1 = require("../../../common/utils");
let PonyBox = class PonyBox {
    constructor(model, game) {
        this.model = model;
        this.game = game;
        this.leaderIcon = icons_1.partyLeaderIcon;
        this.inviteIcon = icons_1.faUserPlus;
        this.removeIcon = icons_1.faUserTimes;
        this.cogIcon = icons_1.faUserCog;
        this.checkIcon = icons_1.faCheck;
        this.ignoreIcon = icons_1.faMicrophoneSlash;
        this.hideIcon = icons_1.faEyeSlash;
        this.starIcon = icons_1.faStar;
        this.addFriendIcon = icons_1.faUserPlus;
        this.removeFriendIcon = icons_1.faUserMinus;
        this.messageIcon = icons_1.faComment;
        this.isIgnored = entityUtils_1.isIgnored;
        this.isFriend = entityUtils_1.isFriend;
        this.removingFriend = false;
        this.sendMessage = new core_1.EventEmitter();
    }
    get ignoredOrHidden() {
        return this.pony && (entityUtils_1.isIgnored(this.pony) || entityUtils_1.isHidden(this.pony));
    }
    get isMod() {
        return this.model.isMod;
    }
    get canInviteToParty() {
        return this.pony && (!this.game.party || (partyUtils_1.isPartyLeader(this.game) && !partyUtils_1.isPonyInParty(this.game.party, this.pony, true)));
    }
    get canRemoveFromParty() {
        return this.pony && partyUtils_1.isPartyLeader(this.game) && partyUtils_1.isPonyInParty(this.game.party, this.pony, true);
    }
    get canPromoteToLeader() {
        return this.pony && partyUtils_1.isPartyLeader(this.game) && partyUtils_1.isPonyInParty(this.game.party, this.pony, false);
    }
    get special() {
        const tag = tags_1.getTag(this.pony && this.pony.tag);
        return tag && tag.name;
    }
    get specialClass() {
        const tag = tags_1.getTag(this.pony && this.pony.tag);
        return tag && tag.tagClass;
    }
    get paletteInfo() {
        return this.pony && pony_1.getPaletteInfo(this.pony);
    }
    inviteToParty() {
        this.playerAction(3 /* InviteToParty */);
    }
    removeFromParty() {
        this.playerAction(4 /* RemoveFromParty */);
    }
    promoteToLeader() {
        this.playerAction(5 /* PromotePartyLeader */);
    }
    toggleIgnore() {
        if (this.pony) {
            const ignored = entityUtils_1.isIgnored(this.pony);
            this.playerAction(ignored ? 2 /* Unignore */ : 1 /* Ignore */);
            this.pony.playerState = utils_1.setFlag(this.pony.playerState, 1 /* Ignored */, !ignored);
        }
    }
    hidePlayer(days) {
        this.playerAction(6 /* HidePlayer */, days * constants_1.DAY);
    }
    addFriend() {
        this.playerAction(8 /* AddFriend */);
    }
    removeFriend() {
        this.playerAction(9 /* RemoveFriend */);
    }
    playerAction(type, param = undefined) {
        const ponyId = this.pony && this.pony.id;
        if (ponyId) {
            this.game.send(server => server.playerAction(ponyId, type, param));
        }
    }
    sendMessageTo() {
        if (this.pony) {
            this.sendMessage.emit(this.pony);
        }
    }
    // supporter servers
    get canInviteToSupporterServers() {
        return false; // DEVELOPMENT; // TODO: check if ignored or hidden
    }
    get isInvitedToSupporterServers() {
        return false;
    }
    inviteToSupporterServers() {
        this.playerAction(7 /* InviteToSupporterServers */);
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], PonyBox.prototype, "pony", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], PonyBox.prototype, "sendMessage", void 0);
PonyBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'pony-box',
        templateUrl: 'pony-box.pug',
        styleUrls: ['pony-box.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model, game_1.PonyTownGame])
], PonyBox);
exports.PonyBox = PonyBox;
//# sourceMappingURL=pony-box.js.map