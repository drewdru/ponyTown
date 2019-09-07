import { Component, Input, OnDestroy, ElementRef } from '@angular/core';
import * as moment from 'moment';
import { AdminModel } from '../../../services/adminModel';
import { Account } from '../../../../common/adminInterfaces';
import { ChatDate, createChatDate, createDateRange, replaceSwears } from '../../../../common/adminUtils';
import { faSearch, faSpinner, faSync, faFileAlt, faTimes, faChevronLeft, faChevronRight } from '../../../../client/icons';
import { removeAllNodes, appendAllNodes, showTextInNewTab } from '../../../../client/htmlUtils';
import { includes } from '../../../../common/utils';

@Component({
	selector: 'admin-chat-log',
	templateUrl: 'admin-chat-log.pug',
	styleUrls: ['admin-chat-log.scss'],
})
export class AdminChatLog implements OnDestroy {
	readonly searchIcon = faSearch;
	readonly spinnerIcon = faSpinner;
	readonly syncIcon = faSync;
	readonly fileIcon = faFileAlt;
	readonly closeIcon = faTimes;
	readonly chevronLeftIcon = faChevronLeft;
	readonly chevronRightIcon = faChevronRight;
	@Input() canClose = true;
	accounts: Account[] = [];
	search?: string;
	open = false;
	today: ChatDate = createChatDate(moment());
	dates: ChatDate[] = [/*{ value: 'all', label: 'All' },*/ ...createDateRange(new Date(), 14)];
	date?: ChatDate;
	chatRaw?: string;
	loading = false;
	private _account?: Account;
	private refreshInterval?: any;
	constructor(private model: AdminModel, private element: ElementRef) {
	}
	get autoRefresh() {
		return !!this.refreshInterval;
	}
	set autoRefresh(value: boolean) {
		if (value) {
			this.refreshInterval = this.refreshInterval || setInterval(() => this.refresh(), 10 * 1000);
		} else {
			this.stopInterval();
		}
	}
	get title() {
		return this.search || (this.account && this.account.name) || 'Chat';
	}
	get account() {
		return this._account;
	}
	@Input() set account(value) {
		const theSame = this._account === value || (value && this._account && value._id === this._account._id);
		this._account = value;

		if (!theSame) {
			this.date = undefined;
			this.setChatlogElements([]);
		}
	}
	ngOnDestroy() {
		this.close();
	}
	show(account?: Account, date?: ChatDate) {
		this.search = undefined;
		this.account = account;
		this.date = date || this.today;
		this.open = true;
		this.accounts = [];
		this.refresh();
	}
	add(account: Account) {
		if (!this.account) {
			this.show(account);
		} else if (account !== this.account && !includes(this.accounts, account)) {
			this.date = this.date || this.today;
			this.accounts.push(account);
			this.refresh();
		}
	}
	removeAccount(index: number) {
		this.accounts.splice(index, 1);
		this.refresh();
	}
	showDate(date: ChatDate) {
		this.date = date;
		this.refresh();
	}
	prev() {
		this.switchDate(-1);
	}
	next() {
		this.switchDate(1);
	}
	all() {
		this.date = this.dates[0];
		this.refresh();
	}
	close() {
		this.account = undefined;
		this.date = undefined;
		this.open = false;
		this.setChatlogElements([]);
		this.stopInterval();
	}
	searchChat(search: string | undefined) {
		this.search = search;
		this.refresh();
	}
	refresh() {
		const date = this.date && this.date.value;

		if (this.account) {
			const accounts = [this.account._id, ...this.accounts.map(a => a._id)];
			this.handleChat(this.model.accountsFormattedChat(accounts, date));
		} else if (this.search) {
			this.handleChat(this.model.searchFormattedChat(this.search, date));
		}
	}
	openLog() {
		showTextInNewTab(`${this.date ? this.date.label : 'none'}\n\n${(this.chatRaw || '').replace(/\t/g, ' ')}`);
	}
	private handleChat(promise: Promise<{ raw: string; html: HTMLElement[]; }>) {
		this.loading = true;

		promise
			.then(({ raw, html }) => {
				this.chatRaw = raw;
				this.setChatlogElements(html);
			})
			.finally(() => this.loading = false);
	}
	private switchDate(days: number) {
		const validDate = this.date && this.date.value !== 'all';
		this.date = validDate ? createChatDate(moment(this.date!.value).add(days, 'days')) : this.today;
		this.refresh();
	}
	private stopInterval() {
		clearInterval(this.refreshInterval);
		this.refreshInterval = undefined;
	}
	private getChatlogElement() {
		return (this.element.nativeElement as HTMLElement).querySelector('.chatlog');
	}
	private setChatlogElements(elements: HTMLElement[]) {
		const element = this.getChatlogElement();

		if (element) {
			removeAllNodes(element);
			appendAllNodes(element, elements);
			this.nodesToProcess = [
				...Array.from(element.getElementsByClassName('name')),
				...Array.from(element.getElementsByClassName('message')),
			] as HTMLElement[];
			this.atNode = 0;
			this.processNodes();
		}
	}
	private processNodes() {
		const processStep = 50;
		const nodes = this.nodesToProcess;

		cancelIdleCallback(this.processIdle);

		if (nodes && this.atNode < nodes.length) {
			let i = 0;

			while (i < processStep && (i + this.atNode) < nodes.length) {
				replaceSwears(nodes[i + this.atNode]);
				i++;
			}

			this.atNode += i;
			this.processIdle = requestIdleCallback(() => this.processNodes());
		} else {
			this.nodesToProcess = undefined;
		}
	}
	private nodesToProcess?: HTMLElement[];
	private atNode = 0;
	private processIdle = 0;
}
