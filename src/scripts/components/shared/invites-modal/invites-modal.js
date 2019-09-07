"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const ponyInfo_1 = require("../../../common/ponyInfo");
const compressPony_1 = require("../../../common/compressPony");
const game_1 = require("../../../client/game");
const utils_1 = require("../../../common/utils");
const model_1 = require("../../services/model");
let InvitesModal = class InvitesModal {
    constructor(model, game) {
        this.model = model;
        this.game = game;
        this.close = new core_1.EventEmitter();
        this.invites = [];
    }
    get inviteLimit() {
        return this.model.supporterInviteLimit;
    }
    ngOnInit() {
        this.game.send(server => server.getInvites())
            .then(invites => invites.map(i => (Object.assign({}, i, { pony: ponyInfo_1.toPalette(compressPony_1.decompressPonyString(i.info)) }))))
            .then(invites => this.invites = invites);
    }
    remove(invite) {
        this.error = undefined;
        this.game.send(server => server.actionParam(19 /* CancelSupporterInvite */, invite.id));
        utils_1.removeItem(this.invites, invite);
    }
};
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], InvitesModal.prototype, "close", void 0);
InvitesModal = tslib_1.__decorate([
    core_1.Component({
        selector: 'invites-modal',
        templateUrl: 'invites-modal.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [model_1.Model, game_1.PonyTownGame])
], InvitesModal);
exports.InvitesModal = InvitesModal;
//# sourceMappingURL=invites-modal.js.map