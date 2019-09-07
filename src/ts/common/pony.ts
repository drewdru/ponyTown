import { PONY_WIDTH, PONY_HEIGHT, BLINK_FRAMES, canFly } from '../client/ponyUtils';
import { stand, sneeze, defaultHeadAnimation, defaultBodyFrame, defaultHeadFrame } from '../client/ponyAnimations';
import {
	PaletteSpriteBatch, Pony, BodyAnimation, EntityState, SpriteBatch, ExpressionExtra, HeadAnimation, Palette,
	PaletteManager, DrawOptions, Rect, EntityFlags, IMap, Entity, DoAction, Muzzle, Expression, isEyeSleeping,
	Iris, EntityPlayerState,
} from './interfaces';
import { hasFlag, setFlag } from './utils';
import { blinkFps, PONY_TYPE } from './constants';
import { releasePalettes } from './ponyInfo';
import { createAnEntity, boopSplashRight, boopSplashLeft } from './entities';
import {
	createAnimationPlayer, isAnimationPlaying, drawAnimation, playAnimation, updateAnimation, playOneOfAnimations
} from './animationPlayer';
import { blushColor, WHITE, MAGIC_ALPHA, HEARTS_COLOR } from './colors';
import { encodeExpression, decodeExpression } from './encoders/expressionEncoder';
import { toScreenX, toWorldX, toWorldY, toScreenYWithZ } from './positionUtils';
import { getPonyAnimationFrame, getHeadY, drawPony, getPonyHeadPosition, createHeadTransform } from '../client/ponyDraw';
import {
	isPonySitting, isPonyFlying, isPonyLying, isPonyStanding, isPonyLandedOrCanLand, isIdle, isIdleAnimation,
	isFacingRight, releaseEntity
} from './entityUtils';
import {
	getAnimation, getAnimationFrame, setAnimatorState, updateAnimator, createAnimator, AnimatorState,
	resetAnimatorState
} from './animator';
import {
	trotting, flying, hovering, toBoopState, isFlyingUpOrDown, isFlyingDown, isSittingDown, isSittingUp, swinging,
	standing, sitting, lying, swimming, isSwimmingState, swimmingToFlying,
} from '../client/ponyStates';
import { decodePonyInfo } from './compressPony';
import { defaultPonyState, defaultDrawPonyOptions, isStateEqual } from '../client/ponyHelpers';
import {
	sneezeAnimation, holdPoofAnimation, heartsAnimation, tearsAnimation, cryAnimation, zzzAnimations, magicAnimation
} from '../client/spriteAnimations';
import { rect } from './rect';
import { addOrRemoveFromEntityList } from './worldMap';
import { hasDrawLight, hasLightSprite } from '../client/draw';
import { ponyColliders, ponyCollidersBounds } from './mixins';
import { PonyTownGame } from '../client/game';
import { playEffect } from '../client/handlers';
import * as sprites from '../generated/sprites';
import { withAlpha } from './color';

const flyY = 15;
const lightExtentX = 100;
const lightExtentY = 70;
const emptyBounds = rect(0, 0, 0, 0);
const bounds = rect(-PONY_WIDTH / 2, -PONY_HEIGHT, PONY_WIDTH, PONY_HEIGHT + 5);
const boundsFly = rect(bounds.x, bounds.y - flyY, bounds.w, bounds.h + flyY);
const lightBounds = makeLightBounds(bounds);
const lightBoundsFly = makeLightBounds(boundsFly);
const interactBounds = rect(-20, -50, 40, 50);
const interactBoundsFly = rect(interactBounds.x, interactBounds.y - flyY, interactBounds.w, interactBounds.h);
const defaultExpr = encodeExpression(undefined);

