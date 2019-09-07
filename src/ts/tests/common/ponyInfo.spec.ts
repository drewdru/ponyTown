import '../lib';
import { expect } from 'chai';
import {
	syncLockedPonyInfo, syncLockedSpriteSet, syncLockedPonyInfoNumber, toPaletteSet, releasePalettes
} from '../../common/ponyInfo';
import { SpriteSet, PonyInfo, PaletteManager, ColorExtraSets, Palette } from '../../common/interfaces';
import { RED, BLUE, YELLOW, ORANGE, TRANSPARENT } from '../../common/colors';
import { repeat, times, flatten } from '../../common/utils';

type Set = SpriteSet<string>;

function ponyInfo(info: Partial<PonyInfo>): PonyInfo {
	return info as PonyInfo;
}

describe('ponyInfo', () => {
	describe('syncLockedSpriteSet()', () => {
		it('does nothing for undefined', () => {
			syncLockedSpriteSet(undefined, false, f => f, 'ff0000', '00ff00');
		});

		it('does nothing for missing fills', () => {
			syncLockedSpriteSet({}, false, f => f, 'ff0000', '00ff00');
		});

		it('does nothing for missing lockFills', () => {
			syncLockedSpriteSet({ fills: ['00ff00'] }, false, f => f, 'ff0000', '00ff00');
		});

		it('uses base fill if fill is locked', () => {
			const set: Set = {
				fills: [],
				lockFills: [true],
			};

			syncLockedSpriteSet(set, false, f => f, 'ff0000', '00ff00');

			expect(set.fills![0]).equal('ff0000');
		});

		it('uses first fill if fill is locked', () => {
			const set: Set = {
				fills: ['ff0000', '0000ff', '0000ff'],
				lockFills: [false, true, false],
			};

			syncLockedSpriteSet(set, false, f => f, 'ffffff', '000000');

			expect(set.fills).eql(['ff0000', 'ff0000', '0000ff']);
		});

		it('uses generated outline if custom outlines is false', () => {
			const set: Set = {
				fills: ['ff0000', '00ff00'],
				outlines: ['000000', '000000'],
				lockOutlines: [false, false],
			};

			syncLockedSpriteSet(set, false, f => f + 'x', 'ff0000', '00ff00');

			expect(set.lockOutlines).eql([true, true]);
			expect(set.outlines).eql(['ff0000x', '00ff00x']);
		});

		it('uses generated outline if outline is locked', () => {
			const set: Set = {
				fills: ['ff0000', '00ff00'],
				outlines: ['000000', '000000'],
				lockOutlines: [false, true],
			};

			syncLockedSpriteSet(set, true, f => f + 'x', 'ff0000', '00ff00');

			expect(set.outlines).eql(['000000', '00ff00x']);
		});

		it('uses base outline for first fill if fill is locked too', () => {
			const set: Set = {
				fills: ['ff0000', '00ff00'],
				lockFills: [true, false],
				outlines: ['000000', '000000'],
				lockOutlines: [true, false],
			};

			syncLockedSpriteSet(set, true, f => f + 'x', 'ff0000', 'ffffff');

			expect(set.outlines).eql(['ffffff', '000000']);
		});
	});

	describe('syncLockedPonyInfo()', () => {
		it('syncs coatOutline if customOutlines is false', () => {
			const pony = ponyInfo({
				customOutlines: false,
				coatFill: 'ff0000',
			});

			syncLockedPonyInfo(pony);

			expect(pony.coatOutline).equal('b30000');
		});

		it('syncs coatOutline if lockCoatOutline is true', () => {
			const pony = ponyInfo({
				customOutlines: true,
				lockCoatOutline: true,
				coatFill: 'ff0000',
			});

			syncLockedPonyInfo(pony);

			expect(pony.coatOutline).equal('b30000');
		});

		it('does not sync coatOutline if customOutline is false and lockCoatOutline is false', () => {
			const pony = ponyInfo({
				customOutlines: true,
				lockCoatOutline: false,
				coatFill: 'ff0000',
				coatOutline: '00ff00',
			});

			syncLockedPonyInfo(pony);

			expect(pony.coatOutline).equal('00ff00');
		});

		it('syncs eyeOpennessLeft if lockEyes is true', () => {
			const pony = ponyInfo({
				lockEyes: true,
				eyeOpennessLeft: 3,
				eyeOpennessRight: 2,
			});

			syncLockedPonyInfo(pony);

			expect(pony.eyeOpennessLeft).equal(2);
		});

		it('does not sync eyeOpennessLeft if lockEyes is false', () => {
			const pony = ponyInfo({
				lockEyes: false,
				eyeOpennessLeft: 3,
				eyeOpennessRight: 2,
			});

			syncLockedPonyInfo(pony);

			expect(pony.eyeOpennessLeft).equal(3);
		});

		it('syncs eyeColorLeft if lockEyeColor is true', () => {
			const pony = ponyInfo({
				lockEyeColor: true,
				eyeColorLeft: 'ff0000',
				eyeColorRight: '00ff00',
			});

			syncLockedPonyInfo(pony);

			expect(pony.eyeColorLeft).equal('00ff00');
		});

		it('does not sync eyeColorLeft if lockEyeColor is false', () => {
			const pony = ponyInfo({
				lockEyeColor: false,
				eyeColorLeft: 'ff0000',
				eyeColorRight: '00ff00',
			});

			syncLockedPonyInfo(pony);

			expect(pony.eyeColorLeft).equal('ff0000');
		});

		const fields: (keyof PonyInfo)[] = [
			'nose', 'ears', 'horn', 'wings', 'frontHooves', 'backHooves', 'mane', 'backMane', 'tail', 'facialHair',
			'headAccessory', 'earAccessory', 'faceAccessory', 'neckAccessory', 'frontLegAccessory', 'backLegAccessory',
			'backAccessory', 'waistAccessory', 'chestAccessory', 'sleeveAccessory',
		];

		fields.forEach(field => it(`syncs '${field}' sprite set`, () => {
			const pony = ponyInfo({
				[field]: <Set>{
					fills: ['ff0000'],
					outlines: ['00ff00'],
					lockOutlines: [true],
				},
			});

			syncLockedPonyInfo(pony);

			expect(pony[field]).eql({
				fills: ['ff0000'],
				outlines: ['b30000'],
				lockOutlines: [true],
			});
		}));

		it('syncs extraAccessory colors to correct pony colors', () => {
			const pony = ponyInfo({
				customOutlines: true,
				coatFill: 'ffffff',
				coatOutline: '000000',
				eyeColorLeft: 'aaaaaa',
				eyeColorRight: 'bbbbbb',
				mane: { type: 1, fills: ['ff0000'], outlines: ['aa0000'] },
				backMane: { type: 1, fills: ['00ff00'], outlines: ['00aa00'] },
				tail: { type: 1, fills: ['0000ff'], outlines: ['0000aa'] },
				extraAccessory: {
					fills: repeat(5, '111111'),
					lockFills: repeat(5, true),
					outlines: repeat(5, '111111'),
					lockOutlines: repeat(5, true),
				},
			});

			syncLockedPonyInfo(pony);

			expect(pony.extraAccessory).eql({
				fills: ['ffffff', 'bbbbbb', 'ff0000', '00ff00', '0000ff'],
				lockFills: [true, true, true, true, true],
				outlines: ['000000', 'bbbbbb', 'aa0000', '00aa00', '0000aa'],
				lockOutlines: [true, true, true, true, true],
			});
		});
	});

	describe('syncLockedPonyInfoNumber()', () => {
		it('syncs coatOutline if customOutlines is false', () => {
			const pony: any = {
				customOutlines: false,
				coatFill: 0xff0000ff,
			};

			syncLockedPonyInfoNumber(pony);

			expect(pony.coatOutline).equal(0xb30000ff);
		});
	});

	describe('toPaletteSet()', () => {
		const getColorsForSet = (set: SpriteSet<number>, count: number) => new Uint32Array([
			TRANSPARENT,
			...flatten(times(count, i => [
				set.fills && set.fills[i] || 0,
				set.outlines && set.outlines[i] || 0
			])),
		]);
		let manager: PaletteManager;

		beforeEach(() => {
			manager = {
				add: x => x && Array.from(x) as any,
				addArray: x => x && Array.from(x) as any,
				init() { },
			};
		});

		it('returns default object for empty set', () => {
			expect(toPaletteSet({}, undefined, manager, getColorsForSet, false, true)).eql({
				type: 0,
				pattern: 0,
				palette: [TRANSPARENT],
				extraPalette: undefined,
			});
		});

		it('returns type pattern and palette fields from set', () => {
			const set: SpriteSet<number> = {
				type: 1,
				pattern: 2,
				fills: [],
				outlines: [],
			};

			expect(toPaletteSet(set, [], manager, getColorsForSet, false, true)).eql({
				type: 1,
				pattern: 2,
				palette: [TRANSPARENT],
				extraPalette: undefined,
			});
		});

		it('trims palette to set color count', () => {
			const set: SpriteSet<number> = {
				type: 1,
				pattern: 2,
				fills: [RED, BLUE, 1, 2, 3, 4],
				outlines: [ORANGE, YELLOW, 5, 6, 7, 8],
			};

			const sets: ColorExtraSets = [
				[],
				[
					{ color: {} as any },
					{ color: {} as any },
					{ color: {} as any, colors: 5 },
				],
			];

			expect(toPaletteSet(set, sets, manager, getColorsForSet, false, true)).eql({
				type: 1,
				pattern: 2,
				palette: [TRANSPARENT, RED, ORANGE, BLUE, YELLOW],
				extraPalette: undefined,
			});
		});

		it('returns extra palette from sets', () => {
			const set: SpriteSet<number> = {
				type: 0,
				pattern: 0,
			};

			const sets: ColorExtraSets = [
				[
					{
						color: {} as any,
						palettes: [
							new Uint32Array([BLUE, YELLOW]),
						],
					},
				],
			];

			expect(toPaletteSet(set, sets, manager, getColorsForSet, true, true)).eql({
				type: 0,
				pattern: 0,
				palette: [TRANSPARENT],
				extraPalette: [BLUE, YELLOW],
			});
		});
	});

	describe('releasePalettes()', () => {
		it('ignores other fields', () => {
			releasePalettes({ foo: 'bar', bar: 12, test: { a: 4 } } as any);
		});

		it('releases palette field', () => {
			const palette: Palette = { refs: 1, x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0) };

			releasePalettes({ foo: palette } as any);

			expect(palette.refs).equal(0);
		});

		it('releases palette in object field', () => {
			const palette: Palette = { refs: 1, x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0) };
			const extraPalette: Palette = { refs: 1, x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0) };

			releasePalettes({ foo: { palette, extraPalette } } as any);

			expect(palette.refs).equal(0);
			expect(extraPalette.refs).equal(0);
		});
	});
});
