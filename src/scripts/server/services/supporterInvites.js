"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const logger_1 = require("../logger");
const userError_1 = require("../userError");
const utils_1 = require("../../common/utils");
const constants_1 = require("../../common/constants");
const actionLimiter_1 = require("./actionLimiter");
const chat_1 = require("../chat");
const accountUtils_1 = require("../accountUtils");
exports.INVITE_REJECTED_TIMEOUT = 1 * constants_1.HOUR;
exports.INVITE_REJECTED_LIMIT = 5;
function formatMessage(requester, target, message) {
    const requesterInfo = `${requester.characterName} (${requester.account.name})`;
    const targetInfo = `${target.characterName} (${target.account.name}) [${target.accountId}]`;
    return logger_1.systemMessage(requester.accountId, `${requesterInfo} ${message} ${targetInfo}`);
}
class SupporterInvitesService {
    constructor(model, notifications, log) {
        this.model = model;
        this.notifications = notifications;
        this.log = log;
        this.limiter = new actionLimiter_1.ActionLimiter(exports.INVITE_REJECTED_TIMEOUT, exports.INVITE_REJECTED_LIMIT);
    }
    dispose() {
        this.limiter.dispose();
    }
    async getInvites(source) {
        const items = await this.model.find({ source: source.account._id }).exec();
        return items.map(({ _id, name, info, active }) => ({ id: _id.toString(), name, info, active }));
    }
    async isInvited(target) {
        const count = await this.model.countDocuments({ target: target.account._id, active: true }).exec();
        return count > 0;
    }
    async requestInvite(requester, target) {
        const items = await this.getInvites(requester);
        const limit = accountUtils_1.getSupporterInviteLimit(requester.account);
        if (items.length >= limit)
            return chat_1.saySystem(requester, 'Invite limit reached');
        if (this.limiter.canExecute(requester, target) !== 0 /* Yes */)
            return chat_1.saySystem(requester, 'Cannot invite');
        this.log(formatMessage(requester, target, 'invited to supporter server'));
        this.notifications.addNotification(target, {
            id: 0,
            sender: requester,
            name: requester.pony.name || '',
            entityId: requester.pony.id,
            message: `<b>#NAME#</b> invited you to supporter servers`,
            flags: 8 /* Accept */ | 16 /* Reject */ | 64 /* Ignore */ |
                (requester.pony.nameBad ? 128 /* NameBad */ : 0),
            accept: () => this.acceptInvite(requester, target),
            reject: () => this.rejectInvite(requester, target),
        });
    }
    acceptInvite(requester, target) {
        this.log(formatMessage(requester, target, 'supporter invite accepted by'));
        this.invite(requester, target);
    }
    rejectInvite(requester, target) {
        this.log(formatMessage(requester, target, 'supporter invite rejected by'));
        this.limiter.count(requester);
    }
    async invite(requester, target) {
        const limit = accountUtils_1.getSupporterInviteLimit(requester.account);
        const items = await this.getInvites(requester);
        if (items.length >= limit) {
            throw new userError_1.UserError('Invite limit reached');
        }
        await this.model.create({
            source: requester.account._id,
            target: target.account._id,
            name: target.characterName,
            info: target.character.info,
            active: true,
        });
    }
    uninvite(requester, inviteId) {
        return Promise.resolve(this.model.deleteOne({ _id: inviteId, source: requester.account._id }).exec());
    }
}
exports.SupporterInvitesService = SupporterInvitesService;
async function updateSupporterInvites(model) {
    const invites = await model.find({}, '_id active')
        .populate('source', '_id supporter patreon roles')
        .lean()
        .exec();
    const itemsBySource = lodash_1.toPairs(lodash_1.groupBy(invites, i => i.source._id));
    const itemsToUpdate = itemsBySource
        .map(([_, items]) => {
        const source = items[0].source;
        const limit = accountUtils_1.getSupporterInviteLimit(source);
        return lodash_1.compact(items
            .sort((a, b) => utils_1.compareDates(a.createdAt, b.createdAt))
            .map((item, i) => {
            const active = i < limit;
            return item.active === active ? undefined : { id: item._id, active };
        }));
    });
    const groups = lodash_1.toPairs(lodash_1.groupBy(utils_1.flatten(itemsToUpdate), i => i.active));
    await Promise.all(groups.map(([_, items]) => {
        const active = items[0].active;
        const ids = items.map(i => i.id);
        return model.updateMany({ _id: { $in: ids } }, { active }).exec();
    }));
    await model.deleteMany({ active: false, updatedAt: { $lt: utils_1.fromNow(-100 * constants_1.DAY) } }).exec();
}
exports.updateSupporterInvites = updateSupporterInvites;
//# sourceMappingURL=supporterInvites.js.map