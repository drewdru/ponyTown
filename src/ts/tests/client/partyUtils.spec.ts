import '../lib';
import { expect } from 'chai';
import { PartyInfo, PartyMember } from '../../common/interfaces';
import { updateParty, isPonyInParty, isPartyLeader, isInParty } from '../../client/partyUtils';
import { PonyTownGame } from '../../client/game';

describe('partyUtils', () => {
	describe('updateParty()', () => {
		it('creates new party', () => {
			const info: PartyMember[] = [
				{ id: 1, pony: { _foo: 'bar' } as any, self: false, leader: false, pending: false, offline: false },
				{ id: 2, pony: { _foo: 'boo' } as any, self: false, leader: true, pending: false, offline: false },
			];

			const party = updateParty(undefined, info);

			expect(party).eql({
				leaderId: 2,
				members: info,
			});
		});

		it('adds new members', () => {
			const party: PartyInfo = {
				leaderId: 1,
				members: [
					{ id: 1, pony: { _foo: 'bar' } as any, self: false, leader: false, pending: false, offline: false },
				],
			};
			const info: PartyMember[] = [
				{ id: 1, pony: { _foo: 'bar' } as any, self: false, leader: false, pending: false, offline: false },
				{ id: 2, pony: { _foo: 'boo' } as any, self: false, leader: true, pending: false, offline: false },
			];

			updateParty(party, info);

			expect(party).eql({
				leaderId: 2,
				members: info,
			});
		});

		it('removes members', () => {
			const party: PartyInfo = {
				leaderId: 1,
				members: [
					{ id: 1, pony: { _foo: 'bar' } as any, self: false, leader: false, pending: false, offline: false },
					{ id: 2, pony: { _foo: 'boo' } as any, self: false, leader: true, pending: false, offline: false },
				],
			};
			const info: PartyMember[] = [
				{ id: 1, pony: { _foo: 'bar' } as any, self: false, leader: true, pending: false, offline: false },
			];

			updateParty(party, info);

			expect(party).eql({
				leaderId: 1,
				members: info,
			});
		});

		it('updates members', () => {
			const party: PartyInfo = {
				leaderId: 1,
				members: [
					{ id: 1, pony: { _foo: 'bar' } as any, self: false, leader: false, pending: true, offline: true },
					{ id: 2, pony: { _foo: 'boo' } as any, self: false, leader: true, pending: false, offline: false },
				],
			};
			const info: PartyMember[] = [
				{ id: 1, pony: { _foo: 'bar' } as any, self: false, leader: true, pending: false, offline: false },
				{ id: 2, pony: { _foo: 'boo' } as any, self: true, leader: false, pending: false, offline: false },
			];

			updateParty(party, info);

			expect(party).eql({
				leaderId: 1,
				members: info,
			});
		});

		it('does nothing for undefined/empty party and info', () => {
			expect(updateParty(undefined, undefined)).undefined;
			expect(updateParty(undefined, [])).undefined;
		});
	});

	describe('isPonyInParty()', () => {
		it('returns false for undefined party', () => {
			expect(isPonyInParty(undefined, {} as any, false)).false;
		});

		it('returns true if pony is in party', () => {
			const pony = { _foo: 'bar' } as any;
			const party: PartyInfo = {
				leaderId: 1,
				members: [
					{ id: 1, pony: pony, self: false, leader: false, pending: false, offline: true },
				],
			};

			expect(isPonyInParty(party, pony, false)).true;
		});

		it('returns false if pony is in party but pending', () => {
			const pony = { _foo: 'bar' } as any;
			const party: PartyInfo = {
				leaderId: 1,
				members: [
					{ id: 1, pony: pony, self: false, leader: false, pending: true, offline: true },
				],
			};

			expect(isPonyInParty(party, pony, false)).false;
		});

		it('returns true if pony is in party and pending, but pending flag is true', () => {
			const pony = { _foo: 'bar' } as any;
			const party: PartyInfo = {
				leaderId: 1,
				members: [
					{ id: 1, pony: pony, self: false, leader: false, pending: true, offline: true },
				],
			};

			expect(isPonyInParty(party, pony, true)).true;
		});

		it('returns false if pony is not in party', () => {
			const pony = { _foo: 'bar' } as any;
			const party: PartyInfo = {
				leaderId: 1,
				members: [
					{ id: 1, pony: { _foo: 'boo' } as any, self: false, leader: false, pending: false, offline: true },
				],
			};

			expect(isPonyInParty(party, pony, false)).false;
		});
	});

	describe('isPartyLeader()', () => {
		let game: PonyTownGame;

		beforeEach(() => {
			game = {} as any;
		});

		it('returns true if player is party leader', () => {
			game.player = { id: 123 } as any;
			game.party = { leaderId: 123, members: [] };

			expect(isPartyLeader(game)).true;
		});

		it('returns false if player is not party leader', () => {
			game.player = { id: 123 } as any;
			game.party = { leaderId: 321, members: [] };

			expect(isPartyLeader(game)).false;
		});

		it('returns false if player is not initialized', () => {
			expect(isPartyLeader(game)).false;
		});
	});

	describe('isInParty()', () => {
		let game: PonyTownGame;

		beforeEach(() => {
			game = {} as any;
		});

		it('returns true if player is in party', () => {
			game.party = { leaderId: 0, members: [{ id: 123 } as any] };

			expect(isInParty(game)).true;
		});

		it('returns false if player is not in a party', () => {
			expect(isInParty(game)).false;
		});

		it('returns false if party is empty', () => {
			game.party = { leaderId: 0, members: [] };

			expect(isInParty(game)).false;
		});
	});
});
