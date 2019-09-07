import { toByteArray } from 'base64-js';
import { bitWriter, bitReader } from './bitUtils';
import { REGION_SIZE } from './constants';

function getBitsForNumber(value: number) {
	let bits = 0;
	let max = value - 1;

	while (max > 0) {
		bits++;
		max >>= 1;
	}

	return bits;
}

export function compressTiles(tiles: Uint8Array): Uint8Array {
	const types: number[] = [];

	for (let i = 0; i < tiles.length; i++) {
		const tile = tiles[i];

		if (types.indexOf(tile) === -1) {
			types.push(tile);
		}
	}

	const bitsPerTile = getBitsForNumber(types.length);
	const bitsPerRun = 4;

	return bitWriter(write => {
		write(types.length, 8);

		for (const type of types) {
			write(type, 8);
		}

		if (types.length > 1) {
			for (let i = 0; i < tiles.length; i++) {
				const value = tiles[i];
				let count = 1;

				if (i === (tiles.length - 1)) {
					write(count | 0b1000, bitsPerRun);
					write(types.indexOf(value), bitsPerTile);
				} else {
					i++;

					if (value === tiles[i]) {
						while (i < tiles.length && count < 0b111 && tiles[i] === value) {
							i++;
							count++;
						}

						i--;

						write(count, bitsPerRun);
						write(types.indexOf(value), bitsPerTile);
					} else {
						let last = tiles[i];
						let last2 = last;
						let pushLast = true;
						const values = [value];
						count++;

						for (i++; i < tiles.length; i++) {
							last2 = tiles[i];

							if (last2 === last) {
								i -= 2;
								count--;
								pushLast = false;
								break;
							} else if (count === 0b111) {
								i -= 1;
								break;
							} else {
								values.push(last);
								count++;
								last = last2;
							}
						}

						write(count | 0b1000, bitsPerRun);

						for (const v of values) {
							write(types.indexOf(v), bitsPerTile);
						}

						if (pushLast) {
							write(types.indexOf(last), bitsPerTile);
						}
					}
				}
			}
		}
	});
}

export function decompressTiles(data: Uint8Array): Uint8Array {
	const size = REGION_SIZE * REGION_SIZE;
	const result = new Uint8Array(size);
	const read = bitReader(data);
	const typesCount = read(8);
	const types: number[] = [];

	for (let i = 0; i < typesCount; i++) {
		types.push(read(8));
	}

	if (types.length === 1) {
		result.fill(types[0]);
	} else {
		const bitsPerTile = getBitsForNumber(typesCount);
		const bitsPerRun = 4;

		for (let i = 0; i < size;) {
			const value = read(bitsPerRun);

			if ((value & 0b1000) === 0) {
				const count = value;
				const entry = read(bitsPerTile);

				for (let j = 0; j < count; j++) {
					result[i] = types[entry];
					i++;
				}
			} else {
				const count = value & 0b0111;

				for (let j = 0; j < count; j++) {
					result[i] = types[read(bitsPerTile)];
					i++;
				}
			}
		}
	}

	return result;
}

export function deserializeTiles(tiles: string) {
	const decodedTiles = toByteArray(tiles);
	const result: number[] = [];

	for (let i = 0; i < decodedTiles.length; i += 2) {
		let count = decodedTiles[i];
		const tile = decodedTiles[i + 1];

		while (count > 0) {
			result.push(tile);
			count--;
		}
	}

	return result;
}
