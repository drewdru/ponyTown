import { argv } from 'yargs';
import { ServerConfig } from '../common/adminInterfaces';

export interface AppConfig {
	title: string;
	twitterLink?: string;
	supporterLink?: string;
	contactEmail?: string;
	port: number;
	adminPort?: number;
	host: string;
	proxy?: number;
	noindex?: boolean;
	secret: string;
	token: string;
	local: string;
	adminLocal?: string;
	sw?: boolean;
	db: string;
	pg: any;
	rollbar?: {
		environment: string;
		clientToken: string;
		serverToken: string;
		gulpToken: string;
	};
	analytics?: {
		trackingID: string;
	};
	assetsPath?: string;
	oauth: { [key: string]: any };
	servers: ServerConfig[];
	facebookAppId?: string;
}

export interface AppPackage {
	name: string;
	version: string;
	description: string;
}

export interface AppArgs {
	port?: string;
	login?: boolean;
	admin?: boolean;
	standaloneadmin?: boolean;
	game?: string;
	superadmin?: string;
	users?: boolean;
	tools?: boolean;
	webpack?: boolean;
	local?: boolean;
	nocleanup?: boolean;
}

export const args = argv as AppArgs;
export const { version, description }: AppPackage = require('../../../package.json');
export const config: AppConfig = require('../../../config.json');

const loginServer: ServerConfig = { id: 'login', filter: false, port: config.port } as any;
const adminServer: ServerConfig = { id: 'admin', filter: false, port: config.adminPort || config.port } as any;

export const gameServers = config.servers.filter(s => !s.hidden);

const allServers = [...gameServers, loginServer, adminServer];
allServers.forEach(s => s.flags = s.flags || {});
const serverId = args.game || (args.login ? 'login' : (args.admin ? 'admin' : allServers[0].id));

export const server = allServers.find(s => s.id === serverId) || allServers[0];
export const port = (args.port && parseInt(args.port, 10)) || server.port || config.port;
