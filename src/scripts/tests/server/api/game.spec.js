"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../../lib");
const sinon_1 = require("sinon");
const chai_1 = require("chai");
const game_1 = require("../../../server/api/game");
const errors_1 = require("../../../common/errors");
const utils_1 = require("../../../common/utils");
const mocks_1 = require("../../mocks");
describe('api game', () => {
    describe('joinGame()', () => {
        let joinGame;
        let findCharacter;
        let join;
        let addOrigin;
        let hasInvites;
        let server;
        beforeEach(() => {
            findCharacter = sinon_1.stub();
            join = sinon_1.stub();
            addOrigin = sinon_1.stub();
            hasInvites = sinon_1.stub();
            server = { state: { settings: {} } };
            const findServer = sinon_1.stub();
            findServer.withArgs('serverid').returns(server);
            joinGame = game_1.createJoinGame(findServer, { version: '1', host: 'http://foo.bar/', debug: false, local: false }, findCharacter, join, addOrigin, hasInvites);
        });
        it('returns join token', async () => {
            const a = mocks_1.account({ _id: mocks_1.genObjectId() });
            const character = {};
            findCharacter.withArgs('charid').returns(character);
            join.withArgs(server, a, character).returns('tokenid');
            await chai_1.expect(joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, {}))
                .eventually.eql({ token: 'tokenid' });
        });
        it('resolves if meets server requirement', async () => {
            server.state.require = 'sup2';
            const a = mocks_1.account({ _id: mocks_1.genObjectId(), patreon: 2 /* Supporter2 */ });
            const character = {};
            findCharacter.withArgs('charid').returns(character);
            join.withArgs(server, a, character).returns('tokenid');
            await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, {});
        });
        it('resolves if meets server requirement (invited)', async () => {
            server.state.require = 'inv';
            const a = mocks_1.account({ _id: mocks_1.genObjectId() });
            const character = {};
            findCharacter.withArgs('charid').returns(character);
            hasInvites.resolves(true);
            join.withArgs(server, a, character).returns('tokenid');
            await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, {});
        });
        it('adds origin to account', async () => {
            const a = mocks_1.account({ _id: mocks_1.genObjectId() });
            const origin = {};
            findCharacter.withArgs('charid').returns({});
            await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, origin);
            sinon_1.assert.calledWith(addOrigin, a, origin);
        });
        it('returns alert if has account alert', async () => {
            const a = mocks_1.account({ _id: mocks_1.genObjectId(), alert: { message: 'test alert', expires: utils_1.fromNow(9999) } });
            const origin = {};
            findCharacter.withArgs('charid').returns({});
            const result = await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', false, origin);
            chai_1.expect(result).eql({ alert: 'test alert' });
        });
        it('does not returl alert if alredy has alert', async () => {
            const a = mocks_1.account({ _id: mocks_1.genObjectId(), alert: { message: 'test alert', expires: utils_1.fromNow(9999) } });
            const origin = {};
            const character = {};
            findCharacter.withArgs('charid').returns(character);
            join.withArgs(server, a, character).returns('tokenid');
            const result = await joinGame(a, 'charid', 'serverid', '1', 'http://foo.bar/', true, origin);
            chai_1.expect(result).eql({ token: 'tokenid' });
        });
        it('rejects if passed version is different than server version', async () => {
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid', 'serverid', '2', 'http://foo.bar/', false, {}))
                .rejectedWith(errors_1.VERSION_ERROR);
        });
        it('rejects if passed url is different than server url', async () => {
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid', 'serverid', '1', 'http://im.invalid/', false, {}))
                .rejectedWith('Invalid data');
        });
        it('rejects if server is not found', async () => {
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid', 'doesnotexist', '1', 'http://foo.bar/', false, {}))
                .rejectedWith('Invalid data');
        });
        it('rejects if server is offline', async () => {
            server.state.settings.isServerOffline = true;
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {}))
                .rejectedWith('Server is offline');
        });
        it('rejects if server is restricted', async () => {
            server.state.require = 'mod';
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {}))
                .rejectedWith('Server is restricted');
        });
        it('rejects if character ID is missing', async () => {
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), undefined, 'serverid', '1', 'http://foo.bar/', false, {}))
                .rejectedWith('Invalid data');
        });
        it('rejects if character ID is not string', async () => {
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), { foo: 'bar' }, 'serverid', '1', 'http://foo.bar/', false, {}))
                .rejectedWith('Invalid data');
        });
        it('rejects if character does not exist', async () => {
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {}))
                .rejectedWith('Character does not exist');
        });
        it('rejects if already joining', async () => {
            findCharacter.withArgs('charid').returns({});
            join.returns(new Promise(() => { }));
            const _id = mocks_1.genObjectId();
            joinGame(mocks_1.account({ _id }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {});
            await utils_1.delay(1);
            await chai_1.expect(joinGame(mocks_1.account({ _id }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {}))
                .rejectedWith('Already waiting for join request');
        });
        it('does not reject if other client is already joining', async () => {
            findCharacter.withArgs('charid').returns({});
            findCharacter.withArgs('charid2').returns({});
            join.returns(new Promise(() => { }));
            join.returns('tokenid');
            joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid2', 'serverid', '1', 'http://foo.bar/', false, {});
            await utils_1.delay(1);
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {}))
                .eventually.eql({ token: 'tokenid' });
        });
        it('rejects if joining is blocked', async () => {
            server.state.settings.blockJoining = true;
            findCharacter.withArgs('charid').returns({});
            await chai_1.expect(joinGame(mocks_1.account({ _id: mocks_1.genObjectId() }), 'charid', 'serverid', '1', 'http://foo.bar/', false, {}))
                .rejectedWith('Cannot join to the server');
        });
    });
});
//# sourceMappingURL=game.spec.js.map