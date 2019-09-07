import { Component, OnInit } from '@angular/core';
import { isEqual, debounce } from 'lodash';
import { Character, FindPonyQuery } from '../../../common/adminInterfaces';
import { AdminModel } from '../../services/adminModel';
import { faSync, faFilter, faTrash, faComment, faSpinner } from '../../../client/icons';
import { cloneDeep, delay } from '../../../common/utils';

let currentPage = 1;
let query: FindPonyQuery = {};

@Component({
	selector: 'admin-ponies',
	templateUrl: 'admin-ponies.pug',
	styleUrls: ['admin-ponies.scss'],
})
export class AdminPonies implements OnInit {
	readonly syncIcon = faSync;
	readonly filterIcon = faFilter;
	readonly spinnerIcon = faSpinner;
	readonly trashIcon = faTrash;
	readonly commentIcon = faComment;
	items?: string[];
	itemsPerPage = 20;
	query: FindPonyQuery = {};
	loading = false;
	private lastQuery: FindPonyQuery = {};
	private totalCount?: number;
	private execSearch = debounce(() => this.fetchPonies(false), 1000);
	constructor(private model: AdminModel) {
	}
	get totalItems() {
		return this.totalCount === undefined ? this.model.counts.characters : this.totalCount;
	}
	get search() {
		return query.search;
	}
	set search(value: string | undefined) {
		if (query.search !== value) {
			query.search = value;
			this.execSearch();
		}
	}
	get orderBy() {
		return query.orderBy;
	}
	set orderBy(value: string | undefined) {
		if (query.orderBy !== value) {
			query.orderBy = value;
			this.execSearch();
		}
	}
	get currentPage() {
		return currentPage;
	}
	set currentPage(value) {
		if (currentPage !== value) {
			currentPage = value;
			this.fetchPonies(isEqual(this.lastQuery, query));
		}
	}
	ngOnInit() {
		if (this.model.connected) {
			this.fetchPonies(false);
		}
	}
	refresh() {
		this.fetchPonies(false);
	}
	remove(pony: Character) {
		if (confirm('Are you sure?')) {
			this.model.removePony(pony._id)
				.then(() => delay(500))
				.then(() => this.refresh());
		}
	}
	private fetchPonies(skipTotalCount: boolean) {
		const thisQuery = cloneDeep(query);
		this.lastQuery = cloneDeep(query);
		this.loading = true;

		thisQuery.search = thisQuery.search && thisQuery.search.trim();

		this.model.findPonies(thisQuery, this.currentPage - 1, skipTotalCount)
			.then(result => {
				if (result) {
					if (!skipTotalCount) {
						this.totalCount = result.totalCount;
					}

					this.items = result.items;
				} else {
					this.items = [];
				}
			})
			.finally(() => this.loading = false);
	}
}
