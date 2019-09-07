import {
	Component, Input, AfterViewInit, OnChanges, ElementRef, ChangeDetectionStrategy, ViewChild, NgZone
} from '@angular/core';
import { PalettePonyInfo } from '../../../common/interfaces';
import { ContextSpriteBatch } from '../../../graphics/contextSpriteBatch';
import { createCanvas, disableImageSmoothing, getPixelRatio, resizeCanvasWithRatio } from '../../../client/canvasUtils';
import { defaultDrawPonyOptions, defaultPonyState } from '../../../client/ponyHelpers';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { drawPony } from '../../../client/ponyDraw';
import { paletteSpriteSheet } from '../../../generated/sprites';

const scales: { [key: string]: number } = {
	large: 3,
	medium: 2,
	small: 1,
};

const sizes: { [key: string]: number } = {
	large: 100,
	medium: 66,
	small: 33,
};

const BUFFER_SIZE = 34;
const options = defaultDrawPonyOptions();
const state = defaultPonyState();

@Component({
	selector: 'portrait-box',
	templateUrl: 'portrait-box.pug',
	styleUrls: ['portrait-box.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortraitBox implements AfterViewInit, OnChanges {
	@Input() noBorder = false;
	@Input() flip = false;
	@Input() size = 'large';
	@Input() pony: PalettePonyInfo | undefined = undefined;
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	private frame = 0;
	private batch?: ContextSpriteBatch;
	constructor(private zone: NgZone) {
	}
	ngAfterViewInit() {
		loadAndInitSpriteSheets()
			.then(() => this.redraw());
	}
	ngOnChanges() {
		this.redraw();
	}
	private redraw() {
		this.frame = this.frame || this.zone.runOutsideAngular(() => requestAnimationFrame(() => {
			this.frame = 0;
			this.draw();
		}));
	}
	private draw() {
		const canvas = this.canvas.nativeElement as HTMLCanvasElement;
		const size = sizes[this.size];
		resizeCanvasWithRatio(canvas, size, size);

		const context = canvas.getContext('2d');

		if (context) {
			context.save();
			context.fillStyle = '#444';
			context.fillRect(0, 0, canvas.width, canvas.height);

			if (this.pony) {
				const scale = scales[this.size] * getPixelRatio();
				this.batch = this.batch || new ContextSpriteBatch(createCanvas(BUFFER_SIZE, BUFFER_SIZE));
				options.flipped = !this.flip;

				this.batch.start(paletteSpriteSheet, 0);
				drawPony(this.batch, this.pony, state, 25, 54, options);
				this.batch.end();

				disableImageSmoothing(context);
				context.scale(this.flip ? scale : -scale, scale);
				context.drawImage(this.batch.canvas, this.flip ? 0 : -BUFFER_SIZE, 0);
			}

			context.restore();
		}
	}
}
