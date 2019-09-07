"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const sinon_1 = require("sinon");
const webglUtils_1 = require("../../graphics/webgl/webglUtils");
const errors_1 = require("../../common/errors");
describe('webglUtils', () => {
    describe('getRenderTargetSize()', () => {
        it('returns correct size for 150x200', () => {
            chai_1.expect(webglUtils_1.getRenderTargetSize(150, 200)).equal(256);
        });
        it('returns correct size for 256x512', () => {
            chai_1.expect(webglUtils_1.getRenderTargetSize(256, 512)).equal(512);
        });
    });
    describe('getWebGLContext()', () => {
        it('gets weblg2 context', () => {
            const context = {};
            chai_1.expect(webglUtils_1.getWebGLContext({ getContext: sinon_1.stub().withArgs('webgl2').returns(context) })).equal(context);
        });
        it('falls back to weblg context', () => {
            const context = {};
            chai_1.expect(webglUtils_1.getWebGLContext({ getContext: sinon_1.stub().withArgs('webgl').returns(context) })).equal(context);
        });
        it('throws if context is not returned', () => {
            chai_1.expect(() => webglUtils_1.getWebGLContext({ getContext: sinon_1.stub().returns(undefined) })).throw(errors_1.WEBGL_CREATION_ERROR);
        });
    });
    describe('isWebGL2()', () => {
        it('returns true for webgl 2 context', () => {
            chai_1.expect(webglUtils_1.isWebGL2({ MAX_ELEMENT_INDEX: 1 })).true;
        });
        it('returns false for webgl 1 context', () => {
            chai_1.expect(webglUtils_1.isWebGL2({})).false;
        });
        it('returns false for undefined', () => {
            chai_1.expect(webglUtils_1.isWebGL2(undefined)).false;
        });
    });
});
//# sourceMappingURL=webglUtils.spec.js.map