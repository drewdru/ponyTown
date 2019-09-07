import { stubClass, resetStubMethods } from '../../lib';
import { bufferCount, first } from 'rxjs/operators';
import { expect } from 'chai';
import { useFakeTimers, SinonFakeTimers, stub, SinonStub, assert, match } from 'sinon';
import { MINUTE, HIDE_LIMIT, HOUR, DAY } from '../../../common/constants';
import { HidingService } from '../../../server/services/hiding';
import { NotificationService } from '../../../server/services/notification';
import { ServerNotification, IClient } from '../../../server/serverInterfaces';
import { systemMessage } from '../../../server/logger';
import { mockClient } from '../../mocks';
import { times } from '../../../common/utils';

const DURATION = 24 * HOUR;

function isHidden(a: IClient, b: IClient) {
	return a.hides.has(b.accountId) || b.hides.has(a.accountId);
}

describe('HidingService', () => {
	let notifications = stubClass(NotificationService);
	let service: HidingService;
	let clock: SinonFakeTimers;
	let log: SinonStub;
	let clients: Map<string, IClient>;

	function addClients(...items: IClient[]) {
		items.forEach(c => clients.set(c.accountId, c));
	}

	beforeEach(() => {
		resetStubMethods(notifications, 'addNotification');
		clock = useFakeTimers();
		clock.setSystemTime(DAY);
		log = stub();
		clients = new Map();
		service = new HidingService(HOUR, notifications, id => clients.get(id), log);
		service.start();
	});

	afterEach(() => {
		clock.restore();
		service.stop();
	});

	describe('requestHide()', () => {
		it('adds hide notification', () => {
			const requester = mockClient();
			const target = mockClient();
			target.pony.name = 'foo';

			service.requestHide(requester, target, DURATION);

			assert.calledWith(notifications.addNotification, requester, match({
				name: 'foo',
				message: `Are you sure you want to hide <b>#NAME#</b> ?`,
				entityId: target.pony.id,
			}));
		});

		it('adds hide limit notification if reached hide limit', () => {
			const requester = mockClient();
			const target = mockClient();
			times(HIDE_LIMIT, () => service.hide(requester, mockClient(), DURATION));

			service.requestHide(requester, target, DURATION);

			assert.calledWith(notifications.addNotification, requester, match({
				message: 'Cannot hide any more players.',
			}));
		});

		it('accepting notification hides target player', () => {
			const requester = mockClient();
			requester.characterName = 'req_pony';
			requester.account.name = 'req';
			requester.accountId = 'REQ';
			const target = mockClient();
			target.characterName = 'tgt_pony';
			target.account.name = 'tgt';
			target.accountId = 'TGT';
			service.requestHide(requester, target, DURATION);

			const notification = notifications.addNotification.args[0][1] as ServerNotification;
			notification.accept!();

			expect(isHidden(requester, target)).true;
			expect(service.isHidden('REQ', 'TGT')).true;
			assert.calledWith(log, '[REQ][system]\treq_pony (req) hides tgt_pony (tgt) [TGT]');
		});

		it('does not log message if already hidden', () => {
			const requester = mockClient();
			requester.accountId = 'REQ';
			const target = mockClient();
			target.accountId = 'TGT';
			service.requestHide(requester, target, DURATION);
			service.hide(requester, target, DURATION);

			const notification = notifications.addNotification.args[0][1] as ServerNotification;
			notification.accept!();

			assert.notCalled(log);
		});

		it('prevents hiding party members', () => {
			const requester = mockClient();
			const target = mockClient();
			requester.party = target.party = { id: '', clients: [requester, target], leader: requester, pending: [] };

			service.requestHide(requester, target, DURATION);

			expect(isHidden(requester, target)).false;
			assert.calledWith(notifications.addNotification, requester, match({
				message: 'Cannot hide players from your party.',
			}));
		});
	});

	describe('requestUnhideAll()', () => {
		it('adds unhide notification', () => {
			const requester = mockClient();

			service.requestUnhideAll(requester);

			assert.calledWith(notifications.addNotification, requester, match({
				message: 'Are you sure you want to unhide all temporarily hidden players ?',
			}));
		});

		it('adds unhide notification if previous limit timed out', () => {
			const requester = mockClient();
			const target = mockClient();

			service.hide(requester, target, DURATION);
			service.unhideAll(requester);
			service.stop();
			clock.tick(HOUR + 1);

			service.requestUnhideAll(requester);

			assert.calledWith(notifications.addNotification, requester, match({
				message: 'Are you sure you want to unhide all temporarily hidden players ?',
			}));
		});

		it('adds unhide limit notification if already used unhideAll', () => {
			const requester = mockClient();
			const target = mockClient();

			service.hide(requester, target, DURATION);
			service.unhideAll(requester);

			service.requestUnhideAll(requester);

			assert.calledWith(notifications.addNotification, requester, match({
				message: 'Cannot unhide hidden players, try again later.',
			}));
		});

		it('accepting notification unhides all players', () => {
			const requester = mockClient();
			const target = mockClient();
			service.hide(requester, target, DURATION);
			service.requestUnhideAll(requester);
			expect(isHidden(requester, target)).true;

			const notification = notifications.addNotification.args[0][1] as ServerNotification;
			notification.accept!();

			expect(isHidden(requester, target)).false;
			expect(service.isHidden(requester.accountId, target.accountId)).false;
			assert.calledWith(log, systemMessage(requester.accountId, 'unhide all'));
		});
	});

	describe('hide()', () => {
		it('hides target user from source user', () => {
			const requester = mockClient();
			const target = mockClient();
			addClients(requester, target);

			service.hide(requester, target, DURATION);

			expect(isHidden(requester, target)).true;
			expect(service.isHiddenClient(requester, target)).true;
		});

		it('does nothing if already hidden', () => {
			const requester = mockClient();
			const target = mockClient();
			addClients(requester, target);

			service.hide(requester, target, DURATION);
			service.hide(requester, target, DURATION);

			expect(isHidden(requester, target)).true;
			expect(service.isHiddenClient(requester, target)).true;
		});

		it('hides source user from target user', () => {
			const requester = mockClient();
			const target = mockClient();
			addClients(requester, target);

			service.hide(requester, target, DURATION);

			expect(isHidden(requester, target)).true;
			expect(service.isHiddenClient(target, requester)).true;
		});

		it('does not hide user from themselves', () => {
			const requester = mockClient();
			addClients(requester);

			service.hide(requester, requester, DURATION);

			expect(isHidden(requester, requester)).false;
			expect(service.isHiddenClient(requester, requester)).false;
		});

		it('does not clean hides too early', () => {
			const requester = mockClient();
			const target = mockClient();
			addClients(requester, target);

			service.hide(requester, target, DURATION);

			clock.tick(25 * MINUTE);

			expect(isHidden(requester, target)).true;
			expect(service.isHiddenClient(requester, target)).true;
		});

		it('cleans up old hides', () => {
			const requester = mockClient();
			const target = mockClient();
			addClients(requester, target);

			service.hide(requester, target, DURATION);

			clock.tick(25 * HOUR);

			expect(isHidden(requester, target)).false;
			expect(service.isHiddenClient(requester, target)).false;
		});

		it('clears hide after given duration', () => {
			const requester = mockClient();
			const target = mockClient();
			addClients(requester, target);

			service.hide(requester, target, HOUR / 2);

			clock.tick(HOUR);

			expect(isHidden(requester, target)).false;
			expect(service.isHiddenClient(requester, target)).false;
		});

		it('triggers change event', done => {
			const requester = mockClient();
			const target = mockClient();
			addClients(requester, target);
			service.changes.subscribe(hide => {
				expect(hide).eql({ by: requester.accountId, who: target.accountId });
				done();
			});

			service.hide(requester, target, DURATION);
		});
	});

	describe('isHiddenClient()', () => {
		it('hides target user from source user', () => {
			const who = mockClient();
			const from = mockClient();
			service.hide(who, from, DURATION);

			expect(isHidden(who, from)).true;
			expect(service.isHiddenClient(who, from)).true;
		});
	});

	describe('unhide()', () => {
		it('unhides user', () => {
			const requester = mockClient();
			const target = mockClient();

			service.hide(requester, target, DURATION);

			service.unhide(requester, target);

			expect(isHidden(requester, target)).false;
			expect(service.isHiddenClient(requester, target)).false;
		});

		it('unhides only given user', () => {
			const requester = mockClient();
			const target1 = mockClient();
			const target2 = mockClient();

			service.hide(requester, target1, DURATION);
			service.hide(requester, target2, DURATION);

			service.unhide(requester, target1);

			expect(isHidden(requester, target1)).false;
			expect(isHidden(requester, target2)).true;
			expect(service.isHiddenClient(requester, target1)).false;
			expect(service.isHiddenClient(requester, target2)).true;
		});

		it('does nothing if not hidden', () => {
			const requester = mockClient();
			const target = mockClient();

			service.unhide(requester, target);

			expect(isHidden(requester, target)).false;
			expect(service.isHiddenClient(requester, target)).false;
		});

		it('does nothing if not hidden (2)', () => {
			const requester = mockClient();
			const target1 = mockClient();
			const target2 = mockClient();

			service.hide(requester, target1, DURATION);

			service.unhide(requester, target2);

			expect(isHidden(requester, target1)).true;
			expect(isHidden(requester, target2)).false;
			expect(service.isHiddenClient(requester, target1)).true;
			expect(service.isHiddenClient(requester, target2)).false;
		});

		it('triggers change event', done => {
			const requester = mockClient();
			const target = mockClient();

			service.hide(requester, target, DURATION);
			service.changes.subscribe(hide => {
				expect(hide).eql({ by: requester.accountId, who: target.accountId });
				done();
			});

			service.unhide(requester, target);
		});
	});

	describe('unhideAll()', () => {
		it('does nothing if no users are hidden', () => {
			const requester = mockClient();
			const target1 = mockClient();
			const target2 = mockClient();

			service.unhideAll(requester);

			expect(isHidden(requester, target1)).false;
			expect(isHidden(requester, target2)).false;
			expect(service.isHiddenClient(requester, target1)).false;
			expect(service.isHiddenClient(requester, target2)).false;
		});

		it('unhides all', () => {
			const requester = mockClient();
			const target1 = mockClient();
			const target2 = mockClient();

			service.hide(requester, target1, DURATION);
			service.hide(requester, target2, DURATION);

			service.unhideAll(requester);

			expect(isHidden(requester, target1)).false;
			expect(isHidden(requester, target2)).false;
			expect(service.isHiddenClient(requester, target1)).false;
			expect(service.isHiddenClient(requester, target2)).false;
		});

		it('does not count to limit if noone is hidden', () => {
			const requester = mockClient();
			const target = mockClient();

			service.unhideAll(requester);
			service.hide(requester, target, DURATION);
			service.unhideAll(requester);

			expect(isHidden(requester, target)).false;
			expect(service.isHiddenClient(requester, target)).false;
		});

		it('prevents unhide all if used too fast', () => {
			const requester = mockClient();
			const target = mockClient();

			service.hide(requester, target, DURATION);
			service.unhideAll(requester);
			service.hide(requester, target, DURATION);

			service.unhideAll(requester);

			expect(isHidden(requester, target)).true;
			expect(service.isHiddenClient(requester, target)).true;
		});

		it('does not clean up old unhides too early', () => {
			const requester = mockClient();
			const target = mockClient();

			service.hide(requester, target, DURATION);
			service.unhideAll(requester);
			service.hide(requester, target, DURATION);

			clock.tick(25 * MINUTE);

			service.unhideAll(requester);
			expect(isHidden(requester, target)).true;
			expect(service.isHiddenClient(requester, target)).true;
		});

		it('cleans up old unhides', () => {
			const requester = mockClient();
			const target = mockClient();

			service.hide(requester, target, DURATION);
			service.unhideAll(requester);
			service.hide(requester, target, DURATION);

			clock.tick(2 * HOUR);

			service.unhideAll(requester);
			expect(isHidden(requester, target)).false;
			expect(service.isHiddenClient(requester, target)).false;
		});

		it('triggers unhidesAll event', done => {
			const requester = mockClient();
			const target = mockClient();

			service.hide(requester, target, DURATION);
			service.unhidesAll.subscribe(id => {
				expect(id).equal(requester.accountId);
				done();
			});

			service.unhideAll(requester);
		});
	});

	describe('merged()', () => {
		it('transfers hide list to new account ID', () => {
			const requester1 = mockClient();
			const requester2 = mockClient();
			const target = mockClient();
			addClients(requester2);

			service.hide(requester1, target, DURATION);

			service.merged(requester2.accountId, requester1.accountId);

			expect(isHidden(requester2, target)).true;
			expect(service.isHiddenClient(requester2, target)).true;
		});

		it('transfers hide list to new account ID (no client)', () => {
			const requester1 = mockClient();
			const requester2 = mockClient();
			const target = mockClient();

			service.hide(requester1, target, DURATION);

			service.merged(requester2.accountId, requester1.accountId);

			expect(service.isHiddenClient(requester2, target)).true;
		});

		it('merges hide lists', () => {
			const requester1 = mockClient();
			const requester2 = mockClient();
			const target1 = mockClient();
			const target2 = mockClient();
			addClients(requester2, target1, target2);

			service.hide(requester1, target1, DURATION);
			service.hide(requester2, target2, DURATION);

			service.merged(requester2.accountId, requester1.accountId);

			expect(isHidden(requester2, target1)).true;
			expect(isHidden(requester2, target2)).true;
			expect(service.isHiddenClient(requester2, target1)).true;
			expect(service.isHiddenClient(requester2, target2)).true;
		});

		it('does not allow to be hidden by yourself after merge', () => {
			const requester = mockClient();
			const target = mockClient();
			addClients(target);

			service.hide(requester, target, DURATION);
			// service.hide(target, requester, DURATION);

			service.merged(target.accountId, requester.accountId);

			expect(isHidden(target, target)).false;
			// expect(isHidden(requester, target)).false; // requester client does not exist at this point
			// expect(isHidden(target, requester)).false; // requester client does not exist at this point
			expect(service.isHiddenClient(target, target)).false;
			expect(service.isHiddenClient(requester, target)).false;
			expect(service.isHiddenClient(target, requester)).false;
		});

		it('updates in hidden lists', () => {
			const requester = mockClient();
			const target1 = mockClient();
			const target2 = mockClient();
			addClients(requester, target2);

			service.hide(requester, target1, DURATION);

			service.merged(target2.accountId, target1.accountId);

			expect(isHidden(requester, target2)).true;
			expect(service.isHiddenClient(requester, target2)).true;
		});

		it('picks newer date in hidden lists', () => {
			const requester = mockClient();
			const target1 = mockClient();
			const target2 = mockClient();
			addClients(requester, target2);

			clock.setSystemTime(HOUR);
			service.hide(requester, target1, DURATION);
			clock.setSystemTime(5 * HOUR);
			service.hide(requester, target2, DURATION);

			service.merged(target2.accountId, target1.accountId);

			clock.tick(22 * HOUR);
			expect(isHidden(requester, target2)).true;
			expect(service.isHiddenClient(requester, target2)).true;
		});

		it('transfers unhide countdown', () => {
			const requester1 = mockClient();
			const requester2 = mockClient();
			const target = mockClient();
			addClients(requester2, target);

			service.hide(requester1, target, DURATION);
			service.unhideAll(requester1);

			service.merged(requester2.accountId, requester1.accountId);

			service.hide(requester2, target, DURATION);
			service.unhideAll(requester2);
			expect(isHidden(requester2, target)).true;
			expect(service.isHiddenClient(requester2, target)).true;
		});

		it('does not trigger change event if state of user didn\'t change', () => {
			const requester1 = mockClient();
			const requester2 = mockClient();
			const target = mockClient();
			addClients(requester2, target);

			service.hide(requester1, target, DURATION);
			service.hide(requester2, target, DURATION);

			service.merged(requester2.accountId, requester1.accountId);
		});

		it('triggers change events (1)', done => {
			const requester1 = mockClient();
			const requester2 = mockClient();
			const target = mockClient();
			addClients(requester2, target);

			service.hide(requester1, target, DURATION);
			service.changes.pipe(bufferCount(2), first()).subscribe(([hide1, hide2]) => {
				expect(hide1).eql({ by: requester2.accountId, who: target.accountId });
				expect(hide2).eql({ by: requester1.accountId, who: target.accountId });
				done();
			});

			service.merged(requester2.accountId, requester1.accountId);
		});

		it('triggers change events (2)', done => {
			const requester = mockClient();
			const target1 = mockClient();
			const target2 = mockClient();
			addClients(requester, target2);

			service.hide(requester, target1, DURATION);
			service.changes.pipe(bufferCount(2), first()).subscribe(([hide1, hide2]) => {
				expect(hide1).eql({ by: requester.accountId, who: target2.accountId });
				expect(hide2).eql({ by: requester.accountId, who: target1.accountId });
				done();
			});

			service.merged(target2.accountId, target1.accountId);
		});
	});
});
