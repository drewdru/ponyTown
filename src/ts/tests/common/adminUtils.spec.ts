import '../lib';
import { expect } from 'chai';
import { SinonFakeTimers, useFakeTimers } from 'sinon';
import { SupporterFlags, PatreonFlags } from '../../common/adminInterfaces';
import { supporterLevel, isMuted, isActive, pushOrdered, compareByName } from '../../common/adminUtils';
import { account } from '../mocks';

describe('adminUtils', () => {
	describe('pushOrdered()', () => {
		it('pushes one item to empty array', () => {
			const items: ({ name: string; })[] = [];

			pushOrdered(items, { name: 'foo' }, compareByName);

			expect(items).eql([{ name: 'foo' }]);
		});

		it('pushes item after existing one', () => {
			const items = [{ name: 'a' }];

			pushOrdered(items, { name: 'b' }, compareByName);

			expect(items).eql([{ name: 'a' }, { name: 'b' }]);
		});

		it('pushes item before existing one', () => {
			const items = [{ name: 'b' }];

			pushOrdered(items, { name: 'a' }, compareByName);

			expect(items).eql([{ name: 'a' }, { name: 'b' }]);
		});

		it('pushes item between existing ones', () => {
			const items = [{ name: 'a' }, { name: 'c' }];

			pushOrdered(items, { name: 'b' }, compareByName);

			expect(items).eql([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
		});
	});

	describe('supporterLevel()', () => {
		it('returns 1 if is supporter on patreon', () => {
			expect(supporterLevel(account({ patreon: PatreonFlags.Supporter1 }))).equal(1);
		});

		it('returns 1 if has supporter flag', () => {
			expect(supporterLevel(account({ supporter: SupporterFlags.Supporter1 }))).equal(1);
		});

		it('returns max level if has supporter flag and patreon', () => {
			expect(supporterLevel(account({
				patreon: PatreonFlags.Supporter3,
				supporter: SupporterFlags.Supporter1
			}))).equal(3);
		});

		it('returns 0 if patreon info is empty', () => {
			expect(supporterLevel(account({}))).equal(0);
		});

		it('returns 0 if has patreon info but has ignore flag set', () => {
			expect(supporterLevel(account({
				patreon: PatreonFlags.Supporter1,
				supporter: SupporterFlags.IgnorePatreon,
			}))).equal(0);
		});
	});

	describe('isMuted()', () => {
		it('returns true if account has muted flag', () => {
			expect(isMuted(account({ mute: -1 }))).true;
		});

		it('returns true if account has timeout after current date', () => {
			expect(isMuted(account({ mute: Date.now() + 10000 }))).true;
		});

		it('returns false if account has timeout before current date', () => {
			expect(isMuted(account({ mute: Date.now() - 10000 }))).false;
		});

		it('returns false if account has not timeout, mute or shadow', () => {
			expect(isMuted(account({}))).false;
		});
	});

	describe('isActive()', () => {
		let clock: SinonFakeTimers;

		beforeEach(() => {
			clock = useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
			clock = undefined as any;
		});

		it('returns false for undefined', () => {
			expect(isActive(undefined)).false;
		});

		it('returns false for 0', () => {
			expect(isActive(0)).false;
		});

		it('returns true for -1', () => {
			expect(isActive(-1)).true;
		});

		it('returns true for time larger than current time', () => {
			clock.setSystemTime(2000);

			expect(isActive(3000)).true;
		});

		it('returns false for time smaller than current time', () => {
			clock.setSystemTime(3000);

			expect(isActive(2000)).false;
		});
	});
});
