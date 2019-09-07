"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const rxjs_1 = require("rxjs");
const constants_1 = require("../../common/constants");
const logger_1 = require("../logger");
const utils_1 = require("../../common/utils");
const friends_1 = require("./friends");
const paths_1 = require("../paths");
const db_1 = require("../db");
const entityUtils_1 = require("../entityUtils");
const chat_1 = require("../chat");
const hidePlayerLimit = 'Cannot hide any more players.';
const cannotHidePlayerInParty = 'Cannot hide players from your party.';
const cannotHideFriends = 'Cannot hide friends.';
const unhideAllLimit = 'Cannot unhide hidden players, try again later.';
const unhideAllLimitNote = 'You can only do this once per hour.';
function clientInfo({ accountId, account, characterName }) {
    return `${characterName} (${account.name}) [${accountId}]`;
}
function simpleNotification(message, note) {
    return { id: 0, name: '', message, note, flags: 1 /* Ok */ };
}
function hidingDataPath(serverId) {
    return paths_1.pathTo('settings', `hiding-${serverId}.json`);
}
exports.hidingDataPath = hidingDataPath;
async function saveHidingData(hiding, serverId) {
    if (!TESTS) {
        try {
            const data = hiding.serialize();
            await fs.writeFileAsync(hidingDataPath(serverId), data, 'utf8');
        }
        catch (e) {
            logger_1.logger.error(e);
        }
    }
}
exports.saveHidingData = saveHidingData;
function pollHidingDataSave(hiding, serverId) {
    setInterval(() => saveHidingData(hiding, serverId), 10 * constants_1.MINUTE);
}
exports.pollHidingDataSave = pollHidingDataSave;
class HidingService {
    constructor(clearUnhides, notifications, findClient, log) {
        this.clearUnhides = clearUnhides;
        this.notifications = notifications;
        this.findClient = findClient;
        this.log = log;
        this.changes = new rxjs_1.Subject();
        this.unhidesAll = new rxjs_1.Subject();
        this.hides = new Map();
        this.unhides = new Map();
    }
    serialize() {
        const hides = {};
        const unhides = {};
        this.hides.forEach((hidesMap, by) => {
            const list = {};
            hidesMap.forEach((value, key) => list[key] = value);
            hides[by] = list;
        });
        this.unhides.forEach((value, key) => unhides[key] = value);
        return JSON.stringify({ hides, unhides });
    }
    deserialize(data) {
        try {
            const { hides, unhides } = JSON.parse(data);
            for (const by of Object.keys(hides)) {
                const hidesMap = new Map();
                for (const key of Object.keys(hides[by])) {
                    hidesMap.set(key, hides[by][key]);
                }
                this.hides.set(by, hidesMap);
            }
            for (const key of Object.keys(unhides)) {
                this.unhides.set(key, unhides[key]);
            }
            this.cleanup();
        }
        catch (e) {
            logger_1.logger.error(e);
        }
    }
    getStatsFor(account) {
        const hides = this.hides.get(account);
        const hidden = hides ? Array.from(hides.keys()) : [];
        const hiddenBy = [];
        this.hides.forEach((hides, by) => {
            if (hides.has(account)) {
                hiddenBy.push(by);
            }
        });
        return { account, hidden, hiddenBy, permaHidden: [], permaHiddenBy: [] };
    }
    connected(client) {
        const hides = this.hides.get(client.accountId);
        if (hides) {
            for (const id of Array.from(hides.keys())) {
                client.hides.add(id);
            }
        }
    }
    requestHide(requester, target, timeout) {
        const hides = this.hides.get(requester.accountId);
        const count = hides && hides.size || 0;
        if (requester.accountId === target.accountId) {
            chat_1.saySystem(requester, `Cannot hide yourself`);
        }
        else if (requester.party && utils_1.includes(requester.party.clients, target)) {
            this.notifications.addNotification(requester, simpleNotification(cannotHidePlayerInParty));
        }
        else if (friends_1.isFriend(requester, target)) {
            this.notifications.addNotification(requester, simpleNotification(cannotHideFriends));
        }
        else if (count >= constants_1.HIDE_LIMIT) {
            this.notifications.addNotification(requester, simpleNotification(hidePlayerLimit));
        }
        else {
            this.notifications.addNotification(requester, {
                id: 0,
                name: target.pony.name || '',
                entityId: target.pony.id,
                message: `Are you sure you want to hide <b>#NAME#</b> ?`,
                flags: 2 /* Yes */ | 4 /* No */ | (target.pony.nameBad ? 128 /* NameBad */ : 0),
                accept: () => this.confirmHide(requester, target, timeout),
            });
        }
    }
    requestUnhideAll(requester) {
        const unhideTimestamp = this.unhides.get(requester.accountId) || 0;
        if (unhideTimestamp > Date.now()) {
            this.notifications.addNotification(requester, simpleNotification(unhideAllLimit, unhideAllLimitNote));
        }
        else {
            this.notifications.addNotification(requester, {
                id: 0,
                name: '',
                message: 'Are you sure you want to unhide all temporarily hidden players ?',
                note: 'You can only do this once per hour. This action will require re-joining the game.',
                flags: 2 /* Yes */ | 4 /* No */,
                accept: () => this.unhideAll(requester),
            });
        }
    }
    confirmHide(requester, target, timeout) {
        if (this.hide(requester, target, timeout)) {
            let message = `${requester.characterName} (${requester.account.name}) hides ${clientInfo(target)}`;
            if (timeout === 0) {
                message += ' (permanent)';
            }
            this.log(logger_1.systemMessage(requester.accountId, message));
        }
    }
    isHiddenInner(who, from) {
        const hides = this.hides.get(who);
        return hides !== undefined && hides.has(from);
    }
    isHidden(who, from) {
        return this.isHiddenInner(who, from) || this.isHiddenInner(from, who);
    }
    isHiddenClient(who, from) {
        return this.isHidden(who.accountId, from.accountId);
    }
    hide(byClient, whoClient, timeout) {
        const by = byClient.accountId;
        const who = whoClient.accountId;
        if (timeout === 0) { // permanent
            db_1.addHide(by, who, entityUtils_1.getEntityName(whoClient.pony, byClient) || '[none]')
                .then(() => {
                byClient.permaHides.add(who);
                this.notify([{ by, who }]);
            })
                .catch(e => logger_1.logger.error(e));
            return true;
        }
        else {
            if (by === who)
                return false;
            if (this.isHiddenInner(by, who))
                return false;
            const hides = this.hides.get(by) || new Map();
            hides.set(who, Date.now() + timeout);
            this.hides.set(by, hides);
            byClient.hides.add(who);
            this.notify([{ by, who }]);
            return true;
        }
    }
    // TODO: remove ?
    unhide(byClient, whoClient) {
        const by = byClient.accountId;
        const who = whoClient.accountId;
        const hides = this.hides.get(by);
        if (hides) {
            if (hides.has(who)) {
                hides.delete(who);
                if (hides.size === 0) {
                    this.hides.delete(by);
                }
                byClient.hides.delete(who);
                this.notify([{ by, who }]);
            }
        }
    }
    unhideAll(byClient) {
        const by = byClient.accountId;
        if (this.unhides.has(by))
            return;
        const hides = this.hides.get(by);
        if (hides) {
            const notify = [];
            hides.forEach((_, who) => notify.push({ by, who }));
            this.hides.delete(by);
            this.unhides.set(by, Date.now() + this.clearUnhides);
            byClient.hides.clear();
            this.notify(notify);
            this.unhidesAll.next(by);
        }
        this.log(logger_1.systemMessage(by, 'unhide all'));
    }
    merged(target, merge) {
        const targetHides = this.hides.get(target);
        const mergeHides = this.hides.get(merge);
        const notify = [];
        if (targetHides) {
            targetHides.delete(merge);
        }
        if (mergeHides) {
            const targetClient = this.findClient(target);
            mergeHides.delete(target);
            if (targetHides) {
                for (const id of Array.from(mergeHides.keys())) {
                    const who = targetHides.get(id);
                    targetHides.set(id, Math.max(who || 0, mergeHides.get(id)));
                    targetClient && targetClient.hides.add(id);
                    if (!who) {
                        notify.push({ by: target, who: id });
                        notify.push({ by: merge, who: id });
                    }
                }
            }
            else {
                this.hides.set(target, mergeHides);
                for (const id of Array.from(mergeHides.keys())) {
                    targetClient && targetClient.hides.add(id);
                    notify.push({ by: target, who: id });
                    notify.push({ by: merge, who: id });
                }
            }
            this.hides.delete(merge);
        }
        const targetUnhides = this.unhides.get(target);
        const mergeUnhides = this.unhides.get(merge);
        if (mergeUnhides) {
            this.unhides.set(target, Math.max(targetUnhides || 0, mergeUnhides));
            this.unhides.delete(merge);
        }
        this.hides.forEach((_, by) => {
            const hides = this.hides.get(by);
            const mergeHide = hides.get(merge);
            if (mergeHide) {
                hides.set(target, Math.max(mergeHide, hides.get(target) || 0));
                hides.delete(merge);
                const client = this.findClient(by);
                if (client) {
                    client.hides.delete(merge);
                    if (target !== by) {
                        client && client.hides.add(target);
                    }
                }
                notify.push({ by, who: target });
                notify.push({ by, who: merge });
            }
        });
        this.notify(notify);
    }
    cleanup() {
        const now = Date.now();
        const notify = [];
        for (const by of Array.from(this.hides.keys())) {
            const hides = this.hides.get(by);
            for (const who of Array.from(hides.keys())) {
                if (hides.get(who) < now) {
                    hides.delete(who);
                    const client = this.findClient(by);
                    client && client.hides.delete(who);
                    notify.push({ by, who });
                }
            }
            if (hides.size === 0) {
                this.hides.delete(by);
            }
        }
        this.notify(notify);
        for (const key of Array.from(this.unhides.keys())) {
            if (this.unhides.get(key) < now) {
                this.unhides.delete(key);
            }
        }
    }
    start() {
        this.interval = this.interval || setInterval(() => this.cleanup(), 10 * constants_1.MINUTE);
    }
    stop() {
        clearInterval(this.interval);
        this.interval = undefined;
    }
    notify(hides) {
        for (const hide of hides) {
            this.changes.next(hide);
        }
    }
}
exports.HidingService = HidingService;
//# sourceMappingURL=hiding.js.map