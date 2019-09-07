import { ErrorHandler, Injectable, Injector, InjectionToken } from '@angular/core';
import * as Rollbar from 'rollbar';
import { version } from '../../client/data';
import { HASH } from '../../generated/hash';
import { ROLLBAR_ENV, ROLLBAR_TOKEN } from '../../generated/rollbarConfig';
import { rollbarCheckIgnore, isIgnoredError } from '../../common/rollbar';

const host = typeof location === 'undefined' ? '' : location.host;

const rollbarConfig = {
	environment: ROLLBAR_ENV,
	accessToken: ROLLBAR_TOKEN,
	ignoredMessages: ['disconnected'],
	hostWhiteList: [host],
	captureUncaught: true,
	captureUnhandleRejections: true,
	// checkIgnore,
	enabled: true,
	payload: {
		environment: ROLLBAR_ENV,
		version: version, // NOTE: workaround for compilation issue
		client: {
			javascript: {
				source_map_enabled: true,
				guess_uncaught_frames: true,
				code_version: HASH,
			},
		},
	},
};

export const RollbarService = new InjectionToken<Rollbar>('rollbar');

export function rollbarFactory() {
	if (DEVELOPMENT) {
		return undefined;
	} else {
		const rollbar = Rollbar.init(rollbarConfig);
		rollbar.configure({ checkIgnore: rollbarCheckIgnore });
		return rollbar;
	}
}

@Injectable()
export class RollbarErrorHandler extends ErrorHandler {
	constructor(private injector: Injector) {
		super();
	}
	handleError(error: any) {
		super.handleError(error);

		if (!DEVELOPMENT && rollbarConfig.accessToken) {
			const rollbar = this.injector.get(RollbarService);
			const err = error.originalError || error || {};

			if (!isIgnoredError(err)) {
				rollbar.error(err);
			}
		}
	}
}
