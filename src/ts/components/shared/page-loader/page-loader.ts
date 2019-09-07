import { Component } from '@angular/core';
import { faSpinner } from '../../../client/icons';
import { Model } from '../../services/model';
import { hardReload } from '../../../client/clientUtils';

@Component({
	selector: 'page-loader',
	templateUrl: 'page-loader.pug',
	styleUrls: ['page-loader.scss'],
})
export class PageLoader {
	readonly spinnerIcon = faSpinner;
	constructor(private model: Model) {
	}
	get loading() {
		return this.model.loading;
	}
	get updating() {
		return this.model.updating;
	}
	get updatingTakesLongTime() {
		return this.model.updatingTakesLongTime;
	}
	get loadingError() {
		return this.model.loadingError;
	}
	reload() {
		hardReload();
	}
}
