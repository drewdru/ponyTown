import { Component, Input } from '@angular/core';
import { fill } from 'lodash';
import { PonyInfo } from '../../../common/interfaces';
import { CM_SIZE } from '../../../common/constants';
import { faTrash, faEraser, faPaintBrush, faEyeDropper } from '../../../client/icons';

export interface ButtMarkEditorState {
	brushType: string;
	brush: string;
}

@Component({
	selector: 'butt-mark-editor',
	templateUrl: 'butt-mark-editor.pug',
})
export class ButtMarkEditor {
	readonly trashIcon = faTrash;
	readonly eraserIcon = faEraser;
	readonly eyeDropperIcon = faEyeDropper;
	readonly paintBrushIcon = faPaintBrush;
	readonly cmSize = CM_SIZE;
	@Input() info!: PonyInfo;
	@Input() state = {
		brushType: 'brush',
		brush: 'orange',
	};
	clearCM() {
		fill(this.info.cm!, '');
	}
}
