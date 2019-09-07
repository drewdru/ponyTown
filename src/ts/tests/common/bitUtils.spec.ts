import '../lib';
import { expect } from 'chai';
import { map, range, random } from 'lodash';
import { bitWriter, bitReader, numberToBitCount, countBits } from '../../common/bitUtils';

function toArray(buffer: Uint8Array): number[] {
	return map(buffer, x => x);
}

describe('numberToBitCount()', () => {
	it('returns 0 for 0', () => {
		expect(numberToBitCount(0)).equal(0);
	});

	it('returns 1 for 1', () => {
		expect(numberToBitCount(1)).equal(1);
	});

	it('returns 3 for 7', () => {
		expect(numberToBitCount(7)).equal(3);
	});

	it('returns 4 for 8', () => {
		expect(numberToBitCount(8)).equal(4);
	});

	it('returns 16 for 0xffff', () => {
		expect(numberToBitCount(0xffff)).equal(16);
	});

	it('returns 32 for 0xffffffff', () => {
		expect(numberToBitCount(0xffffffff)).equal(32);
	});

	it('returns 32 for -1', () => {
		expect(numberToBitCount(0xffffffff)).equal(32);
	});
});

describe('countBits()', () => {
	it('returns 0 for 0', () => {
		expect(countBits(0)).equal(0);
	});

	it('returns 1 for 1', () => {
		expect(countBits(1)).equal(1);
	});

	it('returns 16 for 0x55555555', () => {
		expect(countBits(0x55555555)).equal(16);
	});

	it('returns 16 for 0xffff', () => {
		expect(countBits(0xffff)).equal(16);
	});

	it('returns 32 for 0xffffffff', () => {
		expect(countBits(0xffffffff)).equal(32);
	});

	it('returns 32 for -1', () => {
		expect(countBits(-1)).equal(32);
	});
});

describe('bitWriter', () => {
	it('writes 1 bit', () => {
		const buffer = bitWriter(write => write(1, 1));
		expect(toArray(buffer)).eql([0x80]);
	});

	it('writes 8 bits', () => {
		const buffer = bitWriter(write => write(123, 8));
		expect(toArray(buffer)).eql([123]);
	});

	it('writes 32 bits', () => {
		const buffer = bitWriter(write => write(0xaabbccdd, 32));
		expect(toArray(buffer)).eql([0xaa, 0xbb, 0xcc, 0xdd]);
	});

	it('writes multiple values', () => {
		const buffer = bitWriter(write => {
			write(1, 1);
			write(3, 2);
			write(1, 1);
		});
		expect(toArray(buffer)).eql([0xf0]);
	});

	it('writes across bytes', () => {
		const buffer = bitWriter(write => {
			write(1, 4);
			write(1, 8);
			write(1, 4);
		});
		expect(toArray(buffer)).eql([0x10, 0x11]);
	});

	it('writes a lot of values', () => {
		const values = range(0, 200).map(() => random(0, 255));
		const buffer = bitWriter(write => values.forEach(value => write(value, 8)));
		expect(toArray(buffer)).eql(values);
	});

	it('trims values that do not fit into given amount of bits', () => {
		const buffer = bitWriter(write => {
			write(0xff, 4);
			write(0, 4);
		});
		expect(toArray(buffer)).eql([0xf0]);
	});

	it('throws for incorrect bit count', () => {
		bitWriter(write => expect(() => write(0, 33)).throw('Invalid bit count'));
	});

	it('throws for incorrect bit count', () => {
		bitWriter(write => expect(() => write(0, -1)).throw('Invalid bit count'));
	});
});

describe('bitReader', () => {
	it('reads 1 bit', () => {
		const read = bitReader(new Uint8Array([0x80]));
		expect(read(1)).equal(1);
	});

	it('reads 8 bits', () => {
		const read = bitReader(new Uint8Array([123]));
		expect(read(8)).equal(123);
	});

	it('reads 32 bits', () => {
		const read = bitReader(new Uint8Array([0x0a, 0xbb, 0xcc, 0xdd]));
		expect(read(32)).equal(0x0abbccdd);
	});

	it('reads always unsigned', () => {
		const read = bitReader(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]));
		expect(read(32)).equal(0xaabbccdd);
	});

	it('reads multiple values', () => {
		const read = bitReader(new Uint8Array([0xf0]));
		expect(read(1)).equal(1);
		expect(read(2)).equal(3);
		expect(read(1)).equal(1);
	});

	it('reads multiple bytes', () => {
		const read = bitReader(new Uint8Array([0x01, 0x01]));
		expect(read(8)).equal(1);
		expect(read(8)).equal(1);
	});

	it('reads across bytes', () => {
		const read = bitReader(new Uint8Array([0x10, 0x11]));
		expect(read(4)).equal(1);
		expect(read(8)).equal(1);
		expect(read(4)).equal(1);
	});

	it('reads a lot of values', () => {
		const values = range(0, 200).map(() => random(0, 255));
		const read = bitReader(new Uint8Array(values));
		values.forEach(value => expect(read(8)).equal(value));
	});

	it('throws for incorrect bit count', () => {
		const read = bitReader(new Uint8Array(1));
		expect(() => read(33)).throw('Invalid bit count');
	});

	it('throws for incorrect bit count', () => {
		const read = bitReader(new Uint8Array(1));
		expect(() => read(-1)).throw('Invalid bit count');
	});

	it('throws for reading past end', () => {
		const read = bitReader(new Uint8Array(1));
		read(8);
		expect(() => read(1)).throw('Reading past end');
	});
});

describe('bitWriter + bitReader', () => {
	const tests = [
		[[1, 1, 1, 1], [7, 5, 3, 1]],
	];

	tests.forEach(([values, bits]) => it(`should work for ${JSON.stringify([values, bits])}`, () => {
		const buffer = bitWriter(write => bits.forEach((b, i) => write(values[i], b)));
		const read = bitReader(buffer);
		const result = bits.map(b => read(b));
		expect(result).eql(values);
	}));
});
