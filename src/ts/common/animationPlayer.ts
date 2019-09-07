import { sample } from 'lodash';
import { Sprite, Palette, PaletteSpriteBatch } from './interfaces';
import { drawSpriteCropped } from '../graphics/graphicsUtils';
import { includes } from './utils';
import { WHITE } from './colors';

const enum AnimationPhase {
	Starting,
	Playing,
	Ending,
}

export interface SpriteAnimation {
	loop: boolean;
	start: number;
	middle: number;
	end: number;
	fps: number;
	palette: Uint32Array;
	frames: Sprite[];
	flipFrames?: Sprite[];
}

export interface AnimationPlayer {
	nextAnimation: SpriteAnimation | undefined;
	currentAnimation: SpriteAnimation | undefined;
	time: number;
	frame: number;
	phase: AnimationPhase;
	dirty: boolean;
	palette: Palette;
}

export function createAnimationPlayer(palette: Palette): AnimationPlayer {
	return {
		nextAnimation: undefined,
		currentAnimation: undefined,
		time: 0,
		frame: 0,
		phase: AnimationPhase.Starting,
		dirty: true,
		palette,
	};
}

export function isAnimationPlaying(player: AnimationPlayer) {
	return player.currentAnimation !== undefined;
}

export function playOneOfAnimations(player: AnimationPlayer, animations: SpriteAnimation[]) {
	if (player.phase === AnimationPhase.Ending || !includes(animations, player.currentAnimation)) {
		playAnimation(player, sample(animations));
	}
}

export function playAnimation(player: AnimationPlayer, animation: SpriteAnimation | undefined) {
	if (player.currentAnimation !== animation) {
		if (player.currentAnimation) {
			if (player.nextAnimation !== animation || player.phase !== AnimationPhase.Ending) {
				player.nextAnimation = animation;
				player.time = (player.frame + 1) / player.currentAnimation.fps;
				player.phase = AnimationPhase.Ending;
			}
		} else {
			player.currentAnimation = animation;
			player.time = 0;
			player.phase = AnimationPhase.Starting;
		}
		player.dirty = true;
	} else if (player.phase === AnimationPhase.Ending) {
		player.nextAnimation = animation;
		player.dirty = true;
	}
}

export function updateAnimation(player: AnimationPlayer, delta: number) {
	if (player.currentAnimation !== undefined) {
		player.time += delta;
		const { start, middle, end, fps, loop } = player.currentAnimation;

		let extraFrame = Math.floor(player.time * fps);

		if (player.phase === AnimationPhase.Starting && extraFrame > start) {
			player.phase = loop ? AnimationPhase.Playing : AnimationPhase.Ending;
			player.dirty = true;
		}

		if (player.phase === AnimationPhase.Playing) {
			extraFrame = start + ((extraFrame - start) % middle);
		}

		if (player.phase === AnimationPhase.Ending && extraFrame > (start + middle + end)) {
			player.currentAnimation = undefined;
			player.dirty = true;

			if (player.nextAnimation !== undefined) {
				const nextAnimation = player.nextAnimation;
				player.nextAnimation = undefined;
				playAnimation(player, nextAnimation);
			}
		}

		if (player.frame !== extraFrame) {
			player.frame = extraFrame;
			player.dirty = true;
		}
	}
}

export function drawAnimation(
	batch: PaletteSpriteBatch, player: AnimationPlayer, x: number, y: number, color = WHITE, flip = false, maxY = 0
) {
	const animation = player.currentAnimation;

	if (animation !== undefined) {
		const frames = (flip && animation.flipFrames) ? animation.flipFrames : animation.frames;

		if (player.frame < frames.length) {
			const frame = frames[player.frame];

			if (DEVELOPMENT && !frame) {
				throw new Error('Undefined frame in sprite animation');
			}

			if (!frame) // TEMP
				return;

			if (maxY === 0) {
				batch.drawSprite(frame, color, player.palette, x, y);
			} else {
				drawSpriteCropped(batch, frame, color, player.palette, x, y, maxY);
			}
		}
	}
}
