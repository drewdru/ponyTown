"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const ponyHelpers_1 = require("../../client/ponyHelpers");
describe('interfaces', () => {
    describe('isStateEqual()', () => {
        it('returns true if two states are equal', () => {
            chai_1.expect(ponyHelpers_1.isStateEqual(ponyHelpers_1.defaultPonyState(), ponyHelpers_1.defaultPonyState())).true;
        });
        it('returns true if two states are not equal', () => {
            chai_1.expect(ponyHelpers_1.isStateEqual(Object.assign({}, ponyHelpers_1.defaultPonyState(), { blinkFrame: 5 }), ponyHelpers_1.defaultPonyState())).false;
        });
    });
});
//# sourceMappingURL=ponyHelpers.spec.js.map