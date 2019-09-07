import '../lib';
import { expect } from 'chai';
import { resizeCanvas, resizeCanvasWithRatio } from '../../client/canvasUtils';

describe('canvasUtils', () => {
	describe('resizeCanvas()', () => {
		it('should resize the canvas', () => {
			const canvas = { width: 100, height: 200 } as any;

			resizeCanvas(canvas as any, 50, 300);

			expect(canvas.width).equal(50);
			expect(canvas.height).equal(300);
		});

		it('should resize height of the canvas', () => {
			const canvas = { width: 100, height: 200 } as any;

			resizeCanvas(canvas as any, 100, 300);

			expect(canvas.width).equal(100);
			expect(canvas.height).equal(300);
		});

		it('should leave canvas the same size', () => {
			const canvas = { width: 100, height: 200 } as any;

			resizeCanvas(canvas as any, 100, 200);

			expect(canvas.width).equal(100);
			expect(canvas.height).equal(200);
		});
	});

	describe('resizeCanvasWithRatio()', () => {
		it('should resize the canvas', () => {
			const canvas = { width: 100, height: 200, style: { width: '', height: '' } } as any;

			resizeCanvasWithRatio(canvas as any, 50, 300);

			expect(canvas.width).equal(50);
			expect(canvas.height).equal(300);
			expect(canvas.style.width).equal('50px');
			expect(canvas.style.height).equal('300px');
		});

		it('should resize height of the canvas', () => {
			const canvas = { width: 100, height: 200, style: { width: '', height: '' } } as any;

			resizeCanvasWithRatio(canvas as any, 100, 300);

			expect(canvas.width).equal(100);
			expect(canvas.height).equal(300);
			expect(canvas.style.width).equal('100px');
			expect(canvas.style.height).equal('300px');
		});

		it('should leave canvas the same size', () => {
			const canvas = { width: 100, height: 200, style: { width: '', height: '' } } as any;

			resizeCanvasWithRatio(canvas as any, 100, 200);

			expect(canvas.width).equal(100);
			expect(canvas.height).equal(200);
			expect(canvas.style.width).equal('100px');
			expect(canvas.style.height).equal('200px');
		});

		it('should not update the style if passed false', () => {
			const canvas = { width: 100, height: 200, style: { width: '', height: '' } } as any;

			resizeCanvasWithRatio(canvas as any, 50, 300, false);

			expect(canvas.style.width).equal('');
			expect(canvas.style.height).equal('');
		});
	});
});
