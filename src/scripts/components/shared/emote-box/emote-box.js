"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@angular/core");
const emoji_1 = require("../../../client/emoji");
const spriteUtils_1 = require("../../../client/spriteUtils");
const fonts_1 = require("../../../client/fonts");
const spriteFont_1 = require("../../../graphics/spriteFont");
let EmoteBox = class EmoteBox {
    constructor(zone) {
        this.zone = zone;
        this.emoteValue = '';
        this.scaleValue = 2;
        this.initialized = false;
    }
    ngAfterViewInit() {
        spriteUtils_1.loadAndInitSpriteSheets()
            .then(() => {
            this.initialized = true;
            this.zone.runOutsideAngular(() => this.redraw());
        });
    }
    get emote() {
        return this.emoteValue;
    }
    set emote(value) {
        if (this.emoteValue !== value) {
            this.emoteValue = value;
            this.zone.runOutsideAngular(() => this.redraw());
        }
    }
    get scale() {
        return this.scaleValue;
    }
    set scale(value) {
        if (this.scaleValue !== value) {
            this.scaleValue = value;
            this.zone.runOutsideAngular(() => this.redraw());
        }
    }
    redraw() {
        if (this.initialized) {
            const emote = emoji_1.findEmoji(this.emote);
            const sprite = fonts_1.font && emote && spriteFont_1.getCharacterSprite(emote.symbol, fonts_1.font);
            const image = this.image.nativeElement;
            if (sprite) {
                const width = sprite.w + sprite.ox;
                const height = 10; // sprite.h + sprite.oy;
                image.style.width = `${width * this.scale}px`;
                image.style.height = `${height * this.scale}px`;
                image.style.marginTop = `${-this.scale}px`;
                image.style.display = 'inline-block';
                image.style.visibility = 'hidden';
                if (emote) {
                    image.setAttribute('aria-label', emote.names[0]);
                }
                emoji_1.getEmojiImageAsync(sprite, src => {
                    image.src = src;
                    image.alt = emote ? emote.symbol : '';
                    image.style.visibility = 'visible';
                });
            }
            else {
                image.style.width = `0px`;
                image.style.height = `0px`;
                image.src = '';
                image.alt = '';
            }
        }
    }
};
tslib_1.__decorate([
    core_1.ViewChild('image', { static: true }),
    tslib_1.__metadata("design:type", core_1.ElementRef)
], EmoteBox.prototype, "image", void 0);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", String),
    tslib_1.__metadata("design:paramtypes", [String])
], EmoteBox.prototype, "emote", null);
tslib_1.__decorate([
    core_1.Input(),
    tslib_1.__metadata("design:type", Number),
    tslib_1.__metadata("design:paramtypes", [Number])
], EmoteBox.prototype, "scale", null);
EmoteBox = tslib_1.__decorate([
    core_1.Component({
        selector: 'emote-box',
        template: '<img #image class="emote-box pixelart" />',
        styles: ['.emote-box { pointer-events: none; }'],
        changeDetection: core_1.ChangeDetectionStrategy.OnPush,
    }),
    tslib_1.__metadata("design:paramtypes", [core_1.NgZone])
], EmoteBox);
exports.EmoteBox = EmoteBox;
//# sourceMappingURL=emote-box.js.map