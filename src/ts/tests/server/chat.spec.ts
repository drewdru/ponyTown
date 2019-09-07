import '../lib';
import { expect } from 'chai';
import { stub, assert, SinonStub } from 'sinon';
import { ChatType, Action, MessageType, LeaveReason } from '../../common/interfaces';
import { GameServerSettings } from '../../common/adminInterfaces';
import { World } from '../../server/world';
import { createServerMap } from '../../server/serverMap';
import { IClient, ServerRegion } from '../../server/serverInterfaces';
import { mock, mockClient, serverEntity, entity } from '../mocks';
import { parseExpression } from '../../common/expressionUtils';
import {
	createSay, filterUrls, Say, sayTo, sayToEveryone, sayToOthers,
	sayToClientTest as sayToClient, sayToPartyTest as sayToParty, sayWhisperTest as sayWhisper
} from '../../server/chat';
import { encodeExpression } from '../../common/encoders/expressionEncoder';
import { toScreenX, toScreenY } from '../../common/positionUtils';
import { createServerRegion } from '../../server/serverRegion';
import * as playerUtils from '../../server/playerUtils';

describe('chat', () => {
	describe('say()', () => {
		let client: IClient;
		let region: ServerRegion;
		let world: World;
		let runCommand: SinonStub;
		let log: SinonStub;
		let say: Say;
		let checkSpam: SinonStub;
		let reportSwears: SinonStub;
		let reportForbidden: SinonStub;
		let reportSuspicious: SinonStub;
		let isSuspiciousMessage: SinonStub;
		let execAction: SinonStub;

		beforeEach(() => {
			execAction = stub(playerUtils, 'execAction');
			region = createServerRegion(1, 1);
			client = mockClient();
			client.pony.region = region;
			region.clients.push(client);
			world = mock(World);
			const map = createServerMap('', 0, 1, 1);
			stub(world, 'getMainMap').returns(map);
			runCommand = stub();
			log = stub();
			checkSpam = stub();
			reportSwears = stub();
			reportForbidden = stub();
			reportSuspicious = stub();
			isSuspiciousMessage = stub();
			const spamCommands = ['roll'];
			say = createSay(
				world, runCommand, log, checkSpam, reportSwears, reportForbidden,
				reportSuspicious, spamCommands, () => 0, isSuspiciousMessage);
		});

		afterEach(() => {
			execAction.restore();
		});

		it('does nothing if whispering to self', () => {
			say(client, 'hey me', ChatType.Whisper, client, {});

			assert.notCalled(log);
		});

		it('sends back error message if whispering to missing client', () => {
			say(client, 'hey no one', ChatType.Whisper, undefined, {});

			assert.calledOnce(log);
			expect(client.saysQueue).eql([[client.pony.id, `Couldn't find this player`, MessageType.System]]);
		});

		it('runs commands for whispers', () => {
			runCommand.returns(true);
			const target = mockClient();

			say(client, '/gifts', ChatType.Whisper, target, {});

			assert.calledOnce(log);
			assert.calledWith(runCommand, client, 'gifts', '', ChatType.Whisper, target, {});
		});

		it('sends back error message if whispering to non-friend when having non-friend whispers disabled', () => {
			client.accountSettings.ignoreNonFriendWhispers = true;

			say(client, 'hey you', ChatType.Whisper, mockClient(), {});

			assert.calledOnce(log);
			expect(client.saysQueue).eql([
				[client.pony.id, 'You can only whisper to friends', MessageType.System],
			]);
		});

		it('sends whisper to target', () => {
			const target = mockClient();

			say(client, 'hey you', ChatType.Whisper, target, {});

			assert.calledOnce(log);
			expect(target.saysQueue).eql([[client.pony.id, 'hey you', MessageType.Whisper]]);
		});

		it('does not send whisper to target if shadowed', () => {
			const target = mockClient();
			client.shadowed = true;

			say(client, 'hey you', ChatType.Whisper, target, {});

			assert.calledOnce(log);
			expect(client.saysQueue).eql([[target.pony.id, 'hey you', MessageType.WhisperTo]]);
			expect(target.saysQueue).eql([]);
		});

		it('does not send whisper to target if muted', () => {
			const target = mockClient();
			client.account.mute = Date.now() + 10000;

			say(client, 'hey you', ChatType.Whisper, target, {});

			assert.calledOnce(log);
			expect(client.saysQueue).eql([[target.pony.id, 'hey you', MessageType.WhisperTo]]);
			expect(target.saysQueue).eql([]);
		});

		it('does not send whisper to target if target is shadowed', () => {
			const target = mockClient();
			target.shadowed = true;

			say(client, 'hey you', ChatType.Whisper, target, {});

			assert.calledOnce(log);
			expect(client.saysQueue).eql([[client.pony.id, `Couldn't find this player`, MessageType.System]]);
			expect(target.saysQueue).eql([]);
		});

		it('does not send whisper to target if target is hidden', () => {
			const target = mockClient();
			target.hides.add(client.accountId);

			say(client, 'hey you', ChatType.Whisper, target, {});

			assert.calledOnce(log);
			expect(client.saysQueue).eql([[client.pony.id, `Couldn't find this player`, MessageType.System]]);
			expect(target.saysQueue).eql([]);
		});

		it('does not check for spam if whispering to friend', () => {
			const target = mockClient();
			client.friends.add(target.accountId);

			say(client, 'hey you', ChatType.Whisper, target, {});

			assert.notCalled(checkSpam);
		});

		it('logs chat message', () => {
			say(client, 'hey there', ChatType.Say, undefined, {});

			assert.calledWith(log, client, 'hey there', ChatType.Say, false);
		});

		it('logs party chat message', () => {
			say(client, 'hey there', ChatType.Party, undefined, {});

			assert.calledWith(log, client, 'hey there', ChatType.Party, false);
		});

		it('trims text', () => {
			say(client, ' test ', ChatType.Say, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Chat]]);
		});

		it('sends say to everyone in the world', () => {
			say(client, 'test', ChatType.Say, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Chat]]);
		});

		it('sends say for say command in party chat', () => {
			say(client, '/s test', ChatType.Party, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Chat]]);
		});

		it('sends say for invalid type', () => {
			say(client, 'test', 100, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Chat]]);
		});

		it('sends think message to everyone', () => {
			say(client, 'test', ChatType.Think, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Thinking]]);
		});

		it('sends think message to everyone', () => {
			say(client, '/t test', ChatType.Say, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Thinking]]);
		});

		it('ignores empty say command', () => {
			say(client, '/s ', ChatType.Say, undefined, {});

			expect(client.saysQueue).eql([]);
		});

		it(`reports suspicious message`, () => {
			isSuspiciousMessage.withArgs('foo bar').returns(true);

			say(client, 'foo bar', ChatType.Say, undefined, {});

			assert.calledWith(reportSuspicious, client, 'foo bar');
		});

		it(`reports suspicious party message with prefix`, () => {
			isSuspiciousMessage.withArgs('foo bar').returns(true);

			say(client, 'foo bar', ChatType.Party, undefined, {});

			assert.calledWith(reportSuspicious, client, '/p foo bar');
		});

		describe('in a party', () => {
			beforeEach(() => {
				client.party = { id: '', leader: client, clients: [client], pending: [] };
			});

			it('sends party message for party type', () => {
				say(client, 'test', ChatType.Party, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Party]]);
			});

			it('sends party message for party command', () => {
				say(client, '/p test', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Party]]);
			});

			it('ignores empty party command', () => {
				say(client, '/p ', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([]);
			});

			it('sends party think message to party if in party chat', () => {
				say(client, '/t test', ChatType.Party, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.PartyThinking]]);
			});
		});

		it('does not set expression in party think command', () => {
			client.pony.options!.expr = 123;

			say(client, '/t :)', ChatType.Party, undefined, {});

			expect(client.pony.options!.expr).equal(123);
		});

		it('runs command if text is command', () => {
			runCommand.returns(true);

			say(client, '/test arg', ChatType.Say, undefined, {});

			assert.calledWith(runCommand, client, 'test', 'arg');
		});

		it('notifies of invalid command', () => {
			runCommand.returns(false);

			say(client, '/test arg', ChatType.Say, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'Invalid command', MessageType.System]]);
		});

		it('sets expression', () => {
			say(client, 'hi :)', ChatType.Say, undefined, {});

			expect(client.pony.options!.expr).equal(encodeExpression(parseExpression(':)')));
		});

		it('sets invisible expression', () => {
			runCommand.returns(false);

			say(client, '/:)', ChatType.Say, undefined, {});

			expect(client.pony.options!.expr).equal(encodeExpression(parseExpression(':)')));
			expect(client.saysQueue).eql([]);
		});

		it('sets invisible expression (with space)', () => {
			runCommand.returns(false);

			say(client, '/ :)', ChatType.Say, undefined, {});

			expect(client.pony.options!.expr).equal(encodeExpression(parseExpression(':)')));
			expect(client.saysQueue).eql([]);
		});

		it('does not set expression in think command', () => {
			client.pony.options!.expr = 123;

			say(client, '/t :)', ChatType.Say, undefined, {});

			expect(client.pony.options!.expr).equal(123);
		});

		it('calls laugh action', () => {
			say(client, 'haha', ChatType.Say, undefined, {});

			assert.calledWith(execAction, client, Action.Laugh);
		});

		it('checks for spam', () => {
			const settings = {};

			say(client, 'test', ChatType.Say, undefined, settings);

			assert.calledWith(checkSpam, client, 'test', settings);
		});

		it('does not check for spam in party chat', () => {
			say(client, 'test', ChatType.Party, undefined, {});

			assert.notCalled(checkSpam);
		});

		it('does not trim repeated letters in party chat', () => {
			client.party = { id: '', leader: client, clients: [client], pending: [] };

			say(client, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', ChatType.Party, undefined, {});

			expect(client.saysQueue).eql([
				[client.pony.id, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', MessageType.Party],
			]);
		});

		it('trims repeated letters', () => {
			say(client, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', ChatType.Say, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'AAAAAAAAAAAAAAAA…', MessageType.Chat]]);
		});

		it('trims repeated emoji', () => {
			say(client, '🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸', ChatType.Say, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, '🌸🌸🌸🌸🌸🌸🌸🌸…', MessageType.Chat]]);
		});

		describe('supporter', () => {
			it('sends supporter message', () => {
				client.supporterLevel = 1;

				say(client, 'hello', ChatType.Supporter, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Supporter1]]);
			});

			it('sends supporter message of correct level (2)', () => {
				client.supporterLevel = 2;

				say(client, 'hello', ChatType.Supporter, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Supporter2]]);
			});

			it('sends supporter message of correct level (3)', () => {
				client.supporterLevel = 3;

				say(client, 'hello', ChatType.Supporter, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Supporter3]]);
			});

			it('sends supporter message as regular message for non-supporters', () => {
				say(client, 'hello', ChatType.Supporter, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Chat]]);
			});

			it('sends supporter 1 message', () => {
				client.supporterLevel = 3;

				say(client, 'hello', ChatType.Supporter1, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Supporter1]]);
			});

			it('sends supporter 2 message', () => {
				client.supporterLevel = 3;

				say(client, 'hello', ChatType.Supporter2, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Supporter2]]);
			});

			it('sends supporter 3 message', () => {
				client.supporterLevel = 3;

				say(client, 'hello', ChatType.Supporter3, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Supporter3]]);
			});

			it('sends chat message if supporter level is lower than message level', () => {
				client.supporterLevel = 2;

				say(client, 'hello', ChatType.Supporter3, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Chat]]);
			});

			it('sends chat message if non-supporter sends supporter messsage', () => {
				say(client, 'hello', ChatType.Supporter, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hello', MessageType.Chat]]);
			});
		});

		describe('urls', () => {
			it('removes url in regular chat', () => {
				say(client, 'hey www.google.com', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'hey [LINK]', MessageType.Chat]]);
			});

			it('removes url in censored messages', () => {
				say(client, 'fuck www.google.com', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'fuck [LINK]', MessageType.Chat]]);
			});

			it('does not remove url in party chat', () => {
				client.party = { id: '', leader: client, clients: [client], pending: [] };

				say(client, 'hey www.google.com', ChatType.Party, undefined, {});

				expect(client.saysQueue).eql([
					[client.pony.id, 'hey www.google.com', MessageType.Party],
				]);
			});

			it('does not report url as swearing', () => {
				say(client, 'hey www.google.com', ChatType.Say, undefined, { filterSwears: true });

				assert.notCalled(reportSwears);
			});
		});

		describe('commands', () => {
			it('checks for spam', () => {
				runCommand.returns(true);
				const settings = {};

				say(client, '/roll', ChatType.Say, undefined, settings);

				assert.calledWith(checkSpam, client, '/roll', settings);
			});

			it('does not check for spam in party chat', () => {
				runCommand.returns(true);

				say(client, '/test', ChatType.Party, undefined, {});

				assert.notCalled(checkSpam);
			});

			it('does not check for spam for /:)', () => {
				runCommand.returns(false);

				say(client, '/:)', ChatType.Say, undefined, {});

				assert.notCalled(checkSpam);
			});

			it('does not check for spam for /e', () => {
				runCommand.returns(true);

				say(client, '/e :)', ChatType.Say, undefined, {});

				assert.notCalled(checkSpam);
			});
		});

		describe('swear message', () => {
			it('does not report normal message', () => {
				say(client, 'test', ChatType.Say, undefined, {});

				assert.notCalled(reportSwears);
			});

			it('does not report is filterSwears is false', () => {
				say(client, 'fuck', ChatType.Say, undefined, { filterSwears: false });

				assert.notCalled(reportSwears);
			});

			it('reports', () => {
				const settings = { filterSwears: true };

				say(client, 'fuck', ChatType.Say, undefined, settings);

				assert.calledWith(reportSwears, client, 'fuck', settings);
			});
		});

		describe('kicking', () => {
			let kick: SinonStub<any>;

			beforeEach(() => {
				kick = stub(world, 'kick');
			});

			it('kicks player if messages contain swears and kickSwearing settings is true', () => {
				say(client, 'fuck', ChatType.Say, undefined, { kickSwearing: true });

				assert.calledWith(kick, client, 'swearing', LeaveReason.Swearing);
			});

			it('does not kick player if messages contain swears and kickSwearing setting is true but is party message', () => {
				say(client, 'fuck', ChatType.Party, undefined, { kickSwearing: true });

				assert.notCalled(kick);
			});

			it('does not reset player to spawn if kickSwearingToSpawn setting is false', () => {
				const resetToSpawn = stub(world, 'resetToSpawn');

				say(client, 'fuck', ChatType.Say, undefined, { kickSwearing: true, kickSwearingToSpawn: false });

				assert.notCalled(resetToSpawn);
			});

			it('resets player to spawn if kickSwearingToSpawn setting is true', () => {
				const resetToSpawn = stub(world, 'resetToSpawn');

				say(client, 'fuck', ChatType.Say, undefined, { kickSwearing: true, kickSwearingToSpawn: true });

				assert.calledWith(resetToSpawn, client);
			});
		});
	});

	describe('filterUrls()', () => {
		[
			'',
			'test',
			'hello there.',
			'12.3254',
			'999.999.999.999',
			'www...',
			'Pare...Com Isto...',
			'Solo tengo 1.000.000.000.000',
			// 'Is a smol .com',
			'battle.net',
			'paint.net',
			'fimfiction.net',
			'fanfiction.net',
			'Serio,com licença',
			'Sim,net caiu',
		].forEach(message => it(`returns the same message: "${message}"`, () => {
			expect(filterUrls(message)).equal(message);
		}));

		[
			['1.1.1.1', '[LINK]'],
			['192.168.0.255', '[LINK]'],
			['hello 192.168.0.255 aaa', 'hello [LINK] aaa'],
			['hello192.168.0.255aaa', 'hello[LINK]aaa'],
			['192.168.0.255 aaa 192.168.0.255', '[LINK] aaa [LINK]'],
			['ip:147.230.64.174', 'ip:[LINK]']
		].forEach(([message, expected]) => it(`replaces ip addresses: "${message}"`, () => {
			expect(filterUrls(message)).equal(expected);
		}));

		[
			['http://google.com/', '[LINK]'],
			['HTTP://GOOGLE.COM/', '[LINK]'],
			['https://foo', '[LINK]'],
			['https//last_name_is_.net', '[LINK]'],
			['www.test.pl', '[LINK]'],
			['foo,com/bar', '[LINK]'],
			['a123,net/bar/123', '[LINK]'],
			['foo.com', '[LINK]'],
			['foo.c0m', '[LINK]'],
			['foo.net', '[LINK]'],
			['foo.net/abc/xyz', '[LINK]/abc/xyz'],
			['WWW.test.pl', '[LINK]'],
			['foo.COM', '[LINK]'],
			['hello http://google.com/', 'hello [LINK]'],
			['hello foo.com aaa', 'hello [LINK] aaa'],
			['hellohttp://google.com/', 'hello[LINK]'],
			['http://google.com/ aaa http://google.com/', '[LINK] aaa [LINK]'],
			['foo.com foo.com', '[LINK] [LINK]'],
			['goo.gl/Cjy2Qj', '[LINK]'],
			['goo,gl/Cjy2Qj', '[LINK]'],
			['bit.ly/1mHSR3x', '[LINK]'],
			['adf.ly/13ajex', '[LINK]'],
			['dhttps://www.twitch.tv/foobar', 'd[LINK]'],
			['bestgore. com', '[LINK]'],
			[
				'https:/ mlpfanart.fandom .com/wiki/Banned_From_Equestria_(Daily)',
				'https:/ [LINK]/wiki/Banned_From_Equestria_(Daily)'
			],
		].forEach(([message, expected]) => it(`replaces urls addresses: "${message}"`, () => {
			expect(filterUrls(message)).equal(expected);
		}));
	});

	describe('sayToClient()', () => {
		let client: IClient;
		let settings: GameServerSettings;

		beforeEach(() => {
			client = mockClient();
			client.camera.w = toScreenX(10);
			client.camera.h = toScreenY(10);
			settings = {};
		});

		it('sends message to client', () => {
			sayToClient(client, serverEntity(5), 'foo', 'foo', MessageType.Chat, settings);

			expect(client.saysQueue).eql([
				[5, 'foo', MessageType.Chat],
			]);
		});

		it('sends original message if filterSwearWords is false', () => {
			client.accountSettings = { filterSwearWords: false };

			sayToClient(client, serverEntity(5), 'foo', 'bar', MessageType.Chat, settings);

			expect(client.saysQueue).eql([
				[5, 'foo', MessageType.Chat],
			]);
		});

		it('sends censored message if filterSwearWords is true', () => {
			client.accountSettings = { filterSwearWords: true };

			sayToClient(client, serverEntity(5), 'foo', 'bar', MessageType.Chat, settings);

			expect(client.saysQueue).eql([
				[5, 'bar', MessageType.Chat],
			]);
		});

		it('sends censored message if filterSwears is true', () => {
			settings.filterSwears = true;

			sayToClient(client, serverEntity(5), 'foo', '***', MessageType.Chat, settings);

			expect(client.saysQueue).eql([
				[5, '***', MessageType.Chat],
			]);
		});

		it('sends original message to self', () => {
			client.pony.id = 5;

			sayToClient(client, client.pony, 'foo', 'foo', MessageType.Chat, settings);

			expect(client.saysQueue).eql([
				[5, 'foo', MessageType.Chat],
			]);
		});

		it('sends original message to self if filterSwearWords is true', () => {
			client.pony.id = 5;
			client.account.settings = { filterSwearWords: true };

			sayToClient(client, client.pony, 'foo', 'bar', MessageType.Chat, settings);

			expect(client.saysQueue).eql([
				[5, 'foo', MessageType.Chat],
			]);
		});

		it('sends original message to self if filterSwears is true', () => {
			settings.filterSwears = true;
			client.pony.id = 5;

			sayToClient(client, client.pony, 'foo', 'bar', MessageType.Chat, settings);

			expect(client.saysQueue).eql([
				[5, 'foo', MessageType.Chat],
			]);
		});

		it('sends cyrillic message to self if filterCyrillic setting is true', () => {
			client.accountSettings = { filterCyrillic: true };
			client.pony.id = 5;

			sayToClient(client, client.pony, 'Здравствуй', 'Здравствуй', MessageType.Chat, settings);

			expect(client.saysQueue).eql([
				[5, 'Здравствуй', MessageType.Chat],
			]);
		});

		it('ignores messages if ignored', () => {
			const e = serverEntity(5);
			e.client = mockClient();
			e.client.ignores.add(client.accountId);

			expect(sayToClient(client, e, 'test', 'test', MessageType.Chat, settings)).false;

			expect(client.saysQueue).eql([]);
		});

		it('ignores messages if hidden', () => {
			const e = serverEntity(5);
			e.client = mockClient();
			client.hides.add(e.client.accountId);

			expect(sayToClient(client, e, 'test', 'test', MessageType.Chat, settings)).false;

			expect(client.saysQueue).eql([]);
		});

		it('ignores messages if swearing in whisper to non-friend', () => {
			const e = serverEntity(5);
			e.client = mockClient();
			settings.hideSwearing = true;

			expect(sayToClient(client, e, 'test', '****', MessageType.Whisper, settings)).false;

			expect(client.saysQueue).eql([]);
		});

		it('ignores messages if outside client camera', () => {
			const e = serverEntity(5, 10, 10);
			client.camera.x = toScreenX(20);
			client.camera.y = toScreenY(20);
			client.camera.w = toScreenX(10);
			client.camera.h = toScreenY(10);
			client.pony.x = 25;
			client.pony.y = 25;

			sayToClient(client, e, 'test', 'test', MessageType.Chat, settings);

			expect(client.saysQueue).eql([]);
		});

		it('ignores messages if contain swears and hideSwearing setting is true', () => {
			settings.hideSwearing = true;

			sayToClient(client, serverEntity(5), 'fuck', '****', MessageType.Chat, settings);

			expect(client.saysQueue).eql([]);
		});

		it('does not ignore messages if contain swears and hideSwearing setting is true but sending to self', () => {
			settings.hideSwearing = true;

			sayToClient(client, client.pony, 'fuck', '****', MessageType.Chat, settings);

			expect(client.saysQueue).eql([[client.pony.id, 'fuck', MessageType.Chat]]);
		});

		it('does not ignore messages if contain swears and hideSwearing setting is true but is party message', () => {
			settings.hideSwearing = true;

			sayToClient(client, serverEntity(6), 'fuck', '****', MessageType.Party, settings);

			expect(client.saysQueue).eql([[6, 'fuck', MessageType.Party]]);
		});

		it('sends party messages even if outside client camera', () => {
			const e = serverEntity(5, 1, 1);
			client.camera.x = toScreenX(20);
			client.camera.y = toScreenY(20);
			client.camera.w = toScreenX(10);
			client.camera.h = toScreenY(10);
			client.pony.x = 25;
			client.pony.y = 25;

			sayToClient(client, e, 'test', 'test', MessageType.Party, settings);

			expect(client.saysQueue).eql([[5, 'test', MessageType.Party]]);
		});

		it('sends messages if hidden but client is moderator', () => {
			const e = serverEntity(5);
			e.client = mockClient();
			client.isMod = true;
			client.hides.add(e.client.accountId);

			sayToClient(client, e, 'test', 'test', MessageType.Chat, settings);

			expect(client.saysQueue).eql([[5, 'test', MessageType.Chat]]);
		});
	});

	describe('sayTo()', () => {
		it('adds message to message queue', () => {
			const client = mockClient();

			sayTo(client, entity(123), 'test', MessageType.Chat);

			expect(client.saysQueue).eql([[123, 'test', MessageType.Chat]]);
		});
	});

	describe('sayToParty()', () => {
		it('sends message to all party members', () => {
			const client = mockClient();
			const client2 = mockClient();
			client.party = { clients: [client, client2] } as any;

			sayToParty(client, 'test', MessageType.Party);

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Party]]);
			expect(client2.saysQueue).eql([[client.pony.id, 'test', MessageType.Party]]);
		});

		it('sends message only to client if muted or shadowed', () => {
			const client = mockClient();
			const client2 = mockClient();
			client.shadowed = true;
			client.party = { clients: [client, client2] } as any;

			sayToParty(client, 'test', MessageType.Party);

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Party]]);
			expect(client2.saysQueue).eql([]);
		});

		it('sends error message to client if not in party', () => {
			const client = mockClient();

			sayToParty(client, 'test', MessageType.Party);

			expect(client.saysQueue).eql([[client.pony.id, `you're not in a party`, MessageType.System]]);
		});
	});

	describe('sayWhisper()', () => {
		it('sends whisper to client and target', () => {
			const client = mockClient();
			const target = mockClient();

			sayWhisper(client, 'hey there', 'hey there', MessageType.Whisper, target, {});

			expect(client.saysQueue).eql([[target.pony.id, 'hey there', MessageType.WhisperTo]]);
			expect(target.saysQueue).eql([[client.pony.id, 'hey there', MessageType.Whisper]]);
		});

		it('sends announcement whisper to client and target', () => {
			const client = mockClient();
			const target = mockClient();

			sayWhisper(client, 'hey there', 'hey there', MessageType.WhisperAnnouncement, target, {});

			expect(client.saysQueue).eql([[target.pony.id, 'hey there', MessageType.WhisperToAnnouncement]]);
			expect(target.saysQueue).eql([[client.pony.id, 'hey there', MessageType.WhisperAnnouncement]]);
		});

		it('sends error message to client if target is undefined', () => {
			const client = mockClient();

			sayWhisper(client, 'hey there', 'hey there', MessageType.Whisper, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, `Couldn't find this player`, MessageType.System]]);
		});

		it('sends error message to client if target is ignoring whispers', () => {
			const client = mockClient();
			const target = mockClient();
			target.accountSettings.ignoreNonFriendWhispers = true;

			sayWhisper(client, 'hey there', 'hey there', MessageType.Whisper, target, {});

			expect(client.saysQueue).eql([[client.pony.id, `Can't whisper to this player`, MessageType.System]]);
			expect(target.saysQueue).eql([]);
		});

		it('sends whisper to client and target if target is ignoring whispers but is friend of client', () => {
			const client = mockClient();
			const target = mockClient();
			target.accountSettings.ignoreNonFriendWhispers = true;
			client.friends.add(target.accountId);

			sayWhisper(client, 'hey there', 'hey there', MessageType.Whisper, target, {});

			expect(client.saysQueue).eql([[target.pony.id, 'hey there', MessageType.WhisperTo]]);
			expect(target.saysQueue).eql([[client.pony.id, 'hey there', MessageType.Whisper]]);
		});
	});

	describe('sayToEveryone()', () => {
		it('sends message to all clients', () => {
			const client = mockClient();
			const client2 = mockClient();
			const entity = client.pony;
			entity.region = createServerRegion(0, 0);
			entity.region.clients.push(client, client2);

			sayToEveryone(client, 'test', 'test2', MessageType.Chat, {});

			expect(client.saysQueue).eql([[entity.id, 'test', MessageType.Chat]]);
			expect(client2.saysQueue).eql([[entity.id, 'test', MessageType.Chat]]);
		});

		it('sends message only to client if muted or shadowed', () => {
			const client = mockClient();
			const client2 = mockClient();
			client.shadowed = true;
			const entity = client.pony;
			entity.region = createServerRegion(0, 0);
			entity.region.clients.push(client, client2);

			sayToEveryone(client, 'test', 'test', MessageType.Chat, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Chat]]);
			expect(client2.saysQueue).eql([]);
		});

		it('does nothing if message is empty', () => {
			const client = mockClient();

			sayToEveryone(client, '', '', MessageType.Chat, {});

			expect(client.saysQueue).eql([]);
		});
	});

	describe('sayToOthers()', () => {
		it('sends message to party if party message', () => {
			const client = mockClient();
			client.party = { id: '', leader: client, clients: [client], pending: [] };

			sayToOthers(client, 'test', MessageType.Party, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Party]]);
		});

		it('sends message to everyone if not party message', () => {
			const client = mockClient();
			client.pony.region = createServerRegion(0, 0);
			client.pony.region.clients.push(client);

			sayToOthers(client, 'test', MessageType.Chat, undefined, {});

			expect(client.saysQueue).eql([[client.pony.id, 'test', MessageType.Chat]]);
		});
	});
});
