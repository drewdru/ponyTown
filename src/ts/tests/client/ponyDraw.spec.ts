/* tslint:disable:max-line-length */
import { compareCanvases, loadSprites, loadImageAsCanvas, clearCompareResults } from '../lib';
import * as path from 'path';
import { TRANSPARENT, blushColor, WHITE } from '../../common/colors';
import { defaultPonyState, defaultDrawPonyOptions } from '../../client/ponyHelpers';
import { mockPaletteManager, createDefaultPony } from '../../common/ponyInfo';
import { PonyState, PalettePonyInfo, PonyInfo, DrawPonyOptions, NoDraw } from '../../common/interfaces';
import { sit, trot, sitDown, laugh, fly } from '../../client/ponyAnimations';
import { drawCanvas } from '../../graphics/contextSpriteBatch';
import { parseExpression } from '../../common/expressionUtils';
import { compressPonyString, decodePonyInfo } from '../../common/compressPony';
import { apple, jackoLanternOn, letter } from '../../common/entities';
import { candy, paletteSpriteSheet } from '../../generated/sprites';
import { drawPony } from '../../client/ponyDraw';
import { pathTo } from '../../server/paths';
import { createCanvas } from '../../server/canvasUtilsNode';

const baseFilePath = pathTo('src', 'tests', 'pony');

