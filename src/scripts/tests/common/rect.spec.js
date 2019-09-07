"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const rect_1 = require("../../common/rect");
describe('rect', () => {
    describe('centerPoint()', () => {
        it('returns center point', () => {
            chai_1.expect(rect_1.centerPoint(rect_1.rect(10, 20, 20, 40))).eql({ x: 20, y: 40 });
        });
    });
});
//# sourceMappingURL=rect.spec.js.map