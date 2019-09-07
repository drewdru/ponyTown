import { parse } from 'url';
import { VERSION_ERROR } from '../../common/errors';
import { IAccount, IOriginInfo, ICharacter, FindCharacter, HasActiveSupporterInvites } from '../db';
import { UserError } from '../userError';
import { InternalGameServerState } from '../../common/adminInterfaces';
import { JoinResponse } from '../../common/interfaces';
import { meetsRequirement } from '../../common/accountUtils';
import { supporterLevel } from '../../common/adminUtils';
import { isServerOffline } from '../serverUtils';
import { getAccountAlertMessage } from '../accountUtils';

export interface Config {
	version: string;
	host: string;
	debug: boolean;
	local: boolean;
}

export type FindServer = (id: string) => InternalGameServerState | undefined;
export type Join = (server: InternalGameServerState, account: IAccount, pony: ICharacter) => Promise<string>;
export type AddOrigin = (account: IAccount, origin: IOriginInfo) => Promise<void>;
export type JoinGame = (
	account: IAccount, characterId: string, serverId: string, clientVersion: string, url: string, alert: unknown,
	origin: IOriginInfo
) => Promise<JoinResponse>;

export const createJoinGame =
	(
		findServer: FindServer, { version, host, debug, local }: Config, findCharacter: FindCharacter, join: Join,
		addOrigin: AddOrigin, hasInvites: HasActiveSupporterInvites
	): JoinGame => {
		const waiting = new Map<string, { time: Date; characterId: string; }>();

		return async (account, characterId, serverId, clientVersion, url, hasAlert, origin) => {
			const accountId = account._id.toString();

			try {
				const [server, supporterInvited] = await Promise.all([
					findServer(serverId),
					hasInvites(account._id),
				]);

				if (clientVersion !== version)
					throw new UserError(VERSION_ERROR);

				if (parse(url).host !== parse(host).host && !debug && !local)
					throw new UserError('Invalid data', { message: 'Invalid host', desc: url });

				if (!server)
					throw new UserError('Invalid data');

				if (isServerOffline(server))
					throw new UserError('Server is offline');

				if (server.state.settings.blockJoining)
					throw new UserError('Cannot join to the server');

				if (!meetsRequirement({ roles: account.roles, supporter: supporterLevel(account), supporterInvited }, server.state.require))
					throw new UserError('Server is restricted');

				if (!characterId || typeof characterId !== 'string')
					throw new UserError('Invalid data', { message: 'Invalid pony ID', desc: `"${characterId}"` });

				const req = waiting.get(accountId);
				const time = new Date();

				if (req) {
					throw new UserError('Already waiting for join request');
				}

				const alert = getAccountAlertMessage(account);

				if (alert && !hasAlert) {
					return { alert };
				}

				waiting.set(accountId, { characterId, time });

				const character = await findCharacter(characterId, account._id);

				if (!character) {
					throw new UserError('Character does not exist', {
						desc: `(join) (account: ${accountId} pony: ${characterId})`
					});
				}

				await addOrigin(account, origin);
				const token = await join(server, account, character!);
				return { token };
			} finally {
				waiting.delete(accountId);
			}
		};
	};
