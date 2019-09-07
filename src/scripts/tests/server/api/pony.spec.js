"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../../lib");
const sinon_1 = require("sinon");
const chai_1 = require("chai");
const mongoose_1 = require("mongoose");
const constants_1 = require("../../../common/constants");
const stringUtils_1 = require("../../../common/stringUtils");
const pony_1 = require("../../../server/api/pony");
const accountUtils_1 = require("../../../common/accountUtils");
const mocks_1 = require("../../mocks");
const info = constants_1.OFFLINE_PONY;
describe('api pony', () => {
    describe('savePony()', () => {
        let savePony;
        let findCharacter;
        let findAuth;
        let characterCount;
        let updateCharacterCount;
        let createCharacter;
        let log;
        let isSuspiciousName;
        let isSuspiciousPony;
        let clock;
        let reporter;
        beforeEach(() => {
            findCharacter = sinon_1.stub();
            findAuth = sinon_1.stub();
            characterCount = sinon_1.stub();
            updateCharacterCount = sinon_1.stub();
            createCharacter = sinon_1.stub();
            log = sinon_1.stub();
            isSuspiciousName = sinon_1.stub();
            isSuspiciousPony = sinon_1.stub();
            clock = sinon_1.useFakeTimers();
            reporter = {
                danger: sinon_1.stub(),
                setPony: sinon_1.stub(),
                warn: sinon_1.stub(),
            };
            savePony = pony_1.createSavePony(findCharacter, findAuth, characterCount, updateCharacterCount, createCharacter, log, isSuspiciousName, isSuspiciousPony);
        });
        afterEach(() => {
            clock.restore();
        });
        describe('for existing character', () => {
            const characterId = mocks_1.genId();
            const characterObjectId = mongoose_1.Types.ObjectId(characterId);
            let character;
            let account = { _id: 'accid' };
            beforeEach(() => {
                character = {
                    name: 'oldname',
                    _id: characterObjectId,
                    createdAt: new Date(10),
                    save() { return this; }
                };
                findCharacter.withArgs(characterId, 'accid').resolves(character);
            });
            it('returns pony object', async () => {
                clock.setSystemTime(123);
                await chai_1.expect(savePony(account, { id: characterId, name: 'foo', info }, reporter)).eventually.eql({
                    id: characterId,
                    info,
                    lastUsed: '1970-01-01T00:00:00.123Z',
                    name: 'foo',
                    desc: '',
                    site: undefined,
                    tag: undefined,
                    hideSupport: undefined,
                    respawnAtSpawn: undefined,
                });
            });
            it('saves character', async () => {
                const save = sinon_1.stub(character, 'save').resolves(character);
                await savePony(account, { id: characterId, name: 'foo', info }, reporter);
                sinon_1.assert.calledOnce(save);
            });
            it('updates character fields', async () => {
                clock.setSystemTime(123);
                await savePony(account, { id: characterId, name: 'foo', tag: 'tag', info }, reporter);
                chai_1.expect(character.name).equal('foo');
                chai_1.expect(character.tag).equal('tag');
                chai_1.expect(character.info).equal(info);
                chai_1.expect(character.lastUsed.toISOString()).equal((new Date()).toISOString());
            });
            it('does not reject if character limit is reached', async () => {
                characterCount.resolves(accountUtils_1.getCharacterLimit({ supporter: 0 }) * 2);
                await savePony(account, { id: characterId, name: 'foo', info }, reporter);
            });
            it('logs name change', async () => {
                await savePony(account, { id: characterId, name: 'foo', info }, reporter);
                sinon_1.assert.calledWith(log, account._id, 'renamed pony "oldname" => "foo"');
            });
            it('does not log if nothing changed', async () => {
                await savePony(account, { id: characterId, name: 'oldname', info }, reporter);
                sinon_1.assert.notCalled(log);
            });
            it('reports suspicious name', async () => {
                isSuspiciousName.withArgs('moderator').returns(true);
                await savePony(account, { id: characterId, name: 'moderator', info }, reporter);
                sinon_1.assert.calledWith(reporter.setPony, characterId);
                sinon_1.assert.calledWith(reporter.warn, 'Suspicious pony created', '"moderator" (name)');
            });
            it('does not report suspicious name if not changed', async () => {
                character.name = 'moderator';
                isSuspiciousName.withArgs('moderator').returns(true);
                await savePony(account, { id: characterId, name: 'moderator', info }, reporter);
            });
            it('reports suspicious look', async () => {
                isSuspiciousPony.returns(true);
                await savePony(account, { id: characterId, name: 'moderator', info }, reporter);
                sinon_1.assert.calledWith(reporter.setPony, characterId);
                sinon_1.assert.calledWith(reporter.warn, 'Suspicious pony created', '"moderator" (look)');
            });
            it('does not report suspicious look if not changed', async () => {
                character.info = info;
                isSuspiciousPony.returns(true);
                await savePony(account, { id: characterId, name: 'moderator', info }, reporter);
            });
            it('reports suspicious name & look', async () => {
                isSuspiciousName.withArgs('moderator').returns(true);
                isSuspiciousPony.returns(true);
                await savePony(account, { id: characterId, name: 'moderator', info }, reporter);
                sinon_1.assert.calledWith(reporter.setPony, characterId);
                sinon_1.assert.calledWith(reporter.warn, 'Suspicious pony created', '"moderator" (name, look)');
            });
            it('rejects on decoding error', async () => {
                await chai_1.expect(savePony(account, { id: characterId, name: 'foo', info: 'xxyf@hs' }, reporter))
                    .rejectedWith('Error saving character');
            });
            it('sets bad CM flag', async () => {
                const info = 'CASZlZXapSD/1wBAPTk2QAJkI0AT8ADAAxADhAYQHMMkhhMkkJhkkMA=';
                await savePony(account, { id: characterId, name: 'foo', info }, reporter);
                chai_1.expect(character.flags).equal(1 /* BadCM */);
            });
            it('sets hide support pony flag', async () => {
                await savePony(account, { id: characterId, name: 'foo', info, hideSupport: true }, reporter);
                chai_1.expect(character.flags).equal(4 /* HideSupport */);
            });
            it('sets respawn at spawn pony flag', async () => {
                await savePony(account, { id: characterId, name: 'foo', info, respawnAtSpawn: true }, reporter);
                chai_1.expect(character.flags).equal(8 /* RespawnAtSpawn */);
            });
            it('sets auth', async () => {
                const authid = {};
                findAuth.withArgs('authid', 'accid').resolves({ _id: authid });
                await savePony(account, { id: characterId, name: 'foo', site: 'authid', info }, reporter);
                chai_1.expect(character.site).equal(authid);
            });
            it('does not set auth if not found', async () => {
                await savePony(account, { id: characterId, name: 'foo', site: 'authid', info }, reporter);
                chai_1.expect(character.site).null;
            });
        });
        describe('for new character', () => {
            const characterId = mocks_1.genId();
            let acc = mocks_1.account({ _id: mocks_1.genObjectId() });
            let character;
            beforeEach(() => {
                character = {
                    _id: mongoose_1.Types.ObjectId(characterId),
                    save() { return this; }
                };
                createCharacter.withArgs(acc).returns(character);
            });
            it('returns pony object', async () => {
                clock.setSystemTime(123);
                await chai_1.expect(savePony(acc, { name: 'foo', info }, reporter)).eventually.eql({
                    id: characterId,
                    info,
                    lastUsed: '1970-01-01T00:00:00.123Z',
                    name: 'foo',
                    desc: '',
                    site: undefined,
                    tag: undefined,
                    hideSupport: undefined,
                    respawnAtSpawn: undefined,
                });
            });
            it('saves character', async () => {
                const save = sinon_1.stub(character, 'save').resolves(character);
                await savePony(acc, { name: 'foo', info }, reporter);
                sinon_1.assert.calledOnce(save);
            });
            it('sets character fields', async () => {
                clock.setSystemTime(123);
                await savePony(acc, { id: characterId, name: 'foo', tag: 'tag', info }, reporter);
                chai_1.expect(character.name).equal('foo');
                chai_1.expect(character.tag).equal('tag');
                chai_1.expect(character.info).equal(info);
                chai_1.expect(character.lastUsed.toISOString()).equal((new Date()).toISOString());
            });
            it('rejects if character limit is reached', async () => {
                characterCount.resolves(accountUtils_1.getCharacterLimit({ supporter: 0 }));
                await chai_1.expect(savePony(acc, { name: 'foo', info }, reporter))
                    .rejectedWith('Character limit reached');
            });
            it('logs character creation', async () => {
                sinon_1.stub(character, 'save').resolves({ name: 'foo', createdAt: new Date() });
                await savePony(acc, { name: 'foo', info }, reporter);
                sinon_1.assert.calledWith(log, acc._id, 'created pony "foo"');
            });
            describe('for supporters', () => {
                beforeEach(() => {
                    acc.patreon = 1 /* Supporter1 */;
                });
                it('has larger limit', async () => {
                    characterCount.resolves(accountUtils_1.getCharacterLimit({ supporter: 0 }));
                    const save = sinon_1.stub(character, 'save').resolves(character);
                    await savePony(acc, { name: 'foo', info }, reporter);
                    sinon_1.assert.calledOnce(save);
                });
                it('rejects if character limit is reached', async () => {
                    characterCount.resolves(accountUtils_1.getCharacterLimit({ supporter: 1 }));
                    await chai_1.expect(savePony(acc, { name: 'foo', info }, reporter)).rejectedWith('Character limit reached');
                });
            });
        });
        it('rejects on missing pony', async () => {
            await chai_1.expect(savePony({}, undefined, reporter)).rejectedWith('Invalid data');
        });
        it('rejects on missing pony name', async () => {
            await chai_1.expect(savePony({}, { info }, reporter)).rejectedWith('Invalid data');
        });
        it('rejects on non-string pony name', async () => {
            await chai_1.expect(savePony({}, { name: {}, info }, reporter)).rejectedWith('Invalid data');
        });
        it('rejects on missing pony info', async () => {
            await chai_1.expect(savePony({}, { name: 'foo' }, reporter)).rejectedWith('Invalid data');
        });
        it('rejects on too long pony name', async () => {
            await chai_1.expect(savePony({}, { name: stringUtils_1.randomString(constants_1.PLAYER_NAME_MAX_LENGTH + 1), info }, reporter))
                .rejectedWith('Invalid name');
        });
        it('rejects on database error', async () => {
            findCharacter.rejects(new Error('test'));
            await chai_1.expect(savePony({}, { id: 'charid', name: 'foo', info }, reporter)).rejectedWith('Invalid data');
        });
    });
    describe('removePony()', () => {
        let removePony;
        let kickFromAllServersByCharacter;
        let removeCharacter;
        let updateCharacterCount;
        let removedCharacter;
        let logRemovedCharacter;
        beforeEach(() => {
            kickFromAllServersByCharacter = sinon_1.stub();
            removeCharacter = sinon_1.stub();
            updateCharacterCount = sinon_1.stub();
            removedCharacter = sinon_1.stub();
            logRemovedCharacter = sinon_1.stub();
            removePony = pony_1.createRemovePony(kickFromAllServersByCharacter, removeCharacter, updateCharacterCount, removedCharacter, logRemovedCharacter);
        });
        it('kicks user from all servers', async () => {
            await removePony('ponid', 'accid');
            sinon_1.assert.calledWith(kickFromAllServersByCharacter, 'ponid');
        });
        it('removes character', async () => {
            await removePony('ponid', 'accid');
            sinon_1.assert.calledWith(removeCharacter, 'ponid', 'accid');
        });
        it('updates character count', async () => {
            await removePony('ponid', 'accid');
            sinon_1.assert.calledWith(updateCharacterCount, 'accid');
        });
        it('logs character removed', async () => {
            const character = { name: 'test', info: 'INFO' };
            removeCharacter.resolves(character);
            await removePony('ponid', 'accid');
            sinon_1.assert.calledWith(logRemovedCharacter, character);
        });
        it('notifies of character removal', async () => {
            removeCharacter.resolves({ name: 'test' });
            await removePony('ponid', 'accid');
            sinon_1.assert.calledWith(removedCharacter, 'ponid');
        });
        it('does not log character removal if character is not found', async () => {
            removeCharacter.resolves(undefined);
            await removePony('ponid', 'accid');
            sinon_1.assert.notCalled(logRemovedCharacter);
        });
        it('does not notify of character removal if character is not found', async () => {
            removeCharacter.resolves(undefined);
            await removePony('ponid', 'accid');
            sinon_1.assert.notCalled(removedCharacter);
        });
        it('rejects if pony ID is not a string', async () => {
            await chai_1.expect(removePony({}, 'accid')).rejectedWith('Invalid ponyId ([object Object])');
        });
        it('rejects if pony ID is empty', async () => {
            await chai_1.expect(removePony('', 'accid')).rejectedWith('Invalid ponyId ()');
        });
    });
});
//# sourceMappingURL=pony.spec.js.map