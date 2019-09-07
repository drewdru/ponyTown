"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const world_1 = require("../../server/world");
const serverMap_1 = require("../../server/serverMap");
const mocks_1 = require("../mocks");
const expressionUtils_1 = require("../../common/expressionUtils");
const chat_1 = require("../../server/chat");
const expressionEncoder_1 = require("../../common/encoders/expressionEncoder");
const positionUtils_1 = require("../../common/positionUtils");
const serverRegion_1 = require("../../server/serverRegion");
const playerUtils = require("../../server/playerUtils");
describe('chat', () => {
    describe('say()', () => {
        let client;
        let region;
        let world;
        let runCommand;
        let log;
        let say;
        let checkSpam;
        let reportSwears;
        let reportForbidden;
        let reportSuspicious;
        let isSuspiciousMessage;
        let execAction;
        beforeEach(() => {
            execAction = sinon_1.stub(playerUtils, 'execAction');
            region = serverRegion_1.createServerRegion(1, 1);
            client = mocks_1.mockClient();
            client.pony.region = region;
            region.clients.push(client);
            world = mocks_1.mock(world_1.World);
            const map = serverMap_1.createServerMap('', 0, 1, 1);
            sinon_1.stub(world, 'getMainMap').returns(map);
            runCommand = sinon_1.stub();
            log = sinon_1.stub();
            checkSpam = sinon_1.stub();
            reportSwears = sinon_1.stub();
            reportForbidden = sinon_1.stub();
            reportSuspicious = sinon_1.stub();
            isSuspiciousMessage = sinon_1.stub();
            const spamCommands = ['roll'];
            say = chat_1.createSay(world, runCommand, log, checkSpam, reportSwears, reportForbidden, reportSuspicious, spamCommands, () => 0, isSuspiciousMessage);
        });
        afterEach(() => {
            execAction.restore();
        });
        it('does nothing if whispering to self', () => {
            say(client, 'hey me', 9 /* Whisper */, client, {});
            sinon_1.assert.notCalled(log);
        });
        it('sends back error message if whispering to missing client', () => {
            say(client, 'hey no one', 9 /* Whisper */, undefined, {});
            sinon_1.assert.calledOnce(log);
            chai_1.expect(client.saysQueue).eql([[client.pony.id, `Couldn't find this player`, 1 /* System */]]);
        });
        it('runs commands for whispers', () => {
            runCommand.returns(true);
            const target = mocks_1.mockClient();
            say(client, '/gifts', 9 /* Whisper */, target, {});
            sinon_1.assert.calledOnce(log);
            sinon_1.assert.calledWith(runCommand, client, 'gifts', '', 9 /* Whisper */, target, {});
        });
        it('sends back error message if whispering to non-friend when having non-friend whispers disabled', () => {
            client.accountSettings.ignoreNonFriendWhispers = true;
            say(client, 'hey you', 9 /* Whisper */, mocks_1.mockClient(), {});
            sinon_1.assert.calledOnce(log);
            chai_1.expect(client.saysQueue).eql([
                [client.pony.id, 'You can only whisper to friends', 1 /* System */],
            ]);
        });
        it('sends whisper to target', () => {
            const target = mocks_1.mockClient();
            say(client, 'hey you', 9 /* Whisper */, target, {});
            sinon_1.assert.calledOnce(log);
            chai_1.expect(target.saysQueue).eql([[client.pony.id, 'hey you', 13 /* Whisper */]]);
        });
        it('does not send whisper to target if shadowed', () => {
            const target = mocks_1.mockClient();
            client.shadowed = true;
            say(client, 'hey you', 9 /* Whisper */, target, {});
            sinon_1.assert.calledOnce(log);
            chai_1.expect(client.saysQueue).eql([[target.pony.id, 'hey you', 14 /* WhisperTo */]]);
            chai_1.expect(target.saysQueue).eql([]);
        });
        it('does not send whisper to target if muted', () => {
            const target = mocks_1.mockClient();
            client.account.mute = Date.now() + 10000;
            say(client, 'hey you', 9 /* Whisper */, target, {});
            sinon_1.assert.calledOnce(log);
            chai_1.expect(client.saysQueue).eql([[target.pony.id, 'hey you', 14 /* WhisperTo */]]);
            chai_1.expect(target.saysQueue).eql([]);
        });
        it('does not send whisper to target if target is shadowed', () => {
            const target = mocks_1.mockClient();
            target.shadowed = true;
            say(client, 'hey you', 9 /* Whisper */, target, {});
            sinon_1.assert.calledOnce(log);
            chai_1.expect(client.saysQueue).eql([[client.pony.id, `Couldn't find this player`, 1 /* System */]]);
            chai_1.expect(target.saysQueue).eql([]);
        });
        it('does not send whisper to target if target is hidden', () => {
            const target = mocks_1.mockClient();
            target.hides.add(client.accountId);
            say(client, 'hey you', 9 /* Whisper */, target, {});
            sinon_1.assert.calledOnce(log);
            chai_1.expect(client.saysQueue).eql([[client.pony.id, `Couldn't find this player`, 1 /* System */]]);
            chai_1.expect(target.saysQueue).eql([]);
        });
        it('does not check for spam if whispering to friend', () => {
            const target = mocks_1.mockClient();
            client.friends.add(target.accountId);
            say(client, 'hey you', 9 /* Whisper */, target, {});
            sinon_1.assert.notCalled(checkSpam);
        });
        it('logs chat message', () => {
            say(client, 'hey there', 0 /* Say */, undefined, {});
            sinon_1.assert.calledWith(log, client, 'hey there', 0 /* Say */, false);
        });
        it('logs party chat message', () => {
            say(client, 'hey there', 1 /* Party */, undefined, {});
            sinon_1.assert.calledWith(log, client, 'hey there', 1 /* Party */, false);
        });
        it('trims text', () => {
            say(client, ' test ', 0 /* Say */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 0 /* Chat */]]);
        });
        it('sends say to everyone in the world', () => {
            say(client, 'test', 0 /* Say */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 0 /* Chat */]]);
        });
        it('sends say for say command in party chat', () => {
            say(client, '/s test', 1 /* Party */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 0 /* Chat */]]);
        });
        it('sends say for invalid type', () => {
            say(client, 'test', 100, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 0 /* Chat */]]);
        });
        it('sends think message to everyone', () => {
            say(client, 'test', 2 /* Think */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 5 /* Thinking */]]);
        });
        it('sends think message to everyone', () => {
            say(client, '/t test', 0 /* Say */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 5 /* Thinking */]]);
        });
        it('ignores empty say command', () => {
            say(client, '/s ', 0 /* Say */, undefined, {});
            chai_1.expect(client.saysQueue).eql([]);
        });
        it(`reports suspicious message`, () => {
            isSuspiciousMessage.withArgs('foo bar').returns(true);
            say(client, 'foo bar', 0 /* Say */, undefined, {});
            sinon_1.assert.calledWith(reportSuspicious, client, 'foo bar');
        });
        it(`reports suspicious party message with prefix`, () => {
            isSuspiciousMessage.withArgs('foo bar').returns(true);
            say(client, 'foo bar', 1 /* Party */, undefined, {});
            sinon_1.assert.calledWith(reportSuspicious, client, '/p foo bar');
        });
        describe('in a party', () => {
            beforeEach(() => {
                client.party = { id: '', leader: client, clients: [client], pending: [] };
            });
            it('sends party message for party type', () => {
                say(client, 'test', 1 /* Party */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 4 /* Party */]]);
            });
            it('sends party message for party command', () => {
                say(client, '/p test', 0 /* Say */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 4 /* Party */]]);
            });
            it('ignores empty party command', () => {
                say(client, '/p ', 0 /* Say */, undefined, {});
                chai_1.expect(client.saysQueue).eql([]);
            });
            it('sends party think message to party if in party chat', () => {
                say(client, '/t test', 1 /* Party */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 6 /* PartyThinking */]]);
            });
        });
        it('does not set expression in party think command', () => {
            client.pony.options.expr = 123;
            say(client, '/t :)', 1 /* Party */, undefined, {});
            chai_1.expect(client.pony.options.expr).equal(123);
        });
        it('runs command if text is command', () => {
            runCommand.returns(true);
            say(client, '/test arg', 0 /* Say */, undefined, {});
            sinon_1.assert.calledWith(runCommand, client, 'test', 'arg');
        });
        it('notifies of invalid command', () => {
            runCommand.returns(false);
            say(client, '/test arg', 0 /* Say */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'Invalid command', 1 /* System */]]);
        });
        it('sets expression', () => {
            say(client, 'hi :)', 0 /* Say */, undefined, {});
            chai_1.expect(client.pony.options.expr).equal(expressionEncoder_1.encodeExpression(expressionUtils_1.parseExpression(':)')));
        });
        it('sets invisible expression', () => {
            runCommand.returns(false);
            say(client, '/:)', 0 /* Say */, undefined, {});
            chai_1.expect(client.pony.options.expr).equal(expressionEncoder_1.encodeExpression(expressionUtils_1.parseExpression(':)')));
            chai_1.expect(client.saysQueue).eql([]);
        });
        it('sets invisible expression (with space)', () => {
            runCommand.returns(false);
            say(client, '/ :)', 0 /* Say */, undefined, {});
            chai_1.expect(client.pony.options.expr).equal(expressionEncoder_1.encodeExpression(expressionUtils_1.parseExpression(':)')));
            chai_1.expect(client.saysQueue).eql([]);
        });
        it('does not set expression in think command', () => {
            client.pony.options.expr = 123;
            say(client, '/t :)', 0 /* Say */, undefined, {});
            chai_1.expect(client.pony.options.expr).equal(123);
        });
        it('calls laugh action', () => {
            say(client, 'haha', 0 /* Say */, undefined, {});
            sinon_1.assert.calledWith(execAction, client, 4 /* Laugh */);
        });
        it('checks for spam', () => {
            const settings = {};
            say(client, 'test', 0 /* Say */, undefined, settings);
            sinon_1.assert.calledWith(checkSpam, client, 'test', settings);
        });
        it('does not check for spam in party chat', () => {
            say(client, 'test', 1 /* Party */, undefined, {});
            sinon_1.assert.notCalled(checkSpam);
        });
        it('does not trim repeated letters in party chat', () => {
            client.party = { id: '', leader: client, clients: [client], pending: [] };
            say(client, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 1 /* Party */, undefined, {});
            chai_1.expect(client.saysQueue).eql([
                [client.pony.id, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 4 /* Party */],
            ]);
        });
        it('trims repeated letters', () => {
            say(client, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 0 /* Say */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'AAAAAAAAAAAAAAAA…', 0 /* Chat */]]);
        });
        it('trims repeated emoji', () => {
            say(client, '🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸', 0 /* Say */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, '🌸🌸🌸🌸🌸🌸🌸🌸…', 0 /* Chat */]]);
        });
        describe('supporter', () => {
            it('sends supporter message', () => {
                client.supporterLevel = 1;
                say(client, 'hello', 4 /* Supporter */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 9 /* Supporter1 */]]);
            });
            it('sends supporter message of correct level (2)', () => {
                client.supporterLevel = 2;
                say(client, 'hello', 4 /* Supporter */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 10 /* Supporter2 */]]);
            });
            it('sends supporter message of correct level (3)', () => {
                client.supporterLevel = 3;
                say(client, 'hello', 4 /* Supporter */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 11 /* Supporter3 */]]);
            });
            it('sends supporter message as regular message for non-supporters', () => {
                say(client, 'hello', 4 /* Supporter */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 0 /* Chat */]]);
            });
            it('sends supporter 1 message', () => {
                client.supporterLevel = 3;
                say(client, 'hello', 5 /* Supporter1 */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 9 /* Supporter1 */]]);
            });
            it('sends supporter 2 message', () => {
                client.supporterLevel = 3;
                say(client, 'hello', 6 /* Supporter2 */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 10 /* Supporter2 */]]);
            });
            it('sends supporter 3 message', () => {
                client.supporterLevel = 3;
                say(client, 'hello', 7 /* Supporter3 */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 11 /* Supporter3 */]]);
            });
            it('sends chat message if supporter level is lower than message level', () => {
                client.supporterLevel = 2;
                say(client, 'hello', 7 /* Supporter3 */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 0 /* Chat */]]);
            });
            it('sends chat message if non-supporter sends supporter messsage', () => {
                say(client, 'hello', 4 /* Supporter */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hello', 0 /* Chat */]]);
            });
        });
        describe('urls', () => {
            it('removes url in regular chat', () => {
                say(client, 'hey www.google.com', 0 /* Say */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'hey [LINK]', 0 /* Chat */]]);
            });
            it('removes url in censored messages', () => {
                say(client, 'fuck www.google.com', 0 /* Say */, undefined, {});
                chai_1.expect(client.saysQueue).eql([[client.pony.id, 'fuck [LINK]', 0 /* Chat */]]);
            });
            it('does not remove url in party chat', () => {
                client.party = { id: '', leader: client, clients: [client], pending: [] };
                say(client, 'hey www.google.com', 1 /* Party */, undefined, {});
                chai_1.expect(client.saysQueue).eql([
                    [client.pony.id, 'hey www.google.com', 4 /* Party */],
                ]);
            });
            it('does not report url as swearing', () => {
                say(client, 'hey www.google.com', 0 /* Say */, undefined, { filterSwears: true });
                sinon_1.assert.notCalled(reportSwears);
            });
        });
        describe('commands', () => {
            it('checks for spam', () => {
                runCommand.returns(true);
                const settings = {};
                say(client, '/roll', 0 /* Say */, undefined, settings);
                sinon_1.assert.calledWith(checkSpam, client, '/roll', settings);
            });
            it('does not check for spam in party chat', () => {
                runCommand.returns(true);
                say(client, '/test', 1 /* Party */, undefined, {});
                sinon_1.assert.notCalled(checkSpam);
            });
            it('does not check for spam for /:)', () => {
                runCommand.returns(false);
                say(client, '/:)', 0 /* Say */, undefined, {});
                sinon_1.assert.notCalled(checkSpam);
            });
            it('does not check for spam for /e', () => {
                runCommand.returns(true);
                say(client, '/e :)', 0 /* Say */, undefined, {});
                sinon_1.assert.notCalled(checkSpam);
            });
        });
        describe('swear message', () => {
            it('does not report normal message', () => {
                say(client, 'test', 0 /* Say */, undefined, {});
                sinon_1.assert.notCalled(reportSwears);
            });
            it('does not report is filterSwears is false', () => {
                say(client, 'fuck', 0 /* Say */, undefined, { filterSwears: false });
                sinon_1.assert.notCalled(reportSwears);
            });
            it('reports', () => {
                const settings = { filterSwears: true };
                say(client, 'fuck', 0 /* Say */, undefined, settings);
                sinon_1.assert.calledWith(reportSwears, client, 'fuck', settings);
            });
        });
        describe('kicking', () => {
            let kick;
            beforeEach(() => {
                kick = sinon_1.stub(world, 'kick');
            });
            it('kicks player if messages contain swears and kickSwearing settings is true', () => {
                say(client, 'fuck', 0 /* Say */, undefined, { kickSwearing: true });
                sinon_1.assert.calledWith(kick, client, 'swearing', 1 /* Swearing */);
            });
            it('does not kick player if messages contain swears and kickSwearing setting is true but is party message', () => {
                say(client, 'fuck', 1 /* Party */, undefined, { kickSwearing: true });
                sinon_1.assert.notCalled(kick);
            });
            it('does not reset player to spawn if kickSwearingToSpawn setting is false', () => {
                const resetToSpawn = sinon_1.stub(world, 'resetToSpawn');
                say(client, 'fuck', 0 /* Say */, undefined, { kickSwearing: true, kickSwearingToSpawn: false });
                sinon_1.assert.notCalled(resetToSpawn);
            });
            it('resets player to spawn if kickSwearingToSpawn setting is true', () => {
                const resetToSpawn = sinon_1.stub(world, 'resetToSpawn');
                say(client, 'fuck', 0 /* Say */, undefined, { kickSwearing: true, kickSwearingToSpawn: true });
                sinon_1.assert.calledWith(resetToSpawn, client);
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
            chai_1.expect(chat_1.filterUrls(message)).equal(message);
        }));
        [
            ['1.1.1.1', '[LINK]'],
            ['192.168.0.255', '[LINK]'],
            ['hello 192.168.0.255 aaa', 'hello [LINK] aaa'],
            ['hello192.168.0.255aaa', 'hello[LINK]aaa'],
            ['192.168.0.255 aaa 192.168.0.255', '[LINK] aaa [LINK]'],
            ['ip:147.230.64.174', 'ip:[LINK]']
        ].forEach(([message, expected]) => it(`replaces ip addresses: "${message}"`, () => {
            chai_1.expect(chat_1.filterUrls(message)).equal(expected);
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
            chai_1.expect(chat_1.filterUrls(message)).equal(expected);
        }));
    });
    describe('sayToClient()', () => {
        let client;
        let settings;
        beforeEach(() => {
            client = mocks_1.mockClient();
            client.camera.w = positionUtils_1.toScreenX(10);
            client.camera.h = positionUtils_1.toScreenY(10);
            settings = {};
        });
        it('sends message to client', () => {
            chat_1.sayToClientTest(client, mocks_1.serverEntity(5), 'foo', 'foo', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([
                [5, 'foo', 0 /* Chat */],
            ]);
        });
        it('sends original message if filterSwearWords is false', () => {
            client.accountSettings = { filterSwearWords: false };
            chat_1.sayToClientTest(client, mocks_1.serverEntity(5), 'foo', 'bar', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([
                [5, 'foo', 0 /* Chat */],
            ]);
        });
        it('sends censored message if filterSwearWords is true', () => {
            client.accountSettings = { filterSwearWords: true };
            chat_1.sayToClientTest(client, mocks_1.serverEntity(5), 'foo', 'bar', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([
                [5, 'bar', 0 /* Chat */],
            ]);
        });
        it('sends censored message if filterSwears is true', () => {
            settings.filterSwears = true;
            chat_1.sayToClientTest(client, mocks_1.serverEntity(5), 'foo', '***', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([
                [5, '***', 0 /* Chat */],
            ]);
        });
        it('sends original message to self', () => {
            client.pony.id = 5;
            chat_1.sayToClientTest(client, client.pony, 'foo', 'foo', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([
                [5, 'foo', 0 /* Chat */],
            ]);
        });
        it('sends original message to self if filterSwearWords is true', () => {
            client.pony.id = 5;
            client.account.settings = { filterSwearWords: true };
            chat_1.sayToClientTest(client, client.pony, 'foo', 'bar', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([
                [5, 'foo', 0 /* Chat */],
            ]);
        });
        it('sends original message to self if filterSwears is true', () => {
            settings.filterSwears = true;
            client.pony.id = 5;
            chat_1.sayToClientTest(client, client.pony, 'foo', 'bar', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([
                [5, 'foo', 0 /* Chat */],
            ]);
        });
        it('sends cyrillic message to self if filterCyrillic setting is true', () => {
            client.accountSettings = { filterCyrillic: true };
            client.pony.id = 5;
            chat_1.sayToClientTest(client, client.pony, 'Здравствуй', 'Здравствуй', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([
                [5, 'Здравствуй', 0 /* Chat */],
            ]);
        });
        it('ignores messages if ignored', () => {
            const e = mocks_1.serverEntity(5);
            e.client = mocks_1.mockClient();
            e.client.ignores.add(client.accountId);
            chai_1.expect(chat_1.sayToClientTest(client, e, 'test', 'test', 0 /* Chat */, settings)).false;
            chai_1.expect(client.saysQueue).eql([]);
        });
        it('ignores messages if hidden', () => {
            const e = mocks_1.serverEntity(5);
            e.client = mocks_1.mockClient();
            client.hides.add(e.client.accountId);
            chai_1.expect(chat_1.sayToClientTest(client, e, 'test', 'test', 0 /* Chat */, settings)).false;
            chai_1.expect(client.saysQueue).eql([]);
        });
        it('ignores messages if swearing in whisper to non-friend', () => {
            const e = mocks_1.serverEntity(5);
            e.client = mocks_1.mockClient();
            settings.hideSwearing = true;
            chai_1.expect(chat_1.sayToClientTest(client, e, 'test', '****', 13 /* Whisper */, settings)).false;
            chai_1.expect(client.saysQueue).eql([]);
        });
        it('ignores messages if outside client camera', () => {
            const e = mocks_1.serverEntity(5, 10, 10);
            client.camera.x = positionUtils_1.toScreenX(20);
            client.camera.y = positionUtils_1.toScreenY(20);
            client.camera.w = positionUtils_1.toScreenX(10);
            client.camera.h = positionUtils_1.toScreenY(10);
            client.pony.x = 25;
            client.pony.y = 25;
            chat_1.sayToClientTest(client, e, 'test', 'test', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([]);
        });
        it('ignores messages if contain swears and hideSwearing setting is true', () => {
            settings.hideSwearing = true;
            chat_1.sayToClientTest(client, mocks_1.serverEntity(5), 'fuck', '****', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([]);
        });
        it('does not ignore messages if contain swears and hideSwearing setting is true but sending to self', () => {
            settings.hideSwearing = true;
            chat_1.sayToClientTest(client, client.pony, 'fuck', '****', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'fuck', 0 /* Chat */]]);
        });
        it('does not ignore messages if contain swears and hideSwearing setting is true but is party message', () => {
            settings.hideSwearing = true;
            chat_1.sayToClientTest(client, mocks_1.serverEntity(6), 'fuck', '****', 4 /* Party */, settings);
            chai_1.expect(client.saysQueue).eql([[6, 'fuck', 4 /* Party */]]);
        });
        it('sends party messages even if outside client camera', () => {
            const e = mocks_1.serverEntity(5, 1, 1);
            client.camera.x = positionUtils_1.toScreenX(20);
            client.camera.y = positionUtils_1.toScreenY(20);
            client.camera.w = positionUtils_1.toScreenX(10);
            client.camera.h = positionUtils_1.toScreenY(10);
            client.pony.x = 25;
            client.pony.y = 25;
            chat_1.sayToClientTest(client, e, 'test', 'test', 4 /* Party */, settings);
            chai_1.expect(client.saysQueue).eql([[5, 'test', 4 /* Party */]]);
        });
        it('sends messages if hidden but client is moderator', () => {
            const e = mocks_1.serverEntity(5);
            e.client = mocks_1.mockClient();
            client.isMod = true;
            client.hides.add(e.client.accountId);
            chat_1.sayToClientTest(client, e, 'test', 'test', 0 /* Chat */, settings);
            chai_1.expect(client.saysQueue).eql([[5, 'test', 0 /* Chat */]]);
        });
    });
    describe('sayTo()', () => {
        it('adds message to message queue', () => {
            const client = mocks_1.mockClient();
            chat_1.sayTo(client, mocks_1.entity(123), 'test', 0 /* Chat */);
            chai_1.expect(client.saysQueue).eql([[123, 'test', 0 /* Chat */]]);
        });
    });
    describe('sayToParty()', () => {
        it('sends message to all party members', () => {
            const client = mocks_1.mockClient();
            const client2 = mocks_1.mockClient();
            client.party = { clients: [client, client2] };
            chat_1.sayToPartyTest(client, 'test', 4 /* Party */);
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 4 /* Party */]]);
            chai_1.expect(client2.saysQueue).eql([[client.pony.id, 'test', 4 /* Party */]]);
        });
        it('sends message only to client if muted or shadowed', () => {
            const client = mocks_1.mockClient();
            const client2 = mocks_1.mockClient();
            client.shadowed = true;
            client.party = { clients: [client, client2] };
            chat_1.sayToPartyTest(client, 'test', 4 /* Party */);
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 4 /* Party */]]);
            chai_1.expect(client2.saysQueue).eql([]);
        });
        it('sends error message to client if not in party', () => {
            const client = mocks_1.mockClient();
            chat_1.sayToPartyTest(client, 'test', 4 /* Party */);
            chai_1.expect(client.saysQueue).eql([[client.pony.id, `you're not in a party`, 1 /* System */]]);
        });
    });
    describe('sayWhisper()', () => {
        it('sends whisper to client and target', () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            chat_1.sayWhisperTest(client, 'hey there', 'hey there', 13 /* Whisper */, target, {});
            chai_1.expect(client.saysQueue).eql([[target.pony.id, 'hey there', 14 /* WhisperTo */]]);
            chai_1.expect(target.saysQueue).eql([[client.pony.id, 'hey there', 13 /* Whisper */]]);
        });
        it('sends announcement whisper to client and target', () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            chat_1.sayWhisperTest(client, 'hey there', 'hey there', 15 /* WhisperAnnouncement */, target, {});
            chai_1.expect(client.saysQueue).eql([[target.pony.id, 'hey there', 16 /* WhisperToAnnouncement */]]);
            chai_1.expect(target.saysQueue).eql([[client.pony.id, 'hey there', 15 /* WhisperAnnouncement */]]);
        });
        it('sends error message to client if target is undefined', () => {
            const client = mocks_1.mockClient();
            chat_1.sayWhisperTest(client, 'hey there', 'hey there', 13 /* Whisper */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, `Couldn't find this player`, 1 /* System */]]);
        });
        it('sends error message to client if target is ignoring whispers', () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            target.accountSettings.ignoreNonFriendWhispers = true;
            chat_1.sayWhisperTest(client, 'hey there', 'hey there', 13 /* Whisper */, target, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, `Can't whisper to this player`, 1 /* System */]]);
            chai_1.expect(target.saysQueue).eql([]);
        });
        it('sends whisper to client and target if target is ignoring whispers but is friend of client', () => {
            const client = mocks_1.mockClient();
            const target = mocks_1.mockClient();
            target.accountSettings.ignoreNonFriendWhispers = true;
            client.friends.add(target.accountId);
            chat_1.sayWhisperTest(client, 'hey there', 'hey there', 13 /* Whisper */, target, {});
            chai_1.expect(client.saysQueue).eql([[target.pony.id, 'hey there', 14 /* WhisperTo */]]);
            chai_1.expect(target.saysQueue).eql([[client.pony.id, 'hey there', 13 /* Whisper */]]);
        });
    });
    describe('sayToEveryone()', () => {
        it('sends message to all clients', () => {
            const client = mocks_1.mockClient();
            const client2 = mocks_1.mockClient();
            const entity = client.pony;
            entity.region = serverRegion_1.createServerRegion(0, 0);
            entity.region.clients.push(client, client2);
            chat_1.sayToEveryone(client, 'test', 'test2', 0 /* Chat */, {});
            chai_1.expect(client.saysQueue).eql([[entity.id, 'test', 0 /* Chat */]]);
            chai_1.expect(client2.saysQueue).eql([[entity.id, 'test', 0 /* Chat */]]);
        });
        it('sends message only to client if muted or shadowed', () => {
            const client = mocks_1.mockClient();
            const client2 = mocks_1.mockClient();
            client.shadowed = true;
            const entity = client.pony;
            entity.region = serverRegion_1.createServerRegion(0, 0);
            entity.region.clients.push(client, client2);
            chat_1.sayToEveryone(client, 'test', 'test', 0 /* Chat */, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 0 /* Chat */]]);
            chai_1.expect(client2.saysQueue).eql([]);
        });
        it('does nothing if message is empty', () => {
            const client = mocks_1.mockClient();
            chat_1.sayToEveryone(client, '', '', 0 /* Chat */, {});
            chai_1.expect(client.saysQueue).eql([]);
        });
    });
    describe('sayToOthers()', () => {
        it('sends message to party if party message', () => {
            const client = mocks_1.mockClient();
            client.party = { id: '', leader: client, clients: [client], pending: [] };
            chat_1.sayToOthers(client, 'test', 4 /* Party */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 4 /* Party */]]);
        });
        it('sends message to everyone if not party message', () => {
            const client = mocks_1.mockClient();
            client.pony.region = serverRegion_1.createServerRegion(0, 0);
            client.pony.region.clients.push(client);
            chat_1.sayToOthers(client, 'test', 0 /* Chat */, undefined, {});
            chai_1.expect(client.saysQueue).eql([[client.pony.id, 'test', 0 /* Chat */]]);
        });
    });
});
//# sourceMappingURL=chat.spec.js.map