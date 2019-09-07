"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const constants_1 = require("../../common/constants");
const utils_1 = require("../../common/utils");
const accountUtils_1 = require("../../server/accountUtils");
const mocks_1 = require("../mocks");
const logger_1 = require("../../server/logger");
describe('accountUtils [server]', () => {
    describe('getModInfo()', () => {
        it('returns account info', () => {
            const accountId = mocks_1.genObjectId();
            const client = mocks_1.mockClient({
                accountId: accountId.toString(),
                account: mocks_1.account({
                    _id: accountId,
                    name: 'foo',
                    shadow: -1,
                    mute: utils_1.fromNow(1.1 * constants_1.DAY).getTime(),
                    note: 'foo',
                    counters: { spam: 1 },
                }),
                country: 'XY',
            });
            chai_1.expect(accountUtils_1.getModInfo(client)).eql({
                shadow: 'perma',
                mute: 'a day',
                note: 'foo',
                counters: { spam: 1 },
                country: 'XY',
                account: `foo [${accountId.toString().substr(-3)}]`,
            });
        });
        it('returns undefined for past timeouts', () => {
            const client = mocks_1.mockClient({
                account: mocks_1.account({
                    _id: mocks_1.genObjectId(),
                    shadow: 1000,
                    mute: 2000,
                }),
            });
            const result = accountUtils_1.getModInfo(client);
            chai_1.expect(result.mute).undefined;
            chai_1.expect(result.shadow).undefined;
        });
    });
    describe('checkIfAdmin()', () => {
        let warn;
        beforeEach(() => {
            warn = sinon_1.stub(logger_1.logger, 'warn');
        });
        afterEach(() => {
            warn.restore();
        });
        it('does nothing if not admin', () => {
            accountUtils_1.checkIfNotAdmin({}, '');
        });
        it('throws if admin', () => {
            chai_1.expect(() => accountUtils_1.checkIfNotAdmin({ roles: ['admin'] }, 'test'))
                .throw('Cannot perform this action on admin user');
            sinon_1.assert.calledWith(warn, 'Cannot perform this action on admin user (test)');
        });
    });
    describe('isNew()', () => {
        it('returns true if createdAt date is not set', () => {
            chai_1.expect(accountUtils_1.isNew(mocks_1.account({}))).true;
        });
        it('returns true if created less than a day ago', () => {
            chai_1.expect(accountUtils_1.isNew(mocks_1.account({ createdAt: utils_1.fromNow(-constants_1.DAY + 1000) }))).true;
        });
        it('returns false if created more than a day ago', () => {
            chai_1.expect(accountUtils_1.isNew(mocks_1.account({ createdAt: utils_1.fromNow(-2 * constants_1.DAY) }))).false;
        });
    });
});
//# sourceMappingURL=accountUtils.spec.js.map