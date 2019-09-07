import '../lib';
import { expect } from 'chai';
import { stub } from 'sinon';
import { getRenderTargetSize, isWebGL2, getWebGLContext } from '../../graphics/webgl/webglUtils';
import { WEBGL_CREATION_ERROR } from '../../common/errors';

describe('webglUtils', () => {
	describe('getRenderTargetSize()', () => {
		it('returns correct size for 150x200', () => {
			expect(getRenderTargetSize(150, 200)).equal(256);
		});

		it('returns correct size for 256x512', () => {
			expect(getRenderTargetSize(256, 512)).equal(512);
		});
	});

	describe('getWebGLContext()', () => {
		it('gets weblg2 context', () => {
			const context = {} as any;

			expect(getWebGLContext({ getContext: stub().withArgs('webgl2').returns(context) } as any)).equal(context);
		});

		it('falls back to weblg context', () => {
			const context = {} as any;

			expect(getWebGLContext({ getContext: stub().withArgs('webgl').returns(context) } as any)).equal(context);
		});

		it('throws if context is not returned', () => {
			expect(() => getWebGLContext({ getContext: stub().returns(undefined) } as any)).throw(WEBGL_CREATION_ERROR);
		});
	});

	describe('isWebGL2()', () => {
		it('returns true for webgl 2 context', () => {
			expect(isWebGL2({ MAX_ELEMENT_INDEX: 1 } as any)).true;
		});

		it('returns false for webgl 1 context', () => {
			expect(isWebGL2({} as any)).false;
		});

		it('returns false for undefined', () => {
			expect(isWebGL2(undefined)).false;
		});
	});
});
