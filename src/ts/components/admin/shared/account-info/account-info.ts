import { Component, Input, OnChanges, SimpleChanges, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { compact } from 'lodash';
import { DAY, MINUTE, HOUR } from '../../../../common/constants';
import { hasFlag, fromNow, toInt, setFlag } from '../../../../common/utils';
import {
	Account, AccountFlags, accountCounters, accountFlags, SupporterFlags, supporterFlags, BannedMuted, DuplicatesInfo
} from '../../../../common/adminInterfaces';
import { supporterLevel, patreonSupporterLevel, getAge, isPastSupporter } from '../../../../common/adminUtils';
import { AdminModel } from '../../../services/adminModel';
import { AccountCounters } from '../../../../common/interfaces';
import {
	faPatreon, faCog, faMinus, faPlus, faCheck, faFlag, faStickyNote, faCertificate, faIdBadge, faEnvelope, faFont,
	faClock, faBan, faMapMarkerAlt
} from '../../../../client/icons';

const EMPTY_ROLES: string[] = [];
const oldTime = fromNow(-14 * DAY).getTime();
const newTime = fromNow(-DAY).getTime();

const accountDuplicatesIntervalTime = 10 * MINUTE;
const accountDuplicates = new Map<string, DuplicatesInfo>();

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
	{ name: '1h', length: HOUR },
	{ name: '5h', length: 5 * HOUR },
	{ name: '12h', length: 12 * HOUR },
	{ name: '1d', length: DAY },
	{ name: '2d', length: 2 * DAY },
	{ name: '5d', length: 5 * DAY },
	{ name: '7d', length: 7 * DAY },
	{ name: '2w', length: 14 * DAY },
];

