"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./boot");
const fs = require("fs");
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const http = require("http");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const expressSession = require("express-session");
const serveFavicon = require("serve-favicon");
const Rollbar = require("rollbar");
const passport = require("passport");
const connectMongo = require("connect-mongo");
const express = require("express");
// import { WebSocketServer } from '@clusterws/cws';
const clusterws_uws_1 = require("clusterws-uws");
const lodash_1 = require("lodash");
const fs_extra_1 = require("fs-extra");
const ag_sockets_1 = require("ag-sockets");
const config_1 = require("./config");
const constants_1 = require("../common/constants");
const rollbar_1 = require("../common/rollbar");
const adminUtils_1 = require("../common/adminUtils");
const utils_1 = require("../common/utils");
const hash_1 = require("../generated/hash");
const clientActions_1 = require("../client/clientActions");
const clientAdminActions_1 = require("../client/clientAdminActions");
const serverActions_1 = require("./serverActions");
const adminServerActions_1 = require("./adminServerActions");
const db_1 = require("./db");
const logger_1 = require("./logger");
const settings_1 = require("./settings");
const socketErrorHandler_1 = require("./utils/socketErrorHandler");
const serverUtils_1 = require("./serverUtils");
const requestUtils_1 = require("./requestUtils");
const stats_1 = require("./stats");
const start_1 = require("./start");
const serverActionsManager_1 = require("./serverActionsManager");
const internal_1 = require("./internal");
const polling_1 = require("./polling");
const paths_1 = require("./paths");
const liveSettings_1 = require("./liveSettings");
const index_1 = require("./routes/index");
const auth_1 = require("./routes/auth");
const api_1 = require("./routes/api");
const api1_1 = require("./routes/api1");
const api2_1 = require("./routes/api2");
const api_tools_1 = require("./routes/api-tools");
const internal_2 = require("./api/internal");
const internal_login_1 = require("./api/internal-login");
const admin_accounts_1 = require("./api/admin-accounts");
const internal_admin_1 = require("./api/internal-admin");
const adminService_1 = require("./services/adminService");
const admin_1 = require("./api/admin");
function getServiceWorker() {
    try {
        return fs.readFileSync(paths_1.pathTo('build', 'sw.min.js'));
    }
    catch (_a) {
        return '';
    }
}
mongoose.connect(config_1.config.db, {
    reconnectTries: Number.MAX_VALUE,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
});
const MongoStore = connectMongo(expressSession);
const app = express();
const production = app.get('env') === 'production';
const maxAge = production ? constants_1.YEAR : 0;
const etag = false;
const limit = !production || config_1.args.tools ? '100mb' : '100kb';
Bluebird.config({ warnings: false, longStackTraces: !production });
const rollbar = config_1.config.rollbar && Rollbar.init({
    accessToken: config_1.config.rollbar.serverToken,
    environment: config_1.config.rollbar.environment,
    handleUncaughtExceptions: true,
    handleUnhandledRejections: true,
    captureUncaught: true,
    checkIgnore: rollbar_1.rollbarCheckIgnore,
});
let assetsPath = paths_1.pathTo('build', 'assets');
let adminAssetsPath = paths_1.pathTo('build', 'assets-admin');
fs_extra_1.ensureDirSync(paths_1.pathTo('build-copy'));
if (production && config_1.args.login) {
    const newAssetsPath = paths_1.pathTo('build-copy', 'assets');
    fs_extra_1.removeSync(newAssetsPath);
    fs_extra_1.copySync(assetsPath, newAssetsPath);
    assetsPath = newAssetsPath;
}
if (production && config_1.args.admin) {
    const newAssetsPath = paths_1.pathTo('build-copy', 'assets-admin');
    fs_extra_1.removeSync(newAssetsPath);
    fs_extra_1.copySync(adminAssetsPath, newAssetsPath);
    adminAssetsPath = newAssetsPath;
}
app.set('port', config_1.port);
app.set('views', paths_1.pathTo('views'));
app.set('view engine', 'pug');
app.set('view options', { doctype: 'html' });
app.set('x-powered-by', false);
app.set('etag', false);
if (config_1.config.proxy) {
    app.set('trust proxy', config_1.config.proxy);
}
if (production) {
    app.use(require('hsts')({ maxAge }));
    app.use(require('frameguard')({ action: 'sameorigin' }));
    // app.use(require('shrink-ray-current')());
}
if (config_1.args.login || config_1.args.admin) {
    app.use(serveFavicon(paths_1.pathTo('favicons', 'favicon.ico')));
}
app.use(morgan('dev', { skip: (_, res) => res.statusCode < 500 || res.statusCode === 503 }));
const serviceWorker = getServiceWorker();
if (serviceWorker) {
    app.get('/sw.js', (_, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=0');
        res.send(serviceWorker);
    });
}
else {
    app.get('/sw.js', requestUtils_1.notFound);
}
if (config_1.args.login || config_1.args.admin) {
    if (production) {
        app.use(requestUtils_1.inMemoryStaticFiles(assetsPath, '/assets', maxAge));
    }
    app.use('/assets', requestUtils_1.blockMaps(DEVELOPMENT, !!config_1.args.local), express.static(assetsPath, { maxAge, etag }));
    app.use(express.static(paths_1.pathTo('public'), { maxAge, etag }));
    app.use(express.static(paths_1.pathTo('favicons'), { maxAge, etag }));
}
app.use(bodyParser.json({ type: ['json', 'application/csp-report'], limit }));
app.use(bodyParser.urlencoded({ extended: true, limit }));
app.use(require('cookie-parser')());
if (config_1.args.login || config_1.args.admin) {
    passport.serializeUser((account, done) => done(null, account._id.toString()));
    passport.deserializeUser((id, done) => db_1.Account.findById(id, (err, a) => done(err, a && !adminUtils_1.isBanned(a) ? a : false)));
}
const ignore = [
    'RangeNotSatisfiableError',
    'PreconditionFailedError',
];
app.use((err, req, res, next) => {
    const ignored = err instanceof Error && utils_1.includes(ignore, err.name);
    return next(ignored ? null : err, req, res);
});
if (rollbar) {
    app.use(rollbar.errorHandler());
}
if (!production) {
    app.use('/assets-admin', express.static(paths_1.pathTo('assets')));
    app.use('/assets-admin', express.static(paths_1.pathTo('src')));
    app.use('/assets', express.static(paths_1.pathTo('assets')));
    app.use('/assets', express.static(paths_1.pathTo('src')));
    app.use(require('errorhandler')());
}
const httpServer = http.createServer(app);
const errorHandler = new socketErrorHandler_1.SocketErrorHandler(rollbar, config_1.server);
const createSession = () => expressSession({
    secret: config_1.config.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: constants_1.WEEK * 2,
    },
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
});
const statsPath = paths_1.pathTo('logs', `stats-${config_1.server.id}.csv`);
const stats = new stats_1.StatsTracker(statsPath);
const sessionMiddlewares = lodash_1.once(() => [createSession(), passport.initialize(), passport.session()]);
const adminMiddlewares = lodash_1.once(() => [...sessionMiddlewares(), requestUtils_1.admin(config_1.server)]);
const socketOptionsBase = {
    ws: { Server: clusterws_uws_1.WebSocketServer },
    hash: hash_1.STAMP,
};
requestUtils_1.initLogRequest(stats.logRequest);
admin_accounts_1.initLogSwearingAndSpamming(stats.logSwearing, stats.logSpamming);
const host = ag_sockets_1.createServerHost(httpServer, {
    path: config_1.args.standaloneadmin && !config_1.args.game ? '/admin/ws-admin' : config_1.server.path,
    ws: { Server: clusterws_uws_1.WebSocketServer },
    perMessageDeflate: false,
    errorHandler,
});
let theWorld = undefined;
let sent = 0, received = 0;
let sentPackets = 0, receivedPackets = 0;
if (config_1.args.game) {
    const getSettings = () => settings_1.settings.servers[config_1.server.id] || {};
    const { world, createServerActions, hiding } = serverActionsManager_1.createServerActionsFactory(config_1.server, settings_1.settings, getSettings, {
        stats: () => {
            const result = { sent, received, sentPackets, receivedPackets };
            sent = 0;
            received = 0;
            sentPackets = 0;
            receivedPackets = 0;
            return result;
        }
    });
    const options = Object.assign({}, socketOptionsBase, { verifyClient: () => !getSettings().isServerOffline && !liveSettings_1.liveSettings.shutdown, forceBinary: true, onSend: (packet) => {
            sent += packet.binary ? packet.binary.byteLength : (packet.json ? packet.json.length : 0);
            sentPackets++;
            stats.logSendStats(packet);
        }, onRecv: (packet) => {
            received += packet.binary ? packet.binary.byteLength : (packet.json ? packet.json.length : 0);
            receivedPackets++;
            stats.logRecvStats(packet);
        } });
    const gameSocket = host.socket(serverActions_1.ServerActions, clientActions_1.ClientActions, createServerActions, options);
    const tokens = serverUtils_1.tokenService(gameSocket);
    start_1.start(world, config_1.server);
    internal_1.init(world, tokens);
    theWorld = world;
    const apiInternal = internal_2.createInternalApi(world, config_1.server, settings_1.reloadSettings, getSettings, tokens, hiding, stats, liveSettings_1.liveSettings);
    app.use('/api-internal', requestUtils_1.internal(config_1.config, config_1.server), requestUtils_1.wrapApi(config_1.server, apiInternal));
}
const endPoints = config_1.args.admin ? admin_1.createEndPoints() : undefined;
const adminService = config_1.args.admin ? new adminService_1.AdminService() : undefined;
const removedDocument = internal_1.createRemovedDocument(endPoints, adminService);
const index = index_1.createIndex(assetsPath, adminAssetsPath);
if (config_1.args.admin) {
    if (config_1.args.standaloneadmin) {
        app.use('/admin/assets-admin', ...adminMiddlewares(), express.static(adminAssetsPath, { maxAge, etag }));
        app.get('/admin/assets-admin/*', (_, res) => res.sendStatus(404));
        const adminApi = new internal_admin_1.InternalAdminApi(adminService, endPoints);
        app.use('/api-internal-admin', requestUtils_1.internal(config_1.config, config_1.server), requestUtils_1.wrapApi(config_1.server, adminApi));
    }
    const createClient = (client) => new adminServerActions_1.AdminServerActions(client, config_1.server, settings_1.settings, adminService, endPoints, removedDocument);
    const base = '/admin';
    const assetsBase = config_1.args.standaloneadmin ? '/admin' : '';
    const adminSocket = host.socket(adminServerActions_1.AdminServerActions, clientAdminActions_1.ClientAdminActions, createClient, socketOptionsBase);
    const sendAdminPage = index.admin(production, `${base}/`, assetsBase, 'bootstrap-admin.js', adminSocket);
    app.get(`${base}`, ...adminMiddlewares(), sendAdminPage);
    app.get(`${base}/*`, ...adminMiddlewares(), sendAdminPage);
}
if (config_1.args.tools) {
    const toolsPage = index.user(production, '/tools/', 'style-tools.css', 'bootstrap-tools.js', 'bootstrap-tools.js', undefined, true, !!config_1.args.local, false);
    app.get('/tools', ...sessionMiddlewares(), requestUtils_1.auth, (_, res) => res.send(toolsPage.page));
    app.get('/tools/*', ...sessionMiddlewares(), requestUtils_1.auth, (_, res) => res.send(toolsPage.page));
    app.use('/api-tools', ...sessionMiddlewares(), api_tools_1.default(config_1.server, settings_1.settings, theWorld));
    app.get('/api-tools/*', (_, res) => res.sendStatus(404));
}
if (config_1.args.login) {
    const socketOptions = ag_sockets_1.createClientOptions(serverActions_1.ServerActions, clientActions_1.ClientActions, socketOptionsBase);
    const userPage = index.user(production, '/', 'style.css', 'bootstrap.js', 'bootstrap-es.js', socketOptions, false, !!config_1.args.local, !production);
    const offlinePage = fs.readFileSync(paths_1.pathTo('public', 'offline.html'), 'utf8');
    const script = `${config_1.config.host}${index.getRevScript('bootstrap.js')}`;
    const scriptES = `${config_1.config.host}${index.getRevScript('bootstrap-es.js')}`;
    const analytics = config_1.config.analytics ? 'https://www.google-analytics.com' : '';
    // const workbox = 'https://storage.googleapis.com/workbox-cdn';
    // const rollbarScripts =
    // rollbar ? 'https://d37gvrvc0wt4s1.cloudfront.net https://cdnjs.cloudflare.com/ajax/libs/rollbar.js/' : '';
    const csp = `object-src 'none';`
        + `frame-src 'self';`
        + `frame-ancestors 'self';`
        + `worker-src ${config_1.config.host}sw.js;`
        + `script-src 'unsafe-eval' ${script} ${scriptES} ${analytics};`;
    const linkPreloads = [
        ...userPage.preload,
    ];
    app.use('/assets-admin', ...adminMiddlewares(), express.static(adminAssetsPath, { maxAge, etag }));
    app.use('/auth', ...sessionMiddlewares(), auth_1.authRoutes(config_1.config.host, config_1.server, settings_1.settings, liveSettings_1.liveSettings, config_1.args.local || DEVELOPMENT, removedDocument));
    app.use('/api', ...sessionMiddlewares(), api_1.default(config_1.server, settings_1.settings, { version: config_1.version, host: config_1.config.host, debug: DEVELOPMENT, local: !!config_1.args.local }, removedDocument));
    app.use('/api1', ...sessionMiddlewares(), api1_1.default(config_1.server, settings_1.settings));
    app.use('/api2', api2_1.default(settings_1.settings, liveSettings_1.liveSettings, stats));
    const loginApi = internal_login_1.createInternalLoginApi(settings_1.settings, liveSettings_1.liveSettings, stats, settings_1.reloadSettings, removedDocument);
    app.use('/api-internal-login', requestUtils_1.internal(config_1.config, config_1.server), requestUtils_1.wrapApi(config_1.server, loginApi));
    app.get('/assets-admin/*', requestUtils_1.notFound);
    app.get('/assets/*', requestUtils_1.notFound);
    app.get('/auth/*', requestUtils_1.notFound);
    app.get('/api/*', requestUtils_1.notFound);
    app.get('/api1/*', requestUtils_1.notFound);
    app.get('/api2/*', requestUtils_1.notFound);
    app.get('/*', (req, res) => {
        if (settings_1.settings.isPageOffline) {
            res.send(offlinePage);
        }
        else {
            if (production && !config_1.args.local) {
                res.setHeader('Content-Security-Policy', csp);
                res.setHeader('Link', linkPreloads);
            }
            res.setHeader('Referrer-Policy', 'no-referrer');
            // res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.send(userPage.page);
            stats.logRequest(req, userPage.page, '/');
        }
    });
}
app.use((err, req, res, next) => {
    if (err instanceof URIError) {
        res.redirect(config_1.config.host);
    }
    else {
        return next(err, req, res);
    }
});
settings_1.reloadSettings().then(() => {
    if (config_1.args.login || config_1.args.game) {
        stats.startStatTracking();
    }
    if (config_1.args.login || config_1.args.admin) {
        polling_1.pollServers();
    }
    if (config_1.args.admin && !config_1.args.nocleanup) {
        polling_1.startStrayAuthsCleanup(removedDocument);
        polling_1.startClearOldIgnores();
        polling_1.startMergesCleanup();
        polling_1.startBansCleanup();
        polling_1.startCollectingUsersVisitedCount();
        polling_1.startSupporterInvitesCleanup();
        polling_1.startPotentialDuplicatesCleanup(adminService);
        polling_1.startAccountAlertsCleanup();
        polling_1.startUpdatePastSupporters();
        polling_1.startClearTo10Origns(adminService);
        polling_1.startClearVeryOldOrigns(adminService);
        polling_1.pollPatreon(config_1.server, settings_1.settings);
    }
    if (config_1.args.admin) {
        polling_1.pollDiskSpace();
        polling_1.pollMemoryUsage();
        polling_1.pollCertificateExpirationDate();
    }
    httpServer.listen(config_1.port, () => {
        const options = lodash_1.compact([
            app.get('env'),
            config_1.args.login && 'login',
            config_1.args.admin && 'admin',
            config_1.args.standaloneadmin && '(standaloneadmin)',
            config_1.args.tools && 'tools',
            config_1.args.game && `game:${config_1.server.id}`,
        ]);
        logger_1.logger.info(`Listening on port ${config_1.port} (${options.join(', ')})`);
    });
});
//# sourceMappingURL=server.js.map