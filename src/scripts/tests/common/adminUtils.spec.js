"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const adminUtils_1 = require("../../common/adminUtils");
const mocks_1 = require("../mocks");
describe('adminUtils', () => {
    describe('pushOrdered()', () => {
        it('pushes one item to empty array', () => {
            const items = [];
            adminUtils_1.pushOrdered(items, { name: 'foo' }, adminUtils_1.compareByName);
            chai_1.expect(items).eql([{ name: 'foo' }]);
        });
        it('pushes item after existing one', () => {
            const items = [{ name: 'a' }];
            adminUtils_1.pushOrdered(items, { name: 'b' }, adminUtils_1.compareByName);
            chai_1.expect(items).eql([{ name: 'a' }, { name: 'b' }]);
        });
        it('pushes item before existing one', () => {
            const items = [{ name: 'b' }];
            adminUtils_1.pushOrdered(items, { name: 'a' }, adminUtils_1.compareByName);
            chai_1.expect(items).eql([{ name: 'a' }, { name: 'b' }]);
        });
        it('pushes item between existing ones', () => {
            const items = [{ name: 'a' }, { name: 'c' }];
            adminUtils_1.pushOrdered(items, { name: 'b' }, adminUtils_1.compareByName);
            chai_1.expect(items).eql([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
        });
    });
    describe('supporterLevel()', () => {
        it('returns 1 if is supporter on patreon', () => {
            chai_1.expect(adminUtils_1.supporterLevel(mocks_1.account({ patreon: 1 /* Supporter1 */ }))).equal(1);
        });
        it('returns 1 if has supporter flag', () => {
            chai_1.expect(adminUtils_1.supporterLevel(mocks_1.account({ supporter: 1 /* Supporter1 */ }))).equal(1);
        });
        it('returns max level if has supporter flag and patreon', () => {
            chai_1.expect(adminUtils_1.supporterLevel(mocks_1.account({
                patreon: 3 /* Supporter3 */,
                supporter: 1 /* Supporter1 */
            }))).equal(3);
        });
        it('returns 0 if patreon info is empty', () => {
            chai_1.expect(adminUtils_1.supporterLevel(mocks_1.account({}))).equal(0);
        });
        it('returns 0 if has patreon info but has ignore flag set', () => {
            chai_1.expect(adminUtils_1.supporterLevel(mocks_1.account({
                patreon: 1 /* Supporter1 */,
                supporter: 128 /* IgnorePatreon */,
            }))).equal(0);
        });
    });
    describe('isMuted()', () => {
        it('returns true if account has muted flag', () => {
            chai_1.expect(adminUtils_1.isMuted(mocks_1.account({ mute: -1 }))).true;
        });
        it('returns true if account has timeout after current date', () => {
            chai_1.expect(adminUtils_1.isMuted(mocks_1.account({ mute: Date.now() + 10000 }))).true;
        });
        it('returns false if account has timeout before current date', () => {
            chai_1.expect(adminUtils_1.isMuted(mocks_1.account({ mute: Date.now() - 10000 }))).false;
        });
        it('returns false if account has not timeout, mute or shadow', () => {
            chai_1.expect(adminUtils_1.isMuted(mocks_1.account({}))).false;
        });
    });
    describe('isActive()', () => {
        let clock;
        beforeEach(() => {
            clock = sinon_1.useFakeTimers();
        });
        afterEach(() => {
            clock.restore();
            clock = undefined;
        });
        it('returns false for undefined', () => {
            chai_1.expect(adminUtils_1.isActive(undefined)).false;
        });
        it('returns false for 0', () => {
            chai_1.expect(adminUtils_1.isActive(0)).false;
        });
        it('returns true for -1', () => {
            chai_1.expect(adminUtils_1.isActive(-1)).true;
        });
        it('returns true for time larger than current time', () => {
            clock.setSystemTime(2000);
            chai_1.expect(adminUtils_1.isActive(3000)).true;
        });
        it('returns false for time smaller than current time', () => {
            clock.setSystemTime(3000);
            chai_1.expect(adminUtils_1.isActive(2000)).false;
        });
    });
});
//# sourceMappingURL=adminUtils.spec.js.map