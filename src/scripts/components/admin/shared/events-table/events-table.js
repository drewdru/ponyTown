"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const adminInterfaces_1 = require("../../../../common/adminInterfaces");
const adminModel_1 = require("../../../services/adminModel");
const icons_1 = require("../../../../client/icons");
const adminUtils_1 = require("../../../../common/adminUtils");
let EventsTable = class EventsTable {
    constructor(model) {
        this.model = model;
        this.clipboardIcon = icons_1.faClipboard;
        this.langIcon = icons_1.faLanguage;
        this.trashIcon = icons_1.faTrash;
        this.commentIcon = icons_1.faComment;
        this.showChat = new core_1.EventEmitter();
        this.addChat = new core_1.EventEmitter();
        this.removedEvent = new core_1.EventEmitter();
    }
    serverLabel(e) {
        return adminInterfaces_1.SERVER_LABELS[e.server] || 'badge-none';
    }
    remove(e) {
        this.model.removeEvent(e._id);
        this.removedEvent.emit(e);
    }
    removeAll(e) {
        this.model.events
            .filter(x => x.message === e.message)
            .forEach(x => this.model.removeEvent(x._id));
    }
    copyToNotes(e, account) {
        if (account) {
            const desc = e.desc ? `: ${e.desc}` : '';
            const count = e.count > 1 ? `[${e.count}] ` : '';
            const note = `${(account.note || '')}\r\n[${e.server}]${count}${e.message}${desc}`;
            this.model.setNote(account._id, note.trim());
        }
    }
    translateUrl(e) {
        return adminUtils_1.getTranslationUrl(e.desc);
    }
    onShowChat(e, event, account) {
        if (e.shiftKey) {
            this.addChat.emit({ event, account });
        }
        else {
            this.showChat.emit({ event, account });
        }
    }
    onAddChat(event, account) {
        this.addChat.emit({ event, account });
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Array)
], EventsTable.prototype, "events", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], EventsTable.prototype, "showChat", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], EventsTable.prototype, "addChat", void 0);
tslib_1.__decorate([
    core_1.Output(),
    tslib_1.__metadata("design:type", Object)
], EventsTable.prototype, "removedEvent", void 0);
EventsTable = tslib_1.__decorate([
    core_1.Component({
        selector: 'events-table',
        templateUrl: 'events-table.pug',
        styleUrls: ['events-table.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel])
], EventsTable);
exports.EventsTable = EventsTable;
//# sourceMappingURL=events-table.js.map