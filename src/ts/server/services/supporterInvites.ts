import { groupBy, toPairs, compact } from 'lodash';
import { IClient } from '../serverInterfaces';
import { NotificationService } from './notification';
import { NotificationFlags, SupporterInvite } from '../../common/interfaces';
import { systemMessage } from '../logger';
import { UserError } from '../userError';
import { compareDates, fromNow, flatten } from '../../common/utils';
import { DAY, HOUR } from '../../common/constants';
import { Model } from 'mongoose';
import { ISupporterInvite, IAccount } from '../db';
import { ActionLimiter, LimiterResult } from './actionLimiter';
import { saySystem } from '../chat';
import { getSupporterInviteLimit } from '../accountUtils';

export const INVITE_REJECTED_TIMEOUT = 1 * HOUR;
export const INVITE_REJECTED_LIMIT = 5;

function formatMessage(requester: IClient, target: IClient, message: string) {
	const requesterInfo = `${requester.characterName} (${requester.account.name})`;
	const targetInfo = `${target.characterName} (${target.account.name}) [${target.accountId}]`;
	return systemMessage(requester.accountId, `${requesterInfo} ${message} ${targetInfo}`);
}

export class SupporterInvitesService {
	private limiter = new ActionLimiter(INVITE_REJECTED_TIMEOUT, INVITE_REJECTED_LIMIT);
	constructor(
		private model: Model<ISupporterInvite>,
		private notifications: NotificationService,
		private log: (message: string) => void,
	) {
	}
	dispose() {
		this.limiter.dispose();
	}
	async getInvites(source: IClient): Promise<SupporterInvite[]> {
		const items = await this.model.find({ source: source.account._id }).exec();
		return items.map(({ _id, name, info, active }) => ({ id: _id.toString(), name, info, active }));
	}
	async isInvited(target: IClient): Promise<boolean> {
		const count = await this.model.countDocuments({ target: target.account._id, active: true }).exec();
		return count > 0;
	}
	async requestInvite(requester: IClient, target: IClient) {
		const items = await this.getInvites(requester);
		const limit = getSupporterInviteLimit(requester.account);

		if (items.length >= limit)
			return saySystem(requester, 'Invite limit reached');

		if (this.limiter.canExecute(requester, target) !== LimiterResult.Yes)
			return saySystem(requester, 'Cannot invite');

		this.log(formatMessage(requester, target, 'invited to supporter server'));

		this.notifications.addNotification(target, {
			id: 0,
			sender: requester,
			name: requester.pony.name || '',
			entityId: requester.pony.id,
			message: `<b>#NAME#</b> invited you to supporter servers`,
			flags: NotificationFlags.Accept | NotificationFlags.Reject | NotificationFlags.Ignore |
				(requester.pony.nameBad ? NotificationFlags.NameBad : 0),
			accept: () => this.acceptInvite(requester, target),
			reject: () => this.rejectInvite(requester, target),
		});
	}
	acceptInvite(requester: IClient, target: IClient) {
		this.log(formatMessage(requester, target, 'supporter invite accepted by'));
		this.invite(requester, target);
	}
	rejectInvite(requester: IClient, target: IClient) {
		this.log(formatMessage(requester, target, 'supporter invite rejected by'));
		this.limiter.count(requester);
	}
	async invite(requester: IClient, target: IClient) {
		const limit = getSupporterInviteLimit(requester.account);
		const items = await this.getInvites(requester);

		if (items.length >= limit) {
			throw new UserError('Invite limit reached');
		}

		await this.model.create({
			source: requester.account._id,
			target: target.account._id,
			name: target.characterName,
			info: target.character.info,
			active: true,
		});
	}
	uninvite(requester: IClient, inviteId: string) {
		return Promise.resolve(this.model.deleteOne({ _id: inviteId, source: requester.account._id }).exec());
	}
}

type LeanInvite = ISupporterInvite & { source: IAccount };

export async function updateSupporterInvites(model: Model<ISupporterInvite>) {
	const invites: LeanInvite[] = await model.find({}, '_id active')
		.populate('source', '_id supporter patreon roles')
		.lean()
		.exec();

	const itemsBySource = toPairs(groupBy(invites, i => i.source._id as string));
	const itemsToUpdate = itemsBySource
		.map(([_, items]) => {
			const source = items[0].source;
			const limit = getSupporterInviteLimit(source);

			return compact(items
				.sort((a, b) => compareDates(a.createdAt, b.createdAt))
				.map((item, i) => {
					const active = i < limit;
					return item.active === active ? undefined : { id: item._id, active };
				}));
		});

	const groups = toPairs(groupBy(flatten(itemsToUpdate), i => i.active));

	await Promise.all(groups.map(([_, items]) => {
		const active = items[0].active;
		const ids = items.map(i => i.id);
		return model.updateMany({ _id: { $in: ids } }, { active }).exec();
	}));

	await model.deleteMany({ active: false, updatedAt: { $lt: fromNow(-100 * DAY) } }).exec();
}
