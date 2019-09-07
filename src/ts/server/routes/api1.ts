import { Router } from 'express';
import { noop } from 'lodash';
import { findAllCharacters, findAllVisibleAuths, IAccount, Account } from '../db';
import { offline, hash, handleJSON } from '../requestUtils';
import { createGetAccountData } from '../api/account';
import { Settings, ServerConfig } from '../../common/adminInterfaces';
import { includes } from '../../common/utils';

const blockApps: string[] = [];
const MAX_CONCURRENT_REQUESTS = 100;
let requests = 0;

export default function (server: ServerConfig, settings: Settings) {
	const app = Router();

	const getAccountData = createGetAccountData(findAllCharacters, findAllVisibleAuths);

	async function handleAccountRequest(account: IAccount, userAgent?: string, browserId?: string) {
		if (requests < MAX_CONCURRENT_REQUESTS) {
			requests++;

			try {
				const lastUserAgent = userAgent || account.lastUserAgent;
				const lastBrowserId = browserId || account.lastBrowserId;

				if ((lastUserAgent && account.lastUserAgent !== lastUserAgent) ||
					(lastBrowserId && account.lastBrowserId !== lastBrowserId)) {
					account.lastUserAgent = lastUserAgent;
					account.lastBrowserId = lastBrowserId;
					Account.updateOne({ _id: account._id }, { lastUserAgent, lastBrowserId }, noop);
				}

				return await getAccountData(account);
			} finally {
				requests--;
			}
		} else {
			return { limit: true };
		}
	}

	app.post('/account', offline(settings), hash, (req, res) => {
		req.session!.touch();

		let account = req.user as IAccount | undefined;
		const browserId = req.get('Api-Bid');
		const userAgent = req.get('User-Agent') || '';
		const requestedWith = req.get('X-Requested-With');
		const isWebViewUserAgent = /Chrome\/\d+\.0\.0\.0 Mobile|; wv\)/.test(userAgent);
		const isWebView = requestedWith || isWebViewUserAgent;

		if (!account || (settings.blockWebView && isWebView && includes(blockApps, requestedWith))) {
			handleJSON(server, req, res, null);
		} else {
			handleJSON(server, req, res, handleAccountRequest(account, userAgent, browserId));
		}
	});

	return app;
}
