"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const path = require("path");
const rect_1 = require("../../common/rect");
const graphicsUtils_1 = require("../../graphics/graphicsUtils");
const contextSpriteBatch_1 = require("../../graphics/contextSpriteBatch");
const colors_1 = require("../../common/colors");
const mocks_1 = require("../mocks");
const paths_1 = require("../../server/paths");
const sprites_1 = require("../../generated/sprites");
const ponyInfo_1 = require("../../common/ponyInfo");
const baseFilePath = paths_1.pathTo('src', 'tests', 'graphics');
const palettes = graphicsUtils_1.createCommonPalettes(ponyInfo_1.mockPaletteManager);
const created = Date.now();
function test(file, draw) {
    return () => {
        const filePath = path.join(baseFilePath, file);
        const expected = lib_1.loadImageAsCanvas(filePath);
        const actual = contextSpriteBatch_1.drawCanvas(100, 50, sprites_1.paletteSpriteSheet, undefined, draw);
        lib_1.compareCanvases(expected, actual, filePath, 'graphics');
    };
}
describe('graphicsUtils', () => {
    before(lib_1.loadSprites);
    before(() => lib_1.clearCompareResults('graphics'));
    describe('drawBaloon()', () => {
        it('draws regular text', test('hello.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'hello', created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws regular text with emoji', test('hello-apple.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'hello 🍎', created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws text with new lines', test('newline.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'hello\nworld!', created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('does not draw if outside bounds', test('outside.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'cant see me', created }, 50, 25, rect_1.rect(0, 0, 10, 10), palettes);
        }));
        it('draws party message', test('party.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'party', type: 4 /* Party */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws moderator message', test('mod.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'moderator', type: 3 /* Mod */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws admin message', test('admin.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'admin', type: 2 /* Admin */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws supporter1 message', test('sup1.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'supporter 1', type: 9 /* Supporter1 */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws supporter2 message', test('sup2.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'supporter 2', type: 10 /* Supporter2 */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws supporter3 message', test('sup3.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'supporter 3', type: 11 /* Supporter3 */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws announcement message', test('announcement.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'announcement', type: 7 /* Announcement */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws party announcement message', test('party-announcement.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'announcement', type: 8 /* PartyAnnouncement */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws system message', test('system.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'system', type: 1 /* System */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws thinking bubble', test('thinking.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'thinking...', type: 5 /* Thinking */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('draws party thinking bubble', test('party-thinking.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'party thinking...', type: 6 /* PartyThinking */, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('fades in text bubble (time: 10)', test('fade-in-0.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'fade', timer: 10, total: 10, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('fades in text bubble (time: 9.95)', test('fade-in-1.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'fade', timer: 9.95, total: 10, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('fades in text bubble (time: 9.7)', test('fade-in-2.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'fade', timer: 9.7, total: 10, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('fades out text bubble (time: 0)', test('fade-out-0.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'fade', timer: 0, total: 10, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('fades out text bubble (time: 0.05)', test('fade-out-1.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'fade', timer: 0.05, total: 10, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        it('fades out text bubble (time: 0.3)', test('fade-out-2.png', batch => {
            graphicsUtils_1.drawBaloon(batch, { message: 'fade', timer: 0.3, total: 10, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
        }));
        const chatTypes = [
            ['chat', 0 /* Chat */],
            ['think', 5 /* Thinking */],
        ];
        chatTypes.forEach(([name, type]) => {
            it(`breaks words on small screen (${name})`, test(`break-${name}.png`, batch => {
                graphicsUtils_1.drawBaloon(batch, { message: 'too long to fit in one line', type, created }, 50, 25, rect_1.rect(0, 0, 100, 100), palettes);
            }));
            it(`moves ballon right to fit on screen (${name})`, test(`move-right-${name}.png`, batch => {
                graphicsUtils_1.drawBaloon(batch, { message: 'too long to fit', type, created }, 25, 25, rect_1.rect(0, 0, 100, 100), palettes);
            }));
            it(`moves ballon left to fit on screen (${name})`, test(`move-left-${name}.png`, batch => {
                graphicsUtils_1.drawBaloon(batch, { message: 'too long to fit', type, created }, 75, 25, rect_1.rect(0, 0, 100, 100), palettes);
            }));
            it(`does not move baloon originating from outside bounds (${name})`, test(`outside-${name}.png`, batch => {
                graphicsUtils_1.drawBaloon(batch, { message: 'too long to fit', type, created }, -25, 25, rect_1.rect(0, 0, 100, 100), palettes);
            }));
            it(`adjusts nipple when moving baloon (${name})`, test(`move-right-nipple-${name}.png`, batch => {
                graphicsUtils_1.drawBaloon(batch, { message: 'too long to fit', type, created }, 1, 25, rect_1.rect(0, 0, 100, 100), palettes);
            }));
        });
    });
    describe('drawBounds()', () => {
        it('draws bounds', test('bounds.png', batch => {
            graphicsUtils_1.drawBounds(batch, mocks_1.entity(0, 0.1, 0.2), rect_1.rect(5, 6, 25, 20), colors_1.ORANGE);
        }));
        it('draws nothing if rect is missing', test('bounds-none.png', batch => {
            graphicsUtils_1.drawBounds(batch, mocks_1.entity(0, 0.1, 0.2), undefined, colors_1.ORANGE);
        }));
    });
    describe('drawOutline()', () => {
        it('draws outline', test('outline.png', batch => {
            graphicsUtils_1.drawOutline(batch, colors_1.ORANGE, 10, 15, 30, 20);
        }));
    });
    describe('drawNamePlate()', () => {
        it('draws name', test('name.png', batch => {
            graphicsUtils_1.drawNamePlate(batch, 'name', 50, 25, graphicsUtils_1.DrawNameFlags.None, palettes, undefined);
        }));
        it('draws name with emoji', test('name-apple.png', batch => {
            graphicsUtils_1.drawNamePlate(batch, 'name 🍎', 50, 25, graphicsUtils_1.DrawNameFlags.None, palettes, undefined);
        }));
        it('draws party member name', test('name-party.png', batch => {
            graphicsUtils_1.drawNamePlate(batch, 'party', 50, 25, graphicsUtils_1.DrawNameFlags.Party, palettes, undefined);
        }));
        const tags = ['mod', 'dev', 'sup1', 'sup2', 'sup3'];
        tags.forEach(tag => it(`draws name with ${tag} tag`, test(`name-${tag}.png`, batch => {
            graphicsUtils_1.drawNamePlate(batch, `A ${tag}`, 50, 25, graphicsUtils_1.DrawNameFlags.None, palettes, tag);
        })));
    });
    describe('drawPixelText()', () => {
        it('draws numbers', test('pixel-numbers.png', batch => {
            graphicsUtils_1.drawPixelText(batch, 20, 20, 0x20B2AAff, '0 123456789X');
        }));
    });
});
//# sourceMappingURL=graphicsUtils.spec.js.map