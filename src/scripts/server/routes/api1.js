"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lodash_1 = require("lodash");
const db_1 = require("../db");
const requestUtils_1 = require("../requestUtils");
const account_1 = require("../api/account");
const utils_1 = require("../../common/utils");
const blockApps = [];
const MAX_CONCURRENT_REQUESTS = 100;
let requests = 0;
function default_1(server, settings) {
    const app = express_1.Router();
    const getAccountData = account_1.createGetAccountData(db_1.findAllCharacters, db_1.findAllVisibleAuths);
    async function handleAccountRequest(account, userAgent, browserId) {
        if (requests < MAX_CONCURRENT_REQUESTS) {
            requests++;
            try {
                const lastUserAgent = userAgent || account.lastUserAgent;
                const lastBrowserId = browserId || account.lastBrowserId;
                if ((lastUserAgent && account.lastUserAgent !== lastUserAgent) ||
                    (lastBrowserId && account.lastBrowserId !== lastBrowserId)) {
                    account.lastUserAgent = lastUserAgent;
                    account.lastBrowserId = lastBrowserId;
                    db_1.Account.updateOne({ _id: account._id }, { lastUserAgent, lastBrowserId }, lodash_1.noop);
                }
                return await getAccountData(account);
            }
            finally {
                requests--;
            }
        }
        else {
            return { limit: true };
        }
    }
    app.post('/account', requestUtils_1.offline(settings), requestUtils_1.hash, (req, res) => {
        req.session.touch();
        let account = req.user;
        const browserId = req.get('Api-Bid');
        const userAgent = req.get('User-Agent') || '';
        const requestedWith = req.get('X-Requested-With');
        const isWebViewUserAgent = /Chrome\/\d+\.0\.0\.0 Mobile|; wv\)/.test(userAgent);
        const isWebView = requestedWith || isWebViewUserAgent;
        if (!account || (settings.blockWebView && isWebView && utils_1.includes(blockApps, requestedWith))) {
            requestUtils_1.handleJSON(server, req, res, null);
        }
        else {
            requestUtils_1.handleJSON(server, req, res, handleAccountRequest(account, userAgent, browserId));
        }
    });
    return app;
}
exports.default = default_1;
//# sourceMappingURL=api1.js.map