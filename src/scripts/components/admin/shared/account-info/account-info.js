"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const modal_1 = require("ngx-bootstrap/modal");
const lodash_1 = require("lodash");
const constants_1 = require("../../../../common/constants");
const utils_1 = require("../../../../common/utils");
const adminInterfaces_1 = require("../../../../common/adminInterfaces");
const adminUtils_1 = require("../../../../common/adminUtils");
const adminModel_1 = require("../../../services/adminModel");
const icons_1 = require("../../../../client/icons");
const EMPTY_ROLES = [];
const oldTime = utils_1.fromNow(-14 * constants_1.DAY).getTime();
const newTime = utils_1.fromNow(-constants_1.DAY).getTime();
const accountDuplicatesIntervalTime = 10 * constants_1.MINUTE;
const accountDuplicates = new Map();
const predefinedAlerts = [
    {
        name: 'erp:flagged',
        message: `Your account has been flagged for inappropriate bahavior on PG rated server. `
            + `Continuing that behavior may result in permanent ban.`
    },
    {
        name: 'erp:timeout',
        message: `Your account has been timed out for inappropriate language and bahavior on PG rated server. `
            + `Continuing that behavior may result in permanent ban.`
    },
    {
        name: 'dups',
        message: `Your account has been flagged for making multiple accounts. `
            + `Continuing that behavior may result in permanent ban.`
    },
    {
        name: 'under',
        message: `Your account has been reported for being underage, please do NOT play on 18+ server. `
            + `Continuing that may result in permanent ban.`
    },
];
const alertExpires = [
    { name: '1h', length: constants_1.HOUR },
    { name: '5h', length: 5 * constants_1.HOUR },
    { name: '12h', length: 12 * constants_1.HOUR },
    { name: '1d', length: constants_1.DAY },
    { name: '2d', length: 2 * constants_1.DAY },
    { name: '5d', length: 5 * constants_1.DAY },
    { name: '7d', length: 7 * constants_1.DAY },
    { name: '2w', length: 14 * constants_1.DAY },
];
let AccountInfo = class AccountInfo {
    constructor(model, modalService) {
        this.model = model;
        this.modalService = modalService;
        this.counters = adminInterfaces_1.accountCounters;
        this.flags = adminInterfaces_1.accountFlags;
        this.supporterFlags = adminInterfaces_1.supporterFlags;
        this.cogIcon = icons_1.faCog;
        this.minusIcon = icons_1.faMinus;
        this.plusIcon = icons_1.faPlus;
        this.checkIcon = icons_1.faCheck;
        this.flagIcon = icons_1.faFlag;
        this.noteIcon = icons_1.faStickyNote;
        this.newIcon = icons_1.faCertificate;
        this.duplicateBrowserIdIcon = icons_1.faIdBadge;
        this.duplicateEmailIcon = icons_1.faEnvelope;
        this.duplicateNameIcon = icons_1.faFont;
        this.duplicatePermaIcon = icons_1.faBan;
        this.teleportIcon = icons_1.faMapMarkerAlt;
        this.predefinedAlerts = predefinedAlerts;
        this.alertExpires = alertExpires;
        this.alertExpire = alertExpires[3];
        this.alertMessage = '';
        this.extendedAuths = false;
        this.showDuplicates = false;
        this._isNoteOpen = false;
    }
    ngOnInit() {
        this.updateDuplicates();
    }
    ngOnChanges(changes) {
        if (changes.account) {
            this.updateDuplicates();
        }
    }
    get age() {
        return this.account.birthdate ? adminUtils_1.getAge(this.account.birthdate) : '-';
    }
    get alert() {
        const alert = this.account.alert;
        return (alert && alert.expires.getTime() > Date.now()) ? alert : undefined;
    }
    get isNew() {
        return this.account.createdAt && this.account.createdAt.getTime() > newTime;
    }
    get isNoteOpen() {
        return this._isNoteOpen;
    }
    set isNoteOpen(value) {
        if (this._isNoteOpen !== value) {
            this._isNoteOpen = value;
            if (value) {
                this.note = this.account.note;
            }
        }
    }
    get isInactive() {
        return this.account && this.account.lastVisit && this.account.lastVisit.getTime() < oldTime;
    }
    get roles() {
        return this.account.roles ? this.account.roles.filter(r => r !== 'superadmin') : EMPTY_ROLES;
    }
    get flagClass() {
        const counters = this.account.counters;
        if (this.account.flags) {
            return 'text-banned';
        }
        else if (!counters && !this.account.supporter) {
            return 'text-muted';
        }
        else if (counters && ((counters.spam || 0) > 100 || (counters.swears || 0) > 10)) {
            return 'text-alert';
        }
        else {
            return 'text-present';
        }
    }
    get hasDuplicateNote() {
        return this.account.note && /duplicate/i.test(this.account.note);
    }
    hasFlag(value) {
        return utils_1.hasFlag(this.account.flags, value);
    }
    toggleFlag(value) {
        this.model.setAccountFlags(this.account._id, this.account.flags ^ value);
    }
    toggleBan(field, value) {
        this.model.setAccountBanField(this.account._id, field, value);
    }
    kick() {
        this.model.kick(this.account._id);
    }
    report() {
        this.model.report(this.account._id);
    }
    blur() {
        this.model.setNote(this.account._id, this.note || '');
        this.isNoteOpen = false;
    }
    decrementCounter(name) {
        if (this.getCounter(name) > 0) {
            this.setCounter(name, this.getCounter(name) - 1);
        }
    }
    incrementCounter(name) {
        this.setCounter(name, this.getCounter(name) + 1);
    }
    getCounter(name) {
        const counters = this.account.counters;
        return utils_1.toInt(counters && counters[name]);
    }
    setCounter(name, value) {
        const counters = this.account.counters || (this.account.counters = {});
        counters[name] = value;
        this.model.setAccountCounter(this.account._id, name, value);
    }
    removeAlert() {
        this.model.setAlert(this.account._id, '', 0);
    }
    setAlert() {
        this.alertMessage = this.alert ? this.alert.message : '';
        this.alertExpire = this.alertExpires[2];
        this.alertModalRef = this.modalService.show(this.alertModal, { ignoreBackdropClick: true });
    }
    cancelAlert() {
        this.alertModalRef && this.alertModalRef.hide();
        this.alertModalRef = undefined;
    }
    confirmAlert() {
        this.model.setAlert(this.account._id, this.alertMessage, this.alertExpire.length);
        this.cancelAlert();
    }
    updateDuplicates() {
        const account = this.account;
        if (this.showDuplicates && account) {
            const cached = accountDuplicates.get(account._id);
            const threshold = utils_1.fromNow(-accountDuplicatesIntervalTime);
            if (cached && cached.generatedAt > threshold.getTime()) {
                this.duplicates = cached;
            }
            else {
                this.model.getAllDuplicatesQuickInfo(account._id)
                    .then(duplicates => {
                    if (duplicates) {
                        accountDuplicates.set(account._id, duplicates);
                        this.duplicates = duplicates;
                    }
                });
            }
        }
    }
    teleportTo() {
        this.model.teleportTo(this.account._id);
    }
    // supporters
    get isPatreonOrSupporter() {
        return !!(this.account.patreon || this.account.supporter || this.account.supporterDeclinedSince);
    }
    get supporterClass() {
        return adminUtils_1.supporterLevel(this.account) ? 'badge-success' : 'badge-warning';
    }
    get supporterTitle() {
        const supporter = this.account.supporter;
        const flagSupporter = (supporter & 3 /* SupporterMask */) !== 0;
        const patreonSupporter = adminUtils_1.patreonSupporterLevel(this.account);
        const ignorePatreon = utils_1.hasFlag(supporter, 128 /* IgnorePatreon */);
        const pastSupporter = utils_1.hasFlag(supporter, 256 /* PastSupporter */);
        return lodash_1.compact([
            flagSupporter && 'flags',
            patreonSupporter && `patreon`,
            ignorePatreon && 'ignore',
            !patreonSupporter && this.account.supporterDeclinedSince && 'declined',
            pastSupporter && 'past',
        ]).join(', ');
    }
    get supporterIcon() {
        const hasPatreon = adminUtils_1.patreonSupporterLevel(this.account);
        const hasIgnoreFlag = utils_1.hasFlag(this.account.supporter, 128 /* IgnorePatreon */);
        const hasDeclined = !!this.account.supporterDeclinedSince;
        return hasPatreon ? icons_1.faPatreon : ((hasIgnoreFlag || !hasDeclined) ? icons_1.faFlag : icons_1.faClock);
    }
    get hasAnySupporter() {
        return (this.account.supporter & 3 /* SupporterMask */) !== 0;
    }
    get hasPastSupporter() {
        return utils_1.hasFlag(this.account.supporter, 256 /* PastSupporter */);
    }
    get supporterLevel() {
        return adminUtils_1.supporterLevel(this.account);
    }
    get supporterLevelString() {
        const level = adminUtils_1.supporterLevel(this.account);
        return level ? level : (adminUtils_1.isPastSupporter(this.account) ? 'P' : '');
    }
    isSupporter(level) {
        return (this.account.supporter & 3 /* SupporterMask */) === level;
    }
    setSupporter(level) {
        const supporter = (this.account.supporter & ~3 /* SupporterMask */) | level;
        this.model.setSupporterFlags(this.account._id, supporter);
    }
    hasSupporterFlag(value) {
        return utils_1.hasFlag(this.account.supporter, value);
    }
    toggleSupporterFlag(value) {
        this.model.setSupporterFlags(this.account._id, this.account.supporter ^ value);
    }
    // past supporter
    get isForcePastSupporter() {
        return utils_1.hasFlag(this.account.supporter, 512 /* ForcePastSupporter */);
    }
    get isIgnorePastSupporter() {
        return utils_1.hasFlag(this.account.supporter, 1024 /* IgnorePastSupporter */);
    }
    toggleForcePastSupporter() {
        const has = utils_1.hasFlag(this.account.supporter, 512 /* ForcePastSupporter */);
        const supporter = utils_1.setFlag(this.account.supporter, 512 /* ForcePastSupporter */, !has);
        this.model.setSupporterFlags(this.account._id, supporter);
    }
    toggleIgnorePastSupporter() {
        const has = utils_1.hasFlag(this.account.supporter, 1024 /* IgnorePastSupporter */);
        const supporter = utils_1.setFlag(this.account.supporter, 1024 /* IgnorePastSupporter */, !has);
        this.model.setSupporterFlags(this.account._id, supporter);
    }
};
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AccountInfo.prototype, "account", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AccountInfo.prototype, "extendedAuths", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String)
], AccountInfo.prototype, "popoverPlacement", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Object)
], AccountInfo.prototype, "showDuplicates", void 0);
tslib_1.__decorate([
    core_1.ViewChild('alertModal', { static: true }),
    tslib_1.__metadata("design:type", core_1.TemplateRef)
], AccountInfo.prototype, "alertModal", void 0);
AccountInfo = tslib_1.__decorate([
    core_1.Component({
        selector: 'account-info',
        templateUrl: 'account-info.pug',
        styleUrls: ['account-info.scss'],
    }),
    tslib_1.__metadata("design:paramtypes", [adminModel_1.AdminModel, modal_1.BsModalService])
], AccountInfo);
exports.AccountInfo = AccountInfo;
//# sourceMappingURL=account-info.js.map