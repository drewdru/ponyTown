"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const sprites = require("../generated/sprites");
const interfaces_1 = require("./interfaces");
const utils_1 = require("./utils");
const colors_1 = require("./colors");
const positionUtils_1 = require("./positionUtils");
const rect_1 = require("./rect");
const constants_1 = require("./constants");
const ponyInfo_1 = require("./ponyInfo");
const paletteManager_1 = require("../graphics/paletteManager");
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
let paletteManager;
function createPalette(palette) {
    return palette && paletteManager && paletteManager.addArray(palette);
}
exports.createPalette = createPalette;
function setPaletteManager(manager) {
    paletteManager = manager;
}
exports.setPaletteManager = setPaletteManager;
function fakePaletteManager(action) {
    const tempPaletteManager = paletteManager;
    paletteManager = ponyInfo_1.mockPaletteManager;
    const result = action();
    paletteManager = tempPaletteManager;
    return result;
}
exports.fakePaletteManager = fakePaletteManager;
function getBounds(sprite, ox, oy) {
    return sprite ? rect_1.rect(sprite.ox + ox, sprite.oy + oy, sprite.w, sprite.h) : rect_1.rect(0, 0, 0, 0);
}
function getRenderableBounds({ color, shadow }, dx, dy) {
    if (color && shadow) {
        return rect_1.addRects(getBounds(color, -dx, -dy), getBounds(shadow, -dx, -dy));
    }
    else if (color) {
        return getBounds(color, -dx, -dy);
    }
    else if (shadow) {
        return getBounds(shadow, -dx, -dy);
    }
    else {
        return rect_1.rect(0, 0, 0, 0);
    }
}
exports.getRenderableBounds = getRenderableBounds;
function getBoundsForFrames(frames, dx, dy) {
    return frames.reduce((bounds, f) => f ? rect_1.addRects(bounds, getBounds(f, dx, dy)) : bounds, rect_1.rect(0, 0, 0, 0));
}
function pickable(pickableX, pickableY) {
    return { pickableX, pickableY };
}
exports.pickable = pickable;
function mixPickable(pickableX, pickableY) {
    return base => {
        base.pickableX = pickableX;
        base.pickableY = pickableY;
    };
}
exports.mixPickable = mixPickable;
function mixTrigger(tileX, tileY, tileW, tileH, tall) {
    const x = positionUtils_1.toWorldX(tileX);
    const y = positionUtils_1.toWorldY(tileY);
    const w = positionUtils_1.toWorldX(tileW);
    const h = positionUtils_1.toWorldY(tileH);
    const bounds = rect_1.rect(x, y, w, h);
    return base => {
        base.triggerBounds = bounds;
        base.triggerTall = tall;
        base.triggerOn = false;
    };
}
exports.mixTrigger = mixTrigger;
function collider(x, y, w, h, tall = true, exact = false) {
    return { x, y, w, h, tall, exact };
}
exports.collider = collider;
exports.ponyColliders = roundedColliderList(-12, -4, 25, 7, 2);
exports.ponyCollidersBounds = getColliderBounds(exports.ponyColliders);
function getColliderBounds(colliders) {
    const bounds = rect_1.rect(0, 0, 0, 0);
    for (const collider of colliders) {
        rect_1.addRect(bounds, collider);
    }
    return bounds;
}
function roundedColliderList(x, y, w, h, stepsCount, tall = true) {
    const list = [];
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
function mixColliderRect(x, y, w, h, tall = true, exact = false) {
    return mixColliders(collider(x, y, w, h, tall, exact));
}
exports.mixColliderRect = mixColliderRect;
function mixColliderRounded(x, y, w, h, stepsCount, tall = true) {
    return mixColliders(...roundedColliderList(x, y, w, h, stepsCount, tall));
}
exports.mixColliderRounded = mixColliderRounded;
function mixColliders(...list) {
    const bounds = getColliderBounds(list);
    return base => {
        base.flags |= 128 /* CanCollideWith */;
        base.colliders = list;
        base.collidersBounds = bounds;
    };
}
exports.mixColliders = mixColliders;
function taperColliderSE(x, y, w, h, tall) {
    const colliders = [];
    for (let iy = 0, ix = w - 2; iy < h; iy++, ix -= ((iy % 3) ? 1 : 2)) {
        colliders.push(collider(x + ix, y + iy, w - ix, 1, tall));
    }
    return colliders;
}
exports.taperColliderSE = taperColliderSE;
function taperColliderSW(x, y, w, h, tall) {
    const colliders = [];
    for (let iy = 0, ix = w - 2; iy < h; iy++, ix -= ((iy % 3) ? 1 : 2)) {
        colliders.push(collider(x, y + iy, w - ix, 1, tall));
    }
    return colliders;
}
exports.taperColliderSW = taperColliderSW;
function taperColliderNW(x, y, w, h, tall) {
    const colliders = [];
    for (let iy = 0, ix = 2; iy < h; iy++, ix += ((iy % 3) ? 1 : 2)) {
        colliders.push(collider(x, y + iy, w - ix, 1, tall));
    }
    return colliders;
}
exports.taperColliderNW = taperColliderNW;
function taperColliderNE(x, y, w, h, tall) {
    const colliders = [];
    for (let iy = 0, ix = 2; iy < h; iy++, ix += ((iy % 3) ? 1 : 2)) {
        colliders.push(collider(x + ix, y + iy, w - ix, 1, tall));
    }
    return colliders;
}
exports.taperColliderNE = taperColliderNE;
function skewColliderNW(x, y, w, h, tall) {
    const colliders = [];
    for (let iy = 0, ix = 2; iy < h; iy++, ix += ((iy % 3) ? 1 : 2)) {
        colliders.push(collider(x - ix, y + iy, w, 1, tall));
    }
    return colliders;
}
exports.skewColliderNW = skewColliderNW;
function skewColliderNE(x, y, w, h, tall) {
    const colliders = [];
    for (let iy = 0, ix = 2; iy < h; iy++, ix += ((iy % 3) ? 1 : 2)) {
        colliders.push(collider(x + ix, y + iy, w, 1, tall));
    }
    return colliders;
}
exports.skewColliderNE = skewColliderNE;
function triangleColliderNW(x, y, w, h, tall) {
    const colliders = [];
    for (let iy = 0, ix = 2; iy < h; iy++, ix += ((iy % 3) ? 1 : 2)) {
        colliders.push(collider(x - ix, y + iy, w + ix, 1, tall));
    }
    return colliders;
}
exports.triangleColliderNW = triangleColliderNW;
function triangleColliderNE(x, y, w, h, tall) {
    const colliders = [];
    for (let iy = 0, ix = 2; iy < h; iy++, ix += ((iy % 3) ? 1 : 2)) {
        colliders.push(collider(x, y + iy, w + ix, 1, tall));
    }
    return colliders;
}
exports.triangleColliderNE = triangleColliderNE;
function mixInteract(x, y, w, h, interactRange) {
    const interactBounds = rect_1.rect(x, y, w, h);
    return base => {
        base.flags |= 256 /* Interactive */;
        base.interactBounds = interactBounds;
        base.interactRange = interactRange;
    };
}
exports.mixInteract = mixInteract;
function mixInteractAt(interactRange) {
    return base => {
        base.flags |= 256 /* Interactive */;
        base.interactRange = interactRange;
    };
}
exports.mixInteractAt = mixInteractAt;
function mixMinimap(color, rect, order = 1) {
    const minimap = { color, rect, order };
    return base => base.minimap = minimap;
}
exports.mixMinimap = mixMinimap;
function mixAnimation(anim, fps, dx, dy, { color = colors_1.WHITE, repeat = true, animations, lightSprite, useGameTime, flipped = false } = {}) {
    const bounds = getBoundsForFrames(anim.frames, -dx, -dy);
    const lightSpriteBounds = lightSprite ? getBoundsForFrames(lightSprite.frames, -dx, -dy) : rect_1.rect(0, 0, 0, 0);
    if (SERVER && !TESTS) {
        return base => base.bounds = bounds;
    }
    return base => {
        const defaultPalette = anim.shadow && createPalette(sprites.defaultPalette);
        const palette = createPalette(anim.palette);
        let time = repeat ? Math.random() * 5 : 0;
        let animation = 0;
        let lastFrame = 0;
        const getFrame = (options) => {
            let frameNumber = Math.floor(time * fps);
            if (useGameTime) {
                frameNumber = Math.floor((options.gameTime / 1000) * fps);
            }
            if (animations) {
                if (repeat) {
                    frameNumber = frameNumber % animations[animation].length;
                }
                return utils_1.at(animations[animation], frameNumber) || 0;
            }
            else {
                return repeat ? (frameNumber % anim.frames.length) : Math.min(frameNumber, anim.frames.length - 1);
            }
        };
        base.bounds = bounds;
        base.palettes = [];
        defaultPalette && base.palettes.push(defaultPalette);
        palette && base.palettes.push(palette);
        base.update = function (delta) {
            time += delta;
            const anim = interfaces_1.getAnimationFromEntityState(this.state);
            if (animations && anim !== animation) {
                animation = anim;
                time = 0;
            }
            const frameNumber = Math.floor(time * fps);
            if (lastFrame !== frameNumber) {
                lastFrame = frameNumber;
                return true;
            }
            else {
                return false;
            }
        };
        base.draw = function (batch, options) {
            const frame = getFrame(options);
            const frameSprite = anim.frames[frame];
            const x = positionUtils_1.toScreenX(this.x);
            const y = positionUtils_1.toScreenYWithZ(this.y, this.z);
            batch.save();
            batch.translate(x, y);
            if (utils_1.hasFlag(this.state, 2 /* FacingRight */) || flipped) {
                batch.scale(-1, 1);
            }
            batch.translate(-dx, -dy);
            anim.shadow && batch.drawSprite(anim.shadow, options.shadowColor, defaultPalette, 0, 0);
            frameSprite && batch.drawSprite(frameSprite, color, palette, 0, 0);
            batch.restore();
        };
        if (lightSprite) {
            base.lightSpriteColor = colors_1.WHITE;
            base.lightSpriteBounds = lightSpriteBounds;
            base.drawLightSprite = function (batch, options) {
                const frame = getFrame(options);
                const frameSprite = lightSprite.frames[frame];
                const x = positionUtils_1.toScreenX(this.x);
                const y = positionUtils_1.toScreenYWithZ(this.y, this.z);
                batch.save();
                batch.translate(x, y);
                if (utils_1.hasFlag(this.state, 2 /* FacingRight */) || flipped) {
                    batch.scale(-1, 1);
                }
                batch.translate(-dx, -dy);
                batch.drawSprite(frameSprite, this.lightSpriteColor, 0, 0);
                batch.restore();
            };
        }
    };
}
exports.mixAnimation = mixAnimation;
function mixDrawWindow(sprite, dx, dy, paletteIndex, padLeft, padTop, padRight, padBottom) {
    const bounds = getRenderableBounds(sprite, dx, dy);
    return base => {
        base.bounds = bounds;
        if (!SERVER || TESTS) {
            const defaultPalette = sprite.shadow && createPalette(sprites.defaultPalette);
            const palette = createPalette(utils_1.att(sprite.palettes, paletteIndex));
            base.palettes = [];
            defaultPalette && base.palettes.push(defaultPalette);
            palette && base.palettes.push(palette);
            base.draw = function (batch, options) {
                const baseX = positionUtils_1.toScreenX(this.x + (this.ox || 0));
                const baseY = positionUtils_1.toScreenYWithZ(this.y + (this.oy || 0), this.z + (this.oz || 0));
                const x = baseX - dx;
                const y = baseY - dy;
                if (sprite.shadow !== undefined) {
                    batch.drawSprite(sprite.shadow, options.shadowColor, defaultPalette, x, y);
                }
                if (sprite.color !== undefined) {
                    batch.drawRect(options.lightColor, x + padLeft, y + padTop, sprite.color.w - (padLeft + padRight), sprite.color.h - (padTop + padBottom));
                    batch.drawSprite(sprite.color, colors_1.WHITE, palette, x, y);
                }
            };
        }
    };
}
exports.mixDrawWindow = mixDrawWindow;
function mixDraw(sprite, dx, dy, paletteIndex = 0) {
    const bounds = getRenderableBounds(sprite, dx, dy);
    return base => {
        base.bounds = bounds;
        if (!SERVER || TESTS) {
            const defaultPalette = sprite.shadow && createPalette(sprites.defaultPalette);
            const palette = createPalette(utils_1.att(sprite.palettes, paletteIndex));
            base.palettes = [];
            defaultPalette && base.palettes.push(defaultPalette);
            palette && base.palettes.push(palette);
            base.draw = function (batch, options) {
                const x = positionUtils_1.toScreenX(this.x + (this.ox || 0)) - dx;
                const y = positionUtils_1.toScreenYWithZ(this.y + (this.oy || 0), this.z + (this.oz || 0)) - dy;
                const opacity = 1 - 0.6 * (this.coverLifting || 0);
                if (sprite.shadow !== undefined) {
                    batch.drawSprite(sprite.shadow, options.shadowColor, defaultPalette, x, y);
                }
                batch.globalAlpha = opacity;
                if (sprite.color !== undefined) {
                    batch.drawSprite(sprite.color, colors_1.WHITE, palette, x, y);
                }
                batch.globalAlpha = 1;
            };
        }
    };
}
exports.mixDraw = mixDraw;
function addBounds(bounds, setup) {
    rect_1.addRect(bounds, getRenderableBounds(setup.sprite, setup.dx, setup.dy));
}
function mixDrawSeasonal(setup) {
    const bounds = rect_1.rect(0, 0, 0, 0);
    const summer = setup.summer;
    const autumn = Object.assign({}, summer, setup.autumn);
    const winter = Object.assign({}, summer, setup.winter);
    const spring = Object.assign({}, summer, setup.spring);
    addBounds(bounds, summer);
    addBounds(bounds, autumn);
    addBounds(bounds, winter);
    addBounds(bounds, spring);
    return (base, _, worldState) => {
        base.bounds = bounds;
        if (!SERVER || TESTS) {
            let season = 1 /* Summer */;
            let { sprite, dx, dy, palette: paletteIndex } = setup.summer;
            let defaultPalette = undefined;
            let palette = undefined;
            const setupSeason = (newSeason) => {
                season = newSeason;
                let set;
                switch (season) {
                    case 1 /* Summer */:
                        set = summer;
                        break;
                    case 2 /* Autumn */:
                        set = autumn;
                        break;
                    case 4 /* Winter */:
                        set = winter;
                        break;
                    case 8 /* Spring */:
                        set = spring;
                        break;
                    default:
                        utils_1.invalidEnum(season);
                        return;
                }
                sprite = set.sprite;
                dx = set.dx;
                dy = set.dy;
                paletteIndex = set.palette;
                if (base.palettes) {
                    for (const palette of base.palettes) {
                        paletteManager_1.releasePalette(palette);
                    }
                }
                defaultPalette = sprite.shadow && createPalette(sprites.defaultPalette);
                palette = createPalette(utils_1.att(sprite.palettes, paletteIndex));
                base.palettes = [];
                defaultPalette && base.palettes.push(defaultPalette);
                palette && base.palettes.push(palette);
            };
            setupSeason(worldState.season);
            base.draw = function (batch, options) {
                const x = positionUtils_1.toScreenX(this.x + (this.ox || 0)) - dx;
                const y = positionUtils_1.toScreenYWithZ(this.y + (this.oy || 0), this.z + (this.oz || 0)) - dy;
                const opacity = 1 - 0.6 * (this.coverLifting || 0);
                if (sprite.shadow !== undefined) {
                    batch.drawSprite(sprite.shadow, options.shadowColor, defaultPalette, x, y);
                }
                batch.globalAlpha = opacity;
                if (sprite.color !== undefined) {
                    batch.drawSprite(sprite.color, colors_1.WHITE, palette, x, y);
                }
                batch.globalAlpha = 1;
                if (season !== options.season) {
                    setupSeason(options.season);
                }
            };
        }
    };
}
exports.mixDrawSeasonal = mixDrawSeasonal;
function splitSprite(sprite, x, w, h) {
    const result = [];
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
function mixDrawDirectionSign() {
    const poleDX = -4;
    const leftDX = -20;
    const rightDX = 3;
    const plateDY = 2;
    const leftRightStep = 11;
    const upDownStep = 11;
    return (base, options = {}) => {
        const { sign: { r = 0, w = [], e = [], s = [], n = [] } = {} } = options;
        const max = lodash_1.clamp(Math.max(w.length, e.length, s.length, n.length), 3, 5);
        const boundsH = 7 + max * 11;
        base.bounds = rect_1.rect(-20, -boundsH, 40, boundsH);
        base.options = options;
        if (SERVER && !TESTS)
            return;
        const { shadowUp, shadowDown, spriteUp, spriteDown, upDX, upDY, downDX, downDY, shadowUpDX, shadowUpDY, shadowDownDX, shadowDownDY, } = dirUpDown[r];
        const leftShadow = !!w.length;
        const rightShadow = !!e.length;
        const upShadow = !!n.length;
        const downShadow = !!s.length;
        const pole = poles[max - 3];
        const defaultPalette = pole.sprite.shadow && createPalette(sprites.defaultPalette);
        const palette = createPalette(utils_1.att(pole.sprite.palettes, 0));
        base.palettes = [];
        defaultPalette && base.palettes.push(defaultPalette);
        palette && base.palettes.push(palette);
        base.draw = function (batch, options) {
            const x = positionUtils_1.toScreenX(this.x);
            const y = positionUtils_1.toScreenYWithZ(this.y, this.z);
            batch.drawSprite(pole.sprite.shadow, options.shadowColor, defaultPalette, x + poleDX, y + pole.dy);
            leftShadow && batch.drawSprite(shadowLeft, options.shadowColor, defaultPalette, x - 18, y - 1);
            rightShadow && batch.drawSprite(shadowRight, options.shadowColor, defaultPalette, x + 4, y - 1);
            upShadow && batch.drawSprite(shadowUp, options.shadowColor, defaultPalette, x + shadowUpDX, y + shadowUpDY);
            downShadow && batch.drawSprite(shadowDown, options.shadowColor, defaultPalette, x + shadowDownDX, y + shadowDownDY);
            for (let i = n.length - 1; i >= 0; i--) {
                if (n[i] !== -1) {
                    batch.drawSprite(spriteUp, colors_1.WHITE, palette, x + upDX, y + pole.dy + upDY + i * upDownStep);
                }
            }
            batch.drawSprite(pole.sprite.color, colors_1.WHITE, palette, x + poleDX, y + pole.dy);
            for (let i = 0; i < w.length; i++) {
                if (w[i] !== -1) {
                    const sprite = leftSprites[w[i]];
                    sprite && batch.drawSprite(sprite, colors_1.WHITE, palette, x + leftDX, y + pole.dy + plateDY + i * leftRightStep);
                }
            }
            for (let i = 0; i < e.length; i++) {
                if (e[i] !== -1) {
                    const sprite = rightSprites[e[i]];
                    sprite && batch.drawSprite(rightSprites[e[i]], colors_1.WHITE, palette, x + rightDX, y + pole.dy + plateDY + i * leftRightStep);
                }
            }
            for (let i = s.length - 1; i >= 0; i--) {
                if (s[i] !== -1) {
                    batch.drawSprite(spriteDown, colors_1.WHITE, palette, x + downDX, y + pole.dy + downDY + i * upDownStep);
                }
            }
        };
    };
}
exports.mixDrawDirectionSign = mixDrawDirectionSign;
function mixLight(color, dx, dy, w, h) {
    return base => {
        if (!SERVER || TESTS) {
            base.lightOn = true;
            base.lightColor = color;
            base.lightScale = 1;
            base.lightTarget = 1;
            base.lightScaleAdjust = 1;
            base.lightBounds = rect_1.rect(-(dx + w / 2), -(dy + h / 2), w, h);
            base.drawLight = function (batch) {
                if (!this.lightOn)
                    return;
                const x = positionUtils_1.toScreenX(this.x);
                const y = positionUtils_1.toScreenYWithZ(this.y, this.z);
                const s = this.lightScale * this.lightScaleAdjust;
                const width = w * s;
                const height = h * s;
                const color = this.lightColor;
                batch.drawImage(color, -1, -1, 2, 2, x - (dx + width / 2), y - (dy + height / 2), width, height);
            };
        }
    };
}
exports.mixLight = mixLight;
function mixLightSprite(sprite, color, dx, dy) {
    return base => {
        if (!SERVER || TESTS) {
            base.lightSpriteOn = true;
            base.lightSpriteX = dx;
            base.lightSpriteY = dy;
            base.lightSpriteColor = color;
            base.lightSpriteBounds = getBounds(sprite, -dx, -dy);
            base.drawLightSprite = function (batch) {
                if (!this.lightSpriteOn)
                    return;
                const x = positionUtils_1.toScreenX(this.x) - this.lightSpriteX;
                const y = positionUtils_1.toScreenYWithZ(this.y, this.z) - this.lightSpriteY;
                batch.drawSprite(sprite, this.lightSpriteColor || colors_1.BLACK, x, y);
            };
        }
    };
}
exports.mixLightSprite = mixLightSprite;
function mixDrawRain() {
    const sprite = sprites.rainfall.color; // 110x477
    const bounds = rect_1.rect(positionUtils_1.toScreenX(-4), -sprite.h, positionUtils_1.toScreenX(8), sprite.h);
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
        base.draw = function (batch) {
            const x = positionUtils_1.toScreenX(this.x) + bounds.x;
            const y = positionUtils_1.toScreenYWithZ(this.y, this.z) - sprite.h + Math.floor(time);
            batch.drawImage(sprite.type, colors_1.RED, palette, sprite.x, sprite.y, sprite.w, sprite.h, x, y, sprite.w, sprite.h);
        };
    };
}
exports.mixDrawRain = mixDrawRain;
function mixDrawShadow(sprite, dx, dy, shadowColor) {
    const bounds = getRenderableBounds(sprite, dx, dy);
    return base => {
        base.bounds = bounds;
        if (!SERVER || TESTS) {
            const defaultPalette = createPalette(sprites.defaultPalette);
            base.palettes = [defaultPalette];
            base.draw = function (batch, options) {
                const x = positionUtils_1.toScreenX(this.x + (this.ox || 0)) - dx;
                const y = positionUtils_1.toScreenYWithZ(this.y + (this.oy || 0), this.z) - dy;
                const color = shadowColor === undefined ? options.shadowColor : shadowColor;
                sprite.shadow && batch.drawSprite(sprite.shadow, color, defaultPalette, x, y);
            };
        }
    };
}
exports.mixDrawShadow = mixDrawShadow;
function mixBobbing(bobsFps, bobs) {
    return base => {
        base.flags |= 2048 /* Bobbing */;
        base.bobsFps = bobsFps;
        base.bobs = bobs;
    };
}
exports.mixBobbing = mixBobbing;
let fullWalls = true;
function toggleWalls() {
    fullWalls = !fullWalls;
}
exports.toggleWalls = toggleWalls;
function mixDrawWall(full, half, dx, dy, dy2) {
    const fullBounds = getRenderableBounds(full, dx, dy);
    // const halfBounds = getRenderableBounds(half, dx, dy2);
    return base => {
        base.bounds = fullBounds; // fullWalls ? fullBounds : halfBounds
        if (SERVER && !TESTS)
            return;
        const fullPalette = createPalette(utils_1.att(full.palettes, 0));
        const halfPalette = createPalette(utils_1.att(half.palettes, 0));
        base.palettes = [];
        fullPalette && base.palettes.push(fullPalette);
        halfPalette && base.palettes.push(halfPalette);
        base.draw = function (batch) {
            const sprite = fullWalls ? full : half;
            const palette = fullWalls ? fullPalette : halfPalette;
            const x = positionUtils_1.toScreenX(this.x) - dx;
            const y = positionUtils_1.toScreenYWithZ(this.y, this.z) - (fullWalls ? dy : dy2);
            sprite.color && batch.drawSprite(sprite.color, colors_1.WHITE, palette, x, y);
        };
    };
}
exports.mixDrawWall = mixDrawWall;
function mixDrawSpider(sprite, dx, dy) {
    const heightOffset = 30;
    const spriteColor = sprite.color;
    const baseBounds = getRenderableBounds(sprite, dx, dy);
    if (!spriteColor)
        throw new Error('Missing sprite');
    return base => {
        const { height, time } = base.options;
        const bounds = Object.assign({}, baseBounds);
        bounds.y -= (height + heightOffset);
        bounds.h += height;
        base.bounds = bounds;
        if (SERVER && !TESTS)
            return;
        const palette = createPalette(sprite.palettes && sprite.palettes[0]);
        base.palettes = [palette];
        base.draw = function (batch, options) {
            const t = options.gameTime / constants_1.SECOND - time;
            const h = lodash_1.clamp(Math.sin(t / 4) * 4, 0, 1) * height;
            if (h < height) {
                const lineLength = height - h - 4;
                const x = positionUtils_1.toScreenX(this.x) - dx;
                const y = positionUtils_1.toScreenYWithZ(this.y, this.z) - dy - heightOffset - h;
                batch.drawRect(0x181818ff, x + 2, y - lineLength, 1, lineLength + 1);
                batch.drawSprite(spriteColor, colors_1.WHITE, palette, x, y);
            }
        };
    };
}
exports.mixDrawSpider = mixDrawSpider;
//# sourceMappingURL=mixins.js.map