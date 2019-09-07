import '../lib';
import { expect } from 'chai';
import { Palette } from '../../common/interfaces';
import { releasePalette, PaletteManager } from '../../graphics/paletteManager';

describe('PaletteManager', () => {
	describe('releasePalette()', () => {
		it('reduces ref count on palette', () => {
			const palette: Palette = { x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0), refs: 5 };

			releasePalette(palette);

			expect(palette.refs).equal(4);
		});

		it('does not reduce ref count below 0', () => {
			const palette: Palette = { x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0), refs: 0 };

			releasePalette(palette);

			expect(palette.refs).equal(0);
		});

		it('does nothing if refs are undefined', () => {
			const palette = {} as any;

			releasePalette(palette);

			expect(palette.refs).undefined;
		});

		it('does nothing if palette is undefined', () => {
			releasePalette(undefined);
		});
	});

	describe('PaletteManager', () => {
		let paletteManager: PaletteManager;

		beforeEach(() => {
			paletteManager = new PaletteManager();
		});

		after(() => {
			paletteManager = undefined as any;
		});

		describe('.add()', () => {
			it('returns new palette', () => {
				expect(paletteManager.add([1, 2, 3]))
					.eql({ x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array([1, 2, 3]), refs: 1 });
			});

			it('returns existing palette for the same colors', () => {
				const first = paletteManager.add([1, 2, 3]);

				expect(paletteManager.add([1, 2, 3])).equal(first);
			});

			it('increments ref count for existing palette', () => {
				paletteManager.add([1, 2, 3]);

				expect(paletteManager.add([1, 2, 3]).refs).equal(2);
			});

			it('returns new palette for the different colors', () => {
				const first = paletteManager.add([1, 2, 3]);

				expect(paletteManager.add([5, 6, 7])).not.equal(first);
			});

			it('converts all colors to unsigned integers', () => {
				expect(paletteManager.add([-1, 2.5, 'bleh' as any]).colors)
					.eql(new Uint32Array([4294967295, 2, 0]));
			});
		});

		describe('.addArray()', () => {
			it('returns new palette', () => {
				expect(paletteManager.addArray(new Uint32Array([1, 2, 3])))
					.eql({ x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array([1, 2, 3]), refs: 1 });
			});

			it('returns existing palette for the same colors', () => {
				const first = paletteManager.addArray(new Uint32Array([1, 2, 3]));

				expect(paletteManager.addArray(new Uint32Array([1, 2, 3]))).equal(first);
			});

			it('returns new palette palette for the same colors if deduplication is turned off', () => {
				const first = paletteManager.addArray(new Uint32Array([1, 2, 3]));
				paletteManager.deduplicate = false;

				expect(paletteManager.addArray(new Uint32Array([1, 2, 3]))).not.equal(first);
			});

			it('increments ref count for existing palette', () => {
				paletteManager.addArray(new Uint32Array([1, 2, 3]));

				expect(paletteManager.addArray(new Uint32Array([1, 2, 3])).refs).equal(2);
			});

			it('returns new palette for the different colors', () => {
				const first = paletteManager.addArray(new Uint32Array([1, 2, 3]));

				expect(paletteManager.addArray(new Uint32Array([5, 6, 7]))).not.equal(first);
			});
		});
	});
});
