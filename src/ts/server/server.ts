import './boot';
import * as fs from 'fs';
import * as Bluebird from 'bluebird';
import * as mongoose from 'mongoose';
import * as http from 'http';
import * as morgan from 'morgan';
import * as bodyParser from 'body-parser';
import * as expressSession from 'express-session';
import * as serveFavicon from 'serve-favicon';
import * as Rollbar from 'rollbar';
import * as passport from 'passport';
import * as connectMongo from 'connect-mongo';
import * as express from 'express';
// import { WebSocketServer } from '@clusterws/cws';
import { WebSocketServer } from 'clusterws-uws';
import { compact, once } from 'lodash';
import { copySync, removeSync, ensureDirSync } from 'fs-extra';
import { createServerHost, createClientOptions, ServerOptions, ClientExtensions, Packet } from 'ag-sockets';
import { config, port, server, args, version } from './config';
import { YEAR, WEEK } from '../common/constants';
import { rollbarCheckIgnore } from '../common/rollbar';
import { isBanned } from '../common/adminUtils';
import { includes } from '../common/utils';
import { STAMP } from '../generated/hash';
import { ClientActions } from '../client/clientActions';
import { ClientAdminActions } from '../client/clientAdminActions';
import { ServerActions } from './serverActions';
import { AdminServerActions } from './adminServerActions';
import { IAccount, Account } from './db';
import { logger } from './logger';
import { settings, reloadSettings } from './settings';
import { SocketErrorHandler } from './utils/socketErrorHandler';
import { tokenService } from './serverUtils';
import {
	admin as isAdmin, auth, blockMaps, wrapApi, internal, initLogRequest, notFound, inMemoryStaticFiles
} from './requestUtils';
import { StatsTracker } from './stats';
import { start } from './start';
import { createServerActionsFactory } from './serverActionsManager';
import { init, createRemovedDocument } from './internal';
import {
	pollServers, pollDiskSpace, pollCertificateExpirationDate, pollPatreon, startBansCleanup, pollMemoryUsage,
	startMergesCleanup, startStrayAuthsCleanup, startClearOldIgnores, startCollectingUsersVisitedCount,
	startSupporterInvitesCleanup, startPotentialDuplicatesCleanup, startAccountAlertsCleanup, startUpdatePastSupporters,
	startClearTo10Origns, startClearVeryOldOrigns
} from './polling';
import { pathTo } from './paths';
import { liveSettings } from './liveSettings';
import { createIndex } from './routes/index';
import { authRoutes } from './routes/auth';
import api from './routes/api';
import api1 from './routes/api1';
import api2 from './routes/api2';
import apiTools from './routes/api-tools';
import { createInternalApi } from './api/internal';
import { createInternalLoginApi } from './api/internal-login';
import { initLogSwearingAndSpamming } from './api/admin-accounts';
import { InternalAdminApi } from './api/internal-admin';
import { AdminService } from './services/adminService';
import { createEndPoints } from './api/admin';
import { World } from './world';

function getServiceWorker() {
	try {
		return fs.readFileSync(pathTo('build', 'sw.min.js'));
	} catch {
		return '';
	}
}

mongoose.connect(config.db, {
	reconnectTries: Number.MAX_VALUE,
	useNewUrlParser: true,
	useCreateIndex: true,
	useFindAndModify: false,
});

const MongoStore = connectMongo(expressSession);
const app = express();
const production = app.get('env') === 'production';
const maxAge = production ? YEAR : 0;
const etag = false;
const limit = !production || args.tools ? '100mb' : '100kb';

Bluebird.config({ warnings: false, longStackTraces: !production });

const rollbar = config.rollbar && Rollbar.init({
	accessToken: config.rollbar.serverToken,
	environment: config.rollbar.environment,
	handleUncaughtExceptions: true,
	handleUnhandledRejections: true,
	captureUncaught: true,
	checkIgnore: rollbarCheckIgnore,
} as any);

