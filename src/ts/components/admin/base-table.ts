import { debounce } from 'lodash';

export interface BaseTableState {
	search: string;
	currentPage: number;
	sortedBy: string;
	sortedAsc: boolean;
}

export abstract class BaseTable<T> {
	itemsPerPage = 20;
	sorted: T[] = [];
	filtered: T[] = [];
	filteredOnPage: T[] = [];
	sortedBy = 'createdAt';
	sortedAsc = true;
	private _search = '';
	private _currentPage = 1;
	private execSearch = debounce(() => {
		this.updateFiltered();
		this.onChange();
	}, 500);
	get itemsFrom() {
		return (this.currentPage - 1) * this.itemsPerPage;
	}
	get items(): T[] {
		return [];
	}
	get search() {
		return this._search;
	}
	set search(value: string) {
		if (this._search !== value) {
			this._search = value;
			this.execSearch();
		}
	}
	get currentPage() {
		return this._currentPage;
	}
	set currentPage(value: number) {
		if (this._currentPage !== value) {
			this._currentPage = value;
			this.updatePage();
			this.onChange();
		}
	}
	sortBy(field: string) {
		if (this.sortedBy === field) {
			this.sortedAsc = !this.sortedAsc;
		} else {
			this.sortedBy = field;
			this.sortedAsc = true;
		}

		this.updateSorted();
		this.onChange();
	}
	sortedClass(field: string) {
		return this.sortedBy === field ? (this.sortedAsc ? 'sorted-asc' : 'sorted-desc') : undefined;
	}
	protected updateItems() {
		this.updateSorted();
	}
	protected updateSorted() {
		this.sorted = this.sortItems(this.items, this.sortedBy, this.sortedAsc);
		this.updateFiltered();
	}
	protected updateFiltered() {
		this.filtered = this.filterItems(this.sorted, this.search);
		this.updatePage();
	}
	protected updatePage() {
		this.filteredOnPage = this.filtered.slice(this.itemsFrom, this.itemsFrom + this.itemsPerPage);
	}
	protected sortItems(items: T[], _by: string, _asc: boolean) {
		return items;
	}
	protected filterItems(items: T[], _search: string) {
		return items;
	}
	protected onChange() {
	}
	protected getState(): BaseTableState {
		return {
			search: this.search,
			currentPage: this.currentPage,
			sortedBy: this.sortedBy,
			sortedAsc: this.sortedAsc,
		};
	}
	protected setState(state: BaseTableState | undefined) {
		if (state) {
			this._search = state.search;
			this._currentPage = state.currentPage || 1;
			this.sortedBy = state.sortedBy;
			this.sortedAsc = state.sortedAsc;
		}
	}
}
