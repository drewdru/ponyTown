"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = require("passport");
const passport_local_1 = require("passport-local");
const lodash_1 = require("lodash");
const constants_1 = require("../../common/constants");
const utils_1 = require("../../common/utils");
const db_1 = require("../db");
const requestUtils_1 = require("../requestUtils");
const accountUtils_1 = require("../accountUtils");
const reporter_1 = require("../reporter");
const logger_1 = require("../logger");
const oauth_1 = require("../oauth");
const internal_1 = require("../internal");
const userError_1 = require("../userError");
const admin_1 = require("../api/admin");
const security_1 = require("../../common/security");
const adminUtils_1 = require("../../common/adminUtils");
const merge_1 = require("../api/merge");
const authUtils_1 = require("../authUtils");
const originUtils_1 = require("../originUtils");
const FRESH_ACCOUNT_TIME = 1 * constants_1.MINUTE;
const mergeRequests = [];
/* tslint:disable */
const ignoreErrors = [
    'Service unavailable',
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
    `Cannot read property 'id' of undefined`,
    'User Rate Limit Exceeded. Rate of requests for user exceed configured project quota. You may consider re-evaluating expected per-user traffic to the API and adjust project quota limits accordingly. You may monitor aggregate quota usage and adjust limits in the API Console: https://console.developers.google.com/apis/api/plus.googleapis.com/quotas?project=200390553857',
];
function kickCurrentUser(req) {
    const user = req.user;
    if (user) {
        admin_1.kickFromAllServers(user.id)
            .catch(e => logger_1.logger.error(e));
    }
}
function logIn(req, account) {
    return new Promise((resolve, reject) => {
        kickCurrentUser(req);
        req.logIn(account, e => e ? reject(e) : resolve());
    });
}
function isMerge(accountId) {
    const minTime = utils_1.fromNow(-10 * constants_1.MINUTE).getTime();
    lodash_1.remove(mergeRequests, r => r.time < minTime);
    return mergeRequests.some(r => r.accountId === accountId);
}
function getIP(req) {
    return req.ip || req.ips[0];
}
function reportError(server, message, e, req) {
    reporter_1.createFromRequest(server, req).danger(message, e.toString());
    logger_1.logger.error(message, e);
}
function fixTwitterErrorMessage(message) {
    return /^<!DOCTYPE html>/.test(message) ? 'Service unavailable' : message;
}
async function checkBanField(server, account, field, message, origin) {
    if (adminUtils_1.isActive(origin[field]) && !adminUtils_1.isActive(account[field])) {
        reporter_1.create(server, account._id, undefined, origin).warn(message);
        account[field] = origin[field];
        await account.save();
    }
}
async function loginUser(server, req, res, account) {
    const origin = await db_1.Origin.findOne({ ip: getIP(req) }).exec();
    await originUtils_1.addOrigin(account, originUtils_1.getOrigin(req));
    if (origin) {
        await checkBanField(server, account, 'mute', 'Muted account by origin', origin);
        await checkBanField(server, account, 'shadow', 'Shadowed account by origin', origin);
        await checkBanField(server, account, 'ban', 'Banned account by origin', origin);
    }
    if (adminUtils_1.isBanned(account)) {
        // const message = isTemporarilyBanned(account) ? `Account locked()` : 'Account locked';
        throw new userError_1.UserError('Account locked', undefined, accountUtils_1.getAccountAlertMessage(account));
    }
    await logIn(req, account);
    await internal_1.accountChanged(account._id.toString());
    const isFresh = account.createdAt && account.createdAt.getTime() > utils_1.fromNow(-FRESH_ACCOUNT_TIME).getTime();
    res.redirect(isFresh ? '/account' : '/');
}
async function mergeUser(req, res, account, removedDocument) {
    const user = req.user;
    const userId = user._id.toString();
    const accountId = account._id.toString();
    lodash_1.remove(mergeRequests, r => r.accountId === userId);
    if (userId !== accountId) {
        await merge_1.mergeAccounts(userId, accountId, 'by user', removedDocument, false);
    }
    res.redirect('/account?merged=true');
}
function handleErrorAndRedirect(server, url, message, e, req, res) {
    if (userError_1.isUserError(e)) {
        userError_1.reportUserError(e, server, req);
        url += `?error=${encodeURIComponent(e.message)}`;
        if (e.userInfo) {
            url += `&alert=${encodeURIComponent(e.userInfo)}`;
        }
    }
    else {
        reportError(server, `Auth error: ${message}`, e, req);
        url += `?error=${encodeURIComponent(message)}`;
    }
    res.redirect(url);
}
async function handleAuth(server, live, removedDocument, req, res, error, account) {
    const user = req.user;
    const merge = isMerge(user && user.id);
    try {
        if (error) {
            if (userError_1.isUserError(error)) {
                throw error;
            }
            const message = fixTwitterErrorMessage(error.message);
            const ignore = utils_1.includes(ignoreErrors, message);
            throw new userError_1.UserError(message, ignore ? undefined : { error, desc: `url: ${req.path}` });
        }
        if (!account) {
            throw new userError_1.UserError('No account');
        }
        if (merge && !utils_1.hasFlag(account.flags, 16 /* BlockMerging */)) {
            if (live.shutdown) {
                throw new Error(`Cannot merge while server is shutdown`);
            }
            await mergeUser(req, res, account, removedDocument);
        }
        else {
            await loginUser(server, req, res, account);
        }
    }
    catch (e) {
        const message = merge ? 'Account merge error' : 'Authentication error';
        handleErrorAndRedirect(server, merge ? '/account' : '/', message, e, req, res);
    }
}
function createHandler(server, live, id, options, removedDocument) {
    return (req, res, next) => {
        const handler = passport_1.authenticate(id, options, (error, account) => handleAuth(server, live, removedDocument, req, res, error, account));
        return handler(req, res, next);
    };
}
function authRoutes(host, server, settings, live, mockLogin, removedDocument) {
    const failureRedirect = `/?error=${encodeURIComponent('Authentication failed')}`;
    const app = express_1.Router();
    const checkers = {
        isSuspiciousName: security_1.createIsSuspiciousName(settings),
        isSuspiciousAuth: security_1.createIsSuspiciousAuth(settings),
    };
    oauth_1.providers.filter(p => !!p.auth).forEach(({ id, strategy, auth, connectOnly, additionalOptions = {} }) => {
        const callbackURL = `${host}auth/${id}/callback`;
        const scope = id === 'patreon' ? ['users'] : ['email'];
        const options = Object.assign({}, additionalOptions, auth, { callbackURL, includeEmail: true, profileFields: ['id', 'displayName', 'name', 'emails'], passReqToCallback: true });
        async function signInOrSignUp(req, profile) {
            const user = req.user;
            const userId = user && user._id.toString();
            const mergeAccount = (userId && isMerge(userId)) ? userId : undefined;
            const createAccountOptions = createOptions(req, !!connectOnly, server, settings, checkers);
            const auth = await authUtils_1.findOrCreateAuth(profile, mergeAccount, createAccountOptions);
            const account = await accountUtils_1.findOrCreateAccount(auth, profile, createAccountOptions);
            const { ip, userAgent } = createAccountOptions;
            logger_1.system(account._id, `signed-in with "${auth.name}" [${auth._id}] [${ip}] [${userAgent}]`);
            return account;
        }
        passport_1.use(id, new strategy(options, (req, _accessToken, _refreshToken, oauthProfile, callback) => {
            const profile = oauth_1.getProfile(id, oauthProfile);
            signInOrSignUp(req, profile)
                .then(account => {
                callback(null, account);
            })
                .catch((error) => {
                logger_1.logServer(`failed to sign-in ${JSON.stringify(profile)}`);
                callback(error, null);
            });
        }));
        app.get(`/${id}`, requestUtils_1.limit(120, 3600), createHandler(server, live, id, { scope, failureRedirect }, removedDocument));
        app.get(`/${id}/callback`, requestUtils_1.limit(120, 3600), createHandler(server, live, id, { failureRedirect }, removedDocument));
        app.get(`/${id}/merge`, requestUtils_1.limit(120, 3600), requestUtils_1.auth, (req, res) => {
            const accountId = req.user._id.toString();
            mergeRequests.push({ accountId, time: Date.now() });
            res.redirect(`/auth/${id}`);
        });
    });
    app.post('/sign-out', requestUtils_1.wrap(server, req => {
        kickCurrentUser(req);
        req.logout();
        return { success: true };
    }));
    if (mockLogin) {
        passport_1.use(new passport_local_1.Strategy((login, _pass, done) => db_1.Account.findById(login, done)));
        app.get('/local', passport_1.authenticate('local', { successRedirect: '/', failureRedirect: '/failed-login' }));
    }
    return app;
}
exports.authRoutes = authRoutes;
function createOptions(req, connectOnly, server, settings, checkers) {
    const acl = req.cookies && req.cookies.acl;
    const origin = originUtils_1.getOriginFromHTTP(req);
    return Object.assign({ ip: getIP(req), userAgent: req.get('User-Agent'), browserId: req.get('Api-Bid'), connectOnly: !!connectOnly, creationLocked: acl && acl > (new Date()).toISOString(), canCreateAccounts: !!settings.canCreateAccounts, reportPotentialDuplicates: !!settings.reportPotentialDuplicates, warn: (accountId, message, desc) => reporter_1.create(server, accountId, undefined, origin).warn(message, desc) }, checkers);
}
//# sourceMappingURL=auth.js.map