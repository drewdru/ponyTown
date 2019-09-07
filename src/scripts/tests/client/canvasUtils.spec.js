"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const canvasUtils_1 = require("../../client/canvasUtils");
describe('canvasUtils', () => {
    describe('resizeCanvas()', () => {
        it('should resize the canvas', () => {
            const canvas = { width: 100, height: 200 };
            canvasUtils_1.resizeCanvas(canvas, 50, 300);
            chai_1.expect(canvas.width).equal(50);
            chai_1.expect(canvas.height).equal(300);
        });
        it('should resize height of the canvas', () => {
            const canvas = { width: 100, height: 200 };
            canvasUtils_1.resizeCanvas(canvas, 100, 300);
            chai_1.expect(canvas.width).equal(100);
            chai_1.expect(canvas.height).equal(300);
        });
        it('should leave canvas the same size', () => {
            const canvas = { width: 100, height: 200 };
            canvasUtils_1.resizeCanvas(canvas, 100, 200);
            chai_1.expect(canvas.width).equal(100);
            chai_1.expect(canvas.height).equal(200);
        });
    });
    describe('resizeCanvasWithRatio()', () => {
        it('should resize the canvas', () => {
            const canvas = { width: 100, height: 200, style: { width: '', height: '' } };
            canvasUtils_1.resizeCanvasWithRatio(canvas, 50, 300);
            chai_1.expect(canvas.width).equal(50);
            chai_1.expect(canvas.height).equal(300);
            chai_1.expect(canvas.style.width).equal('50px');
            chai_1.expect(canvas.style.height).equal('300px');
        });
        it('should resize height of the canvas', () => {
            const canvas = { width: 100, height: 200, style: { width: '', height: '' } };
            canvasUtils_1.resizeCanvasWithRatio(canvas, 100, 300);
            chai_1.expect(canvas.width).equal(100);
            chai_1.expect(canvas.height).equal(300);
            chai_1.expect(canvas.style.width).equal('100px');
            chai_1.expect(canvas.style.height).equal('300px');
        });
        it('should leave canvas the same size', () => {
            const canvas = { width: 100, height: 200, style: { width: '', height: '' } };
            canvasUtils_1.resizeCanvasWithRatio(canvas, 100, 200);
            chai_1.expect(canvas.width).equal(100);
            chai_1.expect(canvas.height).equal(200);
            chai_1.expect(canvas.style.width).equal('100px');
            chai_1.expect(canvas.style.height).equal('200px');
        });
        it('should not update the style if passed false', () => {
            const canvas = { width: 100, height: 200, style: { width: '', height: '' } };
            canvasUtils_1.resizeCanvasWithRatio(canvas, 50, 300, false);
            chai_1.expect(canvas.style.width).equal('');
            chai_1.expect(canvas.style.height).equal('');
        });
    });
});
//# sourceMappingURL=canvasUtils.spec.js.map