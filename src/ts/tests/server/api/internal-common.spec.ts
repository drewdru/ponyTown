import '../../lib';
import { SinonStub, stub, assert } from 'sinon';
import { createReloadSettings } from '../../../server/api/internal-common';

describe('internal-common', () => {
	describe('reloadSettings', () => {
		let func: ReturnType<typeof createReloadSettings>;
		let reloadSettings: SinonStub;

		beforeEach(() => {
			reloadSettings = stub();
			func = createReloadSettings(reloadSettings);
		});

		it('reloads settings', async () => {
			await func();

			assert.calledOnce(reloadSettings);
		});
	});
});
