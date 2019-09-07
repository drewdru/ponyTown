import { compareCanvases, loadSprites, loadImageAsCanvas, clearCompareResults } from '../lib';
import * as path from 'path';
import { SpriteBatch, MessageType, PaletteSpriteBatch } from '../../common/interfaces';
import { rect } from '../../common/rect';
import {
	drawBaloon, drawNamePlate, drawPixelText, drawOutline, drawBounds, createCommonPalettes, DrawNameFlags
} from '../../graphics/graphicsUtils';
import { drawCanvas } from '../../graphics/contextSpriteBatch';
import { ORANGE } from '../../common/colors';
import { entity } from '../mocks';
import { pathTo } from '../../server/paths';
import { paletteSpriteSheet } from '../../generated/sprites';
import { mockPaletteManager } from '../../common/ponyInfo';

const baseFilePath = pathTo('src', 'tests', 'graphics');
const palettes = createCommonPalettes(mockPaletteManager);
const created = Date.now();

function test(file: string, draw: (batch: SpriteBatch & PaletteSpriteBatch) => void) {
	return () => {
		const filePath = path.join(baseFilePath, file);
		const expected = loadImageAsCanvas(filePath);
		const actual = drawCanvas(100, 50, paletteSpriteSheet, undefined, draw);
		compareCanvases(expected, actual, filePath, 'graphics');
	};
}

