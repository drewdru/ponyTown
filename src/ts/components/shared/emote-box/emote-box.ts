import { Component, Input, AfterViewInit, ElementRef, ChangeDetectionStrategy, ViewChild, NgZone } from '@angular/core';
import { findEmoji, getEmojiImageAsync } from '../../../client/emoji';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { font } from '../../../client/fonts';
import { getCharacterSprite } from '../../../graphics/spriteFont';

@Component({
	selector: 'emote-box',
	template: '<img #image class="emote-box pixelart" />',
	styles: ['.emote-box { pointer-events: none; }'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmoteBox implements AfterViewInit {
	@ViewChild('image', { static: true }) image!: ElementRef;
	private emoteValue = '';
	private scaleValue = 2;
	private initialized = false;
	constructor(private zone: NgZone) {
	}
	ngAfterViewInit() {
		loadAndInitSpriteSheets()
			.then(() => {
				this.initialized = true;
				this.zone.runOutsideAngular(() => this.redraw());
			});
	}
	get emote() {
		return this.emoteValue;
	}
	@Input()
	set emote(value: string) {
		if (this.emoteValue !== value) {
			this.emoteValue = value;
			this.zone.runOutsideAngular(() => this.redraw());
		}
	}
	get scale() {
		return this.scaleValue;
	}
	@Input()
	set scale(value: number) {
		if (this.scaleValue !== value) {
			this.scaleValue = value;
			this.zone.runOutsideAngular(() => this.redraw());
		}
	}
	redraw() {
		if (this.initialized) {
			const emote = findEmoji(this.emote);
			const sprite = font && emote && getCharacterSprite(emote.symbol, font);
			const image = this.image.nativeElement as HTMLImageElement;

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

				getEmojiImageAsync(sprite, src => {
					image.src = src;
					image.alt = emote ? emote.symbol : '';
					image.style.visibility = 'visible';
				});
			} else {
				image.style.width = `0px`;
				image.style.height = `0px`;
				image.src = '';
				image.alt = '';
			}
		}
	}
}