export function createPony(
	id: number, state: EntityState, info: string | Uint8Array | undefined, defaultPalette: Palette,
	paletteManager: PaletteManager
): Pony {
	const pony: Pony = {
		id,
		state,
		playerState: EntityPlayerState.None,
		type: PONY_TYPE,
		flags: EntityFlags.Movable | EntityFlags.CanCollide | EntityFlags.Interactive,
		expr: defaultExpr,
		ponyState: defaultPonyState(),
		x: 0,
		y: 0,
		z: 0,
		vx: 0,
		vy: 0,
		info,
		order: 0,
		timestamp: 0,
		colliders: ponyColliders,
		collidersBounds: ponyCollidersBounds,
		selected: false,
		extra: false,
		toy: 0,
		swimming: false,
		ex: false, // extended data indicator, sent in extended option
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
		drawingOptions: { ...defaultDrawPonyOptions(), shadow: true, bounce: BETA },
		zzzEffect: createAnimationPlayer(defaultPalette),
		cryEffect: createAnimationPlayer(defaultPalette),
		sneezeEffect: createAnimationPlayer(defaultPalette),
		holdPoofEffect: createAnimationPlayer(defaultPalette),
		heartsEffect: createAnimationPlayer(defaultPalette),
		magicEffect: createAnimationPlayer(paletteManager.addArray(sprites.magic2.palette)),
		animator: createAnimator<BodyAnimation>(),
		lastX: 0,
		lastY: 0,
		lastRight: false,
		lastState: defaultPonyState(),
		initialized: false,
		doAction: DoAction.None,
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

export function isPony(entity: Entity): entity is Pony {
	return entity.type === PONY_TYPE;
}

export function isPonyOnTheGround(pony: Pony) {
	return !isPonyFlying(pony) && !isFlyingUpOrDown(pony.animator.state);
}

export function getPaletteInfo(pony: Pony) {
	return ensurePonyInfoDecoded(pony);
}

export function releasePony(pony: Pony) {
	if (pony.ponyState.holding) {
		releaseEntity(pony.ponyState.holding);
	}

	releasePalettePonyInfo(pony);
}

export function canPonyFly(pony: Pony) {
	return !!pony.palettePonyInfo && canFly(pony.palettePonyInfo);
}

export function canPonyLie<T>(pony: Pony, map: IMap<T>) {
	return !isPonyLying(pony) && (isIdle(pony) || isSittingDown(pony.animator.state) || isFlyingDown(pony.animator.state)) &&
		isPonyLandedOrCanLand(pony, map);
}
export function canPonySit<T>(pony: Pony, map: IMap<T>) {
	return !isPonySitting(pony) && (isIdle(pony) || isFlyingDown(pony.animator.state)) &&
		isPonyLandedOrCanLand(pony, map);
}
export function canPonyStand<T>(pony: Pony, map: IMap<T>) {
	return !isPonyStanding(pony) && (isIdleAnimation(pony.ponyState.animation) || isSittingUp(pony.animator.state)) &&
		isPonyLandedOrCanLand(pony, map);
}
export function canPonyFlyUp(pony: Pony) {
	return !isPonyFlying(pony) && canPonyFly(pony) && !isFlyingUpOrDown(pony.animator.state);
}

export function getPonyChatHeight(pony: Pony) {
	const baseHeight = 2;
	const state = pony.ponyState;

	if (pony.animator.state === trotting) {
		return baseHeight;
	} else if (pony.animator.state === flying || pony.animator.state === hovering) {
		return baseHeight - 16;
	} else {
		const frame = getPonyAnimationFrame(state.animation, state.animationFrame, defaultBodyFrame);
		const animation = state.headAnimation || defaultHeadAnimation;
		const headFrame = getPonyAnimationFrame(animation, state.headAnimationFrame, defaultHeadFrame);
		return baseHeight + getHeadY(frame, headFrame);
	}
}

export function updatePonyInfo(pony: Pony, info: string | Uint8Array, apply: () => void) {
	pony.info = info;

	if (pony.palettePonyInfo !== undefined) {
		releasePalettePonyInfo(pony);
		ensurePonyInfoDecoded(pony);
		pony.discardBatch = true;

		if (isPonyFlying(pony) && !canPonyFly(pony)) {
			DEVELOPMENT && console.warn('Force land');
			pony.state = setFlag(pony.state, EntityState.PonyFlying, false);
			resetAnimatorState(pony.animator);
		}

		apply();
	}
}

export function ensurePonyInfoDecoded(pony: Pony) {
	if (pony.info !== undefined && pony.palettePonyInfo === undefined) {
		pony.palettePonyInfo = decodePonyInfo(pony.info, pony.paletteManager);
		const wingType = pony.palettePonyInfo.wings && pony.palettePonyInfo.wings.type || 0;
		pony.animator.variant = wingType === 4 ? 'bug' : '';
		pony.ponyState.blushColor = blushColor(pony.palettePonyInfo.coatPalette.colors[1]);
		pony.magicColor = withAlpha(pony.palettePonyInfo.magicColorValue, MAGIC_ALPHA);
	}

	return pony.palettePonyInfo!;
}

export function invalidatePalettesForPony(pony: Pony) {
	pony.discardBatch = true;
}

export function doBoopPonyAction(game: PonyTownGame, pony: Pony) {
	doPonyAction(pony, DoAction.Boop);

	if (pony.swimming && pony.lastBoopSplash < performance.now()) {
		if (isFacingRight(pony)) {
			playEffect(game, pony, boopSplashRight.type);
		} else {
			playEffect(game, pony, boopSplashLeft.type);
		}

		pony.lastBoopSplash = performance.now() + 800;
	}
}

export function doPonyAction(pony: Pony, action: DoAction) {
	pony.doAction = action;
}

export function setPonyExpression(pony: Pony, expr: number) {
	pony.expr = expr;
}

export function hasExtendedInfo(pony: Pony) {
	return pony.ex;
}

export function hasHeadAnimation(pony: Pony) {
	return pony.headAnimation !== undefined;
}

export function setHeadAnimation(pony: Pony, headAnimation: HeadAnimation | undefined) {
	if (pony.headAnimation !== headAnimation) {
		pony.headTime = 0;
		pony.headAnimation = headAnimation;
	}
}

export function drawPonyEntity(batch: PaletteSpriteBatch, pony: Pony, drawOptions: DrawOptions) {
	if (pony.discardBatch && pony.batch !== undefined) {
		batch.releaseBatch(pony.batch);
		pony.batch = undefined;
		pony.discardBatch = false;
	}

	if (pony.batch !== undefined) {
		batch.drawBatch(pony.batch);
	} else if (pony.palettePonyInfo !== undefined) {
		let swimming = false;

		if (isSwimmingState(pony.animator.state)) {
			if (pony.animator.state === swimmingToFlying) {
				swimming = pony.animator.time < 0.4;
			} else {
				swimming = true;
			}
		}

		const createBatch = pony.vx === 0 && pony.vy === 0 && !swimming;
		const right = isFacingRight(pony);

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
		drawPony(batch, pony.palettePonyInfo, ponyState, 0, 0, options);

		if (
			isAnimationPlaying(pony.zzzEffect) || isAnimationPlaying(pony.sneezeEffect) ||
			isAnimationPlaying(pony.holdPoofEffect) || isAnimationPlaying(pony.heartsEffect) ||
			isAnimationPlaying(pony.magicEffect)
		) {
			const { x, y } = getPonyHeadPosition(pony.ponyState, 0, 0);
			const right = isFacingRight(pony);
			const flip = right ? !ponyState.headTurned : ponyState.headTurned;
			batch.multiplyTransform(createHeadTransform(undefined, x, y, ponyState));
			drawAnimation(batch, pony.zzzEffect, 0, 0, WHITE, flip);
			drawAnimation(batch, pony.sneezeEffect, 0, 0, WHITE, flip);
			drawAnimation(batch, pony.holdPoofEffect, 0, 0, WHITE, flip);
			drawAnimation(batch, pony.heartsEffect, 0, 0, HEARTS_COLOR, flip);

			if (pony.magicEffect.currentAnimation !== undefined) {
				drawAnimation(batch, pony.magicEffect, 0, 0, pony.magicColor, flip);
				const sprite = sprites.magic3.frames[pony.magicEffect.frame];
				sprite && batch.drawSprite(sprite, WHITE, pony.heartsEffect.palette, 0, 0);
			}
		}

		batch.restore();

		if (createBatch) {
			pony.batch = batch.finishBatch();
			pony.lastX = toScreenX(pony.x);
			pony.lastY = toScreenYWithZ(pony.y, pony.z);
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

const magickLightSizes = [
	0, 1.02, // fade-in
	0.97, 0.94, 0.91, 0.94, 0.97, 1.00, // loop
	0.97, 0.94, 0.91, // fade-out
];

export function drawPonyEntityLight(batch: SpriteBatch, pony: Pony, options: DrawOptions) {
	const ponyState = pony.ponyState;
	const holding = ponyState.holding;
	const drawHolding = holding !== undefined && holding.drawLight !== undefined;
	const drawMagic = pony.magicEffect.currentAnimation !== undefined;
	const draw = drawHolding || drawMagic;

	if (draw) {
		batch.save();
		transformBatch(batch, pony);
		const { x, y } = getPonyHeadPosition(ponyState, 0, 0);
		batch.multiplyTransform(createHeadTransform(undefined, x, y, ponyState));

		if (drawHolding) {
			holding!.x = toWorldX(holding!.pickableX!);
			holding!.y = toWorldY(holding!.pickableY!);
			holding!.drawLight!(batch, options);
		}

		if (drawMagic) {
			const size = 200 * (magickLightSizes[pony.magicEffect.frame] || 0);
			batch.drawImage(WHITE, -1, -1, 2, 2, 30 - size / 2, 27 - size / 2, size, size);
		}

		batch.restore();
	}
}

export function drawPonyEntityLightSprite(batch: SpriteBatch, pony: Pony, options: DrawOptions) {
	const ponyState = pony.ponyState;
	const holding = ponyState.holding;
	const drawHolding = holding !== undefined && holding.drawLightSprite !== undefined;
	// const drawMagic = pony.magicEffect.currentAnimation !== undefined;
	const draw = drawHolding; // || drawMagic;

	if (draw) {
		batch.save();
		transformBatch(batch, pony);
		const { x, y } = getPonyHeadPosition(ponyState, 0, 0);
		batch.multiplyTransform(createHeadTransform(undefined, x, y, ponyState));

		if (drawHolding) {
			holding!.x = toWorldX(holding!.pickableX!);
			holding!.y = toWorldY(holding!.pickableY!);
			holding!.drawLightSprite!(batch, options);
		}

		// if (drawMagic) {
		// 	const frame = pony.magicEffect.frame;
		// 	const sprite = sprites.magic2_light.frames[frame];
		// 	batch.drawSprite(sprite, WHITE, 0, 0);
		// }

		batch.restore();
	}
}

export function flagsToState(state: EntityState, moving: boolean, isSwimming: boolean): AnimatorState<BodyAnimation> {
	const ponyState = state & EntityState.PonyStateMask;

	if (isSwimming) {
		return swimming;
	} else if (moving) {
		if (ponyState === EntityState.PonyFlying) {
			return flying;
		} else {
			return trotting;
		}
	} else {
		switch (ponyState) {
			case EntityState.PonyStanding: return standing;
			case EntityState.PonyWalking: return trotting;
			case EntityState.PonyTrotting: return trotting;
			case EntityState.PonySitting: return sitting;
			case EntityState.PonyLying: return lying;
			case EntityState.PonyFlying: return hovering;
			default:
				throw new Error(`Invalid pony state (${ponyState})`);
		}
	}
}

export function updatePonyEntity(pony: Pony, delta: number, gameTime: number, safe: boolean) {
	// update state
	const state = pony.ponyState;
	const walking = pony.vx !== 0 || pony.vy !== 0;
	const animationState = flagsToState(pony.state, walking, pony.swimming);

	if (pony.inTheAirDelay > 0) {
		pony.inTheAirDelay -= delta;
	}

	if (pony.doAction !== DoAction.None) {
		switch (pony.doAction) {
			case DoAction.Boop:
				setAnimatorState(pony.animator, toBoopState(animationState) || animationState);
				break;
			case DoAction.Swing:
				setAnimatorState(pony.animator, swinging);
				break;
			case DoAction.HoldPoof:
				playAnimation(pony.holdPoofEffect, holdPoofAnimation);
				break;
			default:
				if (DEVELOPMENT) {
					console.error(`Invalid DoAction: ${pony.doAction}`);
				}
		}

		pony.doAction = DoAction.None;
	} else {
		setAnimatorState(pony.animator, animationState);
	}

	// head
	pony.headTime += delta;

	if (pony.headAnimation !== undefined) {
		const frame = Math.floor(pony.headTime * pony.headAnimation.fps);

		if (frame >= pony.headAnimation.frames.length && !pony.headAnimation.loop) {
			pony.headAnimation = undefined;
			state.headAnimationFrame = 0;
		} else {
			state.headAnimationFrame = frame % pony.headAnimation.frames.length;
		}
	}

	if (state.headAnimation !== pony.headAnimation) {
		state.headAnimation = pony.headAnimation;

		if (pony.headAnimation === sneeze) {
			playAnimation(pony.sneezeEffect, sneezeAnimation);
		}
	}

	// effects / expressions
	if (pony.currentExpression !== pony.expr) {
		updatePonyExpression(pony, pony.expr, safe);
	}

	if ((pony.state & EntityState.Magic) !== 0) {
		playAnimation(pony.magicEffect, magicAnimation);
	} else {
		playAnimation(pony.magicEffect, undefined);
	}

	updateAnimation(pony.zzzEffect, delta);
	updateAnimation(pony.cryEffect, delta);
	updateAnimation(pony.sneezeEffect, delta);
	updateAnimation(pony.holdPoofEffect, delta);
	updateAnimation(pony.heartsEffect, delta);
	updateAnimation(pony.magicEffect, delta);

	// holding
	const holdingUpdated =
		state.holding !== undefined &&
		state.holding.update !== undefined &&
		state.holding.update(delta, gameTime);

	// blink
	pony.blinkTime += delta;

	if ((pony.blinkTime - pony.nextBlink) > 1) {
		pony.nextBlink = pony.blinkTime + Math.random() * 2 + 3;
	}

	// update animator
	updateAnimator(pony.animator, delta);

	// update state
	const blinkFrame = Math.floor((pony.blinkTime - pony.nextBlink) * blinkFps);
	state.blinkFrame = blinkFrame < BLINK_FRAMES.length ? BLINK_FRAMES[blinkFrame] : 1;
	state.headTurned = (pony.state & EntityState.HeadTurned) !== 0;
	state.animation = getAnimation(pony.animator) || stand;
	state.animationFrame = getAnimationFrame(pony.animator);

	// randomize animator time at startup
	if (!pony.initialized) {
		pony.initialized = true;
		updateAnimator(pony.animator, Math.random() * 2);
	}

	// discard batch if outdated
	if (pony.batch !== undefined) {
		const options = pony.drawingOptions;
		const right = isFacingRight(pony);

		if (
			holdingUpdated ||
			toScreenX(pony.x) !== pony.lastX || toScreenYWithZ(pony.y, pony.z) !== pony.lastY ||
			pony.lastRight !== right ||
			pony.zzzEffect.dirty || pony.cryEffect.dirty || pony.sneezeEffect.dirty || pony.holdPoofEffect.dirty ||
			pony.heartsEffect.dirty || pony.magicEffect.dirty ||
			options.flipped !== right || options.selected !== pony.selected || options.extra !== pony.extra ||
			options.toy !== pony.toy ||
			!isStateEqual(pony.lastState, state)
		) {
			pony.discardBatch = true;
		}
	}

	// update bounds
	const flying = isPonyFlying(pony);
	const flyingUpOrDown = isFlyingUpOrDown(pony.animator.state);
	const flyingOrFlyingUpOrDown = flying || flyingUpOrDown;

	pony.bounds = flyingOrFlyingUpOrDown ? boundsFly : bounds;
	pony.interactBounds = flying ? interactBoundsFly : interactBounds;
	pony.lightBounds = flyingOrFlyingUpOrDown ? lightBoundsFly : lightBounds;
	pony.lightSpriteBounds = flyingOrFlyingUpOrDown ? lightBoundsFly : lightBounds;
}

export function updatePonyHold(pony: Pony, game: PonyTownGame) {
	const ponyState = pony.ponyState;
	const hadLight = hasDrawLight(pony);
	const hadLightSprite = hasLightSprite(pony);

	if (pony.hold !== 0) {
		if (ponyState.holding === undefined) {
			ponyState.holding = createAnEntity(pony.hold, 0, 0, 0, {}, pony.paletteManager, game);
		} else if (ponyState.holding.type !== pony.hold) {
			releaseEntity(ponyState.holding);
			ponyState.holding = createAnEntity(pony.hold, 0, 0, 0, {}, pony.paletteManager, game);
		}
	} else if (ponyState.holding !== undefined) {
		releaseEntity(ponyState.holding);
		ponyState.holding = undefined;
	}

	const hasLight = hasDrawLight(pony);
	const hasLightSprite1 = hasLightSprite(pony);

	addOrRemoveFromEntityList(game.map.entitiesLight, pony, hadLight, hasLight);
	addOrRemoveFromEntityList(game.map.entitiesLightSprite, pony, hadLightSprite, hasLightSprite1);
}

function filterExpression(expression: Expression) {
	const extra = expression.extra;
	const blush = hasFlag(extra, ExpressionExtra.Blush);

	if (
		blush ||
		hasFlag(extra, ExpressionExtra.Hearts) ||
		hasFlag(extra, ExpressionExtra.Cry) ||
		isEyeSleeping(expression.left) ||
		isEyeSleeping(expression.right)
	) {
		if (expression.muzzle === Muzzle.SmilePant || expression.muzzle === Muzzle.NeutralPant) {
			expression.muzzle = Muzzle.Neutral;
		}
	}

	if (
		blush ||
		expression.muzzle === Muzzle.SmilePant ||
		expression.muzzle === Muzzle.NeutralPant
	) {
		if (expression.leftIris === Iris.Up || expression.rightIris === Iris.Up) {
			expression.leftIris = Iris.Forward;
			expression.rightIris = Iris.Forward;
		}

		if (expression.muzzle === Muzzle.SmilePant) {
			expression.muzzle = Muzzle.SmileOpen;
		} else if (expression.muzzle === Muzzle.NeutralPant) {
			expression.muzzle = Muzzle.NeutralOpen2;
		}
	}

	if (blush) {
		if (expression.muzzle === Muzzle.SmileOpen2) {
			expression.muzzle = Muzzle.SmileOpen;
		} else if (expression.muzzle === Muzzle.FrownOpen) {
			expression.muzzle = Muzzle.ConcernedOpen;
		} else if (expression.muzzle === Muzzle.NeutralOpen2) {
			expression.muzzle = Muzzle.Oh;
		}
	}
}

function updatePonyExpression(pony: Pony, expr: number, safe: boolean) {
	const expression = decodeExpression(expr);
	pony.currentExpression = pony.expr;
	pony.ponyState.expression = expression;

	if (expression && safe) {
		filterExpression(expression);
	}

	const extra = (expression && expression.extra) || 0;

	if (hasFlag(extra, ExpressionExtra.Cry)) {
		playAnimation(pony.cryEffect, cryAnimation);
	} else if (hasFlag(extra, ExpressionExtra.Tears)) {
		playAnimation(pony.cryEffect, tearsAnimation);
	} else {
		playAnimation(pony.cryEffect, undefined);
	}

	if (hasFlag(extra, ExpressionExtra.Zzz)) {
		playOneOfAnimations(pony.zzzEffect, zzzAnimations);
	} else {
		playAnimation(pony.zzzEffect, undefined);
	}

	if (hasFlag(extra, ExpressionExtra.Hearts)) {
		playAnimation(pony.heartsEffect, heartsAnimation);
	} else {
		playAnimation(pony.heartsEffect, undefined);
	}
}

function transformBatch(batch: SpriteBatch | PaletteSpriteBatch, entity: Entity) {
	batch.translate(toScreenX(entity.x), toScreenYWithZ(entity.y, entity.z));
	batch.scale(isFacingRight(entity) ? -1 : 1, 1);
}

function releasePalettePonyInfo(pony: Pony) {
	if (pony.palettePonyInfo !== undefined) {
		releasePalettes(pony.palettePonyInfo);
		pony.palettePonyInfo = undefined;
	}
}

function makeLightBounds({ x, y, w, h }: Rect) {
	return rect(x - lightExtentX, y - lightExtentY, w + lightExtentX * 2, h + lightExtentY * 2);
}

function drawFaceExtra(batch: PaletteSpriteBatch, pony: Pony) {
	if (isAnimationPlaying(pony.cryEffect)) {
		const flip = isFacingRight(pony) ? !pony.ponyState.headTurned : pony.ponyState.headTurned;
		const maxY = isPonyLying(pony) ? 62 : (isPonySitting(pony) ? 65 : 0);
		drawAnimation(batch, pony.cryEffect, 0, 0, WHITE, flip, maxY);
	}
}
