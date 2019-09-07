import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { debounce } from 'lodash';
import { Account } from '../../../common/adminInterfaces';
import { AdminModel } from '../../services/adminModel';
import { faSync, faComment, faFilter, faEraser, faSpinner } from '../../../client/icons';

let autoRefresh = false;
let showOnly = 'all';
let search = '';
let currentPage = 0;
let not = false;

@Component({
	selector: 'admin-accounts',
	templateUrl: 'admin-accounts.pug',
})
export class AdminAccounts implements OnInit {
	readonly syncIcon = faSync;
	readonly filterIcon = faFilter;
	readonly commentIcon = faComment;
	readonly eraserIcon = faEraser;
	readonly spinnerIcon = faSpinner;
	readonly filters = [
		'all',
		'banned',
		'timed out',
		'with flags',
		'notes',
		'supporters',
	];
	totalItems = 99999999;
	itemsOnPageIds: string[] = [];
	itemsPerPage = 20;
	loading = false;
	private expanded = new Set<string>();
	constructor(public model: AdminModel, private router: Router) {
	}
	get showOnly() {
		return showOnly;
	}
	set showOnly(value) {
		if (showOnly !== value) {
			showOnly = value;
			this.refresh();
		}
	}
	get not() {
		return not;
	}
	set not(value) {
		if (not !== value) {
			not = value;
			this.refresh();
		}
	}
	get autoRefresh() {
		return autoRefresh;
	}
	set autoRefresh(value) {
		autoRefresh = value;
	}
	get currentPage() {
		return currentPage;
	}
	set currentPage(value) {
		if (currentPage !== value) {
			currentPage = value;
			this.refresh();
		}
	}
	get search() {
		return search;
	}
	set search(value) {
		if (search !== value) {
			search = value;
			this.execSearch();
		}
	}
	private execSearch = debounce(() => this.refresh(), 500);
	get duplicateEntries() {
		return this.model.duplicateEntries;
	}
	refreshDuplicates() {
		this.model.checkDuplicateEntries(true);
	}
	limit(account: Account) {
		return this.expanded.has(account._id) ? 99999 : 2;
	}
	expand(account: Account) {
		this.expanded.add(account._id);
	}
	ngOnInit() {
		this.model.accountPromise
			.then(() => this.refresh());
	}
	refresh(force = false) {
		this.loading = true;
		this.model.findAccounts({
			search: this.search.trim(),
			not: this.not,
			showOnly: this.showOnly,
			page: this.currentPage - 1,
			itemsPerPage: this.itemsPerPage,
			force,
		}).then(result => {
			if (result && result.page === (this.currentPage - 1)) {
				this.totalItems = result.totalItems;
				this.itemsOnPageIds = result.accounts;
				this.loading = false;
			}
		});
	}
	createAccount() {
		const name = prompt('enter new account name');

		if (name) {
			this.model.createAccount(name)
				.then(id => this.router.navigate(['accounts', id]));
		}
	}
}
