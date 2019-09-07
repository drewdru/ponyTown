import { clamp } from 'lodash';
import * as sprites from '../generated/sprites';
import {
	EntityPart, Sprite, Rect, SpriteBatch, PaletteManager, Palette, PaletteRenderable, PaletteSpriteBatch,
	DrawOptions, getAnimationFromEntityState, EntityState, SignEntityOptions, EntityFlags, Collider, MixinEntity,
	Season,
} from './interfaces';
import { at, att, hasFlag, invalidEnum } from './utils';
import { WHITE, BLACK, RED } from './colors';
import { toScreenX, toWorldX, toWorldY, toScreenYWithZ } from './positionUtils';
import { rect, addRects, addRect } from './rect';
import { SECOND } from './constants';
import { mockPaletteManager } from './ponyInfo';
import { releasePalette } from '../graphics/paletteManager';

interface Renderable {
	color?: Sprite;
	shadow?: Sprite;
}

export interface AnimatedRenderable {
	frames: Sprite[];
	shadow?: Sprite;
	palette: Uint32Array;
}

export interface AnimatedRenderable1 {
	frames: (Sprite | undefined)[];
}

const predefinedSteps = [
	[],
	[1],
	[3, 1],
	[3, 2, 1],
	[4, 2, 1, 1],
	[5, 3, 2, 1, 1],
	[9, 5, 3, 2, 1, 1],
	[14, 9, 5, 3, 2, 1, 1],
];

let paletteManager: PaletteManager | undefined;

export function createPalette(palette: Uint32Array | undefined): Palette | undefined {
	return palette && paletteManager && paletteManager.addArray(palette);
}

export function setPaletteManager(manager: PaletteManager | undefined) {
	paletteManager = manager;
}

export function fakePaletteManager<T>(action: () => T): T {
	const tempPaletteManager = paletteManager;
	paletteManager = mockPaletteManager;
	const result = action();
	paletteManager = tempPaletteManager;
	return result;
}

function getBounds(sprite: Sprite | undefined, ox: number, oy: number): Rect {
	return sprite ? rect(sprite.ox + ox, sprite.oy + oy, sprite.w, sprite.h) : rect(0, 0, 0, 0);
}

export function getRenderableBounds({ color, shadow }: Renderable, dx: number, dy: number): Rect {
	if (color && shadow) {
		return addRects(getBounds(color, -dx, -dy), getBounds(shadow, -dx, -dy));
	} else if (color) {
		return getBounds(color, -dx, -dy);
	} else if (shadow) {
		return getBounds(shadow, -dx, -dy);
	} else {
		return rect(0, 0, 0, 0);
	}
}

function getBoundsForFrames(frames: (Sprite | undefined)[], dx: number, dy: number) {
	return frames.reduce((bounds, f) => f ? addRects(bounds, getBounds(f, dx, dy)) : bounds, rect(0, 0, 0, 0));
}

export function pickable(pickableX: number, pickableY: number): EntityPart {
	return { pickableX, pickableY };
}

export function mixPickable(pickableX: number, pickableY: number): MixinEntity {
	return base => {
		base.pickableX = pickableX;
		base.pickableY = pickableY;
	};
}

export function mixTrigger(tileX: number, tileY: number, tileW: number, tileH: number, tall: boolean): MixinEntity {
	const x = toWorldX(tileX);
	const y = toWorldY(tileY);
	const w = toWorldX(tileW);
	const h = toWorldY(tileH);
	const bounds = rect(x, y, w, h);

	return base => {
		base.triggerBounds = bounds;
		base.triggerTall = tall;
		base.triggerOn = false;
	};
}

export function collider(x: number, y: number, w: number, h: number, tall = true, exact = false): Collider {
	return { x, y, w, h, tall, exact };
}

export const ponyColliders = roundedColliderList(-12, -4, 25, 7, 2);
export const ponyCollidersBounds = getColliderBounds(ponyColliders);

function getColliderBounds(colliders: Collider[]) {
	const bounds = rect(0, 0, 0, 0);

	for (const collider of colliders) {
		addRect(bounds, collider);
	}

	return bounds;
}

