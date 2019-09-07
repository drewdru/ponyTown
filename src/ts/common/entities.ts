import { compact } from 'lodash';
import * as sprites from '../generated/sprites';
import {
	Entity, PaletteManager, Rect, ServerFlags, PaletteRenderable, ColorShadow, EntityDescriptor, EntityOptions,
	CreateEntityMethod, CreateEntity, EntityFlags, MixinEntity, EntityWorldState, defaultWorldState, ColorExtra, InteractAction
} from './interfaces';
import { tileWidth, tileHeight, ENTITY_TYPE_LIMIT, WATER_FPS, PONY_TYPE, WATER_HEIGHT } from './constants';
import { CLOUD_SHADOW_COLOR, WHITE } from './colors';
import {
	mixDrawSpider, setPaletteManager, AnimatedRenderable,
	AnimatedRenderable1, collider, taperColliderSW, taperColliderNE, taperColliderSE,
	taperColliderNW, skewColliderNE, ponyColliders, ponyCollidersBounds, mixTrigger, mixDraw, mixInteract,
	mixPickable, mixMinimap, mixColliderRect, mixColliderRounded, mixLight, mixLightSprite, mixColliders,
	mixDrawShadow, mixAnimation, mixBobbing, mixDrawWall, mixDrawRain, mixDrawSeasonal, mixDrawWindow,
	mixDrawDirectionSign, skewColliderNW, triangleColliderNE, triangleColliderNW, mixInteractAt
} from './mixins';
import { times, repeat, flatten, hasFlag } from './utils';
import { withAlphaFloat } from './color';
import { rect } from './rect';
import { mockPaletteManager } from './ponyInfo';

const entities: EntityDescriptor[] = [];

export function createBaseEntity(type: number, id: number, x: number, y: number): Entity {
	return { id, type, x, y, z: 0, vx: 0, vy: 0, order: 0, state: 0, playerState: 0, flags: 0, timestamp: 0 };
}

function createEntity(
	type: number, id: number, x: number, y: number, options: EntityOptions, worldState: EntityWorldState
): Entity {
	const descriptor = entities[type];

	if (!descriptor) {
		throw new Error(`Invalid entity type ${type}`);
	}

	return descriptor.create(createBaseEntity(type, id, x, y), options, worldState);
}

function register(typeName: string, create: CreateEntity): CreateEntityMethod {
	if (DEVELOPMENT && entities.length >= ENTITY_TYPE_LIMIT) {
		throw new Error(`Exceeded entity limit of ${ENTITY_TYPE_LIMIT} with (${typeName})`);
	}

	if (DEVELOPMENT && entities.some(e => e.typeName === typeName)) {
		throw new Error(`Entity name already registered (${typeName})`);
	}

	const type = entities.length;
	entities.push({ type, typeName, create });
	const method: any = (x: number, y: number, options: EntityOptions = {}, worldState: EntityWorldState = defaultWorldState) =>
		createEntity(type, 0, x, y, options, worldState);
	method.type = type;
	method.typeName = typeName;

	return method;
}

function registerMix(typeName: string, ...mixins: (MixinEntity | undefined)[]) {
	const mixinsCompacted = compact(mixins);

	return register(typeName, (base, options, worldState) => {
		for (const mixin of mixinsCompacted) {
			mixin(base, options, worldState);
		}

		return base;
	});
}

export function getEntityTypeName(type: number): string {
	return entities[type].typeName;
}

export function getEntityType(typeName: string): number {
	for (let i = 1; i < entities.length; i++) {
		if (entities[i].typeName === typeName) {
			return i;
		}
	}

	return 0;
}

export function getEntityTypesAndNames() {
	return entities.map(({ type, typeName }) => ({ type, name: typeName }));
}

function checkEntity(entity: Entity) {
	if (entity.draw && !entity.bounds) {
		console.error('missing bounds for', getEntityTypeName(entity.type), entity);
	}

	if (entity.drawLight && !entity.lightBounds) {
		console.error('missing lightBounds for', getEntityTypeName(entity.type), entity);
	}

	if (entity.drawLightSprite && !entity.lightSpriteBounds) {
		console.error('missing lightSpriteBounds for', getEntityTypeName(entity.type), entity);
	}
}

export function createAnEntity(
	type: number, id: number, x: number, y: number, options: any, paletteManager: PaletteManager,
	worldState: EntityWorldState
): Entity {
	setPaletteManager(paletteManager);

	const entity = createEntity(type, id, x, y, options, worldState);

	if (DEVELOPMENT) {
		checkEntity(entity);
	}

	return entity;
}

// helpers

// strips names in release build
function n(value: string) {
	return (DEVELOPMENT || SERVER) ? value : '';
}

function mixCover(x: number, y: number, w: number, h: number): MixinEntity {
	const bounds = rect(x, y, w, h);
	return base => base.coverBounds = bounds;
}

function mixFlags(flags: EntityFlags): MixinEntity {
	return base => base.flags |= flags;
}

function mixInteractAction(action: InteractAction): MixinEntity {
	return base => base.interactAction = action;
}

function mixBounds(x: number, y: number, w: number, h: number): MixinEntity {
	const bounds = rect(x, y, w, h);
	return base => base.bounds = bounds;
}

function mixServerFlags(flags: ServerFlags): MixinEntity {
	if (SERVER) {
		return base => base.serverFlags! |= flags;
	} else {
		return () => { };
	}
}

function mixOrder(order: number): MixinEntity {
	return base => base.order = order;
}

const collectableInteractive = mixInteract(-8, -12, 16, 16, 1.5);

function collectable(name: string, sprite: PaletteRenderable, paletteIndex = 0, ...other: MixinEntity[]) {
	return doodad(name, sprite, Math.floor(sprite.color!.w / 2), sprite.color!.h - 1, paletteIndex,
		collectableInteractive,
		...other);
}

function decal(name: string, sprite: PaletteRenderable, palette = 0, ...other: MixinEntity[]) {
	return registerMix(name,
		mixDraw(sprite, Math.floor((sprite.color!.w + sprite.color!.ox) / 2), sprite.color!.oy, palette),
		mixFlags(EntityFlags.Decal),
		...other);
}

function decalOffset(name: string, sprite: PaletteRenderable, dx: number, dy: number, palette = 0, ...other: MixinEntity[]) {
	return registerMix(name,
		mixDraw(sprite, dx, dy, palette),
		mixFlags(EntityFlags.Decal),
		...other);
}

function doodad(
	name: string, sprite: PaletteRenderable, ox: number, oy: number, palatte = 0, ...other: (MixinEntity | undefined)[]
) {
	return registerMix(name, mixDraw(sprite, ox, oy, palatte), ...compact(other));
}

function doodadSet(name: string, sprite: PaletteRenderable, ox: number, oy: number, ...other: MixinEntity[]) {
	return times(sprite.palettes!.length, i => registerMix(`${name}-${i}`, mixDraw(sprite, ox, oy, i), ...other));
}

// placeholder entity

registerMix(n('null'), () => { throw new Error('Invalid type (0)'); });

// entities

export const pony = registerMix(n('pony'),
	base => {
		base.flags = EntityFlags.Movable | EntityFlags.CanCollide;
		base.colliders = ponyColliders;
		base.collidersBounds = ponyCollidersBounds;
	},
	mixServerFlags(ServerFlags.DoNotSave));

// triggers

export const triggerDoor = registerMix(n('trigger-door'),
	mixTrigger(-32, -6, 64, 12, true));

export const triggerHouseDoor = registerMix(n('trigger-house-door'),
	mixTrigger(-32, -6, 64, 12, false));

export const triggerBoat = registerMix(n('trigger-boat'),
	mixTrigger(-50, -12, 100, 24, false));

export const trigger3x1 = registerMix(n('trigger-3x1'),
	mixTrigger(-48, 0, 96, 24, true));

// house

export const house = doodad(n('house'), sprites.house, 79, 186, 0,
	mixColliders(
		collider(-70, -92, 137, 90, true),
		collider(-70, -2, 32, 2, true),
		collider(-70, 0, 30, 3, true),
		collider(0, -2, 67, 2, true),
		collider(2, 0, 65, 3, true),
	),
	mixInteract(-35, -49, 32, 49, 3));

export const window1 = registerMix(n('window-1'),
	mixDrawWindow(sprites.window_1, 21, 53, 0, 3, 0, 3, 1),
	mixOrder(1));

export const picture1 = doodad(n('picture-1'), sprites.picture_1, 15, 54, 0);
export const picture2 = doodad(n('picture-2'), sprites.picture_1, 15, 54, 1);

const cushionPickable = mixPickable(32, 39);
export const cushion1 = decal(n('cushion-1'), sprites.cushion_1, 0, cushionPickable);
export const cushion2 = decal(n('cushion-2'), sprites.cushion_1, 1, cushionPickable);
export const cushion3 = decal(n('cushion-3'), sprites.cushion_1, 2, cushionPickable);

export const bookshelf = doodad(n('bookshelf'), sprites.bookshelf, 28, 81, 0,
	mixColliderRect(-32, -14, 66, 15));

// boat

const boatMinimap = mixMinimap(0x725d3fff, rect(-3, -1, 6, 2));
const boatSailCollider = mixColliderRect(-5, -3, 11, 6);
const waterBobbing = mixBobbing(WATER_FPS, WATER_HEIGHT);

export const boat = doodad(n('boat'), sprites.boat, 95, 4, 0,
	boatMinimap,
	mixOrder(-1));

export const boatBob = doodad(n('boat-bob'), sprites.boat, 95, 18, 0,
	boatMinimap,
	waterBobbing,
	mixOrder(-1),
	mixFlags(EntityFlags.StaticY));

export const boatFrontBob = doodad(n('boat-front-bob'), sprites.boat_front, 71, 16, 0,
	boatMinimap,
	waterBobbing,
	mixFlags(EntityFlags.StaticY));

export const boatSail = doodad(n('boat-sail'), sprites.boat_sail, 77, 173, 0,
	mixCover(-8, -130, 70, 116),
	boatSailCollider);

export const rope = doodad(n('rope'), sprites.boat_rope, 5, 19, 0,
	mixPickable(31, 58));

export const ropeRack = doodad(n('rope-rack'), sprites.rope_rack, 11, 34, 0,
	mixInteract(-10, -31, 23, 31, 5),
	mixFlags(EntityFlags.StaticY));

export const boatRopeBob = doodad(n('boat-rope-bob'), sprites.boat_rope, 5, 19, 0,
	waterBobbing,
	mixFlags(EntityFlags.StaticY));

export const boatWake = registerMix(n('boat-wake'),
	mixAnimation(sprites.boat_wake, WATER_FPS, 93, 0, { useGameTime: true }),
	mixFlags(EntityFlags.StaticY));

export function fullBoat(x: number, y: number, sail = true) {
	const sailEntities = sail ? [
		boatSail(x - (12 / tileWidth), y + (16 / tileHeight)),
		boatRopeBob(x - (91 / tileWidth), y + (8 / tileHeight)),
	] : [];

	return [
		boatBob(x, y),
		boatFrontBob(x, y + (29 / tileHeight)),
		...sailEntities,
		boatWake(x, y + (5 / tileHeight)),
	];
}

// pier

export const pierLeg = registerMix(n('pier-leg'),
	mixAnimation(sprites.pier_leg, WATER_FPS, 10, -14),
	mixOrder(-2),
	mixFlags(EntityFlags.StaticY));

// planks

const plankMinimap = mixMinimap(0x9c6141ff, rect(-1, 0, 2, 1));
const plankFlags = mixFlags(EntityFlags.StaticY);
const plankShortMinimap = mixMinimap(0x9c6141ff, rect(0, 0, 1, 1));
const plankPal = 1;

export const plank1 = decalOffset(n('plank-1'), sprites.plank_1, 39, -2, plankPal, plankMinimap, plankFlags);
export const plank2 = decalOffset(n('plank-2'), sprites.plank_2, 39, -2, plankPal, plankMinimap, plankFlags);
export const plank3 = decalOffset(n('plank-3'), sprites.plank_3, 39, -2, plankPal, plankMinimap, plankFlags);
export const plank4 = decalOffset(n('plank-4'), sprites.plank_4, 39, -2, plankPal, plankMinimap, plankFlags);

export const planks = [plank1, plank2, plank3, plank4];

export const plankShort1 = decalOffset(
	n('plank-short-1'), sprites.plank_short_1, 21, -2, plankPal, plankShortMinimap, plankFlags);
export const plankShort2 = decalOffset(
	n('plank-short-2'), sprites.plank_short_2, 21, -2, plankPal, plankShortMinimap, plankFlags);
export const plankShort3 = decalOffset(
	n('plank-short-3'), sprites.plank_short_3, 21, -2, plankPal, plankShortMinimap, plankFlags);

export const planksShort = [plankShort1, plankShort2, plankShort3];

export const plankShadow = registerMix(n('plank-shadow'),
	mixDrawShadow(sprites.plank_shadow, 39, -12),
	mixFlags(EntityFlags.Decal | EntityFlags.StaticY),
	mixOrder(-1));

export const plankShadow2 = registerMix(n('plank-shadow-2'),
	mixDrawShadow(sprites.plank_shadow2, 39, -12),
	mixFlags(EntityFlags.Decal | EntityFlags.StaticY),
	mixOrder(-1));

export const plankShadowShort = registerMix(n('plank-shadow-short'),
	mixDrawShadow(sprites.plank_shadow_short, 21, -12),
	mixFlags(EntityFlags.Decal | EntityFlags.StaticY),
	mixOrder(-1));

// pickables

const applePickable = mixPickable(29, 47);
export const apple = collectable(n('apple'), sprites.apple_1, 0, applePickable);
export const apple2 = collectable(n('apple-2'), sprites.apple_2, 0, applePickable);
export const appleGreen = collectable(n('apple-green'), sprites.apple_1, 1, applePickable);
export const appleGreen2 = collectable(n('apple-green-2'), sprites.apple_2, 1, applePickable);

const orangePickable = mixPickable(29, 46);
export const orange = collectable(n('orange'), sprites.orange_1, 0, orangePickable);
export const orange2 = collectable(n('orange-2'), sprites.orange_2, 0, orangePickable);

export const pear = collectable(n('pear'), sprites.pear, 0, mixPickable(30, 48));

export const banana = collectable(n('banana'), sprites.banana, 0, mixPickable(30, 44));

const lemonPickable = mixPickable(31, 45);
export const lemon = collectable(n('lemon'), sprites.lemon_1, 0, lemonPickable);
export const lime = collectable(n('lime'), sprites.lemon_1, 1, lemonPickable);

