"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const partyUtils_1 = require("../../client/partyUtils");
describe('partyUtils', () => {
    describe('updateParty()', () => {
        it('creates new party', () => {
            const info = [
                { id: 1, pony: { _foo: 'bar' }, self: false, leader: false, pending: false, offline: false },
                { id: 2, pony: { _foo: 'boo' }, self: false, leader: true, pending: false, offline: false },
            ];
            const party = partyUtils_1.updateParty(undefined, info);
            chai_1.expect(party).eql({
                leaderId: 2,
                members: info,
            });
        });
        it('adds new members', () => {
            const party = {
                leaderId: 1,
                members: [
                    { id: 1, pony: { _foo: 'bar' }, self: false, leader: false, pending: false, offline: false },
                ],
            };
            const info = [
                { id: 1, pony: { _foo: 'bar' }, self: false, leader: false, pending: false, offline: false },
                { id: 2, pony: { _foo: 'boo' }, self: false, leader: true, pending: false, offline: false },
            ];
            partyUtils_1.updateParty(party, info);
            chai_1.expect(party).eql({
                leaderId: 2,
                members: info,
            });
        });
        it('removes members', () => {
            const party = {
                leaderId: 1,
                members: [
                    { id: 1, pony: { _foo: 'bar' }, self: false, leader: false, pending: false, offline: false },
                    { id: 2, pony: { _foo: 'boo' }, self: false, leader: true, pending: false, offline: false },
                ],
            };
            const info = [
                { id: 1, pony: { _foo: 'bar' }, self: false, leader: true, pending: false, offline: false },
            ];
            partyUtils_1.updateParty(party, info);
            chai_1.expect(party).eql({
                leaderId: 1,
                members: info,
            });
        });
        it('updates members', () => {
            const party = {
                leaderId: 1,
                members: [
                    { id: 1, pony: { _foo: 'bar' }, self: false, leader: false, pending: true, offline: true },
                    { id: 2, pony: { _foo: 'boo' }, self: false, leader: true, pending: false, offline: false },
                ],
            };
            const info = [
                { id: 1, pony: { _foo: 'bar' }, self: false, leader: true, pending: false, offline: false },
                { id: 2, pony: { _foo: 'boo' }, self: true, leader: false, pending: false, offline: false },
            ];
            partyUtils_1.updateParty(party, info);
            chai_1.expect(party).eql({
                leaderId: 1,
                members: info,
            });
        });
        it('does nothing for undefined/empty party and info', () => {
            chai_1.expect(partyUtils_1.updateParty(undefined, undefined)).undefined;
            chai_1.expect(partyUtils_1.updateParty(undefined, [])).undefined;
        });
    });
    describe('isPonyInParty()', () => {
        it('returns false for undefined party', () => {
            chai_1.expect(partyUtils_1.isPonyInParty(undefined, {}, false)).false;
        });
        it('returns true if pony is in party', () => {
            const pony = { _foo: 'bar' };
            const party = {
                leaderId: 1,
                members: [
                    { id: 1, pony: pony, self: false, leader: false, pending: false, offline: true },
                ],
            };
            chai_1.expect(partyUtils_1.isPonyInParty(party, pony, false)).true;
        });
        it('returns false if pony is in party but pending', () => {
            const pony = { _foo: 'bar' };
            const party = {
                leaderId: 1,
                members: [
                    { id: 1, pony: pony, self: false, leader: false, pending: true, offline: true },
                ],
            };
            chai_1.expect(partyUtils_1.isPonyInParty(party, pony, false)).false;
        });
        it('returns true if pony is in party and pending, but pending flag is true', () => {
            const pony = { _foo: 'bar' };
            const party = {
                leaderId: 1,
                members: [
                    { id: 1, pony: pony, self: false, leader: false, pending: true, offline: true },
                ],
            };
            chai_1.expect(partyUtils_1.isPonyInParty(party, pony, true)).true;
        });
        it('returns false if pony is not in party', () => {
            const pony = { _foo: 'bar' };
            const party = {
                leaderId: 1,
                members: [
                    { id: 1, pony: { _foo: 'boo' }, self: false, leader: false, pending: false, offline: true },
                ],
            };
            chai_1.expect(partyUtils_1.isPonyInParty(party, pony, false)).false;
        });
    });
    describe('isPartyLeader()', () => {
        let game;
        beforeEach(() => {
            game = {};
        });
        it('returns true if player is party leader', () => {
            game.player = { id: 123 };
            game.party = { leaderId: 123, members: [] };
            chai_1.expect(partyUtils_1.isPartyLeader(game)).true;
        });
        it('returns false if player is not party leader', () => {
            game.player = { id: 123 };
            game.party = { leaderId: 321, members: [] };
            chai_1.expect(partyUtils_1.isPartyLeader(game)).false;
        });
        it('returns false if player is not initialized', () => {
            chai_1.expect(partyUtils_1.isPartyLeader(game)).false;
        });
    });
    describe('isInParty()', () => {
        let game;
        beforeEach(() => {
            game = {};
        });
        it('returns true if player is in party', () => {
            game.party = { leaderId: 0, members: [{ id: 123 }] };
            chai_1.expect(partyUtils_1.isInParty(game)).true;
        });
        it('returns false if player is not in a party', () => {
            chai_1.expect(partyUtils_1.isInParty(game)).false;
        });
        it('returns false if party is empty', () => {
            game.party = { leaderId: 0, members: [] };
            chai_1.expect(partyUtils_1.isInParty(game)).false;
        });
    });
});
//# sourceMappingURL=partyUtils.spec.js.map