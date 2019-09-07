"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const graphicsUtils_1 = require("../../../graphics/graphicsUtils");
const contextSpriteBatch_1 = require("../../../graphics/contextSpriteBatch");
const colors_1 = require("../../../common/colors");
const spriteUtils_1 = require("../../../client/spriteUtils");
const icons_1 = require("../../../client/icons");
const sprites = require("../../../generated/sprites");
const canvasUtils_1 = require("../../../client/canvasUtils");
const ponyInfo_1 = require("../../../common/ponyInfo");
const fonts_1 = require("../../../client/fonts");
const spriteFont_1 = require("../../../graphics/spriteFont");
const rect_1 = require("../../../common/rect");
const color_1 = require("../../../common/color");
let ToolsChat = class ToolsChat {
    constructor() {
        this.homeIcon = icons_1.faHome;
        this.starIcon = icons_1.faStar;
        this.messages = [
            { label: 'Chat message', color: colors_1.getMessageColor(0 /* Chat */) },
            { label: 'System message', color: colors_1.getMessageColor(1 /* System */) },
            { label: 'Admin message', color: colors_1.getMessageColor(2 /* Admin */) },
            { label: 'Mod message', color: colors_1.getMessageColor(3 /* Mod */) },
            { label: 'Announcement message', color: colors_1.getMessageColor(7 /* Announcement */) },
            { label: 'Party message', color: colors_1.getMessageColor(4 /* Party */) },
            { label: 'Thinking message', color: colors_1.getMessageColor(5 /* Thinking */) },
            { label: 'PartyThinking message', color: colors_1.getMessageColor(6 /* PartyThinking */) },
            { label: 'PartyAnnouncement message', color: colors_1.getMessageColor(8 /* PartyAnnouncement */) },
            // {
            // 	label: 'PartyAnnouncement msg ⚧', color: WHITE,
            // 	palette: () => mockPaletteManager.add([
            // 		TRANSPARENT,
            // 		ANNOUNCEMENT_COLOR,
            // 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
            // 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
            // 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
            // 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
            // 		PARTY_COLOR, ANNOUNCEMENT_COLOR,
            // 	]),
            // },
            // {
            // 	label: 'PartyAnnouncement msg ⚧', color: WHITE,
            // 	palette: () => mockPaletteManager.add([
            // 		TRANSPARENT,
            // 		ANNOUNCEMENT_COLOR,
            // 		ANNOUNCEMENT_COLOR, ANNOUNCEMENT_COLOR,
            // 		ANNOUNCEMENT_COLOR, ANNOUNCEMENT_COLOR,
            // 		ANNOUNCEMENT_COLOR, PARTY_COLOR,
            // 		PARTY_COLOR, PARTY_COLOR,
            // 		PARTY_COLOR, PARTY_COLOR,
            // 	]),
            // },
            // { label: 'Red message', color: getMessageColor(MessageType.Red) },
            // { label: 'Green message', color: getMessageColor(MessageType.Green) },
            // { label: 'Blue message', color: getMessageColor(MessageType.Blue) },
            { label: 'Supporter message 1', color: colors_1.getMessageColor(9 /* Supporter1 */) },
            { label: 'Supporter message 2', color: colors_1.WHITE, palette: p => p.supporter2 },
            { label: 'Supporter message 3', color: colors_1.WHITE, palette: p => p.supporter3 },
            { label: 'Whisper message', color: colors_1.WHISPER_COLOR },
        ];
        this.names = [
            { label: 'Regular name', color: colors_1.WHITE, font: () => fonts_1.fontPal },
            { label: 'Party name', color: colors_1.PARTY_COLOR, font: () => fonts_1.fontPal },
            { label: 'MODERATOR tag', color: colors_1.MOD_COLOR, font: () => fonts_1.fontSmallPal },
            { label: 'DEVELOPER tag', color: colors_1.ADMIN_COLOR, font: () => fonts_1.fontSmallPal },
            { label: 'SUPPORTER tag', color: colors_1.PATREON_COLOR, font: () => fonts_1.fontSmallPal },
            { label: 'HIDDEN tag', color: colors_1.ANNOUNCEMENT_COLOR, font: () => fonts_1.fontSmallPal },
        ];
        this.bg = colors_1.GRASS_COLOR;
        this.initialized = false;
    }
    ngAfterViewInit() {
        spriteUtils_1.loadAndInitSpriteSheets()
            .then(() => this.initialized = true)
            .then(() => this.redraw());
    }
    toggleBg() {
        this.bg = this.bg === colors_1.GRASS_COLOR ? 0x172e14ff : colors_1.GRASS_COLOR;
        this.redraw();
    }
    redraw() {
        if (!this.initialized)
            return;
        const canvas1 = contextSpriteBatch_1.drawCanvas(500, 400, sprites.paletteSpriteSheet, undefined, batch => {
            const palettes = graphicsUtils_1.createCommonPalettes(ponyInfo_1.mockPaletteManager);
            this.messages.forEach(({ label, color, palette }, index) => {
                const size = spriteFont_1.measureText(label, fonts_1.fontPal);
                const options = { palette: palette ? palette(palettes.mainFont) : palettes.mainFont.white };
                graphicsUtils_1.drawSpeechBaloon(batch, label, color, options, 10 + size.w / 2, 20 + 20 * index, size.w, size.h, 1, 5);
            });
            this.names.forEach(({ label, color, font }, index) => {
                const palette = font() === fonts_1.fontSmallPal ? palettes.smallFont.white : palettes.mainFont.white;
                spriteFont_1.drawOutlinedText(batch, label, font(), color, colors_1.OUTLINE_COLOR, 190, 10 + 15 * index, { palette });
            });
            // ---
            spriteFont_1.drawOutlinedText(batch, '<SUPPORTER>', fonts_1.fontSmallPal, colors_1.PATREON_COLOR, colors_1.OUTLINE_COLOR, 190, 120, { palette: palettes.smallFont.white });
            // names
            graphicsUtils_1.drawNamePlate(batch, 'Some name 1', 220, 150, graphicsUtils_1.DrawNameFlags.None, palettes, 'sup1');
            graphicsUtils_1.drawNamePlate(batch, 'Some name 2', 220, 175, graphicsUtils_1.DrawNameFlags.None, palettes, 'sup2');
            graphicsUtils_1.drawNamePlate(batch, 'Some name 3', 220, 200, graphicsUtils_1.DrawNameFlags.None, palettes, 'sup3');
            // speech baloons
            graphicsUtils_1.drawBaloon(batch, { message: 'regular baloon', type: 0 /* Chat */, created: 0 }, 50, 300, rect_1.rect(0, 0, 1000, 1000), palettes);
            graphicsUtils_1.drawBaloon(batch, { message: 'thinking baloon', type: 5 /* Thinking */, created: 0 }, 50, 330, rect_1.rect(0, 0, 1000, 1000), palettes);
            graphicsUtils_1.drawBaloon(batch, { message: 'whisper baloon', type: 13 /* Whisper */, created: 0 }, 50, 360, rect_1.rect(0, 0, 1000, 1000), palettes);
        });
        const canvas2 = contextSpriteBatch_1.drawCanvas(500, 400, sprites.paletteSpriteSheet, undefined, batch => {
            const emojiPalette = ponyInfo_1.mockPaletteManager.addArray(sprites.emojiPalette);
            for (let i = 0; i < sprites.emojiPal.length; i++) {
                const x = i % 10;
                const y = Math.floor(i / 10);
                batch.drawSprite(sprites.emojiPal[i].sprite, colors_1.WHITE, emojiPalette, 10 + x * 12, 10 + y * 12);
            }
            const palette = ponyInfo_1.mockPaletteManager.addArray(sprites.fontSupporter2Palette);
            spriteFont_1.drawText(batch, 'Lorem 🍎 ipsum', fonts_1.fontPal, colors_1.WHITE, 10, 150, { palette, emojiPalette });
            const palette1 = ponyInfo_1.mockPaletteManager.addArray(sprites.fontSupporter1Palette);
            spriteFont_1.drawText(batch, '<SUPPÓĄRTER>', fonts_1.fontSmallPal, colors_1.WHITE, 20, 180, { palette: palette1 });
            const palette2 = ponyInfo_1.mockPaletteManager.addArray(sprites.fontSupporter2Palette);
            spriteFont_1.drawText(batch, '<SUPPÓĄRTER>', fonts_1.fontSmallPal, colors_1.WHITE, 20, 195, { palette: palette2 });
            let palette3 = ponyInfo_1.mockPaletteManager.add([colors_1.TRANSPARENT, colors_1.RED, colors_1.BLUE, colors_1.ORANGE, colors_1.WHITE, colors_1.PURPLE, colors_1.BLACK, colors_1.GREEN, colors_1.CYAN, colors_1.YELLOW]);
            palette3 = ponyInfo_1.mockPaletteManager.addArray(sprites.fontSupporter3Palette);
            spriteFont_1.drawText(batch, '<SUPPÓĄ⚧RTER>', fonts_1.fontSmallPal, colors_1.WHITE, 20, 210, { palette: palette3 });
        });
        const canvas3 = contextSpriteBatch_1.drawCanvas(500, 400, sprites.paletteSpriteSheet, undefined, batch => {
            /* tslint:disable */
            const loremIpsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce scelerisque interdum scelerisque. Suspendisse malesuada, enim in viverra ornare, dui ex laoreet ipsum, at mollis orci felis vitae ipsum. In faucibus venenatis augue, ac ornare libero. Etiam vitae aliquet neque.';
            const text = spriteFont_1.lineBreak(loremIpsum, fonts_1.fontPal, 200);
            batch.drawRect(colors_1.WHITE, 10, 10, 200, 100);
            spriteFont_1.drawText(batch, text, fonts_1.fontPal, colors_1.BLACK, 10, 10);
            const bounds = rect_1.rect(10 + 200 + 20, 10, 200, 100);
            batch.drawRect(colors_1.WHITE, bounds.x, bounds.y, bounds.w, bounds.h);
            spriteFont_1.drawTextAligned(batch, text, fonts_1.fontPal, colors_1.BLACK, bounds, 1 /* Right */);
            const bounds2 = rect_1.rect(10 + 200 + 20, 10 + 120, 200, 20);
            batch.drawRect(colors_1.WHITE, bounds2.x, bounds2.y, bounds2.w, bounds2.h);
            spriteFont_1.drawTextAligned(batch, 'test text', fonts_1.fontPal, colors_1.BLACK, bounds2, 1 /* Right */);
        });
        const canvas = this.element.nativeElement;
        const context = canvas.getContext('2d');
        context.fillStyle = color_1.colorToCSS(this.bg);
        context.fillRect(0, 0, canvas.width, canvas.height);
        canvasUtils_1.disableImageSmoothing(context);
        context.save();
        context.scale(2, 2);
        context.drawImage(canvas1, 0, 0);
        context.drawImage(canvas2, 300, 0);
        context.drawImage(canvas3, 0, 400);
        context.restore();
    }
};
tslib_1.__decorate([
    core_1.ViewChild('canvas', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], ToolsChat.prototype, "element", void 0);
ToolsChat = tslib_1.__decorate([
    core_1.Component({
        selector: 'tools-chat',
        templateUrl: 'tools-chat.pug',
    })
], ToolsChat);
exports.ToolsChat = ToolsChat;
//# sourceMappingURL=tools-chat.js.map