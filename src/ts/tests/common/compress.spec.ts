import '../lib';
import { expect } from 'chai';
import { random } from 'lodash';
import { compressTiles, decompressTiles } from '../../common/compress';
import { REGION_SIZE } from '../../common/constants';

describe('compress', () => {
	describe('compressTiles() + decompressTiles()', () => {
		it('test', () => {
			const tiles = new Uint8Array(REGION_SIZE * REGION_SIZE);

			for (let i = 0; i < tiles.length; i++) {
				tiles[i] = random(0, 5);
			}

			// console.log(Array.from(tiles).join(', '));
			const compressed = compressTiles(new Uint8Array(tiles));
			const decompressed = decompressTiles(compressed);
			//console.log(`${JSON.stringify(test)}: ${test.length} -> ${compressed.length}`);
			expect(Array.from(decompressed)).eql(Array.from(tiles), `compressed: [${Array.from(compressed).join(', ')}]`);
		});
	});
});