@Component({
	selector: 'account-info',
	templateUrl: 'account-info.pug',
	styleUrls: ['account-info.scss'],
})
export class AccountInfo implements OnInit, OnChanges {
	readonly counters = accountCounters;
	readonly flags = accountFlags;
	readonly supporterFlags = supporterFlags;
	readonly cogIcon = faCog;
	readonly minusIcon = faMinus;
	readonly plusIcon = faPlus;
	readonly checkIcon = faCheck;
	readonly flagIcon = faFlag;
	readonly noteIcon = faStickyNote;
	readonly newIcon = faCertificate;
	readonly duplicateBrowserIdIcon = faIdBadge;
	readonly duplicateEmailIcon = faEnvelope;
	readonly duplicateNameIcon = faFont;
	readonly duplicatePermaIcon = faBan;
	readonly teleportIcon = faMapMarkerAlt;
	predefinedAlerts = predefinedAlerts;
	alertExpires = alertExpires;
	alertExpire = alertExpires[3];
	alertMessage = '';
	@Input() account!: Account;
	@Input() extendedAuths = false;
	@Input() popoverPlacement?: string;
	@Input() showDuplicates = false;
	@ViewChild('alertModal', { static: true }) alertModal!: TemplateRef<any>;
	note?: string;
	duplicates?: DuplicatesInfo;
	private alertModalRef?: BsModalRef;
	private _isNoteOpen = false;
	constructor(private model: AdminModel, private modalService: BsModalService) {
	}
	ngOnInit() {
		this.updateDuplicates();
	}
	ngOnChanges(changes: SimpleChanges) {
		if (changes.account) {
			this.updateDuplicates();
		}
	}
	get age() {
		return this.account.birthdate ? getAge(this.account.birthdate) : '-';
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
	set isNoteOpen(value: boolean) {
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
		} else if (!counters && !this.account.supporter) {
			return 'text-muted';
		} else if (counters && ((counters.spam || 0) > 100 || (counters.swears || 0) > 10)) {
			return 'text-alert';
		} else {
			return 'text-present';
		}
	}
	get hasDuplicateNote() {
		return this.account.note && /duplicate/i.test(this.account.note);
	}
	hasFlag(value: AccountFlags) {
		return hasFlag(this.account.flags, value);
	}
	toggleFlag(value: AccountFlags) {
		this.model.setAccountFlags(this.account._id, this.account.flags ^ value);
	}
	toggleBan(field: keyof BannedMuted, value: number) {
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
	decrementCounter(name: keyof AccountCounters) {
		if (this.getCounter(name) > 0) {
			this.setCounter(name, this.getCounter(name) - 1);
		}
	}
	incrementCounter(name: keyof AccountCounters) {
		this.setCounter(name, this.getCounter(name) + 1);
	}
	getCounter(name: keyof AccountCounters) {
		const counters = this.account.counters;
		return toInt(counters && counters[name]);
	}
	setCounter(name: keyof AccountCounters, value: number) {
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
	private updateDuplicates() {
		const account = this.account;

		if (this.showDuplicates && account) {
			const cached = accountDuplicates.get(account._id);
			const threshold = fromNow(-accountDuplicatesIntervalTime);

			if (cached && cached.generatedAt > threshold.getTime()) {
				this.duplicates = cached;
			} else {
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
		return supporterLevel(this.account) ? 'badge-success' : 'badge-warning';
	}
	get supporterTitle() {
		const supporter = this.account.supporter!;
		const flagSupporter = (supporter & SupporterFlags.SupporterMask) !== 0;
		const patreonSupporter = patreonSupporterLevel(this.account);
		const ignorePatreon = hasFlag(supporter, SupporterFlags.IgnorePatreon);
		const pastSupporter = hasFlag(supporter, SupporterFlags.PastSupporter);

		return compact([
			flagSupporter && 'flags',
			patreonSupporter && `patreon`,
			ignorePatreon && 'ignore',
			!patreonSupporter && this.account.supporterDeclinedSince && 'declined',
			pastSupporter && 'past',
		]).join(', ');
	}
	get supporterIcon() {
		const hasPatreon = patreonSupporterLevel(this.account);
		const hasIgnoreFlag = hasFlag(this.account.supporter, SupporterFlags.IgnorePatreon);
		const hasDeclined = !!this.account.supporterDeclinedSince;
		return hasPatreon ? faPatreon : ((hasIgnoreFlag || !hasDeclined) ? faFlag : faClock);
	}
	get hasAnySupporter() {
		return (this.account.supporter! & SupporterFlags.SupporterMask) !== 0;
	}
	get hasPastSupporter() {
		return hasFlag(this.account.supporter, SupporterFlags.PastSupporter);
	}
	get supporterLevel() {
		return supporterLevel(this.account);
	}
	get supporterLevelString() {
		const level = supporterLevel(this.account);
		return level ? level : (isPastSupporter(this.account) ? 'P' : '');
	}
	isSupporter(level: number) {
		return (this.account.supporter! & SupporterFlags.SupporterMask) === level;
	}
	setSupporter(level: number) {
		const supporter = (this.account.supporter! & ~SupporterFlags.SupporterMask) | level;
		this.model.setSupporterFlags(this.account._id, supporter);
	}
	hasSupporterFlag(value: SupporterFlags) {
		return hasFlag(this.account.supporter, value);
	}
	toggleSupporterFlag(value: SupporterFlags) {
		this.model.setSupporterFlags(this.account._id, this.account.supporter! ^ value);
	}
	// past supporter
	get isForcePastSupporter() {
		return hasFlag(this.account.supporter, SupporterFlags.ForcePastSupporter);
	}
	get isIgnorePastSupporter() {
		return hasFlag(this.account.supporter, SupporterFlags.IgnorePastSupporter);
	}
	toggleForcePastSupporter() {
		const has = hasFlag(this.account.supporter, SupporterFlags.ForcePastSupporter);
		const supporter = setFlag(this.account.supporter, SupporterFlags.ForcePastSupporter, !has);
		this.model.setSupporterFlags(this.account._id, supporter);
	}
	toggleIgnorePastSupporter() {
		const has = hasFlag(this.account.supporter, SupporterFlags.IgnorePastSupporter);
		const supporter = setFlag(this.account.supporter, SupporterFlags.IgnorePastSupporter, !has);
		this.model.setSupporterFlags(this.account._id, supporter);
	}
}
