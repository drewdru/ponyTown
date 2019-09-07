import { Request } from 'express';
import { logger } from './logger';
import { createFromRequest } from './reporter';
import { IClient, Reporter } from './serverInterfaces';
import { ServerConfig } from '../common/adminInterfaces';

export interface UserErrorInfo {
	error?: Error;
	message?: string;
	desc?: string;
	data?: any;
	log?: string;
}

export class UserError extends Error {
	//static name: string;
	constructor(public message: string, public info?: UserErrorInfo, public userInfo?: string) {
		super(message);
		Object.defineProperty(this, 'name', { value: 'UserError' });
		Error.captureStackTrace(this, UserError);
	}
}

export function isUserError(e: Error): e is UserError {
	return e.name === 'UserError';
}

function report(message: string, info: UserErrorInfo, reporter: Reporter | undefined, extra = '') {
	const keys = Object.keys(info);

	if (keys.length === 1 && keys[0] === 'log') {
		logger.log(info.log);
	} else {
		if (reporter) {
			reporter.warn((info.error && info.error.message) || info.message || message || '<no message>', info.desc);
		}

		logger.warn(info.error || info.message || message || '<no message>', info.desc || '', info.data || '', extra);
	}
}

export function reportUserError(e: UserError, server: ServerConfig, req: Request) {
	if (e.info) {
		report(e.message, e.info, createFromRequest(server, req), `${req.url} ${req.ip}`);
	}
}

export function reportUserError2(e: UserError, client: IClient | undefined) {
	if (e.info) {
		report(e.message, e.info, client && client.reporter);
	}
}
