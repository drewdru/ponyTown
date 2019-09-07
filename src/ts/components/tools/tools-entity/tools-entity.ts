import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { findLastIndex, compact } from 'lodash';
import { removeItem, containsPoint, isKeyEventInvalid, cloneDeep, att } from '../../../common/utils';
import * as sprites from '../../../generated/sprites';
import { setPaletteManager, pickable, getRenderableBounds, createPalette } from '../../../common/mixins';
import { parseColor, withAlphaFloat } from '../../../common/color';
import { PaletteManager, releasePalette } from '../../../graphics/paletteManager';
import { PaletteSpriteBatch, Rect, PaletteRenderable, Dict, Entity, EntityPart, DrawOptions } from '../../../common/interfaces';
import { SHADOW_COLOR, WHITE, BLACK, TRANSPARENT, RED, ORANGE, PURPLE } from '../../../common/colors';
import { Key } from '../../../client/input/input';
import { drawOutline } from '../../../graphics/graphicsUtils';
import { drawCanvas, ContextSpriteBatch } from '../../../graphics/contextSpriteBatch';
import { loadAndInitSpriteSheets } from '../../../client/spriteUtils';
import { AgDragEvent } from '../../shared/directives/agDrag';
import { faHome, faSave, faEraser, faTrash, faPlus, faCrosshairs } from '../../../client/icons';
import { StorageService } from '../../services/storageService';
import { mockPaletteManager, toPalette } from '../../../common/ponyInfo';
import { OFFLINE_PONY } from '../../../common/constants';
import { drawPony } from '../../../client/ponyDraw';
import { defaultPonyState, defaultDrawPonyOptions } from '../../../client/ponyHelpers';
import { createBaseEntity } from '../../../common/entities';
import { decompressPonyString } from '../../../common/compressPony';
import { disableImageSmoothing } from '../../../client/canvasUtils';
import { toScreenX, toScreenYWithZ } from '../../../common/positionUtils';

const COVER = parseColor('DeepSkyBlue');
const COLLIDER = ORANGE;
const PICKABLE = PURPLE;
const BG = parseColor('lightgreen');
const LINES = withAlphaFloat(BLACK, 0.1);
const SELECTION = withAlphaFloat(WHITE, 0.5);
const DEFAULT_PALETTE = [TRANSPARENT, WHITE];
const paletteManager = new PaletteManager();
const defaultPalette = paletteManager.add(DEFAULT_PALETTE);
const X = 128;
const Y = 190;

const colors: Dict<number> = {
	cover: COVER,
	collider: COLLIDER,
	pickable: PICKABLE,
};

interface BasePart {
	x: number;
	y: number;
}

interface BoundsPart extends BasePart {
	w: number;
	h: number;
}

interface SpritePart extends BasePart {
	type: 'sprite';
	sprite: string;
}

interface CoverPart extends BoundsPart {
	type: 'cover';
}

interface ColliderPart extends BoundsPart {
	type: 'collider';
}

interface PickablePart extends BasePart {
	type: 'pickable';
}

type Part = SpritePart | CoverPart | ColliderPart | PickablePart;

interface PartEntity {
	name: string;
	parts: Part[];
}

interface EntityData {
	parts?: Part[];
	entities?: PartEntity[];
}

