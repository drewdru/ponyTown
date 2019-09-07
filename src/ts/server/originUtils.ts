import { Request } from 'express';
import { IOriginInfo, IAccount, Account } from './db';
import { config } from './config';
import { logger } from './logger';
import { OriginInfoBase } from '../common/adminInterfaces';

const get_ip = require('ipware')().get_ip;

export function getIP(req: { headers: any; }) {
	return req.headers['cf-connecting-ip'] || (get_ip(req) ? get_ip(req).clientIp : null);
}

export function getOriginFromHTTP(req: { headers: any; }): IOriginInfo {
	const ip = getIP(req) || '0.0.0.0';
	const ipcountry = (ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip === '::1') ? 'LOCAL' : '';
	const country = ipcountry || req.headers['cf-ipcountry'] || '??';
	return { ip, country, last: new Date() };
}

export function getOrigin(req: Request): IOriginInfo {
	const origin = getOriginFromHTTP(req);

	if (origin.country === '??' && config.proxy) {
		logger.warn('Invalid IP', JSON.stringify(req.ips));
		//create(null, null, null).danger('Invalid IP', JSON.stringify(req.ips));
	}

	return origin;
}

export async function addOrigin(account: IAccount, origin: IOriginInfo) {
	try {
		const _id = account._id;
		const existingOrigin = account.origins && account.origins
			.find(o => o.ip === origin.ip) as (OriginInfoBase & { _id: any }) | undefined;

		if (existingOrigin) {
			await Account.updateOne({ _id, 'origins._id': existingOrigin._id }, { $set: { 'origins.$.last': new Date() } }).exec();
		} else {
			await Account.updateOne({ _id }, { $push: { origins: origin } }).exec();
		}
	} catch (e) {
		logger.error('Failed to add origin', e);
	}
}
