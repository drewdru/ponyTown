"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
const sinon_1 = require("sinon");
const chai_1 = require("chai");
const supporterInvites_1 = require("../../../server/services/supporterInvites");
const notification_1 = require("../../../server/services/notification");
const mocks_1 = require("../../mocks");
const playerUtils_1 = require("../../../server/playerUtils");
const constants_1 = require("../../../common/constants");
function exec(value) {
    return { exec: sinon_1.stub().resolves(value) };
}
describe('SupporterInvitesService', () => {
    let model;
    let notifications = lib_1.stubClass(notification_1.NotificationService);
    let log;
    let service;
    beforeEach(() => {
        lib_1.resetStubMethods(notifications, 'addNotification');
        model = {
            find: sinon_1.stub(),
            countDocuments: sinon_1.stub(),
            create: sinon_1.stub(),
            deleteOne: sinon_1.stub(),
            deleteMany: sinon_1.stub(),
            updateMany: sinon_1.stub(),
        };
        log = sinon_1.stub();
        service = new supporterInvites_1.SupporterInvitesService(model, notifications, log);
    });
    afterEach(() => {
        service.dispose();
    });
    describe('getInvites()', () => {
        it('returns all invites from given client', async () => {
            const client = mocks_1.mockClient();
            model.find.withArgs({ source: client.account._id }).returns({
                exec: sinon_1.stub().resolves([
                    { _id: 'foo', name: 'Foo', info: 'info', active: true, anotherField: 'xyz' },
                ])
            });
            const result = await service.getInvites(client);
            chai_1.expect(result).eql([
                { id: 'foo', name: 'Foo', info: 'info', active: true },
            ]);
        });
    });
    describe('isInvited()', () => {
        it('returns true if has any active invites', async () => {
            const client = mocks_1.mockClient();
            model.countDocuments.withArgs({ target: client.account._id, active: true }).returns(exec(1));
            const result = await service.isInvited(client);
            chai_1.expect(result).true;
        });
        it('returns false if doesn not have any active invites', async () => {
            const client = mocks_1.mockClient();
            model.countDocuments.withArgs({ target: client.account._id, active: true }).returns(exec(0));
            const result = await service.isInvited(client);
            chai_1.expect(result).false;
        });
    });
    describe('requestInvite()', () => {
        let requester;
        let target;
        beforeEach(() => {
            requester = mocks_1.mockClient();
            requester.account.supporter = 1 /* Supporter1 */;
            target = mocks_1.mockClient();
            model.find.returns(exec([]));
        });
        it('adds notification', async () => {
            requester.pony.name = 'Foo';
            await service.requestInvite(requester, target);
            sinon_1.assert.calledWith(notifications.addNotification, target, sinon_1.match.any);
            const notification = notifications.addNotification.args[0][1];
            chai_1.expect(notification.sender).equal(requester);
            chai_1.expect(notification.entityId).equal(requester.pony.id);
            chai_1.expect(notification.message).equal(`<b>#NAME#</b> invited you to supporter servers`);
        });
        it('fails if inviting self', async () => {
            await service.requestInvite(requester, requester);
            sinon_1.assert.notCalled(notifications.addNotification);
            chai_1.expect(requester.saysQueue).eql([
                [requester.pony.id, 'Cannot invite', 1 /* System */],
            ]);
        });
        it('fails if requester is shadowed', async () => {
            requester.shadowed = true;
            await service.requestInvite(requester, target);
            sinon_1.assert.notCalled(notifications.addNotification);
            chai_1.expect(requester.saysQueue).eql([
                [requester.pony.id, 'Cannot invite', 1 /* System */],
            ]);
        });
        it('fails if requester is muted', async () => {
            requester.account.mute = Date.now() + 10000;
            await service.requestInvite(requester, target);
            sinon_1.assert.notCalled(notifications.addNotification);
            chai_1.expect(requester.saysQueue).eql([
                [requester.pony.id, 'Cannot invite', 1 /* System */],
            ]);
        });
        it('fails if target is offline', async () => {
            target.offline = true;
            await service.requestInvite(requester, target);
            sinon_1.assert.notCalled(notifications.addNotification);
            chai_1.expect(requester.saysQueue).eql([
                [requester.pony.id, 'Cannot invite', 1 /* System */],
            ]);
        });
        it('fails if target ignores requester', async () => {
            playerUtils_1.addIgnore(requester, target.accountId);
            await service.requestInvite(requester, target);
            sinon_1.assert.notCalled(notifications.addNotification);
            chai_1.expect(requester.saysQueue).eql([
                [requester.pony.id, 'Cannot invite', 1 /* System */],
            ]);
        });
        it('fails if requester ignores target', async () => {
            playerUtils_1.addIgnore(target, requester.accountId);
            await service.requestInvite(requester, target);
            sinon_1.assert.notCalled(notifications.addNotification);
            chai_1.expect(requester.saysQueue).eql([
                [requester.pony.id, 'Cannot invite', 1 /* System */],
            ]);
        });
        it('fails if already reached invite limit', async () => {
            model.find.returns(exec([{ _id: 'foo' }]));
            await service.requestInvite(requester, target);
            sinon_1.assert.notCalled(notifications.addNotification);
            chai_1.expect(requester.saysQueue).eql([
                [requester.pony.id, 'Invite limit reached', 1 /* System */],
            ]);
        });
        it('fails if exceeded reject limit', async () => {
            for (let i = 0; i < 5; i++) {
                await service.requestInvite(requester, target);
                notifications.addNotification.args[i][1].reject();
            }
            notifications.addNotification.reset();
            await service.requestInvite(requester, target);
            sinon_1.assert.notCalled(notifications.addNotification);
            chai_1.expect(requester.saysQueue).eql([
                [requester.pony.id, 'Cannot invite', 1 /* System */],
            ]);
        });
        it('logs invite', async () => {
            requester.character.name = 'Foo';
            await service.requestInvite(requester, target);
            sinon_1.assert.calledOnce(log);
        });
        it('accepts invite when accept callback is invoked', async () => {
            const acceptInvite = sinon_1.stub(service, 'acceptInvite');
            await service.requestInvite(requester, target);
            const { accept } = notifications.addNotification.args[0][1];
            accept();
            sinon_1.assert.calledWith(acceptInvite, requester, target);
        });
        it('rejects invite when reject callback is invoked', async () => {
            const rejectInvite = sinon_1.stub(service, 'rejectInvite');
            await service.requestInvite(requester, target);
            const { reject } = notifications.addNotification.args[0][1];
            reject();
            sinon_1.assert.calledWith(rejectInvite, requester, target);
        });
    });
    describe('acceptInvite()', () => {
        it('invites user', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            const invite = sinon_1.stub(service, 'invite');
            service.acceptInvite(requester, target);
            sinon_1.assert.calledOnce(invite);
        });
        it('logs accepted invite', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            sinon_1.stub(service, 'invite');
            service.acceptInvite(requester, target);
            sinon_1.assert.calledOnce(log);
        });
    });
    describe('rejectInvite()', () => {
        it('logs rejected invite', () => {
            const requester = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            service.rejectInvite(requester, target);
            sinon_1.assert.calledOnce(log);
        });
    });
    describe('invite()', () => {
        it('creates new invite', async () => {
            const requester = mocks_1.mockClient();
            requester.account.supporter = 1 /* Supporter1 */;
            const target = mocks_1.mockClient();
            model.find.returns(exec([]));
            await service.invite(requester, target);
            sinon_1.assert.calledWithMatch(model.create, {
                source: requester.account._id,
                target: target.account._id,
                name: target.character.name,
                info: target.character.info,
                active: true,
            });
        });
        it('throws if reached invite limit', async () => {
            const requester = mocks_1.mockClient();
            requester.account.supporter = 1 /* Supporter1 */;
            const target = mocks_1.mockClient();
            model.find.returns(exec([{}]));
            await chai_1.expect(service.invite(requester, target)).rejectedWith();
            sinon_1.assert.notCalled(model.create);
        });
    });
    describe('uninvite()', () => {
        it('removes invite', async () => {
            const requester = mocks_1.mockClient();
            model.deleteOne.returns({ exec: sinon_1.stub() });
            await service.uninvite(requester, 'foobar');
            sinon_1.assert.calledWithMatch(model.deleteOne, { _id: 'foobar', source: requester.account._id });
        });
    });
    describe('updateSupporterInvites()', () => {
        let clock;
        beforeEach(() => {
            clock = sinon_1.useFakeTimers();
        });
        afterEach(() => {
            clock.restore();
        });
        it('activates inactive items', async () => {
            const data = [
                { _id: 'aaa', active: false, source: { supporter: 1 /* Supporter1 */ } },
                { _id: 'bbb', active: true, source: { supporter: 1 /* Supporter1 */ } },
            ];
            model.find.withArgs({}, '_id active')
                .returns({
                populate: sinon_1.stub().withArgs('source', '_id supporter patreon roles')
                    .returns({ lean: sinon_1.stub().returns(exec(data)) })
            });
            model.deleteMany.returns({ exec: sinon_1.stub() });
            model.updateMany.returns({ exec: sinon_1.stub() });
            await supporterInvites_1.updateSupporterInvites(model);
            sinon_1.assert.calledWithMatch(model.updateMany, { _id: { $in: ['aaa'] } }, { active: true });
        });
        it('deactivates active items', async () => {
            const data = [
                { _id: 'aaa', active: true, source: { supporter: 1 /* Supporter1 */ } },
                { _id: 'bbb', active: true, source: {} },
            ];
            model.find.returns({ populate: sinon_1.stub().returns({ lean: sinon_1.stub().returns(exec(data)) }) });
            model.deleteMany.returns({ exec: sinon_1.stub() });
            model.updateMany.returns({ exec: sinon_1.stub() });
            await supporterInvites_1.updateSupporterInvites(model);
            sinon_1.assert.calledWithMatch(model.updateMany, { _id: { $in: ['bbb'] } }, { active: false });
        });
        it('activates and deactivates items', async () => {
            const data = [
                { _id: 'aaa', active: false, source: { supporter: 1 /* Supporter1 */ } },
                { _id: 'bbb', active: true, source: {} },
            ];
            model.find.returns({ populate: sinon_1.stub().returns({ lean: sinon_1.stub().returns(exec(data)) }) });
            model.deleteMany.returns({ exec: sinon_1.stub() });
            model.updateMany.returns({ exec: sinon_1.stub() });
            await supporterInvites_1.updateSupporterInvites(model);
            sinon_1.assert.calledWithMatch(model.updateMany, { _id: { $in: ['aaa'] } }, { active: true });
            sinon_1.assert.calledWithMatch(model.updateMany, { _id: { $in: ['bbb'] } }, { active: false });
        });
        it('does nothing if all items have correct active flag', async () => {
            const data = [
                { _id: 'aaa', active: true, source: { supporter: 1 /* Supporter1 */ } },
                { _id: 'bbb', active: false, source: {} },
            ];
            model.find.returns({ populate: sinon_1.stub().returns({ lean: sinon_1.stub().returns(exec(data)) }) });
            model.deleteMany.returns({ exec: sinon_1.stub() });
            model.updateMany.returns({ exec: sinon_1.stub() });
            await supporterInvites_1.updateSupporterInvites(model);
            sinon_1.assert.notCalled(model.updateMany);
        });
        it('removes old inactive entries', async () => {
            model.find.returns({ populate: sinon_1.stub().returns({ lean: sinon_1.stub().returns({ exec: sinon_1.stub() }) }) });
            model.deleteMany.returns({ exec: sinon_1.stub() });
            clock.setSystemTime(123 * constants_1.DAY);
            await supporterInvites_1.updateSupporterInvites(model);
            sinon_1.assert.calledWithMatch(model.deleteMany, { active: false, updatedAt: { $lt: new Date(23 * constants_1.DAY) } });
        });
    });
});
//# sourceMappingURL=supporterInvites.spec.js.map