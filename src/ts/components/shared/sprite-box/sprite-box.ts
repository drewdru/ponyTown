import {
	Component, Input, AfterViewInit, ViewChild, ElementRef, NgZone, DoCheck, IterableDiffers, IterableDiffer, OnChanges
} from '@angular/core';
import { Rect, Sprite, ColorExtra, Palette } from '../../../common/interfaces';
import { parseColor, colorToCSS } from '../../../common/color';
import { mockPaletteManager, toColorList, getColorsFromSet } from '../../../common/ponyInfo';
import { ContextSpriteBatch } from '../../../graphics/contextSpriteBatch';
import { createCanvas, disableImageSmoothing, resizeCanvas } from '../../../client/canvasUtils';
import { WHITE } from '../../../common/colors';
import { rect } from '../../../common/rect';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { faTimes } from '../../../client/icons';
import { paletteSpriteSheet } from '../../../generated/sprites';

let redrawFrame = 0;
const forRedraw: SpriteBox[] = [];

function drawAll() {
	redrawFrame = 0;
	forRedraw.forEach(box => box.draw());
	forRedraw.length = 0;
}

@Component({
	selector: 'sprite-box',
	templateUrl: 'sprite-box.pug',
	styleUrls: ['sprite-box.scss'],
})
export class SpriteBox implements AfterViewInit, OnChanges, DoCheck {
	readonly debug = DEVELOPMENT;
	readonly noneIcon = faTimes;
	@Input() size = 52;
	@Input() scale = 2;
	@Input() x = 0;
	@Input() y = 0;
	@Input() center = true;
	@Input() index?: number;
	@Input() sprite?: ColorExtra;
	@Input() palette?: Palette;
	@Input() fill?: string[] | string;
	@Input() outline?: string[] | string;
	@Input() reverseExtra?: boolean;
	@Input() timestamp: any;
	@Input() invisible = false;
	@Input() darken = true;
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	private _circle?: string;
	private fillDiffer: IterableDiffer<string>;
	private outlineDiffer: IterableDiffer<string>;
	private batch?: ContextSpriteBatch;
	constructor(private zone: NgZone, iterableDiffers: IterableDiffers) {
		this.fillDiffer = iterableDiffers.find([]).create<string>();
		this.outlineDiffer = iterableDiffers.find([]).create<string>();
	}
	@Input() get circle() {
		return this._circle;
	}
	set circle(value) {
		this._circle = colorToCSS(parseColor(value || ''));
	}
	ngAfterViewInit() {
		loadAndInitSpriteSheets().then(() => this.redraw());
	}
	ngDoCheck() {
		const fillChanges = this.fill && Array.isArray(this.fill) && this.fillDiffer.diff(this.fill);
		const outlineChanges = this.outline && Array.isArray(this.outline) && this.outlineDiffer.diff(this.outline);

		if (fillChanges || outlineChanges) {
			this.redraw();
		}
	}
	ngOnChanges() {
		this.redraw();
	}
	private redraw() {
		if (!redrawFrame) {
			this.zone.runOutsideAngular(() => redrawFrame = requestAnimationFrame(drawAll));
		}

		if (forRedraw.indexOf(this) === -1) {
			forRedraw.push(this);
		}
	}
	draw() {
		const size = this.size;
		const scale = this.scale;
		const canvas = this.canvas.nativeElement as HTMLCanvasElement;

		if (!size || this.invisible)
			return;

		if (canvas.width !== size || canvas.height !== size) {
			canvas.width = size;
			canvas.height = size;
		}

		const context = canvas.getContext('2d');

		if (!context)
			return;

		context.save();
		context.clearRect(0, 0, canvas.width, canvas.height);

		const sprite = this.sprite;

		if (sprite) {
			if (this.circle) {
				context.fillStyle = this.circle;
				context.beginPath();
				context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 3, 0, Math.PI * 2);
				context.fill();
			}

			const bufferSize = size / scale;
			const batch = this.batch = this.batch || new ContextSpriteBatch(createCanvas(bufferSize, bufferSize));
			resizeCanvas(batch.canvas, bufferSize, bufferSize);

			const fills = Array.isArray(this.fill) ? this.fill : [this.fill];
			const outlines = Array.isArray(this.outline) ? this.outline : [this.outline];
			const paletteColors = toColorList(getColorsFromSet({ fills, outlines }, '000000', this.darken));
			const palette = mockPaletteManager.addArray(paletteColors);
			const extraPalette = sprite.palettes && mockPaletteManager.addArray(sprite.palettes[0]);

			let x = this.x;
			let y = this.y;

			if (this.center) {
				const bounds = rect(0, 0, 0, 0);
				addRect(bounds, sprite.color);
				addRect(bounds, sprite.extra);

				if (sprite.colorMany) {
					sprite.colorMany.forEach(c => addRect(bounds, c));
				}

				x = Math.round((bufferSize - bounds.w) / 2 - bounds.x);
				y = Math.round((bufferSize - bounds.h) / 2 - bounds.y);
			}

			batch.start(paletteSpriteSheet, 0);

			if (this.reverseExtra) {
				batch.drawSprite(sprite.extra, WHITE, extraPalette, x, y);
			}

			if (sprite.colorMany) {
				for (const color of sprite.colorMany) {
					batch.drawSprite(color, WHITE, palette, x, y);
				}
			} else {
				batch.drawSprite(sprite.color, WHITE, palette, x, y);
			}

			if (!this.reverseExtra) {
				batch.drawSprite(sprite.extra, WHITE, extraPalette, x, y);
			}

			batch.end();

			disableImageSmoothing(context);
			context.scale(scale, scale);
			context.drawImage(batch.canvas, 0, 0);
		}

		context.restore();
	}
}

function addRect(rect: Rect, sprite: Sprite | undefined) {
	if (sprite && sprite.w && sprite.h) {
		if (rect.w === 0 || rect.h === 0) {
			rect.x = sprite.ox;
			rect.y = sprite.oy;
			rect.w = sprite.w;
			rect.h = sprite.h;
		} else {
			const x = Math.min(rect.x, sprite.ox);
			const y = Math.min(rect.y, sprite.oy);
			rect.w = Math.max(rect.x + rect.w, sprite.ox + sprite.w) - x;
			rect.h = Math.max(rect.y + rect.h, sprite.oy + sprite.h) - y;
			rect.x = x;
			rect.y = y;
		}
	}
}
