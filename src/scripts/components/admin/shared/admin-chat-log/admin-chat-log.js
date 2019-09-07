"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const moment = require("moment");
const adminModel_1 = require("../../../services/adminModel");
const adminUtils_1 = require("../../../../common/adminUtils");
const icons_1 = require("../../../../client/icons");
const htmlUtils_1 = require("../../../../client/htmlUtils");
const utils_1 = require("../../../../common/utils");
let AdminChatLog = class AdminChatLog {
    constructor(model, element) {
        this.model = model;
        this.element = element;
        this.searchIcon = icons_1.faSearch;
        this.spinnerIcon = icons_1.faSpinner;
        this.syncIcon = icons_1.faSync;
        this.fileIcon = icons_1.faFileAlt;
        this.closeIcon = icons_1.faTimes;
        this.chevronLeftIcon = icons_1.faChevronLeft;
        this.chevronRightIcon = icons_1.faChevronRight;
        this.canClose = true;
        this.accounts = [];
        this.open = false;
        this.today = adminUtils_1.createChatDate(moment());
        this.dates = [/*{ value: 'all', label: 'All' },*/ ...adminUtils_1.createDateRange(new Date(), 14)];
        this.loading = false;
        this.atNode = 0;
        this.processIdle = 0;
    }
    get autoRefresh() {
        return !!this.refreshInterval;
    }
    set autoRefresh(value) {
        if (value) {
            this.refreshInterval = this.refreshInterval || setInterval(() => this.refresh(), 10 * 1000);
        }
        else {
            this.stopInterval();
        }
    }
    get title() {
        return this.search || (this.account && this.account.name) || 'Chat';
    }
    get account() {
        return this._account;
    }
    set account(value) {
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
    show(account, date) {
        this.search = undefined;
        this.account = account;
        this.date = date || this.today;
        this.open = true;
        this.accounts = [];
        this.refresh();
    }
    add(account) {
        if (!this.account) {
            this.show(account);
        }
        else if (account !== this.account && !utils_1.includes(this.accounts, account)) {
            this.date = this.date || this.today;
            this.accounts.push(account);
            this.refresh();
        }
    }
    removeAccount(index) {
        this.accounts.splice(index, 1);
        this.refresh();
    }
    showDate(date) {
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
    searchChat(search) {
        this.search = search;
        this.refresh();
    }
    refresh() {
        const date = this.date && this.date.value;
        if (this.account) {
            const accounts = [this.account._id, ...this.accounts.map(a => a._id)];
            this.handleChat(this.model.accountsFormattedChat(accounts, date));
        }
        else if (this.search) {
            this.handleChat(this.model.searchFormattedChat(this.search, date));
        }
    }
    openLog() {
        htmlUtils_1.showTextInNewTab(`${this.date ? this.date.label : 'none'}\n\n${(this.chatRaw || '').replace(/\t/g, ' ')}`);
    }
    handleChat(promise) {
        this.loading = true;
        promise
            .then(({ raw, html }) => {
            this.chatRaw = raw;
            this.setChatlogElements(html);
        })
            .finally(() => this.loading = false);
    }
    switchDate(days) {
        const validDate = this.date && this.date.value !== 'all';
        this.date = validDate ? adminUtils_1.createChatDate(moment(this.date.value).add(days, 'days')) : this.today;
        this.refresh();
    }
    stopInterval() {
        clearInterval(this.refreshInterval);
        this.refreshInterval = undefined;
    }
    getChatlogElement() {
        return this.element.nativeElement.querySelector('.chatlog');
    }
    setChatlogElements(elements) {
        const element = this.getChatlogElement();
        if (element) {
            htmlUtils_1.removeAllNodes(element);
            htmlUtils_1.appendAllNodes(element, elements);
            this.nodesToProcess = [
                ...Array.from(element.getElementsByClassName('name')),
                ...Array.from(element.getElementsByClassName('message')),
            ];
            this.atNode = 0;
            this.processNodes();
        }
    }
    processNodes() {
        const processStep = 50;
        const nodes = this.nodesToProcess;
        cancelIdleCallback(this.processIdle);
        if (nodes && this.atNode < nodes.length) {
            let i = 0;
            while (i < processStep && (i + this.atNode) < nodes.length) {
                adminUtils_1.replaceSwears(nodes[i + this.atNode]);
                i++;
            }
            this.atNode += i;
            this.processIdle = requestIdleCallback(() => this.processNodes());
        }
        else {
            this.nodesToProcess = undefined;
        }
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AdminChatLog.prototype, "canClose", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], AdminChatLog.prototype, "account", null);
AdminChatLog = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-chat-log',
        templateUrl: 'admin-chat-log.pug',
        styleUrls: ['admin-chat-log.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel, core_1.ElementRef])
], AdminChatLog);
exports.AdminChatLog = AdminChatLog;
//# sourceMappingURL=admin-chat-log.js.map