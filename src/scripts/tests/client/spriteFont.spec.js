"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const chai_1 = require("chai");
const colors_1 = require("../../common/colors");
const fonts_1 = require("../../client/fonts");
const contextSpriteBatch_1 = require("../../graphics/contextSpriteBatch");
const paths_1 = require("../../server/paths");
const sprites_1 = require("../../generated/sprites");
const spriteFont_1 = require("../../graphics/spriteFont");
const graphicsUtils_1 = require("../../graphics/graphicsUtils");
const tests = [
    ['Tiny Pony Face!', 'ascii.png'],
    ['New lines\nanother line', 'newlines.png'],
    ['ŚŃĄjGiýŽžĹĺĽľŔŕ', 'special.png'],
    ['👃🙂😵😠😐', 'tiny.png'],
    ['АаБбВвГг', 'russian.png'],
    ['ΑΒΓΔΕΖΗΘ', 'greek.png'],
    ['ぁあぃいぅうぇえ', 'hiragana.png'],
    ['ァアィイゥウェエ', 'katakana.png'],
    ['漢字', 'kanji.png'],
    ['ＡＢＣＤＥＦａｂｃｄｅｆ', 'romaji.png'],
    ['emoji: 💚🍎🌠🎲', 'emoji.png'],
    ['◠◡◯◰▤▥▦●', 'shapes.png'],
    ['abcde\ufe0efg\ufe0fhij', 'variants.png'],
    ['‒⁇;⁈⁉“_”.,`', 'punctuation.png'],
    ['口古句另叨 龈龋龍龟', 'chinese.png'],
];
describe('SpriteFont', () => {
    before(lib_1.loadSprites);
    before(() => lib_1.clearCompareResults('font'));
    describe('drawText()', () => {
        const width = 100;
        const height = 30;
        function test(file, draw) {
            const filePath = paths_1.pathTo('src', 'tests', 'font', file);
            const expected = lib_1.loadImageAsCanvas(filePath);
            const actual = contextSpriteBatch_1.drawCanvas(width, height, sprites_1.paletteSpriteSheet, colors_1.WHITE, draw);
            lib_1.compareCanvases(expected, actual, filePath, 'font');
        }
        tests.forEach(([text, file]) => it(`correct for "${text}" (${file})`, () => {
            test(file, batch => spriteFont_1.drawText(batch, text, fonts_1.fontPal, colors_1.BLACK, 5, 5, {
                palette: graphicsUtils_1.commonPalettes.mainFont.white, emojiPalette: graphicsUtils_1.commonPalettes.mainFont.emoji
            }));
        }));
        describe('lineBreak()', () => {
            it('does not break short text', () => {
                const text = spriteFont_1.lineBreak('hello world', fonts_1.fontPal, 90);
                chai_1.expect(text).equal('hello world');
            });
            it('breaks into multiple lines', () => {
                const text = spriteFont_1.lineBreak('this text is too long to fit', fonts_1.fontPal, 90);
                chai_1.expect(text).equal('this text is too\nlong to fit');
            });
            it('does not break single word', () => {
                const text = spriteFont_1.lineBreak('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', fonts_1.fontPal, 90);
                chai_1.expect(text).equal('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
            });
        });
    });
});
//# sourceMappingURL=spriteFont.spec.js.map