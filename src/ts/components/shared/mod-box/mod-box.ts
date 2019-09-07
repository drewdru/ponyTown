import { Component, Input, OnDestroy } from '@angular/core';
import { ModAction, Pony } from '../../../common/interfaces';
import { TIMEOUTS } from '../../../common/constants';
import { Model } from '../../services/model';
import { PonyTownGame } from '../../../client/game';
import { faFlag, faStickyNote, faMicrophoneSlash, faEyeSlash, faUserCog, faExclamationCircle } from '../../../client/icons';

const ageLabels = ['', 'M', 'A', '', '', '[M]', '[A]'];
const ageTitles = ['Not set', 'Minor', 'Adult', '', '', 'Minor (locked)', 'Adult (locked)'];

@Component({
	selector: 'mod-box',
	templateUrl: 'mod-box.pug',
	styleUrls: ['mod-box.scss'],
})
export class ModBox implements OnDestroy {
	readonly flagIcon = faFlag;
	readonly noteIcon = faStickyNote;
	readonly muteIcon = faMicrophoneSlash;
	readonly hideIcon = faEyeSlash;
	readonly moreIcon = faUserCog;
	readonly dangerIcon = faExclamationCircle;
	readonly timeouts = TIMEOUTS;
	@Input() pony!: Pony;
	isNoteOpen = false;
	constructor(private model: Model, private game: PonyTownGame) {
	}
	get ageLabel() {
		return ageLabels[this.modInfo && this.modInfo.age || 0];
	}
	get ageTitle() {
		return ageTitles[this.modInfo && this.modInfo.age || 0];
	}
	get modInfo() {
		return this.pony.modInfo;
	}
	get account() {
		return this.modInfo && this.modInfo.account;
	}
	get country() {
		return this.modInfo && this.modInfo.country;
	}
	get mute() {
		return this.modInfo && this.modInfo.mute;
	}
	get muteTooltip() {
		return this.mute ? (this.mute === 'perma' ? 'Permanently Muted' : `Muted for ${this.mute}`) : 'Mute';
	}
	get shadow() {
		return this.modInfo && this.modInfo.shadow;
	}
	get shadowTooltip() {
		return this.shadow ? (this.shadow === 'perma' ? 'Permanently Shadowed' : `Shadowed for ${this.shadow}`) : 'Shadow';
	}
	get counters() {
		return this.modInfo && this.modInfo.counters;
	}
	get hasCounters() {
		const counters = this.counters;
		return counters && (counters.spam || counters.swears || counters.timeouts);
	}
	get check() {
		return this.model.modCheck;
	}
	get note() {
		return this.modInfo && this.modInfo.note;
	}
	set note(value) {
		if (this.modInfo) {
			this.modInfo.note = value;
		}
	}
	ngOnDestroy() {
		if (this.isNoteOpen) {
			this.blur();
		}
	}
	className(value: string) {
		return value ? (value === 'perma' ? 'btn-danger' : 'btn-warning') : 'btn-default';
	}
	report() {
		this.modAction(ModAction.Report);
	}
	setMute(value: number) {
		this.modAction(ModAction.Mute, value);
	}
	setShadow(value: number) {
		this.modAction(ModAction.Shadow, value);
	}
	blur() {
		this.game.send(server => server.setNote(this.pony.id, this.modInfo && this.modInfo.note || ''));
		this.isNoteOpen = false;
	}
	modAction(type: ModAction, param = 0) {
		return this.game.send(server => server.otherAction(this.pony.id, type, param));
	}
}