@Component({
	selector: 'tools-entity',
	templateUrl: 'tools-entity.pug',
})
export class ToolsEntity implements OnInit {
	readonly homeIcon = faHome;
	readonly saveIcon = faSave;
	readonly eraserIcon = faEraser;
	readonly trashIcon = faTrash;
	readonly crosshairsIcon = faCrosshairs;
	readonly plusIcon = faPlus;
	@ViewChild('canvas', { static: true }) canvas!: ElementRef;
	scale = 2;
	name = '';
	drawCenter = true;
	drawSelection = true;
	drawHold = false;
	sprites = Object.keys(sprites).filter(key => {
		const s = (sprites as any)[key] as any;
		return !!(s && s.color);
	});
	selectedPart = -1;
	entities: PartEntity[] = [];
	parts: Part[] = [];
	pony = toPalette(decompressPonyString(OFFLINE_PONY), mockPaletteManager);
	private startX = 0;
	private startY = 0;
	constructor(private storage: StorageService) {
	}
	ngOnInit() {
		setPaletteManager(paletteManager);
		loadAndInitSpriteSheets().then(() => this.changed());

		const data = this.load();
		this.parts = compact(data.parts || [this.createSpritePart('apple')]);
		this.entities = compact(data.entities || []);
	}
	@HostListener('window:keydown', ['$event'])
	keydown(e: KeyboardEvent) {
		if (!isKeyEventInvalid(e) && this.handleKey(e.keyCode)) {
			e.preventDefault();
		}
	}
	handleKey(keyCode: number) {
		if (keyCode === Key.UP) {
			this.movePart(0, -1);
		} else if (keyCode === Key.DOWN) {
			this.movePart(0, 1);
		} else if (keyCode === Key.LEFT) {
			this.movePart(-1, 0);
		} else if (keyCode === Key.RIGHT) {
			this.movePart(1, 0);
		} else {
			return false;
		}

		return true;
	}
	mousedown(e: MouseEvent) {
		const canvas = this.canvas.nativeElement as HTMLCanvasElement;
		const { left, top } = canvas.getBoundingClientRect();
		const x = (e.pageX - left) / this.scale - X;
		const y = (e.pageY - top) / this.scale - Y;

		this.selectedPart = findLastIndex(this.parts, p => {
			if (this.drawHold) {
				return p.type === 'pickable';
			} else {
				const bounds = getBounds(p);
				return !!bounds && containsPoint(0, 0, bounds, x, y);
			}
		});

		this.changed();
	}
	drag({ dx, dy, type }: AgDragEvent) {
		const part = this.parts[this.selectedPart];

		if (part) {
			if (type === 'start') {
				this.startX = part.x;
				this.startY = part.y;
			}

			part.x = Math.round(this.startX + dx / this.scale);
			part.y = Math.round(this.startY + dy / this.scale);
		}

		this.changed();
	}
	setEntity(entity: PartEntity | null) {
		if (entity) {
			this.name = entity.name;
			this.parts = entity.parts;
		} else {
			this.name = '';
			this.parts = [];
		}

		this.changed();
	}
	saveEntity() {
		if (this.name) {
			const existing = this.entities.find(e => e.name === this.name);

			if (existing) {
				existing.parts = cloneDeep(this.parts);
			} else {
				this.entities.push({
					name: this.name,
					parts: cloneDeep(this.parts),
				});
			}

			this.changed();
		}
	}
	removeEntity() {
		removeItem(this.entities, this.entities.find(e => e.name === this.name));
		this.changed();
	}
	movePart(dx: number, dy: number) {
		const part = this.parts[this.selectedPart];

		if (part) {
			part.x += dx;
			part.y += dy;
		}

		this.changed();
	}
	changed() {
		requestAnimationFrame(() => this.redraw());
	}
	redraw() {
		const canvas = this.canvas.nativeElement as HTMLCanvasElement;
		const scale = this.scale;
		const width = Math.ceil(canvas.width / scale);
		const height = Math.ceil(canvas.height / scale);

		const draw = (batch: ContextSpriteBatch) => {
			if (this.drawCenter) {
				batch.drawRect(LINES, 0, Y, width, 1);
				batch.drawRect(LINES, X, 0, 1, height);
			}

			this.parts.forEach(p => drawPart(batch, p, X, Y));

			const part = this.parts[this.selectedPart] as Part | undefined;

			if (part) {
				const bounds = getBounds(part);

				if (this.drawSelection && bounds) {
					const sx = X + bounds.x;
					const sy = Y + bounds.y;
					drawOutline(batch, SELECTION, sx - 1, sy - 1, bounds.w + 2, bounds.h + 2);
				}
			}

			if (this.drawCenter) {
				batch.drawRect(RED, X, Y, 1, 1);
			}
		};

		const buffer = drawCanvas(width, height, sprites.paletteSpriteSheet, BG, batch => {
			if (this.drawHold) {
				const spritePart = this.parts.find(p => p.type === 'sprite') as SpritePart | undefined;
				const pickablePart = this.parts.find(p => p.type === 'pickable') as PickablePart | undefined;

				const holding: Entity | undefined = spritePart && pickablePart && getSprite(spritePart.sprite) ? {
					...createBaseEntity(0, 0, 0, 0),
					...drawMixin(getSprite(spritePart.sprite), -spritePart.x, -spritePart.y),
					...pickable(pickablePart.x, pickablePart.y),
				} : undefined;

				const state = { ...defaultPonyState(), holding };
				drawPony(batch, this.pony, state, X, Y, defaultDrawPonyOptions());
			} else {
				draw(batch);
			}
		});

		drawBufferScaled(canvas, buffer, scale);

		this.save();
	}
	createSpritePart(sprite: string): SpritePart {
		return {
			type: 'sprite',
			sprite,
			x: 0,
			y: 0,
		};
	}
	createBoundsPart(type: any): CoverPart {
		return {
			type,
			x: 0,
			y: 0,
			w: 10,
			h: 10,
		};
	}
	createPart(type: string): Part {
		switch (type) {
			case 'sprite':
				return this.createSpritePart('apple');
			case 'cover':
			case 'collider':
				return this.createBoundsPart(type);
			case 'pickable':
				return { type, x: 0, y: 0 };
			default:
				throw new Error(`Invalid type (${type})`);
		}
	}
	addPart(type: string) {
		this.parts.push(this.createPart(type));
		this.changed();
	}
	removePart(part: Part) {
		removeItem(this.parts, part);
		this.changed();
	}
	centerPart(part: Part) {
		if (part.type === 'sprite') {
			const sprite = getSprite(part.sprite);
			const color = sprite && sprite.color;

			if (color) {
				part.x = Math.round(-color.ox - color.w / 2);
				part.y = Math.round(-color.oy - color.h / 2);
			}
		}

		this.changed();
	}
	private save() {
		this.storage.setJSON('tools-entity', <EntityData>{
			parts: this.parts,
			entities: this.entities,
		});
	}
	private load() {
		return this.storage.getJSON<EntityData>('tools-entity', {});
	}
}

