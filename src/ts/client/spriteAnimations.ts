import * as sprites from '../generated/sprites';
import { SpriteAnimation } from '../common/animationPlayer';
import { AnimatedRenderable } from '../common/mixins';
import { Sprite } from '../common/interfaces';

export const zzzAnimation1 = createSpriteAnimation(
	sprites.emote_sleep1, 8, 8, 4, 7, true, sprites.emote_sleep1_flip.frames);
export const zzzAnimation2 = createSpriteAnimation(
	sprites.emote_sleep2, 12, 13, 13, 12, true, sprites.emote_sleep2_flip.frames);
export const zzzAnimations = [zzzAnimation1, zzzAnimation2];

export const cryAnimation = createSpriteAnimation(sprites.emote_cry2, 12, 0, 13, 0);

export const tearsAnimation = createSpriteAnimation(sprites.emote_tears, 12, 0, 1, 0);

export const heartsAnimation = createSpriteAnimation(sprites.emote_hearts, 12, 18, 18, 9, true);

sprites.emote_sneeze.frames.unshift(sprites.emptySprite, sprites.emptySprite);
export const sneezeAnimation = createSpriteAnimation(sprites.emote_sneeze, 8, 0, 4, 0, false);

sprites.hold_poof.frames.push(sprites.emptySprite);
export const holdPoofAnimation = createSpriteAnimation(sprites.hold_poof, 12, 0, 4, 0, false);

export const magicAnimation = createSpriteAnimation(sprites.magic2, 8, 2, 6, 0, true);

function createSpriteAnimation(
	{ frames, palette }: AnimatedRenderable, fps: number, start: number, middle: number, end: number, loop = true,
	flipFrames?: Sprite[],
): SpriteAnimation {
	return { start, middle, end, fps, palette, frames, loop, flipFrames };
}
