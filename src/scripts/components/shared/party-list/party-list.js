"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const constants_1 = require("../../../common/constants");
const game_1 = require("../../../client/game");
const icons_1 = require("../../../client/icons");
const utils_1 = require("../../../common/utils");
const partyUtils_1 = require("../../../client/partyUtils");
function visibleMembers(members, max, start) {
    return members.length > max ? Math.max(max - (start > 0 ? 2 : 1), 1) : max;
}
let PartyList = class PartyList {
    constructor(game) {
        this.game = game;
        this.ellipsisIcon = icons_1.faEllipsisV;
        this.leaderIcon = icons_1.partyLeaderIcon;
        this.cogIcon = icons_1.faCog;
        this.hidden = false;
        this.start = 0;
        this.maxMembers = constants_1.PARTY_LIMIT - 1;
        this.members = [];
    }
    get hasParty() {
        return this.game.party !== undefined;
    }
    get isLeader() {
        return partyUtils_1.isPartyLeader(this.game);
    }
    get hasMore() {
        return this.members.length > (this.start + this.visible);
    }
    get visible() {
        return visibleMembers(this.members, this.maxMembers, this.start);
    }
    get limit() {
        return this.start + this.visible;
    }
    ngOnInit() {
        this.subscription = this.game.onPartyUpdate.subscribe(() => this.update());
        this.resized();
    }
    ngOnDestroy() {
        this.subscription && this.subscription.unsubscribe();
    }
    isMe(member) {
        return this.game.player && this.game.player.id === member.id;
    }
    leave() {
        this.game.send(server => server.leaveParty());
    }
    update() {
        if (this.hasParty) {
            this.members = this.game.party ? this.game.party.members.filter(m => !m.self) : [];
            while (this.start > 0 && this.members.length <= this.start) {
                this.start = 0;
            }
        }
        else {
            this.members = [];
            this.start = 0;
        }
    }
    resized() {
        const padding = 140 + 110;
        const max = utils_1.clamp(Math.floor((window.innerHeight - padding) / 43), 0, constants_1.PARTY_LIMIT - 1);
        if (this.maxMembers !== max) {
            this.start = 0;
            this.maxMembers = max;
        }
    }
    next() {
        this.start += this.visible;
    }
    prev() {
        const max = this.members.length - 1;
        let start = 0;
        while (start < max && (start + visibleMembers(this.members, this.maxMembers, start)) !== this.start) {
            start++;
        }
        this.start = start;
    }
};
tslib_1.__decorate([
    core_1.HostListener('window:resize'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", void 0)
], PartyList.prototype, "resized", null);
PartyList = tslib_1.__decorate([
    core_1.Component({
        selector: 'party-list',
        templateUrl: 'party-list.pug',
        styleUrls: ['party-list.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [game_1.PonyTownGame])
], PartyList);
exports.PartyList = PartyList;
//# sourceMappingURL=party-list.js.map