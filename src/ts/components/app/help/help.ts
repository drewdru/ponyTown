import { Component } from '@angular/core';
import { emojis } from '../../../client/emoji';
import { faArrowLeft, faArrowRight, faArrowUp, faArrowDown } from '../../../client/icons';
import { contactEmail } from '../../../client/data';

@Component({
	selector: 'help',
	templateUrl: 'help.pug',
	styleUrls: ['help.scss'],
})
export class Help {
	readonly leftIcon = faArrowLeft;
	readonly rightIcon = faArrowRight;
	readonly upIcon = faArrowUp;
	readonly downIcon = faArrowDown;
	readonly emotes = emojis.map(e => e.names[0]);
	readonly mac = /Macintosh/.test(navigator.userAgent);
	readonly contactEmail = contactEmail;
}
