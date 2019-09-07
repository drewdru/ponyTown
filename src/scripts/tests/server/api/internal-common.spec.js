"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../../lib");
const sinon_1 = require("sinon");
const internal_common_1 = require("../../../server/api/internal-common");
describe('internal-common', () => {
    describe('reloadSettings', () => {
        let func;
        let reloadSettings;
        beforeEach(() => {
            reloadSettings = sinon_1.stub();
            func = internal_common_1.createReloadSettings(reloadSettings);
        });
        it('reloads settings', async () => {
            await func();
            sinon_1.assert.calledOnce(reloadSettings);
        });
    });
});
//# sourceMappingURL=internal-common.spec.js.map