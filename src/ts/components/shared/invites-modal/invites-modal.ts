import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { toPalette } from '../../../common/ponyInfo';
import { decompressPonyString } from '../../../common/compressPony';
import { PonyTownGame } from '../../../client/game';
import { Action, SupporterInvite, PalettePonyInfo } from '../../../common/interfaces';
import { removeItem } from '../../../common/utils';
import { Model } from '../../services/model';

@Component({
	selector: 'invites-modal',
	templateUrl: 'invites-modal.pug',
})
export class InvitesModal implements OnInit {
	@Output() close = new EventEmitter();
	invites: (SupporterInvite & { pony: PalettePonyInfo; })[] = [];
	error?: string;
	constructor(private model: Model, private game: PonyTownGame) {
	}
	get inviteLimit() {
		return this.model.supporterInviteLimit;
	}
	ngOnInit() {
		this.game.send(server => server.getInvites())!
			.then(invites => invites.map(i => ({ ...i, pony: toPalette(decompressPonyString(i.info)) })))
			.then(invites => this.invites = invites);
	}
	remove(invite: SupporterInvite) {
		this.error = undefined;
		this.game.send(server => server.actionParam(Action.CancelSupporterInvite, invite.id));
		removeItem(this.invites, invite);
	}
}