const carrotPalette = 1;
export const carrot1 = doodad(n('carrot-1'), sprites.carrot_1, 4, 9, carrotPalette, collectableInteractive);
export const carrot1b = doodad(n('carrot-1b'), sprites.carrot_1b, 4, 9, carrotPalette, collectableInteractive);
export const carrot2 = doodad(n('carrot-2'), sprites.carrot_2, 4, 9, carrotPalette);
export const carrot2b = doodad(n('carrot-2b'), sprites.carrot_2b, 4, 9, carrotPalette);
export const carrot3 = doodad(n('carrot-3'), sprites.carrot_3, 4, 9, carrotPalette);
export const carrot4 = doodad(n('carrot-4'), sprites.carrot_4, 4, 9, carrotPalette);
export const carrotHeld = doodad(n('carrot-held'), sprites.carrot_hold, 8, 4, carrotPalette, mixPickable(32, 44));

const grapesPickable = mixPickable(32, 54);

export const grapePurple = collectable(n('grape-purple'), sprites.grapes_one, 0, mixPickable(29, 43));
export const grapeGreen = collectable(n('grape-green'), sprites.grapes_one, 1, mixPickable(29, 43));

function grapes(name: string, sprite: ColorShadow, palette: number) {
	return doodad(name, sprite, 5, 15, palette, collectableInteractive, grapesPickable);
}

export const grapesPurple = [
	grapes(n('grapes-purple-1'), sprites.grapes_1, 0),
	grapes(n('grapes-purple-2'), sprites.grapes_2, 0),
	grapes(n('grapes-purple-3'), sprites.grapes_3, 0),
	grapes(n('grapes-purple-4'), sprites.grapes_4, 0),
	grapes(n('grapes-purple-5'), sprites.grapes_5, 0),
	grapes(n('grapes-purple-6'), sprites.grapes_6, 0),
	grapes(n('grapes-purple-7'), sprites.grapes_7, 0),
];

export const grapesGreen = [
	grapes(n('grapes-green-1'), sprites.grapes_1, 1),
	grapes(n('grapes-green-2'), sprites.grapes_2, 1),
	grapes(n('grapes-green-3'), sprites.grapes_3, 1),
	grapes(n('grapes-green-4'), sprites.grapes_4, 1),
	grapes(n('grapes-green-5'), sprites.grapes_5, 1),
	grapes(n('grapes-green-6'), sprites.grapes_6, 1),
	grapes(n('grapes-green-7'), sprites.grapes_7, 1),
];

export const mango = collectable(n('mango'), sprites.mango, 0, mixPickable(31, 46));

export const candyCane1 = collectable(n('candy-cane-1'), sprites.candy_cane_1, 0, mixPickable(31, 46)); // horizontal
export const candyCane2 = collectable(n('candy-cane-2'), sprites.candy_cane_2, 0, mixPickable(31, 49)); // vertical
export const cookie = collectable(n('cookie'), sprites.cookie, 0, mixPickable(31, 46));
export const cookiePony = collectable(n('cookie-pony'), sprites.cookie_pony, 0, mixPickable(30, 45));

export const cookieTable = doodad(n('cookie-table'), sprites.cookie_table_1, 13, 28, 0,
	mixFlags(EntityFlags.Interactive),
	base => base.interactRange = 5,
	mixInteractAction(InteractAction.GiveCookie1),
	mixColliderRect(-13, -12, 26, 14));

export const cookieTable2 = doodad(n('cookie-table-2'), sprites.cookie_table_2, 13, 28, 0,
	mixFlags(EntityFlags.Interactive),
	base => base.interactRange = 5,
	mixInteractAction(InteractAction.GiveCookie2),
	mixColliderRect(-13, -12, 26, 14));

export const letter = doodad(n('letter'), sprites.letter, 4, 10, 0,
	mixPickable(30, 50));

export const rose = doodad(n('rose'), sprites.rose, 8, 1, 0,
	mixPickable(30, 41));

// tools

export const hammer = doodad(n('hammer'), sprites.hammer, 8, 10, 0,
	mixPickable(25, 46),
	mixFlags(EntityFlags.Usable));

export const shovel = doodad(n('shovel'), sprites.shovel, 16, 6, 0,
	mixPickable(29, 42),
	mixFlags(EntityFlags.Usable));

export const rake = doodad(n('rake'), sprites.rake, 16, 6, 0,
	mixPickable(30, 42));

export const pickaxe = doodad(n('pickaxe'), sprites.pickaxe, 10, 8, 0,
	mixPickable(28, 42));

export const broom = doodad(n('broom'), sprites.broom, 16, 6, 0,
	mixPickable(27, 42));

export const saw = doodad(n('saw'), sprites.saw, 10, 7, 0,
	mixPickable(26, 47));

// jacko lanterns

const jackoLightColor = 0x80281eff;
const jackoLanternPickable = mixPickable(31, 52);
const jackLanternCollider = mixColliderRect(-5, -5, 10, 10, false);

export const jackoLanternOff = collectable(
	n('jacko-lantern-off'), sprites.jacko_lantern_off, 0, jackoLanternPickable, jackLanternCollider);

export const jackoLanternOn = collectable(
	n('jacko-lantern-on'), sprites.jacko_lantern_on, 0, jackoLanternPickable, jackLanternCollider,
	mixLight(jackoLightColor, 0, 0, 192, 144),
	mixLightSprite(sprites.jacko_lantern_light, WHITE, 6, 9));

export const jackoLantern = collectable(
	n('jacko-lantern'), sprites.jacko_lantern_on, 0, jackoLanternPickable, jackLanternCollider,
	mixLight(jackoLightColor, 0, 0, 192, 144),
	mixLightSprite(sprites.jacko_lantern_light, WHITE, 6, 9),
	mixFlags(EntityFlags.OnOff));

// lanterns

const lanternLightSprite: AnimatedRenderable1 = {
	frames: sprites.lantern_light.frames,
};

const lanternPickable = mixPickable(31, 53);
const lanternCollider = mixColliderRounded(-5, -5, 10, 10, 2, false);

export const lanternOn = registerMix(n('lantern-on'),
	mixAnimation(sprites.lantern, 12, 4, 13, { lightSprite: lanternLightSprite }),
	mixLight(0x916a32ff, 0, 0, 384, 288),
	lanternPickable,
	lanternCollider);

export const lanternOnWall = registerMix(n('lantern-on-wall'),
	mixAnimation(sprites.lantern, 12, 4, 13 + 24, { lightSprite: lanternLightSprite }),
	mixLight(0x916a32ff, 0, 0, 384, 288));

export const lanternOnTable = registerMix(n('lantern-on-table'),
	mixAnimation(sprites.lantern, 12, 4, 13 + 14, { lightSprite: lanternLightSprite }),
	mixLight(0x916a32ff, 0, 0, 384, 288));

export const candy = doodad(n('candy'), sprites.candy, 4, 2, 0,
	mixInteract(-6, -6, 13, 13, 1.5));

const eggInteractive = mixInteract(-6, -6, 13, 13, 1.5);

export const eggs = [
	// upright
	collectable(n('egg-1-0'), sprites.egg_1, 0, eggInteractive),
	collectable(n('egg-1-1'), sprites.egg_1, 1, eggInteractive),
	collectable(n('egg-1-2'), sprites.egg_1, 2, eggInteractive),
	collectable(n('egg-2-0'), sprites.egg_2, 0, eggInteractive),
	collectable(n('egg-3-0'), sprites.egg_3, 0, eggInteractive),
	collectable(n('egg-3-1'), sprites.egg_3, 3, eggInteractive),
	collectable(n('egg-3-2'), sprites.egg_3, 4, eggInteractive),
	collectable(n('egg-4-0'), sprites.egg_4, 0, eggInteractive),
	collectable(n('egg-5-0'), sprites.egg_5, 0, eggInteractive),
	collectable(n('egg-5-1'), sprites.egg_5, 8, eggInteractive),
	collectable(n('egg-6-0'), sprites.egg_6, 0, eggInteractive),
	collectable(n('egg-6-1'), sprites.egg_6, 5, eggInteractive),
	collectable(n('egg-7-0'), sprites.egg_7, 0, eggInteractive),
	collectable(n('egg-7-1'), sprites.egg_7, 6, eggInteractive),
	collectable(n('egg-8-0'), sprites.egg_8, 0, eggInteractive),
	collectable(n('egg-8-1'), sprites.egg_8, 7, eggInteractive),
	collectable(n('egg-9-0'), sprites.egg_9, 0, eggInteractive),
	collectable(n('egg-10-0'), sprites.egg_10, 0, eggInteractive),
	collectable(n('egg-11-0'), sprites.egg_11, 0, eggInteractive),
	collectable(n('egg-12-0'), sprites.egg_12, 0, eggInteractive),
	collectable(n('egg-13-0'), sprites.egg_13, 0, eggInteractive),
	collectable(n('egg-14-0'), sprites.egg_14, 0, eggInteractive),
	// tilted
	collectable(n('egg-14-1'), sprites.egg_14, 1, eggInteractive),
	collectable(n('egg-14-2'), sprites.egg_14, 2, eggInteractive),
	collectable(n('egg-15-0'), sprites.egg_15, 0, eggInteractive),
	collectable(n('egg-15-1'), sprites.egg_15, 3, eggInteractive),
	collectable(n('egg-15-2'), sprites.egg_15, 4, eggInteractive),
	collectable(n('egg-16-0'), sprites.egg_16, 0, eggInteractive),
	collectable(n('egg-16-1'), sprites.egg_16, 8, eggInteractive),
	collectable(n('egg-17-0'), sprites.egg_17, 0, eggInteractive),
	collectable(n('egg-17-1'), sprites.egg_17, 5, eggInteractive),
	collectable(n('egg-18-0'), sprites.egg_18, 0, eggInteractive),
	collectable(n('egg-18-1'), sprites.egg_18, 7, eggInteractive),
	collectable(n('egg-19-0'), sprites.egg_19, 0, eggInteractive),
	collectable(n('egg-20-0'), sprites.egg_20, 0, eggInteractive),
	collectable(n('egg-21-0'), sprites.egg_21, 0, eggInteractive),
	collectable(n('egg-22-0'), sprites.egg_22, 0, eggInteractive),
	collectable(n('egg-23-0'), sprites.egg_23, 0, eggInteractive),
];

const eggBasketPickable = mixPickable(31, 53);
const eggBasketCollider = mixColliderRect(-5, -5, 11, 6);
const eggBasketParts = [eggBasketPickable, eggBasketCollider];

export const basket = doodad(n('egg-basket-1'), sprites.egg_basket_1, 6, 13, 0, ...eggBasketParts);
export const eggBasket2 = doodad(n('egg-basket-2'), sprites.egg_basket_2, 6, 13, 0, ...eggBasketParts);
export const eggBasket3 = doodad(n('egg-basket-3'), sprites.egg_basket_3, 6, 13, 0, ...eggBasketParts);
export const eggBasket4 = doodad(n('egg-basket-4'), sprites.egg_basket_4, 6, 13, 0, ...eggBasketParts);
export const eggBaskets = [basket, eggBasket2, eggBasket3, eggBasket4];

export const basketBin = doodad(n('basket-bin'), sprites.basket_bin, 21, 31, 0,
	mixColliderRect(-20, -8, 46, 26),
	mixFlags(EntityFlags.Interactive),
	base => base.interactRange = 3);

const signCollider = mixColliderRect(-6, -1, 16, 2);
const signInteractive = mixFlags(EntityFlags.Interactive);
const signInteractRange: MixinEntity = base => base.interactRange = 5;
const signPickable = mixPickable(32, 62);
const signParts = [signCollider, signInteractive, signInteractRange, signPickable];

export const sign = registerMix(n('sign'),
	mixDrawSeasonal({
		summer: { sprite: sprites.sign_1, dx: 12, dy: 24, palette: 0 },
		winter: { sprite: sprites.sign_winter, dx: 12, dy: 24, palette: 0 },
	}),
	...signParts);

export const signQuest = doodad(n('sign-quest'), sprites.sign_2, 12, 24, 0, ...signParts);
export const signQuestion = doodad(n('sign-question'), sprites.sign_4, 12, 24, 0, ...signParts);
export const signDonate = doodad(n('sign-donate'), sprites.sign_3, 12, 24, 0, ...signParts);
export const signDebug = doodad(n('sign-debug'), sprites.sign_4, 12, 24, 0,
	...signParts,
	mixFlags(EntityFlags.Debug));

export const tile = decal(n('tile'), sprites.tile);

// direction signs

export const enum SignIcon {
	Spawn,
	Pumpkins,
	TownCenter,
	PineForest,
	Boat,
	Mountains,
	GiftPile,
	Forest,
	Lake,
	Bridge,
	Mines,
	Barrels,
	Fields,
	Carrots,
}

export const directionSign = registerMix(n('direction-sign'),
	mixDrawDirectionSign(),
	mixColliderRect(-10, -8, 20, 16),
	mixFlags(EntityFlags.Interactive),
	base => base.interactRange = 10);

export const directionSignLefts = times(5, i => registerMix(n(`direction-sign-left-${i}`),
	mixBounds(-10, -59 + i * 11, 14, 10)));

export const directionSignRights = times(5, i => registerMix(n(`direction-sign-right-${i}`),
	mixBounds(-4, -59 + i * 11, 14, 10)));

export const directionSignUpsLeft = times(5, i => registerMix(n(`direction-sign-up-left-${i}`),
	mixBounds(-6, -70 + i * 12, 6, 11)));

export const directionSignUpsRight = times(5, i => registerMix(n(`direction-sign-up-right-${i}`),
	mixBounds(1, -70 + i * 12, 5, 11)));

export const directionSignDownsLeft = times(5, i => registerMix(n(`direction-sign-down-left-${i}`),
	mixBounds(-6, -57 + i * 13, 7, 12)));

export const directionSignDownsRight = times(5, i => registerMix(n(`direction-sign-down-right-${i}`),
	mixBounds(0, -57 + i * 13, 5, 12)));

// box

const boxCollider = mixColliderRect(-17, -22, 35, 22);
const boxInteractive = mixInteract(-16, -32, 32, 36, 4);
const boxInteractiveClose = mixInteract(-16, -32, 32, 36, 3);
const boxPickable = mixPickable(32, 72);
const boxParts = [boxCollider, boxInteractive, boxPickable];

export const box = doodad(n('box'), sprites.box_empty, 16, 32, 0,
	...boxParts);

export const boxLanterns = doodad(n('box-lanterns'), sprites.box_lanterns, 16, 32, 0,
	...boxParts,
	mixInteractAction(InteractAction.GiveLantern));

export const boxBaskets = doodad(n('box-baskets'), sprites.box_baskets, 16, 32, 0,
	...boxParts);

