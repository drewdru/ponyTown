import { NotificationFlags, FriendStatusFlags, FriendStatusData } from '../../common/interfaces';
import { HOUR, FRIENDS_LIMIT } from '../../common/constants';
import { AccountFlags } from '../../common/adminInterfaces';
import { hasFlag } from '../../common/utils';
import { IClient } from '../serverInterfaces';
import { addFriend, removeFriend } from '../accountUtils';
import { saySystem } from '../chat';
import { logger } from '../logger';
import { NotificationService } from './notification';
import { ActionLimiter, LimiterResult } from './actionLimiter';
import { updateEntityPlayerState } from '../playerUtils';
import { getEntityName } from '../entityUtils';

export const PENDING_LIMIT = 2;
export const REJECTED_LIMIT = 5;
export const REJECTED_TIMEOUT = 2 * HOUR;

export function isFriend(client: IClient, friend: IClient) {
	return client.friends.has(friend.accountId);
}

export function isOnlineFriend(client: IClient, friend: IClient) {
	return client.friends.has(friend.accountId) && !friend.accountSettings.hidden;
}

export function toFriendOnline(client: IClient): FriendStatusData {
	return {
		accountId: client.accountId,
		accountName: client.accountName,
		status: FriendStatusFlags.Online,
		entityId: client.pony.id,
		crc: client.pony.crc,
		name: client.pony.name,
		nameBad: client.pony.nameBad,
		info: client.pony.infoSafe,
	};
}

export function toFriendOffline(client: IClient): FriendStatusData {
	return {
		accountId: client.accountId,
		accountName: client.accountName,
		status: FriendStatusFlags.None,
		entityId: 0,
	};
}

export function toFriendRemove(client: IClient): FriendStatusData {
	return {
		accountId: client.accountId,
		status: FriendStatusFlags.Remove,
	};
}

export function toFriend(client: IClient): FriendStatusData {
	if (client.isConnected) {
		return toFriendOnline(client);
	} else {
		return toFriendOffline(client);
	}
}

export class FriendsService {
	private limiter = new ActionLimiter(REJECTED_TIMEOUT, REJECTED_LIMIT);
	private pending = new Map<string, Set<string>>();
	constructor(
		private notificationService: NotificationService,
		private reportInviteLimit: (client: IClient) => void
	) {
	}
	dispose() {
		this.limiter.dispose();
	}
	clientDisconnected(client: IClient) {
		for (const key of Array.from(this.pending.keys())) {
			const pending = this.pending.get(key)!;
			pending.delete(client.accountId);

			if (!pending.size) {
				this.pending.delete(key);
			}
		}
	}
	remove(client: IClient, friend: IClient) {
		removeFriend(client.accountId, friend.accountId).catch(e => logger.error(e));
		client.friends.delete(friend.accountId);
		client.friendsCRC = undefined;
		friend.friends.delete(client.accountId);
		friend.friendsCRC = undefined;
		client.reporter.systemLog(`Removed friend [${friend.accountId}]`);
		client.updateFriends([{ accountId: friend.accountId, status: FriendStatusFlags.Remove }], false);
		friend.updateFriends([{ accountId: client.accountId, status: FriendStatusFlags.Remove }], false);
		updateEntityPlayerState(client, friend.pony);
		updateEntityPlayerState(friend, client.pony);
	}
	removeByAccountId(client: IClient, friendAccountId: string) {
		removeFriend(client.accountId, friendAccountId).catch(e => logger.error(e));
		client.friends.delete(friendAccountId);
		client.friendsCRC = undefined;
		client.reporter.systemLog(`Removed friend [${friendAccountId}]`);
		client.updateFriends([{ accountId: friendAccountId, status: FriendStatusFlags.Remove }], false);
	}
	add(client: IClient, target: IClient) {
		const can = this.limiter.canExecute(client, target);

		if (can === LimiterResult.LimitReached) {
			return saySystem(client, 'Reached request rejection limit');
		} else if (can !== LimiterResult.Yes) {
			return saySystem(client, 'Cannot send request');
		}

		const pending = this.pending.get(client.accountId) || new Set();

		if (pending.has(target.accountId))
			return saySystem(client, 'Already sent request');

		if (isFriend(client, target))
			return saySystem(client, 'Already on friends list');

		if (client.friends.size >= FRIENDS_LIMIT)
			return saySystem(client, 'Your friend list is full');

		if (target.friends.size >= FRIENDS_LIMIT)
			return saySystem(client, 'Target player friend list is full');

		if (hasFlag(client.account.flags, AccountFlags.BlockFriendRequests))
			return saySystem(client, 'Cannot send request');

		if (target.accountSettings.ignoreFriendInvites)
			return saySystem(client, 'Cannot send request');

		if (pending.size >= PENDING_LIMIT)
			return saySystem(client, 'Too many pending requests');

		const notificationId = this.addInviteNotification(client, target);

		if (!notificationId) {
			return saySystem(client, 'Cannot send request');
		}

		pending.add(target.accountId);
		this.pending.set(client.accountId, pending);
		client.reporter.systemLog(`Friend request [${target.accountId}]`);
	}
	private acceptInvitation(client: IClient, friend: IClient, notificationId: number) {
		client.reporter.systemLog(`Friend request accepted by [${friend.accountId}]`);
		saySystem(client, `Friend request accepted by ${getEntityName(friend.pony, client)}`);

		addFriend(client.accountId, friend.accountId)
			.catch(e => {
				if (e.message !== `Friend request already exists`) {
					logger.error(e);
				}
			});

		client.friends.add(friend.accountId);
		client.friendsCRC = undefined;
		friend.friends.add(client.accountId);
		friend.friendsCRC = undefined;
		this.removePending(client, friend);
		this.notificationService.removeNotification(friend, notificationId);
		client.updateFriends([toFriend(friend)], false);
		friend.updateFriends([toFriend(client)], false);
		updateEntityPlayerState(client, friend.pony);
		updateEntityPlayerState(friend, client.pony);
	}
	private rejectInvitation(client: IClient, friend: IClient, notificationId: number) {
		client.reporter.systemLog(`Friend request rejected by [${friend.accountId}]`);
		saySystem(client, `Friend request rejected by ${getEntityName(friend.pony, client)}`);
		this.removePending(client, friend);
		this.notificationService.removeNotification(friend, notificationId);
		this.countReject(client);
	}
	private removePending(client: IClient, friend: IClient) {
		const pending = this.pending.get(client.accountId);

		if (pending) {
			pending.delete(friend.accountId);

			if (pending.size === 0) {
				this.pending.delete(client.accountId);
			}
		}
	}
	private countReject(invitedBy: IClient) {
		const count = this.limiter.count(invitedBy);

		if (count >= REJECTED_LIMIT) {
			this.reportInviteLimit(invitedBy);
		}
	}
	private addInviteNotification(client: IClient, friend: IClient) {
		const notificationId = this.notificationService.addNotification(friend, {
			id: 0,
			sender: client,
			name: client.pony.name || '',
			entityId: client.pony.id,
			message: `<div class="text-friends"><b>Friend request</b></div><b>#NAME#</b> wants to add you to their friends`,
			flags: NotificationFlags.Accept | NotificationFlags.Reject | NotificationFlags.Ignore |
				(client.pony.nameBad ? NotificationFlags.NameBad : 0),
			accept: () => this.acceptInvitation(client, friend, notificationId),
			reject: () => this.rejectInvitation(client, friend, notificationId),
		});

		return notificationId;
	}
}
