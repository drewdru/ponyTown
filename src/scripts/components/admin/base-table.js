"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
class BaseTable {
    constructor() {
        this.itemsPerPage = 20;
        this.sorted = [];
        this.filtered = [];
        this.filteredOnPage = [];
        this.sortedBy = 'createdAt';
        this.sortedAsc = true;
        this._search = '';
        this._currentPage = 1;
        this.execSearch = lodash_1.debounce(() => {
            this.updateFiltered();
            this.onChange();
        }, 500);
    }
    get itemsFrom() {
        return (this.currentPage - 1) * this.itemsPerPage;
    }
    get items() {
        return [];
    }
    get search() {
        return this._search;
    }
    set search(value) {
        if (this._search !== value) {
            this._search = value;
            this.execSearch();
        }
    }
    get currentPage() {
        return this._currentPage;
    }
    set currentPage(value) {
        if (this._currentPage !== value) {
            this._currentPage = value;
            this.updatePage();
            this.onChange();
        }
    }
    sortBy(field) {
        if (this.sortedBy === field) {
            this.sortedAsc = !this.sortedAsc;
        }
        else {
            this.sortedBy = field;
            this.sortedAsc = true;
        }
        this.updateSorted();
        this.onChange();
    }
    sortedClass(field) {
        return this.sortedBy === field ? (this.sortedAsc ? 'sorted-asc' : 'sorted-desc') : undefined;
    }
    updateItems() {
        this.updateSorted();
    }
    updateSorted() {
        this.sorted = this.sortItems(this.items, this.sortedBy, this.sortedAsc);
        this.updateFiltered();
    }
    updateFiltered() {
        this.filtered = this.filterItems(this.sorted, this.search);
        this.updatePage();
    }
    updatePage() {
        this.filteredOnPage = this.filtered.slice(this.itemsFrom, this.itemsFrom + this.itemsPerPage);
    }
    sortItems(items, _by, _asc) {
        return items;
    }
    filterItems(items, _search) {
        return items;
    }
    onChange() {
    }
    getState() {
        return {
            search: this.search,
            currentPage: this.currentPage,
            sortedBy: this.sortedBy,
            sortedAsc: this.sortedAsc,
        };
    }
    setState(state) {
        if (state) {
            this._search = state.search;
            this._currentPage = state.currentPage || 1;
            this.sortedBy = state.sortedBy;
            this.sortedAsc = state.sortedAsc;
        }
    }
}
exports.BaseTable = BaseTable;
//# sourceMappingURL=base-table.js.map