function getBounds(part: Part): Rect | undefined {
	if (part.type === 'sprite') {
		const sprite = getSprite(part.sprite);
		const color = sprite && sprite.color;

		if (color) {
			return {
				x: part.x + color.ox,
				y: part.y + color.oy,
				w: color.w,
				h: color.h,
			};
		}
	} else if (part.type === 'cover' || part.type === 'collider') {
		return part;
	}

	return undefined;
}

function getSprite(name: string): PaletteRenderable {
	return (sprites as any)[name];
}

function drawSpritePart(batch: PaletteSpriteBatch, part: SpritePart, px: number, py: number) {
	const sprite = getSprite(part.sprite);

	if (!sprite)
		return;

	const x = px + part.x;
	const y = py + part.y;
	const palette = paletteManager.addArray(sprite.palettes![0]);

	sprite.shadow && batch.drawSprite(sprite.shadow, SHADOW_COLOR, defaultPalette, x, y);
	sprite.color && batch.drawSprite(sprite.color, WHITE, palette, x, y);

	releasePalette(palette);
}

function drawPart(batch: PaletteSpriteBatch, part: Part, x: number, y: number) {
	if (part.type === 'sprite') {
		return drawSpritePart(batch, part, x, y);
	} else if (part.type === 'cover' || part.type === 'collider') {
		return drawOutline(batch, colors[part.type], part.x + x, part.y + y, part.w, part.h);
	} else if (part.type === 'pickable') {
		return drawOutline(batch, colors[part.type], part.x + x, part.y + y, 1, 1);
	} else {
		throw new Error(`Invalid part type (${(part as any).type})`);
	}
}

function drawBufferScaled(canvas: HTMLCanvasElement, buffer: HTMLCanvasElement, scale: number) {
	const context = canvas.getContext('2d')!;
	context.save();
	disableImageSmoothing(context);
	context.scale(scale, scale);
	context.drawImage(buffer, 0, 0);
	context.restore();
}

function drawMixin(sprite: PaletteRenderable, dx: number, dy: number, paletteIndex = 0): EntityPart {
	const bounds = getRenderableBounds(sprite, dx, dy);

	if (SERVER && !TESTS)
		return { bounds };

	const defaultPalette = sprite.shadow && createPalette(sprites.defaultPalette);
	const palette = createPalette(att(sprite.palettes, paletteIndex));

	return {
		bounds,
		draw(this: Entity, batch: PaletteSpriteBatch, options: DrawOptions) {
			const x = toScreenX(this.x + (this.ox || 0)) - dx;
			const y = toScreenYWithZ(this.y + (this.oy || 0), this.z + (this.oz || 0)) - dy;
			const opacity = 1 - 0.6 * (this.coverLifting || 0);

			if (sprite.shadow !== undefined) {
				batch.drawSprite(sprite.shadow, options.shadowColor, defaultPalette, x, y);
			}

			batch.globalAlpha = opacity;

			if (sprite.color !== undefined) {
				batch.drawSprite(sprite.color, WHITE, palette, x, y);
			}

			batch.globalAlpha = 1;
		},
		palettes: compact([defaultPalette, palette]),
	};
}
