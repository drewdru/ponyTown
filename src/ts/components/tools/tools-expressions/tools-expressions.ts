import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { PonyInfo, PonyState } from '../../../common/interfaces';
import { toPalette, createDefaultPony, syncLockedPonyInfo } from '../../../common/ponyInfo';
import { defaultPonyState, defaultDrawPonyOptions } from '../../../client/ponyHelpers';
import { expressions } from '../../../common/expressions';
import { createCanvas, disableImageSmoothing, saveCanvas } from '../../../client/canvasUtils';
import { ContextSpriteBatch } from '../../../graphics/contextSpriteBatch';
import { RED } from '../../../common/colors';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { createBodyAnimation } from '../../../client/ponyAnimations';
import { drawPony } from '../../../client/ponyDraw';
import { faHome } from '../../../client/icons';
import { paletteSpriteSheet } from '../../../generated/sprites';

@Component({
	selector: 'tools-expressions',
	templateUrl: 'tools-expressions.pug',
})
export class ToolsExpressions implements OnInit {
	readonly homeIcon = faHome;
	scale = 2;
	columns = 12;
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	constructor() {
	}
	ngOnInit() {
		loadAndInitSpriteSheets()
			.then(() => this.redraw());
	}
	redraw() {
		this.draw();
	}
	png() {
		this.draw();
		saveCanvas(this.canvas.nativeElement, 'expressions.png');
	}
	private draw() {
		drawSheet(this.canvas.nativeElement, this.scale, this.columns);
	}
}

function drawSheet(canvas: HTMLCanvasElement, scale: number, columns: number, bg = 'lightgreen'): HTMLCanvasElement {
	const frameWidth = 55;
	const frameOffset = 50;
	const frameHeight = 30;
	const buffer = createCanvas(frameWidth, frameHeight);
	const batch = new ContextSpriteBatch(buffer);
	const pony = createPony();
	const state = createState();
	const info = toPalette(pony);
	const filteredExpressions = expressions.filter(([, expr]) => !!expr).slice(2);
	const rows = Math.ceil(filteredExpressions.length / columns);
	const options = defaultDrawPonyOptions();

	canvas.width = ((frameOffset * (columns - 1)) + frameWidth) * scale;
	canvas.height = (frameHeight * rows) * scale;

	const viewContext = canvas.getContext('2d')!;
	viewContext.save();
	disableImageSmoothing(viewContext);
	viewContext.scale(scale, scale);

	if (bg) {
		viewContext.fillStyle = bg;
		viewContext.fillRect(0, 0, canvas.width, canvas.height);
	}

	viewContext.font = 'normal 6px monospace';
	viewContext.textAlign = 'right';
	viewContext.fillStyle = 'black';

	filteredExpressions.forEach(([name, [right, left, muzzle, rightIris = 0, leftIris = 0, extra = 0]]: any, i) => {
		state.expression = { right, left, muzzle, rightIris, leftIris, extra };

		batch.start(paletteSpriteSheet, 0);
		drawPony(batch, info, state, 35, 50, options);
		batch.end();

		const x = (i % columns) * frameOffset;
		const y = Math.floor(i / columns) * frameHeight;

		viewContext.drawImage(buffer, x, y);
		viewContext.fillText(name, x + 18, y + 20);
	});

	viewContext.restore();
	return canvas;
}

function createState(): PonyState {
	const state = defaultPonyState();
	state.blushColor = RED;
	state.animation = createBodyAnimation('', 24, false, [[0, 1]]);
	return state;
}

function createPony(): PonyInfo {
	const pony = createDefaultPony();
	pony.mane!.type = 0;
	pony.backMane!.type = 0;
	pony.tail!.type = 0;
	pony.coatFill = 'dec078';
	pony.lockCoatOutline = true;
	pony.lockBackLegAccessory = false;
	pony.eyeColorRight = 'cornflowerblue';
	return syncLockedPonyInfo(pony);
}
