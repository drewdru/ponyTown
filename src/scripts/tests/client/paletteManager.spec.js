"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const paletteManager_1 = require("../../graphics/paletteManager");
describe('PaletteManager', () => {
    describe('releasePalette()', () => {
        it('reduces ref count on palette', () => {
            const palette = { x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0), refs: 5 };
            paletteManager_1.releasePalette(palette);
            chai_1.expect(palette.refs).equal(4);
        });
        it('does not reduce ref count below 0', () => {
            const palette = { x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0), refs: 0 };
            paletteManager_1.releasePalette(palette);
            chai_1.expect(palette.refs).equal(0);
        });
        it('does nothing if refs are undefined', () => {
            const palette = {};
            paletteManager_1.releasePalette(palette);
            chai_1.expect(palette.refs).undefined;
        });
        it('does nothing if palette is undefined', () => {
            paletteManager_1.releasePalette(undefined);
        });
    });
    describe('PaletteManager', () => {
        let paletteManager;
        beforeEach(() => {
            paletteManager = new paletteManager_1.PaletteManager();
        });
        after(() => {
            paletteManager = undefined;
        });
        describe('.add()', () => {
            it('returns new palette', () => {
                chai_1.expect(paletteManager.add([1, 2, 3]))
                    .eql({ x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array([1, 2, 3]), refs: 1 });
            });
            it('returns existing palette for the same colors', () => {
                const first = paletteManager.add([1, 2, 3]);
                chai_1.expect(paletteManager.add([1, 2, 3])).equal(first);
            });
            it('increments ref count for existing palette', () => {
                paletteManager.add([1, 2, 3]);
                chai_1.expect(paletteManager.add([1, 2, 3]).refs).equal(2);
            });
            it('returns new palette for the different colors', () => {
                const first = paletteManager.add([1, 2, 3]);
                chai_1.expect(paletteManager.add([5, 6, 7])).not.equal(first);
            });
            it('converts all colors to unsigned integers', () => {
                chai_1.expect(paletteManager.add([-1, 2.5, 'bleh']).colors)
                    .eql(new Uint32Array([4294967295, 2, 0]));
            });
        });
        describe('.addArray()', () => {
            it('returns new palette', () => {
                chai_1.expect(paletteManager.addArray(new Uint32Array([1, 2, 3])))
                    .eql({ x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array([1, 2, 3]), refs: 1 });
            });
            it('returns existing palette for the same colors', () => {
                const first = paletteManager.addArray(new Uint32Array([1, 2, 3]));
                chai_1.expect(paletteManager.addArray(new Uint32Array([1, 2, 3]))).equal(first);
            });
            it('returns new palette palette for the same colors if deduplication is turned off', () => {
                const first = paletteManager.addArray(new Uint32Array([1, 2, 3]));
                paletteManager.deduplicate = false;
                chai_1.expect(paletteManager.addArray(new Uint32Array([1, 2, 3]))).not.equal(first);
            });
            it('increments ref count for existing palette', () => {
                paletteManager.addArray(new Uint32Array([1, 2, 3]));
                chai_1.expect(paletteManager.addArray(new Uint32Array([1, 2, 3])).refs).equal(2);
            });
            it('returns new palette for the different colors', () => {
                const first = paletteManager.addArray(new Uint32Array([1, 2, 3]));
                chai_1.expect(paletteManager.addArray(new Uint32Array([5, 6, 7]))).not.equal(first);
            });
        });
    });
});
//# sourceMappingURL=paletteManager.spec.js.map