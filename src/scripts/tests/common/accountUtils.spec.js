"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const accountUtils_1 = require("../../common/accountUtils");
const mocks_1 = require("../mocks");
describe('accountUtils [client]', () => {
    describe('isAdmin()', () => {
        it('returns true if target account has admin role', () => {
            chai_1.expect(accountUtils_1.isAdmin(mocks_1.account({ roles: ['admin'] }))).true;
        });
        it('returns true if target account has superadmin role', () => {
            chai_1.expect(accountUtils_1.isAdmin(mocks_1.account({ roles: ['superadmin'] }))).true;
        });
        it('returns false if target account has no roles', () => {
            chai_1.expect(accountUtils_1.isAdmin(mocks_1.account({}))).false;
        });
        it('returns false if target account has no admin or superadmin roles', () => {
            chai_1.expect(accountUtils_1.isAdmin(mocks_1.account({ roles: ['foo'] }))).false;
        });
    });
    describe('isMod()', () => {
        it('returns true if target account has mod role', () => {
            chai_1.expect(accountUtils_1.isMod(mocks_1.account({ roles: ['mod'] }))).true;
        });
        it('returns true if target account has admin role', () => {
            chai_1.expect(accountUtils_1.isMod(mocks_1.account({ roles: ['admin'] }))).true;
        });
        it('returns true if target account has superadmin role', () => {
            chai_1.expect(accountUtils_1.isMod(mocks_1.account({ roles: ['superadmin'] }))).true;
        });
        it('returns false if target account has no roles', () => {
            chai_1.expect(accountUtils_1.isMod(mocks_1.account({}))).false;
        });
        it('returns false if target account has no admin or superadmin roles', () => {
            chai_1.expect(accountUtils_1.isMod(mocks_1.account({ roles: ['foo'] }))).false;
        });
    });
    describe('isDev()', () => {
        it('returns true if target account has dev role', () => {
            chai_1.expect(accountUtils_1.isDev(mocks_1.account({ roles: ['dev'] }))).true;
        });
        it('returns false if target account has no roles', () => {
            chai_1.expect(accountUtils_1.isDev(mocks_1.account({}))).false;
        });
        it('returns false if target account has no dev role', () => {
            chai_1.expect(accountUtils_1.isDev(mocks_1.account({ roles: ['foo'] }))).false;
        });
    });
    describe('meetsRequirement()', () => {
        it('returns true for undefined requirement', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({}, undefined)).true;
        });
        it('returns true for empty requirement', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({}, '')).true;
        });
        it('returns true if requirement matches role', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ roles: ['mod'] }, 'mod')).true;
        });
        it('returns true if matches supporter 1 requirement', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ supporter: 1 /* Supporter1 */ }, 'sup1')).true;
        });
        it('returns true if matches supporter 2 requirement', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ supporter: 2 /* Supporter2 */ }, 'sup2')).true;
        });
        it('returns true if matches supporter 3 requirement', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ supporter: 3 /* Supporter3 */ }, 'sup3')).true;
        });
        it('returns false if supporter is lower level', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ supporter: 1 /* Supporter1 */ }, 'sup2')).false;
        });
        it('returns true if requires supporter but is mod', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ roles: ['mod'] }, 'sup2')).true;
        });
        it('returns true if requires supporter but is dev', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ roles: ['dev'] }, 'sup2')).true;
        });
        it('returns false if supporter is undefined', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({}, 'sup2')).false;
        });
        it('returns false if requirement is not met', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({}, 'mod')).false;
        });
        it('returns false if sup2 requirement is not met', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ supporter: 0 }, 'sup2')).false;
        });
        it('returns false if inv requirement is not met', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({}, 'inv')).false;
        });
        it('returns true if inv requirement is met (supporter)', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ supporter: 1 /* Supporter1 */ }, 'inv')).true;
        });
        it('returns true if inv requirement is met (role)', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ roles: ['dev'] }, 'inv')).true;
        });
        it('returns true if inv requirement is met (invited)', () => {
            chai_1.expect(accountUtils_1.meetsRequirement({ supporterInvited: true }, 'inv')).true;
        });
    });
    describe('getSupporterInviteLimit()', () => {
        it('returns 100 for mod', () => {
            chai_1.expect(accountUtils_1.getSupporterInviteLimit({ roles: ['mod'] })).equal(100);
        });
        it('returns 100 for dev', () => {
            chai_1.expect(accountUtils_1.getSupporterInviteLimit({ roles: ['dev'] })).equal(100);
        });
        it('returns 1 for supporter level 1', () => {
            chai_1.expect(accountUtils_1.getSupporterInviteLimit({ supporter: 1 })).equal(1);
        });
        it('returns 5 for supporter level 2', () => {
            chai_1.expect(accountUtils_1.getSupporterInviteLimit({ supporter: 2 })).equal(5);
        });
        it('returns 10 for supporter level 3', () => {
            chai_1.expect(accountUtils_1.getSupporterInviteLimit({ supporter: 3 })).equal(10);
        });
        it('returns 0 otherwise', () => {
            chai_1.expect(accountUtils_1.getSupporterInviteLimit({})).equal(0);
        });
    });
});
//# sourceMappingURL=accountUtils.spec.js.map