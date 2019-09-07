import { stubClass, resetStubMethods } from '../lib';
import { expect } from 'chai';
import { assert, stub } from 'sinon';
import { SettingsService } from '../../components/services/settingsService';
import { StorageService } from '../../components/services/storageService';
import { Model } from '../../components/services/model';

describe('SettingsService', () => {
	let model = stubClass(Model);
	let storage = stubClass(StorageService);
	let service: SettingsService;

	beforeEach(() => {
		resetStubMethods(model, 'saveSettings');
		service = new SettingsService(storage as any, model as any);
	});

	it('loads browser settings from storage', () => {
		const settings = { foo: 'bar' };
		storage.getJSON.returns(settings);

		service = new SettingsService(storage as any, model as any);

		expect(service.browser).equal(settings);
	});

	it('returns account settings', () => {
		const settings = { foo: 'bar' };
		model.account = { settings } as any;

		expect(service.account).equal(settings);
	});

	it('returns empty settings if account is empty', () => {
		model.account = undefined as any;

		expect(service.account).eql({});
	});

	it('update account settings field', async () => {
		const settings = { foo: 'bar' };
		model.account = {} as any;

		await service.saveAccountSettings(settings as any);

		expect((model.account as any).settings).equal(settings);
	});

	it('does not update account settings field if account is empty', async () => {
		const settings = { foo: 'bar' };
		model.account = undefined as any;

		await service.saveAccountSettings(settings as any);

		expect(model.account).undefined;
	});

	it('saves settings to model', async () => {
		const settings = { foo: 'bar' };

		await service.saveAccountSettings(settings as any);

		assert.calledWith(model.saveSettings, settings as any);
	});

	it('calls saving callback', async () => {
		const settings = { foo: 'bar' };
		const save = stub().returns(true);
		service.saving(save);

		await service.saveAccountSettings(settings as any);

		assert.calledOnce(save);
		assert.notCalled(model.saveSettings);
	});

	it('saves settings to model if saving callback returns false', async () => {
		const settings = { foo: 'bar' };
		const save = stub().returns(false);
		service.saving(save);

		await service.saveAccountSettings(settings as any);

		assert.calledOnce(save);
		assert.calledWith(model.saveSettings, settings as any);
	});

	it('saves current browser settings', () => {
		const settings = { foo: 'bar' };
		service.browser = settings as any;

		service.saveBrowserSettings();

		assert.calledWith(storage.setJSON, 'browser-settings', settings);
	});

	it('saves given browser settings', () => {
		const settings = { foo: 'bar' };

		service.saveBrowserSettings(settings as any);

		expect(service.browser).equal(settings);
		assert.calledWith(storage.setJSON, 'browser-settings', settings);
	});
});