function createTests(): [string, PonyState, DrawPonyOptions, string][] {
	const state = defaultPonyState();
	const sitting: PonyState = { ...state, animation: sit, animationFrame: 0 };
	const sittingDown: PonyState = { ...state, animation: sitDown, animationFrame: 0 };
	const wingOpen: PonyState = { ...state, animation: fly, animationFrame: 0 };
	// const lying: PonyState = { ...state, animation: lie, animationFrame: 0 };
	const trotting: PonyState = { ...state, animation: trot, animationFrame: 10 };
	const blushing: PonyState = { ...state, expression: parseExpression('o//o') };
	//const turned: PonyState = { ...defaultState, headTurned: true };
	const holding: PonyState = { ...state, holding: apple(0, 0) };
	const holdingLantern: PonyState = { ...state, holding: jackoLanternOn(0, 0) };
	const holdingLetter: PonyState = { ...state, holding: letter(0, 0) };
	const laughing: PonyState = { ...state, headAnimation: laugh };
	const blinking: PonyState = { ...state, blinkFrame: 4 };
	const blinkingAngry: PonyState = { ...state, expression: parseExpression('|B)'), blinkFrame: 5 };
	const blinkingSkip: PonyState = { ...state, expression: parseExpression('|B)'), blinkFrame: 2 };
	const faceExtra: PonyState = {
		...state,
		drawFaceExtra: batch => batch.drawSprite(candy.color, WHITE, mockPaletteManager.addArray(candy.palettes![0]), 25, 40),
	};
	const faceExtraHoldingLetter: PonyState = { ...faceExtra, holding: letter(0, 0) };

	const options: DrawPonyOptions = { ...defaultDrawPonyOptions(), shadow: true };
	const flipped: DrawPonyOptions = { ...options, flipped: true };
	const selected: DrawPonyOptions = { ...options, selected: true };
	const extra: DrawPonyOptions = { ...options, extra: true };

	const base = 'CAP////apSDaICA2QAJpDhAvAAwAIA==';
	const baseWing = 'CAP////apSDaICA2QAJpIhAvAAwAIQgIAA==';
	const whitePetal = 'CAiidXWCfnZaUERMTEzb29vl5eXj4diysrI2oIIAAhiBVgCfgAYAGoAOEBpAYQFCAJCAkwAoQgDIgB4AG4AgACQgJAQgJCAAIA==';
	const cmSocks = 'CAdZp7LapSBFjaJtZDXm5uZWVlb85VlWsACAAIE5CADhAE/AAwAOgBIQGIBhAQCEaBdddn8f8AcDgcAf8fg=';
	const griffon = 'CAamno3apSD/1wDdrljp6ellX1I2QCZkJcAQKbcIBJAG8AtoDiBDUYBowLIgGEBA';

	return [
		['none.png', state, options, ''],
		['base.png', state, options, base],
		['selected.png', state, selected, base],
		['offline.png', state, options, 'CAKVlZUvLy82QIxomgCfgAYAGIAoQGEBwAEERFEUEA=='],
		['deer.png', state, options, 'CA18ZlPTh1Gfj3ofGRiqaUe9f12wnWHIw7Q0NDTcxl+ccU7S0YX///82wQIAAgTiBAAHWAJ+ICpCAwjVFZmiGquzYEgJnQAQhAJhAQiElWEQpZsA3vamBgAAAGBgAAAGBg=='],
		['all.png', state, options, 'CFTTzbqagEXaTSAgftqjmpqYj4Bi2iAA/88Ad///APWUjn0AmRgAs38AZrOzAKyyqYxWR0dzaU00ISHdVlZ9Jib/5VgekP8yzTLacNbcFDx//9Sqkg8AWrMCkAKZOJWaAB8+s4uzmxukr5BTcxl2r6g+jdkkcGcQQXBS/wBevD++0EifszfAwMBMTEyYmJgaGhro8pDWu1Tugu6nRKeVhW9nS0NPT09SUlJoWkZILyc3Nzc5OTn/pQDWmy68mFWpl3a4r55XOwhlShttWjVzZk+Jg3kzIwUsIAowJhIsJRonJiPV1dWysrKQkJBvb2//////9OH/6sP/04L/xl54bAkEgihOBBAwgAKGrAEABDiBIoAsYNHD4gIQIhInAAFBWpqAWLmDJo2AcOnj6BDENALFzBk0bAOHTx9AhpaALFzBk0BEdPH0EIAjJIgIlTCdRCAKSqEAVlkgoFi5gIjp6gqAtLmFxo2AvOnmCBDMMAxLmDJoDI6ePoJQIALgA7GdAZlzBk0bAaHTx9AhhGgMy5gyaNgNDp4+gQwjQGZcwZNGwGh08fQIYioDMuYMmjYDQ6ePoEMIMGrZu4By6dvIygGZcwZNAaHTx9BANAZlzBk0bAaHTx9Ahy9fP4EGFDiRY0eRJlS5k2dPb0KNKnUA'],
		['dragon.png', state, options, 'CAeokpLapSBgYGBSUlJqamqAcHBEREQ2oAIAIhkJEAT8ADAA3gDsAcgQMqICbgA='],
		['paws.png', state, options, 'CAa8q3/apiDapSD/1wCIXCjc0K82oCYAApkJUAQLkkADCA2gFtAbwIaRAGiAQA=='],
		['paws-socks.png', state, options, 'CAe8q3/apiDapSD/1wCIXCjc0K9GRkZWqAmAAKZChAEC5JAAwgNoBbQG8CGkQBogEIQDwgHA'],
		['glasses.png', state, options, 'CAPW0bTapSBZQSw2QAJpOgCfgAYAGIA4QGEBASAAAA=='],
		['griffon.png', state, options, griffon],
		['griffon-lantern.png', holdingLantern, options, griffon],
		['griffon-socks.png', state, options, 'CAemno3apSD/1wDdrljp6elf/8ZlX1JWkAmZChAECm3CASQBvQl1oDiiBuRgHjAsiAYQESgGhAMA'],
		['sit.png', sitting, options, base],
		['sit-wing.png', sitting, options, baseWing],
		['sit-socks.png', sitting, options, cmSocks],
		['sit-socks-cm.png', { ...sittingDown, animationFrame: 8 }, options, cmSocks],
		['sit-fetlocks.png', sitting, options, whitePetal],
		['sit-paws.png', sitting, options, 'CAmmno3apSD/1wDdrljp6ellX1JQODDb29v///82QCZiBVgCBIzOEASQBvAFtAcQIKowBowKkQDCAgEQoPEQDdZgAA=='],
		['sit-sword.png', sitting, options, 'CAf////apSDaICCVhW9nS0NPT09SUlI2QAJkKcIFcADAAgACIGEu4A=='],
		['sit-neck-accessory.png', sitting, options, 'CAeH5o7VplTH8K4yvVL/36cbGxtXV1c2wIIAIALkIAN8AT8ADAA1AEhAcgQLkIChAHCAMIhIq/DbYb5DZA=='],
		['trot.png', trotting, options, whitePetal],
		['holding.png', holding, options, whitePetal],
		['laughing.png', laughing, options, whitePetal],
		['blinking.png', blinking, options, whitePetal],
		['blinking-angry.png', blinkingAngry, options, whitePetal],
		['blinking-skip.png', blinkingSkip, options, whitePetal],
		['face-extra.png', faceExtra, options, whitePetal],
		['face-extra-holding-letter.png', faceExtraHoldingLetter, options, whitePetal],
		['cm-flip.png', state, flipped, 'CAeCQpnapSD/1wD////ugu7/pQD/4at2pAAmQoQBPwAMADEAOEBhAQEIBEI16y43AA3AA3A3A3A='],
		['freckles-flip.png', state, flipped, 'CA3/AADapSAnJyf/1wCK8f/////u7u5U3OkyzTKVhW9nS0NPT09SUlI2wAIAAAbiBAAHOAJ+ABgAYgBIQGEBAJhIrEQoPExgwq80AA=='],
		//['head-turned.png', turned, options, whitePetal],
		['extra.png', state, extra, 'CAWVlZW5ubn///9SUlIvLy82QIxkI0IEcgAYAGIAsIDCA4AAFAoootFFoFA='],
		['blush.png', blushing, options, base],
		['hat-horns.png', state, options, 'CAfMoYvPWVnapSD/1wA8PDzj0M3uVVU2QAJkJkAQLkkADAA8AFhAYQGcAwTAHAA='],
		['hat-bald.png', state, options, 'CAbi38/PWVnapSD/1wBwZmbuVVU2oJoAApkJkAQLkkQFsACcABBEAYA='],
		['holding-letter.png', holdingLetter, options, 'CAPHY2MghtoA/202QAJpLgCfgAYAGIA7QGEBCIBA'],
		['mustache.png', state, options, 'CATexazapSD/1wC8UCw2QAJkJcAQKbcADAAwAEAjAQA='],
		['hair-in-front-of-wing.png', state, options, 'CAOMx+LapSD04HY2QAJpIgCfgAYAGIA6AGEBQgIA'],
		['hair-behind-neck-accessory.png', state, options, 'CAb///9xcXHaICDbQEBra2t+fn42oAIAAhkJ8IFcADAA5AEqAcgQNgBYAYA='],
		// TEMP: gryphon wing pattern ['lie.png', lying, options, 'CAb///9xcXHaICDHx8eqqqq9vb02QAJkJEIFcADAAwgEnAcgQNiMS4A='],
		['no-body.png', state, { ...options, no: NoDraw.Body }, baseWing],
		['wing-open.png', wingOpen, options, griffon],
		['sitting-with-skirt-and-socks.png', sitting, options, 'DAb////CwsL/pQAjVdk9ySPugu42QAJkKsAT8ADAAnAASAAcICBCASIAqIA0ACA='],
		['cape.png', state, options, 'DASmlJTX19fHwJxbVVU2QAJkKkAT8ADAAxADhAYQEABCAQA='],
		// ['no-behind.png', state, { ...options, noBehind: true }, baseWing],
		// ['no-behind-leg.png', state, { ...options, noBehindLeg: true }, baseWing],
		// ['no-behind-body.png', state, { ...options, noBehindBody: true }, baseWing],
		// ['no-front.png', state, { ...options, noFront: true }, baseWing],
	];
}

