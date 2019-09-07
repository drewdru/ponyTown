import { ExtCanvas } from './types';
import { cropCanvas } from './canvas-utils';

const tileWidth = 32;
const tileHeight = 24;

const cols = 10;
const tiles = [
	47, 47, 0, 0, 13, 19, 21, 20, 15, 16,
	47, 47, 0, 0, 13, 13, 45, 22, 18, 17,
	9, 2, 2, 2, 10, 14, 14, 14, 35, 36,
	8, 5, null, 7, 4, 27, 26, 29, 37, 38,
	8, null, 46, null, 4, 28, 24, 30, 39, 40,
	8, 3, null, 1, 4, 23, 31, 32, 41, 42,
	12, 6, 6, 6, 11, 25, 33, 34, 43, 44,
];

interface Rev {
	number: number;
	index: number;
	dstIndex: number;
}

const revtiles: Rev[] = tiles
	.map((number, index) => ({ number, index, dstIndex: 0 }))
	.filter(x => x.number != null) as Rev[];
revtiles.sort((a, b) => a.number - b.number);
revtiles.forEach((t, i) => t.dstIndex = i);

export function tilesToSprites(canvas: ExtCanvas, spaceH: number, spaceV: number) {
	return revtiles
		.sort((a, b) => a.dstIndex - b.dstIndex)
		.map(t => {
			const srcIndex = t.index;
			const srcCol = srcIndex % cols;
			const srcRow = Math.floor(srcIndex / cols);
			const srcX = spaceH + srcCol * (tileWidth + spaceH);
			const srcY = spaceV + srcRow * (tileHeight + spaceV);
			return cropCanvas(canvas, srcX, srcY, tileWidth, tileHeight);
		});
}
