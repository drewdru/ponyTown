"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const router_1 = require("@angular/router");
const http_1 = require("@angular/common/http");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const rxjs_1 = require("rxjs");
const model_1 = require("../../components/services/model");
const errorReporter_1 = require("../../components/services/errorReporter");
const errors_1 = require("../../common/errors");
const storageService_1 = require("../../components/services/storageService");
describe.skip('Model', () => {
    let http = lib_1.stubClass(http_1.HttpClient);
    let router = lib_1.stubClass(router_1.Router);
    let storage = lib_1.stubClass(storageService_1.StorageService);
    let errorReporter = lib_1.stubClass(errorReporter_1.ErrorReporter);
    let model;
    beforeEach(async () => {
        lib_1.resetStubMethods(http, 'post', 'get');
        lib_1.resetStubMethods(router);
        lib_1.resetStubMethods(storage);
        lib_1.resetStubMethods(errorReporter);
        http.post.withArgs('/api1/account').returns(rxjs_1.from([{
                id: 'accid',
                name: 'accname',
                settings: {},
                friends: [],
            }]));
        model = new model_1.Model(http, router, storage, errorReporter);
        await model.accountPromise;
        global.location = { href: 'local-href' };
    });
    describe('supporter', () => {
        it('returns 0 if not supporter', () => {
            chai_1.expect(model.supporter).equal(0);
        });
        it('returns supporter level', () => {
            model.account.supporter = 2;
            chai_1.expect(model.supporter).equal(2);
        });
    });
    describe('signOut()', () => {
        it('makes sign out request', async () => {
            http.post.withArgs('/auth/sign-out').returns(rxjs_1.from([{}]));
            await model.signOut();
            await model.accountPromise;
            sinon_1.assert.calledWithMatch(http.post, '/auth/sign-out', {}, sinon_1.match.any);
        });
        it('re-fetches account details', async () => {
            http.post.reset();
            http.post.withArgs('/auth/sign-out').returns(rxjs_1.from([{}]));
            http.post.withArgs('/api1/account').returns(rxjs_1.from([null]));
            await model.signOut();
            await model.accountPromise;
            sinon_1.assert.calledWithMatch(http.post, '/api1/account', sinon_1.match.any, sinon_1.match.any);
        });
    });
    describe('updateAccount()', () => {
        it('makes update request', async () => {
            http.post.withArgs('/api/account-update').returns(rxjs_1.from([{ name: 'bar' }]));
            await model.updateAccount({ name: 'bar', birthdate: '' });
            sinon_1.assert.calledWithMatch(http.post, '/api/account-update', { account: { name: 'bar' } }, sinon_1.match.any);
        });
        it('updates account with returned result', async () => {
            http.post.withArgs('/api/account-update').returns(rxjs_1.from([{ name: 'bar' }]));
            await model.updateAccount({ name: 'bar', birthdate: '' });
            chai_1.expect(model.account.name).equal('bar');
        });
    });
    describe('saveSettings()', () => {
        it('makes save settings request', async () => {
            http.post.withArgs('/api/account-settings')
                .returns(rxjs_1.from([{ settings: { ignorePartyInvites: true } }]));
            await model.saveSettings({ ignorePartyInvites: true });
            sinon_1.assert.calledWithMatch(http.post, '/api/account-settings', { settings: { ignorePartyInvites: true } }, sinon_1.match.any);
        });
        it('updates settings with returned result', async () => {
            http.post.withArgs('/api/account-settings')
                .returns(rxjs_1.from([{ settings: { ignorePartyInvites: true } }]));
            await model.saveSettings({ ignorePartyInvites: true });
            chai_1.expect(model.account.settings.ignorePartyInvites).true;
        });
    });
    describe('removeSite()', () => {
        it('makes remove request', async () => {
            http.post.withArgs('/api/remove-site').returns(rxjs_1.from([{}]));
            await model.removeSite('siteid');
            sinon_1.assert.calledWithMatch(http.post, '/api/remove-site', { siteId: 'siteid' }, sinon_1.match.any);
        });
        it('removes site from the list', async () => {
            http.post.withArgs('/api/remove-site').returns(rxjs_1.from([{}]));
            const site = { id: 'siteid' };
            model.account.sites = [site];
            await model.removeSite('siteid');
            chai_1.expect(model.account.sites).not.contain(site);
        });
    });
    describe('savePony()', () => {
        it('makes save request', async () => {
            http.post.withArgs('/api/pony/save').returns(rxjs_1.from([{}]));
            await model.savePony({
                id: 'ponyid',
                name: 'ponyname',
                info: 'ponyinfo',
                site: 'siteid',
                tag: 'tagname',
                hideSupport: true,
            });
            sinon_1.assert.calledWithMatch(http.post, '/api/pony/save', {
                pony: {
                    id: 'ponyid',
                    name: 'ponyname',
                    info: 'ponyinfo',
                    site: 'siteid',
                    tag: 'tagname',
                    hideSupport: true,
                },
            }, sinon_1.match.any);
        });
        it('rejects if name is invalid', async () => {
            http.post.withArgs('/api/pony/save').returns(rxjs_1.from([{}]));
            await chai_1.expect(model.savePony({ id: '', name: '', info: 'ponyinfo' })).rejectedWith(errors_1.NAME_ERROR);
        });
        it('rejects if already saving', async () => {
            http.post.withArgs('/api/pony/save').returns(rxjs_1.from([{}]));
            await Promise.all([
                model.savePony({ id: '', name: 'ponyname', info: 'ponyinfo' }),
                chai_1.expect(model.savePony({ id: '', name: '', info: 'ponyinfo' })).rejectedWith('Saving in progress'),
            ]);
        });
    });
    describe('removePony()', () => {
        it('makes remove request', async () => {
            const ponyObject = { id: 'ponyid' };
            http.post.withArgs('/api/pony/remove').returns(rxjs_1.from([{}]));
            await model.removePony(ponyObject);
            sinon_1.assert.calledWithMatch(http.post, '/api/pony/remove', { id: 'ponyid' }, sinon_1.match.any);
        });
    });
    describe('status()', () => {
        it('fetches full server status', async () => {
            const status = {};
            http.get.withArgs('/api2/game/status').returns(rxjs_1.from([status]));
            const result = await model.status(false);
            sinon_1.assert.calledWithMatch(http.get, '/api2/game/status');
            chai_1.expect(result).eql(status);
        });
    });
    describe('join()', () => {
        it('fetches join result', async () => {
            const state = {};
            http.post.withArgs('/api/game/join').returns(rxjs_1.from([state]));
            const result = await model.join('serverid', 'ponyid');
            sinon_1.assert.calledWithMatch(http.post, '/api/game/join', {
                accountId: 'accid',
                accountName: 'accname',
                version: undefined,
                serverId: 'serverid',
                ponyId: 'ponyid',
                url: 'local-href',
            }, sinon_1.match.any);
            chai_1.expect(result).equal(state);
        });
        it('rejects if called when already pending', async () => {
            http.post.withArgs('/api/game/join').returns(rxjs_1.from([{}]));
            const promise1 = model.join('serverid', 'ponyid');
            const promise2 = model.join('serverid', 'ponyid');
            await Promise.all([
                promise1,
                chai_1.expect(promise2).rejectedWith('Joining in progress'),
            ]);
        });
        it('rejects if server is invalid', async () => {
            http.post.withArgs('/api/game/join').returns(rxjs_1.from([{}]));
            await chai_1.expect(model.join('', 'ponyid')).rejectedWith('Invalid server ID');
        });
        it('rejects if pony is invalid', async () => {
            http.post.withArgs('/api/game/join').returns(rxjs_1.from([{}]));
            await chai_1.expect(model.join('serverid', '')).rejectedWith('Invalid pony ID');
        });
    });
});
//# sourceMappingURL=model.spec.js.map