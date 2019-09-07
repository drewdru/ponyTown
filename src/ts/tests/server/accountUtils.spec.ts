import '../lib';
import { expect } from 'chai';
import { stub, assert, SinonStub } from 'sinon';
import { DAY } from '../../common/constants';
import { fromNow } from '../../common/utils';
import { getModInfo, checkIfNotAdmin, isNew } from '../../server/accountUtils';
import { account, mockClient, genObjectId } from '../mocks';
import { logger } from '../../server/logger';

describe('accountUtils [server]', () => {
	describe('getModInfo()', () => {
		it('returns account info', () => {
			const accountId = genObjectId();
			const client = mockClient({
				accountId: accountId.toString(),
				account: account({
					_id: accountId,
					name: 'foo',
					shadow: -1,
					mute: fromNow(1.1 * DAY).getTime(),
					note: 'foo',
					counters: { spam: 1 },
				}),
				country: 'XY',
			});

			expect(getModInfo(client)).eql({
				shadow: 'perma',
				mute: 'a day',
				note: 'foo',
				counters: { spam: 1 },
				country: 'XY',
				account: `foo [${accountId.toString().substr(-3)}]`,
			});
		});

		it('returns undefined for past timeouts', () => {
			const client = mockClient({
				account: account({
					_id: genObjectId(),
					shadow: 1000,
					mute: 2000,
				}),
			});

			const result = getModInfo(client);

			expect(result.mute).undefined;
			expect(result.shadow).undefined;
		});
	});

	describe('checkIfAdmin()', () => {
		let warn: SinonStub;

		beforeEach(() => {
			warn = stub(logger, 'warn');
		});

		afterEach(() => {
			warn.restore();
		});

		it('does nothing if not admin', () => {
			checkIfNotAdmin({} as any, '');
		});

		it('throws if admin', () => {
			expect(() => checkIfNotAdmin({ roles: ['admin'] } as any, 'test'))
				.throw('Cannot perform this action on admin user');

			assert.calledWith(warn, 'Cannot perform this action on admin user (test)');
		});
	});

	describe('isNew()', () => {
		it('returns true if createdAt date is not set', () => {
			expect(isNew(account({}))).true;
		});

		it('returns true if created less than a day ago', () => {
			expect(isNew(account({ createdAt: fromNow(-DAY + 1000) }))).true;
		});

		it('returns false if created more than a day ago', () => {
			expect(isNew(account({ createdAt: fromNow(-2 * DAY) }))).false;
		});
	});
});