let assetsPath = pathTo('build', 'assets');
let adminAssetsPath = pathTo('build', 'assets-admin');

ensureDirSync(pathTo('build-copy'));

if (production && args.login) {
	const newAssetsPath = pathTo('build-copy', 'assets');
	removeSync(newAssetsPath);
	copySync(assetsPath, newAssetsPath);
	assetsPath = newAssetsPath;
}

if (production && args.admin) {
	const newAssetsPath = pathTo('build-copy', 'assets-admin');
	removeSync(newAssetsPath);
	copySync(adminAssetsPath, newAssetsPath);
	adminAssetsPath = newAssetsPath;
}

app.set('port', port);
app.set('views', pathTo('views'));
app.set('view engine', 'pug');
app.set('view options', { doctype: 'html' });
app.set('x-powered-by', false);
app.set('etag', false);

if (config.proxy) {
	app.set('trust proxy', config.proxy);
}

if (production) {
	app.use(require('hsts')({ maxAge }));
	app.use(require('frameguard')({ action: 'sameorigin' }));
	// app.use(require('shrink-ray-current')());
}

if (args.login || args.admin) {
	app.use(serveFavicon(pathTo('favicons', 'favicon.ico')));
}

app.use(morgan('dev', { skip: (_, res) => res.statusCode < 500 || res.statusCode === 503 }));

const serviceWorker = getServiceWorker();

if (serviceWorker) {
	app.get('/sw.js', (_, res) => {
		res.setHeader('Content-Type', 'application/javascript');
		res.setHeader('Cache-Control', 'public, max-age=0');
		res.send(serviceWorker);
	});
} else {
	app.get('/sw.js', notFound);
}

if (args.login || args.admin) {
	if (production) {
		app.use(inMemoryStaticFiles(assetsPath, '/assets', maxAge));
	}

	app.use('/assets', blockMaps(DEVELOPMENT, !!args.local), express.static(assetsPath, { maxAge, etag }));
	app.use(express.static(pathTo('public'), { maxAge, etag }));
	app.use(express.static(pathTo('favicons'), { maxAge, etag }));
}

app.use(bodyParser.json({ type: ['json', 'application/csp-report'], limit }));
app.use(bodyParser.urlencoded({ extended: true, limit }));
app.use(require('cookie-parser')());

if (args.login || args.admin) {
	passport.serializeUser<IAccount, string>((account, done) => done(null, account._id.toString()));
	passport.deserializeUser<IAccount | false, string>((id, done) =>
		Account.findById(id, (err, a) => done(err, a && !isBanned(a) ? a : false)));
}

const ignore = [
	'RangeNotSatisfiableError',
	'PreconditionFailedError',
];

app.use((err: any, req: any, res: express.Response, next: any) => {
	const ignored = err instanceof Error && includes(ignore, err.name);
	return next(ignored ? null : err, req, res);
});

if (rollbar) {
	app.use(rollbar.errorHandler());
}

if (!production) {
	app.use('/assets-admin', express.static(pathTo('assets')));
	app.use('/assets-admin', express.static(pathTo('src')));
	app.use('/assets', express.static(pathTo('assets')));
	app.use('/assets', express.static(pathTo('src')));
	app.use(require('errorhandler')());
}

const httpServer = http.createServer(app);
const errorHandler = new SocketErrorHandler(rollbar, server);
const createSession = () => expressSession({
	secret: config.secret,
	resave: false,
	saveUninitialized: false,
	cookie: {
		maxAge: WEEK * 2,
	},
	store: new MongoStore({ mongooseConnection: mongoose.connection }),
});

const statsPath = pathTo('logs', `stats-${server.id}.csv`);
const stats = new StatsTracker(statsPath);
const sessionMiddlewares = once(() => [createSession(), passport.initialize(), passport.session()] as express.RequestHandler[]);
const adminMiddlewares = once(() => [...sessionMiddlewares(), isAdmin(server)]);
const socketOptionsBase: ServerOptions = {
	ws: { Server: WebSocketServer },
	hash: STAMP,
};

