"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../common/constants");
const utils_1 = require("../../common/utils");
const accountUtils_1 = require("../accountUtils");
const chat_1 = require("../chat");
const logger_1 = require("../logger");
const actionLimiter_1 = require("./actionLimiter");
const playerUtils_1 = require("../playerUtils");
const entityUtils_1 = require("../entityUtils");
exports.PENDING_LIMIT = 2;
exports.REJECTED_LIMIT = 5;
exports.REJECTED_TIMEOUT = 2 * constants_1.HOUR;
function isFriend(client, friend) {
    return client.friends.has(friend.accountId);
}
exports.isFriend = isFriend;
function isOnlineFriend(client, friend) {
    return client.friends.has(friend.accountId) && !friend.accountSettings.hidden;
}
exports.isOnlineFriend = isOnlineFriend;
function toFriendOnline(client) {
    return {
        accountId: client.accountId,
        accountName: client.accountName,
        status: 1 /* Online */,
        entityId: client.pony.id,
        crc: client.pony.crc,
        name: client.pony.name,
        nameBad: client.pony.nameBad,
        info: client.pony.infoSafe,
    };
}
exports.toFriendOnline = toFriendOnline;
function toFriendOffline(client) {
    return {
        accountId: client.accountId,
        accountName: client.accountName,
        status: 0 /* None */,
        entityId: 0,
    };
}
exports.toFriendOffline = toFriendOffline;
function toFriendRemove(client) {
    return {
        accountId: client.accountId,
        status: 2 /* Remove */,
    };
}
exports.toFriendRemove = toFriendRemove;
function toFriend(client) {
    if (client.isConnected) {
        return toFriendOnline(client);
    }
    else {
        return toFriendOffline(client);
    }
}
exports.toFriend = toFriend;
class FriendsService {
    constructor(notificationService, reportInviteLimit) {
        this.notificationService = notificationService;
        this.reportInviteLimit = reportInviteLimit;
        this.limiter = new actionLimiter_1.ActionLimiter(exports.REJECTED_TIMEOUT, exports.REJECTED_LIMIT);
        this.pending = new Map();
    }
    dispose() {
        this.limiter.dispose();
    }
    clientDisconnected(client) {
        for (const key of Array.from(this.pending.keys())) {
            const pending = this.pending.get(key);
            pending.delete(client.accountId);
            if (!pending.size) {
                this.pending.delete(key);
            }
        }
    }
    remove(client, friend) {
        accountUtils_1.removeFriend(client.accountId, friend.accountId).catch(e => logger_1.logger.error(e));
        client.friends.delete(friend.accountId);
        client.friendsCRC = undefined;
        friend.friends.delete(client.accountId);
        friend.friendsCRC = undefined;
        client.reporter.systemLog(`Removed friend [${friend.accountId}]`);
        client.updateFriends([{ accountId: friend.accountId, status: 2 /* Remove */ }], false);
        friend.updateFriends([{ accountId: client.accountId, status: 2 /* Remove */ }], false);
        playerUtils_1.updateEntityPlayerState(client, friend.pony);
        playerUtils_1.updateEntityPlayerState(friend, client.pony);
    }
    removeByAccountId(client, friendAccountId) {
        accountUtils_1.removeFriend(client.accountId, friendAccountId).catch(e => logger_1.logger.error(e));
        client.friends.delete(friendAccountId);
        client.friendsCRC = undefined;
        client.reporter.systemLog(`Removed friend [${friendAccountId}]`);
        client.updateFriends([{ accountId: friendAccountId, status: 2 /* Remove */ }], false);
    }
    add(client, target) {
        const can = this.limiter.canExecute(client, target);
        if (can === 4 /* LimitReached */) {
            return chat_1.saySystem(client, 'Reached request rejection limit');
        }
        else if (can !== 0 /* Yes */) {
            return chat_1.saySystem(client, 'Cannot send request');
        }
        const pending = this.pending.get(client.accountId) || new Set();
        if (pending.has(target.accountId))
            return chat_1.saySystem(client, 'Already sent request');
        if (isFriend(client, target))
            return chat_1.saySystem(client, 'Already on friends list');
        if (client.friends.size >= constants_1.FRIENDS_LIMIT)
            return chat_1.saySystem(client, 'Your friend list is full');
        if (target.friends.size >= constants_1.FRIENDS_LIMIT)
            return chat_1.saySystem(client, 'Target player friend list is full');
        if (utils_1.hasFlag(client.account.flags, 256 /* BlockFriendRequests */))
            return chat_1.saySystem(client, 'Cannot send request');
        if (target.accountSettings.ignoreFriendInvites)
            return chat_1.saySystem(client, 'Cannot send request');
        if (pending.size >= exports.PENDING_LIMIT)
            return chat_1.saySystem(client, 'Too many pending requests');
        const notificationId = this.addInviteNotification(client, target);
        if (!notificationId) {
            return chat_1.saySystem(client, 'Cannot send request');
        }
        pending.add(target.accountId);
        this.pending.set(client.accountId, pending);
        client.reporter.systemLog(`Friend request [${target.accountId}]`);
    }
    acceptInvitation(client, friend, notificationId) {
        client.reporter.systemLog(`Friend request accepted by [${friend.accountId}]`);
        chat_1.saySystem(client, `Friend request accepted by ${entityUtils_1.getEntityName(friend.pony, client)}`);
        accountUtils_1.addFriend(client.accountId, friend.accountId)
            .catch(e => {
            if (e.message !== `Friend request already exists`) {
                logger_1.logger.error(e);
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
        playerUtils_1.updateEntityPlayerState(client, friend.pony);
        playerUtils_1.updateEntityPlayerState(friend, client.pony);
    }
    rejectInvitation(client, friend, notificationId) {
        client.reporter.systemLog(`Friend request rejected by [${friend.accountId}]`);
        chat_1.saySystem(client, `Friend request rejected by ${entityUtils_1.getEntityName(friend.pony, client)}`);
        this.removePending(client, friend);
        this.notificationService.removeNotification(friend, notificationId);
        this.countReject(client);
    }
    removePending(client, friend) {
        const pending = this.pending.get(client.accountId);
        if (pending) {
            pending.delete(friend.accountId);
            if (pending.size === 0) {
                this.pending.delete(client.accountId);
            }
        }
    }
    countReject(invitedBy) {
        const count = this.limiter.count(invitedBy);
        if (count >= exports.REJECTED_LIMIT) {
            this.reportInviteLimit(invitedBy);
        }
    }
    addInviteNotification(client, friend) {
        const notificationId = this.notificationService.addNotification(friend, {
            id: 0,
            sender: client,
            name: client.pony.name || '',
            entityId: client.pony.id,
            message: `<div class="text-friends"><b>Friend request</b></div><b>#NAME#</b> wants to add you to their friends`,
            flags: 8 /* Accept */ | 16 /* Reject */ | 64 /* Ignore */ |
                (client.pony.nameBad ? 128 /* NameBad */ : 0),
            accept: () => this.acceptInvitation(client, friend, notificationId),
            reject: () => this.rejectInvitation(client, friend, notificationId),
        });
        return notificationId;
    }
}
exports.FriendsService = FriendsService;
//# sourceMappingURL=friends.js.map