import '../lib';
import { expect } from 'chai';
import { assert, stub, SinonStub } from 'sinon';
import { mockClient } from '../mocks';
import { ChatType, MessageType, Action, ExpressionExtra, Eye, Muzzle } from '../../common/interfaces';
import { IClient } from '../../server/serverInterfaces';
import { UserError } from '../../server/userError';
import {
	getChatPrefix, parseCommand, createRunCommand, CommandContext, Command, createCommands, RunCommand
} from '../../server/commands';
import { parseExpression, expression } from '../../common/expressionUtils';
import { encodeExpression } from '../../common/encoders/expressionEncoder';
import { createServerMap } from '../../server/serverMap';
import * as playerUtils from '../../server/playerUtils';

describe('commands', () => {
	describe('parseCommand()', () => {
		it('returns text and type for regular text', () => {
			expect(parseCommand('hello', ChatType.Say)).eql({ args: 'hello', type: ChatType.Say });
		});

		it('returns party chat type for /p command', () => {
			expect(parseCommand('/p hello', ChatType.Say)).eql({ args: 'hello', type: ChatType.Party });
		});

		it('returns supporter chat type for /ss command', () => {
			expect(parseCommand('/ss hello', ChatType.Say)).eql({ args: 'hello', type: ChatType.Supporter });
		});

		it('returns supporter 1 chat type for /s1 command', () => {
			expect(parseCommand('/s1 hello', ChatType.Say)).eql({ args: 'hello', type: ChatType.Supporter1 });
		});

		it('returns supporter 2 chat type for /s2 command', () => {
			expect(parseCommand('/s2 hello', ChatType.Say)).eql({ args: 'hello', type: ChatType.Supporter2 });
		});

		it('returns supporter 3 chat type for /s3 command', () => {
			expect(parseCommand('/s3 hello', ChatType.Say)).eql({ args: 'hello', type: ChatType.Supporter3 });
		});

		it('returns say chat type for /s command', () => {
			expect(parseCommand('/s hello', ChatType.Party)).eql({ args: 'hello', type: ChatType.Say });
		});

		it('returns think chat type for /t command', () => {
			expect(parseCommand('/t hello', ChatType.Say)).eql({ args: 'hello', type: ChatType.Think });
		});

		it('returns think chat type for /T command', () => {
			expect(parseCommand('/T hello', ChatType.Say)).eql({ args: 'hello', type: ChatType.Think });
		});

		it('returns party think chat type for /t command in party chat', () => {
			expect(parseCommand('/t hello', ChatType.Party)).eql({ args: 'hello', type: ChatType.PartyThink });
		});

		it('returns correct command', () => {
			expect(parseCommand('/test hello', ChatType.Say)).eql({ command: 'test', args: 'hello', type: ChatType.Say });
		});

		it('returns correct command with no arguments', () => {
			expect(parseCommand('/test', ChatType.Say)).eql({ command: 'test', args: '', type: ChatType.Say });
		});

		it('keeps the same chat type for commands', () => {
			expect(parseCommand('/test', ChatType.Party)).eql({ command: 'test', args: '', type: ChatType.Party });
		});

		it('trims args', () => {
			expect(parseCommand('/test  foo bar  ', ChatType.Say)).eql({ command: 'test', args: 'foo bar', type: ChatType.Say });
		});

		it('returns command name lowercased', () => {
			expect(parseCommand('/Te&$St foo', ChatType.Say)).eql({ command: 'Te&$St', args: 'foo', type: ChatType.Say });
		});
	});

	describe('getChatPrefix()', () => {
		it('returns empty string for regular chat', () => {
			expect(getChatPrefix(ChatType.Say)).equal('');
		});

		it('returns "/p " for party chat', () => {
			expect(getChatPrefix(ChatType.Party)).equal('/p ');
		});

		it('returns "/p " for party thinking', () => {
			expect(getChatPrefix(ChatType.PartyThink)).equal('/p ');
		});

		it('returns "" for thinking', () => {
			expect(getChatPrefix(ChatType.Think)).equal('');
		});

		it('returns "/ss " for supporter chat', () => {
			expect(getChatPrefix(ChatType.Supporter)).equal('/ss ');
		});

		it('returns "" for supporter 1 chat', () => {
			expect(getChatPrefix(ChatType.Supporter1)).equal('');
		});

		it('returns "" for supporter 2 chat', () => {
			expect(getChatPrefix(ChatType.Supporter2)).equal('');
		});

		it('returns "" for supporter 3 chat', () => {
			expect(getChatPrefix(ChatType.Supporter3)).equal('');
		});
	});

	describe('runCommand()', () => {
		let client: IClient;
		let context: CommandContext;
		let command: Command;
		let runCommand: RunCommand;
		let handler: SinonStub;

		beforeEach(() => {
			handler = stub();
			command = { names: ['test'], handler, help: '', role: '' };
			client = mockClient();
			context = {
				liveSettings: {} as any,
				world: { sayTo() { } } as any,
				notifications: {} as any,
				party: {} as any,
				random: () => 0,
			};
			runCommand = createRunCommand(context, [command]);
		});

		it('runs given command', () => {
			runCommand(client, 'test', 'args', ChatType.Say, undefined, {});

			assert.calledWith(handler, context, client, 'args', ChatType.Say);
		});

		it('returns true if run command', () => {
			expect(runCommand(client, 'test', '', ChatType.Say, undefined, {})).true;
		});

		it('returns true if command does not exist', () => {
			expect(runCommand(client, 'foo', '', ChatType.Say, undefined, {})).false;
		});

		it('should not run command if client is missing required role', () => {
			command.role = 'admin';

			expect(runCommand(client, 'test', '', ChatType.Say, undefined, {})).false;
		});

		it('should run command if client has required role', () => {
			client.account.roles = ['admin'];
			command.role = 'admin';

			expect(runCommand(client, 'test', '', ChatType.Say, undefined, {})).true;
		});

		it('sends user error to user', () => {
			handler.throws(new UserError('test error'));

			runCommand(client, 'test', '', ChatType.Say, undefined, {});

			expect(client.saysQueue).eql([
				[client.pony.id, 'test error', MessageType.System],
			]);
		});

		it('rethrows non-user error', () => {
			expect(() => {
				handler.throws(new Error('test error'));
				runCommand(client, 'test', '', ChatType.Say, undefined, {});
			}).throw('test error');
		});

		it('should find correct command case-insensitive', () => {
			expect(runCommand(client, 'TeSt', '', ChatType.Say, undefined, {})).true;
		});
	});

	describe('individual commands', () => {
		let client: IClient;
		let context: CommandContext;
		let runCommand: RunCommand;
		let execAction: SinonStub;

		beforeEach(() => {
			execAction = stub(playerUtils, 'execAction');
			client = mockClient();
			client.map = createServerMap('', 0, 3, 3);
			client.pony.region = client.map.regions[0];
			client.pony.region.clients.push(client);
			client.account.roles = ['mod', 'admin'];
			client.isMod = true;
			context = {
				liveSettings: {} as any,
				world: {
					featureFlags: { flying: true, swap: true, friends: true },
					getSettings: () => ({}),
					action() { },
					unholdItem() { },
					sayTo() { },
					sayToOthers() { },
					sayToEveryone() { },
					setTime() { },
					resetToSpawn() { },
					kick() { },
					fixPosition() { },
				} as any,
				notifications: {} as any,
				party: {} as any,
				random: () => 0,
			};
			const commands = createCommands(context.world);
			runCommand = createRunCommand(context, commands);
		});

		afterEach(() => {
			execAction.restore();
		});

		describe('/help', () => {
			it('prints commands help', () => {
				runCommand(client, 'help', '', ChatType.Say, undefined, {});

				expect(client.saysQueue.length).equal(1);
				expect(client.saysQueue[0][0]).equal(client.pony.id);
				expect(client.saysQueue[0][2]).equal(MessageType.System);
			});
		});

		describe('/roll', () => {
			it('rolls random number from 1 to 100 without args', () => {
				stub(context, 'random').withArgs(1, 100).returns(12);

				runCommand(client, 'roll', '', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, '🎲 rolled 12 of 100', MessageType.Announcement]]);
			});

			it('rolls random number from 1 to given number', () => {
				stub(context, 'random').withArgs(1, 50).returns(12);

				runCommand(client, 'roll', '50', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, '🎲 rolled 12 of 50', MessageType.Announcement]]);
			});

			it('rolls random number between given numbers', () => {
				stub(context, 'random').withArgs(50, 200).returns(123);

				runCommand(client, 'roll', '50-200', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, '🎲 rolled 123 of 50-200', MessageType.Announcement]]);
			});

			it('clamps minimum and maximum', () => {
				stub(context, 'random').withArgs(1000000, 1000000).returns(1000000);

				runCommand(client, 'roll', '999999999-999999999', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, '🎲 rolled 1000000 of 1000000-1000000', MessageType.Announcement]]);
			});

			it(`uses default behaviour if args don't match pattern`, () => {
				stub(context, 'random').withArgs(1, 100).returns(50);

				runCommand(client, 'roll', 'foo bar', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, '🎲 rolled 50 of 100', MessageType.Announcement]]);
			});

			it('rolls apple', () => {
				runCommand(client, 'roll', '🍎', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, '🎲 rolled 🍎 of 100', MessageType.Announcement]]);
			});
		});

		describe('/e', () => {
			it('updates permanent expression', () => {
				runCommand(client, 'e', '>:|', ChatType.Say, undefined, {});

				expect(client.pony.exprPermanent).eql(parseExpression('>:|'));
			});

			it('resets existing expression', () => {
				runCommand(client, 'e', '>:|', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression(parseExpression('>:|')));
			});
		});

		describe('/boop /)', () => {
			it('invokes action', () => {
				runCommand(client, 'boop', '', ChatType.Say, undefined, {});

				assert.calledWith(execAction, client, Action.Boop);
			});

			it('sets expression', () => {
				runCommand(client, 'boop', '>:|', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression(parseExpression('>:|')));
			});
		});

		describe('/drop', () => {
			it('invokes action', () => {
				runCommand(client, 'drop', '', ChatType.Say, undefined, {});

				assert.calledWith(execAction, client, Action.Drop);
			});
		});

		describe('/turn', () => {
			it('invokes action', () => {
				runCommand(client, 'turn', '', ChatType.Say, undefined, {});

				assert.calledWith(execAction, client, Action.TurnHead);
			});
		});

		describe('/blush', () => {
			it('sets expression with blush', () => {
				runCommand(client, 'blush', '>:|', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression({
					...parseExpression('>:|'),
					extra: ExpressionExtra.Blush,
				} as any));
			});

			it('uses current expression if available', () => {
				client.pony.options = { expr: encodeExpression(parseExpression(':(')) };

				runCommand(client, 'blush', '', ChatType.Say, undefined, {});

				expect(client.pony.options.expr).equal(encodeExpression({
					...parseExpression(':('),
					extra: ExpressionExtra.Blush,
				} as any));
			});

			it('uses default expression if not provided', () => {
				runCommand(client, 'blush', '', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression({
					...expression(Eye.Neutral, Eye.Neutral, Muzzle.Neutral),
					extra: ExpressionExtra.Blush,
				}));
			});

			it('passes cancellable flag', () => {
				client.pony.exprCancellable = true;

				runCommand(client, 'blush', '', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression({
					...expression(Eye.Neutral, Eye.Neutral, Muzzle.Neutral),
					extra: ExpressionExtra.Blush,
				}));
			});
		});

		describe('/gifts', () => {
			it('announces collected gifts count', () => {
				client.account.state = { gifts: 5 };

				runCommand(client, 'gifts', '', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'collected 5 🎁', MessageType.Announcement]]);
			});

			it('announces 0 collected gifts if missing gifts entry', () => {
				runCommand(client, 'gifts', '', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'collected 0 🎁', MessageType.Announcement]]);
			});
		});

		describe('/candies', () => {
			it('announces collected candies count', () => {
				client.account.state = { candies: 5 };

				runCommand(client, 'candies', '', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'collected 5 🍬', MessageType.Announcement]]);
			});

			it('announces 0 collected candies if missing candies entry', () => {
				runCommand(client, 'candies', '', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'collected 0 🍬', MessageType.Announcement]]);
			});
		});

		describe('/clovers', () => {
			it('announces collected clovers count', () => {
				client.account.state = { clovers: 5 };

				runCommand(client, 'clovers', '', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'collected 5 🍀', MessageType.Announcement]]);
			});

			it('announces 0 collected clovers if missing clovers entry', () => {
				runCommand(client, 'clovers', '', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'collected 0 🍀', MessageType.Announcement]]);
			});
		});

		describe('/unstuck', () => {
			it('resets client to spawn', () => {
				const resetToSpawn = stub(context.world, 'resetToSpawn');

				runCommand(client, 'unstuck', '', ChatType.Say, undefined, {});

				assert.calledWith(resetToSpawn, client);
			});

			it('kicks client', () => {
				const kick = stub(context.world, 'kick');

				runCommand(client, 'unstuck', '', ChatType.Say, undefined, {});

				assert.calledWith(kick, client);
			});
		});

		describe('/sleep', () => {
			it('sets expression with sleeping', () => {
				runCommand(client, 'sleep', '>:|', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression({
					...parseExpression('>:|'),
					left: Eye.Closed,
					right: Eye.Closed,
					extra: ExpressionExtra.Zzz,
				} as any));
			});

			it('uses current expression if available', () => {
				client.pony.options = { expr: encodeExpression(parseExpression(':(')) };

				runCommand(client, 'sleep', '', ChatType.Say, undefined, {});

				expect(client.pony.options.expr).equal(encodeExpression({
					...parseExpression(':('),
					left: Eye.Closed,
					right: Eye.Closed,
					extra: ExpressionExtra.Zzz,
				} as any));
			});

			it('uses default expression if not provided', () => {
				runCommand(client, 'sleep', '', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression({
					...expression(Eye.Closed, Eye.Closed, Muzzle.Neutral),
					extra: ExpressionExtra.Zzz,
				}));
			});

			it('closes mouth', () => {
				runCommand(client, 'sleep', ':D', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression({
					...expression(Eye.Closed, Eye.Closed, Muzzle.Neutral),
					extra: ExpressionExtra.Zzz,
				}));
			});

			it('does nothing if moving', () => {
				client.pony.vx = 1;
				client.pony.options!.expr = 123;

				runCommand(client, 'sleep', '', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(123);
			});
		});

		describe('/cry', () => {
			it('sets expression with tears', () => {
				runCommand(client, 'cry', '>:|', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression({
					...parseExpression('>:|'),
					extra: ExpressionExtra.Cry,
				} as any));
			});

			it('uses default expression if not provided', () => {
				runCommand(client, 'cry', '', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression({
					...expression(Eye.Sad, Eye.Sad, Muzzle.Frown),
					extra: ExpressionExtra.Cry,
				} as any));
			});
		});

		describe('/smile', () => {
			it('sets expression', () => {
				runCommand(client, 'smile', '', ChatType.Say, undefined, {});

				expect(client.pony.options!.expr).equal(encodeExpression(parseExpression(':)')));
			});
		});

		describe('/yawn', () => {
			it('invokes action', () => {
				runCommand(client, 'yawn', '', ChatType.Say, undefined, {});

				assert.calledWith(execAction, client, Action.Yawn);
			});
		});

		describe('/m', () => {
			it('send mod message', () => {
				runCommand(client, 'm', 'message', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'message', MessageType.Mod]]);
			});
		});

		describe('/a', () => {
			it('send admin message', () => {
				runCommand(client, 'a', 'message', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([[client.pony.id, 'message', MessageType.Admin]]);
			});
		});

		describe('/time', () => {
			it('sets world time', () => {
				const setTime = stub(context.world, 'setTime');

				runCommand(client, 'time', '12', ChatType.Say, undefined, {});

				assert.calledWith(setTime, 12);
			});

			it('does modulo 24 on hour', () => {
				const setTime = stub(context.world, 'setTime');

				runCommand(client, 'time', '26', ChatType.Say, undefined, {});

				assert.calledWith(setTime, 2);
			});

			it('prints error if args are invalid', () => {
				runCommand(client, 'time', 'foo', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([
					[client.pony.id, 'invalid parameter', MessageType.System],
				]);
			});
		});

		describe('/tp', () => {
			it('fixes location of player', () => {
				const fixPosition = stub(client, 'fixPosition');

				runCommand(client, 'tp', '10 20', ChatType.Say, undefined, {});

				assert.calledWith(fixPosition, 10, 20, true);
				expect(client.pony.x).equal(10);
				expect(client.pony.y).equal(20);
			});

			it('updates safe position', () => {
				client.pony.x = 10;
				client.pony.y = 20;

				runCommand(client, 'tp', '10 20', ChatType.Say, undefined, {});

				expect(client.safeX).equal(10);
				expect(client.safeY).equal(20);
			});

			it('resets lastTime to zero', () => {
				runCommand(client, 'tp', '10 20', ChatType.Say, undefined, {});

				expect(client.lastTime).equal(0);
			});

			it('throws on invalid parameters', () => {
				runCommand(client, 'tp', '10', ChatType.Say, undefined, {});

				expect(client.saysQueue).eql([
					[client.pony.id, 'invalid parameters', MessageType.System],
				]);
			});
		});

		const placeholderCommands = [
			's', 'say', 'p', 'party', 't', 'think', 'ss', 's1', 's2', 's3', 'sit', 'stand', 'lie', 'lay', 'fly',
			'w', 'whisper', 'r', 'reply',
		];

		placeholderCommands.forEach(command => {
			describe(`/${command}`, () => {
				it('throws', () => {
					expect(() => runCommand(client, command, 'foo bar', ChatType.Say, undefined, {}))
						.throw('Should not be called');
				});
			});
		});
	});
});
