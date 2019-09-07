"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const lodash_1 = require("lodash");
const bitUtils_1 = require("../../common/bitUtils");
function toArray(buffer) {
    return lodash_1.map(buffer, x => x);
}
describe('numberToBitCount()', () => {
    it('returns 0 for 0', () => {
        chai_1.expect(bitUtils_1.numberToBitCount(0)).equal(0);
    });
    it('returns 1 for 1', () => {
        chai_1.expect(bitUtils_1.numberToBitCount(1)).equal(1);
    });
    it('returns 3 for 7', () => {
        chai_1.expect(bitUtils_1.numberToBitCount(7)).equal(3);
    });
    it('returns 4 for 8', () => {
        chai_1.expect(bitUtils_1.numberToBitCount(8)).equal(4);
    });
    it('returns 16 for 0xffff', () => {
        chai_1.expect(bitUtils_1.numberToBitCount(0xffff)).equal(16);
    });
    it('returns 32 for 0xffffffff', () => {
        chai_1.expect(bitUtils_1.numberToBitCount(0xffffffff)).equal(32);
    });
    it('returns 32 for -1', () => {
        chai_1.expect(bitUtils_1.numberToBitCount(0xffffffff)).equal(32);
    });
});
describe('countBits()', () => {
    it('returns 0 for 0', () => {
        chai_1.expect(bitUtils_1.countBits(0)).equal(0);
    });
    it('returns 1 for 1', () => {
        chai_1.expect(bitUtils_1.countBits(1)).equal(1);
    });
    it('returns 16 for 0x55555555', () => {
        chai_1.expect(bitUtils_1.countBits(0x55555555)).equal(16);
    });
    it('returns 16 for 0xffff', () => {
        chai_1.expect(bitUtils_1.countBits(0xffff)).equal(16);
    });
    it('returns 32 for 0xffffffff', () => {
        chai_1.expect(bitUtils_1.countBits(0xffffffff)).equal(32);
    });
    it('returns 32 for -1', () => {
        chai_1.expect(bitUtils_1.countBits(-1)).equal(32);
    });
});
describe('bitWriter', () => {
    it('writes 1 bit', () => {
        const buffer = bitUtils_1.bitWriter(write => write(1, 1));
        chai_1.expect(toArray(buffer)).eql([0x80]);
    });
    it('writes 8 bits', () => {
        const buffer = bitUtils_1.bitWriter(write => write(123, 8));
        chai_1.expect(toArray(buffer)).eql([123]);
    });
    it('writes 32 bits', () => {
        const buffer = bitUtils_1.bitWriter(write => write(0xaabbccdd, 32));
        chai_1.expect(toArray(buffer)).eql([0xaa, 0xbb, 0xcc, 0xdd]);
    });
    it('writes multiple values', () => {
        const buffer = bitUtils_1.bitWriter(write => {
            write(1, 1);
            write(3, 2);
            write(1, 1);
        });
        chai_1.expect(toArray(buffer)).eql([0xf0]);
    });
    it('writes across bytes', () => {
        const buffer = bitUtils_1.bitWriter(write => {
            write(1, 4);
            write(1, 8);
            write(1, 4);
        });
        chai_1.expect(toArray(buffer)).eql([0x10, 0x11]);
    });
    it('writes a lot of values', () => {
        const values = lodash_1.range(0, 200).map(() => lodash_1.random(0, 255));
        const buffer = bitUtils_1.bitWriter(write => values.forEach(value => write(value, 8)));
        chai_1.expect(toArray(buffer)).eql(values);
    });
    it('trims values that do not fit into given amount of bits', () => {
        const buffer = bitUtils_1.bitWriter(write => {
            write(0xff, 4);
            write(0, 4);
        });
        chai_1.expect(toArray(buffer)).eql([0xf0]);
    });
    it('throws for incorrect bit count', () => {
        bitUtils_1.bitWriter(write => chai_1.expect(() => write(0, 33)).throw('Invalid bit count'));
    });
    it('throws for incorrect bit count', () => {
        bitUtils_1.bitWriter(write => chai_1.expect(() => write(0, -1)).throw('Invalid bit count'));
    });
});
describe('bitReader', () => {
    it('reads 1 bit', () => {
        const read = bitUtils_1.bitReader(new Uint8Array([0x80]));
        chai_1.expect(read(1)).equal(1);
    });
    it('reads 8 bits', () => {
        const read = bitUtils_1.bitReader(new Uint8Array([123]));
        chai_1.expect(read(8)).equal(123);
    });
    it('reads 32 bits', () => {
        const read = bitUtils_1.bitReader(new Uint8Array([0x0a, 0xbb, 0xcc, 0xdd]));
        chai_1.expect(read(32)).equal(0x0abbccdd);
    });
    it('reads always unsigned', () => {
        const read = bitUtils_1.bitReader(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]));
        chai_1.expect(read(32)).equal(0xaabbccdd);
    });
    it('reads multiple values', () => {
        const read = bitUtils_1.bitReader(new Uint8Array([0xf0]));
        chai_1.expect(read(1)).equal(1);
        chai_1.expect(read(2)).equal(3);
        chai_1.expect(read(1)).equal(1);
    });
    it('reads multiple bytes', () => {
        const read = bitUtils_1.bitReader(new Uint8Array([0x01, 0x01]));
        chai_1.expect(read(8)).equal(1);
        chai_1.expect(read(8)).equal(1);
    });
    it('reads across bytes', () => {
        const read = bitUtils_1.bitReader(new Uint8Array([0x10, 0x11]));
        chai_1.expect(read(4)).equal(1);
        chai_1.expect(read(8)).equal(1);
        chai_1.expect(read(4)).equal(1);
    });
    it('reads a lot of values', () => {
        const values = lodash_1.range(0, 200).map(() => lodash_1.random(0, 255));
        const read = bitUtils_1.bitReader(new Uint8Array(values));
        values.forEach(value => chai_1.expect(read(8)).equal(value));
    });
    it('throws for incorrect bit count', () => {
        const read = bitUtils_1.bitReader(new Uint8Array(1));
        chai_1.expect(() => read(33)).throw('Invalid bit count');
    });
    it('throws for incorrect bit count', () => {
        const read = bitUtils_1.bitReader(new Uint8Array(1));
        chai_1.expect(() => read(-1)).throw('Invalid bit count');
    });
    it('throws for reading past end', () => {
        const read = bitUtils_1.bitReader(new Uint8Array(1));
        read(8);
        chai_1.expect(() => read(1)).throw('Reading past end');
    });
});
describe('bitWriter + bitReader', () => {
    const tests = [
        [[1, 1, 1, 1], [7, 5, 3, 1]],
    ];
    tests.forEach(([values, bits]) => it(`should work for ${JSON.stringify([values, bits])}`, () => {
        const buffer = bitUtils_1.bitWriter(write => bits.forEach((b, i) => write(values[i], b)));
        const read = bitUtils_1.bitReader(buffer);
        const result = bits.map(b => read(b));
        chai_1.expect(result).eql(values);
    }));
});
//# sourceMappingURL=bitUtils.spec.js.map