import { Router, Request, Response, RequestHandler } from 'express';
import { use, authenticate, AuthenticateOptions } from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { remove } from 'lodash';
import { MINUTE } from '../../common/constants';
import { fromNow, hasFlag, includes } from '../../common/utils';
import { BannedMuted, Settings, ServerConfig, AccountFlags, ServerLiveSettings } from '../../common/adminInterfaces';
import { Account, IAccount, Origin, IOrigin } from '../db';
import { limit, auth as authRequest, wrap } from '../requestUtils';
import { CreateAccountOptions, findOrCreateAccount, SuspiciousCheckers, getAccountAlertMessage } from '../accountUtils';
import { create, createFromRequest } from '../reporter';
import { logger, logServer, system } from '../logger';
import { providers, getProfile } from '../oauth';
import { accountChanged, RemovedDocument } from '../internal';
import { UserError, isUserError, reportUserError } from '../userError';
import { kickFromAllServers } from '../api/admin';
import { createIsSuspiciousName, createIsSuspiciousAuth } from '../../common/security';
import { isBanned, isActive } from '../../common/adminUtils';
import { mergeAccounts } from '../api/merge';
import { findOrCreateAuth } from '../authUtils';
import { getOriginFromHTTP, getOrigin, addOrigin } from '../originUtils';
import { Profile } from '../../common/interfaces';

interface MergeRequest {
	accountId: string;
	time: number;
}

const FRESH_ACCOUNT_TIME = 1 * MINUTE;
const mergeRequests: MergeRequest[] = [];

/* tslint:disable */
const ignoreErrors = [
	'Service unavailable', // replacement for twitter HTTP error
	'Internal error',
	'User denied your request',
	'Code was already redeemed.',
	'Code is invalid or expired.',
	'This authorization code has expired.',
	'This authorization code has been used.',
	'Failed to fetch user profile',
	'Failed to obtain access token',
	'Failed to find request token in session',
	'User authorization failed: user is deactivated.',
	'User authorization failed: user revoke access for this token.',
	'Backend Error',
	'TokenError',
	'Bad Request',
	'Rate limit exceeded',
	`Sorry, this feature isn't available right now: An error occurred while processing this request. Please try again later.`,
	'Przepraszamy, ta funkcja nie jest obecnie dostępna: Podczas przetwarzania żądania wystąpił błąd. Spróbuj ponownie później.',
	'К сожалению, эта функция сейчас не доступна: Во время обработки запроса возникла ошибка. Пожалуйста, попробуйте еще раз позже',
	'К сожалению, эта функция сейчас не доступна: Во время обработки запроса возникла ошибка. Пожалуйста, попробуйте еще раз позже.',
	'Desculpe, esse recurso não está disponível no momento: Ocorreu um erro ao processar essa solicitação. Tente novamente mais tarde.',
	'Esta aplicación no está disponible: La aplicación que intentas usar ya no está disponible o tiene el acceso restringido.',
	'Xin lỗi, tính năng này không khả dụng ngay bây giờ: Đã xảy ra lỗi khi xử lý yêu cầu này. Vui lòng thử lại sau.',
	'Lo sentimos, esta función no está disponible ahora: Ocurrió un error mientras se procesaba la solicitud. Vuelve a intentarlo más tarde.',
	`The access token is invalid since the user hasn't engaged the app in longer than 90 days.`,
	`Application Unavailable: The application you're trying to use is either no longer available or access is restricted.`,
	'An unexpected error has occurred. Please retry your request later.',
	'Code was invalid or expired. ',
	'Internal server error: could not check access_token now, check later.',
	'failed to fetch user profile',
	'Failed to obtain request token',
	'User canceled the Dialog flow',
	'Internal Error',
	'Bad Authentication data.',
	'Diese Function ist vorübergehend nicht verfügbar',
	'Diese Funktion ist vorübergehend nicht verfügbar',
	'User authorization failed: no access_token passed.',
	'Ungültiges Anfrage-Token.',
	'Invalid Credentials',
	'Invalid code.',
	'Internal server error: Database problems, try later',
	'An invalid Platform session was found.: An invalid Platform session was found.',
	`Cannot read property 'id' of undefined`, // patreon error
	'User Rate Limit Exceeded. Rate of requests for user exceed configured project quota. You may consider re-evaluating expected per-user traffic to the API and adjust project quota limits accordingly. You may monitor aggregate quota usage and adjust limits in the API Console: https://console.developers.google.com/apis/api/plus.googleapis.com/quotas?project=200390553857',
];

