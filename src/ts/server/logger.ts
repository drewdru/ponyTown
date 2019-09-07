import { console, dailyfile } from 'tracer';
import chalk from 'chalk';
import { ChatType, isPublicChat } from '../common/interfaces';
import { IClient } from './serverInterfaces';
import { getChatPrefix } from './commands';
import { isMutedOrShadowed } from './playerUtils';
import { ServerConfig } from '../common/adminInterfaces';
import { pathTo } from './paths';
import { ID } from './db';

const { reset, gray, magenta, cyan, green, yellow, red } = chalk;

function format(color: (text: string) => string) {
	//'[{{timestamp}}] [{{title}}] {{message}} ({{file}}:{{line}})',
	return [
		reset('['),
		gray('{{timestamp}}'),
		reset('] ['),
		color('{{title}}'),
		reset('] {{message}} '),
		gray('({{file}}:{{line}})'),
	].join('');
}

export const logger = console({
	level: 0,
	dateformat: 'mmm dd HH:MM:ss',
	format: [
		format(reset),
		{
			trace: format(cyan),
			debug: format(magenta),
			info: format(green),
			warn: format(yellow),
			error: format(red),
		}
	],
} as any);

const daily = dailyfile({
	root: pathTo('logs'),
	maxLogFiles: 14,
	dateformat: 'HH:MM:ss',
	format: '{{timestamp}} {{message}}', // ({{file}}:{{line}})
} as any);

export function log(message: string) {
	daily.info(message);
}

export function formatMessage(accountId: ID, type: string, message: string) {
	return `[${accountId}]${type}\t${message}`;
}

export function systemMessage(accountId: ID, message: string) {
	return formatMessage(accountId, '[system]', message);
}

function adminMessage(accountId: ID, message: string) {
	return formatMessage(accountId, '[admin]', message);
}

export function system(accountId: ID, message: string) {
	log(systemMessage(accountId, message));
}

export function admin(accountId: ID, message: string) {
	log(adminMessage(accountId, message));
}

export function logPatreon(message: string) {
	log(formatMessage('patreon', '', message));
}

export function logServer(message: string) {
	log(formatMessage('server', '', message));
}

export function logPerformance(message: string) {
	log(formatMessage('performance', '', message));
}

export function chat(
	server: ServerConfig, client: IClient, text: string, type: ChatType, ignored: boolean, target: IClient | undefined
) {
	let prefix = getChatPrefix(type);
	let mod = '';

	if (ignored) {
		mod = '[ignored]';
	} else if (isMutedOrShadowed(client)) {
		mod = '[muted]';
	} else if (client.accountSettings.ignorePublicChat && isPublicChat(type)) {
		mod = '[ignorepub]';
	}

	if (type === ChatType.Whisper) {
		prefix += `[${target ? `${target.accountId}${target.shadowed ? '][shadowed' : ''}` : 'undefined'}] `;
	}

	const message = formatMessage(
		client.accountId, `[${server.id}][${client.map.id || 'main'}][${client.characterName}]${mod}`, `${prefix}${text}`);

	log(message);
}
