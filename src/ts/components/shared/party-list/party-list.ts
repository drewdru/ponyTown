import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PartyMember } from '../../../common/interfaces';
import { PARTY_LIMIT } from '../../../common/constants';
import { PonyTownGame } from '../../../client/game';
import { partyLeaderIcon, faCog, faEllipsisV } from '../../../client/icons';
import { clamp } from '../../../common/utils';
import { isPartyLeader } from '../../../client/partyUtils';

function visibleMembers(members: PartyMember[], max: number, start: number) {
	return members.length > max ? Math.max(max - (start > 0 ? 2 : 1), 1) : max;
}

@Component({
	selector: 'party-list',
	templateUrl: 'party-list.pug',
	styleUrls: ['party-list.scss'],
})
export class PartyList implements OnInit, OnDestroy {
	readonly ellipsisIcon = faEllipsisV;
	readonly leaderIcon = partyLeaderIcon;
	readonly cogIcon = faCog;
	hidden = false;
	start = 0;
	maxMembers = PARTY_LIMIT - 1;
	members: PartyMember[] = [];
	private subscription?: Subscription;
	constructor(private game: PonyTownGame) {
	}
	get hasParty() {
		return this.game.party !== undefined;
	}
	get isLeader() {
		return isPartyLeader(this.game);
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
	isMe(member: PartyMember) {
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
		} else {
			this.members = [];
			this.start = 0;
		}
	}
	@HostListener('window:resize')
	resized() {
		const padding = 140 + 110;
		const max = clamp(Math.floor((window.innerHeight - padding) / 43), 0, PARTY_LIMIT - 1);

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
}
