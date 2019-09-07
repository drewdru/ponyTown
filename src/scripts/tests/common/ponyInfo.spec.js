"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../lib");
const chai_1 = require("chai");
const ponyInfo_1 = require("../../common/ponyInfo");
const colors_1 = require("../../common/colors");
const utils_1 = require("../../common/utils");
function ponyInfo(info) {
    return info;
}
describe('ponyInfo', () => {
    describe('syncLockedSpriteSet()', () => {
        it('does nothing for undefined', () => {
            ponyInfo_1.syncLockedSpriteSet(undefined, false, f => f, 'ff0000', '00ff00');
        });
        it('does nothing for missing fills', () => {
            ponyInfo_1.syncLockedSpriteSet({}, false, f => f, 'ff0000', '00ff00');
        });
        it('does nothing for missing lockFills', () => {
            ponyInfo_1.syncLockedSpriteSet({ fills: ['00ff00'] }, false, f => f, 'ff0000', '00ff00');
        });
        it('uses base fill if fill is locked', () => {
            const set = {
                fills: [],
                lockFills: [true],
            };
            ponyInfo_1.syncLockedSpriteSet(set, false, f => f, 'ff0000', '00ff00');
            chai_1.expect(set.fills[0]).equal('ff0000');
        });
        it('uses first fill if fill is locked', () => {
            const set = {
                fills: ['ff0000', '0000ff', '0000ff'],
                lockFills: [false, true, false],
            };
            ponyInfo_1.syncLockedSpriteSet(set, false, f => f, 'ffffff', '000000');
            chai_1.expect(set.fills).eql(['ff0000', 'ff0000', '0000ff']);
        });
        it('uses generated outline if custom outlines is false', () => {
            const set = {
                fills: ['ff0000', '00ff00'],
                outlines: ['000000', '000000'],
                lockOutlines: [false, false],
            };
            ponyInfo_1.syncLockedSpriteSet(set, false, f => f + 'x', 'ff0000', '00ff00');
            chai_1.expect(set.lockOutlines).eql([true, true]);
            chai_1.expect(set.outlines).eql(['ff0000x', '00ff00x']);
        });
        it('uses generated outline if outline is locked', () => {
            const set = {
                fills: ['ff0000', '00ff00'],
                outlines: ['000000', '000000'],
                lockOutlines: [false, true],
            };
            ponyInfo_1.syncLockedSpriteSet(set, true, f => f + 'x', 'ff0000', '00ff00');
            chai_1.expect(set.outlines).eql(['000000', '00ff00x']);
        });
        it('uses base outline for first fill if fill is locked too', () => {
            const set = {
                fills: ['ff0000', '00ff00'],
                lockFills: [true, false],
                outlines: ['000000', '000000'],
                lockOutlines: [true, false],
            };
            ponyInfo_1.syncLockedSpriteSet(set, true, f => f + 'x', 'ff0000', 'ffffff');
            chai_1.expect(set.outlines).eql(['ffffff', '000000']);
        });
    });
    describe('syncLockedPonyInfo()', () => {
        it('syncs coatOutline if customOutlines is false', () => {
            const pony = ponyInfo({
                customOutlines: false,
                coatFill: 'ff0000',
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony.coatOutline).equal('b30000');
        });
        it('syncs coatOutline if lockCoatOutline is true', () => {
            const pony = ponyInfo({
                customOutlines: true,
                lockCoatOutline: true,
                coatFill: 'ff0000',
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony.coatOutline).equal('b30000');
        });
        it('does not sync coatOutline if customOutline is false and lockCoatOutline is false', () => {
            const pony = ponyInfo({
                customOutlines: true,
                lockCoatOutline: false,
                coatFill: 'ff0000',
                coatOutline: '00ff00',
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony.coatOutline).equal('00ff00');
        });
        it('syncs eyeOpennessLeft if lockEyes is true', () => {
            const pony = ponyInfo({
                lockEyes: true,
                eyeOpennessLeft: 3,
                eyeOpennessRight: 2,
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony.eyeOpennessLeft).equal(2);
        });
        it('does not sync eyeOpennessLeft if lockEyes is false', () => {
            const pony = ponyInfo({
                lockEyes: false,
                eyeOpennessLeft: 3,
                eyeOpennessRight: 2,
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony.eyeOpennessLeft).equal(3);
        });
        it('syncs eyeColorLeft if lockEyeColor is true', () => {
            const pony = ponyInfo({
                lockEyeColor: true,
                eyeColorLeft: 'ff0000',
                eyeColorRight: '00ff00',
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony.eyeColorLeft).equal('00ff00');
        });
        it('does not sync eyeColorLeft if lockEyeColor is false', () => {
            const pony = ponyInfo({
                lockEyeColor: false,
                eyeColorLeft: 'ff0000',
                eyeColorRight: '00ff00',
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony.eyeColorLeft).equal('ff0000');
        });
        const fields = [
            'nose', 'ears', 'horn', 'wings', 'frontHooves', 'backHooves', 'mane', 'backMane', 'tail', 'facialHair',
            'headAccessory', 'earAccessory', 'faceAccessory', 'neckAccessory', 'frontLegAccessory', 'backLegAccessory',
            'backAccessory', 'waistAccessory', 'chestAccessory', 'sleeveAccessory',
        ];
        fields.forEach(field => it(`syncs '${field}' sprite set`, () => {
            const pony = ponyInfo({
                [field]: {
                    fills: ['ff0000'],
                    outlines: ['00ff00'],
                    lockOutlines: [true],
                },
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony[field]).eql({
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
                    fills: utils_1.repeat(5, '111111'),
                    lockFills: utils_1.repeat(5, true),
                    outlines: utils_1.repeat(5, '111111'),
                    lockOutlines: utils_1.repeat(5, true),
                },
            });
            ponyInfo_1.syncLockedPonyInfo(pony);
            chai_1.expect(pony.extraAccessory).eql({
                fills: ['ffffff', 'bbbbbb', 'ff0000', '00ff00', '0000ff'],
                lockFills: [true, true, true, true, true],
                outlines: ['000000', 'bbbbbb', 'aa0000', '00aa00', '0000aa'],
                lockOutlines: [true, true, true, true, true],
            });
        });
    });
    describe('syncLockedPonyInfoNumber()', () => {
        it('syncs coatOutline if customOutlines is false', () => {
            const pony = {
                customOutlines: false,
                coatFill: 0xff0000ff,
            };
            ponyInfo_1.syncLockedPonyInfoNumber(pony);
            chai_1.expect(pony.coatOutline).equal(0xb30000ff);
        });
    });
    describe('toPaletteSet()', () => {
        const getColorsForSet = (set, count) => new Uint32Array([
            colors_1.TRANSPARENT,
            ...utils_1.flatten(utils_1.times(count, i => [
                set.fills && set.fills[i] || 0,
                set.outlines && set.outlines[i] || 0
            ])),
        ]);
        let manager;
        beforeEach(() => {
            manager = {
                add: x => x && Array.from(x),
                addArray: x => x && Array.from(x),
                init() { },
            };
        });
        it('returns default object for empty set', () => {
            chai_1.expect(ponyInfo_1.toPaletteSet({}, undefined, manager, getColorsForSet, false, true)).eql({
                type: 0,
                pattern: 0,
                palette: [colors_1.TRANSPARENT],
                extraPalette: undefined,
            });
        });
        it('returns type pattern and palette fields from set', () => {
            const set = {
                type: 1,
                pattern: 2,
                fills: [],
                outlines: [],
            };
            chai_1.expect(ponyInfo_1.toPaletteSet(set, [], manager, getColorsForSet, false, true)).eql({
                type: 1,
                pattern: 2,
                palette: [colors_1.TRANSPARENT],
                extraPalette: undefined,
            });
        });
        it('trims palette to set color count', () => {
            const set = {
                type: 1,
                pattern: 2,
                fills: [colors_1.RED, colors_1.BLUE, 1, 2, 3, 4],
                outlines: [colors_1.ORANGE, colors_1.YELLOW, 5, 6, 7, 8],
            };
            const sets = [
                [],
                [
                    { color: {} },
                    { color: {} },
                    { color: {}, colors: 5 },
                ],
            ];
            chai_1.expect(ponyInfo_1.toPaletteSet(set, sets, manager, getColorsForSet, false, true)).eql({
                type: 1,
                pattern: 2,
                palette: [colors_1.TRANSPARENT, colors_1.RED, colors_1.ORANGE, colors_1.BLUE, colors_1.YELLOW],
                extraPalette: undefined,
            });
        });
        it('returns extra palette from sets', () => {
            const set = {
                type: 0,
                pattern: 0,
            };
            const sets = [
                [
                    {
                        color: {},
                        palettes: [
                            new Uint32Array([colors_1.BLUE, colors_1.YELLOW]),
                        ],
                    },
                ],
            ];
            chai_1.expect(ponyInfo_1.toPaletteSet(set, sets, manager, getColorsForSet, true, true)).eql({
                type: 0,
                pattern: 0,
                palette: [colors_1.TRANSPARENT],
                extraPalette: [colors_1.BLUE, colors_1.YELLOW],
            });
        });
    });
    describe('releasePalettes()', () => {
        it('ignores other fields', () => {
            ponyInfo_1.releasePalettes({ foo: 'bar', bar: 12, test: { a: 4 } });
        });
        it('releases palette field', () => {
            const palette = { refs: 1, x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0) };
            ponyInfo_1.releasePalettes({ foo: palette });
            chai_1.expect(palette.refs).equal(0);
        });
        it('releases palette in object field', () => {
            const palette = { refs: 1, x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0) };
            const extraPalette = { refs: 1, x: 0, y: 0, u: 0, v: 0, colors: new Uint32Array(0) };
            ponyInfo_1.releasePalettes({ foo: { palette, extraPalette } });
            chai_1.expect(palette.refs).equal(0);
            chai_1.expect(extraPalette.refs).equal(0);
        });
    });
});
//# sourceMappingURL=ponyInfo.spec.js.map