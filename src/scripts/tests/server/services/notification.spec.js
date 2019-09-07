"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../../lib");
const lodash_1 = require("lodash");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const notification_1 = require("../../../server/services/notification");
const utils_1 = require("../../../common/utils");
describe('NotificationService', () => {
    let notificationService;
    let client;
    function createClient() {
        return {
            notifications: [],
            addNotification() { },
            removeNotification() { },
        };
    }
    beforeEach(() => {
        notificationService = new notification_1.NotificationService();
        client = createClient();
    });
    after(() => {
        notificationService = undefined;
        client = undefined;
    });
    describe('addNotification()', () => {
        it('adds notification to client', () => {
            const notification = { id: 0, name: 'name', message: 'test' };
            notificationService.addNotification(client, notification);
            chai_1.expect(client.notifications).contain(notification);
        });
        it('returns new notification ID', () => {
            const notification = { id: 0, name: 'name', message: 'test' };
            chai_1.expect(notificationService.addNotification(client, notification)).equal(1);
        });
        it('assigns ID to notification', () => {
            const notification = { id: 0, name: 'name', message: 'test1' };
            client.notifications.push({ id: 1, name: 'name', message: 'test2' });
            notificationService.addNotification(client, notification);
            chai_1.expect(notification.id).not.equal(0);
        });
        it('sends addNotification', () => {
            const notification = { id: 0, name: 'name', message: 'test', note: 'note', flags: 123 };
            const addNotification = sinon_1.stub(client, 'addNotification');
            notificationService.addNotification(client, notification);
            sinon_1.assert.calledWith(addNotification, 1, 0, 'name', 'test', 'note', 123);
        });
        it('does not add notification to client if limit is reached', () => {
            utils_1.times(10, () => notificationService.addNotification(client, { id: 0, name: 'name', message: lodash_1.uniqueId('test') }));
            const addNotification = sinon_1.stub(client, 'addNotification');
            chai_1.expect(notificationService.addNotification(client, { id: 0, name: 'name', message: lodash_1.uniqueId('test') })).equal(0);
            sinon_1.assert.notCalled(addNotification);
        });
        it('does not add notification to client if identical notification already exists', () => {
            const addNotification = sinon_1.stub(client, 'addNotification');
            chai_1.expect(notificationService.addNotification(client, { id: 0, name: 'name', message: 'foo' })).not.equal(0);
            chai_1.expect(notificationService.addNotification(client, { id: 0, name: 'name', message: 'foo' })).equal(0);
            chai_1.expect(client.notifications.length).equal(1);
            sinon_1.assert.calledOnce(addNotification);
        });
    });
    describe('removeNotification()', () => {
        it('removes notification from client', () => {
            const notification = { id: 1, name: 'name', message: 'test' };
            client.notifications.push(notification);
            notificationService.removeNotification(client, 1);
            chai_1.expect(client.notifications).not.contain(notification);
        });
        it('does nothing if notification does not exist', () => {
            const removeNotification = sinon_1.stub(client, 'removeNotification');
            notificationService.removeNotification(client, 1);
            sinon_1.assert.notCalled(removeNotification);
        });
        it('sends removeNotification', () => {
            client.notifications.push({ id: 1, name: 'name', message: 'test' });
            const removeNotification = sinon_1.stub(client, 'removeNotification');
            notificationService.removeNotification(client, 1);
            sinon_1.assert.calledWith(removeNotification, 1);
        });
        it('returns true if notification is removed', () => {
            client.notifications.push({ id: 1, name: 'name', message: 'test' });
            chai_1.expect(notificationService.removeNotification(client, 1)).true;
        });
        it('returns false if notification does not exist', () => {
            chai_1.expect(notificationService.removeNotification(client, 1)).false;
        });
    });
    describe('acceptNotification()', () => {
        it('calls accept callback', () => {
            const accept = sinon_1.spy();
            notificationService.addNotification(client, { id: 0, name: 'name', message: 'test', accept });
            notificationService.acceptNotification(client, 1);
            sinon_1.assert.calledOnce(accept);
        });
        it('removes notification', () => {
            notificationService.addNotification(client, { id: 0, name: 'name', message: 'test', accept() { } });
            const removeNotification = sinon_1.stub(notificationService, 'removeNotification');
            notificationService.acceptNotification(client, 1);
            sinon_1.assert.calledWith(removeNotification, client, 1);
        });
        it('does nothing if notification does not exist', () => {
            const removeNotification = sinon_1.stub(client, 'removeNotification');
            notificationService.acceptNotification(client, 1);
            sinon_1.assert.notCalled(removeNotification);
        });
        it('works if notification does not have accept callback', () => {
            const notification = { id: 0, name: 'name', message: 'test' };
            notificationService.addNotification(client, notification);
            notificationService.acceptNotification(client, 1);
            chai_1.expect(client.notifications).not.include(notification);
        });
    });
    describe('rejectNotification()', () => {
        it('calls reject callback', () => {
            const reject = sinon_1.spy();
            notificationService.addNotification(client, { id: 0, name: 'name', message: 'test', reject });
            notificationService.rejectNotification(client, 1);
            sinon_1.assert.calledOnce(reject);
        });
        it('removes notification', () => {
            notificationService.addNotification(client, { id: 0, name: 'name', message: 'test', accept() { } });
            const removeNotification = sinon_1.stub(notificationService, 'removeNotification');
            notificationService.rejectNotification(client, 1);
            sinon_1.assert.calledWith(removeNotification, client, 1);
        });
        it('does nothing if notification does not exist', () => {
            const removeNotification = sinon_1.stub(client, 'removeNotification');
            notificationService.rejectNotification(client, 1);
            sinon_1.assert.notCalled(removeNotification);
        });
        it('works if notification does not have reject callback', () => {
            const notification = { id: 0, name: 'name', message: 'test' };
            notificationService.addNotification(client, notification);
            notificationService.rejectNotification(client, 1);
            chai_1.expect(client.notifications).not.include(notification);
        });
    });
    describe('rejectAll()', () => {
        it('rejects all notifications', () => {
            client.notifications = [{ id: 1 }, { id: 2 }];
            const rejectNotification = sinon_1.stub(notificationService, 'rejectNotification');
            notificationService.rejectAll(client);
            sinon_1.assert.calledWith(rejectNotification, client, 1);
            sinon_1.assert.calledWith(rejectNotification, client, 2);
        });
    });
});
//# sourceMappingURL=notification.spec.js.map