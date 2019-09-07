import {
	Component, Input, EventEmitter, Output, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, NgZone
} from '@angular/core';
import { TIMEOUTS } from '../../../../common/constants';
import { BannedMuted } from '../../../../common/adminInterfaces';
import { IntervalUpdateService } from '../../../services/intervalUpdateService';
import { faClock, faMicrophoneSlash, faEyeSlash, faBan } from '../../../../client/icons';

const ICONS = {
	mute: faMicrophoneSlash,
	shadow: faEyeSlash,
	ban: faBan,
};

@Component({
	selector: 'ban-icon',
	templateUrl: 'ban-icon.pug',
	styleUrls: ['ban-icon.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BanIcon implements OnInit, OnDestroy, OnChanges {
	readonly timeouts = TIMEOUTS;
	readonly clockIcon = faClock;
	@Input() type: keyof BannedMuted = 'ban';
	@Input() value = 0;
	@Output() toggle = new EventEmitter<number>();
	get icon() {
		return ICONS[this.type] || ICONS.ban;
	}
	get isPerma() {
		return this.value === -1;
	}
	get isTimedOut() {
		return this.value > Date.now();
	}
	get className() {
		if (this.isPerma) {
			return 'text-banned';
		} else if (this.isTimedOut) {
			return 'text-alert';
		} else {
			return 'text-muted';
		}
	}
	private timedOut = false;
	private toggleUpdate: (on: boolean) => void;
	constructor(zone: NgZone, updateService: IntervalUpdateService) {
		this.toggleUpdate = updateService.toggle(() => {
			if (this.timedOut !== this.isTimedOut) {
				zone.run(() => this.timedOut = this.isTimedOut);
				this.toggleUpdate(this.isTimedOut);
			}
		});
	}
	ngOnInit() {
		this.toggleUpdate(this.isTimedOut);
	}
	ngOnChanges() {
		this.toggleUpdate(this.isTimedOut);
	}
	ngOnDestroy() {
		this.toggleUpdate(false);
	}
	clear() {
		this.setValue(0);
	}
	perma() {
		this.setValue(-1);
	}
	timeout(value: number) {
		this.setValue(Date.now() + value);
	}
	private setValue(value: number) {
		this.value = value;
		this.toggle.emit(value);
	}
}
