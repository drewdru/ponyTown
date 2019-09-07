"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const mongoose_1 = require("mongoose");
const authUtils_1 = require("../../server/authUtils");
const mocks_1 = require("../mocks");
function profile(options) {
    return options;
}
describe('authUtils', () => {
    describe('updateAuthInfo()', () => {
        it('updates url and name fields', async () => {
            const updateAuth = sinon_1.stub();
            const a = mocks_1.auth({ _id: 'bar' });
            await authUtils_1.updateAuthInfo(updateAuth, a, profile({ username: 'foo', url: 'bar' }), undefined);
            chai_1.expect(a.name).eql('foo');
            chai_1.expect(a.url).eql('bar');
            sinon_1.assert.calledWith(updateAuth, 'bar', { name: 'foo', url: 'bar' });
        });
        it('updates email field', async () => {
            const a = mocks_1.auth({ emails: ['a'] });
            await authUtils_1.updateAuthInfo(sinon_1.stub(), a, profile({ emails: ['b', 'c'] }), undefined);
            chai_1.expect(a.emails).eql(['a', 'b', 'c']);
        });
        it('updates email field (from empty)', async () => {
            const updateAuth = sinon_1.stub();
            const a = mocks_1.auth({ _id: 'bar' });
            await authUtils_1.updateAuthInfo(updateAuth, a, profile({ emails: ['b', 'c'] }), undefined);
            chai_1.expect(a.emails).eql(['b', 'c']);
            sinon_1.assert.calledWith(updateAuth, 'bar', { emails: ['b', 'c'] });
        });
        it('saves updated auth', async () => {
            const updateAuth = sinon_1.stub();
            await authUtils_1.updateAuthInfo(updateAuth, mocks_1.auth({ _id: 'bar' }), profile({ username: 'foo' }), undefined);
            sinon_1.assert.calledWith(updateAuth, 'bar', { name: 'foo' });
        });
        it('updates account if passed account ID', async () => {
            const a = mocks_1.auth({});
            const accountId = mocks_1.genId();
            await authUtils_1.updateAuthInfo(sinon_1.stub(), a, profile({ username: 'foo', url: 'bar' }), accountId);
            chai_1.expect(a.account).eql(mongoose_1.Types.ObjectId(accountId));
        });
        it('does not save auth if nothing changed', async () => {
            const updateAuth = sinon_1.stub();
            await authUtils_1.updateAuthInfo(updateAuth, mocks_1.auth({ _id: 'bar', name: 'foo' }), profile({ username: 'foo' }), undefined);
            sinon_1.assert.notCalled(updateAuth);
        });
        it('does nothing if email list is the same', async () => {
            const updateAuth = sinon_1.stub();
            const a = mocks_1.auth({ _id: 'bar', emails: ['a', 'b'] });
            await authUtils_1.updateAuthInfo(updateAuth, a, profile({ emails: ['b', 'a'] }), undefined);
            sinon_1.assert.notCalled(updateAuth);
        });
        it('does nothing if auth is undefined', async () => {
            const updateAuth = sinon_1.stub();
            await authUtils_1.updateAuthInfo(updateAuth, undefined, profile({}), undefined);
            sinon_1.assert.notCalled(updateAuth);
        });
    });
});
//# sourceMappingURL=authUtils.spec.js.map