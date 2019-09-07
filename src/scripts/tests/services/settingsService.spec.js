"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const settingsService_1 = require("../../components/services/settingsService");
const storageService_1 = require("../../components/services/storageService");
const model_1 = require("../../components/services/model");
describe('SettingsService', () => {
    let model = lib_1.stubClass(model_1.Model);
    let storage = lib_1.stubClass(storageService_1.StorageService);
    let service;
    beforeEach(() => {
        lib_1.resetStubMethods(model, 'saveSettings');
        service = new settingsService_1.SettingsService(storage, model);
    });
    it('loads browser settings from storage', () => {
        const settings = { foo: 'bar' };
        storage.getJSON.returns(settings);
        service = new settingsService_1.SettingsService(storage, model);
        chai_1.expect(service.browser).equal(settings);
    });
    it('returns account settings', () => {
        const settings = { foo: 'bar' };
        model.account = { settings };
        chai_1.expect(service.account).equal(settings);
    });
    it('returns empty settings if account is empty', () => {
        model.account = undefined;
        chai_1.expect(service.account).eql({});
    });
    it('update account settings field', async () => {
        const settings = { foo: 'bar' };
        model.account = {};
        await service.saveAccountSettings(settings);
        chai_1.expect(model.account.settings).equal(settings);
    });
    it('does not update account settings field if account is empty', async () => {
        const settings = { foo: 'bar' };
        model.account = undefined;
        await service.saveAccountSettings(settings);
        chai_1.expect(model.account).undefined;
    });
    it('saves settings to model', async () => {
        const settings = { foo: 'bar' };
        await service.saveAccountSettings(settings);
        sinon_1.assert.calledWith(model.saveSettings, settings);
    });
    it('calls saving callback', async () => {
        const settings = { foo: 'bar' };
        const save = sinon_1.stub().returns(true);
        service.saving(save);
        await service.saveAccountSettings(settings);
        sinon_1.assert.calledOnce(save);
        sinon_1.assert.notCalled(model.saveSettings);
    });
    it('saves settings to model if saving callback returns false', async () => {
        const settings = { foo: 'bar' };
        const save = sinon_1.stub().returns(false);
        service.saving(save);
        await service.saveAccountSettings(settings);
        sinon_1.assert.calledOnce(save);
        sinon_1.assert.calledWith(model.saveSettings, settings);
    });
    it('saves current browser settings', () => {
        const settings = { foo: 'bar' };
        service.browser = settings;
        service.saveBrowserSettings();
        sinon_1.assert.calledWith(storage.setJSON, 'browser-settings', settings);
    });
    it('saves given browser settings', () => {
        const settings = { foo: 'bar' };
        service.saveBrowserSettings(settings);
        chai_1.expect(service.browser).equal(settings);
        sinon_1.assert.calledWith(storage.setJSON, 'browser-settings', settings);
    });
});
//# sourceMappingURL=settingsService.spec.js.map