import { Rect, ExtCanvas } from './types';
import { cropCanvas, createExtCanvas } from './canvas-utils';

const validPatternColors = [
	255, // red
	255 << 8, // green
	255 | (255 << 8), // yellow
	255 << 16, // blue
	255 | (255 << 16), // purple
	(255 << 8) | (255 << 16), // teal
	255 | (255 << 8) | (255 << 16), // white
	0, // black
];

const getAlpha = (alpha: number) => alpha < 15 ? false : (alpha > 250 ? true : null);
const isOutline = (shade: number) => shade <= 159;
const round255 = (n: number) => n > 200 ? 255 : (n < 50 ? 0 : n);
const rgbToColor = (r: number, g: number, b: number) => round255(r) | (round255(g) << 8) | (round255(b) << 16);
const findValidPatternColor = (r: number, g: number, b: number) => validPatternColors.indexOf(rgbToColor(r, g, b));

function getShade(shade: number) {
	// outlines
	// 135 - dark outline
	// 159 - outline

	// fills
	// 174 - dark shades
	// 204 - shade
	// 217 - dark fill
	// 255 - fill

	if (shade > 130 && shade < 140) { // dark outline
		return 135;
	} else if (shade > 150 && shade < 165) { // outline
		return 159;
	} else if (shade > 165 && shade < 180) { // dark shade
		return 174;
	} else if (shade > 190 && shade < 210) { // shade
		return 204;
	} else if (shade > 210 && shade < 220) { // dark fill
		return 217;
	} else if (shade > 245) { // fill
		return 255;
	} else {
		return -1;
	}
}

function getShadeForShading(shade: number) {
	if (shade === 135) { // dark outline
		return 204;
	} else if (shade === 159) { // outline
		return 255;
	} else {
		return shade;
	}
}

function pixel(data: Uint8ClampedArray, index: number) {
	return data.slice(index, index + 4).join(', ');
}

export interface ColorsOutput {
	colors?: number;
	forceWhite?: boolean;
}

export function imageToPalette(
	rect: Rect, image: ExtCanvas, pattern: ExtCanvas, palette: number[] | undefined, config: ColorsOutput
) {
	const pat = cropCanvas(pattern, 0, 0, image.width, image.height);
	const ctx = pat.getContext('2d')!;
	ctx.globalCompositeOperation = 'destination-in';
	ctx.drawImage(image, 0, 0);

	const imageData = image.getContext('2d')!.getImageData(rect.x, rect.y, rect.w, rect.h);
	const pattData = ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
	const length = imageData.width * imageData.height * 4;
	const data = imageData.data;
	const pdata = pattData.data;

	let maxIndex = 0;

	for (let i = 0; i < length; i += 4) {
		const x = ((i / 4) % rect.w) + rect.x;
		const y = Math.floor((i / 4) / rect.h) + rect.y;

		if (palette) {
			const color = ((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]) >>> 0;
			const index = palette.indexOf(color);

			if (index === -1) {
				throw new Error(`Invalid color (palette) [${pixel(data, i)}] [0x${color.toString(16)}] (${x} ${y}) (${image.info})`);
			}

			data[i] = index;
			data[i + 1] = 255;
		} else {
			const alpha = getAlpha(data[i + 3]);
			const shade = getShade(data[i]);
			const index = findValidPatternColor(pdata[i], pdata[i + 1], pdata[i + 2]);

			if (index === -1)
				throw new Error(`Invalid color (pattern) [${pixel(pdata, i)}] (${x} ${y}) (${pat.info})`);
			if (alpha == null)
				throw new Error(`Invalid color [${pixel(data, i)}] (${x} ${y}) (${image.info})`);

			const actualIndex = (index * 2) + (isOutline(shade) ? 2 : 1);
			const shadeForShading = getShadeForShading(shade);

			data[i] = alpha ? actualIndex : 0;
			data[i + 1] = (config.forceWhite && shade !== -1) ? 255 : (alpha ? shadeForShading : 255);

			if (alpha) {
				maxIndex = Math.max(maxIndex, index);
			}
		}

		data[i + 2] = 0;
		data[i + 3] = 255;
	}

	config.colors = palette ? palette.length : ((maxIndex + 1) * 2 + 1);

	const result = createExtCanvas(image.width, image.height, `${image.info} (image to palette)`);
	result.getContext('2d')!.putImageData(imageData, rect.x, rect.y);
	return result;
}
