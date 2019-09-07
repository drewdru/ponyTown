"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const ExpressBrute = require("express-brute");
const lodash_1 = require("lodash");
const hash_1 = require("../generated/hash");
const accountUtils_1 = require("../common/accountUtils");
const errors_1 = require("../common/errors");
const logger_1 = require("./logger");
const reporter_1 = require("./reporter");
const userError_1 = require("./userError");
const originUtils_1 = require("./originUtils");
const ROLLBAR_IP = '35.184.69.251';
exports.notFound = (_, res) => {
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.sendStatus(404);
};
exports.validAccount = (server) => (req, res, next) => {
    const account = req.user;
    const accountId = req.body.accountId;
    const accountName = req.body.accountName;
    if (!account || account.id !== accountId) {
        if (!/#$/.test(accountId)) {
            reporter_1.createFromRequest(server, req).warn(errors_1.ACCOUNT_ERROR, `${accountName} [${accountId}] (${req.path})`);
        }
        //logger.warn(ACCOUNT_ERROR, `${accountName} [${accountId}] (${req.path})`);
        res.status(403).json({ error: errors_1.ACCOUNT_ERROR });
    }
    else {
        next(null);
    }
};
exports.blockMaps = (debug, local) => (req, res, next) => {
    if (!debug && !local && /\.map$/.test(req.path) && originUtils_1.getIP(req) !== ROLLBAR_IP) {
        res.sendStatus(404);
    }
    else {
        next(null);
    }
};
exports.hash = (req, res, next) => {
    const apiVersion = req.get('api-version');
    if (apiVersion !== hash_1.HASH) {
        res.status(400).json({ error: errors_1.VERSION_ERROR });
    }
    else {
        next(null);
    }
};
exports.offline = (settings) => (_req, res, next) => {
    if (settings.isPageOffline) {
        res.status(503).send(errors_1.OFFLINE_ERROR);
    }
    else {
        next(null);
    }
};
exports.internal = (config, server) => (req, res, next) => {
    if (req.get('api-token') === config.token) {
        next(null);
    }
    else {
        reporter_1.createFromRequest(server, req).warn('Unauthorized internal api call', req.originalUrl);
        res.sendStatus(403);
    }
};
exports.auth = (req, res, next) => {
    if (req.isAuthenticated()) {
        next(null);
    }
    else {
        //createFromRequest(req).warn('Unauthorized access', req.originalUrl);
        res.setHeader('X-Robots-Tag', 'noindex');
        res.sendStatus(403);
    }
};
exports.admin = (server) => (req, res, next) => {
    if (req.isAuthenticated() && req.user && accountUtils_1.isAdmin(req.user)) {
        next(null);
    }
    else {
        if (!/Googlebot/.test(req.get('User-Agent'))) {
            reporter_1.createFromRequest(server, req).warn(`Unauthorized access (admin)`, req.originalUrl);
        }
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.sendStatus(403);
    }
};
const store = new ExpressBrute.MemoryStore();
function limit(freeRetries, lifetime) {
    const options = {
        freeRetries,
        lifetime,
        failCallback(req, res, _next, nextValidRequestDate) {
            logger_1.logger.warn(`rate limit ${req.url} ${req.ip}`);
            res.status(429).send(`Too many requests, please try again ${moment(nextValidRequestDate).fromNow()}`);
        }
    };
    return (new ExpressBrute(store, options)).prevent;
}
exports.limit = limit;
function reportError(e, server, req) {
    reporter_1.createFromRequest(server, req).danger(`Req error: ${e.message}`, `${req.method.toUpperCase()} ${req.originalUrl}`);
    logger_1.logger.error(e);
}
function handleError(server, req, res) {
    return (e) => {
        if (userError_1.isUserError(e)) {
            userError_1.reportUserError(e, server, req);
            res.status(422).json({ error: e.message, userError: true });
        }
        else {
            reportError(e, server, req);
            res.status(500).json({ error: 'Error occurred' });
        }
    };
}
exports.handleError = handleError;
let logRequest = lodash_1.noop;
function initLogRequest(func) {
    logRequest = func;
}
exports.initLogRequest = initLogRequest;
function handleJSON(server, req, res, result) {
    Promise.resolve(result)
        .then(result => {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
        res.json(result);
        return result;
    })
        .then(result => logRequest(req, result))
        .catch(handleError(server, req, res));
}
exports.handleJSON = handleJSON;
function wrap(server, handle) {
    return (req, res) => handleJSON(server, req, res, handle(req));
}
exports.wrap = wrap;
function wrapApi(server, api) {
    return wrap(server, ({ body: { method, args = [] } }) => {
        if (api[method]) {
            return api[method](...args);
        }
        else {
            return Promise.reject(new Error(`Invalid method (${method})`));
        }
    });
}
exports.wrapApi = wrapApi;
function readFiles(files, dir, url) {
    const mimeTypes = {
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
    };
    for (const file of fs.readdirSync(dir)) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            readFiles(files, filePath, `${url}/${file}`);
        }
        else {
            const ext = path.extname(file);
            const mimeType = mimeTypes[ext];
            if (mimeType) {
                const buffer = fs.readFileSync(filePath);
                files.set(`${url}/${file}`, { mimeType, buffer });
            }
        }
    }
}
function inMemoryStaticFiles(assetsPath, assetsUrl, maxAge) {
    const staticFiles = new Map();
    const cacheControl = `public, max-age=${Math.floor(maxAge / 1000)}`;
    readFiles(staticFiles, assetsPath, assetsUrl);
    return (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            return next();
        }
        const staticFile = staticFiles.get(req.path);
        if (!staticFile) {
            return next();
        }
        try {
            res.setHeader('Content-Type', staticFile.mimeType);
            res.setHeader('Cache-Control', cacheControl);
            res.status(200).end(staticFile.buffer);
        }
        catch (e) {
            next(e);
        }
    };
}
exports.inMemoryStaticFiles = inMemoryStaticFiles;
//# sourceMappingURL=requestUtils.js.map