export const boxFruits = doodad(n('box-fruits'), sprites.box_fruits, 16, 32, 0,
	...boxParts,
	mixInteractAction(InteractAction.GiveFruits));

export const boxGifts = doodad(n('box-gifts'), sprites.box_gifts, 16, 32, 0,
	boxCollider,
	boxInteractiveClose,
	boxPickable);

const toolboxParts = [
	mixColliderRect(-15, -10, 30, 10),
	mixInteractAt(5),
	mixPickable(31, 60),
];

export const toolboxEmpty = doodad(n('toolbox-empty'), sprites.toolbox_empty, 16, 22, 0,
	...toolboxParts);
export const toolboxFull = doodad(n('toolbox-full'), sprites.toolbox_full, 16, 22, 0,
	...toolboxParts,
	base => base.interactRange = 20,
	mixInteractAction(InteractAction.Toolbox),
	mixFlags(EntityFlags.IgnoreTool));

export const barrel = doodad(n('barrel'), sprites.barrel, 13, 27, 0,
	mixColliderRounded(-12, -8, 24, 13, 5),
	mixFlags(EntityFlags.Interactive),
	base => base.interactRange = 3);

export const bench1 = doodad(n('bench-1'), sprites.bench_1, 37, 20, 0, mixColliderRect(-37, -3, 75, 8));
export const benchSeat = doodad(n('bench-seat'), sprites.bench_seat, 37, 0);
export const benchBack = doodad(n('bench-back'), sprites.bench_back, 37, 22, 0, mixColliderRect(-37, -3, 75, 8));
export const benchSeatH = doodad(n('bench-seat-h'), sprites.bench_seath, 11, 0);
export const benchBackH = doodad(n('bench-back-h'), sprites.bench_backh, 9, 84, 0, mixColliderRect(-15, -64, 30, 65));
export const benchBackH2 = doodad(n('bench-back-h2'), sprites.bench_backh2, 6, 84, 0, mixColliderRect(-15, -64, 30, 65));

export const table1 = doodad(n('table-1'), sprites.table_1, 14, 34, 0, mixColliderRect(-18, -22, 37, 23));
export const table2 = doodad(n('table-2'), sprites.table_2, 24, 29, 0, mixColliderRect(-27, -21, 56, 49));
export const table3 = doodad(n('table-3'), sprites.table_3, 24, 21, 0, mixColliderRect(-23, -14, 45, 14));

export const wallMap = doodad(n('wall-map'), sprites.wall_map, 20, 51, 0, mixFlags(EntityFlags.StaticY));

export const crate1A = doodad(n('crate-1a'), sprites.crate_1, 16, 45, 0, mixColliderRect(-15, -20, 30, 20));
export const crate1B = doodad(n('crate-1b'), sprites.crate_1, 16, 45, 1, mixColliderRect(-15, -20, 30, 20));
export const crate1AHigh = doodad(n('crate-1a-high'), sprites.crate_1, 16, 45 + 25, 0, mixColliderRect(-15, -20 - 25, 30, 20));
export const crate1BHigh = doodad(n('crate-1b-high'), sprites.crate_1, 16, 45 + 25, 1, mixColliderRect(-15, -20 - 25, 30, 20));
export const crate2A = doodad(n('crate-2a'), sprites.crate_2, 15, 23, 0, mixColliderRect(-14, -14, 29, 14));
export const crate2B = doodad(n('crate-2b'), sprites.crate_2, 15, 23, 1, mixColliderRect(-14, -14, 29, 14));
export const crate3A = doodad(n('crate-3a'), sprites.crate_3, 15, 23, 0, mixColliderRect(-14, -14, 29, 14));
export const crate3B = doodad(n('crate-3b'), sprites.crate_3, 15, 23, 1, mixColliderRect(-14, -14, 29, 14));

// walls

export type Walls = ReturnType<typeof createWalls>;