describe('graphicsUtils', () => {
	before(loadSprites);
	before(() => clearCompareResults('graphics'));

	describe('drawBaloon()', () => {
		it('draws regular text', test('hello.png', batch => {
			drawBaloon(batch, { message: 'hello', created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws regular text with emoji', test('hello-apple.png', batch => {
			drawBaloon(batch, { message: 'hello 🍎', created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws text with new lines', test('newline.png', batch => {
			drawBaloon(batch, { message: 'hello\nworld!', created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('does not draw if outside bounds', test('outside.png', batch => {
			drawBaloon(batch, { message: 'cant see me', created }, 50, 25, rect(0, 0, 10, 10), palettes);
		}));

		it('draws party message', test('party.png', batch => {
			drawBaloon(batch, { message: 'party', type: MessageType.Party, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws moderator message', test('mod.png', batch => {
			drawBaloon(batch, { message: 'moderator', type: MessageType.Mod, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws admin message', test('admin.png', batch => {
			drawBaloon(batch, { message: 'admin', type: MessageType.Admin, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws supporter1 message', test('sup1.png', batch => {
			drawBaloon(batch, { message: 'supporter 1', type: MessageType.Supporter1, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws supporter2 message', test('sup2.png', batch => {
			drawBaloon(batch, { message: 'supporter 2', type: MessageType.Supporter2, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws supporter3 message', test('sup3.png', batch => {
			drawBaloon(batch, { message: 'supporter 3', type: MessageType.Supporter3, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws announcement message', test('announcement.png', batch => {
			drawBaloon(
				batch, { message: 'announcement', type: MessageType.Announcement, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws party announcement message', test('party-announcement.png', batch => {
			drawBaloon(
				batch, { message: 'announcement', type: MessageType.PartyAnnouncement, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws system message', test('system.png', batch => {
			drawBaloon(batch, { message: 'system', type: MessageType.System, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws thinking bubble', test('thinking.png', batch => {
			drawBaloon(batch, { message: 'thinking...', type: MessageType.Thinking, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('draws party thinking bubble', test('party-thinking.png', batch => {
			drawBaloon(
				batch, { message: 'party thinking...', type: MessageType.PartyThinking, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('fades in text bubble (time: 10)', test('fade-in-0.png', batch => {
			drawBaloon(batch, { message: 'fade', timer: 10, total: 10, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('fades in text bubble (time: 9.95)', test('fade-in-1.png', batch => {
			drawBaloon(batch, { message: 'fade', timer: 9.95, total: 10, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('fades in text bubble (time: 9.7)', test('fade-in-2.png', batch => {
			drawBaloon(batch, { message: 'fade', timer: 9.7, total: 10, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('fades out text bubble (time: 0)', test('fade-out-0.png', batch => {
			drawBaloon(batch, { message: 'fade', timer: 0, total: 10, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('fades out text bubble (time: 0.05)', test('fade-out-1.png', batch => {
			drawBaloon(batch, { message: 'fade', timer: 0.05, total: 10, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		it('fades out text bubble (time: 0.3)', test('fade-out-2.png', batch => {
			drawBaloon(batch, { message: 'fade', timer: 0.3, total: 10, created }, 50, 25, rect(0, 0, 100, 100), palettes);
		}));

		const chatTypes: [string, MessageType][] = [
			['chat', MessageType.Chat],
			['think', MessageType.Thinking],
		];

		chatTypes.forEach(([name, type]) => {
			it(`breaks words on small screen (${name})`, test(`break-${name}.png`, batch => {
				drawBaloon(batch, { message: 'too long to fit in one line', type, created }, 50, 25, rect(0, 0, 100, 100), palettes);
			}));

			it(`moves ballon right to fit on screen (${name})`, test(`move-right-${name}.png`, batch => {
				drawBaloon(batch, { message: 'too long to fit', type, created }, 25, 25, rect(0, 0, 100, 100), palettes);
			}));

			it(`moves ballon left to fit on screen (${name})`, test(`move-left-${name}.png`, batch => {
				drawBaloon(batch, { message: 'too long to fit', type, created }, 75, 25, rect(0, 0, 100, 100), palettes);
			}));

			it(`does not move baloon originating from outside bounds (${name})`, test(`outside-${name}.png`, batch => {
				drawBaloon(batch, { message: 'too long to fit', type, created }, -25, 25, rect(0, 0, 100, 100), palettes);
			}));

			it(`adjusts nipple when moving baloon (${name})`, test(`move-right-nipple-${name}.png`, batch => {
				drawBaloon(batch, { message: 'too long to fit', type, created }, 1, 25, rect(0, 0, 100, 100), palettes);
			}));
		});
	});

	describe('drawBounds()', () => {
		it('draws bounds', test('bounds.png', batch => {
			drawBounds(batch, entity(0, 0.1, 0.2), rect(5, 6, 25, 20), ORANGE);
		}));

		it('draws nothing if rect is missing', test('bounds-none.png', batch => {
			drawBounds(batch, entity(0, 0.1, 0.2), undefined, ORANGE);
		}));
	});

	describe('drawOutline()', () => {
		it('draws outline', test('outline.png', batch => {
			drawOutline(batch, ORANGE, 10, 15, 30, 20);
		}));
	});

	describe('drawNamePlate()', () => {
		it('draws name', test('name.png', batch => {
			drawNamePlate(batch, 'name', 50, 25, DrawNameFlags.None, palettes, undefined);
		}));

		it('draws name with emoji', test('name-apple.png', batch => {
			drawNamePlate(batch, 'name 🍎', 50, 25, DrawNameFlags.None, palettes, undefined);
		}));

		it('draws party member name', test('name-party.png', batch => {
			drawNamePlate(batch, 'party', 50, 25, DrawNameFlags.Party, palettes, undefined);
		}));

		const tags = ['mod', 'dev', 'sup1', 'sup2', 'sup3'];

		tags.forEach(tag => it(`draws name with ${tag} tag`, test(`name-${tag}.png`, batch => {
			drawNamePlate(batch, `A ${tag}`, 50, 25, DrawNameFlags.None, palettes, tag);
		})));
	});

	describe('drawPixelText()', () => {
		it('draws numbers', test('pixel-numbers.png', batch => {
			drawPixelText(batch, 20, 20, 0x20B2AAff, '0 123456789X');
		}));
	});
});
