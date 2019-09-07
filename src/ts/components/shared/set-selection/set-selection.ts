import { Component, Input, Output, EventEmitter, OnChanges, Directive, Optional } from '@angular/core';
import { clamp } from 'lodash';
import { SpriteSet, ColorExtraSets, ColorExtraSet } from '../../../common/interfaces';
import { getColorCount } from '../../../client/spriteUtils';

const FILLS = ['Orange', 'DodgerBlue', 'LimeGreen', 'Orchid', 'crimson', 'Aquamarine'];
const OUTLINES = ['Chocolate', 'SteelBlue', 'ForestGreen', 'DarkOrchid', 'darkred', 'DarkTurquoise'];

@Directive({
	selector: '[setOutlineHidden]',
})
export class SetOutlineHidden {
	@Input() setOutlineHidden = false;
}

@Component({
	selector: 'set-selection',
	templateUrl: 'set-selection.pug',
	styleUrls: ['set-selection.scss'],
})
export class SetSelection implements OnChanges {
	readonly exampleFills = FILLS;
	readonly exampleOutlines = OUTLINES;
	@Input() label?: string;
	@Input() base?: string;
	@Input() set?: SpriteSet<string>;
	@Input() sets?: ColorExtraSets;
	@Input() sprites?: ColorExtraSet;
	@Input() circle?: string;
	@Input() outlineHidden = false;
	@Input() nonLockable = false;
	@Input() compact = false;
	@Input() onlyPatterns = false;
	@Input() darken = true;
	@Output() change = new EventEmitter<void>();
	constructor(@Optional() private hidden: SetOutlineHidden) {
	}
	get isOutlineHidden() {
		return this.hidden ? this.hidden.setOutlineHidden : this.outlineHidden;
	}
	get patternColors() {
		const set = this.getSet();
		const pat = this.set && set && set[this.set.pattern || 0];

		if (pat && !pat.colors) {
			return 0;
		} else if (pat) {
			return getColorCount(pat);
		} else {
			return this.nonLockable ? 1 : 0;
		}
	}
	get showColorPatterns(): boolean {
		const type = this.set && this.set.type || 0;
		const set = this.sets && this.sets[type];
		return !!set && set.length > 1;
	}
	ngOnChanges() {
		this.sprites = this.sets ? this.sets.map(s => s ? s[0] : undefined) : undefined;
	}
	onChange() {
		const set = this.getSet();

		if (this.set && set) {
			this.set.pattern = clamp(this.set.pattern || 0, 0, set.length - 1);
		}

		this.change.emit();
	}
	private getSet(): ColorExtraSet | undefined {
		return this.set && this.sets && this.sets[this.set.type || 0];
	}
}
