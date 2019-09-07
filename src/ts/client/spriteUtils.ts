import { once, noop } from 'lodash';
import { ColorExtra, ColorExtraSets, PonyEye, SpriteSheet, Sprite } from '../common/interfaces';
import { spriteSheets } from '../generated/sprites';
import { loadImage, createCanvas } from '../client/canvasUtils';
import { getUrl } from './rev';
import { createFonts } from './fonts';

export function createSprite(x: number, y: number, w: number, h: number, ox: number, oy: number, type: number): Sprite {
	return { x, y, w, h, ox, oy, type };
}

export function addTitles(sprites: ColorExtraSets, titles: string[]): ColorExtraSets {
	return sprites && sprites.map((ns, i) =>
		ns && ns.map(s => s && { color: s.color, colors: s.colors, title: titles[i], label: titles[i] }));
}

export function addLabels(sprites: ColorExtraSets, labels: string[]) {
	sprites && sprites.forEach((s, i) => s && s[0] ? s[0]!.label = labels[i] : undefined);
	return sprites;
}

export function createEyeSprite(eye: PonyEye | undefined, iris: number, defaultPalette: Uint32Array): ColorExtra | undefined {
	return eye && { color: eye.irises[iris]!, colors: 2, extra: eye.base, palettes: [defaultPalette] };
}

export function getColorCount(sprite: ColorExtra | undefined): number {
	return sprite && sprite.colors ? Math.floor((sprite.colors - 1) / 2) : 0;
}

export function createSpriteUtils() {
	createFonts();
}

type LoadImage = (src: string) => Promise<HTMLImageElement | ImageBitmap>;

function getImageData(img: HTMLImageElement | ImageBitmap) {
	const canvas = createCanvas(img.width, img.height);
	const context = canvas.getContext('2d')!;
	context.drawImage(img, 0, 0);
	return context.getImageData(0, 0, img.width, img.height);
}

function loadSpriteSheet(sheet: SpriteSheet, loadImage: LoadImage) {
	return Promise.all([
		loadImage(sheet.src!),
		sheet.srcA ? loadImage(sheet.srcA) : Promise.resolve(undefined)
	])
		.then(([img, imgA]) => {
			sheet.data = getImageData(img);

			if (imgA) {
				const alpha = getImageData(imgA);
				const alphaData = alpha.data;
				const sheedData = sheet.data.data;

				for (let i = 0; i < sheedData.length; i += 4) {
					sheedData[i + 3] = alphaData[i];
				}
			}
		});
}

export function loadSpriteSheets(sheets: SpriteSheet[], loadImage: LoadImage) {
	return Promise.all(sheets.map(s => loadSpriteSheet(s, loadImage))).then(noop);
}

export let spriteSheetsLoaded = false;

export function loadAndInitSheets(sheets: SpriteSheet[], loadImage: LoadImage) {
	return loadSpriteSheets(sheets, loadImage)
		.then(createSpriteUtils)
		.then(() => true)
		.catch(e => (console.error(e), false))
		.then(loaded => spriteSheetsLoaded = loaded);
}

export function loadImageFromUrl(url: string) {
	return loadImage(getUrl(url));
}

export const loadAndInitSpriteSheets = once(() => loadAndInitSheets(spriteSheets, loadImageFromUrl));
