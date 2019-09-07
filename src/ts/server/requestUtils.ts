import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as moment from 'moment';
import * as ExpressBrute from 'express-brute';
import { noop } from 'lodash';
import { HASH } from '../generated/hash';
import { isAdmin } from '../common/accountUtils';
import { ACCOUNT_ERROR, VERSION_ERROR, OFFLINE_ERROR } from '../common/errors';
import { logger } from './logger';
import { createFromRequest } from './reporter';
import { AppConfig } from './config';
import { isUserError, reportUserError } from './userError';
import { Settings, ServerConfig } from '../common/adminInterfaces';
import { getIP } from './originUtils';
import { IAccount } from './db';

const ROLLBAR_IP = '35.184.69.251';

export const notFound: RequestHandler = (_, res) => {
	res.setHeader('Cache-Control', 'public, max-age=0');
	res.sendStatus(404);
};

export const validAccount = (server: ServerConfig): RequestHandler => (req, res, next) => {
	const account = req.user as IAccount | undefined;
	const accountId = req.body.accountId as string;
	const accountName = req.body.accountName as string;

	if (!account || account.id !== accountId) {
		if (!/#$/.test(accountId)) {
			createFromRequest(server, req).warn(ACCOUNT_ERROR, `${accountName} [${accountId}] (${req.path})`);
		}
		//logger.warn(ACCOUNT_ERROR, `${accountName} [${accountId}] (${req.path})`);
		res.status(403).json({ error: ACCOUNT_ERROR });
	} else {
		next(null);
	}
};

export const blockMaps = (debug: boolean, local: boolean): RequestHandler => (req, res, next) => {
	if (!debug && !local && /\.map$/.test(req.path) && getIP(req) !== ROLLBAR_IP) {
		res.sendStatus(404);
	} else {
		next(null);
	}
};

export const hash: RequestHandler = (req, res, next) => {
	const apiVersion = req.get('api-version');

	if (apiVersion !== HASH) {
		res.status(400).json({ error: VERSION_ERROR });
	} else {
		next(null);
	}
};

export const offline = (settings: Settings): RequestHandler => (_req, res, next) => {
	if (settings.isPageOffline) {
		res.status(503).send(OFFLINE_ERROR);
	} else {
		next(null);
	}
};

export const internal = (config: AppConfig, server: ServerConfig): RequestHandler => (req, res, next) => {
	if (req.get('api-token') === config.token) {
		next(null);
	} else {
		createFromRequest(server, req).warn('Unauthorized internal api call', req.originalUrl);
		res.sendStatus(403);
	}
};

export const auth: RequestHandler = (req, res, next) => {
	if (req.isAuthenticated()) {
		next(null);
	} else {
		//createFromRequest(req).warn('Unauthorized access', req.originalUrl);
		res.setHeader('X-Robots-Tag', 'noindex');
		res.sendStatus(403);
	}
};

export const admin = (server: ServerConfig): RequestHandler => (req, res, next) => {
	if (req.isAuthenticated() && req.user && isAdmin(req.user)) {
		next(null);
	} else {
		if (!/Googlebot/.test(req.get('User-Agent')!)) {
			createFromRequest(server, req).warn(`Unauthorized access (admin)`, req.originalUrl);
		}

		res.setHeader('X-Robots-Tag', 'noindex, nofollow');
		res.sendStatus(403);
	}
};

const store = new ExpressBrute.MemoryStore();

export function limit(freeRetries: number, lifetime: number) {
	const options: any = {
		freeRetries,
		lifetime,
		failCallback(req: Request, res: Response, _next: NextFunction, nextValidRequestDate: any) {
			logger.warn(`rate limit ${req.url} ${req.ip}`);
			res.status(429).send(`Too many requests, please try again ${moment(nextValidRequestDate).fromNow()}`);
		}
	};

	return (new (ExpressBrute as any)(store, options)).prevent;
}

function reportError(e: Error, server: ServerConfig, req: Request) {
	createFromRequest(server, req).danger(`Req error: ${e.message}`, `${req.method.toUpperCase()} ${req.originalUrl}`);
	logger.error(e);
}

export function handleError(server: ServerConfig, req: Request, res: Response) {
	return (e: Error) => {
		if (isUserError(e)) {
			reportUserError(e, server, req);
			res.status(422).json({ error: e.message, userError: true });
		} else {
			reportError(e, server, req);
			res.status(500).json({ error: 'Error occurred' });
		}
	};
}

let logRequest: (req: Request, result: any, url?: string) => void = noop;

export function initLogRequest(func: typeof logRequest) {
	logRequest = func;
}

export function handleJSON(server: ServerConfig, req: Request, res: Response, result: any): any {
	Promise.resolve(result)
		.then(result => {
			res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
			res.json(result);
			return result;
		})
		.then(result => logRequest(req, result))
		.catch(handleError(server, req, res));
}

export function wrap(server: ServerConfig, handle: (req: Request) => any): RequestHandler {
	return (req, res) => handleJSON(server, req, res, handle(req));
}

export function wrapApi(server: ServerConfig, api: any) {
	return wrap(server, ({ body: { method, args = [] } }) => {
		if (api[method]) {
			return api[method](...args);
		} else {
			return Promise.reject(new Error(`Invalid method (${method})`));
		}
	});
}

interface StaticFile {
	buffer: Buffer;
	mimeType: string;
}

function readFiles(files: Map<string, StaticFile>, dir: string, url: string) {
	const mimeTypes: any = {
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
		} else {
			const ext = path.extname(file);
			const mimeType = mimeTypes[ext];

			if (mimeType) {
				const buffer = fs.readFileSync(filePath);
				files.set(`${url}/${file}`, { mimeType, buffer });
			}
		}
	}
}

export function inMemoryStaticFiles(assetsPath: string, assetsUrl: string, maxAge: number): RequestHandler {
	const staticFiles = new Map<string, StaticFile>();
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
		} catch (e) {
			next(e);
		}
	};
}
