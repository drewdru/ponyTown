import { Component } from '@angular/core';
import { emojis } from '../../../client/emoji';
import { getUrl } from '../../../client/rev';
import { CREDITS, CONTRIBUTORS, Credit } from '../../../client/credits';
import { CHANGELOG } from '../../../generated/changelog';
import { SUPPORTER_REWARDS_LIST } from '../../../common/constants';
import { supporterLink, contactEmail } from '../../../client/data';

function toCredit(credit: Credit) {
	return {
		...credit,
		background: `url(${getUrl('images/avatars.jpg')})`,
		position: `${(credit.avatarIndex % 4) * -82}px ${Math.floor(credit.avatarIndex / 4) * -82}px`,
	};
}

@Component({
	selector: 'about',
	templateUrl: 'about.pug',
	styleUrls: ['about.scss'],
})
export class About {
	readonly title = document.title;
	readonly emotes = emojis;
	readonly credits = CREDITS.map(toCredit);
	readonly contributors = CONTRIBUTORS;
	readonly changelog = CHANGELOG;
	readonly rewards = SUPPORTER_REWARDS_LIST;
	readonly patreonLink = supporterLink;
	readonly contactEmail = contactEmail;
}