function roundedColliderList(x: number, y: number, w: number, h: number, stepsCount: number, tall = true) {
	const list: Collider[] = [];
	const steps = predefinedSteps[stepsCount];

	if (DEVELOPMENT && !steps) {
		console.error('Invalid step count', steps);
	}

	for (let i = 0; i < steps.length; i++) {
		list.push(collider(x + steps[i], y + i, w - steps[i] * 2, 1, tall));
	}

	list.push(collider(x, y + steps.length, w, h - steps.length * 2, tall));

	for (let i = 0; i < steps.length; i++) {
		const ii = steps.length - (i + 1);
		list.push(collider(x + steps[ii], y + h - steps.length + i, w - steps[ii] * 2, 1, tall));
	}

	return list;
}

export function mixColliderRect(x: number, y: number, w: number, h: number, tall = true, exact = false): MixinEntity {
	return mixColliders(collider(x, y, w, h, tall, exact));
}

export function mixColliderRounded(x: number, y: number, w: number, h: number, stepsCount: number, tall = true): MixinEntity {
	return mixColliders(...roundedColliderList(x, y, w, h, stepsCount, tall));
}

export function mixColliders(...list: Collider[]): MixinEntity {
	const bounds = getColliderBounds(list);

	return base => {
		base.flags |= EntityFlags.CanCollideWith;
		base.colliders = list;
		base.collidersBounds = bounds;
	};
}

export function taperColliderSE(x: number, y: number, w: number, h: number, tall?: boolean) {
	const colliders: Collider[] = [];

	for (let iy = 0, ix = w - 2; iy < h; iy++ , ix -= ((iy % 3) ? 1 : 2)) {
		colliders.push(collider(x + ix, y + iy, w - ix, 1, tall));
	}

	return colliders;
}

export function taperColliderSW(x: number, y: number, w: number, h: number, tall?: boolean) {
	const colliders: Collider[] = [];

	for (let iy = 0, ix = w - 2; iy < h; iy++ , ix -= ((iy % 3) ? 1 : 2)) {
		colliders.push(collider(x, y + iy, w - ix, 1, tall));
	}

	return colliders;
}

export function taperColliderNW(x: number, y: number, w: number, h: number, tall?: boolean) {
	const colliders: Collider[] = [];

	for (let iy = 0, ix = 2; iy < h; iy++ , ix += ((iy % 3) ? 1 : 2)) {
		colliders.push(collider(x, y + iy, w - ix, 1, tall));
	}

	return colliders;
}

export function taperColliderNE(x: number, y: number, w: number, h: number, tall?: boolean) {
	const colliders: Collider[] = [];

	for (let iy = 0, ix = 2; iy < h; iy++ , ix += ((iy % 3) ? 1 : 2)) {
		colliders.push(collider(x + ix, y + iy, w - ix, 1, tall));
	}

	return colliders;
}

export function skewColliderNW(x: number, y: number, w: number, h: number, tall?: boolean) {
	const colliders: Collider[] = [];

	for (let iy = 0, ix = 2; iy < h; iy++ , ix += ((iy % 3) ? 1 : 2)) {
		colliders.push(collider(x - ix, y + iy, w, 1, tall));
	}

	return colliders;
}

export function skewColliderNE(x: number, y: number, w: number, h: number, tall?: boolean) {
	const colliders: Collider[] = [];

	for (let iy = 0, ix = 2; iy < h; iy++ , ix += ((iy % 3) ? 1 : 2)) {
		colliders.push(collider(x + ix, y + iy, w, 1, tall));
	}

	return colliders;
}

export function triangleColliderNW(x: number, y: number, w: number, h: number, tall?: boolean) {
	const colliders: Collider[] = [];

	for (let iy = 0, ix = 2; iy < h; iy++ , ix += ((iy % 3) ? 1 : 2)) {
		colliders.push(collider(x - ix, y + iy, w + ix, 1, tall));
	}

	return colliders;
}

