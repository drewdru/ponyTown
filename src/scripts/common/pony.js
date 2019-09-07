"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ponyUtils_1 = require("../client/ponyUtils");
const ponyAnimations_1 = require("../client/ponyAnimations");
const interfaces_1 = require("./interfaces");
const utils_1 = require("./utils");
const constants_1 = require("./constants");
const ponyInfo_1 = require("./ponyInfo");
const entities_1 = require("./entities");
const animationPlayer_1 = require("./animationPlayer");
const colors_1 = require("./colors");
const expressionEncoder_1 = require("./encoders/expressionEncoder");
const positionUtils_1 = require("./positionUtils");
const ponyDraw_1 = require("../client/ponyDraw");
const entityUtils_1 = require("./entityUtils");
const animator_1 = require("./animator");
const ponyStates_1 = require("../client/ponyStates");
const compressPony_1 = require("./compressPony");
const ponyHelpers_1 = require("../client/ponyHelpers");
const spriteAnimations_1 = require("../client/spriteAnimations");
const rect_1 = require("./rect");
const worldMap_1 = require("./worldMap");
const draw_1 = require("../client/draw");
const mixins_1 = require("./mixins");
const handlers_1 = require("../client/handlers");
const sprites = require("../generated/sprites");
const color_1 = require("./color");
const flyY = 15;
const lightExtentX = 100;
const lightExtentY = 70;
const emptyBounds = rect_1.rect(0, 0, 0, 0);
const bounds = rect_1.rect(-ponyUtils_1.PONY_WIDTH / 2, -ponyUtils_1.PONY_HEIGHT, ponyUtils_1.PONY_WIDTH, ponyUtils_1.PONY_HEIGHT + 5);
const boundsFly = rect_1.rect(bounds.x, bounds.y - flyY, bounds.w, bounds.h + flyY);
const lightBounds = makeLightBounds(bounds);
const lightBoundsFly = makeLightBounds(boundsFly);
const interactBounds = rect_1.rect(-20, -50, 40, 50);
const interactBoundsFly = rect_1.rect(interactBounds.x, interactBounds.y - flyY, interactBounds.w, interactBounds.h);
const defaultExpr = expressionEncoder_1.encodeExpression(undefined);
function createPony(id, state, info, defaultPalette, paletteManager) {
    const pony = {
        id,
        state,
        playerState: 0 /* None */,
        type: constants_1.PONY_TYPE,
        flags: 1 /* Movable */ | 64 /* CanCollide */ | 256 /* Interactive */,
        expr: defaultExpr,
        ponyState: ponyHelpers_1.defaultPonyState(),
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        info,
        order: 0,
        timestamp: 0,
        colliders: mixins_1.ponyColliders,
        collidersBounds: mixins_1.ponyCollidersBounds,
        selected: false,
        extra: false,
        toy: 0,
        swimming: false,
        ex: false,
        inTheAirDelay: 0,
        name: undefined,
        tag: undefined,
        site: undefined,
        modInfo: undefined,
        hold: 0,
        palettePonyInfo: undefined,
        headAnimation: undefined,
        batch: undefined,
        discardBatch: false,
        headTime: Math.random() * 5,
        blinkTime: 0,
        nextBlink: Math.random() * 5,
        currentExpression: defaultExpr,
        drawingOptions: Object.assign({}, ponyHelpers_1.defaultDrawPonyOptions(), { shadow: true, bounce: BETA }),
        zzzEffect: animationPlayer_1.createAnimationPlayer(defaultPalette),
        cryEffect: animationPlayer_1.createAnimationPlayer(defaultPalette),
        sneezeEffect: animationPlayer_1.createAnimationPlayer(defaultPalette),
        holdPoofEffect: animationPlayer_1.createAnimationPlayer(defaultPalette),
        heartsEffect: animationPlayer_1.createAnimationPlayer(defaultPalette),
        magicEffect: animationPlayer_1.createAnimationPlayer(paletteManager.addArray(sprites.magic2.palette)),
        animator: animator_1.createAnimator(),
        lastX: 0,
        lastY: 0,
        lastRight: false,
        lastState: ponyHelpers_1.defaultPonyState(),
        initialized: false,
        doAction: 0 /* None */,
        bounds: bounds,
        interactBounds: interactBounds,
        chatBounds: interactBounds,
        lightBounds: emptyBounds,
        lightSpriteBounds: emptyBounds,
        paletteManager,
        lastBoopSplash: 0,
        magicColor: 0,
    };
    pony.ponyState.drawFaceExtra = batch => drawFaceExtra(batch, pony);
    return pony;
}
exports.createPony = createPony;
function isPony(entity) {
    return entity.type === constants_1.PONY_TYPE;
}
exports.isPony = isPony;
function isPonyOnTheGround(pony) {
    return !entityUtils_1.isPonyFlying(pony) && !ponyStates_1.isFlyingUpOrDown(pony.animator.state);
}
exports.isPonyOnTheGround = isPonyOnTheGround;
function getPaletteInfo(pony) {
    return ensurePonyInfoDecoded(pony);
}
exports.getPaletteInfo = getPaletteInfo;
function releasePony(pony) {
    if (pony.ponyState.holding) {
        entityUtils_1.releaseEntity(pony.ponyState.holding);
    }
    releasePalettePonyInfo(pony);
}
exports.releasePony = releasePony;
function canPonyFly(pony) {
    return !!pony.palettePonyInfo && ponyUtils_1.canFly(pony.palettePonyInfo);
}
exports.canPonyFly = canPonyFly;
function canPonyLie(pony, map) {
    return !entityUtils_1.isPonyLying(pony) && (entityUtils_1.isIdle(pony) || ponyStates_1.isSittingDown(pony.animator.state) || ponyStates_1.isFlyingDown(pony.animator.state)) &&
        entityUtils_1.isPonyLandedOrCanLand(pony, map);
}
exports.canPonyLie = canPonyLie;
function canPonySit(pony, map) {
    return !entityUtils_1.isPonySitting(pony) && (entityUtils_1.isIdle(pony) || ponyStates_1.isFlyingDown(pony.animator.state)) &&
        entityUtils_1.isPonyLandedOrCanLand(pony, map);
}
exports.canPonySit = canPonySit;
function canPonyStand(pony, map) {
    return !entityUtils_1.isPonyStanding(pony) && (entityUtils_1.isIdleAnimation(pony.ponyState.animation) || ponyStates_1.isSittingUp(pony.animator.state)) &&
        entityUtils_1.isPonyLandedOrCanLand(pony, map);
}
exports.canPonyStand = canPonyStand;
function canPonyFlyUp(pony) {
    return !entityUtils_1.isPonyFlying(pony) && canPonyFly(pony) && !ponyStates_1.isFlyingUpOrDown(pony.animator.state);
}
exports.canPonyFlyUp = canPonyFlyUp;
function getPonyChatHeight(pony) {
    const baseHeight = 2;
    const state = pony.ponyState;
    if (pony.animator.state === ponyStates_1.trotting) {
        return baseHeight;
    }
    else if (pony.animator.state === ponyStates_1.flying || pony.animator.state === ponyStates_1.hovering) {
        return baseHeight - 16;
    }
    else {
        const frame = ponyDraw_1.getPonyAnimationFrame(state.animation, state.animationFrame, ponyAnimations_1.defaultBodyFrame);
        const animation = state.headAnimation || ponyAnimations_1.defaultHeadAnimation;
        const headFrame = ponyDraw_1.getPonyAnimationFrame(animation, state.headAnimationFrame, ponyAnimations_1.defaultHeadFrame);
        return baseHeight + ponyDraw_1.getHeadY(frame, headFrame);
    }
}
exports.getPonyChatHeight = getPonyChatHeight;
function updatePonyInfo(pony, info, apply) {
    pony.info = info;
    if (pony.palettePonyInfo !== undefined) {
        releasePalettePonyInfo(pony);
        ensurePonyInfoDecoded(pony);
        pony.discardBatch = true;
        if (entityUtils_1.isPonyFlying(pony) && !canPonyFly(pony)) {
            DEVELOPMENT && console.warn('Force land');
            pony.state = utils_1.setFlag(pony.state, 80 /* PonyFlying */, false);
            animator_1.resetAnimatorState(pony.animator);
        }
        apply();
    }
}
exports.updatePonyInfo = updatePonyInfo;
function ensurePonyInfoDecoded(pony) {
    if (pony.info !== undefined && pony.palettePonyInfo === undefined) {
        pony.palettePonyInfo = compressPony_1.decodePonyInfo(pony.info, pony.paletteManager);
        const wingType = pony.palettePonyInfo.wings && pony.palettePonyInfo.wings.type || 0;
        pony.animator.variant = wingType === 4 ? 'bug' : '';
        pony.ponyState.blushColor = colors_1.blushColor(pony.palettePonyInfo.coatPalette.colors[1]);
        pony.magicColor = color_1.withAlpha(pony.palettePonyInfo.magicColorValue, colors_1.MAGIC_ALPHA);
    }
    return pony.palettePonyInfo;
}
exports.ensurePonyInfoDecoded = ensurePonyInfoDecoded;
function invalidatePalettesForPony(pony) {
    pony.discardBatch = true;
}
exports.invalidatePalettesForPony = invalidatePalettesForPony;
function doBoopPonyAction(game, pony) {
    doPonyAction(pony, 1 /* Boop */);
    if (pony.swimming && pony.lastBoopSplash < performance.now()) {
        if (entityUtils_1.isFacingRight(pony)) {
            handlers_1.playEffect(game, pony, entities_1.boopSplashRight.type);
        }
        else {
            handlers_1.playEffect(game, pony, entities_1.boopSplashLeft.type);
        }
        pony.lastBoopSplash = performance.now() + 800;
    }
}
exports.doBoopPonyAction = doBoopPonyAction;
function doPonyAction(pony, action) {
    pony.doAction = action;
}
exports.doPonyAction = doPonyAction;
function setPonyExpression(pony, expr) {
    pony.expr = expr;
}
exports.setPonyExpression = setPonyExpression;
function hasExtendedInfo(pony) {
    return pony.ex;
}
exports.hasExtendedInfo = hasExtendedInfo;
function hasHeadAnimation(pony) {
    return pony.headAnimation !== undefined;
}
exports.hasHeadAnimation = hasHeadAnimation;
function setHeadAnimation(pony, headAnimation) {
    if (pony.headAnimation !== headAnimation) {
        pony.headTime = 0;
        pony.headAnimation = headAnimation;
    }
}
exports.setHeadAnimation = setHeadAnimation;
function drawPonyEntity(batch, pony, drawOptions) {
    if (pony.discardBatch && pony.batch !== undefined) {
        batch.releaseBatch(pony.batch);
        pony.batch = undefined;
        pony.discardBatch = false;
    }
    if (pony.batch !== undefined) {
        batch.drawBatch(pony.batch);
    }
    else if (pony.palettePonyInfo !== undefined) {
        let swimming = false;
        if (ponyStates_1.isSwimmingState(pony.animator.state)) {
            if (pony.animator.state === ponyStates_1.swimmingToFlying) {
                swimming = pony.animator.time < 0.4;
            }
            else {
                swimming = true;
            }
        }
        const createBatch = pony.vx === 0 && pony.vy === 0 && !swimming;
        const right = entityUtils_1.isFacingRight(pony);
        if (createBatch) {
            batch.startBatch();
        }
        batch.save();
        transformBatch(batch, pony);
        const options = pony.drawingOptions;
        options.flipped = right;
        options.selected = pony.selected === true;
        options.extra = pony.extra;
        options.toy = pony.toy;
        options.swimming = swimming;
        options.shadow = !pony.swimming;
        options.gameTime = drawOptions.gameTime + pony.id * 0.1;
        options.shadowColor = drawOptions.shadowColor;
        const ponyState = pony.ponyState;
        ponyDraw_1.drawPony(batch, pony.palettePonyInfo, ponyState, 0, 0, options);
        if (animationPlayer_1.isAnimationPlaying(pony.zzzEffect) || animationPlayer_1.isAnimationPlaying(pony.sneezeEffect) ||
            animationPlayer_1.isAnimationPlaying(pony.holdPoofEffect) || animationPlayer_1.isAnimationPlaying(pony.heartsEffect) ||
            animationPlayer_1.isAnimationPlaying(pony.magicEffect)) {
            const { x, y } = ponyDraw_1.getPonyHeadPosition(pony.ponyState, 0, 0);
            const right = entityUtils_1.isFacingRight(pony);
            const flip = right ? !ponyState.headTurned : ponyState.headTurned;
            batch.multiplyTransform(ponyDraw_1.createHeadTransform(undefined, x, y, ponyState));
            animationPlayer_1.drawAnimation(batch, pony.zzzEffect, 0, 0, colors_1.WHITE, flip);
            animationPlayer_1.drawAnimation(batch, pony.sneezeEffect, 0, 0, colors_1.WHITE, flip);
            animationPlayer_1.drawAnimation(batch, pony.holdPoofEffect, 0, 0, colors_1.WHITE, flip);
            animationPlayer_1.drawAnimation(batch, pony.heartsEffect, 0, 0, colors_1.HEARTS_COLOR, flip);
            if (pony.magicEffect.currentAnimation !== undefined) {
                animationPlayer_1.drawAnimation(batch, pony.magicEffect, 0, 0, pony.magicColor, flip);
                const sprite = sprites.magic3.frames[pony.magicEffect.frame];
                sprite && batch.drawSprite(sprite, colors_1.WHITE, pony.heartsEffect.palette, 0, 0);
            }
        }
        batch.restore();
        if (createBatch) {
            pony.batch = batch.finishBatch();
            pony.lastX = positionUtils_1.toScreenX(pony.x);
            pony.lastY = positionUtils_1.toScreenYWithZ(pony.y, pony.z);
            pony.lastRight = right;
            pony.zzzEffect.dirty = false;
            pony.cryEffect.dirty = false;
            pony.sneezeEffect.dirty = false;
            pony.holdPoofEffect.dirty = false;
            pony.heartsEffect.dirty = false;
            pony.magicEffect.dirty = false;
            Object.assign(pony.lastState, ponyState);
        }
    }
}
exports.drawPonyEntity = drawPonyEntity;
const magickLightSizes = [
    0, 1.02,
    0.97, 0.94, 0.91, 0.94, 0.97, 1.00,
    0.97, 0.94, 0.91,
];
function drawPonyEntityLight(batch, pony, options) {
    const ponyState = pony.ponyState;
    const holding = ponyState.holding;
    const drawHolding = holding !== undefined && holding.drawLight !== undefined;
    const drawMagic = pony.magicEffect.currentAnimation !== undefined;
    const draw = drawHolding || drawMagic;
    if (draw) {
        batch.save();
        transformBatch(batch, pony);
        const { x, y } = ponyDraw_1.getPonyHeadPosition(ponyState, 0, 0);
        batch.multiplyTransform(ponyDraw_1.createHeadTransform(undefined, x, y, ponyState));
        if (drawHolding) {
            holding.x = positionUtils_1.toWorldX(holding.pickableX);
            holding.y = positionUtils_1.toWorldY(holding.pickableY);
            holding.drawLight(batch, options);
        }
        if (drawMagic) {
            const size = 200 * (magickLightSizes[pony.magicEffect.frame] || 0);
            batch.drawImage(colors_1.WHITE, -1, -1, 2, 2, 30 - size / 2, 27 - size / 2, size, size);
        }
        batch.restore();
    }
}
exports.drawPonyEntityLight = drawPonyEntityLight;
function drawPonyEntityLightSprite(batch, pony, options) {
    const ponyState = pony.ponyState;
    const holding = ponyState.holding;
    const drawHolding = holding !== undefined && holding.drawLightSprite !== undefined;
    // const drawMagic = pony.magicEffect.currentAnimation !== undefined;
    const draw = drawHolding; // || drawMagic;
    if (draw) {
        batch.save();
        transformBatch(batch, pony);
        const { x, y } = ponyDraw_1.getPonyHeadPosition(ponyState, 0, 0);
        batch.multiplyTransform(ponyDraw_1.createHeadTransform(undefined, x, y, ponyState));
        if (drawHolding) {
            holding.x = positionUtils_1.toWorldX(holding.pickableX);
            holding.y = positionUtils_1.toWorldY(holding.pickableY);
            holding.drawLightSprite(batch, options);
        }
        // if (drawMagic) {
        // 	const frame = pony.magicEffect.frame;
        // 	const sprite = sprites.magic2_light.frames[frame];
        // 	batch.drawSprite(sprite, WHITE, 0, 0);
        // }
        batch.restore();
    }
}
exports.drawPonyEntityLightSprite = drawPonyEntityLightSprite;
function flagsToState(state, moving, isSwimming) {
    const ponyState = state & 240 /* PonyStateMask */;
    if (isSwimming) {
        return ponyStates_1.swimming;
    }
    else if (moving) {
        if (ponyState === 80 /* PonyFlying */) {
            return ponyStates_1.flying;
        }
        else {
            return ponyStates_1.trotting;
        }
    }
    else {
        switch (ponyState) {
            case 0 /* PonyStanding */: return ponyStates_1.standing;
            case 16 /* PonyWalking */: return ponyStates_1.trotting;
            case 32 /* PonyTrotting */: return ponyStates_1.trotting;
            case 48 /* PonySitting */: return ponyStates_1.sitting;
            case 64 /* PonyLying */: return ponyStates_1.lying;
            case 80 /* PonyFlying */: return ponyStates_1.hovering;
            default:
                throw new Error(`Invalid pony state (${ponyState})`);
        }
    }
}
exports.flagsToState = flagsToState;
function updatePonyEntity(pony, delta, gameTime, safe) {
    // update state
    const state = pony.ponyState;
    const walking = pony.vx !== 0 || pony.vy !== 0;
    const animationState = flagsToState(pony.state, walking, pony.swimming);
    if (pony.inTheAirDelay > 0) {
        pony.inTheAirDelay -= delta;
    }
    if (pony.doAction !== 0 /* None */) {
        switch (pony.doAction) {
            case 1 /* Boop */:
                animator_1.setAnimatorState(pony.animator, ponyStates_1.toBoopState(animationState) || animationState);
                break;
            case 2 /* Swing */:
                animator_1.setAnimatorState(pony.animator, ponyStates_1.swinging);
                break;
            case 3 /* HoldPoof */:
                animationPlayer_1.playAnimation(pony.holdPoofEffect, spriteAnimations_1.holdPoofAnimation);
                break;
            default:
                if (DEVELOPMENT) {
                    console.error(`Invalid DoAction: ${pony.doAction}`);
                }
        }
        pony.doAction = 0 /* None */;
    }
    else {
        animator_1.setAnimatorState(pony.animator, animationState);
    }
    // head
    pony.headTime += delta;
    if (pony.headAnimation !== undefined) {
        const frame = Math.floor(pony.headTime * pony.headAnimation.fps);
        if (frame >= pony.headAnimation.frames.length && !pony.headAnimation.loop) {
            pony.headAnimation = undefined;
            state.headAnimationFrame = 0;
        }
        else {
            state.headAnimationFrame = frame % pony.headAnimation.frames.length;
        }
    }
    if (state.headAnimation !== pony.headAnimation) {
        state.headAnimation = pony.headAnimation;
        if (pony.headAnimation === ponyAnimations_1.sneeze) {
            animationPlayer_1.playAnimation(pony.sneezeEffect, spriteAnimations_1.sneezeAnimation);
        }
    }
    // effects / expressions
    if (pony.currentExpression !== pony.expr) {
        updatePonyExpression(pony, pony.expr, safe);
    }
    if ((pony.state & 8 /* Magic */) !== 0) {
        animationPlayer_1.playAnimation(pony.magicEffect, spriteAnimations_1.magicAnimation);
    }
    else {
        animationPlayer_1.playAnimation(pony.magicEffect, undefined);
    }
    animationPlayer_1.updateAnimation(pony.zzzEffect, delta);
    animationPlayer_1.updateAnimation(pony.cryEffect, delta);
    animationPlayer_1.updateAnimation(pony.sneezeEffect, delta);
    animationPlayer_1.updateAnimation(pony.holdPoofEffect, delta);
    animationPlayer_1.updateAnimation(pony.heartsEffect, delta);
    animationPlayer_1.updateAnimation(pony.magicEffect, delta);
    // holding
    const holdingUpdated = state.holding !== undefined &&
        state.holding.update !== undefined &&
        state.holding.update(delta, gameTime);
    // blink
    pony.blinkTime += delta;
    if ((pony.blinkTime - pony.nextBlink) > 1) {
        pony.nextBlink = pony.blinkTime + Math.random() * 2 + 3;
    }
    // update animator
    animator_1.updateAnimator(pony.animator, delta);
    // update state
    const blinkFrame = Math.floor((pony.blinkTime - pony.nextBlink) * constants_1.blinkFps);
    state.blinkFrame = blinkFrame < ponyUtils_1.BLINK_FRAMES.length ? ponyUtils_1.BLINK_FRAMES[blinkFrame] : 1;
    state.headTurned = (pony.state & 4 /* HeadTurned */) !== 0;
    state.animation = animator_1.getAnimation(pony.animator) || ponyAnimations_1.stand;
    state.animationFrame = animator_1.getAnimationFrame(pony.animator);
    // randomize animator time at startup
    if (!pony.initialized) {
        pony.initialized = true;
        animator_1.updateAnimator(pony.animator, Math.random() * 2);
    }
    // discard batch if outdated
    if (pony.batch !== undefined) {
        const options = pony.drawingOptions;
        const right = entityUtils_1.isFacingRight(pony);
        if (holdingUpdated ||
            positionUtils_1.toScreenX(pony.x) !== pony.lastX || positionUtils_1.toScreenYWithZ(pony.y, pony.z) !== pony.lastY ||
            pony.lastRight !== right ||
            pony.zzzEffect.dirty || pony.cryEffect.dirty || pony.sneezeEffect.dirty || pony.holdPoofEffect.dirty ||
            pony.heartsEffect.dirty || pony.magicEffect.dirty ||
            options.flipped !== right || options.selected !== pony.selected || options.extra !== pony.extra ||
            options.toy !== pony.toy ||
            !ponyHelpers_1.isStateEqual(pony.lastState, state)) {
            pony.discardBatch = true;
        }
    }
    // update bounds
    const flying = entityUtils_1.isPonyFlying(pony);
    const flyingUpOrDown = ponyStates_1.isFlyingUpOrDown(pony.animator.state);
    const flyingOrFlyingUpOrDown = flying || flyingUpOrDown;
    pony.bounds = flyingOrFlyingUpOrDown ? boundsFly : bounds;
    pony.interactBounds = flying ? interactBoundsFly : interactBounds;
    pony.lightBounds = flyingOrFlyingUpOrDown ? lightBoundsFly : lightBounds;
    pony.lightSpriteBounds = flyingOrFlyingUpOrDown ? lightBoundsFly : lightBounds;
}
exports.updatePonyEntity = updatePonyEntity;
function updatePonyHold(pony, game) {
    const ponyState = pony.ponyState;
    const hadLight = draw_1.hasDrawLight(pony);
    const hadLightSprite = draw_1.hasLightSprite(pony);
    if (pony.hold !== 0) {
        if (ponyState.holding === undefined) {
            ponyState.holding = entities_1.createAnEntity(pony.hold, 0, 0, 0, {}, pony.paletteManager, game);
        }
        else if (ponyState.holding.type !== pony.hold) {
            entityUtils_1.releaseEntity(ponyState.holding);
            ponyState.holding = entities_1.createAnEntity(pony.hold, 0, 0, 0, {}, pony.paletteManager, game);
        }
    }
    else if (ponyState.holding !== undefined) {
        entityUtils_1.releaseEntity(ponyState.holding);
        ponyState.holding = undefined;
    }
    const hasLight = draw_1.hasDrawLight(pony);
    const hasLightSprite1 = draw_1.hasLightSprite(pony);
    worldMap_1.addOrRemoveFromEntityList(game.map.entitiesLight, pony, hadLight, hasLight);
    worldMap_1.addOrRemoveFromEntityList(game.map.entitiesLightSprite, pony, hadLightSprite, hasLightSprite1);
}
exports.updatePonyHold = updatePonyHold;
function filterExpression(expression) {
    const extra = expression.extra;
    const blush = utils_1.hasFlag(extra, 1 /* Blush */);
    if (blush ||
        utils_1.hasFlag(extra, 16 /* Hearts */) ||
        utils_1.hasFlag(extra, 4 /* Cry */) ||
        interfaces_1.isEyeSleeping(expression.left) ||
        interfaces_1.isEyeSleeping(expression.right)) {
        if (expression.muzzle === 22 /* SmilePant */ || expression.muzzle === 23 /* NeutralPant */) {
            expression.muzzle = 2 /* Neutral */;
        }
    }
    if (blush ||
        expression.muzzle === 22 /* SmilePant */ ||
        expression.muzzle === 23 /* NeutralPant */) {
        if (expression.leftIris === 1 /* Up */ || expression.rightIris === 1 /* Up */) {
            expression.leftIris = 0 /* Forward */;
            expression.rightIris = 0 /* Forward */;
        }
        if (expression.muzzle === 22 /* SmilePant */) {
            expression.muzzle = 5 /* SmileOpen */;
        }
        else if (expression.muzzle === 23 /* NeutralPant */) {
            expression.muzzle = 11 /* NeutralOpen2 */;
        }
    }
    if (blush) {
        if (expression.muzzle === 9 /* SmileOpen2 */) {
            expression.muzzle = 5 /* SmileOpen */;
        }
        else if (expression.muzzle === 10 /* FrownOpen */) {
            expression.muzzle = 8 /* ConcernedOpen */;
        }
        else if (expression.muzzle === 11 /* NeutralOpen2 */) {
            expression.muzzle = 24 /* Oh */;
        }
    }
}
function updatePonyExpression(pony, expr, safe) {
    const expression = expressionEncoder_1.decodeExpression(expr);
    pony.currentExpression = pony.expr;
    pony.ponyState.expression = expression;
    if (expression && safe) {
        filterExpression(expression);
    }
    const extra = (expression && expression.extra) || 0;
    if (utils_1.hasFlag(extra, 4 /* Cry */)) {
        animationPlayer_1.playAnimation(pony.cryEffect, spriteAnimations_1.cryAnimation);
    }
    else if (utils_1.hasFlag(extra, 8 /* Tears */)) {
        animationPlayer_1.playAnimation(pony.cryEffect, spriteAnimations_1.tearsAnimation);
    }
    else {
        animationPlayer_1.playAnimation(pony.cryEffect, undefined);
    }
    if (utils_1.hasFlag(extra, 2 /* Zzz */)) {
        animationPlayer_1.playOneOfAnimations(pony.zzzEffect, spriteAnimations_1.zzzAnimations);
    }
    else {
        animationPlayer_1.playAnimation(pony.zzzEffect, undefined);
    }
    if (utils_1.hasFlag(extra, 16 /* Hearts */)) {
        animationPlayer_1.playAnimation(pony.heartsEffect, spriteAnimations_1.heartsAnimation);
    }
    else {
        animationPlayer_1.playAnimation(pony.heartsEffect, undefined);
    }
}
function transformBatch(batch, entity) {
    batch.translate(positionUtils_1.toScreenX(entity.x), positionUtils_1.toScreenYWithZ(entity.y, entity.z));
    batch.scale(entityUtils_1.isFacingRight(entity) ? -1 : 1, 1);
}
function releasePalettePonyInfo(pony) {
    if (pony.palettePonyInfo !== undefined) {
        ponyInfo_1.releasePalettes(pony.palettePonyInfo);
        pony.palettePonyInfo = undefined;
    }
}
function makeLightBounds({ x, y, w, h }) {
    return rect_1.rect(x - lightExtentX, y - lightExtentY, w + lightExtentX * 2, h + lightExtentY * 2);
}
function drawFaceExtra(batch, pony) {
    if (animationPlayer_1.isAnimationPlaying(pony.cryEffect)) {
        const flip = entityUtils_1.isFacingRight(pony) ? !pony.ponyState.headTurned : pony.ponyState.headTurned;
        const maxY = entityUtils_1.isPonyLying(pony) ? 62 : (entityUtils_1.isPonySitting(pony) ? 65 : 0);
        animationPlayer_1.drawAnimation(batch, pony.cryEffect, 0, 0, colors_1.WHITE, flip, maxY);
    }
}
//# sourceMappingURL=pony.js.map