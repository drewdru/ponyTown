"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const mocks_1 = require("../mocks");
const entityUtils_1 = require("../../common/entityUtils");
describe('entityUtils [common]', () => {
    describe('compareEntities()', () => {
        it('compares by y position', () => {
            const a = mocks_1.entity(0, 0, 1);
            const b = mocks_1.entity(0, 0, 2);
            chai_1.expect(entityUtils_1.compareEntities(a, b)).lt(0);
            chai_1.expect(entityUtils_1.compareEntities(b, a)).gt(0);
        });
        it('compares by x position', () => {
            const a = mocks_1.entity(0, 1, 1);
            const b = mocks_1.entity(0, 2, 1);
            chai_1.expect(entityUtils_1.compareEntities(a, b)).lt(0);
            chai_1.expect(entityUtils_1.compareEntities(b, a)).gt(0);
        });
        it('compares by id', () => {
            const a = mocks_1.entity(1, 1, 1);
            const b = mocks_1.entity(2, 1, 1);
            chai_1.expect(entityUtils_1.compareEntities(a, b)).gt(0);
            chai_1.expect(entityUtils_1.compareEntities(b, a)).lt(0);
        });
        it('returns 0 for identical entities', () => {
            const a = mocks_1.entity(1, 1, 1);
            const b = mocks_1.entity(1, 1, 1);
            chai_1.expect(entityUtils_1.compareEntities(a, b)).equal(0);
        });
    });
});
//# sourceMappingURL=entityUtils.spec.js.map