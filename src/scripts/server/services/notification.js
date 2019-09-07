"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../common/utils");
const NOTIFICATION_LIMIT = 10;
function getId(notifications) {
    for (let id = 1; id <= 0xffff; id++) {
        if (!utils_1.findById(notifications, id)) {
            return id;
        }
    }
    /* istanbul ignore next */
    throw new Error('Unable to get unique id for notification');
}
function hasNotification(client, notification) {
    return client.notifications.some(n => n.message === notification.message &&
        n.flags === notification.flags &&
        n.note === notification.note &&
        n.sender === notification.sender &&
        n.entityId === notification.entityId);
}
class NotificationService {
    addNotification(client, notification) {
        if (client.notifications.length >= NOTIFICATION_LIMIT || hasNotification(client, notification)) {
            return 0;
        }
        else {
            notification.id = getId(client.notifications);
            client.notifications.push(notification);
            const { id, entityId = 0, name, message, note = '', flags = 0 } = notification;
            client.addNotification(id, entityId, name, message, note, flags);
            return notification.id;
        }
    }
    removeNotification(client, id) {
        if (utils_1.removeById(client.notifications, id)) {
            client.removeNotification(id);
            return true;
        }
        else {
            return false;
        }
    }
    acceptNotification(client, id) {
        const notification = utils_1.findById(client.notifications, id);
        this.removeNotification(client, id);
        if (notification && notification.accept) {
            notification.accept();
        }
    }
    rejectNotification(client, id) {
        const notification = utils_1.findById(client.notifications, id);
        this.removeNotification(client, id);
        if (notification && notification.reject) {
            notification.reject();
        }
    }
    rejectAll(client) {
        client.notifications.slice()
            .forEach(n => this.rejectNotification(client, n.id));
    }
    dismissAll(client) {
        while (client.notifications.length) {
            this.removeNotification(client, client.notifications[0].id);
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.js.map