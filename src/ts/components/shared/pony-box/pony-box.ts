import { Component, Input, Output, EventEmitter } from '@angular/core';
import { PlayerAction, Pony, EntityPlayerState, Entity } from '../../../common/interfaces';
import { getPaletteInfo } from '../../../common/pony';
import { Model } from '../../services/model';
import { PonyTownGame } from '../../../client/game';
import {
	partyLeaderIcon, faUserPlus, faUserTimes, faCheck, faMicrophoneSlash, faEyeSlash, faStar, faUserMinus,
	faUserCog, faComment
} from '../../../client/icons';
import { DAY } from '../../../common/constants';
import { isPonyInParty, isPartyLeader } from '../../../client/partyUtils';
import { getTag } from '../../../common/tags';
import { isIgnored, isHidden, isFriend } from '../../../common/entityUtils';
import { setFlag } from '../../../common/utils';

@Component({
	selector: 'pony-box',
	templateUrl: 'pony-box.pug',
	styleUrls: ['pony-box.scss'],
})
export class PonyBox {
	readonly leaderIcon = partyLeaderIcon;
	readonly inviteIcon = faUserPlus;
	readonly removeIcon = faUserTimes;
	readonly cogIcon = faUserCog;
	readonly checkIcon = faCheck;
	readonly ignoreIcon = faMicrophoneSlash;
	readonly hideIcon = faEyeSlash;
	readonly starIcon = faStar;
	readonly addFriendIcon = faUserPlus;
	readonly removeFriendIcon = faUserMinus;
	readonly messageIcon = faComment;
	isIgnored = isIgnored;
	isFriend = isFriend;
	removingFriend = false;
	@Input() pony?: Pony;
	@Output() sendMessage = new EventEmitter<Entity>();
	constructor(private model: Model, private game: PonyTownGame) {
	}
	get ignoredOrHidden() {
		return this.pony && (isIgnored(this.pony) || isHidden(this.pony));
	}
	get isMod() {
		return this.model.isMod;
	}
	get canInviteToParty() {
		return this.pony && (!this.game.party || (isPartyLeader(this.game) && !isPonyInParty(this.game.party, this.pony, true)));
	}
	get canRemoveFromParty() {
		return this.pony && isPartyLeader(this.game) && isPonyInParty(this.game.party, this.pony, true);
	}
	get canPromoteToLeader() {
		return this.pony && isPartyLeader(this.game) && isPonyInParty(this.game.party, this.pony, false);
	}
	get special() {
		const tag = getTag(this.pony && this.pony.tag);
		return tag && tag.name;
	}
	get specialClass() {
		const tag = getTag(this.pony && this.pony.tag);
		return tag && tag.tagClass;
	}
	get paletteInfo() {
		return this.pony && getPaletteInfo(this.pony);
	}
	inviteToParty() {
		this.playerAction(PlayerAction.InviteToParty);
	}
	removeFromParty() {
		this.playerAction(PlayerAction.RemoveFromParty);
	}
	promoteToLeader() {
		this.playerAction(PlayerAction.PromotePartyLeader);
	}
	toggleIgnore() {
		if (this.pony) {
			const ignored = isIgnored(this.pony);
			this.playerAction(ignored ? PlayerAction.Unignore : PlayerAction.Ignore);
			this.pony.playerState = setFlag(this.pony.playerState, EntityPlayerState.Ignored, !ignored);
		}
	}
	hidePlayer(days: number) {
		this.playerAction(PlayerAction.HidePlayer, days * DAY);
	}
	addFriend() {
		this.playerAction(PlayerAction.AddFriend);
	}
	removeFriend() {
		this.playerAction(PlayerAction.RemoveFriend);
	}
	private playerAction(type: PlayerAction, param: any = undefined) {
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
		this.playerAction(PlayerAction.InviteToSupporterServers);
	}
}
