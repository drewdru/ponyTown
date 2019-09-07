"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function updateParty(current, info) {
    if (!info || !info.length) {
        return undefined;
    }
    else {
        const party = current || {
            leaderId: 0,
            members: [],
        };
        lodash_1.remove(party.members, p => !info.some(m => p.id === m.id));
        info.forEach(m => {
            const existing = party.members.find(x => m.id === x.id);
            if (existing) {
                Object.assign(existing, m);
            }
            else {
                party.members.push(m);
            }
            if (m.leader) {
                party.leaderId = m.id;
            }
        });
        return party;
    }
}
exports.updateParty = updateParty;
function isPonyInParty(party, pony, pending) {
    return !!party && party.members.some(m => m.pony === pony && (pending || !m.pending));
}
exports.isPonyInParty = isPonyInParty;
function isPartyLeader(game) {
    return game.party !== undefined && game.player !== undefined && game.player.id === game.party.leaderId;
}
exports.isPartyLeader = isPartyLeader;
function isInParty(game) {
    return game.party !== undefined && game.party.members.length > 0;
}
exports.isInParty = isInParty;
//# sourceMappingURL=partyUtils.js.map