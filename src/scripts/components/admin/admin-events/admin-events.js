"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const utils_1 = require("../../../common/utils");
const adminModel_1 = require("../../services/adminModel");
const base_table_1 = require("../base-table");
const admin_chat_log_1 = require("../shared/admin-chat-log/admin-chat-log");
const icons_1 = require("../../../client/icons");
let state;
let AdminEvents = class AdminEvents extends base_table_1.BaseTable {
    constructor(model) {
        super();
        this.model = model;
        this.bellIcon = icons_1.faBell;
        this.syncIcon = icons_1.faSync;
        this.clockIcon = icons_1.faClock;
        this.trashIcon = icons_1.faTrash;
        this.commentsIcon = icons_1.faComments;
        this.hddIcon = icons_1.faHdd;
        this.ramIcon = icons_1.faMicrochip;
        this.certificateIcon = icons_1.faCertificate;
        this.duplicateIcon = icons_1.faClone;
        this.patreonIcon = icons_1.faPatreon;
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
    removeEvents(olderThan) {
        const date = utils_1.fromNow(-olderThan);
        const oldEvents = this.items.filter(e => e.updatedAt.getTime() < date.getTime());
        return Promise.all(oldEvents.map(e => this.model.removeEvent(e._id).then(() => this.removedEvent(e))));
    }
    showChat(e) {
        this.chatEvent = e && e.event;
        this.chatLog.show(e && e.account);
    }
    addChat(e) {
        if (e.account) {
            this.chatLog.add(e.account);
        }
    }
    removedEvent(e) {
        if (this.chatEvent === e) {
            this.chatLog.close();
        }
    }
    toggleNotifications() {
        this.model.toggleNotifications();
    }
    onChange() {
        state = this.getState();
    }
    updatePage() {
        super.updatePage();
    }
};
tslib_1.__decorate([
    core_1.ViewChild('chatLog', { static: true }),
    tslib_1.__metadata("design:type", admin_chat_log_1.AdminChatLog)
], AdminEvents.prototype, "chatLog", void 0);
AdminEvents = tslib_1.__decorate([
    core_1.Component({
        selector: 'admin-events',
        templateUrl: 'admin-events.pug',
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], AdminEvents);
exports.AdminEvents = AdminEvents;
//# sourceMappingURL=admin-events.js.map