export function triangleColliderNE(x: number, y: number, w: number, h: number, tall?: boolean) {
	const colliders: Collider[] = [];

	for (let iy = 0, ix = 2; iy < h; iy++ , ix += ((iy % 3) ? 1 : 2)) {
		colliders.push(collider(x, y + iy, w + ix, 1, tall));
	}

	return colliders;
}

export function mixInteract(x: number, y: number, w: number, h: number, interactRange?: number): MixinEntity {
	const interactBounds = rect(x, y, w, h);

	return base => {
		base.flags |= EntityFlags.Interactive;
		base.interactBounds = interactBounds;
		base.interactRange = interactRange;
	};
}

export function mixInteractAt(interactRange?: number): MixinEntity {
	return base => {
		base.flags |= EntityFlags.Interactive;
		base.interactRange = interactRange;
	};
}

export function mixMinimap(color: number, rect: Rect, order = 1): MixinEntity {
	const minimap = { color, rect, order };
	return base => base.minimap = minimap;
}

export interface AnimatedMixinOptions {
	color?: number;
	repeat?: boolean;
	animations?: number[][];
	lightSprite?: AnimatedRenderable1;
	useGameTime?: boolean;
	flipped?: boolean;
}

export function mixAnimation(
	anim: AnimatedRenderable, fps: number, dx: number, dy: number,
	{ color = WHITE, repeat = true, animations, lightSprite, useGameTime, flipped = false }: AnimatedMixinOptions = {}
): MixinEntity {
	const bounds = getBoundsForFrames(anim.frames, -dx, -dy);
	const lightSpriteBounds = lightSprite ? getBoundsForFrames(lightSprite.frames, -dx, -dy) : rect(0, 0, 0, 0);

	if (SERVER && !TESTS) {
		return base => base.bounds = bounds;
	}

	return base => {
		const defaultPalette = anim.shadow && createPalette(sprites.defaultPalette);
		const palette = createPalette(anim.palette);

		let time = repeat ? Math.random() * 5 : 0;
		let animation = 0;
		let lastFrame = 0;

		const getFrame = (options: DrawOptions) => {
			let frameNumber = Math.floor(time * fps);

			if (useGameTime) {
				frameNumber = Math.floor((options.gameTime / 1000) * fps);
			}

			if (animations) {
				if (repeat) {
					frameNumber = frameNumber % animations[animation].length;
				}

				return at(animations[animation], frameNumber) || 0;
			} else {
				return repeat ? (frameNumber % anim.frames.length) : Math.min(frameNumber, anim.frames.length - 1);
			}
		};

		base.bounds = bounds;
		base.palettes = [];
		defaultPalette && base.palettes.push(defaultPalette);
		palette && base.palettes.push(palette);

		base.update = function (delta: number) {
			time += delta;

			const anim = getAnimationFromEntityState(this.state);

			if (animations && anim !== animation) {
				animation = anim;
				time = 0;
			}

			const frameNumber = Math.floor(time * fps);

			if (lastFrame !== frameNumber) {
				lastFrame = frameNumber;
				return true;
			} else {
				return false;
			}
		};

		base.draw = function (batch: PaletteSpriteBatch, options: DrawOptions) {
			const frame = getFrame(options);
			const frameSprite = anim.frames[frame];
			const x = toScreenX(this.x);
			const y = toScreenYWithZ(this.y, this.z);

			batch.save();
			batch.translate(x, y);

			if (hasFlag(this.state, EntityState.FacingRight) || flipped) {
				batch.scale(-1, 1);
			}

			batch.translate(-dx, -dy);
			anim.shadow && batch.drawSprite(anim.shadow, options.shadowColor, defaultPalette, 0, 0);
			frameSprite && batch.drawSprite(frameSprite, color, palette, 0, 0);
			batch.restore();
		};

		if (lightSprite) {
			base.lightSpriteColor = WHITE;
			base.lightSpriteBounds = lightSpriteBounds;
			base.drawLightSprite = function (batch, options) {
				const frame = getFrame(options);
				const frameSprite = lightSprite.frames[frame];
				const x = toScreenX(this.x);
				const y = toScreenYWithZ(this.y, this.z);

				batch.save();
				batch.translate(x, y);

				if (hasFlag(this.state, EntityState.FacingRight) || flipped) {
					batch.scale(-1, 1);
				}

				batch.translate(-dx, -dy);
				batch.drawSprite(frameSprite, this.lightSpriteColor!, 0, 0);
				batch.restore();
			};
		}
	};
}