initLogRequest(stats.logRequest);
initLogSwearingAndSpamming(stats.logSwearing, stats.logSpamming);

const host = createServerHost(httpServer, {
	path: args.standaloneadmin && !args.game ? '/admin/ws-admin' : server.path,
	ws: { Server: WebSocketServer },
	perMessageDeflate: false,
	errorHandler,
});

let theWorld: World | undefined = undefined;
let sent = 0, received = 0;
let sentPackets = 0, receivedPackets = 0;

if (args.game) {
	const getSettings = () => settings.servers[server.id] || {};

	const { world, createServerActions, hiding } = createServerActionsFactory(
		server, settings, getSettings, {
			stats: () => {
				const result = { sent, received, sentPackets, receivedPackets };
				sent = 0;
				received = 0;
				sentPackets = 0;
				receivedPackets = 0;
				return result;
			}
		});

	const options = {
		...socketOptionsBase,
		verifyClient: () => !getSettings().isServerOffline && !liveSettings.shutdown,
		forceBinary: true,
		onSend: (packet: Packet) => {
			sent += packet.binary ? packet.binary.byteLength : (packet.json ? packet.json.length : 0);
			sentPackets++;
			stats.logSendStats(packet);
		},
		onRecv: (packet: Packet) => {
			received += packet.binary ? packet.binary.byteLength : (packet.json ? packet.json.length : 0);
			receivedPackets++;
			stats.logRecvStats(packet);
		},
	};

	const gameSocket = host.socket(ServerActions, ClientActions, createServerActions as any, options);
	const tokens = tokenService(gameSocket);

	start(world, server);
	init(world, tokens);

	theWorld = world;

	const apiInternal = createInternalApi(
		world, server, reloadSettings, getSettings, tokens, hiding, stats, liveSettings);
	app.use('/api-internal', internal(config, server), wrapApi(server, apiInternal));
}

const endPoints = args.admin ? createEndPoints() : undefined;
const adminService = args.admin ? new AdminService() : undefined;
const removedDocument = createRemovedDocument(endPoints, adminService);
const index = createIndex(assetsPath, adminAssetsPath);

if (args.admin) {
	if (args.standaloneadmin) {
		app.use('/admin/assets-admin', ...adminMiddlewares(), express.static(adminAssetsPath, { maxAge, etag }));
		app.get('/admin/assets-admin/*', (_, res) => res.sendStatus(404));

		const adminApi = new InternalAdminApi(adminService!, endPoints!);
		app.use('/api-internal-admin', internal(config, server), wrapApi(server, adminApi));
	}

	const createClient = (client: ClientAdminActions & ClientExtensions) =>
		new AdminServerActions(client, server, settings, adminService!, endPoints!, removedDocument);

	const base = '/admin';
	const assetsBase = args.standaloneadmin ? '/admin' : '';
	const adminSocket = host.socket(AdminServerActions, ClientAdminActions, createClient, socketOptionsBase);
	const sendAdminPage = index.admin(production, `${base}/`, assetsBase, 'bootstrap-admin.js', adminSocket);

	app.get(`${base}`, ...adminMiddlewares(), sendAdminPage);
	app.get(`${base}/*`, ...adminMiddlewares(), sendAdminPage);
}

if (args.tools) {
	const toolsPage = index.user(
		production, '/tools/', 'style-tools.css', 'bootstrap-tools.js', 'bootstrap-tools.js', undefined, true, !!args.local, false);

	app.get('/tools', ...sessionMiddlewares(), auth, (_, res) => res.send(toolsPage.page));
	app.get('/tools/*', ...sessionMiddlewares(), auth, (_, res) => res.send(toolsPage.page));

	app.use('/api-tools', ...sessionMiddlewares(), apiTools(server, settings, theWorld));
	app.get('/api-tools/*', (_, res) => res.sendStatus(404));
}

