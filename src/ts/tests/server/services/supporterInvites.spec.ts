import { stubClass, resetStubMethods } from '../../lib';
import { assert, SinonStub, stub, SinonStubbedInstance, SinonFakeTimers, useFakeTimers, match } from 'sinon';
import { Model } from 'mongoose';
import { expect } from 'chai';
import { SupporterInvitesService, updateSupporterInvites } from '../../../server/services/supporterInvites';
import { NotificationService } from '../../../server/services/notification';
import { ISupporterInvite } from '../../../server/db';
import { mockClient } from '../../mocks';
import { SupporterFlags } from '../../../common/adminInterfaces';
import { IClient } from '../../../server/serverInterfaces';
import { MessageType } from '../../../common/interfaces';
import { addIgnore } from '../../../server/playerUtils';
import { DAY } from '../../../common/constants';

function exec(value: any): any {
	return { exec: stub().resolves(value) };
}

describe('SupporterInvitesService', () => {
	let model: SinonStubbedInstance<Model<ISupporterInvite>> & { countDocuments: SinonStub; };
	let notifications = stubClass(NotificationService);
	let log: SinonStub;
	let service: SupporterInvitesService;

	beforeEach(() => {
		resetStubMethods(notifications, 'addNotification');
		model = {
			find: stub(),
			countDocuments: stub(),
			create: stub(),
			deleteOne: stub(),
			deleteMany: stub(),
			updateMany: stub(),
		} as any;
		log = stub();
		service = new SupporterInvitesService(model as any, notifications, log);
	});

	afterEach(() => {
		service.dispose();
	});

	describe('getInvites()', () => {
		it('returns all invites from given client', async () => {
			const client = mockClient();
			model.find.withArgs({ source: client.account._id }).returns({
				exec: stub().resolves([
					{ _id: 'foo', name: 'Foo', info: 'info', active: true, anotherField: 'xyz' },
				])
			} as any);

			const result = await service.getInvites(client);

			expect(result).eql([
				{ id: 'foo', name: 'Foo', info: 'info', active: true },
			]);
		});
	});

	describe('isInvited()', () => {
		it('returns true if has any active invites', async () => {
			const client = mockClient();
			model.countDocuments.withArgs({ target: client.account._id, active: true }).returns(exec(1));

			const result = await service.isInvited(client);

			expect(result).true;
		});

		it('returns false if doesn not have any active invites', async () => {
			const client = mockClient();
			model.countDocuments.withArgs({ target: client.account._id, active: true }).returns(exec(0));

			const result = await service.isInvited(client);

			expect(result).false;
		});
	});

	describe('requestInvite()', () => {
		let requester: IClient;
		let target: IClient;

		beforeEach(() => {
			requester = mockClient();
			requester.account.supporter = SupporterFlags.Supporter1;
			target = mockClient();
			model.find.returns(exec([]));
		});

		it('adds notification', async () => {
			requester.pony.name = 'Foo';

			await service.requestInvite(requester, target);

			assert.calledWith(notifications.addNotification, target, match.any);
			const notification = notifications.addNotification.args[0][1];
			expect(notification.sender).equal(requester);
			expect(notification.entityId).equal(requester.pony.id);
			expect(notification.message).equal(`<b>#NAME#</b> invited you to supporter servers`);
		});

		it('fails if inviting self', async () => {
			await service.requestInvite(requester, requester);

			assert.notCalled(notifications.addNotification);
			expect(requester.saysQueue).eql([
				[requester.pony.id, 'Cannot invite', MessageType.System],
			]);
		});

		it('fails if requester is shadowed', async () => {
			requester.shadowed = true;

			await service.requestInvite(requester, target);

			assert.notCalled(notifications.addNotification);
			expect(requester.saysQueue).eql([
				[requester.pony.id, 'Cannot invite', MessageType.System],
			]);
		});

		it('fails if requester is muted', async () => {
			requester.account.mute = Date.now() + 10000;

			await service.requestInvite(requester, target);

			assert.notCalled(notifications.addNotification);
			expect(requester.saysQueue).eql([
				[requester.pony.id, 'Cannot invite', MessageType.System],
			]);
		});

		it('fails if target is offline', async () => {
			target.offline = true;

			await service.requestInvite(requester, target);

			assert.notCalled(notifications.addNotification);
			expect(requester.saysQueue).eql([
				[requester.pony.id, 'Cannot invite', MessageType.System],
			]);
		});

		it('fails if target ignores requester', async () => {
			addIgnore(requester, target.accountId);

			await service.requestInvite(requester, target);

			assert.notCalled(notifications.addNotification);
			expect(requester.saysQueue).eql([
				[requester.pony.id, 'Cannot invite', MessageType.System],
			]);
		});

		it('fails if requester ignores target', async () => {
			addIgnore(target, requester.accountId);

			await service.requestInvite(requester, target);

			assert.notCalled(notifications.addNotification);
			expect(requester.saysQueue).eql([
				[requester.pony.id, 'Cannot invite', MessageType.System],
			]);
		});

		it('fails if already reached invite limit', async () => {
			model.find.returns(exec([{ _id: 'foo' }]));

			await service.requestInvite(requester, target);

			assert.notCalled(notifications.addNotification);
			expect(requester.saysQueue).eql([
				[requester.pony.id, 'Invite limit reached', MessageType.System],
			]);
		});

		it('fails if exceeded reject limit', async () => {
			for (let i = 0; i < 5; i++) {
				await service.requestInvite(requester, target);
				notifications.addNotification.args[i][1].reject!();
			}

			notifications.addNotification.reset();

			await service.requestInvite(requester, target);

			assert.notCalled(notifications.addNotification);
			expect(requester.saysQueue).eql([
				[requester.pony.id, 'Cannot invite', MessageType.System],
			]);
		});

		it('logs invite', async () => {
			requester.character.name = 'Foo';

			await service.requestInvite(requester, target);

			assert.calledOnce(log);
		});

		it('accepts invite when accept callback is invoked', async () => {
			const acceptInvite = stub(service, 'acceptInvite');

			await service.requestInvite(requester, target);

			const { accept } = notifications.addNotification.args[0][1];
			accept!();

			assert.calledWith(acceptInvite, requester, target);
		});

		it('rejects invite when reject callback is invoked', async () => {
			const rejectInvite = stub(service, 'rejectInvite');

			await service.requestInvite(requester, target);

			const { reject } = notifications.addNotification.args[0][1];
			reject!();

			assert.calledWith(rejectInvite, requester, target);
		});
	});

	describe('acceptInvite()', () => {
		it('invites user', () => {
			const requester = mockClient();
			const target = mockClient();
			const invite = stub(service, 'invite');

			service.acceptInvite(requester, target);

			assert.calledOnce(invite);
		});

		it('logs accepted invite', () => {
			const requester = mockClient();
			const target = mockClient();
			stub(service, 'invite');

			service.acceptInvite(requester, target);

			assert.calledOnce(log);
		});
	});

	describe('rejectInvite()', () => {
		it('logs rejected invite', () => {
			const requester = mockClient();
			const target = mockClient();

			service.rejectInvite(requester, target);

			assert.calledOnce(log);
		});
	});

	describe('invite()', () => {
		it('creates new invite', async () => {
			const requester = mockClient();
			requester.account.supporter = SupporterFlags.Supporter1;
			const target = mockClient();
			model.find.returns(exec([]));

			await service.invite(requester, target);

			assert.calledWithMatch(model.create, {
				source: requester.account._id,
				target: target.account._id,
				name: target.character.name,
				info: target.character.info,
				active: true,
			});
		});

		it('throws if reached invite limit', async () => {
			const requester = mockClient();
			requester.account.supporter = SupporterFlags.Supporter1;
			const target = mockClient();
			model.find.returns(exec([{}]));

			await expect(service.invite(requester, target)).rejectedWith();

			assert.notCalled(model.create);
		});
	});

	describe('uninvite()', () => {
		it('removes invite', async () => {
			const requester = mockClient();
			model.deleteOne.returns({ exec: stub() } as any);

			await service.uninvite(requester, 'foobar');

			assert.calledWithMatch(model.deleteOne, { _id: 'foobar', source: requester.account._id });
		});
	});

	describe('updateSupporterInvites()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('activates inactive items', async () => {
			const data = [
				{ _id: 'aaa', active: false, source: { supporter: SupporterFlags.Supporter1 } },
				{ _id: 'bbb', active: true, source: { supporter: SupporterFlags.Supporter1 } },
			];
			model.find.withArgs({}, '_id active')
				.returns({
					populate: stub().withArgs('source', '_id supporter patreon roles')
						.returns({ lean: stub().returns(exec(data)) })
				} as any);
			model.deleteMany.returns({ exec: stub() } as any);
			model.updateMany.returns({ exec: stub() } as any);

			await updateSupporterInvites(model as any);

			assert.calledWithMatch(model.updateMany as any, { _id: { $in: ['aaa'] } }, { active: true });
		});

		it('deactivates active items', async () => {
			const data = [
				{ _id: 'aaa', active: true, source: { supporter: SupporterFlags.Supporter1 } },
				{ _id: 'bbb', active: true, source: {} },
			];
			model.find.returns({ populate: stub().returns({ lean: stub().returns(exec(data)) }) } as any);
			model.deleteMany.returns({ exec: stub() } as any);
			model.updateMany.returns({ exec: stub() } as any);

			await updateSupporterInvites(model as any);

			assert.calledWithMatch(model.updateMany as any, { _id: { $in: ['bbb'] } }, { active: false });
		});

		it('activates and deactivates items', async () => {
			const data = [
				{ _id: 'aaa', active: false, source: { supporter: SupporterFlags.Supporter1 } },
				{ _id: 'bbb', active: true, source: {} },
			];
			model.find.returns({ populate: stub().returns({ lean: stub().returns(exec(data)) }) } as any);
			model.deleteMany.returns({ exec: stub() } as any);
			model.updateMany.returns({ exec: stub() } as any);

			await updateSupporterInvites(model as any);

			assert.calledWithMatch(model.updateMany as any, { _id: { $in: ['aaa'] } }, { active: true });
			assert.calledWithMatch(model.updateMany as any, { _id: { $in: ['bbb'] } }, { active: false });
		});

		it('does nothing if all items have correct active flag', async () => {
			const data = [
				{ _id: 'aaa', active: true, source: { supporter: SupporterFlags.Supporter1 } },
				{ _id: 'bbb', active: false, source: {} },
			];
			model.find.returns({ populate: stub().returns({ lean: stub().returns(exec(data)) }) } as any);
			model.deleteMany.returns({ exec: stub() } as any);
			model.updateMany.returns({ exec: stub() } as any);

			await updateSupporterInvites(model as any);

			assert.notCalled(model.updateMany);
		});

		it('removes old inactive entries', async () => {
			model.find.returns({ populate: stub().returns({ lean: stub().returns({ exec: stub() }) }) } as any);
			model.deleteMany.returns({ exec: stub() } as any);
			clock.setSystemTime(123 * DAY);

			await updateSupporterInvites(model as any);

			assert.calledWithMatch(model.deleteMany, { active: false, updatedAt: { $lt: new Date(23 * DAY) } });
		});
	});
});