export function mixDrawWindow(
	sprite: PaletteRenderable, dx: number, dy: number, paletteIndex: number,
	padLeft: number, padTop: number, padRight: number, padBottom: number,
): MixinEntity {
	const bounds = getRenderableBounds(sprite, dx, dy);

	return base => {
		base.bounds = bounds;

		if (!SERVER || TESTS) {
			const defaultPalette = sprite.shadow && createPalette(sprites.defaultPalette);
			const palette = createPalette(att(sprite.palettes, paletteIndex));
			base.palettes = [];
			defaultPalette && base.palettes.push(defaultPalette);
			palette && base.palettes.push(palette);

			base.draw = function (batch, options) {
				const baseX = toScreenX(this.x + (this.ox || 0));
				const baseY = toScreenYWithZ(this.y + (this.oy || 0), this.z + (this.oz || 0));
				const x = baseX - dx;
				const y = baseY - dy;

				if (sprite.shadow !== undefined) {
					batch.drawSprite(sprite.shadow, options.shadowColor, defaultPalette, x, y);
				}

				if (sprite.color !== undefined) {
					batch.drawRect(options.lightColor,
						x + padLeft, y + padTop, sprite.color.w - (padLeft + padRight), sprite.color.h - (padTop + padBottom));
					batch.drawSprite(sprite.color, WHITE, palette, x, y);
				}
			};
		}
	};
}

export function mixDraw(sprite: PaletteRenderable, dx: number, dy: number, paletteIndex = 0): MixinEntity {
	const bounds = getRenderableBounds(sprite, dx, dy);

	return base => {
		base.bounds = bounds;

		if (!SERVER || TESTS) {
			const defaultPalette = sprite.shadow && createPalette(sprites.defaultPalette);
			const palette = createPalette(att(sprite.palettes, paletteIndex));
			base.palettes = [];
			defaultPalette && base.palettes.push(defaultPalette);
			palette && base.palettes.push(palette);

			base.draw = function (batch: PaletteSpriteBatch, options: DrawOptions) {
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
			};
		}
	};
}

export interface MixDraw {
	sprite: PaletteRenderable;
	dx: number;
	dy: number;
	palette: number;
}

export interface MixDrawSeasonal {
	summer: MixDraw;
	autumn?: Partial<MixDraw>;
	winter?: Partial<MixDraw>;
	spring?: Partial<MixDraw>;
}

function addBounds(bounds: Rect, setup: MixDraw) {
	addRect(bounds, getRenderableBounds(setup.sprite, setup.dx, setup.dy));
}

export function mixDrawSeasonal(setup: MixDrawSeasonal): MixinEntity {
	const bounds = rect(0, 0, 0, 0);
	const summer = setup.summer;
	const autumn = { ...summer, ...setup.autumn };
	const winter = { ...summer, ...setup.winter };
	const spring = { ...summer, ...setup.spring };

	addBounds(bounds, summer);
	addBounds(bounds, autumn);
	addBounds(bounds, winter);
	addBounds(bounds, spring);

	return (base, _, worldState) => {
		base.bounds = bounds;

		if (!SERVER || TESTS) {
			let season = Season.Summer;
			let { sprite, dx, dy, palette: paletteIndex } = setup.summer;
			let defaultPalette: Palette | undefined = undefined;
			let palette: Palette | undefined = undefined;

			const setupSeason = (newSeason: Season) => {
				season = newSeason;
				let set: MixDraw;

				switch (season) {
					case Season.Summer:
						set = summer;
						break;
					case Season.Autumn:
						set = autumn;
						break;
					case Season.Winter:
						set = winter;
						break;
					case Season.Spring:
						set = spring;
						break;
					default:
						invalidEnum(season);
						return;
				}

				sprite = set.sprite;
				dx = set.dx;
				dy = set.dy;
				paletteIndex = set.palette;

				if (base.palettes) {
					for (const palette of base.palettes) {
						releasePalette(palette);
					}
				}

				defaultPalette = sprite.shadow && createPalette(sprites.defaultPalette);
				palette = createPalette(att(sprite.palettes, paletteIndex));
				base.palettes = [];
				defaultPalette && base.palettes.push(defaultPalette);
				palette && base.palettes.push(palette);
			};

			setupSeason(worldState.season);

			base.draw = function (batch: PaletteSpriteBatch, options: DrawOptions) {
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

				if (season !== options.season) {
					setupSeason(options.season);
				}
			};
		}
	};
}

