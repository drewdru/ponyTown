import { Component } from '@angular/core';
import { supporterLink } from '../../../client/data';
import { GENERAL_RULES } from '../../../common/constants';

@Component({
	selector: 'play-notice',
	templateUrl: 'play-notice.pug',
})
export class PlayNotice {
	readonly patreonLink = supporterLink;
	readonly rules = GENERAL_RULES;
}
