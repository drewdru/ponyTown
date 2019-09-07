import { escapeRegExp } from 'lodash';
import { LogArgument } from 'rollbar';
import { CHARACTER_LIMIT_ERROR } from './errors';

const IGNORE = new RegExp([
	// adware / extensions
	'plantsandplay', 'anyplacetrivial', 'surfbuyermac', 'hotshoppymac', 'GM_getValue', '__gCrWeb.autofill',
	'.com/affs', 'advpartners', 'tlscdn', 'yaaknaa', 'mecash', 'digitaloptout',
	'Script error', 'NS_ERROR_', 'davebestdeals', 'mflcdn', `'feedConf' of null`, 'n46gd0nenr1az.ru',
	'googst2.ru', 'downloader12.ru', 'adsafeprotected', 'gobobr.info', 'elt.parentNode',
	`getElementsByTagName('video')`, 'chrome-extension', 'bestpriceninja', `'tgt' of null`,
	'jh8hrfnvs.ru', 'OperaIce', 'blueblockgames', 'adguard.com', 'kaspersky', 'igamesecrets.com',
	'Unexpected identifier', 'UnknownError', 'diableNightMode', 'Unexpected end of script',
	'Internal Server Error', 'hilitor', 'kejnoj7.ru', 'v207.info', 'inj_js',
	'object is not a function', `'Float32Array' is undefined`, 'vertamedia', '.ru/', 'v24s.net',
	'window.document.location is null', 'mediaonspot', 'ydpi.pw', 'moz-extension', 'trafficanalytics',
	'amazonaws', 'adtelligent', 'searchsens.info', 'solid-waste.top', 'cdn.immereeako.info',
	'technologiecoloniale.com', 'cloudcnfare.com', 'MyAppGet', 'rugged-r.top', `Can't find variable: webkit`,
	`rgvqcsxqge.com`, 'all_small_polls', `Cannot read property 'document' of undefined`, `extAbbr is not defined`,
	'__gCrWeb', 'DOMBnbPlug',

	// GPU errors
	`Failed to execute 'shaderSource'`,
	'compiling shader',
	'Failed to create WebGL context',
	'CONTEXT_LOST_WEBGL',
	'Framebuffer unsupported',
	'Framebuffer failed for unspecified reason',
	'Недостаточно ресурсов памяти для завершения операции.',
	'Failed to initialize graphics device (Shader error)',
	'Failed to initialize graphics device (Failed to create WebGL context)',
	'Failed to initialize graphics device (Failed to create texture)',
	'Shader error',

	// GPU halt
	'GPU device instance has been suspended',
	'Die GPU-Geräteinstanz wurde angehalten',
	'GPU zostało zawieszone',
	`GPU приостановлен`,
	'GPU se ha suspendido',
	'GPU aygıt örneği askıya alınmış',
	'GPU-enhetsinstansen har försatts',

	// other
	'androidInterface is not defined',
	'/images/',
	'out of memory',
	'object is not a function',
	'Array buffer allocation failed',
	'Server is offline',
	'Failed to register a ServiceWorker',
	'Permission denied to access property',
	'Not enough storage is available',
	'Failed to initialize graphics device',
	'Not enough memory resources',
	'Ikke nok minneressurser tilgjengelig', // out of memory
	'suficientes recursos de memoria',
	'Onvoldoende geheugenbronnen',
	`Cannot read property 'version' of undefined`,

	'Maximum call stack size exceeded', // howler error on chrome mobile

	// user errors
	CHARACTER_LIMIT_ERROR,
	'Too many requests',
	'Saving in progress',
	'Too many requests, please try again in',
	'Already waiting for join request',

	// server
	'Range Not Satisfiable', 'Precondition Failed',
].map(escapeRegExp).join('|'), 'i');

export interface Person {
	id: string;
	username: string;
	custom?: any;
}

function getLabel(arg: LogArgument | undefined) {
	if (typeof arg === 'string') {
		return arg;
	} else if (arg && 'message' in arg) {
		return arg.message + (arg.stack || '');
	} else {
		return arg ? arg.toString() : '';
	}
}

export function isIgnoredMessage(message: string) {
	return IGNORE.test(message);
}

export function isIgnoredError(error: Error) {
	return isIgnoredMessage(error.message || `${error}` || '') || isIgnoredMessage(error.stack || '');
}

export function rollbarCheckIgnore(_isUncaught: boolean, args: LogArgument[], _payload: object): boolean {
	return (Array.isArray(args) ? args : [args])
		.map(getLabel)
		.some(isIgnoredMessage);
}