function splitSprite(sprite: Sprite, x: number, w: number, h: number) {
	const result: Sprite[] = [];

	for (let y = 0; y < sprite.h; y += h) {
		result.push({ x: sprite.x + x, y: sprite.y + y, w, h, ox: sprite.ox, oy: sprite.oy, type: sprite.type });
	}

	return result;
}

const poles = [
	{ sprite: sprites.direction_pole_3, dy: -39 },
	{ sprite: sprites.direction_pole_4, dy: -50 },
	{ sprite: sprites.direction_pole_5, dy: -61 },
];

const shadowLeft = sprites.direction_shadow_left.shadow;
const shadowRight = sprites.direction_shadow_right.shadow;
const leftSprites = splitSprite(sprites.direction_left_right.color, 0, 17, 10);
const rightSprites = splitSprite(sprites.direction_left_right.color, 17, 17, 10);

const dirUpDown = [
	{
		shadowUp: sprites.direction_shadow_up_left.shadow,
		shadowDown: sprites.direction_shadow_down_right.shadow,
		spriteUp: sprites.direction_up_left.color,
		spriteDown: sprites.direction_down_right.color,
		shadowUpDX: -6, shadowUpDY: -9,
		shadowDownDX: -1, shadowDownDY: 3,
		upDX: -6, upDY: -7,
		downDX: -1, downDY: 5,
	},
	{
		shadowUp: sprites.direction_shadow_up_right.shadow,
		shadowDown: sprites.direction_shadow_down_left.shadow,
		spriteUp: sprites.direction_up_right.color,
		spriteDown: sprites.direction_down_left.color,
		shadowUpDX: 1, shadowUpDY: -9,
		shadowDownDX: -4, shadowDownDY: 3,
		upDX: 1, upDY: -7,
		downDX: -5, downDY: 4,
	},
];

