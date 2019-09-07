import { remove } from 'lodash';
import { PartyMember, PartyInfo, Pony } from '../common/interfaces';
import { PonyTownGame } from './game';

export function updateParty(current: PartyInfo | undefined, info: PartyMember[] | undefined): PartyInfo | undefined {
	if (!info || !info.length) {
		return undefined;
	} else {
		const party = current || {
			leaderId: 0,
			members: [],
		};

		remove(party.members, p => !info.some(m => p.id === m.id));

		info.forEach(m => {
			const existing = party.members.find(x => m.id === x.id);

			if (existing) {
				Object.assign(existing, m);
			} else {
				party.members.push(m);
			}

			if (m.leader) {
				party.leaderId = m.id;
			}
		});

		return party;
	}
}

export function isPonyInParty(party: PartyInfo | undefined, pony: Pony, pending: boolean) {
	return !!party && party.members.some(m => m.pony === pony && (pending || !m.pending));
}

export function isPartyLeader(game: PonyTownGame): boolean {
	return game.party !== undefined && game.player !== undefined && game.player.id === game.party.leaderId;
}

export function isInParty(game: PonyTownGame): boolean {
	return game.party !== undefined && game.party.members.length > 0;
}