function createWalls(baseName: string, spriteFull: ColorExtra[], spritesHalf: ColorExtra[]) {
	function wall(name: string, index: number, ox: number, oy: number, oy2: number, ...other: MixinEntity[]) {
		return registerMix(name,
			mixDrawWall(spriteFull[index], spritesHalf[index], ox, oy, oy2),
			mixMinimap(0x503d45ff, rect(0, 0, 1, 1)),
			mixFlags(EntityFlags.StaticY),
			mixServerFlags(ServerFlags.DoNotSave),
			...other);
	}

	function wallShort(name: string, index: number, ox: number, _oy: number, oy2: number, ...other: MixinEntity[]) {
		return doodad(name, spritesHalf[index], ox, oy2, 0,
			mixMinimap(0x503d45ff, rect(0, 0, 1, 1)),
			mixFlags(EntityFlags.StaticY),
			mixServerFlags(ServerFlags.DoNotSave),
			...other);
	}

	const wallThickness = 8;
	const wallOffsetX = wallThickness / 2;
	const wallOffsetY = 18;
	const wallOffsetFullY = 81;
	const wallHCollider = mixColliderRect(-16, -6, 32, 6);
	const wallVCollider = mixColliderRect(-10, -15, 20, 30);

	const wallH = wall(
		n(`${baseName}-h`), 16, (32 - wallThickness) / 2, wallOffsetFullY, wallOffsetY, wallHCollider);

	const wallHShort = wallShort(
		n(`${baseName}-h-short`), 16, (32 - wallThickness) / 2, wallOffsetFullY, wallOffsetY, wallHCollider);

	const wallV = wall(
		n(`${baseName}-v`), 17, wallOffsetX, wallOffsetFullY + 3, wallOffsetY + 3, wallVCollider);

	const wallVShort = wallShort(
		n(`${baseName}-v-short`), 17, wallOffsetX, wallOffsetFullY + 3, wallOffsetY + 3, wallVCollider);

	const wallCutL = doodad(
		n(`${baseName}-cut-l`), spriteFull[18], (32 - wallThickness) / 2, wallOffsetFullY, 0,
		wallHCollider,
		mixFlags(EntityFlags.StaticY),
		mixServerFlags(ServerFlags.DoNotSave));

	const wallCutR = doodad(
		n(`${baseName}-cut-r`), spriteFull[19], (32 - wallThickness) / 2, wallOffsetFullY, 0,
		wallHCollider,
		mixFlags(EntityFlags.StaticY),
		mixServerFlags(ServerFlags.DoNotSave));

	const wallCorners = [
		// top right bottom left
		wall(n(`${baseName}-00`), 0, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 0 0 0
		wall(n(`${baseName}-01`), 1, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 0 0 1
		wall(n(`${baseName}-02`), 2, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 0 1 0
		wall(n(`${baseName}-03`), 3, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 0 1 1
		wall(n(`${baseName}-04`), 4, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 1 0 0
		wall(n(`${baseName}-05`), 5, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 1 0 1
		wall(n(`${baseName}-06`), 6, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 1 1 0
		wall(n(`${baseName}-07`), 7, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 1 1 1
		wall(n(`${baseName}-08`), 8, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 0 0 0
		wall(n(`${baseName}-09`), 9, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 0 0 1
		wall(n(`${baseName}-10`), 10, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 0 1 0
		wall(n(`${baseName}-11`), 11, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 0 1 1
		wall(n(`${baseName}-12`), 12, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 1 0 0
		wall(n(`${baseName}-13`), 13, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 1 0 1
		wall(n(`${baseName}-14`), 14, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 1 1 0
		wall(n(`${baseName}-15`), 15, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 1 1 1
	];

	const wallCornersShort = [
		// top right bottom left
		wallShort(n(`${baseName}-00-short`), 0, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 0 0 0
		wallShort(n(`${baseName}-01-short`), 1, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 0 0 1
		wallShort(n(`${baseName}-02-short`), 2, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 0 1 0
		wallShort(n(`${baseName}-03-short`), 3, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 0 1 1
		wallShort(n(`${baseName}-04-short`), 4, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 1 0 0
		wallShort(n(`${baseName}-05-short`), 5, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 1 0 1
		wallShort(n(`${baseName}-06-short`), 6, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 1 1 0
		wallShort(n(`${baseName}-07-short`), 7, wallOffsetX, wallOffsetFullY, wallOffsetY), // 0 1 1 1
		wallShort(n(`${baseName}-08-short`), 8, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 0 0 0
		wallShort(n(`${baseName}-09-short`), 9, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 0 0 1
		wallShort(n(`${baseName}-10-short`), 10, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 0 1 0
		wallShort(n(`${baseName}-11-short`), 11, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 0 1 1
		wallShort(n(`${baseName}-12-short`), 12, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 1 0 0
		wallShort(n(`${baseName}-13-short`), 13, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 1 0 1
		wallShort(n(`${baseName}-14-short`), 14, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 1 1 0
		wallShort(n(`${baseName}-15-short`), 15, wallOffsetX, wallOffsetFullY, wallOffsetY), // 1 1 1 1
	];

	return { wallH, wallHShort, wallV, wallVShort, wallCutL, wallCutR, wallCorners, wallCornersShort };
}

export const woodenWalls = createWalls('wall', sprites.wall_wood_full, sprites.wall_wood_half);
export const stoneWalls = createWalls('wall-stone', sprites.wall_stone_full, sprites.wall_stone_half);

const rockMinimap = mixMinimap(0x78716aff, rect(0, 0, 1, 1));

export const rock = doodad(n('rock'), sprites.rock_1, 15, 20, 0,
	mixColliderRounded(-16, -12, 32, 12, 3, false),
	rockMinimap);

export const rock2 = doodad(n('rock-2'), sprites.rock_2, 11, 11, 0,
	mixColliderRounded(-10, -4, 17, 5, 2, false),
	rockMinimap);

export const rock3 = doodad(n('rock-3'), sprites.rock_3, 10, 11, 0,
	mixColliderRounded(-10, -4, 18, 5, 2, false),
	rockMinimap);

export const rockB = doodad(n('rockb'), sprites.rock_1, 15, 20, 1,
	mixColliderRounded(-16, -12, 32, 12, 3, false),
	rockMinimap);

export const rock2B = doodad(n('rock-2b'), sprites.rock_2, 11, 11, 1,
	mixColliderRounded(-10, -4, 17, 5, 2, false),
	rockMinimap);

export const rock3B = doodad(n('rock-3b'), sprites.rock_3, 10, 11, 1,
	mixColliderRounded(-10, -4, 18, 5, 2, false),
	rockMinimap);

// other

export const well = doodad(n('well'), sprites.well, 30, 67, 0,
	mixColliderRect(-26, -20, 54, 30));

// water rocks

const waterRockFPS = WATER_FPS;

export const waterRock1 = registerMix(n('water-rock-1'),
	mixAnimation(sprites.water_rock_1, waterRockFPS, 10, 12),
	mixColliderRounded(-12, -6, 25, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock2 = registerMix(n('water-rock-2'),
	mixAnimation(sprites.water_rock_2, waterRockFPS, 11, 8),
	mixColliderRounded(-12, -5, 22, 8, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock3 = registerMix(n('water-rock-3'),
	mixAnimation(sprites.water_rock_3, waterRockFPS, 12, 9),
	mixColliderRounded(-12, -4, 22, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock4 = registerMix(n('water-rock-4'),
	mixAnimation(sprites.water_rock_4, waterRockFPS, 11, 12),
	mixColliderRounded(-10, -4, 18, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock5 = registerMix(n('water-rock-5'),
	mixAnimation(sprites.water_rock_5, waterRockFPS, 11, 11),
	mixColliderRounded(-12, -4, 22, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock6 = registerMix(n('water-rock-6'),
	mixAnimation(sprites.water_rock_6, waterRockFPS, 13, 11),
	mixColliderRounded(-12, -4, 22, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock7 = registerMix(n('water-rock-7'),
	mixAnimation(sprites.water_rock_7, waterRockFPS, 10, 10),
	mixColliderRounded(-12, -4, 22, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock8 = registerMix(n('water-rock-8'),
	mixAnimation(sprites.water_rock_8, waterRockFPS, 11, 9),
	mixColliderRounded(-12, -4, 22, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock9 = registerMix(n('water-rock-9'),
	mixAnimation(sprites.water_rock_9, waterRockFPS, 10, 15),
	mixColliderRounded(-12, -4, 22, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock10 = registerMix(n('water-rock-10'),
	mixAnimation(sprites.water_rock_10, waterRockFPS, 10, 12),
	mixColliderRounded(-12, -4, 22, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterRock11 = registerMix(n('water-rock-11'),
	mixAnimation(sprites.water_rock_11, waterRockFPS, 10, 13),
	mixColliderRounded(-12, -4, 22, 7, 2, false),
	mixFlags(EntityFlags.StaticY));

// stone wall (old)

export const stoneWallFull = doodad(n('stone-wall-full'), sprites.stone_wall_full, 38, 22, 0,
	mixColliderRect(-38, -4, 76, 6));

// stone wall

const stoneWallMinimapColor = 0x9b9977ff;

export const stoneWallPole1 = registerMix(n('stone-wall-pole-1'),
	mixDrawSeasonal({
		summer: { sprite: sprites.stone_wall_pole1, dx: 7, dy: 20, palette: 0 },
		winter: { sprite: sprites.stone_wall_winter_pole1, dx: 8, dy: 21, palette: 0 },
	}),
	mixColliderRect(-7, -6, 14, 12, false),
	mixMinimap(stoneWallMinimapColor, rect(0, 0, 1, 1)),
	mixOrder(1));

export const stoneWallBeamH1 = registerMix(n('stone-wall-beam-h-1'),
	mixDrawSeasonal({
		summer: { sprite: sprites.stone_wall_horizontal1, dx: 25, dy: 17, palette: 0 },
		winter: { sprite: sprites.stone_wall_winter_horizontal1, dx: 25, dy: 20, palette: 0 },
	}),
	mixColliderRect(-25, -6, 50, 12, false),
	mixMinimap(stoneWallMinimapColor, rect(0, 0, 2, 1)));

export const stoneWallBeamV1 = registerMix(n('stone-wall-beam-v-1'),
	mixDrawSeasonal({
		summer: { sprite: sprites.stone_wall_vertical1, dx: 5, dy: 8, palette: 0 },
		winter: { sprite: sprites.stone_wall_winter_vertical1, dx: 5, dy: 8, palette: 0 },
	}),
	mixColliderRect(-7, 0, 14, 48, false),
	mixMinimap(stoneWallMinimapColor, rect(0, 0, 1, 2)),
	mixOrder(2));

// wooden fence (modular)

const woodenFenceTall = false;
const woodenFenceMinimapColor = 0xac7146ff;
const woodenFenceMinimap = mixMinimap(woodenFenceMinimapColor, rect(0, 0, 1, 1));

function woodenFencePole(name: string, sprite: PaletteRenderable, spriteWinter: PaletteRenderable) {
	return registerMix(name,
		mixDrawSeasonal({
			summer: { sprite: sprite, dx: 4, dy: 25, palette: 0 },
			winter: { sprite: spriteWinter, dx: 4, dy: 26, palette: 0 },
		}),
		mixColliderRect(-4, -3, 8, 6, woodenFenceTall),
		woodenFenceMinimap,
		mixOrder(1));
}

function woodenFenceBeamH(name: string, sprite: PaletteRenderable, spriteWinter: PaletteRenderable) {
	return registerMix(name,
		mixDrawSeasonal({
			summer: { sprite: sprite, dx: 12, dy: 21, palette: 0 },
			winter: { sprite: spriteWinter, dx: 12, dy: 23, palette: 0 },
		}),
		mixColliderRect(-12, -3, 24, 6, woodenFenceTall),
		woodenFenceMinimap);
}

function woodenFenceBeamV(name: string, sprite: PaletteRenderable, spriteWinter: PaletteRenderable) {
	return registerMix(name,
		mixDrawSeasonal({
			summer: { sprite: sprite, dx: 2, dy: 18, palette: 0 },
			winter: { sprite: spriteWinter, dx: 2, dy: 18, palette: 0 },
		}),
		mixColliderRect(-4, 0, 8, 24, woodenFenceTall),
		woodenFenceMinimap,
		mixOrder(2));
}

export const spawnPole = doodad(n('spawn-pole'), sprites.wooden_fence_pole1, 4, 25, 1, mixFlags(EntityFlags.Debug));
export const routePole = doodad(n('route-pole'), sprites.route_pole, 2, 14, 1, mixFlags(EntityFlags.Debug));

export const woodenFencePole1 = woodenFencePole(n('wooden-fence-pole-1'),
	sprites.wooden_fence_pole1, sprites.wooden_fence_winter_pole1);
export const woodenFencePole2 = woodenFencePole(n('wooden-fence-pole-2'),
	sprites.wooden_fence_pole2, sprites.wooden_fence_winter_pole2);
export const woodenFencePole3 = woodenFencePole(n('wooden-fence-pole-3'),
	sprites.wooden_fence_pole3, sprites.wooden_fence_winter_pole3);
export const woodenFencePole4 = woodenFencePole(n('wooden-fence-pole-4'),
	sprites.wooden_fence_pole4, sprites.wooden_fence_winter_pole4);
export const woodenFencePole5 = woodenFencePole(n('wooden-fence-pole-5'),
	sprites.wooden_fence_pole5, sprites.wooden_fence_winter_pole5);

export const woodenFenceBeamH1 = woodenFenceBeamH(n('wooden-fence-beam-h-1'),
	sprites.wooden_fence_horizontal1, sprites.wooden_fence_winter_horizontal1);
export const woodenFenceBeamH2 = woodenFenceBeamH(n('wooden-fence-beam-h-2'),
	sprites.wooden_fence_horizontal2, sprites.wooden_fence_winter_horizontal2);
export const woodenFenceBeamH3 = woodenFenceBeamH(n('wooden-fence-beam-h-3'),
	sprites.wooden_fence_horizontal3, sprites.wooden_fence_winter_horizontal3);
export const woodenFenceBeamH4 = woodenFenceBeamH(n('wooden-fence-beam-h-4'),
	sprites.wooden_fence_horizontal4, sprites.wooden_fence_winter_horizontal4);
export const woodenFenceBeamH5 = woodenFenceBeamH(n('wooden-fence-beam-h-5'),
	sprites.wooden_fence_horizontal5, sprites.wooden_fence_winter_horizontal5);
export const woodenFenceBeamH6 = woodenFenceBeamH(n('wooden-fence-beam-h-6'),
	sprites.wooden_fence_horizontal6, sprites.wooden_fence_winter_horizontal6);

export const woodenFenceBeamV1 = woodenFenceBeamV(n('wooden-fence-beam-v-1'),
	sprites.wooden_fence_vertical1, sprites.wooden_fence_winter_vertical1);
export const woodenFenceBeamV2 = woodenFenceBeamV(n('wooden-fence-beam-v-2'),
	sprites.wooden_fence_vertical2, sprites.wooden_fence_winter_vertical2);
export const woodenFenceBeamV3 = woodenFenceBeamV(n('wooden-fence-beam-v-3'),
	sprites.wooden_fence_vertical3, sprites.wooden_fence_winter_vertical3);

// fence

export const fence1 = registerMix(n('fence-1'),
	mixDrawSeasonal({
		summer: { sprite: sprites.fence_1, dx: 40, dy: 25, palette: 0 },
		winter: { sprite: sprites.fence_winter_1, dx: 40, dy: 25, palette: 0 },
	}),
	mixColliderRect(-38, -2, 83, 4, false),
	mixMinimap(woodenFenceMinimapColor, rect(0, 0, 1, 1)),
	mixPickable(30, 62));

export const fence2 = registerMix(n('fence-2'),
	mixDrawSeasonal({
		summer: { sprite: sprites.fence_2, dx: 72, dy: 25, palette: 0 },
		winter: { sprite: sprites.fence_winter_2, dx: 72, dy: 25, palette: 0 },
	}),
	mixColliderRect(-70, -2, 148, 4, false),
	mixMinimap(woodenFenceMinimapColor, rect(0, 0, 2, 1)));

export const fence3 = registerMix(n('fence-3'),
	mixDrawSeasonal({
		summer: { sprite: sprites.fence_3, dx: 104, dy: 25, palette: 0 },
		winter: { sprite: sprites.fence_winter_3, dx: 104, dy: 25, palette: 0 },
	}),
	mixColliderRect(-102, -2, 204, 4, false),
	mixMinimap(woodenFenceMinimapColor, rect(0, 0, 3, 1)));

// rain

const rainColor = 0xffffff77; // 48

export const rain = registerMix(n('rain'),
	mixAnimation(sprites.rain, 12, 16, 512, { color: rainColor }));

export const raindrop = registerMix(n('raindrop'),
	mixAnimation(sprites.raindrop, 12, 4, 0, { color: rainColor }));

export const weatherRain = registerMix(n('weather-rain'), mixDrawRain());

// flowers

export const flower1 = decal(n('flower-1'), sprites.flower_1);
export const flower2 = decal(n('flower-2'), sprites.flower_2);
export const flower3 = decal(n('flower-3'), sprites.flower_3);

export const flowerPatch1 = decal(n('flowers-1'), sprites.flower_patch1);
export const flowerPatch2 = decal(n('flowers-2'), sprites.flower_patch2);
export const flowerPatch3 = decal(n('flowers-3'), sprites.flower_patch3);
export const flowerPatch4 = decal(n('flowers-4'), sprites.flower_patch4);
export const flowerPatch5 = decal(n('flowers-5'), sprites.flower_patch5);
export const flowerPatch6 = decal(n('flowers-6'), sprites.flower_patch6);
export const flowerPatch7 = decal(n('flowers-7'), sprites.flower_patch7);

export const flower3Pickable = decal(n('flower-3-pickable'), sprites.flower_3, 0,
	mixInteract(-7, -3, 15, 15, 1.5));

export const flowerPick = decal(n('flower-pick'), sprites.flower_pick, 0,
	mixPickable(31, 39));

// clovers

export const clover1 = decal(n('clover-1'), sprites.clover_1);
export const clover2 = decal(n('clover-2'), sprites.clover_2);
export const clover3 = decal(n('clover-3'), sprites.clover_3);
export const clover4 = decal(n('clover-4'), sprites.clover_5);

export const fourLeafClover = decal(n('four-leaf-clover'), sprites.clover_4, 0,
	mixInteract(-7, -3, 15, 15, 1.5));

export const cloverPatch3 = decal(n('clovers-3'), sprites.clover_patch3);
export const cloverPatch4 = decal(n('clovers-4'), sprites.clover_patch4);
export const cloverPatch5 = decal(n('clovers-5'), sprites.clover_patch5);
export const cloverPatch6 = decal(n('clovers-6'), sprites.clover_patch6);
export const cloverPatch7 = decal(n('clovers-7'), sprites.clover_patch7);

export const cloverPick = doodad(n('clover-pick'), sprites.clover_mouth, 5, 0, 0,
	mixPickable(29, 39));

export const cloverPick2 = doodad(n('clover-pick-2'), sprites.clover_pick, 5, 0, 0,
	mixPickable(31, 39));

// autumn

export const leaves1 = decal(n('leaves-1'), sprites.leaves_1);
export const leaves2 = decal(n('leaves-2'), sprites.leaves_2);
export const leaves3 = decal(n('leaves-3'), sprites.leaves_3);
export const leaves4 = decal(n('leaves-4'), sprites.leaves_4);
export const leaves5 = decal(n('leaves-5'), sprites.leaves_5);

const smallLeafPileCollider = mixColliderRect(-12, -7, 25, 12);
const mediumLeafPileCollider = mixColliderRect(-16, -8, 34, 15);
const bigLeafPileCollider = mixColliderRect(-30, -13, 60, 24);

export const [leafpileSmallYellow, leafpileSmallOrange, leafpileSmallRed]
	= doodadSet(n('leafpile-small'), sprites.leafpile_small, 18, 16, smallLeafPileCollider);

export const [leafpileStickYellow, leafpileStickOrange, leafpileStickRed]
	= doodadSet(n('leafpile-stick'), sprites.leafpile_stick, 18, 16, smallLeafPileCollider);

export const [leafpileMediumYellow, leafpileMediumOrange, leafpileMediumRed]
	= doodadSet(n('leafpile-medium'), sprites.leafpile_medium, 35, 23, mediumLeafPileCollider);

export const [leafpileMediumAltYellow, leafpileMediumAltOrange, leafpileMediumAltRed]
	= doodadSet(n('leafpile-mediumalt'), sprites.leafpile_mediumalt, 35, 23, mediumLeafPileCollider);

export const [leafpileBigYellow, leafpileBigOrange, leafpileBigRed]
	= doodadSet(n('leafpile-big'), sprites.leafpile_big, 43, 34, bigLeafPileCollider);

export const [leafpileBigstickYellow, leafpileBigstickOrange, leafpileBigstickRed]
	= doodadSet(n('leafpile-bigstick'), sprites.leafpile_bigstick, 43, 34, bigLeafPileCollider);

// gifts

const giftInteractive = mixInteract(-9, -15, 18, 20, 1.5);
const giftPickable = mixPickable(32, 52);
const giftOffsetX = 7;
const giftOffsetY = 15;

export const gift1 = doodad(n('gift-1'), sprites.gift_1, giftOffsetX, giftOffsetY, 0,
	giftInteractive,
	giftPickable,
	mixFlags(EntityFlags.Usable));

export const gift2 = doodad(n('gift-2'), sprites.gift_2, giftOffsetX, giftOffsetY, 0,
	giftInteractive,
	giftPickable,
	mixFlags(EntityFlags.Usable));

export const gift3 = doodad(n('gift-3'), sprites.gift_2, giftOffsetX, giftOffsetY, 1,
	giftInteractive,
	giftPickable);

// gift piles

export const giftPileSign = doodad(n('giftpile-sign'), sprites.giftpile_sign, 47, 39, 0,
	mixColliderRounded(-44, -21, 89, 55, 7));
export const giftPileTree = doodad(n('giftpile-tree'), sprites.giftpile_tree, 42, 21, 0,
	mixColliderRounded(-41, -12, 83, 28, 7));
export const giftPilePine = doodad(n('giftpile-pine'), sprites.giftpile_pine, 56, 24, 0,
	mixColliderRounded(-51, -19, 102, 40, 7));

export const giftPile1 = doodad(n('giftpile-1'), sprites.giftpile_1, 28, 26, 0, mixColliderRect(-28, -12, 57, 33));
export const giftPile2 = doodad(n('giftpile-2'), sprites.giftpile_2, 30, 27, 0, mixColliderRect(-28, -12, 57, 31));
export const giftPile3 = doodad(n('giftpile-3'), sprites.giftpile_3, 29, 23, 0, mixColliderRect(-28, -12, 57, 31));
export const giftPile4 = doodad(n('giftpile-4'), sprites.giftpile_4, 26, 16, 0, mixColliderRect(-25, -12, 51, 24));
export const giftPile5 = doodad(n('giftpile-5'), sprites.giftpile_5, 20, 20, 0, mixColliderRect(-19, -7, 42, 19));
export const giftPile6 = doodad(n('giftpile-6'), sprites.giftpile_6, 19, 23, 0, mixColliderRect(-19, -12, 38, 28));

export const giftPileInteractive = doodad(n('giftpile-5-interactive'), sprites.giftpile_5, 20, 20, 0,
	mixColliderRect(-19, -7, 42, 19),
	mixFlags(EntityFlags.Interactive),
	base => base.interactRange = 5);

// winter

const snowponyCollider = mixColliderRounded(-12, -4, 25, 7, 2);
export const snowpony1 = doodad(n('snowpony-1'), sprites.snowpony_1, 13, 36, 0, snowponyCollider);
export const snowpony2 = doodad(n('snowpony-2'), sprites.snowpony_2, 16, 46, 0, snowponyCollider);
export const snowpony3 = doodad(n('snowpony-3'), sprites.snowpony_3, 20, 45, 0, snowponyCollider);
export const snowpony4 = doodad(n('snowpony-4'), sprites.snowpony_4, 20, 45, 0, snowponyCollider);
export const snowpony5 = doodad(n('snowpony-5'), sprites.snowpony_5, 20, 45, 0, snowponyCollider);
export const snowpony6 = doodad(n('snowpony-6'), sprites.snowpony_6, 12, 31, 0, snowponyCollider);
export const snowpony7 = doodad(n('snowpony-7'), sprites.snowpony_7, 12, 31, 0, snowponyCollider);
export const snowpony8 = doodad(n('snowpony-8'), sprites.snowpony_8, 12, 31, 0, snowponyCollider);
export const snowpony9 = doodad(n('snowpony-9'), sprites.snowpony_9, 12, 31, 0, snowponyCollider);
export const mistletoe = doodad(n('mistletoe'), sprites.mistletoe, 5, 65);
export const holly = doodad(n('holly'), sprites.holly, 5, 25, 0, mixOrder(1));

export const snowponies = [
	snowpony1,
	snowpony2,
	snowpony3,
	snowpony4,
	snowpony5,
	snowpony6,
	snowpony7,
	snowpony8,
	snowpony9,
];

export const snowPileTinier = decal(n('snowpile-tinier'), sprites.snowpile_tinier);
export const snowPileTiny = decal(n('snowpile-tiny'), sprites.snowpile_tiny);
export const snowPileSmall = doodad(n('snowpile-small'), sprites.snowpile_small, 22, 15, 0,
	mixColliderRounded(-15, -4, 31, 7, 2, false));
export const snowPileMedium = doodad(n('snowpile-medium'), sprites.snowpile_medium, 33, 20, 0,
	mixColliderRounded(-23, -4, 46, 12, 4, false));
export const snowPileBig = doodad(n('snowpile-big'), sprites.snowpile_big, 43, 28, 0,
	mixColliderRounded(-39, -2, 78, 16, 6, false));

export const sandPileTinier = decal(n('sandpile-tinier'), sprites.snowpile_tinier, 1);
export const sandPileTiny = decal(n('sandpile-tiny'), sprites.snowpile_tiny, 1);
export const sandPileSmall = doodad(n('sandpile-small'), sprites.snowpile_small, 22, 15, 1,
	mixColliderRounded(-15, -4, 31, 7, 2, false));
export const sandPileMedium = doodad(n('sandpile-medium'), sprites.snowpile_medium, 33, 20, 1,
	mixColliderRounded(-23, -4, 46, 12, 4, false));
export const sandPileBig = doodad(n('sandpile-big'), sprites.snowpile_big, 43, 28, 1,
	mixColliderRounded(-39, -2, 78, 16, 6, false));

// pumpkins

const pumpkinCollider = mixColliderRounded(-11, -6, 22, 12, 5, false);
const pumpkinPickable = mixPickable(26, 50);
const pumpkinParts = [pumpkinCollider, pumpkinPickable];
const pumpkinDX = 11;
const pumpkinDY = 15;

export const pumpkin = doodad(n('pumpkin'), sprites.pumpkin_default, pumpkinDX, pumpkinDY, 0,
	...pumpkinParts);

export const jackoOff = doodad(n('jacko-off'), sprites.pumpkin_off, pumpkinDX, pumpkinDY, 0,
	...pumpkinParts);

export const jackoOn = doodad(n('jacko-on'), sprites.pumpkin_on, pumpkinDX, pumpkinDY, 0,
	...pumpkinParts,
	mixLight(jackoLightColor, 0, 0, 256, 192),
	mixLightSprite(sprites.pumpkin_light, WHITE, pumpkinDX, pumpkinDY));

export const jacko = doodad(n('jacko'), sprites.pumpkin_on, pumpkinDX, pumpkinDY, 0,
	...pumpkinParts,
	mixLight(jackoLightColor, 0, 0, 256, 192),
	mixLightSprite(sprites.pumpkin_light, WHITE, pumpkinDX, pumpkinDY),
	mixFlags(EntityFlags.OnOff));

// tombstones

export const tombstone1 = doodad(n('tombstone-1'), sprites.tombstone_1, 14, 18, 0,
	mixColliderRect(-14, -4, 29, 9));

export const tombstone2 = doodad(n('tombstone-2'), sprites.tombstone_2, 11, 27, 0,
	mixColliderRect(-12, -3, 26, 6));

// torch

const torchCollider = mixColliderRounded(-2, -2, 4, 4, 1, false);
const torchDX = 4;
const torchDY = 34;
const torchSprites = sprites.torch2;
const torchAnimOff = [0];
const torchAnimOn = torchSprites.frames.map((_, i) => i).slice(1);

const torchUnlitSprite: PaletteRenderable = {
	color: torchSprites.frames[0],
	shadow: torchSprites.shadow,
	palettes: [torchSprites.palette],
};

const torchSpriteOn: AnimatedRenderable = {
	frames: torchSprites.frames.slice(1),
	shadow: torchSprites.shadow,
	palette: torchSprites.palette,
};

const torchLightSpriteOn: AnimatedRenderable1 = {
	frames: sprites.torch2_light.frames.slice(1),
};

export const torchOff = doodad(n('torch-off'), torchUnlitSprite, torchDX, torchDY, 0,
	torchCollider);

export const torchOn = registerMix(n('torch-on'),
	mixAnimation(torchSpriteOn, 8, torchDX, torchDY, { lightSprite: torchLightSpriteOn }),
	torchCollider,
	mixLight(0x926923ff, 0, 0, 440, 332)); // 0x924d23ff 0x917b32ff

export const torch = registerMix(n('torch'),
	mixAnimation(torchSprites, 8, torchDX, torchDY, {
		lightSprite: sprites.torch2_light,
		animations: [torchAnimOff, torchAnimOn],
	}),
	torchCollider,
	mixLight(0x926923ff, 0, 0, 440, 332),
	mixFlags(EntityFlags.OnOff));

export const poof = registerMix(n('poof'),
	mixAnimation({
		frames: [...sprites.poof.frames, sprites.emptySprite2],
		palette: sprites.poof.palette
	}, 12, 13, 30, { repeat: false }),
	mixOrder(100));

export const poof2 = registerMix(n('poof-2'),
	mixAnimation({
		frames: [...sprites.poof2.frames, sprites.emptySprite2],
		palette: sprites.poof2.palette
	}, 12, 50, 120, { repeat: false }),
	mixOrder(100));

export const splash = registerMix(n('splash'),
	mixAnimation({
		frames: [...sprites.splash.frames, sprites.emptySprite2],
		palette: sprites.splash.palette
	}, 20, 25, 22, { repeat: false }),
	mixOrder(50));

const boopSplashFrames = [
	...repeat(3, sprites.emptySprite2),
	...sprites.splash_boop.frames,
	sprites.emptySprite2,
];

const boopSlashFps = 20;
const boopSlashDX = 11;
const boopSlashDY = 55;

export const boopSplashRight = registerMix(n('boop-splash-right'),
	mixAnimation({
		frames: boopSplashFrames,
		palette: sprites.splash_boop.palette
	}, boopSlashFps, boopSlashDX, boopSlashDY, { repeat: false }),
	mixOrder(51));

export const boopSplashLeft = registerMix(n('boop-splash-left'),
	mixAnimation({
		frames: boopSplashFrames,
		palette: sprites.splash_boop.palette
	}, boopSlashFps, boopSlashDX, boopSlashDY, { repeat: false, flipped: true }),
	mixOrder(51));

// critters

export const butterfly = registerMix(n('butterfly'),
	mixAnimation(sprites.butterfly, 8, 5, 50),
	mixFlags(EntityFlags.Critter | EntityFlags.Movable | EntityFlags.StaticY));

export const firefly = registerMix(n('firefly'),
	mixAnimation(sprites.firefly, 24, 4, 44),
	mixLight(0x446a27ff, 0, 37, 128, 128), // 386a27, 83842a
	mixLightSprite(sprites.firefly_light, WHITE, 2, 40),
	mixFlags(EntityFlags.Critter | EntityFlags.Movable | EntityFlags.StaticY));

export const bat = registerMix(n('bat'),
	mixAnimation(sprites.bat, 8, 10, 65),
	mixFlags(EntityFlags.Critter | EntityFlags.Movable | EntityFlags.StaticY));

export const spider = registerMix(n('spider'),
	(base, options) => base.options = { height: 20, time: 0, ...options },
	mixDrawSpider(sprites.spider, 2, 2),
	mixFlags(EntityFlags.Critter));

// cat

sprites.cat.frames.push(sprites.emptySprite2);
sprites.cat_light.frames.push(sprites.emptySprite);

export const enum CatAnimation {
	Sit = 0,
	Enter = 1,
	Exit = 2,
	Blink = 3,
	Wag = 4,
}

const catSit = [9];
const catEnter = [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 9];
const catExit = [9, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 17];
const catBlink = [9, 10, 10, 9];
const catWag = [9, 11, 11, 12, 12, 13, 13, 14, 14, 14, 15, 15, 16, 16, 9];

export const cat = registerMix(n('cat'),
	mixAnimation(sprites.cat, 24, 17, 39, {
		repeat: false,
		animations: [catSit, catEnter, catExit, catBlink, catWag],
		lightSprite: sprites.cat_light,
	}),
	base => base.chatY = -5);

// bunny

export const enum BunnyAnimation {
	Sit = 0,
	Walk = 1,
	Blink = 2,
	Clean = 3,
	Look = 4,
}

const bunnySit = [7];
const bunnyWalk = [0, 1, 2, 3, 4, 5, 6];
const bunnyBlink = [7, 8, ...repeat(35, 7)];
const bunnyClean = [7, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, ...repeat(30, 7)];
const bunnyLook = [7, 9, 25, 26, 27, 28, 29, 30, 31, 32, 33, 9, ...repeat(30, 7)];

export const bunny = registerMix(n('bunny'),
	mixAnimation(sprites.bunny, 14, 12, 23, {
		animations: [bunnySit, bunnyWalk, bunnyBlink, bunnyClean, bunnyLook],
	}),
	mixFlags(EntityFlags.Movable));

// eyes

const spritesEyes: AnimatedRenderable = {
	frames: [sprites.emptySprite2],
	palette: sprites.defaultPalette,
};

export const eyes = registerMix(n('eyes'),
	mixAnimation(spritesEyes, 24, 16, 8, {
		repeat: false,
		animations: [[9], [10]],
		lightSprite: sprites.cat_light,
	}));

// ghosts

const ghostSprite: AnimatedRenderable = {
	frames: [
		sprites.emptySprite2,
		...sprites.ghost1.frames,
	],
	palette: sprites.ghost1.palette,
};

const ghostHoovesSprite: AnimatedRenderable = {
	frames: [
		sprites.emptySprite2,
		...sprites.ghost1_hooves.frames,
		...repeat(17, sprites.emptySprite2),
	],
	palette: sprites.ghost1_hooves.palette,
};

const ghostLightSprite: AnimatedRenderable1 = {
	frames: [
		sprites.emptySprite,
		...sprites.ghost1_light.frames,
	],
};

const ghostHoovesLightSprite: AnimatedRenderable1 = {
	frames: [
		sprites.emptySprite,
		...sprites.ghost1_hooves_light.frames,
	],
};

const ghostFPS = 20;
const ghostDX = 28;
const ghostDYBase = 40;
const ghostDY = [ghostDYBase, ghostDYBase + 7]; // by tombstone
const ghostColor = withAlphaFloat(WHITE, 0.7);
const ghostLightColor = 0x777777ff;
const ghostNone = [0];
const ghostAnim1 = [
	0,
	1, 1,
	2, 2,
	3, 3,
	4, 4,
	5, 5,
	6, 6,
	7, 7,
	8, 8,
	...repeat(10, 9),
	10,
	...repeat(3, 11),
	12,
	...repeat(14, 13),
	14, 14,
	...repeat(10, 15),
	16,
	17,
	18,
	19,
	20,
	0,
];

const ghostAnim2 = [
	0,
	21, 21,
	22, 22,
	23, 23,
	24, 24,
	25, 25,
	...repeat(10, 26),
	27,
	28,
	...repeat(4, 29),
	30,
	31,
	32,
	...repeat(10, 33),
	34,
	35,
	36,
	37,
	0,
];

const ghostAnim3 = [
	0,
	38, 38,
	39, 39,
	40, 40,
	41, 41,
	42, 42,
	43, 43,
	44, 44,
	45, 45,
	46, 46,
	47, 47,
	48, 48,
	...repeat(10, 49),
	50,
	51, 51,
	52, 52,
	53, 53,
	54, 54,
	55, 55,
	56, 56,
	57, 57,
	58,
	59,
	60,
	61,
	62,
	63,
	64,
	65,
	66,
	67,
	0,
];

export const enum GhostAnimation {
	None = 0,
	Anim1 = 1,
	Anim2 = 2,
	Anim3 = 3,
}

const createGhost = (tomb: number) => {
	const anim = mixAnimation(ghostSprite, ghostFPS, ghostDX, ghostDY[tomb], {
		color: ghostColor,
		repeat: false,
		animations: [ghostNone, ghostAnim1, ghostAnim2, ghostAnim3],
		lightSprite: ghostLightSprite,
	});

	return registerMix(n(`ghost-${tomb + 1}`),
		anim,
		base => {
			base.order = -1;
			base.lightSpriteColor = ghostLightColor;
		});
};

const createGhostHooves = (tomb: number) => {
	const anim = mixAnimation(ghostHoovesSprite, ghostFPS, ghostDX, ghostDY[tomb], {
		color: ghostColor,
		repeat: false,
		animations: [ghostNone, ghostAnim1, ghostAnim2, ghostAnim3],
		lightSprite: ghostHoovesLightSprite,
	});

	return registerMix(n(`ghost-hooves-${tomb + 1}`),
		anim,
		base => {
			base.order = -1;
			base.lightSpriteColor = ghostLightColor;
		});
};

export const ghost1 = createGhost(0);
export const ghost2 = createGhost(1);
export const ghostHooves1 = createGhostHooves(0);
export const ghostHooves2 = createGhostHooves(1);

// clouds

const cloudSprite = sprites.cloud.shadow;

export const cloud = registerMix(n('cloud'),
	mixDrawShadow(sprites.cloud, Math.floor(cloudSprite.w / 2), cloudSprite.h, CLOUD_SHADOW_COLOR),
	mixFlags(EntityFlags.Decal | EntityFlags.Movable));

// vegetation

const largeLeafedBushLarge = mixColliderRounded(-14, -6, 28, 12, 2, false);
const largeLeafedBushSmall = mixColliderRounded(-8, -4, 16, 8, 2, false);

export const largeLeafedBush1 = registerMix(n('large-leafed-bush-1'),
	mixDrawSeasonal({
		summer: { sprite: sprites.large_leafed_bush_1, dx: 17, dy: 23, palette: 0 },
		winter: { palette: 1 },
	}),
	largeLeafedBushLarge);

export const largeLeafedBush2 = registerMix(n('large-leafed-bush-2'),
	mixDrawSeasonal({
		summer: { sprite: sprites.large_leafed_bush_2, dx: 17, dy: 23, palette: 0 },
		winter: { palette: 1 },
	}),
	largeLeafedBushLarge);

export const largeLeafedBush3 = registerMix(n('large-leafed-bush-3'),
	mixDrawSeasonal({
		summer: { sprite: sprites.large_leafed_bush_3, dx: 12, dy: 17, palette: 0 },
		winter: { palette: 1 },
	}),
	largeLeafedBushSmall);

export const largeLeafedBush4 = registerMix(n('large-leafed-bush-4'),
	mixDrawSeasonal({
		summer: { sprite: sprites.large_leafed_bush_4, dx: 12, dy: 17, palette: 0 },
		winter: { palette: 1 },
	}),
	largeLeafedBushSmall);

// cliffs

const cliffTall = false;
const cliffCollider = mixColliderRect(-16, 0, 32, 24, cliffTall);
const cliffColliderTop = mixColliderRect(-16, 0, 32, 8, cliffTall);
const cliffColliderLeft = mixColliderRect(-18, 0, 6, 24, cliffTall);
const cliffColliderRight = mixColliderRect(12, 0, 6, 24, cliffTall);
const cliffColliderTrimLeft = mixColliderRect(-16, 0, 16, 24, cliffTall);
const cliffColliderTrimRight = mixColliderRect(0, 0, 16, 24, cliffTall);

const cliffColor = 0x908d7cff;
const cliffExtra = mixMinimap(cliffColor, rect(-1, 0, 1, 1));

function cliffOffset(name: string, sprite: PaletteRenderable, dx: number, dy: number, ...other: MixinEntity[]) {
	return registerMix(name,
		mixDrawSeasonal({
			summer: { sprite, dx, dy, palette: 0 },
			autumn: { palette: 1 },
			winter: { palette: 2 },
		}),
		mixFlags(EntityFlags.StaticY),
		...other);
}

function cliff(name: string, sprite: PaletteRenderable, ...other: MixinEntity[]) {
	return cliffOffset(name, sprite, Math.floor((sprite.color!.w + sprite.color!.ox) / 2), sprite.color!.oy,
		mixFlags(EntityFlags.StaticY),
		...other);
}

function cliffDecal(name: string, sprite: PaletteRenderable, dx: number, dy: number, ...other: MixinEntity[]) {
	return cliffOffset(name, sprite, dx, dy, mixFlags(EntityFlags.Decal),
		...other);
}

export const cliffSW = cliff(n('cliff-sw'), sprites.cliffs_grass_sw,
	mixColliders(
		...taperColliderSW(-16, -3, 32, 25, cliffTall),
		collider(-16, 22, 35, 24 * 2 + 7, cliffTall),
		...taperColliderNE(-16, 22 + 24 * 2 + 7, 32, 24, cliffTall),
	),
	mixMinimap(cliffColor, rect(-1, 0, 1, 4)));

export const cliffSE = cliff(n('cliff-se'), sprites.cliffs_grass_se,
	mixColliders(
		...taperColliderSE(-16, -3, 32, 25, cliffTall),
		collider(-19, 22, 35, 24 * 2 + 7, cliffTall),
		...taperColliderNW(-16, 22 + 24 * 2 + 7, 32, 24, cliffTall),
	),
	mixMinimap(cliffColor, rect(-1, 0, 1, 4)));

const cliffSCollider = mixColliderRect(-16, -3, 32, 24 * 3 + 8, cliffTall);

export const cliffS1 = cliff(n('cliff-s1'), sprites.cliffs_grass_s1,
	cliffSCollider,
	mixMinimap(cliffColor, rect(-1, 0, 1, 3)));

export const cliffS2 = cliff(n('cliff-s2'), sprites.cliffs_grass_s2,
	cliffSCollider,
	mixMinimap(cliffColor, rect(-1, 0, 1, 3)));

export const cliffS3 = cliff(n('cliff-s3'), sprites.cliffs_grass_s3,
	cliffSCollider,
	mixMinimap(cliffColor, rect(-1, 0, 1, 3)));

export const cliffSb = cliff(n('cliff-sb'), sprites.cliffs_grass_sb,
	cliffSCollider,
	mixMinimap(cliffColor, rect(-1, 0, 1, 3)));

export const cliffSbEntrance = cliff(n('cliff-sb-entrance'), sprites.cliffs_grass_sb,
	mixColliderRect(-16, -3, 32, 24 * 3, cliffTall),
	mixMinimap(cliffColor, rect(-1, 0, 1, 3)));

const cliffNWColliders = mixColliders(...skewColliderNW(0, 0, 21, 24, cliffTall));
const cliffNEColliders = mixColliders(...skewColliderNE(-22, 0, 21, 24, cliffTall));

const cliffColliderTrimLeftBot = mixColliders(
	collider(-16, 0, 16, 17, cliffTall),
	...taperColliderNW(-16, 17, 16, 11, cliffTall),
);

const cliffColliderTrimRightBot = mixColliders(
	collider(0, 0, 16, 17, cliffTall),
	...taperColliderNE(0, 17, 16, 11, cliffTall),
);

export const cliffTopNW = cliff(n('cliff-top-nw'), sprites.cliffs_grass_top_nw, cliffNWColliders, cliffExtra);
export const cliffTopN = cliff(n('cliff-top-n'), sprites.cliffs_grass_top_n, cliffColliderTop, cliffExtra);
export const cliffTopNE = cliff(n('cliff-top-ne'), sprites.cliffs_grass_top_ne, cliffNEColliders, cliffExtra);
export const cliffTopW = cliffOffset(n('cliff-top-w'), sprites.cliffs_grass_top_w, 16, 0, cliffColliderLeft, cliffExtra);
export const cliffTopE = cliff(n('cliff-top-e'), sprites.cliffs_grass_top_e, cliffColliderRight, cliffExtra);
export const cliffTopSW = cliff(n('cliff-top-sw'), sprites.cliffs_grass_top_sw, cliffCollider, cliffExtra);
export const cliffTopSE = cliff(n('cliff-top-se'), sprites.cliffs_grass_top_se, cliffCollider, cliffExtra);

export const cliffTopS1 = cliff(n('cliff-top-s1'), sprites.cliffs_grass_top_s1, cliffCollider, cliffExtra);
export const cliffTopS2 = cliff(n('cliff-top-s2'), sprites.cliffs_grass_top_s2, cliffCollider, cliffExtra);
export const cliffTopS3 = cliff(n('cliff-top-s3'), sprites.cliffs_grass_top_s3, cliffCollider, cliffExtra);
export const cliffTopSb = cliff(n('cliff-top-sb'), sprites.cliffs_grass_top_sb, cliffCollider, cliffExtra);

export const cliffMidS1 = cliff(n('cliff-mid-s1'), sprites.cliffs_grass_mid_s1, cliffCollider, cliffExtra);
export const cliffMidS2 = cliff(n('cliff-mid-s2'), sprites.cliffs_grass_mid_s2, cliffCollider, cliffExtra);
export const cliffMidS3 = cliff(n('cliff-mid-s3'), sprites.cliffs_grass_mid_s3, cliffCollider, cliffExtra);
export const cliffMidSb = cliff(n('cliff-mid-sb'), sprites.cliffs_grass_mid_sb, cliffCollider, cliffExtra);

export const cliffMidSW1 = cliff(n('cliff-mid-sw1'), sprites.cliffs_grass_mid_sw1, cliffCollider, cliffExtra);
export const cliffMidSE1 = cliff(n('cliff-mid-se1'), sprites.cliffs_grass_mid_se1, cliffCollider, cliffExtra);
export const cliffMidSW2 = cliff(n('cliff-mid-sw2'), sprites.cliffs_grass_mid_sw2, cliffCollider, cliffExtra);
export const cliffMidSE2 = cliff(n('cliff-mid-se2'), sprites.cliffs_grass_mid_se2, cliffCollider, cliffExtra);

export const cliffBotS1 = cliff(n('cliff-bot-s1'), sprites.cliffs_grass_bot_s1, cliffCollider, cliffExtra);
export const cliffBotS2 = cliff(n('cliff-bot-s2'), sprites.cliffs_grass_bot_s2, cliffCollider, cliffExtra);
export const cliffBotS3 = cliff(n('cliff-bot-s3'), sprites.cliffs_grass_bot_s3, cliffCollider, cliffExtra);
export const cliffBotSb = cliff(n('cliff-bot-sb'), sprites.cliffs_grass_bot_sb, cliffCollider, cliffExtra);

export const cliffBotSW = cliff(n('cliff-bot-sw'), sprites.cliffs_grass_bot_sw, cliffCollider, cliffExtra);
export const cliffBotSE = cliff(n('cliff-bot-se'), sprites.cliffs_grass_bot_se, cliffCollider, cliffExtra);

export const cliffTopTrimLeft = cliffDecal(
	n('cliff-top-trim-left'), sprites.cliffs_grass_top_trim_left, 16, 0, cliffColliderTrimRight, mixOrder(1));
export const cliffMidTrimLeft = cliffDecal(
	n('cliff-mid-trim-left'), sprites.cliffs_grass_mid_trim_left, 16, 0, cliffColliderTrimRight, mixOrder(1));
export const cliffBotTrimLeft = cliffDecal(
	n('cliff-bot-trim-left'), sprites.cliffs_grass_bot_trim_left, 16, 0, cliffColliderTrimRightBot, mixOrder(1));

export const cliffTopTrimRight = cliffDecal(
	n('cliff-top-trim-right'), sprites.cliffs_grass_top_trim_right, 16, 0, cliffColliderTrimLeft);
export const cliffMidTrimRight = cliffDecal(
	n('cliff-mid-trim-right'), sprites.cliffs_grass_mid_trim_right, 16, 0, cliffColliderTrimLeft);
export const cliffBotTrimRight = cliffDecal(
	n('cliff-bot-trim-right'), sprites.cliffs_grass_bot_trim_right, 16, 0, cliffColliderTrimLeftBot);

export const cliffDecal1 = cliffDecal(n('cliff-decal-1'), sprites.cliffs_grass_decal_1, 14, 1, mixOrder(2));
export const cliffDecal2 = cliffDecal(n('cliff-decal-2'), sprites.cliffs_grass_decal_2, 14, 1, mixOrder(2));
export const cliffDecal3 = cliffDecal(n('cliff-decal-3'), sprites.cliffs_grass_decal_3, 16, -2, mixOrder(2));
export const cliffDecalL = cliffDecal(n('cliff-decal-l'), sprites.cliffs_grass_decal_l, 15, 1, mixOrder(2));
export const cliffDecalR = cliffDecal(n('cliff-decal-r'), sprites.cliffs_grass_decal_r, 16, 1, mixOrder(2));

// cave

const caveTall = true;
const caveCollider = mixColliderRect(-16, 0, 32, 24, caveTall);
const caveColliderTop = mixColliderRect(-16, 0, 32, 24, caveTall);
const caveColliderLeft = mixColliderRect(-18, 0, 24, 24, caveTall);
const caveColliderRight = mixColliderRect(-16, 0, 34, 24, caveTall);
const caveColliderTrimLeft = mixColliderRect(-16, 0, 16, 24, caveTall);
const caveColliderTrimRight = mixColliderRect(0, 0, 16, 24, caveTall);

const caveColor = 0x6a6f73ff;
const caveExtra = mixMinimap(caveColor, rect(-1, 0, 1, 1));

function caveOffset(name: string, sprite: PaletteRenderable, dx: number, dy: number, ...other: MixinEntity[]) {
	return registerMix(name,
		mixDrawSeasonal({
			summer: { sprite, dx, dy, palette: 0 },
			autumn: { palette: 1 },
			winter: { palette: 2 },
		}),
		mixFlags(EntityFlags.StaticY),
		...other);
}

function cave(name: string, sprite: PaletteRenderable, ...other: MixinEntity[]) {
	return caveOffset(name, sprite, Math.floor((sprite.color!.w + sprite.color!.ox) / 2), sprite.color!.oy,
		...other);
}

function caveDecal(name: string, sprite: PaletteRenderable, dx: number, dy: number, ...other: MixinEntity[]) {
	return caveOffset(name, sprite, dx, dy, mixFlags(EntityFlags.Decal),
		...other);
}

export const caveSW = cave(n('cave-sw'), sprites.cave_walls_sw,
	mixColliders(
		collider(-16, -3, 35, 24 * 2 + 7 + 25, caveTall),
		...taperColliderNE(-16, 22 + 24 * 2 + 7, 32, 24, caveTall),
	),
	mixMinimap(caveColor, rect(-1, 0, 1, 4)));

export const caveSE = cave(n('cave-se'), sprites.cave_walls_se,
	mixColliders(
		collider(-19, -3, 35, 24 * 2 + 7 + 25, caveTall),
		...taperColliderNW(-16, 22 + 24 * 2 + 7, 32, 24, caveTall),
	),
	mixMinimap(caveColor, rect(-1, 0, 1, 4)));

const caveSCollider = mixColliderRect(-16, -3, 32, 24 * 3 + 8, caveTall);

export const caveS1 = cave(n('cave-s1'), sprites.cave_walls_s1,
	caveSCollider,
	mixMinimap(caveColor, rect(-1, 0, 1, 3)));

export const caveS2 = cave(n('cave-s2'), sprites.cave_walls_s2,
	caveSCollider,
	mixMinimap(caveColor, rect(-1, 0, 1, 3)));

export const caveS3 = cave(n('cave-s3'), sprites.cave_walls_s3,
	caveSCollider,
	mixMinimap(caveColor, rect(-1, 0, 1, 3)));

export const caveSb = cave(n('cave-sb'), sprites.cave_walls_sb,
	caveSCollider,
	mixMinimap(caveColor, rect(-1, 0, 1, 3)));

const caveNWColliders = mixColliders(...triangleColliderNW(0, 0, 21, 24, caveTall));
const caveNEColliders = mixColliders(...triangleColliderNE(-22, 0, 21, 24, caveTall));

const caveColliderTrimLeftBot = mixColliders(
	collider(-16, 0, 16, 17, caveTall),
	...taperColliderNW(-16, 17, 16, 11, caveTall),
);

const caveColliderTrimRightBot = mixColliders(
	collider(0, 0, 16, 17, caveTall),
	...taperColliderNE(0, 17, 16, 11, caveTall),
);

export const caveTopNW = cave(n('cave-top-nw'), sprites.cave_walls_top_nw, caveNWColliders, caveExtra);
export const caveTopN = cave(n('cave-top-n'), sprites.cave_walls_top_n, caveColliderTop, caveExtra);
export const caveTopNE = cave(n('cave-top-ne'), sprites.cave_walls_top_ne, caveNEColliders, caveExtra);
export const caveTopW = caveOffset(n('cave-top-w'), sprites.cave_walls_top_w, 16, 0, caveColliderLeft, caveExtra);
export const caveTopE = cave(n('cave-top-e'), sprites.cave_walls_top_e, caveColliderRight, caveExtra);
export const caveTopSW = cave(n('cave-top-sw'), sprites.cave_walls_top_sw, caveCollider, caveExtra);
export const caveTopSE = cave(n('cave-top-se'), sprites.cave_walls_top_se, caveCollider, caveExtra);

export const caveTopS1 = cave(n('cave-top-s1'), sprites.cave_walls_top_s1, caveCollider, caveExtra);
export const caveTopS2 = cave(n('cave-top-s2'), sprites.cave_walls_top_s2, caveCollider, caveExtra);
export const caveTopS3 = cave(n('cave-top-s3'), sprites.cave_walls_top_s3, caveCollider, caveExtra);
export const caveTopSb = cave(n('cave-top-sb'), sprites.cave_walls_top_sb, caveCollider, caveExtra);

export const caveMidS1 = cave(n('cave-mid-s1'), sprites.cave_walls_mid_s1, caveCollider, caveExtra);
export const caveMidS2 = cave(n('cave-mid-s2'), sprites.cave_walls_mid_s2, caveCollider, caveExtra);
export const caveMidS3 = cave(n('cave-mid-s3'), sprites.cave_walls_mid_s3, caveCollider, caveExtra);
export const caveMidSb = cave(n('cave-mid-sb'), sprites.cave_walls_mid_sb, caveCollider, caveExtra);

export const caveMidSW1 = cave(n('cave-mid-sw1'), sprites.cave_walls_mid_sw1, caveCollider, caveExtra);
export const caveMidSE1 = cave(n('cave-mid-se1'), sprites.cave_walls_mid_se1, caveCollider, caveExtra);
export const caveMidSW2 = cave(n('cave-mid-sw2'), sprites.cave_walls_mid_sw2, caveCollider, caveExtra);
export const caveMidSE2 = cave(n('cave-mid-se2'), sprites.cave_walls_mid_se2, caveCollider, caveExtra);

export const caveBotS1 = cave(n('cave-bot-s1'), sprites.cave_walls_bot_s1, caveCollider, caveExtra);
export const caveBotS2 = cave(n('cave-bot-s2'), sprites.cave_walls_bot_s2, caveCollider, caveExtra);
export const caveBotS3 = cave(n('cave-bot-s3'), sprites.cave_walls_bot_s3, caveCollider, caveExtra);
export const caveBotSb = cave(n('cave-bot-sb'), sprites.cave_walls_bot_sb, caveCollider, caveExtra);

export const caveBotSW = cave(n('cave-bot-sw'), sprites.cave_walls_bot_sw, caveCollider, caveExtra);
export const caveBotSE = cave(n('cave-bot-se'), sprites.cave_walls_bot_se, caveCollider, caveExtra);

export const caveTopTrimLeft = caveDecal(
	n('cave-top-trim-left'), sprites.cave_walls_top_trim_left, 16, 0, caveColliderTrimRight, mixOrder(1));
export const caveMidTrimLeft = caveDecal(
	n('cave-mid-trim-left'), sprites.cave_walls_mid_trim_left, 16, 0, caveColliderTrimRight, mixOrder(1));
export const caveBotTrimLeft = caveDecal(
	n('cave-bot-trim-left'), sprites.cave_walls_bot_trim_left, 16, 0, caveColliderTrimRightBot, mixOrder(1));

export const caveTopTrimRight = caveDecal(
	n('cave-top-trim-right'), sprites.cave_walls_top_trim_right, 16, 0, caveColliderTrimLeft);
export const caveMidTrimRight = caveDecal(
	n('cave-mid-trim-right'), sprites.cave_walls_mid_trim_right, 16, 0, caveColliderTrimLeft);
export const caveBotTrimRight = caveDecal(
	n('cave-bot-trim-right'), sprites.cave_walls_bot_trim_right, 16, 0, caveColliderTrimLeftBot);

export const caveDecal1 = caveDecal(n('cave-decal-1'), sprites.cave_walls_decal_1, 14, 1, mixOrder(2));
export const caveDecal2 = caveDecal(n('cave-decal-2'), sprites.cave_walls_decal_2, 14, 1, mixOrder(2));
export const caveDecal3 = caveDecal(n('cave-decal-3'), sprites.cave_walls_decal_3, 16, -2, mixOrder(2));
export const caveDecalL = caveDecal(n('cave-decal-l'), sprites.cave_walls_decal_l, 15, 1, mixOrder(2));
export const caveDecalR = caveDecal(n('cave-decal-r'), sprites.cave_walls_decal_r, 16, 1, mixOrder(2));

export const caveFill = registerMix(n('cave-fill'),
	mixDraw(sprites.tile_none, 0, 0),
	mixColliderRect(0, 0, 32, 24, true, true),
	mixFlags(EntityFlags.StaticY));

export const caveCover = registerMix(n('cave-cover'),
	mixDraw(sprites.tile_none, 0, 24),
	mixFlags(EntityFlags.StaticY));

// stalactites

export const stalactite1 = doodad(n('stalactite-1'), sprites.stalactite_1, 4, 15, 0,
	mixColliderRounded(-4, -3, 8, 5, 2),
	mixFlags(EntityFlags.StaticY));

export const stalactite2 = doodad(n('stalactite-2'), sprites.stalactite_2, 5, 31, 0,
	mixColliderRounded(-5, -4, 10, 5, 2),
	mixFlags(EntityFlags.StaticY));

export const stalactite3 = doodad(n('stalactite-3'), sprites.stalactite_3, 6, 51, 0,
	mixColliderRounded(-6, -6, 12, 7, 3),
	mixFlags(EntityFlags.StaticY));

// crystals

const crystalLight = 0x299ad5ff;
const mixCrystalLight = mixLight(crystalLight, 0, 0, 200, 200);
const waterCrystalFPS = WATER_FPS;

export const crystals1 = registerMix(n('crystals-1'),
	mixDraw(sprites.crystals_1, 8, 16),
	mixLightSprite(sprites.light_crystals_1, WHITE, 8, 16),
	mixCrystalLight,
	mixColliderRounded(-7, -4, 16, 4, 1));

export const crystals2 = registerMix(n('crystals-2'),
	mixDraw(sprites.crystals_2, 11, 19),
	mixLightSprite(sprites.light_crystals_2, WHITE, 11, 19),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystals3 = registerMix(n('crystals-3'),
	mixDraw(sprites.crystals_3, 13, 18),
	mixLightSprite(sprites.light_crystals_3, WHITE, 13, 18),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystals4 = registerMix(n('crystals-4'),
	mixDraw(sprites.crystals_4, 11, 15),
	mixLightSprite(sprites.light_crystals_4, WHITE, 11, 15),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystals5 = registerMix(n('crystals-5'),
	mixDraw(sprites.crystals_5, 12, 18),
	mixLightSprite(sprites.light_crystals_5, WHITE, 12, 18),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystals6 = registerMix(n('crystals-6'),
	mixDraw(sprites.crystals_6, 11, 13),
	mixLightSprite(sprites.light_crystals_6, WHITE, 11, 13),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystals7 = registerMix(n('crystals-7'),
	mixDraw(sprites.crystals_7, 13, 16),
	mixLightSprite(sprites.light_crystals_7, WHITE, 13, 16),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystals8 = registerMix(n('crystals-8'),
	mixDraw(sprites.crystals_8, 8, 17),
	mixLightSprite(sprites.light_crystals_8, WHITE, 8, 17),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystals9 = registerMix(n('crystals-9'),
	mixDraw(sprites.crystals_9, 8, 11),
	mixLightSprite(sprites.light_crystals_9, WHITE, 8, 11),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystals10 = registerMix(n('crystals-10'),
	mixDraw(sprites.crystals_10, 5, 12),
	mixLightSprite(sprites.light_crystals_10, WHITE, 5, 12),
	mixCrystalLight,
	mixColliderRounded(-9, -4, 18, 4, 1));

export const crystalsCartPile = registerMix(n('crystals-cart-pile'),
	mixDraw(sprites.crystals_cart_pile, 21, 28),
	mixLightSprite(sprites.light_crystals_cart_pile, WHITE, 21, 28),
	mixCrystalLight,
	mixInteract(-20, -28, 40, 40, 3),
	mixFlags(EntityFlags.StaticY),
	mixOrder(2));

export const crystalHeld = registerMix(n('crystal-held'),
	mixDraw(sprites.crystals_held, 7, 4),
	mixLightSprite(sprites.light_crystals_held, WHITE, 7, 4),
	mixLight(crystalLight, 0, 0, 160, 160),
	mixPickable(31, 44));

export const crystalLantern = registerMix(n('crystal-lantern'),
	mixDraw(sprites.crystal_lantern, 4, 15),
	mixLightSprite(sprites.light_crystal_lantern, WHITE, 4, 15),
	mixLight(crystalLight, 0, 0, 192, 144),
	mixPickable(31, 55));

export const waterCrystal1 = registerMix(n('water-crystal-1'),
	mixAnimation(sprites.water_crystal_1, waterCrystalFPS, 4, 12, {
		lightSprite: sprites.water_crystal_1_light,
	}),
	mixCrystalLight,
	mixColliderRounded(-4, -4, 9, 8, 2, false),
	mixFlags(EntityFlags.StaticY));

export const waterCrystal2 = registerMix(n('water-crystal-2'),
	mixAnimation(sprites.water_crystal_2, waterCrystalFPS, 9, 11, {
		lightSprite: sprites.water_crystal_2_light,
	}),
	mixCrystalLight,
	mixColliderRounded(-9, -6, 16, 7, 2, false),
	mixFlags(EntityFlags.StaticY));


export const waterCrysta3 = registerMix(n('water-crystal-3'),
	mixAnimation(sprites.water_crystal_3, waterCrystalFPS, 5, 10, {
		lightSprite: sprites.water_crystal_3_light,
	}),
	mixCrystalLight,
	mixColliderRounded(-4, -4, 7, 5, 2, false),
	mixFlags(EntityFlags.StaticY));

// mine

export const mineEntrance = registerMix(n('mine-entrance'),
	mixDraw(sprites.mine_entrance, 49, 0),
	mixInteract(-32, -48, 65, 46, 3),
	mixOrder(10));

export const mineClosed = registerMix(n('mine-closed'),
	mixDraw(sprites.mine_closed, 36, -24),
	mixOrder(11));

export const mineCart = doodad(n('mine-cart'), sprites.mine_cart, 26, 32, 0,
	mixColliderRect(-27, 0, 54, 21),
	mixFlags(EntityFlags.StaticY),
	mixOrder(1));

export const mineCartFront = doodad(n('mine-cart-front'), sprites.mine_cart_front, 26, 52, 0,
	mixColliders(
		collider(-30, -25, 55, 4),
		collider(-30, -19, 15, 20),
		collider(-30, 2, 55, 4),
	),
	mixFlags(EntityFlags.StaticY));

export const mineCartBack = doodad(n('mine-cart-back'), sprites.mine_cart_back, 26, 30, 0,
	mixFlags(EntityFlags.StaticY));

const railsExtra = mixFlags(EntityFlags.StaticY);

export const mineRailsH = decal(n('mine-rails-h'), sprites.mine_rails_h, 0, railsExtra);
export const mineRailsV = decal(n('mine-rails-v'), sprites.mine_rails_v, 0, railsExtra);
export const mineRailsSE = decalOffset(n('mine-rails-se'), sprites.mine_rails_se, 16, 0, 0, railsExtra);
export const mineRailsSW = decalOffset(n('mine-rails-sw'), sprites.mine_rails_sw, 16, 0, 0, railsExtra);
export const mineRailsNE = decalOffset(n('mine-rails-ne'), sprites.mine_rails_ne, 16, 0, 0, railsExtra);
export const mineRailsNW = decalOffset(n('mine-rails-nw'), sprites.mine_rails_nw, 16, 0, 0, railsExtra);

export const mineRailsNSW = decalOffset(n('mine-rails-nsw'), sprites.mine_rails_nsw, 16, 1, 0, railsExtra);
export const mineRailsNSE = decalOffset(n('mine-rails-nse'), sprites.mine_rails_nse, 16, 1, 0, railsExtra);
export const mineRailsNWE = decalOffset(n('mine-rails-nwe'), sprites.mine_rails_nwe, 16, 0, 0, railsExtra);
export const mineRailsSWE = decalOffset(n('mine-rails-swe'), sprites.mine_rails_swe, 16, 0, 0, railsExtra);

export const mineRailsEndLeft = doodad(n('mine-rails-end-left'), sprites.mine_rails_end_left, 17, 30, 0,
	mixColliderRect(-20, -10, 38, 23),
	railsExtra);

export const mineRailsEndRight = doodad(n('mine-rails-end-right'), sprites.mine_rails_end_right, 16, 30, 0,
	mixColliderRect(-16, -10, 38, 23),
	railsExtra);

export const mineRailsEndTop = doodad(n('mine-rails-end-top'), sprites.mine_rails_end_top, 16, 32, 0,
	mixColliderRect(-16, -32, 32, 32),
	railsExtra);

export const mineRailsFadeUp = decal(n('mine-rails-fade-up'), sprites.mine_rail_fade_up, 0,
	railsExtra);

// collider utils

export const collider1x1 = registerMix(n('collider-1x1'), mixColliderRect(0, 0, 1 * tileWidth, 1 * tileHeight, false, true));
export const collider2x1 = registerMix(n('collider-2x1'), mixColliderRect(0, 0, 2 * tileWidth, 1 * tileHeight, false, true));
export const collider3x1 = registerMix(n('collider-3x1'), mixColliderRect(0, 0, 3 * tileWidth, 1 * tileHeight, false, true));
export const collider1x2 = registerMix(n('collider-1x2'), mixColliderRect(0, 0, 1 * tileWidth, 2 * tileHeight, false, true));
export const collider1x3 = registerMix(n('collider-1x3'), mixColliderRect(0, 0, 1 * tileWidth, 3 * tileHeight, false, true));

// trees

const stumpsTall = false;
const treeAutumnPals = [2, 3, 4];

export const web = doodad(n('web'), sprites.web, -6, 39, 0,
	mixCover(-50, -135, 110, 120));

export const xmasLights = registerMix(n('xmas-lights'), mixLightSprite(sprites.light6, WHITE, 75, 180));
export const xmasLight = registerMix(n('xmas-light'), mixLight(0x926923ff, 0, 0, 50, 50));

const tree1Options = { sprite: sprites.tree_1, dx: 5, dy: 9 };
const tree2Options = { sprite: sprites.tree_2, dx: 10, dy: 32 };
const tree3Options = { sprite: sprites.tree_3, dx: 21, dy: 59 };

export const trees1 = times(3, i => registerMix(n(`tree1-${i}`),
	mixDrawSeasonal({
		summer: { ...tree1Options, palette: 0 },
		autumn: { ...tree1Options, palette: treeAutumnPals[i] },
		winter: { ...tree1Options, palette: 1 },
	})));

export const trees2 = times(3, i => registerMix(n(`tree2-${i}`),
	mixDrawSeasonal({
		summer: { ...tree2Options, palette: 0 },
		autumn: { ...tree2Options, palette: treeAutumnPals[i] },
		winter: { ...tree2Options, palette: 1 },
	})));

export const trees3 = times(3, i => registerMix(n(`tree3-${i}`),
	mixDrawSeasonal({
		summer: { ...tree3Options, palette: 0 },
		autumn: { ...tree3Options, palette: treeAutumnPals[i] },
		winter: { ...tree3Options, palette: 1 },
	}),
	mixColliderRounded(-3, -2, 6, 4, 1)));

export const tree1 = trees1[0];
export const tree2 = trees2[0];
export const tree3 = trees3[0];

export const [tree4] = createTree(n('tree4'), 31, 92, 12, {
	stumpCollider: mixColliderRounded(-5, -1, 12, 6, 1, stumpsTall),
	trunkCollider: mixColliderRounded(-5, -1, 12, 6, 1),
	cover: rect(-20, -77, 42, 60),
	variants: times(3, i =>
		({
			stump: sprites.tree_4Stump0,
			trunk: sprites.tree_4Trunk0,
			crown: sprites.tree_4Crown0_0,
			palette: 0,
			paletteAutumn: treeAutumnPals[i],
			paletteWinter: 1,
		})),
});

export const [tree5, [tree5Stump]] = createTree(n('tree5'), 43, 128, 24, {
	stumpCollider: mixColliderRounded(-8, -2, 16, 8, 2, stumpsTall),
	trunkCollider: mixColliderRounded(-8, -2, 16, 8, 2),
	cover: rect(-30, -106, 64, 80),
	variants: times(3, i =>
		({
			stump: sprites.tree_5Stump0,
			trunk: sprites.tree_5Trunk0,
			crown: sprites.tree_5Crown0_0,
			palette: 0,
			paletteAutumn: treeAutumnPals[i],
			paletteWinter: 1,
		})),
});

export const [tree, [treeStump1, treeStump2]] = createTree(n('tree'), 80, 162, 30, {
	stumpCollider: mixColliderRounded(-16, -1, 32, 12, 4, stumpsTall),
	trunkCollider: mixColliderRounded(-16, -1, 32, 12, 4),
	cover: rect(-50, -135, 110, 120),
	variants: flatten(times(3, i => [
		{
			stump: sprites.tree_6Stump0,
			stumpWinter: sprites.tree_6StumpWinter0,
			trunk: sprites.tree_6Trunk0,
			crown: sprites.tree_6Crown0_0,
			webX: 0, webY: 0, spiderHeight: 19,
			palette: 0, paletteWinter: 1, paletteAutumn: treeAutumnPals[i],
		},
		{
			stump: sprites.tree_6Stump1,
			stumpWinter: sprites.tree_6StumpWinter1,
			trunk: sprites.tree_6Trunk1,
			crown: sprites.tree_6Crown0_1,
			webX: -2, webY: 0, spiderHeight: 19,
			palette: 0, paletteWinter: 1, paletteAutumn: treeAutumnPals[i],
		},
		{
			stump: sprites.tree_6Stump0,
			stumpWinter: sprites.tree_6StumpWinter0,
			trunk: sprites.tree_6Trunk0,
			crown: sprites.tree_6Crown1_0,
			webX: 0, webY: -4, spiderHeight: 27,
			palette: 0, paletteWinter: 1, paletteAutumn: treeAutumnPals[i],
		},
		{
			stump: sprites.tree_6Stump1,
			stumpWinter: sprites.tree_6StumpWinter1,
			trunk: sprites.tree_6Trunk1,
			crown: sprites.tree_6Crown1_1,
			webX: -2, webY: -4, spiderHeight: 27,
			palette: 0, paletteWinter: 1, paletteAutumn: treeAutumnPals[i],
		},
	]))
});

const pine1Options = { sprite: sprites.pine_1, dx: 7, dy: 18 };
const pine2Options = { sprite: sprites.pine_2, dx: 10, dy: 35 };

export const pine1 = registerMix(n('pine1'),
	mixDrawSeasonal({
		summer: { ...pine1Options, palette: 0 },
		autumn: { ...pine1Options, palette: 1 },
		winter: { ...pine1Options, palette: 2 },
	}));

export const pine2 = registerMix(n('pine2'),
	mixDrawSeasonal({
		summer: { ...pine2Options, palette: 0 },
		autumn: { ...pine2Options, palette: 1 },
		winter: { ...pine2Options, palette: 2 },
	}),
	mixColliderRounded(-3, -2, 6, 4, 1));

export const [pine3] = createTree(n('pine3'), 25, 68, 2, {
	stumpCollider: mixColliderRounded(-5, -1, 12, 6, 1, stumpsTall),
	trunkCollider: mixColliderRounded(-5, -1, 12, 6, 1),
	crownCollider: mixColliderRounded(-14, -6, 29, 12, 4),
	cover: rect(-17, -41, 35, 40),
	variants: [
		{ stump: sprites.pine_3Stump0, crown: sprites.pine_3Crown0_0, palette: 0, paletteAutumn: 1, paletteWinter: 2 },
	]
});

export const [pine4] = createTree(n('pine4'), 41, 95, 8, {
	stumpCollider: mixColliderRounded(-5, 4, 11, 6, 1, stumpsTall),
	trunkCollider: mixColliderRounded(-5, 4, 11, 6, 1),
	crownCollider: mixColliderRounded(-23, -8, 46, 20, 6),
	cover: rect(-23, -68, 46, 70),
	variants: [
		{ stump: sprites.pine_4Stump0, crown: sprites.pine_4Crown0_0, palette: 0, paletteAutumn: 1, paletteWinter: 2 },
	]
});

export const [pine5] = createTree(n('pine5'), 53, 136, 5, {
	stumpCollider: mixColliderRounded(-8, -3, 18, 10, 4, stumpsTall),
	trunkCollider: mixColliderRounded(-8, -3, 18, 10, 4),
	crownCollider: mixColliderRounded(-29, -12, 60, 25, 6),
	cover: rect(-38, -95, 80, 100),
	variants: [
		{ stump: sprites.pine_5Stump0, crown: sprites.pine_5Crown0_0, palette: 0, paletteAutumn: 1, paletteWinter: 2 },
	]
});

const xmasCrown: ColorShadow = {
	color: sprites.christmastree.color,
	shadow: sprites.pine_6Crown0_0.shadow,
	palettes: sprites.christmastree.palettes,
};

export const [pine] = createTree(n('pine'), 75, 180, 17, {
	stumpCollider: mixColliderRounded(-16, -1, 32, 14, 4, stumpsTall),
	trunkCollider: mixColliderRounded(-16, -1, 32, 14, 4),
	crownCollider: mixColliderRounded(-38, -21, 76, 31, 7),
	cover: rect(-55, -120, 110, 133),
	variants: [
		{ stump: sprites.pine_6Stump0, crown: sprites.pine_6Crown0_0, palette: 0, paletteAutumn: 1, paletteWinter: 2 },
		{ stump: sprites.pine_6Stump0, crown: xmasCrown, palette: 0 },
	]
});

// tree helpers

interface TreeVariant {
	stump: PaletteRenderable;
	stumpWinter?: PaletteRenderable;
	trunk?: PaletteRenderable;
	crown: PaletteRenderable;
	webX?: number;
	webY?: number;
	spiderHeight?: number;
	palette?: number;
	paletteWinter?: number;
	paletteAutumn?: number;
}

interface TreeParams {
	variants: TreeVariant[];
	cover: Rect;
	stumpCollider?: MixinEntity;
	trunkCollider?: MixinEntity;
	crownCollider?: MixinEntity;
}

type CreateTreeMethod = (x: number, y: number, v: number, hasWeb?: boolean, hasSpider?: boolean) => Entity[];

function createTree(
	name: string, offsetX: number, offsetY: number, crownOffset: number,
	{ cover, stumpCollider, trunkCollider, crownCollider, variants }: TreeParams,
): [CreateTreeMethod, CreateEntityMethod[], (CreateEntityMethod | undefined)[], CreateEntityMethod[]] {
	const trunkCover: MixinEntity = base => base.coverBounds = cover;
	const crownCover = mixCover(cover.x, cover.y - crownOffset, cover.w, cover.h);
	const crownFlags = mixServerFlags(ServerFlags.TreeCrown);
	const crownMinimap = mixMinimap(0x386c4fff, rect(-1, -1, 3, 3), 2);

	const stumps = variants.map((v, i) => v.stump && registerMix(n(`${name}-stump-${i}`),
		mixDrawSeasonal({
			summer: { sprite: v.stump, dx: offsetX, dy: offsetY, palette: v.palette || 0 },
			autumn: { sprite: v.stump, dx: offsetX, dy: offsetY, palette: v.paletteAutumn || v.palette || 0 },
			winter: { sprite: v.stumpWinter || v.stump, dx: offsetX, dy: offsetY, palette: v.paletteWinter || v.palette || 0 },
		}),
		stumpCollider,
		mixOrder(1)));

	const stumpsTall = variants.map((v, i) => v.stump && registerMix(n(`${name}-stump-tall-${i}`),
		mixDrawSeasonal({
			summer: { sprite: v.stump, dx: offsetX, dy: offsetY, palette: v.palette || 0 },
			autumn: { sprite: v.stump, dx: offsetX, dy: offsetY, palette: v.paletteAutumn || v.palette || 0 },
			winter: { sprite: v.stumpWinter || v.stump, dx: offsetX, dy: offsetY, palette: v.paletteWinter || v.palette || 0 },
		}),
		trunkCollider,
		mixOrder(1)));

	const trunks = variants.map((v, i) => v.trunk && registerMix(n(`${name}-trunk-${i}`),
		mixDrawSeasonal({
			summer: { sprite: v.trunk, dx: offsetX, dy: offsetY, palette: v.palette || 0 },
			autumn: { sprite: v.trunk, dx: offsetX, dy: offsetY, palette: v.paletteAutumn || v.palette || 0 },
			winter: { sprite: v.trunk, dx: offsetX, dy: offsetY, palette: v.paletteWinter || v.palette || 0 },
		}),
		trunkCover,
		mixOrder(2)));

	const crowns = variants.map((v, i) => v.crown && registerMix(n(`${name}-crown-${i}`),
		mixDrawSeasonal({
			summer: { sprite: v.crown, dx: offsetX, dy: offsetY + crownOffset, palette: v.palette || 0 },
			autumn: { sprite: v.crown, dx: offsetX, dy: offsetY + crownOffset, palette: v.paletteAutumn || v.palette || 0 },
			winter: { sprite: v.crown, dx: offsetX, dy: offsetY + crownOffset, palette: v.paletteWinter || v.palette || 0 },
		}),
		crownCollider, crownCover, crownFlags, crownMinimap));

	const trees = variants.map((v, i) => ({
		stump: stumps[i],
		stumpTall: stumpsTall[i],
		trunk: trunks[i],
		crown: crowns[i],
		webX: v.webX,
		webY: v.webY,
		spiderHeight: v.spiderHeight,
	}));

	function tree(x: number, y: number, v?: number, hasWeb?: boolean, hasSpider?: boolean): Entity[] {
		const { stumpTall, trunk, crown, webX, webY, spiderHeight } = trees[v || 0];

		return compact([
			stumpTall && stumpTall(x, y),
			trunk && trunk(x, y),
			crown && crown(x, y + (crownOffset / tileHeight)),
			hasWeb ? web(x + (webX! / tileWidth), y + (webY! / tileHeight)) : undefined,
			hasSpider ? spider(x - 1, y + 0.3, { height: spiderHeight!, time: Math.random() * 100 }) : undefined,
		]);
	}

	return [tree, stumps, trunks, crowns];
}

export const stashEntities = [
	rose, cookie, cookiePony, letter, rope,
];

export const placeableEntities: { type: number; name: string; }[] = [
	{ type: cushion1.type, name: 'Cushion (red)' },
	{ type: cushion2.type, name: 'Cushion (blue)' },
	{ type: cushion3.type, name: 'Cushion (green)' },
	{ type: barrel.type, name: 'Barrel' },
	{ type: box.type, name: 'Box' },
	{ type: boxLanterns.type, name: 'Box of lanterns' },
	{ type: boxFruits.type, name: 'Box of fruits' },
	{ type: cookieTable2.type, name: 'Cookie table' },
	{ type: table1.type, name: 'Small table' },
	{ type: table2.type, name: 'Large table' },
	{ type: table3.type, name: 'Long table' },
	{ type: lanternOn.type, name: 'Lantern' },
	{ type: pumpkin.type, name: 'Pumpkin' },
	{ type: jackoOn.type, name: `Jack-o'-lantern (lit)` },
	{ type: jackoOff.type, name: `Jack-o'-lantern (unlit)` },
	{ type: crate1A.type, name: 'Large crate' },
	{ type: crate3A.type, name: 'Small crate' },
	{ type: crate2A.type, name: 'Lockbox' },
	{ type: largeLeafedBush1.type, name: 'Large plant' },
	{ type: largeLeafedBush3.type, name: 'Small plant' },
	{ type: picture1.type, name: 'Picture (1)' },
	{ type: picture2.type, name: 'Picture (2)' },
	{ type: window1.type, name: 'Window' },
	{ type: bookshelf.type, name: 'Bookshelf' },
	{ type: rock.type, name: 'Rock' },
];

export const fruits = [
	apple, apple2, appleGreen, appleGreen2, orange, pear, banana,
	lemon, lime, carrotHeld, mango, grapesGreen[0], grapesPurple[0],
];

export const tools = [
	{ type: saw.type, text: 'Saw: place & remove walls' },
	{ type: broom.type, text: 'Broom: remove furniture' },
	{ type: hammer.type, text: 'Hammer: place furniture\nuse [mouse wheel] to switch item' },
	{ type: shovel.type, text: 'Shovel: change floor\nuse [mouse wheel] to switch floor type' },
];

export const candies1Types = [candyCane1, candyCane2, cookie, cookiePony].map(e => e.type);
export const candies2Types = [cookie, cookiePony].map(e => e.type);

if (DEVELOPMENT) {
	if (pony.type !== PONY_TYPE) {
		throw new Error(`Invalid pony type ${pony.type} !== ${PONY_TYPE}`);
	}

	for (const { type } of entities) {
		if (type === 0)
			continue;

		const entity = createAnEntity(type, 0, 0, 0, {}, mockPaletteManager, defaultWorldState);
		const name = getEntityTypeName(type);

		if (entity.colliders) {
			const maxWidth = (hasFlag(entity.flags, EntityFlags.Movable) ? 1 : 4) * tileWidth;
			const maxHeight = (hasFlag(entity.flags, EntityFlags.Movable) ? 1 : 5) * tileHeight;

			for (const { x, y, w, h } of entity.colliders) {
				if ((x < -maxWidth || (x + w) > maxWidth || y < -maxHeight || (y + h) > maxHeight)) {
					throw new Error(`Invalid entity "${name}": Collider too large ${JSON.stringify({ x, y, w, h })}`);
				}
			}
		}
	}
}