if (args.login) {
	const socketOptions = createClientOptions(ServerActions, ClientActions, socketOptionsBase);
	const userPage = index.user(
		production, '/', 'style.css', 'bootstrap.js', 'bootstrap-es.js', socketOptions, false, !!args.local, !production);
	const offlinePage = fs.readFileSync(pathTo('public', 'offline.html'), 'utf8');

	const script = `${config.host}${index.getRevScript('bootstrap.js')}`;
	const scriptES = `${config.host}${index.getRevScript('bootstrap-es.js')}`;
	const analytics = config.analytics ? 'https://www.google-analytics.com' : '';
	// const workbox = 'https://storage.googleapis.com/workbox-cdn';
	// const rollbarScripts =
	// rollbar ? 'https://d37gvrvc0wt4s1.cloudfront.net https://cdnjs.cloudflare.com/ajax/libs/rollbar.js/' : '';
	const csp = `object-src 'none';`
		+ `frame-src 'self';`
		+ `frame-ancestors 'self';`
		+ `worker-src ${config.host}sw.js;`
		+ `script-src 'unsafe-eval' ${script} ${scriptES} ${analytics};`
		// + `report-uri /api2/csp`
		;

	const linkPreloads: string[] = [
		...userPage.preload,
	];

	app.use('/assets-admin', ...adminMiddlewares(), express.static(adminAssetsPath, { maxAge, etag }));
	app.use('/auth', ...sessionMiddlewares(), authRoutes(
		config.host, server, settings, liveSettings, args.local || DEVELOPMENT, removedDocument));
	app.use('/api', ...sessionMiddlewares(), api(
		server, settings, { version, host: config.host, debug: DEVELOPMENT, local: !!args.local }, removedDocument));
	app.use('/api1', ...sessionMiddlewares(), api1(server, settings));
	app.use('/api2', api2(settings, liveSettings, stats));

	const loginApi = createInternalLoginApi(settings, liveSettings, stats, reloadSettings, removedDocument);
	app.use('/api-internal-login', internal(config, server), wrapApi(server, loginApi));

	app.get('/assets-admin/*', notFound);
	app.get('/assets/*', notFound);
	app.get('/auth/*', notFound);
	app.get('/api/*', notFound);
	app.get('/api1/*', notFound);
	app.get('/api2/*', notFound);

	app.get('/*', (req, res) => {
		if (settings.isPageOffline) {
			res.send(offlinePage);
		} else {
			if (production && !args.local) {
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

app.use((err: any, req: any, res: express.Response, next: any) => {
	if (err instanceof URIError) {
		res.redirect(config.host);
	} else {
		return next(err, req, res);
	}
});

reloadSettings().then(() => {
	if (args.login || args.game) {
		stats.startStatTracking();
	}

	if (args.login || args.admin) {
		pollServers();
	}

	if (args.admin && !args.nocleanup) {
		startStrayAuthsCleanup(removedDocument);
		startClearOldIgnores();
		startMergesCleanup();
		startBansCleanup();
		startCollectingUsersVisitedCount();
		startSupporterInvitesCleanup();
		startPotentialDuplicatesCleanup(adminService!);
		startAccountAlertsCleanup();
		startUpdatePastSupporters();
		startClearTo10Origns(adminService!);
		startClearVeryOldOrigns(adminService!);
		pollPatreon(server, settings);
	}

	if (args.admin) {
		pollDiskSpace();
		pollMemoryUsage();
		pollCertificateExpirationDate();
	}

	httpServer.listen(port, () => {
		const options = compact([
			app.get('env'),
			args.login && 'login',
			args.admin && 'admin',
			args.standaloneadmin && '(standaloneadmin)',
			args.tools && 'tools',
			args.game && `game:${server.id}`,
		]);

		logger.info(`Listening on port ${port} (${options.join(', ')})`);
	});
});
