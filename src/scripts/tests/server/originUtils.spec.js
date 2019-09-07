"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const mocks_1 = require("../mocks");
const originUtils_1 = require("../../server/originUtils");
const db_1 = require("../../server/db");
describe('originUtils', () => {
    describe.skip('addOrigin()', () => {
        let clock;
        let update;
        beforeEach(() => {
            clock = sinon_1.useFakeTimers();
            update = sinon_1.stub(db_1.Account, 'update').returns({ exec: () => Promise.resolve() });
        });
        afterEach(() => {
            clock.restore();
            update.restore();
        });
        it('adds origin to account', async () => {
            const acc = mocks_1.account({});
            const origin = { foo: 'bar' };
            await originUtils_1.addOrigin(acc, origin);
            chai_1.expect(acc.origins).contains(origin);
            sinon_1.assert.calledWithMatch(update, { _id: acc._id }, { $push: { origins: origin } });
        });
        it('updates date of existing origin', async () => {
            const acc = mocks_1.account({
                origins: [{ _id: 'foo', ip: '1.2.3.4', last: new Date(9999) }],
            });
            const origin = { ip: '1.2.3.4' };
            clock.setSystemTime(12345);
            await originUtils_1.addOrigin(acc, origin);
            chai_1.expect(acc.origins).eql([{ _id: 'foo', ip: '1.2.3.4', last: new Date(12345) }]);
            sinon_1.assert.calledWith(update, { _id: acc._id, 'origins._id': 'foo' }); //, { 'origins.$.last': new Date(12345) });
        });
    });
});
//# sourceMappingURL=originUtils.spec.js.map