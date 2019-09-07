import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Account, Event, SERVER_LABELS, ChatEvent } from '../../../../common/adminInterfaces';
import { AdminModel } from '../../../services/adminModel';
import { faLanguage, faTrash, faComment, faClipboard } from '../../../../client/icons';
import { getTranslationUrl } from '../../../../common/adminUtils';

@Component({
	selector: 'events-table',
	templateUrl: 'events-table.pug',
	styleUrls: ['events-table.scss'],
})
export class EventsTable {
	readonly clipboardIcon = faClipboard;
	readonly langIcon = faLanguage;
	readonly trashIcon = faTrash;
	readonly commentIcon = faComment;
	@Input() events!: Event[];
	@Output() showChat = new EventEmitter<ChatEvent>();
	@Output() addChat = new EventEmitter<ChatEvent>();
	@Output() removedEvent = new EventEmitter<Event>();
	constructor(private model: AdminModel) {
	}
	serverLabel(e: Event) {
		return SERVER_LABELS[e.server] || 'badge-none';
	}
	remove(e: Event) {
		this.model.removeEvent(e._id);
		this.removedEvent.emit(e);
	}
	removeAll(e: Event) {
		this.model.events
			.filter(x => x.message === e.message)
			.forEach(x => this.model.removeEvent(x._id));
	}
	copyToNotes(e: Event, account: Account | undefined) {
		if (account) {
			const desc = e.desc ? `: ${e.desc}` : '';
			const count = e.count > 1 ? `[${e.count}] ` : '';
			const note = `${(account.note || '')}\r\n[${e.server}]${count}${e.message}${desc}`;
			this.model.setNote(account._id, note.trim());
		}
	}
	translateUrl(e: Event) {
		return getTranslationUrl(e.desc);
	}
	onShowChat(e: MouseEvent, event: Event, account: Account | undefined) {
		if (e.shiftKey) {
			this.addChat.emit({ event, account });
		} else {
			this.showChat.emit({ event, account });
		}
	}
	onAddChat(event: Event, account: Account | undefined) {
		this.addChat.emit({ event, account });
	}
}
