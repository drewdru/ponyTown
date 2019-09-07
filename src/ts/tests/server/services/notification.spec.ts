import '../../lib';
import { uniqueId } from 'lodash';
import { expect } from 'chai';
import { stub, spy, assert } from 'sinon';
import { IClient } from '../../../server/serverInterfaces';
import { NotificationService } from '../../../server/services/notification';
import { times } from '../../../common/utils';

describe('NotificationService', () => {
	let notificationService: NotificationService;
	let client: IClient;

	function createClient(): IClient {
		return {
			notifications: [],
			addNotification() { },
			removeNotification() { },
		} as any;
	}

	beforeEach(() => {
		notificationService = new NotificationService();
		client = createClient();
	});

	after(() => {
		notificationService = undefined as any;
		client = undefined as any;
	});

	describe('addNotification()', () => {
		it('adds notification to client', () => {
			const notification = { id: 0, name: 'name', message: 'test' };

			notificationService.addNotification(client, notification);

			expect(client.notifications).contain(notification);
		});

		it('returns new notification ID', () => {
			const notification = { id: 0, name: 'name', message: 'test' };

			expect(notificationService.addNotification(client, notification)).equal(1);
		});

		it('assigns ID to notification', () => {
			const notification = { id: 0, name: 'name', message: 'test1' };
			client.notifications.push({ id: 1, name: 'name', message: 'test2' });

			notificationService.addNotification(client, notification);

			expect(notification.id).not.equal(0);
		});

		it('sends addNotification', () => {
			const notification = { id: 0, name: 'name', message: 'test', note: 'note', flags: 123 };
			const addNotification = stub(client, 'addNotification');

			notificationService.addNotification(client, notification);

			assert.calledWith(addNotification, 1, 0, 'name', 'test', 'note', 123);
		});

		it('does not add notification to client if limit is reached', () => {
			times(10, () => notificationService.addNotification(client, { id: 0, name: 'name', message: uniqueId('test') }));
			const addNotification = stub(client, 'addNotification');

			expect(notificationService.addNotification(client, { id: 0, name: 'name', message: uniqueId('test') })).equal(0);

			assert.notCalled(addNotification);
		});

		it('does not add notification to client if identical notification already exists', () => {
			const addNotification = stub(client, 'addNotification');

			expect(notificationService.addNotification(client, { id: 0, name: 'name', message: 'foo' })).not.equal(0);
			expect(notificationService.addNotification(client, { id: 0, name: 'name', message: 'foo' })).equal(0);

			expect(client.notifications.length).equal(1);
			assert.calledOnce(addNotification);
		});
	});

	describe('removeNotification()', () => {
		it('removes notification from client', () => {
			const notification = { id: 1, name: 'name', message: 'test' };
			client.notifications.push(notification);

			notificationService.removeNotification(client, 1);

			expect(client.notifications).not.contain(notification);
		});

		it('does nothing if notification does not exist', () => {
			const removeNotification = stub(client, 'removeNotification');

			notificationService.removeNotification(client, 1);

			assert.notCalled(removeNotification);
		});

		it('sends removeNotification', () => {
			client.notifications.push({ id: 1, name: 'name', message: 'test' });
			const removeNotification = stub(client, 'removeNotification');

			notificationService.removeNotification(client, 1);

			assert.calledWith(removeNotification, 1);
		});

		it('returns true if notification is removed', () => {
			client.notifications.push({ id: 1, name: 'name', message: 'test' });

			expect(notificationService.removeNotification(client, 1)).true;
		});

		it('returns false if notification does not exist', () => {
			expect(notificationService.removeNotification(client, 1)).false;
		});
	});

	describe('acceptNotification()', () => {
		it('calls accept callback', () => {
			const accept = spy();
			notificationService.addNotification(client, { id: 0, name: 'name', message: 'test', accept });

			notificationService.acceptNotification(client, 1);

			assert.calledOnce(accept);
		});

		it('removes notification', () => {
			notificationService.addNotification(client, { id: 0, name: 'name', message: 'test', accept() { } });
			const removeNotification = stub(notificationService, 'removeNotification');

			notificationService.acceptNotification(client, 1);

			assert.calledWith(removeNotification, client, 1);
		});

		it('does nothing if notification does not exist', () => {
			const removeNotification = stub(client, 'removeNotification');

			notificationService.acceptNotification(client, 1);

			assert.notCalled(removeNotification);
		});

		it('works if notification does not have accept callback', () => {
			const notification = { id: 0, name: 'name', message: 'test' };
			notificationService.addNotification(client, notification);

			notificationService.acceptNotification(client, 1);

			expect(client.notifications).not.include(notification);
		});
	});

	describe('rejectNotification()', () => {
		it('calls reject callback', () => {
			const reject = spy();
			notificationService.addNotification(client, { id: 0, name: 'name', message: 'test', reject });

			notificationService.rejectNotification(client, 1);

			assert.calledOnce(reject);
		});

		it('removes notification', () => {
			notificationService.addNotification(client, { id: 0, name: 'name', message: 'test', accept() { } });
			const removeNotification = stub(notificationService, 'removeNotification');

			notificationService.rejectNotification(client, 1);

			assert.calledWith(removeNotification, client, 1);
		});

		it('does nothing if notification does not exist', () => {
			const removeNotification = stub(client, 'removeNotification');

			notificationService.rejectNotification(client, 1);

			assert.notCalled(removeNotification);
		});

		it('works if notification does not have reject callback', () => {
			const notification = { id: 0, name: 'name', message: 'test' };
			notificationService.addNotification(client, notification);

			notificationService.rejectNotification(client, 1);

			expect(client.notifications).not.include(notification);
		});
	});

	describe('rejectAll()', () => {
		it('rejects all notifications', () => {
			client.notifications = [{ id: 1 }, { id: 2 }] as any;
			const rejectNotification = stub(notificationService, 'rejectNotification');

			notificationService.rejectAll(client);

			assert.calledWith(rejectNotification, client, 1);
			assert.calledWith(rejectNotification, client, 2);
		});
	});
});
