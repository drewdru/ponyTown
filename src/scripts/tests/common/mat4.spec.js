"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const mat4_1 = require("../../common/mat4");
describe('mat4', () => {
    describe('createMat4()', () => {
        chai_1.expect(mat4_1.createMat4()).eql(new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]));
    });
    describe('ortho()', () => {
        chai_1.expect(mat4_1.ortho(mat4_1.createMat4(), 100, 200, 300, 400, 10, 20)).eql(new Float32Array([
            0.019999999552965164, 0, 0, 0,
            0, 0.019999999552965164, 0, 0,
            0, 0, -0.20000000298023224, 0,
            -3, -7, -3, 1
        ]));
    });
});
//# sourceMappingURL=mat4.spec.js.map