function kickCurrentUser(req: Request) {
	const user = req.user as IAccount | undefined;

	if (user) {
		kickFromAllServers(user.id)
			.catch(e => logger.error(e));
	}
}

function logIn(req: Request, account: IAccount) {
	return new Promise<void>((resolve, reject) => {
		kickCurrentUser(req);
		req.logIn(account, e => e ? reject(e) : resolve());
	});
}

function isMerge(accountId: string) {
	const minTime = fromNow(-10 * MINUTE).getTime();
	remove(mergeRequests, r => r.time < minTime);
	return mergeRequests.some(r => r.accountId === accountId);
}

function getIP(req: Request) {
	return req.ip || req.ips[0];
}

function reportError(server: ServerConfig, message: string, e: Error, req: Request) {
	createFromRequest(server, req).danger(message, e.toString());
	logger.error(message, e);
}

function fixTwitterErrorMessage(message: string) {
	return /^<!DOCTYPE html>/.test(message) ? 'Service unavailable' : message;
}

async function checkBanField(
	server: ServerConfig, account: IAccount, field: keyof BannedMuted, message: string, origin: IOrigin
) {
	if (isActive(origin[field]) && !isActive(account[field])) {
		create(server, account._id, undefined, origin).warn(message);
		account[field] = origin[field];
		await account.save();
	}
}

async function loginUser(server: ServerConfig, req: Request, res: Response, account: IAccount) {
	const origin = await Origin.findOne({ ip: getIP(req) }).exec();

	await addOrigin(account, getOrigin(req));

	if (origin) {
		await checkBanField(server, account, 'mute', 'Muted account by origin', origin);
		await checkBanField(server, account, 'shadow', 'Shadowed account by origin', origin);
		await checkBanField(server, account, 'ban', 'Banned account by origin', origin);
	}

	if (isBanned(account)) {
		// const message = isTemporarilyBanned(account) ? `Account locked()` : 'Account locked';
		throw new UserError('Account locked', undefined, getAccountAlertMessage(account));
	}

	await logIn(req, account);
	await accountChanged(account._id.toString());

	const isFresh = account.createdAt && account.createdAt.getTime() > fromNow(-FRESH_ACCOUNT_TIME).getTime();
	res.redirect(isFresh ? '/account' : '/');
}

async function mergeUser(req: Request, res: Response, account: IAccount, removedDocument: RemovedDocument) {
	const user = req.user as IAccount;
	const userId = user._id.toString();
	const accountId = account._id.toString();

	remove(mergeRequests, r => r.accountId === userId);

	if (userId !== accountId) {
		await mergeAccounts(userId, accountId, 'by user', removedDocument, false);
	}

	res.redirect('/account?merged=true');
}

function handleErrorAndRedirect(
	server: ServerConfig, url: string, message: string, e: Error, req: Request, res: Response
) {
	if (isUserError(e)) {
		reportUserError(e, server, req);
		url += `?error=${encodeURIComponent(e.message)}`;

		if (e.userInfo) {
			url += `&alert=${encodeURIComponent(e.userInfo)}`;
		}
	} else {
		reportError(server, `Auth error: ${message}`, e, req);
		url += `?error=${encodeURIComponent(message)}`;
	}

	res.redirect(url);
}

async function handleAuth(
	server: ServerConfig, live: ServerLiveSettings, removedDocument: RemovedDocument,
	req: Request, res: Response, error: Error | null, account: IAccount | null,
) {
	const user = req.user as IAccount | undefined;
	const merge = isMerge(user && user.id);

	try {
		if (error) {
			if (isUserError(error)) {
				throw error;
			}

			const message = fixTwitterErrorMessage(error.message);
			const ignore = includes(ignoreErrors, message);
			throw new UserError(message, ignore ? undefined : { error, desc: `url: ${req.path}` });
		}

		if (!account) {
			throw new UserError('No account');
		}

		if (merge && !hasFlag(account.flags, AccountFlags.BlockMerging)) {
			if (live.shutdown) {
				throw new Error(`Cannot merge while server is shutdown`);
			}

			await mergeUser(req, res, account, removedDocument);
		} else {
			await loginUser(server, req, res, account);
		}
	} catch (e) {
		const message = merge ? 'Account merge error' : 'Authentication error';
		handleErrorAndRedirect(server, merge ? '/account' : '/', message, e, req, res);
	}
}

