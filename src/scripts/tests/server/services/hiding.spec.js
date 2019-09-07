"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
const operators_1 = require("rxjs/operators");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const constants_1 = require("../../../common/constants");
const hiding_1 = require("../../../server/services/hiding");
const notification_1 = require("../../../server/services/notification");
const logger_1 = require("../../../server/logger");
const mocks_1 = require("../../mocks");
const utils_1 = require("../../../common/utils");
const DURATION = 24 * constants_1.HOUR;
function isHidden(a, b) {
    return a.hides.has(b.accountId) || b.hides.has(a.accountId);
}
describe('HidingService', () => {
    let notifications = lib_1.stubClass(notification_1.NotificationService);
    let service;
    let clock;
    let log;
    let clients;
    function addClients(...items) {
        items.forEach(c => clients.set(c.accountId, c));
    }
    beforeEach(() => {
        lib_1.resetStubMethods(notifications, 'addNotification');
        clock = sinon_1.useFakeTimers();
        clock.setSystemTime(constants_1.DAY);
        log = sinon_1.stub();
        clients = new Map();
        service = new hiding_1.HidingService(constants_1.HOUR, notifications, id => clients.get(id), log);
        service.start();
    });
    afterEach(() => {
        clock.restore();
        service.stop();
    });
    describe('requestHide()', () => {
        it('adds hide notification', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            target.pony.name = 'foo';
            service.requestHide(requester, target, DURATION);
            sinon_1.assert.calledWith(notifications.addNotification, requester, sinon_1.match({
                name: 'foo',
                message: `Are you sure you want to hide <b>#NAME#</b> ?`,
                entityId: target.pony.id,
            }));
        });
        it('adds hide limit notification if reached hide limit', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            utils_1.times(constants_1.HIDE_LIMIT, () => service.hide(requester, mocks_1.mockClient(), DURATION));
            service.requestHide(requester, target, DURATION);
            sinon_1.assert.calledWith(notifications.addNotification, requester, sinon_1.match({
                message: 'Cannot hide any more players.',
            }));
        });
        it('accepting notification hides target player', () => {
            const requester = mocks_1.mockClient();
            requester.characterName = 'req_pony';
            requester.account.name = 'req';
            requester.accountId = 'REQ';
            const target = mocks_1.mockClient();
            target.characterName = 'tgt_pony';
            target.account.name = 'tgt';
            target.accountId = 'TGT';
            service.requestHide(requester, target, DURATION);
            const notification = notifications.addNotification.args[0][1];
            notification.accept();
            chai_1.expect(isHidden(requester, target)).true;
            chai_1.expect(service.isHidden('REQ', 'TGT')).true;
            sinon_1.assert.calledWith(log, '[REQ][system]\treq_pony (req) hides tgt_pony (tgt) [TGT]');
        });
        it('does not log message if already hidden', () => {
            const requester = mocks_1.mockClient();
            requester.accountId = 'REQ';
            const target = mocks_1.mockClient();
            target.accountId = 'TGT';
            service.requestHide(requester, target, DURATION);
            service.hide(requester, target, DURATION);
            const notification = notifications.addNotification.args[0][1];
            notification.accept();
            sinon_1.assert.notCalled(log);
        });
        it('prevents hiding party members', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            requester.party = target.party = { id: '', clients: [requester, target], leader: requester, pending: [] };
            service.requestHide(requester, target, DURATION);
            chai_1.expect(isHidden(requester, target)).false;
            sinon_1.assert.calledWith(notifications.addNotification, requester, sinon_1.match({
                message: 'Cannot hide players from your party.',
            }));
        });
    });
    describe('requestUnhideAll()', () => {
        it('adds unhide notification', () => {
            const requester = mocks_1.mockClient();
            service.requestUnhideAll(requester);
            sinon_1.assert.calledWith(notifications.addNotification, requester, sinon_1.match({
                message: 'Are you sure you want to unhide all temporarily hidden players ?',
            }));
        });
        it('adds unhide notification if previous limit timed out', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.unhideAll(requester);
            service.stop();
            clock.tick(constants_1.HOUR + 1);
            service.requestUnhideAll(requester);
            sinon_1.assert.calledWith(notifications.addNotification, requester, sinon_1.match({
                message: 'Are you sure you want to unhide all temporarily hidden players ?',
            }));
        });
        it('adds unhide limit notification if already used unhideAll', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.unhideAll(requester);
            service.requestUnhideAll(requester);
            sinon_1.assert.calledWith(notifications.addNotification, requester, sinon_1.match({
                message: 'Cannot unhide hidden players, try again later.',
            }));
        });
        it('accepting notification unhides all players', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.requestUnhideAll(requester);
            chai_1.expect(isHidden(requester, target)).true;
            const notification = notifications.addNotification.args[0][1];
            notification.accept();
            chai_1.expect(isHidden(requester, target)).false;
            chai_1.expect(service.isHidden(requester.accountId, target.accountId)).false;
            sinon_1.assert.calledWith(log, logger_1.systemMessage(requester.accountId, 'unhide all'));
        });
    });
    describe('hide()', () => {
        it('hides target user from source user', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester, target);
            service.hide(requester, target, DURATION);
            chai_1.expect(isHidden(requester, target)).true;
            chai_1.expect(service.isHiddenClient(requester, target)).true;
        });
        it('does nothing if already hidden', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester, target);
            service.hide(requester, target, DURATION);
            service.hide(requester, target, DURATION);
            chai_1.expect(isHidden(requester, target)).true;
            chai_1.expect(service.isHiddenClient(requester, target)).true;
        });
        it('hides source user from target user', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester, target);
            service.hide(requester, target, DURATION);
            chai_1.expect(isHidden(requester, target)).true;
            chai_1.expect(service.isHiddenClient(target, requester)).true;
        });
        it('does not hide user from themselves', () => {
            const requester = mocks_1.mockClient();
            addClients(requester);
            service.hide(requester, requester, DURATION);
            chai_1.expect(isHidden(requester, requester)).false;
            chai_1.expect(service.isHiddenClient(requester, requester)).false;
        });
        it('does not clean hides too early', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester, target);
            service.hide(requester, target, DURATION);
            clock.tick(25 * constants_1.MINUTE);
            chai_1.expect(isHidden(requester, target)).true;
            chai_1.expect(service.isHiddenClient(requester, target)).true;
        });
        it('cleans up old hides', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester, target);
            service.hide(requester, target, DURATION);
            clock.tick(25 * constants_1.HOUR);
            chai_1.expect(isHidden(requester, target)).false;
            chai_1.expect(service.isHiddenClient(requester, target)).false;
        });
        it('clears hide after given duration', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester, target);
            service.hide(requester, target, constants_1.HOUR / 2);
            clock.tick(constants_1.HOUR);
            chai_1.expect(isHidden(requester, target)).false;
            chai_1.expect(service.isHiddenClient(requester, target)).false;
        });
        it('triggers change event', done => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester, target);
            service.changes.subscribe(hide => {
                chai_1.expect(hide).eql({ by: requester.accountId, who: target.accountId });
                done();
            });
            service.hide(requester, target, DURATION);
        });
    });
    describe('isHiddenClient()', () => {
        it('hides target user from source user', () => {
            const who = mocks_1.mockClient();
            const from = mocks_1.mockClient();
            service.hide(who, from, DURATION);
            chai_1.expect(isHidden(who, from)).true;
            chai_1.expect(service.isHiddenClient(who, from)).true;
        });
    });
    describe('unhide()', () => {
        it('unhides user', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.unhide(requester, target);
            chai_1.expect(isHidden(requester, target)).false;
            chai_1.expect(service.isHiddenClient(requester, target)).false;
        });
        it('unhides only given user', () => {
            const requester = mocks_1.mockClient();
            const target1 = mocks_1.mockClient();
            const target2 = mocks_1.mockClient();
            service.hide(requester, target1, DURATION);
            service.hide(requester, target2, DURATION);
            service.unhide(requester, target1);
            chai_1.expect(isHidden(requester, target1)).false;
            chai_1.expect(isHidden(requester, target2)).true;
            chai_1.expect(service.isHiddenClient(requester, target1)).false;
            chai_1.expect(service.isHiddenClient(requester, target2)).true;
        });
        it('does nothing if not hidden', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.unhide(requester, target);
            chai_1.expect(isHidden(requester, target)).false;
            chai_1.expect(service.isHiddenClient(requester, target)).false;
        });
        it('does nothing if not hidden (2)', () => {
            const requester = mocks_1.mockClient();
            const target1 = mocks_1.mockClient();
            const target2 = mocks_1.mockClient();
            service.hide(requester, target1, DURATION);
            service.unhide(requester, target2);
            chai_1.expect(isHidden(requester, target1)).true;
            chai_1.expect(isHidden(requester, target2)).false;
            chai_1.expect(service.isHiddenClient(requester, target1)).true;
            chai_1.expect(service.isHiddenClient(requester, target2)).false;
        });
        it('triggers change event', done => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.changes.subscribe(hide => {
                chai_1.expect(hide).eql({ by: requester.accountId, who: target.accountId });
                done();
            });
            service.unhide(requester, target);
        });
    });
    describe('unhideAll()', () => {
        it('does nothing if no users are hidden', () => {
            const requester = mocks_1.mockClient();
            const target1 = mocks_1.mockClient();
            const target2 = mocks_1.mockClient();
            service.unhideAll(requester);
            chai_1.expect(isHidden(requester, target1)).false;
            chai_1.expect(isHidden(requester, target2)).false;
            chai_1.expect(service.isHiddenClient(requester, target1)).false;
            chai_1.expect(service.isHiddenClient(requester, target2)).false;
        });
        it('unhides all', () => {
            const requester = mocks_1.mockClient();
            const target1 = mocks_1.mockClient();
            const target2 = mocks_1.mockClient();
            service.hide(requester, target1, DURATION);
            service.hide(requester, target2, DURATION);
            service.unhideAll(requester);
            chai_1.expect(isHidden(requester, target1)).false;
            chai_1.expect(isHidden(requester, target2)).false;
            chai_1.expect(service.isHiddenClient(requester, target1)).false;
            chai_1.expect(service.isHiddenClient(requester, target2)).false;
        });
        it('does not count to limit if noone is hidden', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.unhideAll(requester);
            service.hide(requester, target, DURATION);
            service.unhideAll(requester);
            chai_1.expect(isHidden(requester, target)).false;
            chai_1.expect(service.isHiddenClient(requester, target)).false;
        });
        it('prevents unhide all if used too fast', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.unhideAll(requester);
            service.hide(requester, target, DURATION);
            service.unhideAll(requester);
            chai_1.expect(isHidden(requester, target)).true;
            chai_1.expect(service.isHiddenClient(requester, target)).true;
        });
        it('does not clean up old unhides too early', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.unhideAll(requester);
            service.hide(requester, target, DURATION);
            clock.tick(25 * constants_1.MINUTE);
            service.unhideAll(requester);
            chai_1.expect(isHidden(requester, target)).true;
            chai_1.expect(service.isHiddenClient(requester, target)).true;
        });
        it('cleans up old unhides', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.unhideAll(requester);
            service.hide(requester, target, DURATION);
            clock.tick(2 * constants_1.HOUR);
            service.unhideAll(requester);
            chai_1.expect(isHidden(requester, target)).false;
            chai_1.expect(service.isHiddenClient(requester, target)).false;
        });
        it('triggers unhidesAll event', done => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester, target, DURATION);
            service.unhidesAll.subscribe(id => {
                chai_1.expect(id).equal(requester.accountId);
                done();
            });
            service.unhideAll(requester);
        });
    });
    describe('merged()', () => {
        it('transfers hide list to new account ID', () => {
            const requester1 = mocks_1.mockClient();
            const requester2 = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester2);
            service.hide(requester1, target, DURATION);
            service.merged(requester2.accountId, requester1.accountId);
            chai_1.expect(isHidden(requester2, target)).true;
            chai_1.expect(service.isHiddenClient(requester2, target)).true;
        });
        it('transfers hide list to new account ID (no client)', () => {
            const requester1 = mocks_1.mockClient();
            const requester2 = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.hide(requester1, target, DURATION);
            service.merged(requester2.accountId, requester1.accountId);
            chai_1.expect(service.isHiddenClient(requester2, target)).true;
        });
        it('merges hide lists', () => {
            const requester1 = mocks_1.mockClient();
            const requester2 = mocks_1.mockClient();
            const target1 = mocks_1.mockClient();
            const target2 = mocks_1.mockClient();
            addClients(requester2, target1, target2);
            service.hide(requester1, target1, DURATION);
            service.hide(requester2, target2, DURATION);
            service.merged(requester2.accountId, requester1.accountId);
            chai_1.expect(isHidden(requester2, target1)).true;
            chai_1.expect(isHidden(requester2, target2)).true;
            chai_1.expect(service.isHiddenClient(requester2, target1)).true;
            chai_1.expect(service.isHiddenClient(requester2, target2)).true;
        });
        it('does not allow to be hidden by yourself after merge', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(target);
            service.hide(requester, target, DURATION);
            // service.hide(target, requester, DURATION);
            service.merged(target.accountId, requester.accountId);
            chai_1.expect(isHidden(target, target)).false;
            // expect(isHidden(requester, target)).false; // requester client does not exist at this point
            // expect(isHidden(target, requester)).false; // requester client does not exist at this point
            chai_1.expect(service.isHiddenClient(target, target)).false;
            chai_1.expect(service.isHiddenClient(requester, target)).false;
            chai_1.expect(service.isHiddenClient(target, requester)).false;
        });
        it('updates in hidden lists', () => {
            const requester = mocks_1.mockClient();
            const target1 = mocks_1.mockClient();
            const target2 = mocks_1.mockClient();
            addClients(requester, target2);
            service.hide(requester, target1, DURATION);
            service.merged(target2.accountId, target1.accountId);
            chai_1.expect(isHidden(requester, target2)).true;
            chai_1.expect(service.isHiddenClient(requester, target2)).true;
        });
        it('picks newer date in hidden lists', () => {
            const requester = mocks_1.mockClient();
            const target1 = mocks_1.mockClient();
            const target2 = mocks_1.mockClient();
            addClients(requester, target2);
            clock.setSystemTime(constants_1.HOUR);
            service.hide(requester, target1, DURATION);
            clock.setSystemTime(5 * constants_1.HOUR);
            service.hide(requester, target2, DURATION);
            service.merged(target2.accountId, target1.accountId);
            clock.tick(22 * constants_1.HOUR);
            chai_1.expect(isHidden(requester, target2)).true;
            chai_1.expect(service.isHiddenClient(requester, target2)).true;
        });
        it('transfers unhide countdown', () => {
            const requester1 = mocks_1.mockClient();
            const requester2 = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester2, target);
            service.hide(requester1, target, DURATION);
            service.unhideAll(requester1);
            service.merged(requester2.accountId, requester1.accountId);
            service.hide(requester2, target, DURATION);
            service.unhideAll(requester2);
            chai_1.expect(isHidden(requester2, target)).true;
            chai_1.expect(service.isHiddenClient(requester2, target)).true;
        });
        it('does not trigger change event if state of user didn\'t change', () => {
            const requester1 = mocks_1.mockClient();
            const requester2 = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester2, target);
            service.hide(requester1, target, DURATION);
            service.hide(requester2, target, DURATION);
            service.merged(requester2.accountId, requester1.accountId);
        });
        it('triggers change events (1)', done => {
            const requester1 = mocks_1.mockClient();
            const requester2 = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            addClients(requester2, target);
            service.hide(requester1, target, DURATION);
            service.changes.pipe(operators_1.bufferCount(2), operators_1.first()).subscribe(([hide1, hide2]) => {
                chai_1.expect(hide1).eql({ by: requester2.accountId, who: target.accountId });
                chai_1.expect(hide2).eql({ by: requester1.accountId, who: target.accountId });
                done();
            });
            service.merged(requester2.accountId, requester1.accountId);
        });
        it('triggers change events (2)', done => {
            const requester = mocks_1.mockClient();
            const target1 = mocks_1.mockClient();
            const target2 = mocks_1.mockClient();
            addClients(requester, target2);
            service.hide(requester, target1, DURATION);
            service.changes.pipe(operators_1.bufferCount(2), operators_1.first()).subscribe(([hide1, hide2]) => {
                chai_1.expect(hide1).eql({ by: requester.accountId, who: target2.accountId });
                chai_1.expect(hide2).eql({ by: requester.accountId, who: target1.accountId });
                done();
            });
            service.merged(target2.accountId, target1.accountId);
        });
    });
});
//# sourceMappingURL=hiding.spec.js.map