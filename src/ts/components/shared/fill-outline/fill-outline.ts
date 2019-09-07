import { Component, Input, Output, EventEmitter } from '@angular/core';
import { faLock } from '../../../client/icons';

@Component({
	selector: 'fill-outline',
	templateUrl: 'fill-outline.pug',
	styleUrls: ['fill-outline.scss'],
})
export class FillOutline {
	readonly lockIcon = faLock;
	@Input() label = 'Color';
	@Input() indicatorColor = '';
	@Input() base?: string;
	@Input() fill?: string;
	@Output() fillChange = new EventEmitter<string>();
	@Input() outline?: string;
	@Output() outlineChange = new EventEmitter<string>();
	@Input() locked?: boolean;
	@Output() lockedChange = new EventEmitter<boolean>();
	@Input() nonLockable = false;
	@Input() outlineLocked = false;
	@Output() outlineLockedChange = new EventEmitter<boolean>();
	@Input() outlineHidden = false;
	@Output() change = new EventEmitter<void>();
	get hasLock() {
		return this.locked !== undefined;
	}
	onChange() {
		this.change.emit();
	}
	onFillChange(value: string) {
		this.fillChange.emit(value);
		this.onChange();
	}
	onOutlineChange(value: string) {
		this.outlineChange.emit(value);
		this.onChange();
	}
	onLockedChange(value: boolean) {
		this.lockedChange.emit(value);
		this.onChange();
	}
	onOutlineLockedChange(value: boolean) {
		this.outlineLockedChange.emit(value);
		this.onChange();
	}
}
