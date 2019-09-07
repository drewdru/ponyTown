import { Injectable, Inject } from '@angular/core';
import * as Rollbar from 'rollbar';
import { Person, rollbarCheckIgnore, isIgnoredError } from '../../common/rollbar';
import { RollbarService } from './rollbarErrorHandler';
import { ErrorReporter } from './errorReporter';

@Injectable()
export class RollbarErrorReporter extends ErrorReporter {
	constructor(@Inject(RollbarService) private rollbar?: Rollbar) {
		super();
	}
	configureUser(person: Person) {
		if (this.rollbar) {
			this.rollbar.configure({ payload: { person }, checkIgnore: rollbarCheckIgnore });
		}
	}
	configureData(data: any) {
		if (this.rollbar) {
			this.rollbar.configure({ payload: data, checkIgnore: rollbarCheckIgnore });
		}
	}
	captureEvent(data: any) {
		if (this.rollbar) {
			this.rollbar.captureEvent(data, 'info');
		}
	}
	reportError(error: any, data?: any) {
		DEVELOPMENT && console.error(error, data);

		if (this.rollbar && !isIgnoredError(error)) {
			this.rollbar.error(error, data);
		}
	}
	disable() {
		if (this.rollbar) {
			this.rollbar.configure({ enabled: false });
		}
	}
}
