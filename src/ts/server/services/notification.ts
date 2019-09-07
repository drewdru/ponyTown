import { findById, removeById } from '../../common/utils';
import { IClient, ServerNotification } from '../serverInterfaces';

const NOTIFICATION_LIMIT = 10;

function getId(notifications: ServerNotification[]) {
	for (let id = 1; id <= 0xffff; id++) {
		if (!findById(notifications, id)) {
			return id;
		}
	}

	/* istanbul ignore next */
	throw new Error('Unable to get unique id for notification');
}

function hasNotification(client: IClient, notification: ServerNotification) {
	return client.notifications.some(n =>
		n.message === notification.message &&
		n.flags === notification.flags &&
		n.note === notification.note &&
		n.sender === notification.sender &&
		n.entityId === notification.entityId);
}

export class NotificationService {
	addNotification(client: IClient, notification: ServerNotification) {
		if (client.notifications.length >= NOTIFICATION_LIMIT || hasNotification(client, notification)) {
			return 0;
		} else {
			notification.id = getId(client.notifications);
			client.notifications.push(notification);
			const { id, entityId = 0, name, message, note = '', flags = 0 } = notification;
			client.addNotification(id, entityId, name, message, note, flags);
			return notification.id;
		}
	}
	removeNotification(client: IClient, id: number) {
		if (removeById(client.notifications, id)) {
			client.removeNotification(id);
			return true;
		} else {
			return false;
		}
	}
	acceptNotification(client: IClient, id: number) {
		const notification = findById(client.notifications, id);
		this.removeNotification(client, id);

		if (notification && notification.accept) {
			notification.accept();
		}
	}
	rejectNotification(client: IClient, id: number) {
		const notification = findById(client.notifications, id);
		this.removeNotification(client, id);

		if (notification && notification.reject) {
			notification.reject();
		}
	}
	rejectAll(client: IClient) {
		client.notifications.slice()
			.forEach(n => this.rejectNotification(client, n.id));
	}
	dismissAll(client: IClient) {
		while (client.notifications.length) {
			this.removeNotification(client, client.notifications[0].id);
		}
	}
}
