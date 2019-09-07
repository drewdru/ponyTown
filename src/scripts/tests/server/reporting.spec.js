"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const sinon_1 = require("sinon");
const counter_1 = require("../../server/services/counter");
const mocks_1 = require("../mocks");
const reporting_1 = require("../../server/reporting");
describe('reporting', () => {
    describe('reportSwears()', () => {
        let client;
        let counter;
        let settings;
        let reportSwearingAccount;
        let timeoutAccount;
        let reportSwears;
        beforeEach(() => {
            client = mocks_1.mockClient();
            counter = mocks_1.mock(counter_1.CounterService);
            settings = { filterSwears: true };
            reportSwearingAccount = sinon_1.stub().resolves();
            timeoutAccount = sinon_1.stub();
            reportSwears = lib_1.createFunctionWithPromiseHandler(reporting_1.createReportSwears, counter, reportSwearingAccount, timeoutAccount);
        });
        it('increments counter', async () => {
            const add = sinon_1.stub(counter, 'add').returns({ count: 0, items: [], date: 0 });
            await reportSwears(client, 'test', settings);
            sinon_1.assert.calledWith(add, client.accountId, 'test');
        });
        describe('after excceded limit', () => {
            beforeEach(() => {
                sinon_1.stub(counter, 'add').returns({ count: 6, items: ['test'], date: 0 });
            });
            it('reports swearing', async () => {
                await reportSwears(client, 'test', settings);
                sinon_1.assert.calledWith(reportSwearingAccount, client.accountId);
            });
            it('timeouts account for 10 hours', async () => {
                settings.autoBanSwearing = true;
                await reportSwears(client, 'test', settings);
                sinon_1.assert.calledWith(timeoutAccount, client.accountId); // , fromNow(10 * HOUR)
            });
            it('doesnt timeout account if autoBanSwearing is false', async () => {
                await reportSwears(client, 'test', settings);
                sinon_1.assert.notCalled(timeoutAccount);
            });
            it('reports timing out', async () => {
                const system = sinon_1.stub(client.reporter, 'system');
                settings.autoBanSwearing = true;
                settings.reportSwears = true;
                await reportSwears(client, 'test', settings);
                sinon_1.assert.calledWith(system, 'Timed out for swearing', 'test', true);
            });
            it('does not report timing out if turned off in settings', async () => {
                const system = sinon_1.stub(client.reporter, 'system');
                settings.autoBanSwearing = true;
                settings.reportSwears = false;
                await reportSwears(client, 'test', settings);
                sinon_1.assert.calledWith(system, 'Timed out for swearing', 'test', false);
            });
            it('reports swearing if not timed out', async () => {
                const warn = sinon_1.stub(client.reporter, 'warn');
                await reportSwears(client, 'test', settings);
                sinon_1.assert.calledWith(warn, 'Swearing', 'test');
            });
            it('does not timeout if already muted', async () => {
                client.account.mute = -1;
                settings.autoBanSwearing = true;
                await reportSwears(client, 'test', settings);
                sinon_1.assert.notCalled(timeoutAccount);
            });
            // reports unhandled rejection
            it.skip('handles error', async () => {
                const err = new Error('test1');
                timeoutAccount.rejects(err);
                const error = sinon_1.stub(client.reporter, 'error');
                settings.autoBanSwearing = true;
                await reportSwears(client, 'test', settings);
                sinon_1.assert.calledWith(error, err);
            });
        });
    });
    describe('reportForbidden()', () => {
        let client;
        let counter;
        let settings;
        let onTimeoutAccount;
        let reportForbidden;
        beforeEach(() => {
            client = mocks_1.mockClient();
            counter = mocks_1.mock(counter_1.CounterService);
            settings = {};
            onTimeoutAccount = sinon_1.stub().resolves();
            reportForbidden = lib_1.createFunctionWithPromiseHandler(reporting_1.createReportForbidden, counter, onTimeoutAccount);
        });
        it('increments counter', async () => {
            const add = sinon_1.stub(counter, 'add').returns({ count: 0, items: [], date: 0 });
            await reportForbidden(client, 'test', settings);
            sinon_1.assert.calledWith(add, client.accountId, 'test');
        });
        describe('after excceded limit', () => {
            beforeEach(() => {
                sinon_1.stub(counter, 'add').returns({ count: 12, items: ['test'], date: 0 });
            });
            it('timeouts if account is new', async () => {
                client.account.createdAt = new Date();
                await reportForbidden(client, 'test', settings);
                sinon_1.assert.calledWith(onTimeoutAccount, client.accountId);
            });
            it('timeouts if autoBanSwearing is true', async () => {
                settings.autoBanSwearing = true;
                await reportForbidden(client, 'test', settings);
                sinon_1.assert.calledWith(onTimeoutAccount, client.accountId);
            });
            it('does not timeout account if autoBanSwearing is false and account is old', async () => {
                client.account.createdAt = new Date(0);
                await reportForbidden(client, 'test', settings);
                sinon_1.assert.notCalled(onTimeoutAccount);
            });
            it('reports timing out', async () => {
                const system = sinon_1.stub(client.reporter, 'system');
                settings.autoBanSwearing = true;
                await reportForbidden(client, 'test', settings);
                sinon_1.assert.calledWith(system, 'Timed out for forbidden messages', 'test');
            });
            it('reports forbidden if not timed out', async () => {
                const warn = sinon_1.stub(client.reporter, 'warn');
                settings.autoBanSwearing = false;
                client.account.createdAt = new Date(0);
                await reportForbidden(client, 'test', settings);
                sinon_1.assert.calledWith(warn, 'Forbidden messages', 'test');
            });
            it('does not timeout if already muted', async () => {
                client.account.mute = -1;
                settings.autoBanSwearing = true;
                await reportForbidden(client, 'test', settings);
                sinon_1.assert.notCalled(onTimeoutAccount);
            });
            it('handles error', async () => {
                const err = new Error('test2');
                onTimeoutAccount.rejects(err);
                const error = sinon_1.stub(client.reporter, 'error');
                settings.autoBanSwearing = true;
                await reportForbidden(client, 'test', settings);
                sinon_1.assert.calledWith(error, err);
            });
        });
    });
    describe('reportInviteLimit()', () => {
        let client;
        let reportInviteLimitAccount;
        let report;
        beforeEach(() => {
            client = mocks_1.mockClient();
            reportInviteLimitAccount = sinon_1.stub().resolves();
            report = lib_1.createFunctionWithPromiseHandler(reporting_1.reportInviteLimit, reportInviteLimitAccount, 'Invite limit reached');
        });
        it('reports spamming account', async () => {
            await report(client);
            sinon_1.assert.calledWith(reportInviteLimitAccount, client.accountId);
        });
        it('reports error during invite limit reporting', async () => {
            const error = new Error('test3');
            reportInviteLimitAccount.rejects(error);
            const reporterError = sinon_1.stub(client.reporter, 'error');
            await report(client);
            sinon_1.assert.calledWith(reporterError, error);
        });
        it('logs invite limit reached', async () => {
            reportInviteLimitAccount.resolves(5);
            const systemLog = sinon_1.stub(client.reporter, 'systemLog');
            await report(client);
            sinon_1.assert.calledWith(systemLog, 'Invite limit reached');
        });
        it('reports warning every tenth invite limit report', async () => {
            reportInviteLimitAccount.resolves(10);
            const reporterWarn = sinon_1.stub(client.reporter, 'warn');
            await report(client);
            sinon_1.assert.calledWith(reporterWarn, 'Invite limit reached (10)');
        });
    });
});
//# sourceMappingURL=reporting.spec.js.map