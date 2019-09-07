import '../../lib';
import { expect } from 'chai';
import { ByteSize } from '../../../server/utils/byteSize';

describe('ByteSize ', () => {
	it('starts with zeroed fields', () => {
		const size = new ByteSize();

		expect(size.bytes).equal(0);
		expect(size.mbytes).equal(0);
	});

	it('can be created with inital values', () => {
		const size = new ByteSize(5, 6);

		expect(size.bytes).equal(5);
		expect(size.mbytes).equal(6);
	});

	it('reduces overflowing value of bytes when created', () => {
		const size = new ByteSize(6 * 1024 * 1024 + 5, 4);

		expect(size.bytes).equal(5);
		expect(size.mbytes).equal(10);
	});

	it('adds two values together', () => {
		const size = new ByteSize(6, 4);
		const x = new ByteSize(6, 4);

		size.add(x);

		expect(size.bytes).equal(12);
		expect(size.mbytes).equal(8);
	});

	it('adds value directly', () => {
		const size = new ByteSize(6, 4);

		size.addBytes(6, 4);

		expect(size.bytes).equal(12);
		expect(size.mbytes).equal(8);
	});

	it('adds value directly with just bytes', () => {
		const size = new ByteSize(6, 4);

		size.addBytes(6);

		expect(size.bytes).equal(12);
		expect(size.mbytes).equal(4);
	});

	describe('.toString()', () => {
		it('get string value for only bytes', () => {
			const size = new ByteSize(6);

			expect(size.toString()).equal('6');
		});

		it('get string value for bytes and megabytes', () => {
			const size = new ByteSize(6, 5);

			expect(size.toString()).equal('5000006');
		});
	});

	describe('.toSortableString()', () => {
		it('get padded string value for only bytes', () => {
			const size = new ByteSize(6);

			expect(size.toSortableString()).equal('000000000-000006');
		});

		it('get padded string value for bytes and megabytes', () => {
			const size = new ByteSize(6, 5);

			expect(size.toSortableString()).equal('000000005-000006');
		});
	});

	describe('.toHumanReadable()', () => {
		it('get value in b for values below 2 kb', () => {
			const size = new ByteSize(6);

			expect(size.toHumanReadable()).equal('6 b');
		});

		it('get value in kb for values above 2 kb', () => {
			const size = new ByteSize(6 * 1024);

			expect(size.toHumanReadable()).equal('6 kb');
		});

		it('get value in mb for values above 1 mb', () => {
			const size = new ByteSize(5, 2);

			expect(size.toHumanReadable()).equal('2 mb');
		});
	});
});
