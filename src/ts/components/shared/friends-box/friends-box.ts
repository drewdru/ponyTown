import { Component, Output, EventEmitter } from '@angular/core';
import { faCog, faUserFriends, faUserPlus, faUserCog, faCircle } from '../../../client/icons';
import { Model, Friend } from '../../services/model';
import { PonyTownGame } from '../../../client/game';
import { PlayerAction, Action } from '../../../common/interfaces';
import { removeItem } from '../../../common/utils';
import { SettingsService } from '../../services/settingsService';

@Component({
	selector: 'friends-box',
	templateUrl: 'friends-box.pug',
	styleUrls: ['friends-box.scss'],
})
export class FriendsBox {
	readonly friendsIcon = faUserFriends;
	readonly cogIcon = faCog;
	readonly addToPartyIcon = faUserPlus;
	readonly userOptionsIcon = faUserCog;
	readonly statusIcon = faCircle;
	@Output() sendMessage = new EventEmitter<Friend>();
	removing?: Friend;
	constructor(private settings: SettingsService, private model: Model, private game: PonyTownGame) {
	}
	get friends() {
		return this.model.friends;
	}
	get hidden() {
		return !!this.settings.account.hidden;
	}
	toggleHidden() {
		this.settings.account.hidden = !this.settings.account.hidden;
		this.settings.saveAccountSettings(this.settings.account);
	}
	toggle() {
		this.removing = undefined;
	}
	sendMessageTo(friend: Friend) {
		this.sendMessage.emit(friend);
	}
	inviteToParty(friend: Friend) {
		this.game.send(server => server.playerAction(friend.entityId, PlayerAction.InviteToParty, undefined));
	}
	remove(friend: Friend) {
		this.removing = friend;
	}
	cancelRemove() {
		this.removing = undefined;
	}
	confirmRemove() {
		if (this.removing && this.model.friends) {
			const { accountId } = this.removing;
			this.game.send(server => server.actionParam(Action.RemoveFriend, accountId));
			removeItem(this.model.friends, this.removing);
			this.removing = undefined;
		}
	}
	setStatus(status: string) {
		this.settings.account.hidden = status === 'invisible';
		this.settings.saveAccountSettings(this.settings.account);
	}
}
