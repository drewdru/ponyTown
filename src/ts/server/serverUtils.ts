import * as fs from 'fs';
import { exec, ExecOptions } from 'child_process';
import { noop } from 'lodash';
import { Server } from 'ag-sockets';
import { AccountData, SocialSite, PonyObject, AccountDataFlags } from '../common/interfaces';
import { IAccount, ICharacter, IAuth } from './db';
import { TokenService, TokenData } from './serverInterfaces';
import { AccountFlags, CharacterFlags, InternalGameServerState } from '../common/adminInterfaces';
import { supporterLevel, isPastSupporter } from '../common/adminUtils';
import { hasFlag, cloneDeep, formatISODate } from '../common/utils';
import * as paths from './paths';

export function tokenService(socket: Server): TokenService {
	return {
		clearTokensForAccount(accountId: string) {
			socket.clearTokens((_, data: TokenData) => data.accountId === accountId);
		},
		clearTokensAll() {
			socket.clearTokens(() => true);
		},
		createToken(token: TokenData) {
			return socket.token(token);
		}
	};
}

export function isServerOffline(server: InternalGameServerState) {
	return server.state.dead || !!server.state.settings.isServerOffline || !!server.state.shutdown;
}

export function toAccountData(account: IAccount): AccountData {
	const { _id, name, birthdate, birthyear, characterCount, roles, settings, flags } = account;

	return {
		id: _id.toString(),
		name, characterCount,
		birthdate: birthdate && formatISODate(birthdate) || '',
		birthyear,
		settings: cloneDeep(settings || {}),
		supporter: supporterLevel(account) || undefined,
		roles: (roles && roles.length) ? [...roles] : undefined,
		flags: (hasFlag(flags, AccountFlags.DuplicatesNotification) ? AccountDataFlags.Duplicates : 0) |
			(isPastSupporter(account) ? AccountDataFlags.PastSupporter : 0),
	};
}

export const toPonyObjectFields = '_id name info desc site tag lastUsed flags';

export function toPonyObject(character: ICharacter): PonyObject;
export function toPonyObject(character: ICharacter | undefined): PonyObject | null;
export function toPonyObject(character: ICharacter | undefined): PonyObject | null {
	return character ? {
		id: character._id.toString(),
		name: character.name,
		desc: character.desc || '',
		info: character.info || '',
		site: character.site ? character.site.toString() : undefined,
		tag: character.tag || undefined,
		lastUsed: character.lastUsed && character.lastUsed.toISOString(),
		hideSupport: hasFlag(character.flags, CharacterFlags.HideSupport) ? true : undefined,
		respawnAtSpawn: hasFlag(character.flags, CharacterFlags.RespawnAtSpawn) ? true : undefined,
	} : null;
}

export function toPonyObjectAdmin(character: ICharacter): PonyObject;
export function toPonyObjectAdmin(character: ICharacter | undefined): PonyObject | null;
export function toPonyObjectAdmin(character: ICharacter | undefined): PonyObject | null {
	return character ? { ...toPonyObject(character)!, creator: character.creator } : null;
}

export const toSocialSiteFields = '_id name provider url';

export function toSocialSite({ _id, name, provider, url }: IAuth): SocialSite {
	return { id: _id.toString(), name, provider, url };
}

/* istanbul ignore next */
export function execAsync(command: string, options?: ExecOptions) {
	return new Promise<{ stdout: string; stderr: string; }>((resolve, reject) => {
		exec(command, options || {}, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else {
				resolve({ stdout, stderr });
			}
		});
	});
}

/* istanbul ignore next */
export async function logErrorToFile(message: string, data: any) {
	const fileName = `error-${Date.now()}.json`;
	const filePath = paths.pathTo('store', fileName);
	await fs.writeFileAsync(filePath, JSON.stringify({ message, data }, null, 2), 'utf8');
	return fileName;
}

/* istanbul ignore next */
export async function getDiskSpace() {
	// NOTE: add your own code here
	return '';
}

/* istanbul ignore next */
export async function getCertificateExpirationDate() {
	// NOTE: add your own code here
	return '';
}

/* istanbul ignore next */
export async function getMemoryUsage() {
	// NOTE: add your own code here
	return `0%`;
}

/* istanbul ignore next */
export function handlePromiseDefault(promise: Promise<any>, errorHandler: any = noop) {
	Promise.resolve(promise).catch(errorHandler);
}

export function cached<TResult, T extends Function>(func: T, cacheTimeout = 1000): T & { clear(...args: any[]): void; } {
	const cacheMap = new Map<string, { timeout: any; result: TResult; }>();

	const cachedFunc: any = (...args: any[]) => {
		const cacheKey = JSON.stringify(args);
		const cache = cacheMap.get(cacheKey);

		if (cache) {
			clearTimeout(cache.timeout);
			cache.timeout = setTimeout(() => cacheMap.delete(cacheKey), cacheTimeout);
			return cache.result;
		} else {
			const result = func(...args);
			const timeout = setTimeout(() => cacheMap.delete(cacheKey), cacheTimeout);
			cacheMap.set(cacheKey, { result, timeout });
			return result;
		}
	};

	cachedFunc.clear = (...args: any[]) => {
		cacheMap.delete(JSON.stringify(args));
	};

	return cachedFunc;
}
