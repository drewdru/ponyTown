import { createFunctionWithPromiseHandler } from '../lib';
import { stub, assert, SinonStub } from 'sinon';
import { GameServerSettings } from '../../common/adminInterfaces';
import { CounterService } from '../../server/services/counter';
import { IClient, ReportInviteLimit, OnMessageSettings } from '../../server/serverInterfaces';
import { mock, mockClient } from '../mocks';
import { createReportSwears, createReportForbidden, reportInviteLimit } from '../../server/reporting';

describe('reporting', () => {
	describe('reportSwears()', () => {
		let client: IClient;
		let counter: CounterService<string>;
		let settings: GameServerSettings;
		let reportSwearingAccount: SinonStub;
		let timeoutAccount: SinonStub;
		let reportSwears: OnMessageSettings;

		beforeEach(() => {
			client = mockClient();
			counter = mock<CounterService<string>>(CounterService);
			settings = { filterSwears: true };
			reportSwearingAccount = stub().resolves();
			timeoutAccount = stub();
			reportSwears = createFunctionWithPromiseHandler(
				createReportSwears, counter, reportSwearingAccount, timeoutAccount);
		});

		it('increments counter', async () => {
			const add = stub(counter, 'add').returns({ count: 0, items: [], date: 0 });

			await reportSwears(client, 'test', settings);

			assert.calledWith(add, client.accountId, 'test');
		});

		describe('after excceded limit', () => {
			beforeEach(() => {
				stub(counter, 'add').returns({ count: 6, items: ['test'], date: 0 });
			});

			it('reports swearing', async () => {
				await reportSwears(client, 'test', settings);

				assert.calledWith(reportSwearingAccount, client.accountId);
			});

			it('timeouts account for 10 hours', async () => {
				settings.autoBanSwearing = true;

				await reportSwears(client, 'test', settings);

				assert.calledWith(timeoutAccount, client.accountId); // , fromNow(10 * HOUR)
			});

			it('doesnt timeout account if autoBanSwearing is false', async () => {
				await reportSwears(client, 'test', settings);

				assert.notCalled(timeoutAccount);
			});

			it('reports timing out', async () => {
				const system = stub(client.reporter, 'system');
				settings.autoBanSwearing = true;
				settings.reportSwears = true;

				await reportSwears(client, 'test', settings);

				assert.calledWith(system, 'Timed out for swearing', 'test', true);
			});

			it('does not report timing out if turned off in settings', async () => {
				const system = stub(client.reporter, 'system');
				settings.autoBanSwearing = true;
				settings.reportSwears = false;

				await reportSwears(client, 'test', settings);

				assert.calledWith(system, 'Timed out for swearing', 'test', false);
			});

			it('reports swearing if not timed out', async () => {
				const warn = stub(client.reporter, 'warn');

				await reportSwears(client, 'test', settings);

				assert.calledWith(warn, 'Swearing', 'test');
			});

			it('does not timeout if already muted', async () => {
				client.account.mute = -1;
				settings.autoBanSwearing = true;

				await reportSwears(client, 'test', settings);

				assert.notCalled(timeoutAccount);
			});

			// reports unhandled rejection
			it.skip('handles error', async () => {
				const err = new Error('test1');
				timeoutAccount.rejects(err);
				const error = stub(client.reporter, 'error');
				settings.autoBanSwearing = true;

				await reportSwears(client, 'test', settings);

				assert.calledWith(error, err);
			});
		});
	});

	describe('reportForbidden()', () => {
		let client: IClient;
		let counter: CounterService<string>;
		let settings: GameServerSettings;
		let onTimeoutAccount: SinonStub;
		let reportForbidden: OnMessageSettings;

		beforeEach(() => {
			client = mockClient();
			counter = mock<CounterService<string>>(CounterService);
			settings = {};
			onTimeoutAccount = stub().resolves();
			reportForbidden = createFunctionWithPromiseHandler(createReportForbidden, counter, onTimeoutAccount);
		});

		it('increments counter', async () => {
			const add = stub(counter, 'add').returns({ count: 0, items: [], date: 0 });

			await reportForbidden(client, 'test', settings);

			assert.calledWith(add, client.accountId, 'test');
		});

		describe('after excceded limit', () => {
			beforeEach(() => {
				stub(counter, 'add').returns({ count: 12, items: ['test'], date: 0 });
			});

			it('timeouts if account is new', async () => {
				client.account.createdAt = new Date();

				await reportForbidden(client, 'test', settings);

				assert.calledWith(onTimeoutAccount, client.accountId);
			});

			it('timeouts if autoBanSwearing is true', async () => {
				settings.autoBanSwearing = true;

				await reportForbidden(client, 'test', settings);

				assert.calledWith(onTimeoutAccount, client.accountId);
			});

			it('does not timeout account if autoBanSwearing is false and account is old', async () => {
				client.account.createdAt = new Date(0);

				await reportForbidden(client, 'test', settings);

				assert.notCalled(onTimeoutAccount);
			});

			it('reports timing out', async () => {
				const system = stub(client.reporter, 'system');
				settings.autoBanSwearing = true;

				await reportForbidden(client, 'test', settings);

				assert.calledWith(system, 'Timed out for forbidden messages', 'test');
			});

			it('reports forbidden if not timed out', async () => {
				const warn = stub(client.reporter, 'warn');
				settings.autoBanSwearing = false;
				client.account.createdAt = new Date(0);

				await reportForbidden(client, 'test', settings);

				assert.calledWith(warn, 'Forbidden messages', 'test');
			});

			it('does not timeout if already muted', async () => {
				client.account.mute = -1;
				settings.autoBanSwearing = true;

				await reportForbidden(client, 'test', settings);

				assert.notCalled(onTimeoutAccount);
			});

			it('handles error', async () => {
				const err = new Error('test2');
				onTimeoutAccount.rejects(err);
				const error = stub(client.reporter, 'error');
				settings.autoBanSwearing = true;

				await reportForbidden(client, 'test', settings);

				assert.calledWith(error, err);
			});
		});
	});

	describe('reportInviteLimit()', () => {
		let client: IClient;
		let reportInviteLimitAccount: SinonStub;
		let report: ReportInviteLimit;

		beforeEach(() => {
			client = mockClient();
			reportInviteLimitAccount = stub().resolves();
			report = createFunctionWithPromiseHandler(reportInviteLimit, reportInviteLimitAccount, 'Invite limit reached');
		});

		it('reports spamming account', async () => {
			await report(client);

			assert.calledWith(reportInviteLimitAccount, client.accountId);
		});

		it('reports error during invite limit reporting', async () => {
			const error = new Error('test3');
			reportInviteLimitAccount.rejects(error);
			const reporterError = stub(client.reporter, 'error');

			await report(client);

			assert.calledWith(reporterError, error);
		});

		it('logs invite limit reached', async () => {
			reportInviteLimitAccount.resolves(5);
			const systemLog = stub(client.reporter, 'systemLog');

			await report(client);

			assert.calledWith(systemLog, 'Invite limit reached');
		});

		it('reports warning every tenth invite limit report', async () => {
			reportInviteLimitAccount.resolves(10);
			const reporterWarn = stub(client.reporter, 'warn');

			await report(client);

			assert.calledWith(reporterWarn, 'Invite limit reached (10)');
		});
	});
});