function createHandler(
	server: ServerConfig, live: ServerLiveSettings, id: string, options: AuthenticateOptions,
	removedDocument: RemovedDocument
): RequestHandler {
	return (req, res, next) => {
		const handler = authenticate(id, options, (error: Error | null, account: IAccount | null) =>
			handleAuth(server, live, removedDocument, req, res, error, account));

		return handler(req, res, next);
	};
}

export function authRoutes(
	host: string, server: ServerConfig, settings: Settings, live: ServerLiveSettings, mockLogin: boolean,
	removedDocument: RemovedDocument
) {
	const failureRedirect = `/?error=${encodeURIComponent('Authentication failed')}`;
	const app = Router();
	const checkers: SuspiciousCheckers = {
		isSuspiciousName: createIsSuspiciousName(settings),
		isSuspiciousAuth: createIsSuspiciousAuth(settings),
	};

	providers.filter(p => !!p.auth).forEach(({ id, strategy, auth, connectOnly, additionalOptions = {} }) => {
		const callbackURL = `${host}auth/${id}/callback`;
		const scope = id === 'patreon' ? ['users'] : ['email'];
		const options = {
			...additionalOptions,
			...auth,
			callbackURL,
			includeEmail: true,
			profileFields: ['id', 'displayName', 'name', 'emails'],
			passReqToCallback: true,
		};

		async function signInOrSignUp(req: Request, profile: Profile) {
			const user = req.user as IAccount | undefined;
			const userId = user && user._id.toString();
			const mergeAccount = (userId && isMerge(userId)) ? userId : undefined;
			const createAccountOptions = createOptions(req, !!connectOnly, server, settings, checkers);
			const auth = await findOrCreateAuth(profile, mergeAccount, createAccountOptions);
			const account = await findOrCreateAccount(auth, profile, createAccountOptions);
			const { ip, userAgent } = createAccountOptions;
			system(account._id, `signed-in with "${auth.name}" [${auth._id}] [${ip}] [${userAgent}]`);
			return account;
		}

		use(id, new strategy(options, (req, _accessToken, _refreshToken, oauthProfile, callback) => {
			const profile = getProfile(id, oauthProfile);

			signInOrSignUp(req, profile)
				.then(account => {
					callback(null, account);
				})
				.catch((error: Error) => {
					logServer(`failed to sign-in ${JSON.stringify(profile)}`);
					callback(error, null);
				});
		}));

		app.get(`/${id}`, limit(120, 3600), createHandler(server, live, id, { scope, failureRedirect }, removedDocument));
		app.get(`/${id}/callback`, limit(120, 3600), createHandler(server, live, id, { failureRedirect }, removedDocument));
		app.get(`/${id}/merge`, limit(120, 3600), authRequest, (req, res) => {
			const accountId = (req.user as IAccount)._id.toString();
			mergeRequests.push({ accountId, time: Date.now() });
			res.redirect(`/auth/${id}`);
		});
	});

	app.post('/sign-out', wrap(server, req => {
		kickCurrentUser(req);
		req.logout();
		return { success: true };
	}));

	if (mockLogin) {
		use(new LocalStrategy((login, _pass, done) => Account.findById(login, done)));
		app.get('/local', authenticate('local', { successRedirect: '/', failureRedirect: '/failed-login' }));
	}

	return app;
}

function createOptions(
	req: Request, connectOnly: boolean, server: ServerConfig, settings: Settings, checkers: SuspiciousCheckers
): CreateAccountOptions {
	const acl = req.cookies && req.cookies.acl;
	const origin = getOriginFromHTTP(req);

	return {
		ip: getIP(req),
		userAgent: req.get('User-Agent'),
		browserId: req.get('Api-Bid'),
		connectOnly: !!connectOnly,
		creationLocked: acl && acl > (new Date()).toISOString(),
		canCreateAccounts: !!settings.canCreateAccounts,
		reportPotentialDuplicates: !!settings.reportPotentialDuplicates,
		warn: (accountId, message, desc) => create(server, accountId, undefined, origin).warn(message, desc),
		...checkers,
	};
}
