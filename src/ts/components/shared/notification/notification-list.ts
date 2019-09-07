import { Component, Input } from '@angular/core';
import { Notification } from '../../../common/interfaces';
import { faEllipsisV } from '../../../client/icons';

const LIMIT = 8;

@Component({
	selector: 'notification-list',
	templateUrl: 'notification-list.pug',
	styleUrls: ['notification-list.scss'],
})
export class NotificationList {
	readonly ellipsisIcon = faEllipsisV;
	@Input() notifications!: Notification[];
	@Input() set notificationsLength(value: number) {
		while (this.start > value) {
			this.prev();
		}
	}
	start = 0;
	get limit() {
		return this.start + LIMIT;
	}
	get hasMore() {
		return this.notifications.length > (this.start + this.limit);
	}
	next() {
		this.start += this.limit;
	}
	prev() {
		this.start -= this.start <= LIMIT ? LIMIT : LIMIT - 1;
	}
}
