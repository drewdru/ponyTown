import { escapeRegExp } from 'lodash';
import { ErrorHandler, getMethods } from 'ag-sockets';
import * as Rollbar from 'rollbar';
import { IClient } from '../serverInterfaces';
import { logger } from '../logger';
import { isUserError, reportUserError2 } from '../userError';
import { includes } from '../../common/utils';
import { create } from '../reporter';
import { ServerConfig } from '../../common/adminInterfaces';
import { getOriginFromHTTP } from '../originUtils';
import { ServerActions } from '../serverActions';

const reporterIgnore = /^rate limit exceeded/i;
const ignoreErrors = [
	'String message while forced binary',
];
const rollbarIgnore = new RegExp('^(' + [
	'reserved fields must be empty',
	'rate limit exceeded',
	'transfer limit exceeded',
	'some error',
	'Invalid token',
	'Action not allowed',
	'Client does not exist',
	'Cannot perform this action on admin user',
	'Account creation is temporarily disabled',
	'Not a number',
	'Not a string',
	...ignoreErrors,
].map(escapeRegExp).join('|') + ')', 'i');

let lastError = '';
let lastErrorTime = 0;

function formatMessage(message: string | Uint8Array | null | undefined) {
	if (message === null) {
		return '<null>';
	} else if (message === undefined) {
		return '<undefined>';
	} else if (typeof message === 'string') {
		return message;
	} else if (message instanceof Uint8Array) {
		return `<${Array.from(message).toString()}>`;
	} else {
		return `<${JSON.stringify(message)}>`;
	}
}

function getPerson(client: IClient | undefined) {
	return client && client.account ? {
		id: client.accountId,
		username: client.account.name,
	} : {};
}

function reportError(rollbar: Rollbar | undefined, e: Error, client: IClient | undefined, config: ServerConfig) {
	if (isUserError(e)) {
		reportUserError2(e, client);
		return e;
	} else {
		if (client && client.reporter && !reporterIgnore.test(e.message)) {
			client.reporter.error(e);
		} else if (client && client.originalRequest) {
			const origin = client.originalRequest && getOriginFromHTTP(client.originalRequest);
			create(config, undefined, undefined, origin).error(e);
		} else {
			create(config).error(e);
		}

		if (!rollbarIgnore.test(e.message)) {
			rollbar && rollbar.error(e, null as any, { person: getPerson(client) });
		}

		return new Error('Error occurred');
	}
}

const serverMethods = getMethods(ServerActions);

function getMethodNameFromPacket(packet: string | Uint8Array) {
	try {
		if (typeof packet === 'string') {
			const values = JSON.parse(packet);
			return serverMethods[values[0]].name;
		} else {
			return serverMethods[packet[0]].name;
		}
	} catch {
		return '???';
	}
}

function reportRateLimit(client: IClient, e: Error, message: string) {
	let reported = false;

	if (client.rateLimitMessage === e.message && client.rateLimitCount) {
		if (++client.rateLimitCount > 5) {
			reported = true;
			client.reporter.warn(`${e.message} (x5)`, message);
			client.rateLimitCount = 1;
			client.disconnect(true, true);
		}
	} else {
		client.rateLimitMessage = e.message;
		client.rateLimitCount = 1;
	}

	return reported;
}

export class SocketErrorHandler implements ErrorHandler {
	constructor(private rollbar: Rollbar | undefined, private config: ServerConfig) {
	}
	handleError(client: IClient | null, e: Error) {
		if (!/no server for given id/i.test(e.message)) {
			reportError(this.rollbar, e, client || undefined, this.config);
		}
	}
	handleRejection(client: IClient, e: Error) {
		if (/^rate limit exceeded/i.test(e.message)) {
			reportRateLimit(client, e, 'rejection');
			return new Error('Error occurred');
		} else {
			return reportError(this.rollbar, e, client, this.config);
		}
	}
	handleRecvError(client: IClient, e: Error, socketMessage: string | Uint8Array) {
		if (lastError === e.message && Date.now() < (lastErrorTime + 5000))
			return;

		const message = formatMessage(socketMessage);
		const method = getMethodNameFromPacket(socketMessage);
		let reported = false;

		if (client.reporter) {
			if (/^rate limit exceeded/i.test(e.message)) {
				reported = reportRateLimit(client, e, message);
			} else if (/^transfer limit exceeded/i.test(e.message)) {
				reported = true;
				const desc = e.message.replace(/transfer limit exceeded /i, '');
				client.reporter.warn('Transfer limit exceeded', `${desc} - (${method}) ${message}`);
			} else if (!includes(ignoreErrors, e.message)) {
				reported = true;
				client.reporter.error(e, `(${method}) ${message}`);
			}
		}

		lastError = e.message;
		lastErrorTime = Date.now();

		if (!reported && !rollbarIgnore.test(e.message || '')) {
			logger.error(`recv error: ${e.stack || e}\n\n    message: ${message}`);
			this.rollbar && this.rollbar.error(e, null as any, { custom: { message }, person: getPerson(client) });
		}
	}
}
