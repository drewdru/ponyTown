import { Request } from 'express';
import { truncate } from 'lodash';
import { Reporter } from './serverInterfaces';
import { Event, IEvent, IOriginInfo, ID, IAccount } from './db';
import { logger, system } from './logger';
import { ServerConfig } from '../common/adminInterfaces';
import { getOrigin } from './originUtils';

const maxDescLength = 300;

/* istanbul ignore next */
const createLogEvent =
	(config: ServerConfig) =>
		(
			account: ID | undefined, pony: ID | undefined, originInfo: IOriginInfo | undefined, type: string,
			message: string, desc?: string
		) => {
			const server = config.id;

			if (desc) {
				desc = truncate(desc, { length: maxDescLength });
			}

			const origin = originInfo && { ip: originInfo.ip, country: originInfo.country };

			Event.findOne({ server, account, pony, type, message, origin }).exec()
				.then(event => {
					if (event) {
						if (!event.desc || (event.desc.length < maxDescLength && desc && event.desc.indexOf(desc) === -1)) {
							event.desc = `${event.desc || ''}\n${desc || ''}`.trim();
						}

						return Event.updateOne({ _id: event._id }, { desc: event.desc, count: event.count + 1 }).exec();
					} else {
						return Event.create(<IEvent>{ server, account, pony, type, message, origin, desc });
					}
				})
				.catch(logger.error);

			return null;
		};

const ignoreWarnings = ['Suspicious message', 'Spam'];

/* istanbul ignore next */
export function create(server: ServerConfig, account?: ID, pony?: ID, originInfo?: IOriginInfo): Reporter {
	const logEvent = createLogEvent(server);
	const accountId = `${account}`;

	function log(type: string, message: string, desc?: string) {
		logEvent(account, pony, originInfo, type, message, desc);

		if (DEVELOPMENT) {
			logger.debug('[event]', `[${type}]`, message);
		}
	}

	return {
		info(message: string, desc?: string) {
			log('info', message, desc);
		},
		warn(message: string, desc?: string) {
			log('warning', message, desc);

			if (ignoreWarnings.indexOf(message) === -1) {
				system(accountId, message);
			}
		},
		warnLog(message: string) {
			logger.warn(message);
		},
		danger(message: string, desc?: string) {
			log('danger', message, desc);
			logger.error(message, desc || '');
		},
		error(error: Error, desc?: string) {
			log('danger', error.message, desc);
			logger.error(error, desc || '');
		},
		system(message: string, desc?: string, logEvent = true) {
			if (logEvent) {
				log('info', message, desc);
			}

			system(accountId, message);
		},
		systemLog(message: string) {
			system(accountId, message);
			DEVELOPMENT && logger.log(message);
		},
		setPony(newPony: any) {
			pony = newPony;
		},
	};
}

/* istanbul ignore next */
export function createFromRequest(server: ServerConfig, req: Request, pony?: any) {
	const user = req && req.user as IAccount | undefined;
	const account = user ? user.id : undefined;
	const origin = req ? getOrigin(req) : undefined;
	return create(server, account, pony, origin);
}
