"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const lodash_1 = require("lodash");
const adminModel_1 = require("../../services/adminModel");
const icons_1 = require("../../../client/icons");
const utils_1 = require("../../../common/utils");
let currentPage = 1;
let query = {};
let AdminPonies = class AdminPonies {
    constructor(model) {
        this.model = model;
        this.syncIcon = icons_1.faSync;
        this.filterIcon = icons_1.faFilter;
        this.spinnerIcon = icons_1.faSpinner;
        this.trashIcon = icons_1.faTrash;
        this.commentIcon = icons_1.faComment;
        this.itemsPerPage = 20;
        this.query = {};
        this.loading = false;
        this.lastQuery = {};
        this.execSearch = lodash_1.debounce(() => this.fetchPonies(false), 1000);
    }
    get totalItems() {
        return this.totalCount === undefined ? this.model.counts.characters : this.totalCount;
    }
    get search() {
        return query.search;
    }
    set search(value) {
        if (query.search !== value) {
            query.search = value;
            this.execSearch();
        }
    }
    get orderBy() {
        return query.orderBy;
    }
    set orderBy(value) {
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
            this.fetchPonies(lodash_1.isEqual(this.lastQuery, query));
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
    remove(pony) {
        if (confirm('Are you sure?')) {
            this.model.removePony(pony._id)
                .then(() => utils_1.delay(500))
                .then(() => this.refresh());
        }
    }
    fetchPonies(skipTotalCount) {
        const thisQuery = utils_1.cloneDeep(query);
        this.lastQuery = utils_1.cloneDeep(query);
        this.loading = true;
        thisQuery.search = thisQuery.search && thisQuery.search.trim();
        this.model.findPonies(thisQuery, this.currentPage - 1, skipTotalCount)
            .then(result => {
            if (result) {
                if (!skipTotalCount) {
                    this.totalCount = result.totalCount;
                }
                this.items = result.items;
            }
            else {
                this.items = [];
            }
        })
            .finally(() => this.loading = false);
    }
};
AdminPonies = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-ponies',
        templateUrl: 'admin-ponies.pug',
        styleUrls: ['admin-ponies.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AdminPonies);
exports.AdminPonies = AdminPonies;
//# sourceMappingURL=admin-ponies.js.map