export function mixDrawDirectionSign(): MixinEntity {
	const poleDX = -4;
	const leftDX = -20;
	const rightDX = 3;
	const plateDY = 2;
	const leftRightStep = 11;
	const upDownStep = 11;

	return (base, options = {}) => {
		const { sign: { r = 0, w = [], e = [], s = [], n = [] } = {} } = options as SignEntityOptions;
		const max = clamp(Math.max(w.length, e.length, s.length, n.length), 3, 5);
		const boundsH = 7 + max * 11;

		base.bounds = rect(-20, -boundsH, 40, boundsH);
		base.options = options;

		if (SERVER && !TESTS)
			return;

		const {
			shadowUp, shadowDown, spriteUp, spriteDown, upDX, upDY, downDX, downDY,
			shadowUpDX, shadowUpDY, shadowDownDX, shadowDownDY,
		} = dirUpDown[r];
		const leftShadow = !!w.length;
		const rightShadow = !!e.length;
		const upShadow = !!n.length;
		const downShadow = !!s.length;
		const pole = poles[max - 3];

		const defaultPalette = pole.sprite.shadow && createPalette(sprites.defaultPalette);
		const palette = createPalette(att(pole.sprite.palettes, 0));
		base.palettes = [];
		defaultPalette && base.palettes.push(defaultPalette);
		palette && base.palettes.push(palette);

		base.draw = function (batch, options) {
			const x = toScreenX(this.x);
			const y = toScreenYWithZ(this.y, this.z);

			batch.drawSprite(pole.sprite.shadow, options.shadowColor, defaultPalette, x + poleDX, y + pole.dy);
			leftShadow && batch.drawSprite(shadowLeft, options.shadowColor, defaultPalette, x - 18, y - 1);
			rightShadow && batch.drawSprite(shadowRight, options.shadowColor, defaultPalette, x + 4, y - 1);
			upShadow && batch.drawSprite(shadowUp, options.shadowColor, defaultPalette, x + shadowUpDX, y + shadowUpDY);
			downShadow && batch.drawSprite(shadowDown, options.shadowColor, defaultPalette, x + shadowDownDX, y + shadowDownDY);

			for (let i = n.length - 1; i >= 0; i--) {
				if (n[i] !== -1) {
					batch.drawSprite(spriteUp, WHITE, palette, x + upDX, y + pole.dy + upDY + i * upDownStep);
				}
			}

			batch.drawSprite(pole.sprite.color, WHITE, palette, x + poleDX, y + pole.dy);

			for (let i = 0; i < w.length; i++) {
				if (w[i] !== -1) {
					const sprite = leftSprites[w[i]];
					sprite && batch.drawSprite(sprite, WHITE, palette, x + leftDX, y + pole.dy + plateDY + i * leftRightStep);
				}
			}

			for (let i = 0; i < e.length; i++) {
				if (e[i] !== -1) {
					const sprite = rightSprites[e[i]];
					sprite && batch.drawSprite(rightSprites[e[i]], WHITE, palette, x + rightDX, y + pole.dy + plateDY + i * leftRightStep);
				}
			}

			for (let i = s.length - 1; i >= 0; i--) {
				if (s[i] !== -1) {
					batch.drawSprite(spriteDown, WHITE, palette, x + downDX, y + pole.dy + downDY + i * upDownStep);
				}
			}
		};
	};
}

export function mixLight(color: number, dx: number, dy: number, w: number, h: number): MixinEntity {
	return base => {
		if (!SERVER || TESTS) {
			base.lightOn = true;
			base.lightColor = color;
			base.lightScale = 1;
			base.lightTarget = 1;
			base.lightScaleAdjust = 1;
			base.lightBounds = rect(-(dx + w / 2), -(dy + h / 2), w, h);
			base.drawLight = function (batch: SpriteBatch) {
				if (!this.lightOn)
					return;

				const x = toScreenX(this.x);
				const y = toScreenYWithZ(this.y, this.z);
				const s = this.lightScale! * this.lightScaleAdjust!;
				const width = w * s;
				const height = h * s;
				const color = this.lightColor!;

				batch.drawImage(color, -1, -1, 2, 2, x - (dx + width / 2), y - (dy + height / 2), width, height);
			};
		}
	};
}

export function mixLightSprite(sprite: Sprite, color: number, dx: number, dy: number): MixinEntity {
	return base => {
		if (!SERVER || TESTS) {
			base.lightSpriteOn = true;
			base.lightSpriteX = dx;
			base.lightSpriteY = dy;
			base.lightSpriteColor = color;
			base.lightSpriteBounds = getBounds(sprite, -dx, -dy);
			base.drawLightSprite = function (batch: SpriteBatch) {
				if (!this.lightSpriteOn)
					return;

				const x = toScreenX(this.x) - this.lightSpriteX!;
				const y = toScreenYWithZ(this.y, this.z) - this.lightSpriteY!;

				batch.drawSprite(sprite, this.lightSpriteColor || BLACK, x, y);
			};
		}
	};
}

export function mixDrawRain(): MixinEntity {
	const sprite = sprites.rainfall.color; // 110x477
	const bounds = rect(toScreenX(-4), -sprite.h, toScreenX(8), sprite.h);

	return base => {
		base.bounds = bounds;

		if (SERVER && !TESTS)
			return;

		let time = 0;
		const palette = createPalette(sprites.defaultPalette);
		base.palettes = [palette];

		// update(delta: number) {
		// 	time += delta * 1000;

		// 	if (time > 200) {
		// 		time -= 200;
		// 	}
		// },

		base.draw = function (batch: PaletteSpriteBatch) {
			const x = toScreenX(this.x) + bounds.x;
			const y = toScreenYWithZ(this.y, this.z) - sprite.h + Math.floor(time);
			batch.drawImage(sprite.type, RED, palette, sprite.x, sprite.y, sprite.w, sprite.h, x, y, sprite.w, sprite.h);
		};
	};
}

