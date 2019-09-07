import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { fromNow } from '../../../common/utils';
import { Event, ChatEvent } from '../../../common/adminInterfaces';
import { AdminModel } from '../../services/adminModel';
import { BaseTable, BaseTableState } from '../base-table';
import { AdminChatLog } from '../shared/admin-chat-log/admin-chat-log';
import {
	faBell, faSync, faClock, faTrash, faComments, faHdd, faMicrochip, faCertificate, faClone, faPatreon
} from '../../../client/icons';

let state: BaseTableState;

@Component({
	selector: 'admin-events',
	templateUrl: 'admin-events.pug',
})
export class AdminEvents extends BaseTable<Event> implements OnInit, OnDestroy {
	readonly bellIcon = faBell;
	readonly syncIcon = faSync;
	readonly clockIcon = faClock;
	readonly trashIcon = faTrash;
	readonly commentsIcon = faComments;
	readonly hddIcon = faHdd;
	readonly ramIcon = faMicrochip;
	readonly certificateIcon = faCertificate;
	readonly duplicateIcon = faClone;
	readonly patreonIcon = faPatreon;
	@ViewChild('chatLog', { static: true }) chatLog!: AdminChatLog;
	private chatEvent?: Event;
	constructor(private model: AdminModel) {
		super();
	}
	get status() {
		return this.model.state.status;
	}
	get isLowDiskSpace() {
		return this.model.isLowDiskSpace;
	}
	get isLowMemory() {
		return this.model.isLowMemory;
	}
	get isOldCertificate() {
		return this.model.isOldCertificate;
	}
	get isOldPatreon() {
		return this.model.isOldPatreon;
	}
	get items() {
		return this.model.events;
	}
	get duplicateEntries() {
		return this.model.duplicateEntries;
	}
	get notifications() {
		return this.model.notifications;
	}
	ngOnInit() {
		this.model.updated = () => this.updateItems();
		this.setState(state);
		this.updateItems();
	}
	ngOnDestroy() {
		this.model.updated = () => { };
	}
	cleanupDeleted() {
		this.model.cleanupDeletedEvents();
	}
	refreshDuplicates() {
		this.model.checkDuplicateEntries(true);
	}
	removeEvents(olderThan: number) {
		const date = fromNow(-olderThan);
		const oldEvents = this.items.filter(e => e.updatedAt.getTime() < date.getTime());
		return Promise.all(oldEvents.map(e => this.model.removeEvent(e._id).then(() => this.removedEvent(e))));
	}
	showChat(e?: ChatEvent) {
		this.chatEvent = e && e.event;
		this.chatLog.show(e && e.account);
	}
	addChat(e: ChatEvent) {
		if (e.account) {
			this.chatLog.add(e.account);
		}
	}
	removedEvent(e: Event) {
		if (this.chatEvent === e) {
			this.chatLog.close();
		}
	}
	toggleNotifications() {
		this.model.toggleNotifications();
	}
	protected onChange() {
		state = this.getState();
	}
	protected updatePage() {
		super.updatePage();
	}
}
