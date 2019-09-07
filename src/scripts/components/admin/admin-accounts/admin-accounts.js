"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const router_1 = require("@angular/router");
const lodash_1 = require("lodash");
const adminModel_1 = require("../../services/adminModel");
const icons_1 = require("../../../client/icons");
let autoRefresh = false;
let showOnly = 'all';
let search = '';
let currentPage = 0;
let not = false;
let AdminAccounts = class AdminAccounts {
    constructor(model, router) {
        this.model = model;
        this.router = router;
        this.syncIcon = icons_1.faSync;
        this.filterIcon = icons_1.faFilter;
        this.commentIcon = icons_1.faComment;
        this.eraserIcon = icons_1.faEraser;
        this.spinnerIcon = icons_1.faSpinner;
        this.filters = [
            'all',
            'banned',
            'timed out',
            'with flags',
            'notes',
            'supporters',
        ];
        this.totalItems = 99999999;
        this.itemsOnPageIds = [];
        this.itemsPerPage = 20;
        this.loading = false;
        this.expanded = new Set();
        this.execSearch = lodash_1.debounce(() => this.refresh(), 500);
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
    get duplicateEntries() {
        return this.model.duplicateEntries;
    }
    refreshDuplicates() {
        this.model.checkDuplicateEntries(true);
    }
    limit(account) {
        return this.expanded.has(account._id) ? 99999 : 2;
    }
    expand(account) {
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
};
AdminAccounts = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-accounts',
        templateUrl: 'admin-accounts.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel, router_1.Router])
], AdminAccounts);
exports.AdminAccounts = AdminAccounts;
//# sourceMappingURL=admin-accounts.js.map