function createOtherTests(): [string, string, Partial<PonyInfo>, PonyState, DrawPonyOptions][] {
	const state = defaultPonyState();
	const options: DrawPonyOptions = { ...defaultDrawPonyOptions(), shadow: true };

	return [
		['eyes-0.png', `doesn't allow 0 value for eyes`, { eyeOpennessLeft: 0, eyeOpennessRight: 0, lockEyes: false }, state, options],
	];
}

describe('ponyUtils', () => {
	before(loadSprites);
	before(() => clearCompareResults('pony'));

	describe('drawPony()', () => {
		createTests().forEach(([file, state, options, data]) => it(`correct for ${file}`, () => {
			const filePath = path.join(baseFilePath, file);
			const expected = loadImageAsCanvas(filePath);
			const info = decodePonyInfo(data, mockPaletteManager);
			const actual = drawPonyCanvas(TRANSPARENT, info, state, options);
			compareCanvases(expected, actual, filePath, 'pony');
		}));

		createOtherTests().forEach(([file, name, data, state, options]) => it(name, () => {
			const filePath = path.join(baseFilePath, file);
			const expected = loadImageAsCanvas(filePath);
			const ponyInfo = { ...createDefaultPony(), ...data };
			const compressed = compressPonyString(ponyInfo);
			const info = decodePonyInfo(compressed, mockPaletteManager);
			const actual = drawPonyCanvas(TRANSPARENT, info, state, options);
			compareCanvases(expected, actual, filePath, 'pony');
		}));
	});
});

function drawPonyCanvas(bg: number, info: PalettePonyInfo, state: PonyState, options: DrawPonyOptions) {
	state.blushColor = blushColor(info.coatPalette.colors[1]);
	const canvas = drawCanvas(80, 80, paletteSpriteSheet, bg, batch => drawPony(batch, info, state, 40, 70, options));

	if (options.flipped) {
		const flipped = createCanvas(canvas.width, canvas.height);
		const context = flipped.getContext('2d')!;
		context.scale(-1, 1);
		context.drawImage(canvas, -canvas.width, 0);
		return flipped;
	} else {
		return canvas;
	}
}
