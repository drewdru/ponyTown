import '../lib';
import { expect } from 'chai';
import { SinonFakeTimers, useFakeTimers, stub, assert, SinonStub } from 'sinon';
import { account } from '../mocks';
import { addOrigin } from '../../server/originUtils';
import { Account } from '../../server/db';

describe('originUtils', () => {
	describe.skip('addOrigin()', () => {
		let clock: SinonFakeTimers;
		let update: SinonStub<any>;

		beforeEach(() => {
			clock = useFakeTimers();
			update = stub(Account, 'update').returns({ exec: () => Promise.resolve() } as any);
		});

		afterEach(() => {
			clock.restore();
			update.restore();
		});

		it('adds origin to account', async () => {
			const acc = account({});
			const origin = { foo: 'bar' } as any;

			await addOrigin(acc, origin);

			expect(acc.origins).contains(origin);
			assert.calledWithMatch(update, { _id: acc._id }, { $push: { origins: origin } });
		});

		it('updates date of existing origin', async () => {
			const acc = account({
				origins: [{ _id: 'foo', ip: '1.2.3.4', last: new Date(9999) }],
			} as any);
			const origin = { ip: '1.2.3.4' } as any;
			clock.setSystemTime(12345);

			await addOrigin(acc, origin);

			expect(acc.origins).eql([{ _id: 'foo', ip: '1.2.3.4', last: new Date(12345) }]);
			assert.calledWith(update, { _id: acc._id, 'origins._id': 'foo' }); //, { 'origins.$.last': new Date(12345) });
		});
	});
});
