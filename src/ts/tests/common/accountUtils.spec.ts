import '../lib';
import { expect } from 'chai';
import { isAdmin, isMod, isDev, meetsRequirement, getSupporterInviteLimit } from '../../common/accountUtils';
import { account } from '../mocks';
import { SupporterFlags } from '../../common/adminInterfaces';

describe('accountUtils [client]', () => {
	describe('isAdmin()', () => {
		it('returns true if target account has admin role', () => {
			expect(isAdmin(account({ roles: ['admin'] }))).true;
		});

		it('returns true if target account has superadmin role', () => {
			expect(isAdmin(account({ roles: ['superadmin'] }))).true;
		});

		it('returns false if target account has no roles', () => {
			expect(isAdmin(account({}))).false;
		});

		it('returns false if target account has no admin or superadmin roles', () => {
			expect(isAdmin(account({ roles: ['foo'] }))).false;
		});
	});

	describe('isMod()', () => {
		it('returns true if target account has mod role', () => {
			expect(isMod(account({ roles: ['mod'] }))).true;
		});

		it('returns true if target account has admin role', () => {
			expect(isMod(account({ roles: ['admin'] }))).true;
		});

		it('returns true if target account has superadmin role', () => {
			expect(isMod(account({ roles: ['superadmin'] }))).true;
		});

		it('returns false if target account has no roles', () => {
			expect(isMod(account({}))).false;
		});

		it('returns false if target account has no admin or superadmin roles', () => {
			expect(isMod(account({ roles: ['foo'] }))).false;
		});
	});

	describe('isDev()', () => {
		it('returns true if target account has dev role', () => {
			expect(isDev(account({ roles: ['dev'] }))).true;
		});

		it('returns false if target account has no roles', () => {
			expect(isDev(account({}))).false;
		});

		it('returns false if target account has no dev role', () => {
			expect(isDev(account({ roles: ['foo'] }))).false;
		});
	});

	describe('meetsRequirement()', () => {
		it('returns true for undefined requirement', () => {
			expect(meetsRequirement({}, undefined)).true;
		});

		it('returns true for empty requirement', () => {
			expect(meetsRequirement({}, '')).true;
		});

		it('returns true if requirement matches role', () => {
			expect(meetsRequirement({ roles: ['mod'] }, 'mod')).true;
		});

		it('returns true if matches supporter 1 requirement', () => {
			expect(meetsRequirement({ supporter: SupporterFlags.Supporter1 }, 'sup1')).true;
		});

		it('returns true if matches supporter 2 requirement', () => {
			expect(meetsRequirement({ supporter: SupporterFlags.Supporter2 }, 'sup2')).true;
		});

		it('returns true if matches supporter 3 requirement', () => {
			expect(meetsRequirement({ supporter: SupporterFlags.Supporter3 }, 'sup3')).true;
		});

		it('returns false if supporter is lower level', () => {
			expect(meetsRequirement({ supporter: SupporterFlags.Supporter1 }, 'sup2')).false;
		});

		it('returns true if requires supporter but is mod', () => {
			expect(meetsRequirement({ roles: ['mod'] }, 'sup2')).true;
		});

		it('returns true if requires supporter but is dev', () => {
			expect(meetsRequirement({ roles: ['dev'] }, 'sup2')).true;
		});

		it('returns false if supporter is undefined', () => {
			expect(meetsRequirement({}, 'sup2')).false;
		});

		it('returns false if requirement is not met', () => {
			expect(meetsRequirement({}, 'mod')).false;
		});

		it('returns false if sup2 requirement is not met', () => {
			expect(meetsRequirement({ supporter: 0 }, 'sup2')).false;
		});

		it('returns false if inv requirement is not met', () => {
			expect(meetsRequirement({}, 'inv')).false;
		});

		it('returns true if inv requirement is met (supporter)', () => {
			expect(meetsRequirement({ supporter: SupporterFlags.Supporter1 }, 'inv')).true;
		});

		it('returns true if inv requirement is met (role)', () => {
			expect(meetsRequirement({ roles: ['dev'] }, 'inv')).true;
		});

		it('returns true if inv requirement is met (invited)', () => {
			expect(meetsRequirement({ supporterInvited: true }, 'inv')).true;
		});
	});

	describe('getSupporterInviteLimit()', () => {
		it('returns 100 for mod', () => {
			expect(getSupporterInviteLimit({ roles: ['mod'] })).equal(100);
		});

		it('returns 100 for dev', () => {
			expect(getSupporterInviteLimit({ roles: ['dev'] })).equal(100);
		});

		it('returns 1 for supporter level 1', () => {
			expect(getSupporterInviteLimit({ supporter: 1 })).equal(1);
		});

		it('returns 5 for supporter level 2', () => {
			expect(getSupporterInviteLimit({ supporter: 2 })).equal(5);
		});

		it('returns 10 for supporter level 3', () => {
			expect(getSupporterInviteLimit({ supporter: 3 })).equal(10);
		});

		it('returns 0 otherwise', () => {
			expect(getSupporterInviteLimit({})).equal(0);
		});
	});
});
