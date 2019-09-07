import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import * as sprites from '../../../generated/sprites';
import { setPaletteManager } from '../../../common/mixins';
import { parseColor, colorToCSS } from '../../../common/color';
import { PaletteManager, releasePalette } from '../../../graphics/paletteManager';
import { drawCanvas } from '../../../graphics/contextSpriteBatch';
import { disableImageSmoothing } from '../../../client/canvasUtils';
import { SHADOW_COLOR, WHITE } from '../../../common/colors';
import { PaletteRenderable } from '../../../common/interfaces';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { faHome } from '../../../client/icons';

const BG = parseColor('lightgreen');
const DEFAULT_PALETTE = [0, 0xffffffff];
const paletteManager = new PaletteManager();
const defaultPalette = paletteManager.add(DEFAULT_PALETTE);

@Component({
	selector: 'tools-palette',
	templateUrl: 'tools-palette.pug',
})
export class ToolsPalette implements OnInit {
	readonly homeIcon = faHome;
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	scale = 3;
	sprites = Object.keys(sprites).filter(key => {
		const s = (sprites as any)[key] as any;
		return !!(s && s.color);
	});
	spriteName = '';
	palette = ['red', 'blue', 'orange', 'violet'].map(x => ({ original: x, current: x }));
	ngOnInit() {
		setPaletteManager(paletteManager);
		loadAndInitSpriteSheets().then(() => this.redraw());
	}
	spriteChanged() {
		this.redraw();
	}
	loadPalette() {
		const sprite = (sprites as any)[this.spriteName] as PaletteRenderable;

		if (sprite) {
			this.palette = Array.from(sprite.palettes![0]).map(colorToCSS).map(c => ({ original: c, current: c }));
		}

		this.redraw();
	}
	redraw() {
		const canvas = this.canvas.nativeElement as HTMLCanvasElement;
		const width = Math.ceil(canvas.width / this.scale);
		const height = Math.ceil(canvas.height / this.scale);

		const buffer = drawCanvas(width, height, sprites.paletteSpriteSheet, BG, batch => {
			const sprite = (sprites as any)[this.spriteName] as PaletteRenderable;

			if (sprite) {
				const palette = paletteManager.add(this.palette.map(x => parseColor(x.current)));

				const x = (width - (sprite.color!.w + sprite.color!.ox)) / 2;
				const y = (height - (sprite.color!.h + sprite.color!.oy)) / 2;

				console.log(x, y, width, sprite.color!.w, sprite.color!.ox);

				batch.drawSprite(sprite.shadow, SHADOW_COLOR, defaultPalette, x, y);
				batch.drawSprite(sprite.color, WHITE, palette, x, y);

				releasePalette(palette);
			}
		});

		const viewContext = canvas.getContext('2d')!;
		viewContext.save();
		disableImageSmoothing(viewContext);
		viewContext.scale(this.scale, this.scale);
		viewContext.drawImage(buffer, 0, 0);
		viewContext.restore();
	}
}