export function mixDrawShadow(sprite: PaletteRenderable, dx: number, dy: number, shadowColor?: number): MixinEntity {
	const bounds = getRenderableBounds(sprite, dx, dy);

	return base => {
		base.bounds = bounds;

		if (!SERVER || TESTS) {
			const defaultPalette = createPalette(sprites.defaultPalette);
			base.palettes = [defaultPalette];
			base.draw = function (batch: PaletteSpriteBatch, options: DrawOptions) {
				const x = toScreenX(this.x + (this.ox || 0)) - dx;
				const y = toScreenYWithZ(this.y + (this.oy || 0), this.z) - dy;
				const color = shadowColor === undefined ? options.shadowColor : shadowColor;
				sprite.shadow && batch.drawSprite(sprite.shadow, color, defaultPalette, x, y);
			};
		}
	};
}

export function mixBobbing(bobsFps: number, bobs: number[]): MixinEntity {
	return base => {
		base.flags |= EntityFlags.Bobbing;
		base.bobsFps = bobsFps;
		base.bobs = bobs;
	};
}

let fullWalls = true;

export function toggleWalls() {
	fullWalls = !fullWalls;
}

export function mixDrawWall(
	full: PaletteRenderable, half: PaletteRenderable, dx: number, dy: number, dy2: number
): MixinEntity {
	const fullBounds = getRenderableBounds(full, dx, dy);
	// const halfBounds = getRenderableBounds(half, dx, dy2);

	return base => {
		base.bounds = fullBounds; // fullWalls ? fullBounds : halfBounds

		if (SERVER && !TESTS)
			return;

		const fullPalette = createPalette(att(full.palettes, 0));
		const halfPalette = createPalette(att(half.palettes, 0));

		base.palettes = [];
		fullPalette && base.palettes.push(fullPalette);
		halfPalette && base.palettes.push(halfPalette);

		base.draw = function (batch: PaletteSpriteBatch) {
			const sprite = fullWalls ? full : half;
			const palette = fullWalls ? fullPalette : halfPalette;
			const x = toScreenX(this.x) - dx;
			const y = toScreenYWithZ(this.y, this.z) - (fullWalls ? dy : dy2);
			sprite.color && batch.drawSprite(sprite.color, WHITE, palette, x, y);
		};
	};
}

export function mixDrawSpider(
	sprite: PaletteRenderable, dx: number, dy: number
): MixinEntity {
	const heightOffset = 30;
	const spriteColor = sprite.color;
	const baseBounds = getRenderableBounds(sprite, dx, dy);

	if (!spriteColor)
		throw new Error('Missing sprite');

	return base => {
		const { height, time } = base.options as { height: number; time: number; };
		const bounds = { ...baseBounds };
		bounds.y -= (height + heightOffset);
		bounds.h += height;
		base.bounds = bounds;

		if (SERVER && !TESTS)
			return;

		const palette = createPalette(sprite.palettes && sprite.palettes[0]);
		base.palettes = [palette];

		base.draw = function (batch: PaletteSpriteBatch, options: DrawOptions) {
			const t = options.gameTime / SECOND - time;
			const h = clamp(Math.sin(t / 4) * 4, 0, 1) * height;

			if (h < height) {
				const lineLength = height - h - 4;
				const x = toScreenX(this.x) - dx;
				const y = toScreenYWithZ(this.y, this.z) - dy - heightOffset - h;

				batch.drawRect(0x181818ff, x + 2, y - lineLength, 1, lineLength + 1);
				batch.drawSprite(spriteColor, WHITE, palette, x, y);
			}
		};
	};
}
