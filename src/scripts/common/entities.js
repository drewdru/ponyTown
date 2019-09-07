"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const sprites = require("../generated/sprites");
const interfaces_1 = require("./interfaces");
const constants_1 = require("./constants");
const colors_1 = require("./colors");
const mixins_1 = require("./mixins");
const utils_1 = require("./utils");
const color_1 = require("./color");
const rect_1 = require("./rect");
const ponyInfo_1 = require("./ponyInfo");
const entities = [];
function createBaseEntity(type, id, x, y) {
    return { id, type, x, y, z: 0, vx: 0, vy: 0, order: 0, state: 0, playerState: 0, flags: 0, timestamp: 0 };
}
exports.createBaseEntity = createBaseEntity;
function createEntity(type, id, x, y, options, worldState) {
    const descriptor = entities[type];
    if (!descriptor) {
        throw new Error(`Invalid entity type ${type}`);
    }
    return descriptor.create(createBaseEntity(type, id, x, y), options, worldState);
}
function register(typeName, create) {
    if (DEVELOPMENT && entities.length >= constants_1.ENTITY_TYPE_LIMIT) {
        throw new Error(`Exceeded entity limit of ${constants_1.ENTITY_TYPE_LIMIT} with (${typeName})`);
    }
    if (DEVELOPMENT && entities.some(e => e.typeName === typeName)) {
        throw new Error(`Entity name already registered (${typeName})`);
    }
    const type = entities.length;
    entities.push({ type, typeName, create });
    const method = (x, y, options = {}, worldState = interfaces_1.defaultWorldState) => createEntity(type, 0, x, y, options, worldState);
    method.type = type;
    method.typeName = typeName;
    return method;
}
function registerMix(typeName, ...mixins) {
    const mixinsCompacted = lodash_1.compact(mixins);
    return register(typeName, (base, options, worldState) => {
        for (const mixin of mixinsCompacted) {
            mixin(base, options, worldState);
        }
        return base;
    });
}
function getEntityTypeName(type) {
    return entities[type].typeName;
}
exports.getEntityTypeName = getEntityTypeName;
function getEntityType(typeName) {
    for (let i = 1; i < entities.length; i++) {
        if (entities[i].typeName === typeName) {
            return i;
        }
    }
    return 0;
}
exports.getEntityType = getEntityType;
function getEntityTypesAndNames() {
    return entities.map(({ type, typeName }) => ({ type, name: typeName }));
}
exports.getEntityTypesAndNames = getEntityTypesAndNames;
function checkEntity(entity) {
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
function createAnEntity(type, id, x, y, options, paletteManager, worldState) {
    mixins_1.setPaletteManager(paletteManager);
    const entity = createEntity(type, id, x, y, options, worldState);
    if (DEVELOPMENT) {
        checkEntity(entity);
    }
    return entity;
}
exports.createAnEntity = createAnEntity;
// helpers
// strips names in release build
function n(value) {
    return (DEVELOPMENT || SERVER) ? value : '';
}
function mixCover(x, y, w, h) {
    const bounds = rect_1.rect(x, y, w, h);
    return base => base.coverBounds = bounds;
}
function mixFlags(flags) {
    return base => base.flags |= flags;
}
function mixInteractAction(action) {
    return base => base.interactAction = action;
}
function mixBounds(x, y, w, h) {
    const bounds = rect_1.rect(x, y, w, h);
    return base => base.bounds = bounds;
}
function mixServerFlags(flags) {
    if (SERVER) {
        return base => base.serverFlags |= flags;
    }
    else {
        return () => { };
    }
}
function mixOrder(order) {
    return base => base.order = order;
}
const collectableInteractive = mixins_1.mixInteract(-8, -12, 16, 16, 1.5);
function collectable(name, sprite, paletteIndex = 0, ...other) {
    return doodad(name, sprite, Math.floor(sprite.color.w / 2), sprite.color.h - 1, paletteIndex, collectableInteractive, ...other);
}
function decal(name, sprite, palette = 0, ...other) {
    return registerMix(name, mixins_1.mixDraw(sprite, Math.floor((sprite.color.w + sprite.color.ox) / 2), sprite.color.oy, palette), mixFlags(2 /* Decal */), ...other);
}
function decalOffset(name, sprite, dx, dy, palette = 0, ...other) {
    return registerMix(name, mixins_1.mixDraw(sprite, dx, dy, palette), mixFlags(2 /* Decal */), ...other);
}
function doodad(name, sprite, ox, oy, palatte = 0, ...other) {
    return registerMix(name, mixins_1.mixDraw(sprite, ox, oy, palatte), ...lodash_1.compact(other));
}
function doodadSet(name, sprite, ox, oy, ...other) {
    return utils_1.times(sprite.palettes.length, i => registerMix(`${name}-${i}`, mixins_1.mixDraw(sprite, ox, oy, i), ...other));
}
// placeholder entity
registerMix(n('null'), () => { throw new Error('Invalid type (0)'); });
// entities
exports.pony = registerMix(n('pony'), base => {
    base.flags = 1 /* Movable */ | 64 /* CanCollide */;
    base.colliders = mixins_1.ponyColliders;
    base.collidersBounds = mixins_1.ponyCollidersBounds;
}, mixServerFlags(2 /* DoNotSave */));
// triggers
exports.triggerDoor = registerMix(n('trigger-door'), mixins_1.mixTrigger(-32, -6, 64, 12, true));
exports.triggerHouseDoor = registerMix(n('trigger-house-door'), mixins_1.mixTrigger(-32, -6, 64, 12, false));
exports.triggerBoat = registerMix(n('trigger-boat'), mixins_1.mixTrigger(-50, -12, 100, 24, false));
exports.trigger3x1 = registerMix(n('trigger-3x1'), mixins_1.mixTrigger(-48, 0, 96, 24, true));
// house
exports.house = doodad(n('house'), sprites.house, 79, 186, 0, mixins_1.mixColliders(mixins_1.collider(-70, -92, 137, 90, true), mixins_1.collider(-70, -2, 32, 2, true), mixins_1.collider(-70, 0, 30, 3, true), mixins_1.collider(0, -2, 67, 2, true), mixins_1.collider(2, 0, 65, 3, true)), mixins_1.mixInteract(-35, -49, 32, 49, 3));
exports.window1 = registerMix(n('window-1'), mixins_1.mixDrawWindow(sprites.window_1, 21, 53, 0, 3, 0, 3, 1), mixOrder(1));
exports.picture1 = doodad(n('picture-1'), sprites.picture_1, 15, 54, 0);
exports.picture2 = doodad(n('picture-2'), sprites.picture_1, 15, 54, 1);
const cushionPickable = mixins_1.mixPickable(32, 39);
exports.cushion1 = decal(n('cushion-1'), sprites.cushion_1, 0, cushionPickable);
exports.cushion2 = decal(n('cushion-2'), sprites.cushion_1, 1, cushionPickable);
exports.cushion3 = decal(n('cushion-3'), sprites.cushion_1, 2, cushionPickable);
exports.bookshelf = doodad(n('bookshelf'), sprites.bookshelf, 28, 81, 0, mixins_1.mixColliderRect(-32, -14, 66, 15));
// boat
const boatMinimap = mixins_1.mixMinimap(0x725d3fff, rect_1.rect(-3, -1, 6, 2));
const boatSailCollider = mixins_1.mixColliderRect(-5, -3, 11, 6);
const waterBobbing = mixins_1.mixBobbing(constants_1.WATER_FPS, constants_1.WATER_HEIGHT);
exports.boat = doodad(n('boat'), sprites.boat, 95, 4, 0, boatMinimap, mixOrder(-1));
exports.boatBob = doodad(n('boat-bob'), sprites.boat, 95, 18, 0, boatMinimap, waterBobbing, mixOrder(-1), mixFlags(32 /* StaticY */));
exports.boatFrontBob = doodad(n('boat-front-bob'), sprites.boat_front, 71, 16, 0, boatMinimap, waterBobbing, mixFlags(32 /* StaticY */));
exports.boatSail = doodad(n('boat-sail'), sprites.boat_sail, 77, 173, 0, mixCover(-8, -130, 70, 116), boatSailCollider);
exports.rope = doodad(n('rope'), sprites.boat_rope, 5, 19, 0, mixins_1.mixPickable(31, 58));
exports.ropeRack = doodad(n('rope-rack'), sprites.rope_rack, 11, 34, 0, mixins_1.mixInteract(-10, -31, 23, 31, 5), mixFlags(32 /* StaticY */));
exports.boatRopeBob = doodad(n('boat-rope-bob'), sprites.boat_rope, 5, 19, 0, waterBobbing, mixFlags(32 /* StaticY */));
exports.boatWake = registerMix(n('boat-wake'), mixins_1.mixAnimation(sprites.boat_wake, constants_1.WATER_FPS, 93, 0, { useGameTime: true }), mixFlags(32 /* StaticY */));
function fullBoat(x, y, sail = true) {
    const sailEntities = sail ? [
        exports.boatSail(x - (12 / constants_1.tileWidth), y + (16 / constants_1.tileHeight)),
        exports.boatRopeBob(x - (91 / constants_1.tileWidth), y + (8 / constants_1.tileHeight)),
    ] : [];
    return [
        exports.boatBob(x, y),
        exports.boatFrontBob(x, y + (29 / constants_1.tileHeight)),
        ...sailEntities,
        exports.boatWake(x, y + (5 / constants_1.tileHeight)),
    ];
}
exports.fullBoat = fullBoat;
// pier
exports.pierLeg = registerMix(n('pier-leg'), mixins_1.mixAnimation(sprites.pier_leg, constants_1.WATER_FPS, 10, -14), mixOrder(-2), mixFlags(32 /* StaticY */));
// planks
const plankMinimap = mixins_1.mixMinimap(0x9c6141ff, rect_1.rect(-1, 0, 2, 1));
const plankFlags = mixFlags(32 /* StaticY */);
const plankShortMinimap = mixins_1.mixMinimap(0x9c6141ff, rect_1.rect(0, 0, 1, 1));
const plankPal = 1;
exports.plank1 = decalOffset(n('plank-1'), sprites.plank_1, 39, -2, plankPal, plankMinimap, plankFlags);
exports.plank2 = decalOffset(n('plank-2'), sprites.plank_2, 39, -2, plankPal, plankMinimap, plankFlags);
exports.plank3 = decalOffset(n('plank-3'), sprites.plank_3, 39, -2, plankPal, plankMinimap, plankFlags);
exports.plank4 = decalOffset(n('plank-4'), sprites.plank_4, 39, -2, plankPal, plankMinimap, plankFlags);
exports.planks = [exports.plank1, exports.plank2, exports.plank3, exports.plank4];
exports.plankShort1 = decalOffset(n('plank-short-1'), sprites.plank_short_1, 21, -2, plankPal, plankShortMinimap, plankFlags);
exports.plankShort2 = decalOffset(n('plank-short-2'), sprites.plank_short_2, 21, -2, plankPal, plankShortMinimap, plankFlags);
exports.plankShort3 = decalOffset(n('plank-short-3'), sprites.plank_short_3, 21, -2, plankPal, plankShortMinimap, plankFlags);
exports.planksShort = [exports.plankShort1, exports.plankShort2, exports.plankShort3];
exports.plankShadow = registerMix(n('plank-shadow'), mixins_1.mixDrawShadow(sprites.plank_shadow, 39, -12), mixFlags(2 /* Decal */ | 32 /* StaticY */), mixOrder(-1));
exports.plankShadow2 = registerMix(n('plank-shadow-2'), mixins_1.mixDrawShadow(sprites.plank_shadow2, 39, -12), mixFlags(2 /* Decal */ | 32 /* StaticY */), mixOrder(-1));
exports.plankShadowShort = registerMix(n('plank-shadow-short'), mixins_1.mixDrawShadow(sprites.plank_shadow_short, 21, -12), mixFlags(2 /* Decal */ | 32 /* StaticY */), mixOrder(-1));
// pickables
const applePickable = mixins_1.mixPickable(29, 47);
exports.apple = collectable(n('apple'), sprites.apple_1, 0, applePickable);
exports.apple2 = collectable(n('apple-2'), sprites.apple_2, 0, applePickable);
exports.appleGreen = collectable(n('apple-green'), sprites.apple_1, 1, applePickable);
exports.appleGreen2 = collectable(n('apple-green-2'), sprites.apple_2, 1, applePickable);
const orangePickable = mixins_1.mixPickable(29, 46);
exports.orange = collectable(n('orange'), sprites.orange_1, 0, orangePickable);
exports.orange2 = collectable(n('orange-2'), sprites.orange_2, 0, orangePickable);
exports.pear = collectable(n('pear'), sprites.pear, 0, mixins_1.mixPickable(30, 48));
exports.banana = collectable(n('banana'), sprites.banana, 0, mixins_1.mixPickable(30, 44));
const lemonPickable = mixins_1.mixPickable(31, 45);
exports.lemon = collectable(n('lemon'), sprites.lemon_1, 0, lemonPickable);
exports.lime = collectable(n('lime'), sprites.lemon_1, 1, lemonPickable);
const carrotPalette = 1;
exports.carrot1 = doodad(n('carrot-1'), sprites.carrot_1, 4, 9, carrotPalette, collectableInteractive);
exports.carrot1b = doodad(n('carrot-1b'), sprites.carrot_1b, 4, 9, carrotPalette, collectableInteractive);
exports.carrot2 = doodad(n('carrot-2'), sprites.carrot_2, 4, 9, carrotPalette);
exports.carrot2b = doodad(n('carrot-2b'), sprites.carrot_2b, 4, 9, carrotPalette);
exports.carrot3 = doodad(n('carrot-3'), sprites.carrot_3, 4, 9, carrotPalette);
exports.carrot4 = doodad(n('carrot-4'), sprites.carrot_4, 4, 9, carrotPalette);
exports.carrotHeld = doodad(n('carrot-held'), sprites.carrot_hold, 8, 4, carrotPalette, mixins_1.mixPickable(32, 44));
const grapesPickable = mixins_1.mixPickable(32, 54);
exports.grapePurple = collectable(n('grape-purple'), sprites.grapes_one, 0, mixins_1.mixPickable(29, 43));
exports.grapeGreen = collectable(n('grape-green'), sprites.grapes_one, 1, mixins_1.mixPickable(29, 43));
function grapes(name, sprite, palette) {
    return doodad(name, sprite, 5, 15, palette, collectableInteractive, grapesPickable);
}
exports.grapesPurple = [
    grapes(n('grapes-purple-1'), sprites.grapes_1, 0),
    grapes(n('grapes-purple-2'), sprites.grapes_2, 0),
    grapes(n('grapes-purple-3'), sprites.grapes_3, 0),
    grapes(n('grapes-purple-4'), sprites.grapes_4, 0),
    grapes(n('grapes-purple-5'), sprites.grapes_5, 0),
    grapes(n('grapes-purple-6'), sprites.grapes_6, 0),
    grapes(n('grapes-purple-7'), sprites.grapes_7, 0),
];
exports.grapesGreen = [
    grapes(n('grapes-green-1'), sprites.grapes_1, 1),
    grapes(n('grapes-green-2'), sprites.grapes_2, 1),
    grapes(n('grapes-green-3'), sprites.grapes_3, 1),
    grapes(n('grapes-green-4'), sprites.grapes_4, 1),
    grapes(n('grapes-green-5'), sprites.grapes_5, 1),
    grapes(n('grapes-green-6'), sprites.grapes_6, 1),
    grapes(n('grapes-green-7'), sprites.grapes_7, 1),
];
exports.mango = collectable(n('mango'), sprites.mango, 0, mixins_1.mixPickable(31, 46));
exports.candyCane1 = collectable(n('candy-cane-1'), sprites.candy_cane_1, 0, mixins_1.mixPickable(31, 46)); // horizontal
exports.candyCane2 = collectable(n('candy-cane-2'), sprites.candy_cane_2, 0, mixins_1.mixPickable(31, 49)); // vertical
exports.cookie = collectable(n('cookie'), sprites.cookie, 0, mixins_1.mixPickable(31, 46));
exports.cookiePony = collectable(n('cookie-pony'), sprites.cookie_pony, 0, mixins_1.mixPickable(30, 45));
exports.cookieTable = doodad(n('cookie-table'), sprites.cookie_table_1, 13, 28, 0, mixFlags(256 /* Interactive */), base => base.interactRange = 5, mixInteractAction(4 /* GiveCookie1 */), mixins_1.mixColliderRect(-13, -12, 26, 14));
exports.cookieTable2 = doodad(n('cookie-table-2'), sprites.cookie_table_2, 13, 28, 0, mixFlags(256 /* Interactive */), base => base.interactRange = 5, mixInteractAction(5 /* GiveCookie2 */), mixins_1.mixColliderRect(-13, -12, 26, 14));
exports.letter = doodad(n('letter'), sprites.letter, 4, 10, 0, mixins_1.mixPickable(30, 50));
exports.rose = doodad(n('rose'), sprites.rose, 8, 1, 0, mixins_1.mixPickable(30, 41));
// tools
exports.hammer = doodad(n('hammer'), sprites.hammer, 8, 10, 0, mixins_1.mixPickable(25, 46), mixFlags(8 /* Usable */));
exports.shovel = doodad(n('shovel'), sprites.shovel, 16, 6, 0, mixins_1.mixPickable(29, 42), mixFlags(8 /* Usable */));
exports.rake = doodad(n('rake'), sprites.rake, 16, 6, 0, mixins_1.mixPickable(30, 42));
exports.pickaxe = doodad(n('pickaxe'), sprites.pickaxe, 10, 8, 0, mixins_1.mixPickable(28, 42));
exports.broom = doodad(n('broom'), sprites.broom, 16, 6, 0, mixins_1.mixPickable(27, 42));
exports.saw = doodad(n('saw'), sprites.saw, 10, 7, 0, mixins_1.mixPickable(26, 47));
// jacko lanterns
const jackoLightColor = 0x80281eff;
const jackoLanternPickable = mixins_1.mixPickable(31, 52);
const jackLanternCollider = mixins_1.mixColliderRect(-5, -5, 10, 10, false);
exports.jackoLanternOff = collectable(n('jacko-lantern-off'), sprites.jacko_lantern_off, 0, jackoLanternPickable, jackLanternCollider);
exports.jackoLanternOn = collectable(n('jacko-lantern-on'), sprites.jacko_lantern_on, 0, jackoLanternPickable, jackLanternCollider, mixins_1.mixLight(jackoLightColor, 0, 0, 192, 144), mixins_1.mixLightSprite(sprites.jacko_lantern_light, colors_1.WHITE, 6, 9));
exports.jackoLantern = collectable(n('jacko-lantern'), sprites.jacko_lantern_on, 0, jackoLanternPickable, jackLanternCollider, mixins_1.mixLight(jackoLightColor, 0, 0, 192, 144), mixins_1.mixLightSprite(sprites.jacko_lantern_light, colors_1.WHITE, 6, 9), mixFlags(1024 /* OnOff */));
// lanterns
const lanternLightSprite = {
    frames: sprites.lantern_light.frames,
};
const lanternPickable = mixins_1.mixPickable(31, 53);
const lanternCollider = mixins_1.mixColliderRounded(-5, -5, 10, 10, 2, false);
exports.lanternOn = registerMix(n('lantern-on'), mixins_1.mixAnimation(sprites.lantern, 12, 4, 13, { lightSprite: lanternLightSprite }), mixins_1.mixLight(0x916a32ff, 0, 0, 384, 288), lanternPickable, lanternCollider);
exports.lanternOnWall = registerMix(n('lantern-on-wall'), mixins_1.mixAnimation(sprites.lantern, 12, 4, 13 + 24, { lightSprite: lanternLightSprite }), mixins_1.mixLight(0x916a32ff, 0, 0, 384, 288));
exports.lanternOnTable = registerMix(n('lantern-on-table'), mixins_1.mixAnimation(sprites.lantern, 12, 4, 13 + 14, { lightSprite: lanternLightSprite }), mixins_1.mixLight(0x916a32ff, 0, 0, 384, 288));
exports.candy = doodad(n('candy'), sprites.candy, 4, 2, 0, mixins_1.mixInteract(-6, -6, 13, 13, 1.5));
const eggInteractive = mixins_1.mixInteract(-6, -6, 13, 13, 1.5);
exports.eggs = [
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
const eggBasketPickable = mixins_1.mixPickable(31, 53);
const eggBasketCollider = mixins_1.mixColliderRect(-5, -5, 11, 6);
const eggBasketParts = [eggBasketPickable, eggBasketCollider];
exports.basket = doodad(n('egg-basket-1'), sprites.egg_basket_1, 6, 13, 0, ...eggBasketParts);
exports.eggBasket2 = doodad(n('egg-basket-2'), sprites.egg_basket_2, 6, 13, 0, ...eggBasketParts);
exports.eggBasket3 = doodad(n('egg-basket-3'), sprites.egg_basket_3, 6, 13, 0, ...eggBasketParts);
exports.eggBasket4 = doodad(n('egg-basket-4'), sprites.egg_basket_4, 6, 13, 0, ...eggBasketParts);
exports.eggBaskets = [exports.basket, exports.eggBasket2, exports.eggBasket3, exports.eggBasket4];
exports.basketBin = doodad(n('basket-bin'), sprites.basket_bin, 21, 31, 0, mixins_1.mixColliderRect(-20, -8, 46, 26), mixFlags(256 /* Interactive */), base => base.interactRange = 3);
const signCollider = mixins_1.mixColliderRect(-6, -1, 16, 2);
const signInteractive = mixFlags(256 /* Interactive */);
const signInteractRange = base => base.interactRange = 5;
const signPickable = mixins_1.mixPickable(32, 62);
const signParts = [signCollider, signInteractive, signInteractRange, signPickable];
exports.sign = registerMix(n('sign'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.sign_1, dx: 12, dy: 24, palette: 0 },
    winter: { sprite: sprites.sign_winter, dx: 12, dy: 24, palette: 0 },
}), ...signParts);
exports.signQuest = doodad(n('sign-quest'), sprites.sign_2, 12, 24, 0, ...signParts);
exports.signQuestion = doodad(n('sign-question'), sprites.sign_4, 12, 24, 0, ...signParts);
exports.signDonate = doodad(n('sign-donate'), sprites.sign_3, 12, 24, 0, ...signParts);
exports.signDebug = doodad(n('sign-debug'), sprites.sign_4, 12, 24, 0, ...signParts, mixFlags(16 /* Debug */));
exports.tile = decal(n('tile'), sprites.tile);
// direction signs
var SignIcon;
(function (SignIcon) {
    SignIcon[SignIcon["Spawn"] = 0] = "Spawn";
    SignIcon[SignIcon["Pumpkins"] = 1] = "Pumpkins";
    SignIcon[SignIcon["TownCenter"] = 2] = "TownCenter";
    SignIcon[SignIcon["PineForest"] = 3] = "PineForest";
    SignIcon[SignIcon["Boat"] = 4] = "Boat";
    SignIcon[SignIcon["Mountains"] = 5] = "Mountains";
    SignIcon[SignIcon["GiftPile"] = 6] = "GiftPile";
    SignIcon[SignIcon["Forest"] = 7] = "Forest";
    SignIcon[SignIcon["Lake"] = 8] = "Lake";
    SignIcon[SignIcon["Bridge"] = 9] = "Bridge";
    SignIcon[SignIcon["Mines"] = 10] = "Mines";
    SignIcon[SignIcon["Barrels"] = 11] = "Barrels";
    SignIcon[SignIcon["Fields"] = 12] = "Fields";
    SignIcon[SignIcon["Carrots"] = 13] = "Carrots";
})(SignIcon = exports.SignIcon || (exports.SignIcon = {}));
exports.directionSign = registerMix(n('direction-sign'), mixins_1.mixDrawDirectionSign(), mixins_1.mixColliderRect(-10, -8, 20, 16), mixFlags(256 /* Interactive */), base => base.interactRange = 10);
exports.directionSignLefts = utils_1.times(5, i => registerMix(n(`direction-sign-left-${i}`), mixBounds(-10, -59 + i * 11, 14, 10)));
exports.directionSignRights = utils_1.times(5, i => registerMix(n(`direction-sign-right-${i}`), mixBounds(-4, -59 + i * 11, 14, 10)));
exports.directionSignUpsLeft = utils_1.times(5, i => registerMix(n(`direction-sign-up-left-${i}`), mixBounds(-6, -70 + i * 12, 6, 11)));
exports.directionSignUpsRight = utils_1.times(5, i => registerMix(n(`direction-sign-up-right-${i}`), mixBounds(1, -70 + i * 12, 5, 11)));
exports.directionSignDownsLeft = utils_1.times(5, i => registerMix(n(`direction-sign-down-left-${i}`), mixBounds(-6, -57 + i * 13, 7, 12)));
exports.directionSignDownsRight = utils_1.times(5, i => registerMix(n(`direction-sign-down-right-${i}`), mixBounds(0, -57 + i * 13, 5, 12)));
// box
const boxCollider = mixins_1.mixColliderRect(-17, -22, 35, 22);
const boxInteractive = mixins_1.mixInteract(-16, -32, 32, 36, 4);
const boxInteractiveClose = mixins_1.mixInteract(-16, -32, 32, 36, 3);
const boxPickable = mixins_1.mixPickable(32, 72);
const boxParts = [boxCollider, boxInteractive, boxPickable];
exports.box = doodad(n('box'), sprites.box_empty, 16, 32, 0, ...boxParts);
exports.boxLanterns = doodad(n('box-lanterns'), sprites.box_lanterns, 16, 32, 0, ...boxParts, mixInteractAction(2 /* GiveLantern */));
exports.boxBaskets = doodad(n('box-baskets'), sprites.box_baskets, 16, 32, 0, ...boxParts);
exports.boxFruits = doodad(n('box-fruits'), sprites.box_fruits, 16, 32, 0, ...boxParts, mixInteractAction(3 /* GiveFruits */));
exports.boxGifts = doodad(n('box-gifts'), sprites.box_gifts, 16, 32, 0, boxCollider, boxInteractiveClose, boxPickable);
const toolboxParts = [
    mixins_1.mixColliderRect(-15, -10, 30, 10),
    mixins_1.mixInteractAt(5),
    mixins_1.mixPickable(31, 60),
];
exports.toolboxEmpty = doodad(n('toolbox-empty'), sprites.toolbox_empty, 16, 22, 0, ...toolboxParts);
exports.toolboxFull = doodad(n('toolbox-full'), sprites.toolbox_full, 16, 22, 0, ...toolboxParts, base => base.interactRange = 20, mixInteractAction(1 /* Toolbox */), mixFlags(4096 /* IgnoreTool */));
exports.barrel = doodad(n('barrel'), sprites.barrel, 13, 27, 0, mixins_1.mixColliderRounded(-12, -8, 24, 13, 5), mixFlags(256 /* Interactive */), base => base.interactRange = 3);
exports.bench1 = doodad(n('bench-1'), sprites.bench_1, 37, 20, 0, mixins_1.mixColliderRect(-37, -3, 75, 8));
exports.benchSeat = doodad(n('bench-seat'), sprites.bench_seat, 37, 0);
exports.benchBack = doodad(n('bench-back'), sprites.bench_back, 37, 22, 0, mixins_1.mixColliderRect(-37, -3, 75, 8));
exports.benchSeatH = doodad(n('bench-seat-h'), sprites.bench_seath, 11, 0);
exports.benchBackH = doodad(n('bench-back-h'), sprites.bench_backh, 9, 84, 0, mixins_1.mixColliderRect(-15, -64, 30, 65));
exports.benchBackH2 = doodad(n('bench-back-h2'), sprites.bench_backh2, 6, 84, 0, mixins_1.mixColliderRect(-15, -64, 30, 65));
exports.table1 = doodad(n('table-1'), sprites.table_1, 14, 34, 0, mixins_1.mixColliderRect(-18, -22, 37, 23));
exports.table2 = doodad(n('table-2'), sprites.table_2, 24, 29, 0, mixins_1.mixColliderRect(-27, -21, 56, 49));
exports.table3 = doodad(n('table-3'), sprites.table_3, 24, 21, 0, mixins_1.mixColliderRect(-23, -14, 45, 14));
exports.wallMap = doodad(n('wall-map'), sprites.wall_map, 20, 51, 0, mixFlags(32 /* StaticY */));
exports.crate1A = doodad(n('crate-1a'), sprites.crate_1, 16, 45, 0, mixins_1.mixColliderRect(-15, -20, 30, 20));
exports.crate1B = doodad(n('crate-1b'), sprites.crate_1, 16, 45, 1, mixins_1.mixColliderRect(-15, -20, 30, 20));
exports.crate1AHigh = doodad(n('crate-1a-high'), sprites.crate_1, 16, 45 + 25, 0, mixins_1.mixColliderRect(-15, -20 - 25, 30, 20));
exports.crate1BHigh = doodad(n('crate-1b-high'), sprites.crate_1, 16, 45 + 25, 1, mixins_1.mixColliderRect(-15, -20 - 25, 30, 20));
exports.crate2A = doodad(n('crate-2a'), sprites.crate_2, 15, 23, 0, mixins_1.mixColliderRect(-14, -14, 29, 14));
exports.crate2B = doodad(n('crate-2b'), sprites.crate_2, 15, 23, 1, mixins_1.mixColliderRect(-14, -14, 29, 14));
exports.crate3A = doodad(n('crate-3a'), sprites.crate_3, 15, 23, 0, mixins_1.mixColliderRect(-14, -14, 29, 14));
exports.crate3B = doodad(n('crate-3b'), sprites.crate_3, 15, 23, 1, mixins_1.mixColliderRect(-14, -14, 29, 14));
function createWalls(baseName, spriteFull, spritesHalf) {
    function wall(name, index, ox, oy, oy2, ...other) {
        return registerMix(name, mixins_1.mixDrawWall(spriteFull[index], spritesHalf[index], ox, oy, oy2), mixins_1.mixMinimap(0x503d45ff, rect_1.rect(0, 0, 1, 1)), mixFlags(32 /* StaticY */), mixServerFlags(2 /* DoNotSave */), ...other);
    }
    function wallShort(name, index, ox, _oy, oy2, ...other) {
        return doodad(name, spritesHalf[index], ox, oy2, 0, mixins_1.mixMinimap(0x503d45ff, rect_1.rect(0, 0, 1, 1)), mixFlags(32 /* StaticY */), mixServerFlags(2 /* DoNotSave */), ...other);
    }
    const wallThickness = 8;
    const wallOffsetX = wallThickness / 2;
    const wallOffsetY = 18;
    const wallOffsetFullY = 81;
    const wallHCollider = mixins_1.mixColliderRect(-16, -6, 32, 6);
    const wallVCollider = mixins_1.mixColliderRect(-10, -15, 20, 30);
    const wallH = wall(n(`${baseName}-h`), 16, (32 - wallThickness) / 2, wallOffsetFullY, wallOffsetY, wallHCollider);
    const wallHShort = wallShort(n(`${baseName}-h-short`), 16, (32 - wallThickness) / 2, wallOffsetFullY, wallOffsetY, wallHCollider);
    const wallV = wall(n(`${baseName}-v`), 17, wallOffsetX, wallOffsetFullY + 3, wallOffsetY + 3, wallVCollider);
    const wallVShort = wallShort(n(`${baseName}-v-short`), 17, wallOffsetX, wallOffsetFullY + 3, wallOffsetY + 3, wallVCollider);
    const wallCutL = doodad(n(`${baseName}-cut-l`), spriteFull[18], (32 - wallThickness) / 2, wallOffsetFullY, 0, wallHCollider, mixFlags(32 /* StaticY */), mixServerFlags(2 /* DoNotSave */));
    const wallCutR = doodad(n(`${baseName}-cut-r`), spriteFull[19], (32 - wallThickness) / 2, wallOffsetFullY, 0, wallHCollider, mixFlags(32 /* StaticY */), mixServerFlags(2 /* DoNotSave */));
    const wallCorners = [
        // top right bottom left
        wall(n(`${baseName}-00`), 0, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-01`), 1, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-02`), 2, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-03`), 3, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-04`), 4, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-05`), 5, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-06`), 6, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-07`), 7, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-08`), 8, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-09`), 9, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-10`), 10, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-11`), 11, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-12`), 12, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-13`), 13, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-14`), 14, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wall(n(`${baseName}-15`), 15, wallOffsetX, wallOffsetFullY, wallOffsetY),
    ];
    const wallCornersShort = [
        // top right bottom left
        wallShort(n(`${baseName}-00-short`), 0, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-01-short`), 1, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-02-short`), 2, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-03-short`), 3, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-04-short`), 4, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-05-short`), 5, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-06-short`), 6, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-07-short`), 7, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-08-short`), 8, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-09-short`), 9, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-10-short`), 10, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-11-short`), 11, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-12-short`), 12, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-13-short`), 13, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-14-short`), 14, wallOffsetX, wallOffsetFullY, wallOffsetY),
        wallShort(n(`${baseName}-15-short`), 15, wallOffsetX, wallOffsetFullY, wallOffsetY),
    ];
    return { wallH, wallHShort, wallV, wallVShort, wallCutL, wallCutR, wallCorners, wallCornersShort };
}
exports.woodenWalls = createWalls('wall', sprites.wall_wood_full, sprites.wall_wood_half);
exports.stoneWalls = createWalls('wall-stone', sprites.wall_stone_full, sprites.wall_stone_half);
const rockMinimap = mixins_1.mixMinimap(0x78716aff, rect_1.rect(0, 0, 1, 1));
exports.rock = doodad(n('rock'), sprites.rock_1, 15, 20, 0, mixins_1.mixColliderRounded(-16, -12, 32, 12, 3, false), rockMinimap);
exports.rock2 = doodad(n('rock-2'), sprites.rock_2, 11, 11, 0, mixins_1.mixColliderRounded(-10, -4, 17, 5, 2, false), rockMinimap);
exports.rock3 = doodad(n('rock-3'), sprites.rock_3, 10, 11, 0, mixins_1.mixColliderRounded(-10, -4, 18, 5, 2, false), rockMinimap);
exports.rockB = doodad(n('rockb'), sprites.rock_1, 15, 20, 1, mixins_1.mixColliderRounded(-16, -12, 32, 12, 3, false), rockMinimap);
exports.rock2B = doodad(n('rock-2b'), sprites.rock_2, 11, 11, 1, mixins_1.mixColliderRounded(-10, -4, 17, 5, 2, false), rockMinimap);
exports.rock3B = doodad(n('rock-3b'), sprites.rock_3, 10, 11, 1, mixins_1.mixColliderRounded(-10, -4, 18, 5, 2, false), rockMinimap);
// other
exports.well = doodad(n('well'), sprites.well, 30, 67, 0, mixins_1.mixColliderRect(-26, -20, 54, 30));
// water rocks
const waterRockFPS = constants_1.WATER_FPS;
exports.waterRock1 = registerMix(n('water-rock-1'), mixins_1.mixAnimation(sprites.water_rock_1, waterRockFPS, 10, 12), mixins_1.mixColliderRounded(-12, -6, 25, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock2 = registerMix(n('water-rock-2'), mixins_1.mixAnimation(sprites.water_rock_2, waterRockFPS, 11, 8), mixins_1.mixColliderRounded(-12, -5, 22, 8, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock3 = registerMix(n('water-rock-3'), mixins_1.mixAnimation(sprites.water_rock_3, waterRockFPS, 12, 9), mixins_1.mixColliderRounded(-12, -4, 22, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock4 = registerMix(n('water-rock-4'), mixins_1.mixAnimation(sprites.water_rock_4, waterRockFPS, 11, 12), mixins_1.mixColliderRounded(-10, -4, 18, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock5 = registerMix(n('water-rock-5'), mixins_1.mixAnimation(sprites.water_rock_5, waterRockFPS, 11, 11), mixins_1.mixColliderRounded(-12, -4, 22, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock6 = registerMix(n('water-rock-6'), mixins_1.mixAnimation(sprites.water_rock_6, waterRockFPS, 13, 11), mixins_1.mixColliderRounded(-12, -4, 22, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock7 = registerMix(n('water-rock-7'), mixins_1.mixAnimation(sprites.water_rock_7, waterRockFPS, 10, 10), mixins_1.mixColliderRounded(-12, -4, 22, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock8 = registerMix(n('water-rock-8'), mixins_1.mixAnimation(sprites.water_rock_8, waterRockFPS, 11, 9), mixins_1.mixColliderRounded(-12, -4, 22, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock9 = registerMix(n('water-rock-9'), mixins_1.mixAnimation(sprites.water_rock_9, waterRockFPS, 10, 15), mixins_1.mixColliderRounded(-12, -4, 22, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock10 = registerMix(n('water-rock-10'), mixins_1.mixAnimation(sprites.water_rock_10, waterRockFPS, 10, 12), mixins_1.mixColliderRounded(-12, -4, 22, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterRock11 = registerMix(n('water-rock-11'), mixins_1.mixAnimation(sprites.water_rock_11, waterRockFPS, 10, 13), mixins_1.mixColliderRounded(-12, -4, 22, 7, 2, false), mixFlags(32 /* StaticY */));
// stone wall (old)
exports.stoneWallFull = doodad(n('stone-wall-full'), sprites.stone_wall_full, 38, 22, 0, mixins_1.mixColliderRect(-38, -4, 76, 6));
// stone wall
const stoneWallMinimapColor = 0x9b9977ff;
exports.stoneWallPole1 = registerMix(n('stone-wall-pole-1'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.stone_wall_pole1, dx: 7, dy: 20, palette: 0 },
    winter: { sprite: sprites.stone_wall_winter_pole1, dx: 8, dy: 21, palette: 0 },
}), mixins_1.mixColliderRect(-7, -6, 14, 12, false), mixins_1.mixMinimap(stoneWallMinimapColor, rect_1.rect(0, 0, 1, 1)), mixOrder(1));
exports.stoneWallBeamH1 = registerMix(n('stone-wall-beam-h-1'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.stone_wall_horizontal1, dx: 25, dy: 17, palette: 0 },
    winter: { sprite: sprites.stone_wall_winter_horizontal1, dx: 25, dy: 20, palette: 0 },
}), mixins_1.mixColliderRect(-25, -6, 50, 12, false), mixins_1.mixMinimap(stoneWallMinimapColor, rect_1.rect(0, 0, 2, 1)));
exports.stoneWallBeamV1 = registerMix(n('stone-wall-beam-v-1'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.stone_wall_vertical1, dx: 5, dy: 8, palette: 0 },
    winter: { sprite: sprites.stone_wall_winter_vertical1, dx: 5, dy: 8, palette: 0 },
}), mixins_1.mixColliderRect(-7, 0, 14, 48, false), mixins_1.mixMinimap(stoneWallMinimapColor, rect_1.rect(0, 0, 1, 2)), mixOrder(2));
// wooden fence (modular)
const woodenFenceTall = false;
const woodenFenceMinimapColor = 0xac7146ff;
const woodenFenceMinimap = mixins_1.mixMinimap(woodenFenceMinimapColor, rect_1.rect(0, 0, 1, 1));
function woodenFencePole(name, sprite, spriteWinter) {
    return registerMix(name, mixins_1.mixDrawSeasonal({
        summer: { sprite: sprite, dx: 4, dy: 25, palette: 0 },
        winter: { sprite: spriteWinter, dx: 4, dy: 26, palette: 0 },
    }), mixins_1.mixColliderRect(-4, -3, 8, 6, woodenFenceTall), woodenFenceMinimap, mixOrder(1));
}
function woodenFenceBeamH(name, sprite, spriteWinter) {
    return registerMix(name, mixins_1.mixDrawSeasonal({
        summer: { sprite: sprite, dx: 12, dy: 21, palette: 0 },
        winter: { sprite: spriteWinter, dx: 12, dy: 23, palette: 0 },
    }), mixins_1.mixColliderRect(-12, -3, 24, 6, woodenFenceTall), woodenFenceMinimap);
}
function woodenFenceBeamV(name, sprite, spriteWinter) {
    return registerMix(name, mixins_1.mixDrawSeasonal({
        summer: { sprite: sprite, dx: 2, dy: 18, palette: 0 },
        winter: { sprite: spriteWinter, dx: 2, dy: 18, palette: 0 },
    }), mixins_1.mixColliderRect(-4, 0, 8, 24, woodenFenceTall), woodenFenceMinimap, mixOrder(2));
}
exports.spawnPole = doodad(n('spawn-pole'), sprites.wooden_fence_pole1, 4, 25, 1, mixFlags(16 /* Debug */));
exports.routePole = doodad(n('route-pole'), sprites.route_pole, 2, 14, 1, mixFlags(16 /* Debug */));
exports.woodenFencePole1 = woodenFencePole(n('wooden-fence-pole-1'), sprites.wooden_fence_pole1, sprites.wooden_fence_winter_pole1);
exports.woodenFencePole2 = woodenFencePole(n('wooden-fence-pole-2'), sprites.wooden_fence_pole2, sprites.wooden_fence_winter_pole2);
exports.woodenFencePole3 = woodenFencePole(n('wooden-fence-pole-3'), sprites.wooden_fence_pole3, sprites.wooden_fence_winter_pole3);
exports.woodenFencePole4 = woodenFencePole(n('wooden-fence-pole-4'), sprites.wooden_fence_pole4, sprites.wooden_fence_winter_pole4);
exports.woodenFencePole5 = woodenFencePole(n('wooden-fence-pole-5'), sprites.wooden_fence_pole5, sprites.wooden_fence_winter_pole5);
exports.woodenFenceBeamH1 = woodenFenceBeamH(n('wooden-fence-beam-h-1'), sprites.wooden_fence_horizontal1, sprites.wooden_fence_winter_horizontal1);
exports.woodenFenceBeamH2 = woodenFenceBeamH(n('wooden-fence-beam-h-2'), sprites.wooden_fence_horizontal2, sprites.wooden_fence_winter_horizontal2);
exports.woodenFenceBeamH3 = woodenFenceBeamH(n('wooden-fence-beam-h-3'), sprites.wooden_fence_horizontal3, sprites.wooden_fence_winter_horizontal3);
exports.woodenFenceBeamH4 = woodenFenceBeamH(n('wooden-fence-beam-h-4'), sprites.wooden_fence_horizontal4, sprites.wooden_fence_winter_horizontal4);
exports.woodenFenceBeamH5 = woodenFenceBeamH(n('wooden-fence-beam-h-5'), sprites.wooden_fence_horizontal5, sprites.wooden_fence_winter_horizontal5);
exports.woodenFenceBeamH6 = woodenFenceBeamH(n('wooden-fence-beam-h-6'), sprites.wooden_fence_horizontal6, sprites.wooden_fence_winter_horizontal6);
exports.woodenFenceBeamV1 = woodenFenceBeamV(n('wooden-fence-beam-v-1'), sprites.wooden_fence_vertical1, sprites.wooden_fence_winter_vertical1);
exports.woodenFenceBeamV2 = woodenFenceBeamV(n('wooden-fence-beam-v-2'), sprites.wooden_fence_vertical2, sprites.wooden_fence_winter_vertical2);
exports.woodenFenceBeamV3 = woodenFenceBeamV(n('wooden-fence-beam-v-3'), sprites.wooden_fence_vertical3, sprites.wooden_fence_winter_vertical3);
// fence
exports.fence1 = registerMix(n('fence-1'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.fence_1, dx: 40, dy: 25, palette: 0 },
    winter: { sprite: sprites.fence_winter_1, dx: 40, dy: 25, palette: 0 },
}), mixins_1.mixColliderRect(-38, -2, 83, 4, false), mixins_1.mixMinimap(woodenFenceMinimapColor, rect_1.rect(0, 0, 1, 1)), mixins_1.mixPickable(30, 62));
exports.fence2 = registerMix(n('fence-2'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.fence_2, dx: 72, dy: 25, palette: 0 },
    winter: { sprite: sprites.fence_winter_2, dx: 72, dy: 25, palette: 0 },
}), mixins_1.mixColliderRect(-70, -2, 148, 4, false), mixins_1.mixMinimap(woodenFenceMinimapColor, rect_1.rect(0, 0, 2, 1)));
exports.fence3 = registerMix(n('fence-3'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.fence_3, dx: 104, dy: 25, palette: 0 },
    winter: { sprite: sprites.fence_winter_3, dx: 104, dy: 25, palette: 0 },
}), mixins_1.mixColliderRect(-102, -2, 204, 4, false), mixins_1.mixMinimap(woodenFenceMinimapColor, rect_1.rect(0, 0, 3, 1)));
// rain
const rainColor = 0xffffff77; // 48
exports.rain = registerMix(n('rain'), mixins_1.mixAnimation(sprites.rain, 12, 16, 512, { color: rainColor }));
exports.raindrop = registerMix(n('raindrop'), mixins_1.mixAnimation(sprites.raindrop, 12, 4, 0, { color: rainColor }));
exports.weatherRain = registerMix(n('weather-rain'), mixins_1.mixDrawRain());
// flowers
exports.flower1 = decal(n('flower-1'), sprites.flower_1);
exports.flower2 = decal(n('flower-2'), sprites.flower_2);
exports.flower3 = decal(n('flower-3'), sprites.flower_3);
exports.flowerPatch1 = decal(n('flowers-1'), sprites.flower_patch1);
exports.flowerPatch2 = decal(n('flowers-2'), sprites.flower_patch2);
exports.flowerPatch3 = decal(n('flowers-3'), sprites.flower_patch3);
exports.flowerPatch4 = decal(n('flowers-4'), sprites.flower_patch4);
exports.flowerPatch5 = decal(n('flowers-5'), sprites.flower_patch5);
exports.flowerPatch6 = decal(n('flowers-6'), sprites.flower_patch6);
exports.flowerPatch7 = decal(n('flowers-7'), sprites.flower_patch7);
exports.flower3Pickable = decal(n('flower-3-pickable'), sprites.flower_3, 0, mixins_1.mixInteract(-7, -3, 15, 15, 1.5));
exports.flowerPick = decal(n('flower-pick'), sprites.flower_pick, 0, mixins_1.mixPickable(31, 39));
// clovers
exports.clover1 = decal(n('clover-1'), sprites.clover_1);
exports.clover2 = decal(n('clover-2'), sprites.clover_2);
exports.clover3 = decal(n('clover-3'), sprites.clover_3);
exports.clover4 = decal(n('clover-4'), sprites.clover_5);
exports.fourLeafClover = decal(n('four-leaf-clover'), sprites.clover_4, 0, mixins_1.mixInteract(-7, -3, 15, 15, 1.5));
exports.cloverPatch3 = decal(n('clovers-3'), sprites.clover_patch3);
exports.cloverPatch4 = decal(n('clovers-4'), sprites.clover_patch4);
exports.cloverPatch5 = decal(n('clovers-5'), sprites.clover_patch5);
exports.cloverPatch6 = decal(n('clovers-6'), sprites.clover_patch6);
exports.cloverPatch7 = decal(n('clovers-7'), sprites.clover_patch7);
exports.cloverPick = doodad(n('clover-pick'), sprites.clover_mouth, 5, 0, 0, mixins_1.mixPickable(29, 39));
exports.cloverPick2 = doodad(n('clover-pick-2'), sprites.clover_pick, 5, 0, 0, mixins_1.mixPickable(31, 39));
// autumn
exports.leaves1 = decal(n('leaves-1'), sprites.leaves_1);
exports.leaves2 = decal(n('leaves-2'), sprites.leaves_2);
exports.leaves3 = decal(n('leaves-3'), sprites.leaves_3);
exports.leaves4 = decal(n('leaves-4'), sprites.leaves_4);
exports.leaves5 = decal(n('leaves-5'), sprites.leaves_5);
const smallLeafPileCollider = mixins_1.mixColliderRect(-12, -7, 25, 12);
const mediumLeafPileCollider = mixins_1.mixColliderRect(-16, -8, 34, 15);
const bigLeafPileCollider = mixins_1.mixColliderRect(-30, -13, 60, 24);
_a = doodadSet(n('leafpile-small'), sprites.leafpile_small, 18, 16, smallLeafPileCollider), exports.leafpileSmallYellow = _a[0], exports.leafpileSmallOrange = _a[1], exports.leafpileSmallRed = _a[2];
_b = doodadSet(n('leafpile-stick'), sprites.leafpile_stick, 18, 16, smallLeafPileCollider), exports.leafpileStickYellow = _b[0], exports.leafpileStickOrange = _b[1], exports.leafpileStickRed = _b[2];
_c = doodadSet(n('leafpile-medium'), sprites.leafpile_medium, 35, 23, mediumLeafPileCollider), exports.leafpileMediumYellow = _c[0], exports.leafpileMediumOrange = _c[1], exports.leafpileMediumRed = _c[2];
_d = doodadSet(n('leafpile-mediumalt'), sprites.leafpile_mediumalt, 35, 23, mediumLeafPileCollider), exports.leafpileMediumAltYellow = _d[0], exports.leafpileMediumAltOrange = _d[1], exports.leafpileMediumAltRed = _d[2];
_e = doodadSet(n('leafpile-big'), sprites.leafpile_big, 43, 34, bigLeafPileCollider), exports.leafpileBigYellow = _e[0], exports.leafpileBigOrange = _e[1], exports.leafpileBigRed = _e[2];
_f = doodadSet(n('leafpile-bigstick'), sprites.leafpile_bigstick, 43, 34, bigLeafPileCollider), exports.leafpileBigstickYellow = _f[0], exports.leafpileBigstickOrange = _f[1], exports.leafpileBigstickRed = _f[2];
// gifts
const giftInteractive = mixins_1.mixInteract(-9, -15, 18, 20, 1.5);
const giftPickable = mixins_1.mixPickable(32, 52);
const giftOffsetX = 7;
const giftOffsetY = 15;
exports.gift1 = doodad(n('gift-1'), sprites.gift_1, giftOffsetX, giftOffsetY, 0, giftInteractive, giftPickable, mixFlags(8 /* Usable */));
exports.gift2 = doodad(n('gift-2'), sprites.gift_2, giftOffsetX, giftOffsetY, 0, giftInteractive, giftPickable, mixFlags(8 /* Usable */));
exports.gift3 = doodad(n('gift-3'), sprites.gift_2, giftOffsetX, giftOffsetY, 1, giftInteractive, giftPickable);
// gift piles
exports.giftPileSign = doodad(n('giftpile-sign'), sprites.giftpile_sign, 47, 39, 0, mixins_1.mixColliderRounded(-44, -21, 89, 55, 7));
exports.giftPileTree = doodad(n('giftpile-tree'), sprites.giftpile_tree, 42, 21, 0, mixins_1.mixColliderRounded(-41, -12, 83, 28, 7));
exports.giftPilePine = doodad(n('giftpile-pine'), sprites.giftpile_pine, 56, 24, 0, mixins_1.mixColliderRounded(-51, -19, 102, 40, 7));
exports.giftPile1 = doodad(n('giftpile-1'), sprites.giftpile_1, 28, 26, 0, mixins_1.mixColliderRect(-28, -12, 57, 33));
exports.giftPile2 = doodad(n('giftpile-2'), sprites.giftpile_2, 30, 27, 0, mixins_1.mixColliderRect(-28, -12, 57, 31));
exports.giftPile3 = doodad(n('giftpile-3'), sprites.giftpile_3, 29, 23, 0, mixins_1.mixColliderRect(-28, -12, 57, 31));
exports.giftPile4 = doodad(n('giftpile-4'), sprites.giftpile_4, 26, 16, 0, mixins_1.mixColliderRect(-25, -12, 51, 24));
exports.giftPile5 = doodad(n('giftpile-5'), sprites.giftpile_5, 20, 20, 0, mixins_1.mixColliderRect(-19, -7, 42, 19));
exports.giftPile6 = doodad(n('giftpile-6'), sprites.giftpile_6, 19, 23, 0, mixins_1.mixColliderRect(-19, -12, 38, 28));
exports.giftPileInteractive = doodad(n('giftpile-5-interactive'), sprites.giftpile_5, 20, 20, 0, mixins_1.mixColliderRect(-19, -7, 42, 19), mixFlags(256 /* Interactive */), base => base.interactRange = 5);
// winter
const snowponyCollider = mixins_1.mixColliderRounded(-12, -4, 25, 7, 2);
exports.snowpony1 = doodad(n('snowpony-1'), sprites.snowpony_1, 13, 36, 0, snowponyCollider);
exports.snowpony2 = doodad(n('snowpony-2'), sprites.snowpony_2, 16, 46, 0, snowponyCollider);
exports.snowpony3 = doodad(n('snowpony-3'), sprites.snowpony_3, 20, 45, 0, snowponyCollider);
exports.snowpony4 = doodad(n('snowpony-4'), sprites.snowpony_4, 20, 45, 0, snowponyCollider);
exports.snowpony5 = doodad(n('snowpony-5'), sprites.snowpony_5, 20, 45, 0, snowponyCollider);
exports.snowpony6 = doodad(n('snowpony-6'), sprites.snowpony_6, 12, 31, 0, snowponyCollider);
exports.snowpony7 = doodad(n('snowpony-7'), sprites.snowpony_7, 12, 31, 0, snowponyCollider);
exports.snowpony8 = doodad(n('snowpony-8'), sprites.snowpony_8, 12, 31, 0, snowponyCollider);
exports.snowpony9 = doodad(n('snowpony-9'), sprites.snowpony_9, 12, 31, 0, snowponyCollider);
exports.mistletoe = doodad(n('mistletoe'), sprites.mistletoe, 5, 65);
exports.holly = doodad(n('holly'), sprites.holly, 5, 25, 0, mixOrder(1));
exports.snowponies = [
    exports.snowpony1,
    exports.snowpony2,
    exports.snowpony3,
    exports.snowpony4,
    exports.snowpony5,
    exports.snowpony6,
    exports.snowpony7,
    exports.snowpony8,
    exports.snowpony9,
];
exports.snowPileTinier = decal(n('snowpile-tinier'), sprites.snowpile_tinier);
exports.snowPileTiny = decal(n('snowpile-tiny'), sprites.snowpile_tiny);
exports.snowPileSmall = doodad(n('snowpile-small'), sprites.snowpile_small, 22, 15, 0, mixins_1.mixColliderRounded(-15, -4, 31, 7, 2, false));
exports.snowPileMedium = doodad(n('snowpile-medium'), sprites.snowpile_medium, 33, 20, 0, mixins_1.mixColliderRounded(-23, -4, 46, 12, 4, false));
exports.snowPileBig = doodad(n('snowpile-big'), sprites.snowpile_big, 43, 28, 0, mixins_1.mixColliderRounded(-39, -2, 78, 16, 6, false));
exports.sandPileTinier = decal(n('sandpile-tinier'), sprites.snowpile_tinier, 1);
exports.sandPileTiny = decal(n('sandpile-tiny'), sprites.snowpile_tiny, 1);
exports.sandPileSmall = doodad(n('sandpile-small'), sprites.snowpile_small, 22, 15, 1, mixins_1.mixColliderRounded(-15, -4, 31, 7, 2, false));
exports.sandPileMedium = doodad(n('sandpile-medium'), sprites.snowpile_medium, 33, 20, 1, mixins_1.mixColliderRounded(-23, -4, 46, 12, 4, false));
exports.sandPileBig = doodad(n('sandpile-big'), sprites.snowpile_big, 43, 28, 1, mixins_1.mixColliderRounded(-39, -2, 78, 16, 6, false));
// pumpkins
const pumpkinCollider = mixins_1.mixColliderRounded(-11, -6, 22, 12, 5, false);
const pumpkinPickable = mixins_1.mixPickable(26, 50);
const pumpkinParts = [pumpkinCollider, pumpkinPickable];
const pumpkinDX = 11;
const pumpkinDY = 15;
exports.pumpkin = doodad(n('pumpkin'), sprites.pumpkin_default, pumpkinDX, pumpkinDY, 0, ...pumpkinParts);
exports.jackoOff = doodad(n('jacko-off'), sprites.pumpkin_off, pumpkinDX, pumpkinDY, 0, ...pumpkinParts);
exports.jackoOn = doodad(n('jacko-on'), sprites.pumpkin_on, pumpkinDX, pumpkinDY, 0, ...pumpkinParts, mixins_1.mixLight(jackoLightColor, 0, 0, 256, 192), mixins_1.mixLightSprite(sprites.pumpkin_light, colors_1.WHITE, pumpkinDX, pumpkinDY));
exports.jacko = doodad(n('jacko'), sprites.pumpkin_on, pumpkinDX, pumpkinDY, 0, ...pumpkinParts, mixins_1.mixLight(jackoLightColor, 0, 0, 256, 192), mixins_1.mixLightSprite(sprites.pumpkin_light, colors_1.WHITE, pumpkinDX, pumpkinDY), mixFlags(1024 /* OnOff */));
// tombstones
exports.tombstone1 = doodad(n('tombstone-1'), sprites.tombstone_1, 14, 18, 0, mixins_1.mixColliderRect(-14, -4, 29, 9));
exports.tombstone2 = doodad(n('tombstone-2'), sprites.tombstone_2, 11, 27, 0, mixins_1.mixColliderRect(-12, -3, 26, 6));
// torch
const torchCollider = mixins_1.mixColliderRounded(-2, -2, 4, 4, 1, false);
const torchDX = 4;
const torchDY = 34;
const torchSprites = sprites.torch2;
const torchAnimOff = [0];
const torchAnimOn = torchSprites.frames.map((_, i) => i).slice(1);
const torchUnlitSprite = {
    color: torchSprites.frames[0],
    shadow: torchSprites.shadow,
    palettes: [torchSprites.palette],
};
const torchSpriteOn = {
    frames: torchSprites.frames.slice(1),
    shadow: torchSprites.shadow,
    palette: torchSprites.palette,
};
const torchLightSpriteOn = {
    frames: sprites.torch2_light.frames.slice(1),
};
exports.torchOff = doodad(n('torch-off'), torchUnlitSprite, torchDX, torchDY, 0, torchCollider);
exports.torchOn = registerMix(n('torch-on'), mixins_1.mixAnimation(torchSpriteOn, 8, torchDX, torchDY, { lightSprite: torchLightSpriteOn }), torchCollider, mixins_1.mixLight(0x926923ff, 0, 0, 440, 332)); // 0x924d23ff 0x917b32ff
exports.torch = registerMix(n('torch'), mixins_1.mixAnimation(torchSprites, 8, torchDX, torchDY, {
    lightSprite: sprites.torch2_light,
    animations: [torchAnimOff, torchAnimOn],
}), torchCollider, mixins_1.mixLight(0x926923ff, 0, 0, 440, 332), mixFlags(1024 /* OnOff */));
exports.poof = registerMix(n('poof'), mixins_1.mixAnimation({
    frames: [...sprites.poof.frames, sprites.emptySprite2],
    palette: sprites.poof.palette
}, 12, 13, 30, { repeat: false }), mixOrder(100));
exports.poof2 = registerMix(n('poof-2'), mixins_1.mixAnimation({
    frames: [...sprites.poof2.frames, sprites.emptySprite2],
    palette: sprites.poof2.palette
}, 12, 50, 120, { repeat: false }), mixOrder(100));
exports.splash = registerMix(n('splash'), mixins_1.mixAnimation({
    frames: [...sprites.splash.frames, sprites.emptySprite2],
    palette: sprites.splash.palette
}, 20, 25, 22, { repeat: false }), mixOrder(50));
const boopSplashFrames = [
    ...utils_1.repeat(3, sprites.emptySprite2),
    ...sprites.splash_boop.frames,
    sprites.emptySprite2,
];
const boopSlashFps = 20;
const boopSlashDX = 11;
const boopSlashDY = 55;
exports.boopSplashRight = registerMix(n('boop-splash-right'), mixins_1.mixAnimation({
    frames: boopSplashFrames,
    palette: sprites.splash_boop.palette
}, boopSlashFps, boopSlashDX, boopSlashDY, { repeat: false }), mixOrder(51));
exports.boopSplashLeft = registerMix(n('boop-splash-left'), mixins_1.mixAnimation({
    frames: boopSplashFrames,
    palette: sprites.splash_boop.palette
}, boopSlashFps, boopSlashDX, boopSlashDY, { repeat: false, flipped: true }), mixOrder(51));
// critters
exports.butterfly = registerMix(n('butterfly'), mixins_1.mixAnimation(sprites.butterfly, 8, 5, 50), mixFlags(4 /* Critter */ | 1 /* Movable */ | 32 /* StaticY */));
exports.firefly = registerMix(n('firefly'), mixins_1.mixAnimation(sprites.firefly, 24, 4, 44), mixins_1.mixLight(0x446a27ff, 0, 37, 128, 128), // 386a27, 83842a
mixins_1.mixLightSprite(sprites.firefly_light, colors_1.WHITE, 2, 40), mixFlags(4 /* Critter */ | 1 /* Movable */ | 32 /* StaticY */));
exports.bat = registerMix(n('bat'), mixins_1.mixAnimation(sprites.bat, 8, 10, 65), mixFlags(4 /* Critter */ | 1 /* Movable */ | 32 /* StaticY */));
exports.spider = registerMix(n('spider'), (base, options) => base.options = Object.assign({ height: 20, time: 0 }, options), mixins_1.mixDrawSpider(sprites.spider, 2, 2), mixFlags(4 /* Critter */));
// cat
sprites.cat.frames.push(sprites.emptySprite2);
sprites.cat_light.frames.push(sprites.emptySprite);
var CatAnimation;
(function (CatAnimation) {
    CatAnimation[CatAnimation["Sit"] = 0] = "Sit";
    CatAnimation[CatAnimation["Enter"] = 1] = "Enter";
    CatAnimation[CatAnimation["Exit"] = 2] = "Exit";
    CatAnimation[CatAnimation["Blink"] = 3] = "Blink";
    CatAnimation[CatAnimation["Wag"] = 4] = "Wag";
})(CatAnimation = exports.CatAnimation || (exports.CatAnimation = {}));
const catSit = [9];
const catEnter = [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 9];
const catExit = [9, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 8, 17];
const catBlink = [9, 10, 10, 9];
const catWag = [9, 11, 11, 12, 12, 13, 13, 14, 14, 14, 15, 15, 16, 16, 9];
exports.cat = registerMix(n('cat'), mixins_1.mixAnimation(sprites.cat, 24, 17, 39, {
    repeat: false,
    animations: [catSit, catEnter, catExit, catBlink, catWag],
    lightSprite: sprites.cat_light,
}), base => base.chatY = -5);
// bunny
var BunnyAnimation;
(function (BunnyAnimation) {
    BunnyAnimation[BunnyAnimation["Sit"] = 0] = "Sit";
    BunnyAnimation[BunnyAnimation["Walk"] = 1] = "Walk";
    BunnyAnimation[BunnyAnimation["Blink"] = 2] = "Blink";
    BunnyAnimation[BunnyAnimation["Clean"] = 3] = "Clean";
    BunnyAnimation[BunnyAnimation["Look"] = 4] = "Look";
})(BunnyAnimation = exports.BunnyAnimation || (exports.BunnyAnimation = {}));
const bunnySit = [7];
const bunnyWalk = [0, 1, 2, 3, 4, 5, 6];
const bunnyBlink = [7, 8, ...utils_1.repeat(35, 7)];
const bunnyClean = [7, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, ...utils_1.repeat(30, 7)];
const bunnyLook = [7, 9, 25, 26, 27, 28, 29, 30, 31, 32, 33, 9, ...utils_1.repeat(30, 7)];
exports.bunny = registerMix(n('bunny'), mixins_1.mixAnimation(sprites.bunny, 14, 12, 23, {
    animations: [bunnySit, bunnyWalk, bunnyBlink, bunnyClean, bunnyLook],
}), mixFlags(1 /* Movable */));
// eyes
const spritesEyes = {
    frames: [sprites.emptySprite2],
    palette: sprites.defaultPalette,
};
exports.eyes = registerMix(n('eyes'), mixins_1.mixAnimation(spritesEyes, 24, 16, 8, {
    repeat: false,
    animations: [[9], [10]],
    lightSprite: sprites.cat_light,
}));
// ghosts
const ghostSprite = {
    frames: [
        sprites.emptySprite2,
        ...sprites.ghost1.frames,
    ],
    palette: sprites.ghost1.palette,
};
const ghostHoovesSprite = {
    frames: [
        sprites.emptySprite2,
        ...sprites.ghost1_hooves.frames,
        ...utils_1.repeat(17, sprites.emptySprite2),
    ],
    palette: sprites.ghost1_hooves.palette,
};
const ghostLightSprite = {
    frames: [
        sprites.emptySprite,
        ...sprites.ghost1_light.frames,
    ],
};
const ghostHoovesLightSprite = {
    frames: [
        sprites.emptySprite,
        ...sprites.ghost1_hooves_light.frames,
    ],
};
const ghostFPS = 20;
const ghostDX = 28;
const ghostDYBase = 40;
const ghostDY = [ghostDYBase, ghostDYBase + 7]; // by tombstone
const ghostColor = color_1.withAlphaFloat(colors_1.WHITE, 0.7);
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
    ...utils_1.repeat(10, 9),
    10,
    ...utils_1.repeat(3, 11),
    12,
    ...utils_1.repeat(14, 13),
    14, 14,
    ...utils_1.repeat(10, 15),
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
    ...utils_1.repeat(10, 26),
    27,
    28,
    ...utils_1.repeat(4, 29),
    30,
    31,
    32,
    ...utils_1.repeat(10, 33),
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
    ...utils_1.repeat(10, 49),
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
var GhostAnimation;
(function (GhostAnimation) {
    GhostAnimation[GhostAnimation["None"] = 0] = "None";
    GhostAnimation[GhostAnimation["Anim1"] = 1] = "Anim1";
    GhostAnimation[GhostAnimation["Anim2"] = 2] = "Anim2";
    GhostAnimation[GhostAnimation["Anim3"] = 3] = "Anim3";
})(GhostAnimation = exports.GhostAnimation || (exports.GhostAnimation = {}));
const createGhost = (tomb) => {
    const anim = mixins_1.mixAnimation(ghostSprite, ghostFPS, ghostDX, ghostDY[tomb], {
        color: ghostColor,
        repeat: false,
        animations: [ghostNone, ghostAnim1, ghostAnim2, ghostAnim3],
        lightSprite: ghostLightSprite,
    });
    return registerMix(n(`ghost-${tomb + 1}`), anim, base => {
        base.order = -1;
        base.lightSpriteColor = ghostLightColor;
    });
};
const createGhostHooves = (tomb) => {
    const anim = mixins_1.mixAnimation(ghostHoovesSprite, ghostFPS, ghostDX, ghostDY[tomb], {
        color: ghostColor,
        repeat: false,
        animations: [ghostNone, ghostAnim1, ghostAnim2, ghostAnim3],
        lightSprite: ghostHoovesLightSprite,
    });
    return registerMix(n(`ghost-hooves-${tomb + 1}`), anim, base => {
        base.order = -1;
        base.lightSpriteColor = ghostLightColor;
    });
};
exports.ghost1 = createGhost(0);
exports.ghost2 = createGhost(1);
exports.ghostHooves1 = createGhostHooves(0);
exports.ghostHooves2 = createGhostHooves(1);
// clouds
const cloudSprite = sprites.cloud.shadow;
exports.cloud = registerMix(n('cloud'), mixins_1.mixDrawShadow(sprites.cloud, Math.floor(cloudSprite.w / 2), cloudSprite.h, colors_1.CLOUD_SHADOW_COLOR), mixFlags(2 /* Decal */ | 1 /* Movable */));
// vegetation
const largeLeafedBushLarge = mixins_1.mixColliderRounded(-14, -6, 28, 12, 2, false);
const largeLeafedBushSmall = mixins_1.mixColliderRounded(-8, -4, 16, 8, 2, false);
exports.largeLeafedBush1 = registerMix(n('large-leafed-bush-1'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.large_leafed_bush_1, dx: 17, dy: 23, palette: 0 },
    winter: { palette: 1 },
}), largeLeafedBushLarge);
exports.largeLeafedBush2 = registerMix(n('large-leafed-bush-2'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.large_leafed_bush_2, dx: 17, dy: 23, palette: 0 },
    winter: { palette: 1 },
}), largeLeafedBushLarge);
exports.largeLeafedBush3 = registerMix(n('large-leafed-bush-3'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.large_leafed_bush_3, dx: 12, dy: 17, palette: 0 },
    winter: { palette: 1 },
}), largeLeafedBushSmall);
exports.largeLeafedBush4 = registerMix(n('large-leafed-bush-4'), mixins_1.mixDrawSeasonal({
    summer: { sprite: sprites.large_leafed_bush_4, dx: 12, dy: 17, palette: 0 },
    winter: { palette: 1 },
}), largeLeafedBushSmall);
// cliffs
const cliffTall = false;
const cliffCollider = mixins_1.mixColliderRect(-16, 0, 32, 24, cliffTall);
const cliffColliderTop = mixins_1.mixColliderRect(-16, 0, 32, 8, cliffTall);
const cliffColliderLeft = mixins_1.mixColliderRect(-18, 0, 6, 24, cliffTall);
const cliffColliderRight = mixins_1.mixColliderRect(12, 0, 6, 24, cliffTall);
const cliffColliderTrimLeft = mixins_1.mixColliderRect(-16, 0, 16, 24, cliffTall);
const cliffColliderTrimRight = mixins_1.mixColliderRect(0, 0, 16, 24, cliffTall);
const cliffColor = 0x908d7cff;
const cliffExtra = mixins_1.mixMinimap(cliffColor, rect_1.rect(-1, 0, 1, 1));
function cliffOffset(name, sprite, dx, dy, ...other) {
    return registerMix(name, mixins_1.mixDrawSeasonal({
        summer: { sprite, dx, dy, palette: 0 },
        autumn: { palette: 1 },
        winter: { palette: 2 },
    }), mixFlags(32 /* StaticY */), ...other);
}
function cliff(name, sprite, ...other) {
    return cliffOffset(name, sprite, Math.floor((sprite.color.w + sprite.color.ox) / 2), sprite.color.oy, mixFlags(32 /* StaticY */), ...other);
}
function cliffDecal(name, sprite, dx, dy, ...other) {
    return cliffOffset(name, sprite, dx, dy, mixFlags(2 /* Decal */), ...other);
}
exports.cliffSW = cliff(n('cliff-sw'), sprites.cliffs_grass_sw, mixins_1.mixColliders(...mixins_1.taperColliderSW(-16, -3, 32, 25, cliffTall), mixins_1.collider(-16, 22, 35, 24 * 2 + 7, cliffTall), ...mixins_1.taperColliderNE(-16, 22 + 24 * 2 + 7, 32, 24, cliffTall)), mixins_1.mixMinimap(cliffColor, rect_1.rect(-1, 0, 1, 4)));
exports.cliffSE = cliff(n('cliff-se'), sprites.cliffs_grass_se, mixins_1.mixColliders(...mixins_1.taperColliderSE(-16, -3, 32, 25, cliffTall), mixins_1.collider(-19, 22, 35, 24 * 2 + 7, cliffTall), ...mixins_1.taperColliderNW(-16, 22 + 24 * 2 + 7, 32, 24, cliffTall)), mixins_1.mixMinimap(cliffColor, rect_1.rect(-1, 0, 1, 4)));
const cliffSCollider = mixins_1.mixColliderRect(-16, -3, 32, 24 * 3 + 8, cliffTall);
exports.cliffS1 = cliff(n('cliff-s1'), sprites.cliffs_grass_s1, cliffSCollider, mixins_1.mixMinimap(cliffColor, rect_1.rect(-1, 0, 1, 3)));
exports.cliffS2 = cliff(n('cliff-s2'), sprites.cliffs_grass_s2, cliffSCollider, mixins_1.mixMinimap(cliffColor, rect_1.rect(-1, 0, 1, 3)));
exports.cliffS3 = cliff(n('cliff-s3'), sprites.cliffs_grass_s3, cliffSCollider, mixins_1.mixMinimap(cliffColor, rect_1.rect(-1, 0, 1, 3)));
exports.cliffSb = cliff(n('cliff-sb'), sprites.cliffs_grass_sb, cliffSCollider, mixins_1.mixMinimap(cliffColor, rect_1.rect(-1, 0, 1, 3)));
exports.cliffSbEntrance = cliff(n('cliff-sb-entrance'), sprites.cliffs_grass_sb, mixins_1.mixColliderRect(-16, -3, 32, 24 * 3, cliffTall), mixins_1.mixMinimap(cliffColor, rect_1.rect(-1, 0, 1, 3)));
const cliffNWColliders = mixins_1.mixColliders(...mixins_1.skewColliderNW(0, 0, 21, 24, cliffTall));
const cliffNEColliders = mixins_1.mixColliders(...mixins_1.skewColliderNE(-22, 0, 21, 24, cliffTall));
const cliffColliderTrimLeftBot = mixins_1.mixColliders(mixins_1.collider(-16, 0, 16, 17, cliffTall), ...mixins_1.taperColliderNW(-16, 17, 16, 11, cliffTall));
const cliffColliderTrimRightBot = mixins_1.mixColliders(mixins_1.collider(0, 0, 16, 17, cliffTall), ...mixins_1.taperColliderNE(0, 17, 16, 11, cliffTall));
exports.cliffTopNW = cliff(n('cliff-top-nw'), sprites.cliffs_grass_top_nw, cliffNWColliders, cliffExtra);
exports.cliffTopN = cliff(n('cliff-top-n'), sprites.cliffs_grass_top_n, cliffColliderTop, cliffExtra);
exports.cliffTopNE = cliff(n('cliff-top-ne'), sprites.cliffs_grass_top_ne, cliffNEColliders, cliffExtra);
exports.cliffTopW = cliffOffset(n('cliff-top-w'), sprites.cliffs_grass_top_w, 16, 0, cliffColliderLeft, cliffExtra);
exports.cliffTopE = cliff(n('cliff-top-e'), sprites.cliffs_grass_top_e, cliffColliderRight, cliffExtra);
exports.cliffTopSW = cliff(n('cliff-top-sw'), sprites.cliffs_grass_top_sw, cliffCollider, cliffExtra);
exports.cliffTopSE = cliff(n('cliff-top-se'), sprites.cliffs_grass_top_se, cliffCollider, cliffExtra);
exports.cliffTopS1 = cliff(n('cliff-top-s1'), sprites.cliffs_grass_top_s1, cliffCollider, cliffExtra);
exports.cliffTopS2 = cliff(n('cliff-top-s2'), sprites.cliffs_grass_top_s2, cliffCollider, cliffExtra);
exports.cliffTopS3 = cliff(n('cliff-top-s3'), sprites.cliffs_grass_top_s3, cliffCollider, cliffExtra);
exports.cliffTopSb = cliff(n('cliff-top-sb'), sprites.cliffs_grass_top_sb, cliffCollider, cliffExtra);
exports.cliffMidS1 = cliff(n('cliff-mid-s1'), sprites.cliffs_grass_mid_s1, cliffCollider, cliffExtra);
exports.cliffMidS2 = cliff(n('cliff-mid-s2'), sprites.cliffs_grass_mid_s2, cliffCollider, cliffExtra);
exports.cliffMidS3 = cliff(n('cliff-mid-s3'), sprites.cliffs_grass_mid_s3, cliffCollider, cliffExtra);
exports.cliffMidSb = cliff(n('cliff-mid-sb'), sprites.cliffs_grass_mid_sb, cliffCollider, cliffExtra);
exports.cliffMidSW1 = cliff(n('cliff-mid-sw1'), sprites.cliffs_grass_mid_sw1, cliffCollider, cliffExtra);
exports.cliffMidSE1 = cliff(n('cliff-mid-se1'), sprites.cliffs_grass_mid_se1, cliffCollider, cliffExtra);
exports.cliffMidSW2 = cliff(n('cliff-mid-sw2'), sprites.cliffs_grass_mid_sw2, cliffCollider, cliffExtra);
exports.cliffMidSE2 = cliff(n('cliff-mid-se2'), sprites.cliffs_grass_mid_se2, cliffCollider, cliffExtra);
exports.cliffBotS1 = cliff(n('cliff-bot-s1'), sprites.cliffs_grass_bot_s1, cliffCollider, cliffExtra);
exports.cliffBotS2 = cliff(n('cliff-bot-s2'), sprites.cliffs_grass_bot_s2, cliffCollider, cliffExtra);
exports.cliffBotS3 = cliff(n('cliff-bot-s3'), sprites.cliffs_grass_bot_s3, cliffCollider, cliffExtra);
exports.cliffBotSb = cliff(n('cliff-bot-sb'), sprites.cliffs_grass_bot_sb, cliffCollider, cliffExtra);
exports.cliffBotSW = cliff(n('cliff-bot-sw'), sprites.cliffs_grass_bot_sw, cliffCollider, cliffExtra);
exports.cliffBotSE = cliff(n('cliff-bot-se'), sprites.cliffs_grass_bot_se, cliffCollider, cliffExtra);
exports.cliffTopTrimLeft = cliffDecal(n('cliff-top-trim-left'), sprites.cliffs_grass_top_trim_left, 16, 0, cliffColliderTrimRight, mixOrder(1));
exports.cliffMidTrimLeft = cliffDecal(n('cliff-mid-trim-left'), sprites.cliffs_grass_mid_trim_left, 16, 0, cliffColliderTrimRight, mixOrder(1));
exports.cliffBotTrimLeft = cliffDecal(n('cliff-bot-trim-left'), sprites.cliffs_grass_bot_trim_left, 16, 0, cliffColliderTrimRightBot, mixOrder(1));
exports.cliffTopTrimRight = cliffDecal(n('cliff-top-trim-right'), sprites.cliffs_grass_top_trim_right, 16, 0, cliffColliderTrimLeft);
exports.cliffMidTrimRight = cliffDecal(n('cliff-mid-trim-right'), sprites.cliffs_grass_mid_trim_right, 16, 0, cliffColliderTrimLeft);
exports.cliffBotTrimRight = cliffDecal(n('cliff-bot-trim-right'), sprites.cliffs_grass_bot_trim_right, 16, 0, cliffColliderTrimLeftBot);
exports.cliffDecal1 = cliffDecal(n('cliff-decal-1'), sprites.cliffs_grass_decal_1, 14, 1, mixOrder(2));
exports.cliffDecal2 = cliffDecal(n('cliff-decal-2'), sprites.cliffs_grass_decal_2, 14, 1, mixOrder(2));
exports.cliffDecal3 = cliffDecal(n('cliff-decal-3'), sprites.cliffs_grass_decal_3, 16, -2, mixOrder(2));
exports.cliffDecalL = cliffDecal(n('cliff-decal-l'), sprites.cliffs_grass_decal_l, 15, 1, mixOrder(2));
exports.cliffDecalR = cliffDecal(n('cliff-decal-r'), sprites.cliffs_grass_decal_r, 16, 1, mixOrder(2));
// cave
const caveTall = true;
const caveCollider = mixins_1.mixColliderRect(-16, 0, 32, 24, caveTall);
const caveColliderTop = mixins_1.mixColliderRect(-16, 0, 32, 24, caveTall);
const caveColliderLeft = mixins_1.mixColliderRect(-18, 0, 24, 24, caveTall);
const caveColliderRight = mixins_1.mixColliderRect(-16, 0, 34, 24, caveTall);
const caveColliderTrimLeft = mixins_1.mixColliderRect(-16, 0, 16, 24, caveTall);
const caveColliderTrimRight = mixins_1.mixColliderRect(0, 0, 16, 24, caveTall);
const caveColor = 0x6a6f73ff;
const caveExtra = mixins_1.mixMinimap(caveColor, rect_1.rect(-1, 0, 1, 1));
function caveOffset(name, sprite, dx, dy, ...other) {
    return registerMix(name, mixins_1.mixDrawSeasonal({
        summer: { sprite, dx, dy, palette: 0 },
        autumn: { palette: 1 },
        winter: { palette: 2 },
    }), mixFlags(32 /* StaticY */), ...other);
}
function cave(name, sprite, ...other) {
    return caveOffset(name, sprite, Math.floor((sprite.color.w + sprite.color.ox) / 2), sprite.color.oy, ...other);
}
function caveDecal(name, sprite, dx, dy, ...other) {
    return caveOffset(name, sprite, dx, dy, mixFlags(2 /* Decal */), ...other);
}
exports.caveSW = cave(n('cave-sw'), sprites.cave_walls_sw, mixins_1.mixColliders(mixins_1.collider(-16, -3, 35, 24 * 2 + 7 + 25, caveTall), ...mixins_1.taperColliderNE(-16, 22 + 24 * 2 + 7, 32, 24, caveTall)), mixins_1.mixMinimap(caveColor, rect_1.rect(-1, 0, 1, 4)));
exports.caveSE = cave(n('cave-se'), sprites.cave_walls_se, mixins_1.mixColliders(mixins_1.collider(-19, -3, 35, 24 * 2 + 7 + 25, caveTall), ...mixins_1.taperColliderNW(-16, 22 + 24 * 2 + 7, 32, 24, caveTall)), mixins_1.mixMinimap(caveColor, rect_1.rect(-1, 0, 1, 4)));
const caveSCollider = mixins_1.mixColliderRect(-16, -3, 32, 24 * 3 + 8, caveTall);
exports.caveS1 = cave(n('cave-s1'), sprites.cave_walls_s1, caveSCollider, mixins_1.mixMinimap(caveColor, rect_1.rect(-1, 0, 1, 3)));
exports.caveS2 = cave(n('cave-s2'), sprites.cave_walls_s2, caveSCollider, mixins_1.mixMinimap(caveColor, rect_1.rect(-1, 0, 1, 3)));
exports.caveS3 = cave(n('cave-s3'), sprites.cave_walls_s3, caveSCollider, mixins_1.mixMinimap(caveColor, rect_1.rect(-1, 0, 1, 3)));
exports.caveSb = cave(n('cave-sb'), sprites.cave_walls_sb, caveSCollider, mixins_1.mixMinimap(caveColor, rect_1.rect(-1, 0, 1, 3)));
const caveNWColliders = mixins_1.mixColliders(...mixins_1.triangleColliderNW(0, 0, 21, 24, caveTall));
const caveNEColliders = mixins_1.mixColliders(...mixins_1.triangleColliderNE(-22, 0, 21, 24, caveTall));
const caveColliderTrimLeftBot = mixins_1.mixColliders(mixins_1.collider(-16, 0, 16, 17, caveTall), ...mixins_1.taperColliderNW(-16, 17, 16, 11, caveTall));
const caveColliderTrimRightBot = mixins_1.mixColliders(mixins_1.collider(0, 0, 16, 17, caveTall), ...mixins_1.taperColliderNE(0, 17, 16, 11, caveTall));
exports.caveTopNW = cave(n('cave-top-nw'), sprites.cave_walls_top_nw, caveNWColliders, caveExtra);
exports.caveTopN = cave(n('cave-top-n'), sprites.cave_walls_top_n, caveColliderTop, caveExtra);
exports.caveTopNE = cave(n('cave-top-ne'), sprites.cave_walls_top_ne, caveNEColliders, caveExtra);
exports.caveTopW = caveOffset(n('cave-top-w'), sprites.cave_walls_top_w, 16, 0, caveColliderLeft, caveExtra);
exports.caveTopE = cave(n('cave-top-e'), sprites.cave_walls_top_e, caveColliderRight, caveExtra);
exports.caveTopSW = cave(n('cave-top-sw'), sprites.cave_walls_top_sw, caveCollider, caveExtra);
exports.caveTopSE = cave(n('cave-top-se'), sprites.cave_walls_top_se, caveCollider, caveExtra);
exports.caveTopS1 = cave(n('cave-top-s1'), sprites.cave_walls_top_s1, caveCollider, caveExtra);
exports.caveTopS2 = cave(n('cave-top-s2'), sprites.cave_walls_top_s2, caveCollider, caveExtra);
exports.caveTopS3 = cave(n('cave-top-s3'), sprites.cave_walls_top_s3, caveCollider, caveExtra);
exports.caveTopSb = cave(n('cave-top-sb'), sprites.cave_walls_top_sb, caveCollider, caveExtra);
exports.caveMidS1 = cave(n('cave-mid-s1'), sprites.cave_walls_mid_s1, caveCollider, caveExtra);
exports.caveMidS2 = cave(n('cave-mid-s2'), sprites.cave_walls_mid_s2, caveCollider, caveExtra);
exports.caveMidS3 = cave(n('cave-mid-s3'), sprites.cave_walls_mid_s3, caveCollider, caveExtra);
exports.caveMidSb = cave(n('cave-mid-sb'), sprites.cave_walls_mid_sb, caveCollider, caveExtra);
exports.caveMidSW1 = cave(n('cave-mid-sw1'), sprites.cave_walls_mid_sw1, caveCollider, caveExtra);
exports.caveMidSE1 = cave(n('cave-mid-se1'), sprites.cave_walls_mid_se1, caveCollider, caveExtra);
exports.caveMidSW2 = cave(n('cave-mid-sw2'), sprites.cave_walls_mid_sw2, caveCollider, caveExtra);
exports.caveMidSE2 = cave(n('cave-mid-se2'), sprites.cave_walls_mid_se2, caveCollider, caveExtra);
exports.caveBotS1 = cave(n('cave-bot-s1'), sprites.cave_walls_bot_s1, caveCollider, caveExtra);
exports.caveBotS2 = cave(n('cave-bot-s2'), sprites.cave_walls_bot_s2, caveCollider, caveExtra);
exports.caveBotS3 = cave(n('cave-bot-s3'), sprites.cave_walls_bot_s3, caveCollider, caveExtra);
exports.caveBotSb = cave(n('cave-bot-sb'), sprites.cave_walls_bot_sb, caveCollider, caveExtra);
exports.caveBotSW = cave(n('cave-bot-sw'), sprites.cave_walls_bot_sw, caveCollider, caveExtra);
exports.caveBotSE = cave(n('cave-bot-se'), sprites.cave_walls_bot_se, caveCollider, caveExtra);
exports.caveTopTrimLeft = caveDecal(n('cave-top-trim-left'), sprites.cave_walls_top_trim_left, 16, 0, caveColliderTrimRight, mixOrder(1));
exports.caveMidTrimLeft = caveDecal(n('cave-mid-trim-left'), sprites.cave_walls_mid_trim_left, 16, 0, caveColliderTrimRight, mixOrder(1));
exports.caveBotTrimLeft = caveDecal(n('cave-bot-trim-left'), sprites.cave_walls_bot_trim_left, 16, 0, caveColliderTrimRightBot, mixOrder(1));
exports.caveTopTrimRight = caveDecal(n('cave-top-trim-right'), sprites.cave_walls_top_trim_right, 16, 0, caveColliderTrimLeft);
exports.caveMidTrimRight = caveDecal(n('cave-mid-trim-right'), sprites.cave_walls_mid_trim_right, 16, 0, caveColliderTrimLeft);
exports.caveBotTrimRight = caveDecal(n('cave-bot-trim-right'), sprites.cave_walls_bot_trim_right, 16, 0, caveColliderTrimLeftBot);
exports.caveDecal1 = caveDecal(n('cave-decal-1'), sprites.cave_walls_decal_1, 14, 1, mixOrder(2));
exports.caveDecal2 = caveDecal(n('cave-decal-2'), sprites.cave_walls_decal_2, 14, 1, mixOrder(2));
exports.caveDecal3 = caveDecal(n('cave-decal-3'), sprites.cave_walls_decal_3, 16, -2, mixOrder(2));
exports.caveDecalL = caveDecal(n('cave-decal-l'), sprites.cave_walls_decal_l, 15, 1, mixOrder(2));
exports.caveDecalR = caveDecal(n('cave-decal-r'), sprites.cave_walls_decal_r, 16, 1, mixOrder(2));
exports.caveFill = registerMix(n('cave-fill'), mixins_1.mixDraw(sprites.tile_none, 0, 0), mixins_1.mixColliderRect(0, 0, 32, 24, true, true), mixFlags(32 /* StaticY */));
exports.caveCover = registerMix(n('cave-cover'), mixins_1.mixDraw(sprites.tile_none, 0, 24), mixFlags(32 /* StaticY */));
// stalactites
exports.stalactite1 = doodad(n('stalactite-1'), sprites.stalactite_1, 4, 15, 0, mixins_1.mixColliderRounded(-4, -3, 8, 5, 2), mixFlags(32 /* StaticY */));
exports.stalactite2 = doodad(n('stalactite-2'), sprites.stalactite_2, 5, 31, 0, mixins_1.mixColliderRounded(-5, -4, 10, 5, 2), mixFlags(32 /* StaticY */));
exports.stalactite3 = doodad(n('stalactite-3'), sprites.stalactite_3, 6, 51, 0, mixins_1.mixColliderRounded(-6, -6, 12, 7, 3), mixFlags(32 /* StaticY */));
// crystals
const crystalLight = 0x299ad5ff;
const mixCrystalLight = mixins_1.mixLight(crystalLight, 0, 0, 200, 200);
const waterCrystalFPS = constants_1.WATER_FPS;
exports.crystals1 = registerMix(n('crystals-1'), mixins_1.mixDraw(sprites.crystals_1, 8, 16), mixins_1.mixLightSprite(sprites.light_crystals_1, colors_1.WHITE, 8, 16), mixCrystalLight, mixins_1.mixColliderRounded(-7, -4, 16, 4, 1));
exports.crystals2 = registerMix(n('crystals-2'), mixins_1.mixDraw(sprites.crystals_2, 11, 19), mixins_1.mixLightSprite(sprites.light_crystals_2, colors_1.WHITE, 11, 19), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystals3 = registerMix(n('crystals-3'), mixins_1.mixDraw(sprites.crystals_3, 13, 18), mixins_1.mixLightSprite(sprites.light_crystals_3, colors_1.WHITE, 13, 18), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystals4 = registerMix(n('crystals-4'), mixins_1.mixDraw(sprites.crystals_4, 11, 15), mixins_1.mixLightSprite(sprites.light_crystals_4, colors_1.WHITE, 11, 15), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystals5 = registerMix(n('crystals-5'), mixins_1.mixDraw(sprites.crystals_5, 12, 18), mixins_1.mixLightSprite(sprites.light_crystals_5, colors_1.WHITE, 12, 18), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystals6 = registerMix(n('crystals-6'), mixins_1.mixDraw(sprites.crystals_6, 11, 13), mixins_1.mixLightSprite(sprites.light_crystals_6, colors_1.WHITE, 11, 13), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystals7 = registerMix(n('crystals-7'), mixins_1.mixDraw(sprites.crystals_7, 13, 16), mixins_1.mixLightSprite(sprites.light_crystals_7, colors_1.WHITE, 13, 16), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystals8 = registerMix(n('crystals-8'), mixins_1.mixDraw(sprites.crystals_8, 8, 17), mixins_1.mixLightSprite(sprites.light_crystals_8, colors_1.WHITE, 8, 17), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystals9 = registerMix(n('crystals-9'), mixins_1.mixDraw(sprites.crystals_9, 8, 11), mixins_1.mixLightSprite(sprites.light_crystals_9, colors_1.WHITE, 8, 11), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystals10 = registerMix(n('crystals-10'), mixins_1.mixDraw(sprites.crystals_10, 5, 12), mixins_1.mixLightSprite(sprites.light_crystals_10, colors_1.WHITE, 5, 12), mixCrystalLight, mixins_1.mixColliderRounded(-9, -4, 18, 4, 1));
exports.crystalsCartPile = registerMix(n('crystals-cart-pile'), mixins_1.mixDraw(sprites.crystals_cart_pile, 21, 28), mixins_1.mixLightSprite(sprites.light_crystals_cart_pile, colors_1.WHITE, 21, 28), mixCrystalLight, mixins_1.mixInteract(-20, -28, 40, 40, 3), mixFlags(32 /* StaticY */), mixOrder(2));
exports.crystalHeld = registerMix(n('crystal-held'), mixins_1.mixDraw(sprites.crystals_held, 7, 4), mixins_1.mixLightSprite(sprites.light_crystals_held, colors_1.WHITE, 7, 4), mixins_1.mixLight(crystalLight, 0, 0, 160, 160), mixins_1.mixPickable(31, 44));
exports.crystalLantern = registerMix(n('crystal-lantern'), mixins_1.mixDraw(sprites.crystal_lantern, 4, 15), mixins_1.mixLightSprite(sprites.light_crystal_lantern, colors_1.WHITE, 4, 15), mixins_1.mixLight(crystalLight, 0, 0, 192, 144), mixins_1.mixPickable(31, 55));
exports.waterCrystal1 = registerMix(n('water-crystal-1'), mixins_1.mixAnimation(sprites.water_crystal_1, waterCrystalFPS, 4, 12, {
    lightSprite: sprites.water_crystal_1_light,
}), mixCrystalLight, mixins_1.mixColliderRounded(-4, -4, 9, 8, 2, false), mixFlags(32 /* StaticY */));
exports.waterCrystal2 = registerMix(n('water-crystal-2'), mixins_1.mixAnimation(sprites.water_crystal_2, waterCrystalFPS, 9, 11, {
    lightSprite: sprites.water_crystal_2_light,
}), mixCrystalLight, mixins_1.mixColliderRounded(-9, -6, 16, 7, 2, false), mixFlags(32 /* StaticY */));
exports.waterCrysta3 = registerMix(n('water-crystal-3'), mixins_1.mixAnimation(sprites.water_crystal_3, waterCrystalFPS, 5, 10, {
    lightSprite: sprites.water_crystal_3_light,
}), mixCrystalLight, mixins_1.mixColliderRounded(-4, -4, 7, 5, 2, false), mixFlags(32 /* StaticY */));
// mine
exports.mineEntrance = registerMix(n('mine-entrance'), mixins_1.mixDraw(sprites.mine_entrance, 49, 0), mixins_1.mixInteract(-32, -48, 65, 46, 3), mixOrder(10));
exports.mineClosed = registerMix(n('mine-closed'), mixins_1.mixDraw(sprites.mine_closed, 36, -24), mixOrder(11));
exports.mineCart = doodad(n('mine-cart'), sprites.mine_cart, 26, 32, 0, mixins_1.mixColliderRect(-27, 0, 54, 21), mixFlags(32 /* StaticY */), mixOrder(1));
exports.mineCartFront = doodad(n('mine-cart-front'), sprites.mine_cart_front, 26, 52, 0, mixins_1.mixColliders(mixins_1.collider(-30, -25, 55, 4), mixins_1.collider(-30, -19, 15, 20), mixins_1.collider(-30, 2, 55, 4)), mixFlags(32 /* StaticY */));
exports.mineCartBack = doodad(n('mine-cart-back'), sprites.mine_cart_back, 26, 30, 0, mixFlags(32 /* StaticY */));
const railsExtra = mixFlags(32 /* StaticY */);
exports.mineRailsH = decal(n('mine-rails-h'), sprites.mine_rails_h, 0, railsExtra);
exports.mineRailsV = decal(n('mine-rails-v'), sprites.mine_rails_v, 0, railsExtra);
exports.mineRailsSE = decalOffset(n('mine-rails-se'), sprites.mine_rails_se, 16, 0, 0, railsExtra);
exports.mineRailsSW = decalOffset(n('mine-rails-sw'), sprites.mine_rails_sw, 16, 0, 0, railsExtra);
exports.mineRailsNE = decalOffset(n('mine-rails-ne'), sprites.mine_rails_ne, 16, 0, 0, railsExtra);
exports.mineRailsNW = decalOffset(n('mine-rails-nw'), sprites.mine_rails_nw, 16, 0, 0, railsExtra);
exports.mineRailsNSW = decalOffset(n('mine-rails-nsw'), sprites.mine_rails_nsw, 16, 1, 0, railsExtra);
exports.mineRailsNSE = decalOffset(n('mine-rails-nse'), sprites.mine_rails_nse, 16, 1, 0, railsExtra);
exports.mineRailsNWE = decalOffset(n('mine-rails-nwe'), sprites.mine_rails_nwe, 16, 0, 0, railsExtra);
exports.mineRailsSWE = decalOffset(n('mine-rails-swe'), sprites.mine_rails_swe, 16, 0, 0, railsExtra);
exports.mineRailsEndLeft = doodad(n('mine-rails-end-left'), sprites.mine_rails_end_left, 17, 30, 0, mixins_1.mixColliderRect(-20, -10, 38, 23), railsExtra);
exports.mineRailsEndRight = doodad(n('mine-rails-end-right'), sprites.mine_rails_end_right, 16, 30, 0, mixins_1.mixColliderRect(-16, -10, 38, 23), railsExtra);
exports.mineRailsEndTop = doodad(n('mine-rails-end-top'), sprites.mine_rails_end_top, 16, 32, 0, mixins_1.mixColliderRect(-16, -32, 32, 32), railsExtra);
exports.mineRailsFadeUp = decal(n('mine-rails-fade-up'), sprites.mine_rail_fade_up, 0, railsExtra);
// collider utils
exports.collider1x1 = registerMix(n('collider-1x1'), mixins_1.mixColliderRect(0, 0, 1 * constants_1.tileWidth, 1 * constants_1.tileHeight, false, true));
exports.collider2x1 = registerMix(n('collider-2x1'), mixins_1.mixColliderRect(0, 0, 2 * constants_1.tileWidth, 1 * constants_1.tileHeight, false, true));
exports.collider3x1 = registerMix(n('collider-3x1'), mixins_1.mixColliderRect(0, 0, 3 * constants_1.tileWidth, 1 * constants_1.tileHeight, false, true));
exports.collider1x2 = registerMix(n('collider-1x2'), mixins_1.mixColliderRect(0, 0, 1 * constants_1.tileWidth, 2 * constants_1.tileHeight, false, true));
exports.collider1x3 = registerMix(n('collider-1x3'), mixins_1.mixColliderRect(0, 0, 1 * constants_1.tileWidth, 3 * constants_1.tileHeight, false, true));
// trees
const stumpsTall = false;
const treeAutumnPals = [2, 3, 4];
exports.web = doodad(n('web'), sprites.web, -6, 39, 0, mixCover(-50, -135, 110, 120));
exports.xmasLights = registerMix(n('xmas-lights'), mixins_1.mixLightSprite(sprites.light6, colors_1.WHITE, 75, 180));
exports.xmasLight = registerMix(n('xmas-light'), mixins_1.mixLight(0x926923ff, 0, 0, 50, 50));
const tree1Options = { sprite: sprites.tree_1, dx: 5, dy: 9 };
const tree2Options = { sprite: sprites.tree_2, dx: 10, dy: 32 };
const tree3Options = { sprite: sprites.tree_3, dx: 21, dy: 59 };
exports.trees1 = utils_1.times(3, i => registerMix(n(`tree1-${i}`), mixins_1.mixDrawSeasonal({
    summer: Object.assign({}, tree1Options, { palette: 0 }),
    autumn: Object.assign({}, tree1Options, { palette: treeAutumnPals[i] }),
    winter: Object.assign({}, tree1Options, { palette: 1 }),
})));
exports.trees2 = utils_1.times(3, i => registerMix(n(`tree2-${i}`), mixins_1.mixDrawSeasonal({
    summer: Object.assign({}, tree2Options, { palette: 0 }),
    autumn: Object.assign({}, tree2Options, { palette: treeAutumnPals[i] }),
    winter: Object.assign({}, tree2Options, { palette: 1 }),
})));
exports.trees3 = utils_1.times(3, i => registerMix(n(`tree3-${i}`), mixins_1.mixDrawSeasonal({
    summer: Object.assign({}, tree3Options, { palette: 0 }),
    autumn: Object.assign({}, tree3Options, { palette: treeAutumnPals[i] }),
    winter: Object.assign({}, tree3Options, { palette: 1 }),
}), mixins_1.mixColliderRounded(-3, -2, 6, 4, 1)));
exports.tree1 = exports.trees1[0];
exports.tree2 = exports.trees2[0];
exports.tree3 = exports.trees3[0];
exports.tree4 = createTree(n('tree4'), 31, 92, 12, {
    stumpCollider: mixins_1.mixColliderRounded(-5, -1, 12, 6, 1, stumpsTall),
    trunkCollider: mixins_1.mixColliderRounded(-5, -1, 12, 6, 1),
    cover: rect_1.rect(-20, -77, 42, 60),
    variants: utils_1.times(3, i => ({
        stump: sprites.tree_4Stump0,
        trunk: sprites.tree_4Trunk0,
        crown: sprites.tree_4Crown0_0,
        palette: 0,
        paletteAutumn: treeAutumnPals[i],
        paletteWinter: 1,
    })),
})[0];
_g = createTree(n('tree5'), 43, 128, 24, {
    stumpCollider: mixins_1.mixColliderRounded(-8, -2, 16, 8, 2, stumpsTall),
    trunkCollider: mixins_1.mixColliderRounded(-8, -2, 16, 8, 2),
    cover: rect_1.rect(-30, -106, 64, 80),
    variants: utils_1.times(3, i => ({
        stump: sprites.tree_5Stump0,
        trunk: sprites.tree_5Trunk0,
        crown: sprites.tree_5Crown0_0,
        palette: 0,
        paletteAutumn: treeAutumnPals[i],
        paletteWinter: 1,
    })),
}), exports.tree5 = _g[0], exports.tree5Stump = _g[1][0];
_h = createTree(n('tree'), 80, 162, 30, {
    stumpCollider: mixins_1.mixColliderRounded(-16, -1, 32, 12, 4, stumpsTall),
    trunkCollider: mixins_1.mixColliderRounded(-16, -1, 32, 12, 4),
    cover: rect_1.rect(-50, -135, 110, 120),
    variants: utils_1.flatten(utils_1.times(3, i => [
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
}), exports.tree = _h[0], _j = _h[1], exports.treeStump1 = _j[0], exports.treeStump2 = _j[1];
const pine1Options = { sprite: sprites.pine_1, dx: 7, dy: 18 };
const pine2Options = { sprite: sprites.pine_2, dx: 10, dy: 35 };
exports.pine1 = registerMix(n('pine1'), mixins_1.mixDrawSeasonal({
    summer: Object.assign({}, pine1Options, { palette: 0 }),
    autumn: Object.assign({}, pine1Options, { palette: 1 }),
    winter: Object.assign({}, pine1Options, { palette: 2 }),
}));
exports.pine2 = registerMix(n('pine2'), mixins_1.mixDrawSeasonal({
    summer: Object.assign({}, pine2Options, { palette: 0 }),
    autumn: Object.assign({}, pine2Options, { palette: 1 }),
    winter: Object.assign({}, pine2Options, { palette: 2 }),
}), mixins_1.mixColliderRounded(-3, -2, 6, 4, 1));
exports.pine3 = createTree(n('pine3'), 25, 68, 2, {
    stumpCollider: mixins_1.mixColliderRounded(-5, -1, 12, 6, 1, stumpsTall),
    trunkCollider: mixins_1.mixColliderRounded(-5, -1, 12, 6, 1),
    crownCollider: mixins_1.mixColliderRounded(-14, -6, 29, 12, 4),
    cover: rect_1.rect(-17, -41, 35, 40),
    variants: [
        { stump: sprites.pine_3Stump0, crown: sprites.pine_3Crown0_0, palette: 0, paletteAutumn: 1, paletteWinter: 2 },
    ]
})[0];
exports.pine4 = createTree(n('pine4'), 41, 95, 8, {
    stumpCollider: mixins_1.mixColliderRounded(-5, 4, 11, 6, 1, stumpsTall),
    trunkCollider: mixins_1.mixColliderRounded(-5, 4, 11, 6, 1),
    crownCollider: mixins_1.mixColliderRounded(-23, -8, 46, 20, 6),
    cover: rect_1.rect(-23, -68, 46, 70),
    variants: [
        { stump: sprites.pine_4Stump0, crown: sprites.pine_4Crown0_0, palette: 0, paletteAutumn: 1, paletteWinter: 2 },
    ]
})[0];
exports.pine5 = createTree(n('pine5'), 53, 136, 5, {
    stumpCollider: mixins_1.mixColliderRounded(-8, -3, 18, 10, 4, stumpsTall),
    trunkCollider: mixins_1.mixColliderRounded(-8, -3, 18, 10, 4),
    crownCollider: mixins_1.mixColliderRounded(-29, -12, 60, 25, 6),
    cover: rect_1.rect(-38, -95, 80, 100),
    variants: [
        { stump: sprites.pine_5Stump0, crown: sprites.pine_5Crown0_0, palette: 0, paletteAutumn: 1, paletteWinter: 2 },
    ]
})[0];
const xmasCrown = {
    color: sprites.christmastree.color,
    shadow: sprites.pine_6Crown0_0.shadow,
    palettes: sprites.christmastree.palettes,
};
exports.pine = createTree(n('pine'), 75, 180, 17, {
    stumpCollider: mixins_1.mixColliderRounded(-16, -1, 32, 14, 4, stumpsTall),
    trunkCollider: mixins_1.mixColliderRounded(-16, -1, 32, 14, 4),
    crownCollider: mixins_1.mixColliderRounded(-38, -21, 76, 31, 7),
    cover: rect_1.rect(-55, -120, 110, 133),
    variants: [
        { stump: sprites.pine_6Stump0, crown: sprites.pine_6Crown0_0, palette: 0, paletteAutumn: 1, paletteWinter: 2 },
        { stump: sprites.pine_6Stump0, crown: xmasCrown, palette: 0 },
    ]
})[0];
function createTree(name, offsetX, offsetY, crownOffset, { cover, stumpCollider, trunkCollider, crownCollider, variants }) {
    const trunkCover = base => base.coverBounds = cover;
    const crownCover = mixCover(cover.x, cover.y - crownOffset, cover.w, cover.h);
    const crownFlags = mixServerFlags(1 /* TreeCrown */);
    const crownMinimap = mixins_1.mixMinimap(0x386c4fff, rect_1.rect(-1, -1, 3, 3), 2);
    const stumps = variants.map((v, i) => v.stump && registerMix(n(`${name}-stump-${i}`), mixins_1.mixDrawSeasonal({
        summer: { sprite: v.stump, dx: offsetX, dy: offsetY, palette: v.palette || 0 },
        autumn: { sprite: v.stump, dx: offsetX, dy: offsetY, palette: v.paletteAutumn || v.palette || 0 },
        winter: { sprite: v.stumpWinter || v.stump, dx: offsetX, dy: offsetY, palette: v.paletteWinter || v.palette || 0 },
    }), stumpCollider, mixOrder(1)));
    const stumpsTall = variants.map((v, i) => v.stump && registerMix(n(`${name}-stump-tall-${i}`), mixins_1.mixDrawSeasonal({
        summer: { sprite: v.stump, dx: offsetX, dy: offsetY, palette: v.palette || 0 },
        autumn: { sprite: v.stump, dx: offsetX, dy: offsetY, palette: v.paletteAutumn || v.palette || 0 },
        winter: { sprite: v.stumpWinter || v.stump, dx: offsetX, dy: offsetY, palette: v.paletteWinter || v.palette || 0 },
    }), trunkCollider, mixOrder(1)));
    const trunks = variants.map((v, i) => v.trunk && registerMix(n(`${name}-trunk-${i}`), mixins_1.mixDrawSeasonal({
        summer: { sprite: v.trunk, dx: offsetX, dy: offsetY, palette: v.palette || 0 },
        autumn: { sprite: v.trunk, dx: offsetX, dy: offsetY, palette: v.paletteAutumn || v.palette || 0 },
        winter: { sprite: v.trunk, dx: offsetX, dy: offsetY, palette: v.paletteWinter || v.palette || 0 },
    }), trunkCover, mixOrder(2)));
    const crowns = variants.map((v, i) => v.crown && registerMix(n(`${name}-crown-${i}`), mixins_1.mixDrawSeasonal({
        summer: { sprite: v.crown, dx: offsetX, dy: offsetY + crownOffset, palette: v.palette || 0 },
        autumn: { sprite: v.crown, dx: offsetX, dy: offsetY + crownOffset, palette: v.paletteAutumn || v.palette || 0 },
        winter: { sprite: v.crown, dx: offsetX, dy: offsetY + crownOffset, palette: v.paletteWinter || v.palette || 0 },
    }), crownCollider, crownCover, crownFlags, crownMinimap));
    const trees = variants.map((v, i) => ({
        stump: stumps[i],
        stumpTall: stumpsTall[i],
        trunk: trunks[i],
        crown: crowns[i],
        webX: v.webX,
        webY: v.webY,
        spiderHeight: v.spiderHeight,
    }));
    function tree(x, y, v, hasWeb, hasSpider) {
        const { stumpTall, trunk, crown, webX, webY, spiderHeight } = trees[v || 0];
        return lodash_1.compact([
            stumpTall && stumpTall(x, y),
            trunk && trunk(x, y),
            crown && crown(x, y + (crownOffset / constants_1.tileHeight)),
            hasWeb ? exports.web(x + (webX / constants_1.tileWidth), y + (webY / constants_1.tileHeight)) : undefined,
            hasSpider ? exports.spider(x - 1, y + 0.3, { height: spiderHeight, time: Math.random() * 100 }) : undefined,
        ]);
    }
    return [tree, stumps, trunks, crowns];
}
exports.stashEntities = [
    exports.rose, exports.cookie, exports.cookiePony, exports.letter, exports.rope,
];
exports.placeableEntities = [
    { type: exports.cushion1.type, name: 'Cushion (red)' },
    { type: exports.cushion2.type, name: 'Cushion (blue)' },
    { type: exports.cushion3.type, name: 'Cushion (green)' },
    { type: exports.barrel.type, name: 'Barrel' },
    { type: exports.box.type, name: 'Box' },
    { type: exports.boxLanterns.type, name: 'Box of lanterns' },
    { type: exports.boxFruits.type, name: 'Box of fruits' },
    { type: exports.cookieTable2.type, name: 'Cookie table' },
    { type: exports.table1.type, name: 'Small table' },
    { type: exports.table2.type, name: 'Large table' },
    { type: exports.table3.type, name: 'Long table' },
    { type: exports.lanternOn.type, name: 'Lantern' },
    { type: exports.pumpkin.type, name: 'Pumpkin' },
    { type: exports.jackoOn.type, name: `Jack-o'-lantern (lit)` },
    { type: exports.jackoOff.type, name: `Jack-o'-lantern (unlit)` },
    { type: exports.crate1A.type, name: 'Large crate' },
    { type: exports.crate3A.type, name: 'Small crate' },
    { type: exports.crate2A.type, name: 'Lockbox' },
    { type: exports.largeLeafedBush1.type, name: 'Large plant' },
    { type: exports.largeLeafedBush3.type, name: 'Small plant' },
    { type: exports.picture1.type, name: 'Picture (1)' },
    { type: exports.picture2.type, name: 'Picture (2)' },
    { type: exports.window1.type, name: 'Window' },
    { type: exports.bookshelf.type, name: 'Bookshelf' },
    { type: exports.rock.type, name: 'Rock' },
];
exports.fruits = [
    exports.apple, exports.apple2, exports.appleGreen, exports.appleGreen2, exports.orange, exports.pear, exports.banana,
    exports.lemon, exports.lime, exports.carrotHeld, exports.mango, exports.grapesGreen[0], exports.grapesPurple[0],
];
exports.tools = [
    { type: exports.saw.type, text: 'Saw: place & remove walls' },
    { type: exports.broom.type, text: 'Broom: remove furniture' },
    { type: exports.hammer.type, text: 'Hammer: place furniture\nuse [mouse wheel] to switch item' },
    { type: exports.shovel.type, text: 'Shovel: change floor\nuse [mouse wheel] to switch floor type' },
];
exports.candies1Types = [exports.candyCane1, exports.candyCane2, exports.cookie, exports.cookiePony].map(e => e.type);
exports.candies2Types = [exports.cookie, exports.cookiePony].map(e => e.type);
if (DEVELOPMENT) {
    if (exports.pony.type !== constants_1.PONY_TYPE) {
        throw new Error(`Invalid pony type ${exports.pony.type} !== ${constants_1.PONY_TYPE}`);
    }
    for (const { type } of entities) {
        if (type === 0)
            continue;
        const entity = createAnEntity(type, 0, 0, 0, {}, ponyInfo_1.mockPaletteManager, interfaces_1.defaultWorldState);
        const name = getEntityTypeName(type);
        if (entity.colliders) {
            const maxWidth = (utils_1.hasFlag(entity.flags, 1 /* Movable */) ? 1 : 4) * constants_1.tileWidth;
            const maxHeight = (utils_1.hasFlag(entity.flags, 1 /* Movable */) ? 1 : 5) * constants_1.tileHeight;
            for (const { x, y, w, h } of entity.colliders) {
                if ((x < -maxWidth || (x + w) > maxWidth || y < -maxHeight || (y + h) > maxHeight)) {
                    throw new Error(`Invalid entity "${name}": Collider too large ${JSON.stringify({ x, y, w, h })}`);
                }
            }
        }
    }
}
//# sourceMappingURL=entities.js.map