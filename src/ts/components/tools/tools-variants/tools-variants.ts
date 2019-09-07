import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { PonyInfo, PonyState } from '../../../common/interfaces';
import { createCanvas, disableImageSmoothing } from '../../../client/canvasUtils';
import { toPalette, createDefaultPony, syncLockedPonyInfo } from '../../../common/ponyInfo';
import { defaultPonyState, defaultDrawPonyOptions } from '../../../client/ponyHelpers';
import { ContextSpriteBatch } from '../../../graphics/contextSpriteBatch';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { compressPonyString, decompressPony } from '../../../common/compressPony';
import { drawPony } from '../../../client/ponyDraw';
import { faHome } from '../../../client/icons';
import { paletteSpriteSheet } from '../../../generated/sprites';

@Component({
	selector: 'tools-variants',
	templateUrl: 'tools-variants.pug',
	styleUrls: ['tools-variants.scss'],
})
export class ToolsVariants implements OnInit {
	readonly homeIcon = faHome;
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	fields: string[];
	vertical: keyof PonyInfo = 'backMane';
	horizontal: keyof PonyInfo = 'mane';
	coat = 'red';
	hair = 'gold';
	justHead = false;
	scale = 2;
	private pony: PonyInfo = createDefaultPony();
	private state: PonyState = defaultPonyState();
	constructor() {
		this.fields = Object.keys(this.pony)
			.filter(key => {
				const value = (this.pony as any)[key];
				return value && value.type !== undefined;
			});
	}
	ngOnInit() {
		loadAndInitSpriteSheets()
			.then(() => this.redraw());
	}
	redraw() {
		this.draw();
	}
	private draw() {
		this.pony.coatFill = this.coat;
		this.pony.mane!.fills![0] = this.hair;
		syncLockedPonyInfo(this.pony);

		this.fields.forEach(f => (this.pony as any)[f].type = 0);
		(this.pony as any)[this.vertical].type = 999;
		(this.pony as any)[this.horizontal].type = 999;

		const fixed: any = decompressPony(compressPonyString(this.pony));
		const maxX = fixed[this.horizontal].type;
		const maxY = fixed[this.vertical].type;

		const scale = this.scale;
		const info = toPalette(this.pony);
		const buffer = createCanvas(80, 80);
		const batch = new ContextSpriteBatch(buffer);
		const options = defaultDrawPonyOptions();

		const canvas = this.canvas.nativeElement as HTMLCanvasElement;
		canvas.width = ((maxX + 1) * (this.justHead ? 45 : 60) + 10) * scale;
		canvas.height = ((maxY + 1) * (this.justHead ? 45 : 60) + 10) * scale;

		const viewContext = canvas.getContext('2d')!;
		viewContext.save();
		disableImageSmoothing(viewContext);
		viewContext.scale(scale, scale);

		viewContext.fillStyle = 'LightGreen';
		viewContext.fillRect(0, 0, canvas.width, canvas.height);

		for (let y = 0; y <= maxY; y++) {
			(info as any)[this.vertical].type = y;

			for (let x = 0; x <= maxX; x++) {
				batch.start(paletteSpriteSheet, 0);

				(info as any)[this.horizontal].type = x;

				drawPony(batch, info, this.state, 40, 60, options);

				batch.end();

				if (this.justHead) {
					viewContext.drawImage(buffer, 0, 0, 55, 45, x * 45 - 10, y * 45, 55, 45);
				} else {
					viewContext.drawImage(buffer, x * 60 - 10, y * 60);
				}
			}
		}

		viewContext.restore();
	}
}
